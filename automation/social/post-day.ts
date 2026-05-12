import { pathToFileURL } from "node:url";
import { PlatformUrl, postShortVideo, PostShortVideoOptions } from "./post-short-video.js";
import { appendProductionRunLog } from "./production-run-log.js";
import { PlatformTask, QueuePost, validateSocialQueue } from "./validate-queue.js";

export interface PostDayOptions {
  selector?: string;
  closeShortVideo?: boolean;
  dryRun?: boolean;
  force?: boolean;
  recordRun?: boolean;
  verbose?: boolean;
  postedAt?: string;
  platformUrls: PlatformUrl[];
}

const surfaceFlags: Array<[flag: string, platform: string]> = [
  ["youtube", "YouTube Shorts"],
  ["tiktok", "TikTok"],
  ["instagram", "Instagram Reels"],
  ["facebook", "Facebook Reels"],
  ["pinterest", "Pinterest Video Pin"]
];

const valueOptionNames = new Set(["posted-at", ...surfaceFlags.map(([flag]) => flag)]);

function npmConfigValue(name: string): string | undefined {
  return process.env[`npm_config_${name.replaceAll("-", "_")}`];
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
  for (const flag of ["close-short-video", "dry-run", "force", "record-run", "verbose"]) {
    if (npmConfigValue(flag) === "true" || npmConfigValue(flag.replaceAll("-", "_")) === "true") {
      normalized.push(`--${flag}`);
    }
  }
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

export function parsePostDayArgs(args: string[]): PostDayOptions {
  const cleanArgs = normalizeNpmConsumedArgs(args.filter((arg) => arg !== "--"));
  const positional = positionalArgs(cleanArgs);
  return {
    selector: positional[0],
    closeShortVideo: readFlag(cleanArgs, "close-short-video"),
    dryRun: readFlag(cleanArgs, "dry-run"),
    force: readFlag(cleanArgs, "force"),
    recordRun: readFlag(cleanArgs, "record-run"),
    verbose: readFlag(cleanArgs, "verbose"),
    postedAt: readOption(cleanArgs, "posted-at"),
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

function shortVideoCloseCommand(day: unknown, missingSurfaces: string[]): string {
  const dayLabel = `day-${String(day).padStart(2, "0")}`;
  const flags = (missingSurfaces.length ? missingSurfaces : surfaceFlags.map(([, platform]) => platform))
    .map((surface) => `--${surfaceFlag(surface)} <URL>`)
    .join(" ");
  return `npm run social:post-day -- ${dayLabel} --close-short-video ${flags}`;
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

export function findDayPost(posts: QueuePost[], selector: string): QueuePost {
  const day = selectorDay(selector);
  const matches = posts.filter((post) =>
    asString(post.post_id) === selector || (day !== null && asNumber(post.campaign_day) === day)
  );
  if (matches.length !== 1) throw new Error(`Expected one day post for "${selector}", found ${matches.length}.`);
  return matches[0];
}

function taskSummary(task: PlatformTask): Record<string, unknown> {
  return {
    platform: task.platform ?? null,
    status: task.status ?? null,
    idempotency_key: task.idempotency_key ?? null,
    posted_url: task.posted_url ?? null,
    receipt_path: task.receipt_path ?? null
  };
}

export function buildPostDaySummary(post: QueuePost, options: PostDayOptions): Record<string, unknown> {
  const tasks = platformTasks(post);
  const shortVideo = tasks.find((task) => task.platform === "Short Video") ?? null;
  const requiredSurfaces = shortVideo ? asStringArray(shortVideo.required_video_surfaces) : [];
  const recordedPlatformUrls = shortVideo ? taskPlatformUrls(shortVideo) : [];
  const mergedPlatformUrls = mergePlatformUrls(recordedPlatformUrls, options.platformUrls);
  const provided = new Map(mergedPlatformUrls.map((entry) => [entry.platform.toLowerCase(), entry.url]));
  const missingProvidedSurfaces = requiredSurfaces.filter((surface) => !provided.has(surface.toLowerCase()));
  const readyTasks = tasks.filter((task) => task.status === "ready");
  const blockedTasks = tasks.filter((task) => task.status === "needs-account" || task.status === "needs-video-export" || task.status === "error");

  const summary: Record<string, unknown> = {
    ok: true,
    mode: options.dryRun ? "dry-run" : "status",
    post_id: post.post_id ?? null,
    campaign_day: post.campaign_day ?? null,
    scheduled_date: post.scheduled_date ?? null,
    task_counts: {
      total: tasks.length,
      posted: tasks.filter((task) => task.status === "posted" || task.status === "posted-early").length,
      ready: readyTasks.length,
      blocked: blockedTasks.length
    },
    ready_tasks: readyTasks.map(taskSummary),
    blocked_tasks: blockedTasks.map(taskSummary),
    short_video: shortVideo
      ? {
        task: shortVideo.idempotency_key ?? null,
        status: shortVideo.status ?? null,
        required_surfaces: requiredSurfaces,
        recorded_urls_count: recordedPlatformUrls.length,
        provided_urls_count: mergedPlatformUrls.length,
        newly_provided_urls_count: options.platformUrls.length,
        recorded_platform_urls: recordedPlatformUrls,
        missing_provided_surfaces: missingProvidedSurfaces,
        can_close_from_inputs: missingProvidedSurfaces.length === 0 && mergedPlatformUrls.length > 0,
        close_command: shortVideoCloseCommand(post.campaign_day, missingProvidedSurfaces)
      }
      : null,
    next_command: "Use compact platform commands; ask Codex to inspect full evidence only when compact JSON returns ok:false."
  };
  if (options.verbose) {
    summary.all_tasks = tasks.map(taskSummary);
    summary.provided_platform_urls = options.platformUrls;
  }
  return summary;
}

export async function postDay(options: PostDayOptions): Promise<Record<string, unknown>> {
  if (!options.selector) throw new Error("Missing day selector.");
  const validation = await validateSocialQueue();
  if (!validation.ok) throw new Error(`Social queue validation failed: ${validation.errors.join("; ")}`);
  const post = findDayPost(validation.posts, options.selector);
  const summary = buildPostDaySummary(post, options);

  let closeout: Record<string, unknown> | undefined;
  if (options.closeShortVideo) {
    const closeOptions: PostShortVideoOptions = {
      selector: options.selector,
      dryRun: options.dryRun,
      force: options.force,
      postedAt: options.postedAt,
      verbose: options.verbose,
      platformUrls: options.platformUrls
    };
    closeout = await postShortVideo(closeOptions);
  }

  const result = closeout ? { ...summary, short_video_closeout: closeout } : summary;
  if (options.recordRun) {
    await appendProductionRunLog({
      workflowName: "social-post-day-compact-run",
      summary: `Ran compact Day ${String(post.campaign_day)} status${options.closeShortVideo ? " with short-video closeout" : ""}.`,
      inputs: [options.selector, ...options.platformUrls.map((entry) => `${entry.platform}: ${entry.url}`)],
      assumptions: ["Compact day command owns status/closeout summary so Codex does not need to read the full queue."],
      outputsCreated: [],
      warnings: closeout && closeout.ok !== true ? [String(closeout.blocked_at ?? "short-video closeout blocked")] : [],
      qaResult: result.ok === true ? "PASS: compact JSON returned." : "BLOCKED: inspect compact result.",
      nextManualStep: "Use the next compact command shown in the JSON result."
    });
  }
  return result;
}

async function main(): Promise<void> {
  const result = await postDay(parsePostDayArgs(process.argv.slice(2)));
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
