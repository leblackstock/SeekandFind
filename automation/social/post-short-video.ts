import { pathToFileURL } from "node:url";
import { completePostingTask } from "./complete-posting-task.js";
import { appendProductionRunLog } from "./production-run-log.js";
import { validateProductionUrls } from "./production-url-guard.js";
import { PlatformTask, QueuePost, validateSocialQueue } from "./validate-queue.js";

export interface PlatformUrl {
  platform: string;
  url: string;
}

export interface PostShortVideoOptions {
  selector?: string;
  postedAt?: string;
  dryRun?: boolean;
  force?: boolean;
  allowExampleUrls?: boolean;
  verbose?: boolean;
  platformUrls: PlatformUrl[];
}

interface ShortVideoMatch {
  post: QueuePost;
  task: PlatformTask;
}

const surfaceFlags: Array<[flag: string, platform: string]> = [
  ["youtube", "YouTube Shorts"],
  ["tiktok", "TikTok"],
  ["instagram", "Instagram Reels"],
  ["facebook", "Facebook Reels"],
  ["pinterest", "Pinterest Video Pin"]
];

const valueOptionNames = new Set(["posted-at", ...surfaceFlags.map(([flag]) => flag)]);

function npmConfigName(name: string): string {
  return `npm_config_${name.replaceAll("-", "_")}`;
}

function npmConfigValue(name: string): string | undefined {
  return process.env[npmConfigName(name)];
}

function isNpmBooleanConfig(value: string | undefined): boolean {
  return value === "true" || value === "false";
}

function normalizeNpmConsumedArgs(args: string[]): string[] {
  if (args.some((arg) => arg.startsWith("--"))) return args;

  const selector = args[0];
  const values = args.slice(1);
  let valueIndex = 0;
  const normalized = selector ? [selector] : [];

  for (const [flag] of surfaceFlags) {
    const envValue = npmConfigValue(flag);
    if (envValue === undefined) continue;
    if (isNpmBooleanConfig(envValue)) {
      if (envValue === "true" && values[valueIndex] !== undefined) {
        normalized.push(`--${flag}`, values[valueIndex]);
        valueIndex += 1;
      }
    } else {
      normalized.push(`--${flag}`, envValue);
    }
  }

  const postedAt = npmConfigValue("posted-at");
  if (postedAt !== undefined && !isNpmBooleanConfig(postedAt)) normalized.push("--posted-at", postedAt);
  normalized.push(...values.slice(valueIndex));
  if (npmConfigValue("dry-run") === "true" || npmConfigValue("dry_run") === "true") normalized.push("--dry-run");
  if (npmConfigValue("allow-example-urls") === "true" || npmConfigValue("allow_example_urls") === "true") normalized.push("--allow-example-urls");
  if (npmConfigValue("verbose") === "true") normalized.push("--verbose");
  if (npmConfigValue("force") === "true") normalized.push("--force");
  return normalized;
}

function readOption(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1];
  const envValue = npmConfigValue(name);
  return isNpmBooleanConfig(envValue) ? undefined : envValue;
}

function readFlag(args: string[], name: string): boolean {
  const envValue = npmConfigValue(name);
  if (envValue !== undefined) return !/^(false|0|no)$/i.test(envValue);
  return args.includes(`--${name}`);
}

function positionalArgs(args: string[]): string[] {
  const consumed = new Set<number>();
  args.forEach((arg, index) => {
    if (!arg.startsWith("--")) return;
    consumed.add(index);
    const name = arg.slice(2).split("=")[0];
    if (valueOptionNames.has(name) && !arg.includes("=")) consumed.add(index + 1);
  });
  return args.filter((arg, index) => !consumed.has(index) && !arg.startsWith("--"));
}

export function parsePostShortVideoArgs(args: string[]): PostShortVideoOptions {
  const cleanArgs = normalizeNpmConsumedArgs(args.filter((arg) => arg !== "--"));
  const positional = positionalArgs(cleanArgs);
  return {
    selector: positional[0],
    postedAt: readOption(cleanArgs, "posted-at"),
    dryRun: readFlag(cleanArgs, "dry-run"),
    force: readFlag(cleanArgs, "force"),
    allowExampleUrls: readFlag(cleanArgs, "allow-example-urls"),
    verbose: readFlag(cleanArgs, "verbose"),
    platformUrls: surfaceFlags
      .map(([flag, platform]) => ({ platform, url: readOption(cleanArgs, flag) }))
      .filter((entry): entry is PlatformUrl => typeof entry.url === "string" && entry.url.trim().length > 0)
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function taskPlatformUrls(task: PlatformTask): PlatformUrl[] {
  if (Array.isArray(task.platform_urls)) {
    return task.platform_urls
      .map((entry) => entry as { platform?: unknown; url?: unknown })
      .filter((entry): entry is { platform: string; url: string } =>
        typeof entry.platform === "string" && typeof entry.url === "string" && entry.url.trim().length > 0
      )
      .map((entry) => ({ platform: entry.platform, url: entry.url }));
  }

  if (task.platform_urls && typeof task.platform_urls === "object") {
    return Object.entries(task.platform_urls as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
      .map(([platform, url]) => ({ platform, url }));
  }

  return [];
}

function mergePlatformUrls(existing: PlatformUrl[], provided: PlatformUrl[]): PlatformUrl[] {
  const byPlatform = new Map<string, PlatformUrl>();
  for (const entry of existing) byPlatform.set(entry.platform.toLowerCase(), entry);
  for (const entry of provided) byPlatform.set(entry.platform.toLowerCase(), entry);
  return Array.from(byPlatform.values());
}

function surfaceFlag(surface: string): string {
  return surfaceFlags.find(([, platform]) => platform.toLowerCase() === surface.toLowerCase())?.[0] ?? surface.toLowerCase().replaceAll(" ", "-");
}

function missingSurfaceFlags(missing: string[]): string {
  return missing.map((surface) => `--${surfaceFlag(surface)} <URL>`).join(" ");
}

function platformTasks(post: QueuePost): PlatformTask[] {
  return Array.isArray(post.platform_tasks) ? post.platform_tasks as PlatformTask[] : [];
}

function selectorDay(selector: string): number | null {
  const match = selector.match(/(?:day[-_ ]?)?0*(\d{1,2})$/i);
  if (!match) return null;
  const day = Number(match[1]);
  return Number.isFinite(day) ? day : null;
}

export function findShortVideoMatch(posts: QueuePost[], selector: string): ShortVideoMatch {
  const exactMatches: ShortVideoMatch[] = [];
  for (const post of posts) {
    for (const task of platformTasks(post)) {
      if (task.platform === "Short Video" && task.idempotency_key === selector) {
        exactMatches.push({ post, task });
      }
    }
  }
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) throw new Error(`Expected one exact short-video task for "${selector}", found ${exactMatches.length}.`);

  const day = selectorDay(selector);
  if (day === null) throw new Error(`No exact short-video task found for "${selector}", and it is not a day selector.`);
  const dayMatches = posts
    .filter((post) => asNumber(post.campaign_day) === day)
    .flatMap((post) => platformTasks(post)
      .filter((task) => task.platform === "Short Video")
      .map((task) => ({ post, task })));
  if (dayMatches.length !== 1) {
    throw new Error(`Expected one Day ${day} short-video task, found ${dayMatches.length}.`);
  }
  return dayMatches[0];
}

export function buildPostShortVideoSummary(match: ShortVideoMatch, options: PostShortVideoOptions): Record<string, unknown> {
  const requiredSurfaces = asStringArray(match.task.required_video_surfaces);
  const mergedPlatformUrls = mergePlatformUrls(taskPlatformUrls(match.task), options.platformUrls);
  const available = new Map(mergedPlatformUrls.map((entry) => [entry.platform.toLowerCase(), entry.url]));
  const missing = requiredSurfaces.filter((surface) => !available.has(surface.toLowerCase()));
  const youtubeUrl = mergedPlatformUrls.find((entry) => entry.platform === "YouTube Shorts")?.url ?? null;
  const summary: Record<string, unknown> = {
    ok: missing.length === 0,
    mode: options.dryRun ? "dry-run" : "production",
    task: asString(match.task.idempotency_key),
    post_id: asString(match.post.post_id),
    campaign_day: asNumber(match.post.campaign_day),
    current_status: match.task.status ?? null,
    youtube_url: youtubeUrl,
    platform_urls_count: mergedPlatformUrls.length,
    newly_provided_urls_count: options.platformUrls.length,
    missing_surfaces: missing,
    ready_to_close_bundle: missing.length === 0,
    next_command: missing.length
      ? `Collect the missing platform URLs, then rerun with ${missingSurfaceFlags(missing)}.`
      : "The bundle can be closed locally without extra Codex context."
  };
  if (options.verbose) {
    summary.platform_urls = mergedPlatformUrls;
    summary.required_surfaces = requiredSurfaces;
  }
  return summary;
}

export async function postShortVideo(options: PostShortVideoOptions): Promise<Record<string, unknown>> {
  if (!options.selector) throw new Error("Missing short-video task key or day selector.");
  const validation = await validateSocialQueue();
  if (!validation.ok) throw new Error(`Social queue validation failed: ${validation.errors.join("; ")}`);
  const match = findShortVideoMatch(validation.posts, options.selector);
  const mergedPlatformUrls = mergePlatformUrls(taskPlatformUrls(match.task), options.platformUrls);
  const summary = buildPostShortVideoSummary(match, options);

  if (!options.dryRun && !options.allowExampleUrls) {
    const urlCheck = validateProductionUrls(mergedPlatformUrls);
    if (!urlCheck.ok) {
      return {
        ...summary,
        ok: false,
        blocked_at: "production_url_guard",
        errors: urlCheck.errors
      };
    }
  }

  if (summary.ok !== true) {
    const result = { ...summary, blocked_at: "missing_surface_urls" };
    await appendProductionRunLog({
      workflowName: "social-post-short-video-compact-run",
      summary: `Short-video bundle not closed for ${String(summary.task)}; missing surfaces: ${(summary.missing_surfaces as string[]).join(", ")}.`,
      inputs: [options.selector, ...options.platformUrls.map((entry) => `${entry.platform}: ${entry.url}`)],
      assumptions: ["All required short-video surfaces must have URLs before queue closure."],
      outputsCreated: [],
      warnings: [`Missing surfaces: ${(summary.missing_surfaces as string[]).join(", ")}`],
      qaResult: "BLOCKED: compact result returned without mutating queue.",
      nextManualStep: "Collect missing platform URLs and rerun `npm run social:post-short-video`."
    });
    return result;
  }

  if (options.dryRun) {
    return { ...summary, dry_run_would_close_bundle: true };
  }

  const completion = await completePostingTask({
    idempotencyKey: asString(match.task.idempotency_key),
    postedAt: options.postedAt,
    platformUrls: mergedPlatformUrls,
    force: options.force,
    skipNextPacket: true
  });
  const result = {
    ...summary,
    receipt_path: completion.receipt_path,
    evidence_path: completion.evidence_path,
    queue_updated: true,
    validation_summary: completion.validation_summary
  };

  await appendProductionRunLog({
    workflowName: "social-post-short-video-compact-run",
    summary: `Closed short-video bundle ${String(summary.task)} with ${mergedPlatformUrls.length} platform URLs. Receipt: ${completion.receipt_path}.`,
    inputs: [options.selector, ...options.platformUrls.map((entry) => `${entry.platform}: ${entry.url}`)],
    assumptions: ["All required short-video surface URLs are live and verified before this command is run."],
    outputsCreated: [completion.receipt_path, completion.evidence_path],
    warnings: [],
    qaResult: "PASS: receipt written, queue updated, and social queue validation passed.",
    nextManualStep: "Run `npm run social:today` for the next compact posting packet."
  });

  return result;
}

async function main(): Promise<void> {
  const result = await postShortVideo(parsePostShortVideoArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
  if (result.ok !== true) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({ ok: false, message, errors: [message] }, null, 2));
    process.exitCode = 1;
  });
}
