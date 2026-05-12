import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { campaignDateKey, campaignTimeZone, dateFromCampaignKey } from "./campaign-clock.js";
import { buildDuePressureChunk, DuePressureChunk } from "./due-pressure-chunks.js";
import { buildPostingAssetRequirements } from "./posting-assets.js";
import { createEvidencePlan } from "./plan-task-evidence.js";
import { buildPostingCaption } from "./social-captions.js";
import { PlatformTask, QueuePost, validateSocialQueue } from "./validate-queue.js";

export interface CompactPacketOptions {
  days?: number[];
  prep?: boolean;
  today?: Date;
  autoDuePressureChunk?: boolean;
}

interface SelectedTask {
  post: QueuePost;
  task: PlatformTask;
}

interface CliOptions extends CompactPacketOptions {
  write?: boolean;
  out?: string;
  force?: boolean;
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

function platformTasks(post: QueuePost): PlatformTask[] {
  return Array.isArray(post.platform_tasks) ? post.platform_tasks as PlatformTask[] : [];
}

function readOption(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1];
  return undefined;
}

function parseDays(value: string | undefined): number[] | undefined {
  if (!value) return undefined;
  const days = value.split(",")
    .map((part) => Number(part.trim()))
    .filter((day) => Number.isInteger(day) && day > 0);
  return days.length ? days : undefined;
}

function parseCampaignDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  return dateFromCampaignKey(value);
}

function parseArgs(args: string[]): CliOptions {
  const cleanArgs = args.filter((arg) => arg !== "--");
  const day = readOption(cleanArgs, "day") ?? cleanArgs.find((arg) => /^\d+$/.test(arg));
  const days = parseDays(readOption(cleanArgs, "days") ?? day);
  const positionalDate = cleanArgs.find((arg) => /^\d{4}-\d{2}-\d{2}$/.test(arg));
  const today = parseCampaignDate(readOption(cleanArgs, "today") ?? positionalDate ?? process.env.SOCIAL_TODAY_DATE);
  const lifecycleEvent = process.env.npm_lifecycle_event;
  const hasExplicitDayMode = Boolean(days?.length || cleanArgs.includes("--prep") || cleanArgs.includes("prep"));
  const autoDuePressureChunk = cleanArgs.includes("--auto-chunk")
    || (lifecycleEvent === "social:today" && !hasExplicitDayMode && !cleanArgs.includes("--no-auto-chunk"));
  return {
    days,
    prep: cleanArgs.includes("--prep") || cleanArgs.includes("prep"),
    today,
    autoDuePressureChunk,
    write: cleanArgs.includes("--write") || cleanArgs.includes("write"),
    out: readOption(cleanArgs, "out"),
    force: cleanArgs.includes("--force") || cleanArgs.includes("force")
  };
}

function taskLabel(task: PlatformTask): string {
  const platform = asString(task.platform);
  const board = asString(task.board_name);
  return board ? `${platform} - ${board}` : platform;
}

function sortTasks(left: SelectedTask, right: SelectedTask): number {
  const dayDelta = (asNumber(left.post.campaign_day) ?? 999) - (asNumber(right.post.campaign_day) ?? 999);
  if (dayDelta !== 0) return dayDelta;
  const leftIndex = platformTasks(left.post).indexOf(left.task);
  const rightIndex = platformTasks(right.post).indexOf(right.task);
  return leftIndex - rightIndex;
}

function selectTasks(posts: QueuePost[], options: CompactPacketOptions): SelectedTask[] {
  const todayKey = campaignDateKey(options.today);
  const allowedDays = new Set(options.days ?? []);
  const selected: SelectedTask[] = [];

  for (const post of posts) {
    const day = asNumber(post.campaign_day);
    const scheduled = asString(post.scheduled_date);
    const requestedByDay = day !== null && allowedDays.has(day);
    const dueToday = !options.days?.length && scheduled && scheduled <= todayKey;

    if (!requestedByDay && !dueToday) continue;

    for (const task of platformTasks(post)) {
      if (task.status === "ready") selected.push({ post, task });
    }
  }

  return selected.sort(sortTasks);
}

function autoChunkFor(posts: QueuePost[], options: CompactPacketOptions): DuePressureChunk | null {
  if (!options.autoDuePressureChunk || options.days?.length) return null;
  return buildDuePressureChunk(posts, options.today);
}

function resolvePacketSelection(posts: QueuePost[], options: CompactPacketOptions): {
  autoChunk: DuePressureChunk | null;
  effectiveOptions: CompactPacketOptions;
  tasks: SelectedTask[];
} {
  const autoChunk = autoChunkFor(posts, options);
  const effectiveOptions = autoChunk
    ? {
        ...options,
        days: autoChunk.days,
        prep: options.prep || autoChunk.scope === "due_soon_next_2_days"
      }
    : options;

  return {
    autoChunk,
    effectiveOptions,
    tasks: selectTasks(posts, effectiveOptions)
  };
}

function groupByDay(tasks: SelectedTask[]): Map<number, SelectedTask[]> {
  const grouped = new Map<number, SelectedTask[]>();
  for (const selected of tasks) {
    const day = asNumber(selected.post.campaign_day) ?? 0;
    grouped.set(day, [...(grouped.get(day) ?? []), selected]);
  }
  return grouped;
}

function firstApprovedAsset(post: QueuePost, task: PlatformTask): string {
  return buildPostingAssetRequirements(post, task)
    .map((requirement) => requirement.approved_asset)
    .find((asset): asset is string => Boolean(asset)) ?? "MISSING";
}

function hasMissingRequiredAsset(post: QueuePost, task: PlatformTask): boolean {
  return buildPostingAssetRequirements(post, task)
    .some((requirement) => requirement.required && requirement.status === "missing");
}

function doneCommand(task: PlatformTask): string {
  const key = asString(task.idempotency_key);
  if (task.platform === "Short Video") {
    return [
      "npm run social:done --",
      key,
      "--youtube <YOUTUBE_SHORTS_URL>",
      "--tiktok <TIKTOK_URL>",
      "--instagram <INSTAGRAM_REEL_URL>",
      "--facebook <FACEBOOK_REEL_URL>",
      "--pinterest <PINTEREST_VIDEO_PIN_URL>"
    ].join(" ");
  }

  return [
    "npm run social:done --",
    key,
    "<POST_URL>"
  ].join(" ");
}

function dayCaption(post: QueuePost, task: PlatformTask): string {
  return buildPostingCaption(task.caption_source ?? post.caption_source, task.required_hashtags);
}

function outputPathFor(tasks: SelectedTask[], options: CliOptions): string {
  if (options.out) return options.out;
  const days = [...groupByDay(tasks).keys()].sort((left, right) => left - right);
  const label = days.length ? `day-${days.map((day) => String(day).padStart(2, "0")).join("-")}` : "due";
  const mode = options.prep ? "prep" : "posting";
  return `content/social/campaigns/book-01/views/${label}-${mode}-compact-packet.md`;
}

export function buildCompactPostingPacket(
  posts: QueuePost[],
  options: CompactPacketOptions = {}
): { ok: boolean; markdown: string; selectedCount: number; postingAllowed: boolean } {
  const todayKey = campaignDateKey(options.today);
  const { autoChunk, effectiveOptions, tasks } = resolvePacketSelection(posts, options);
  const grouped = groupByDay(tasks);
  const lines: string[] = [];
  const futureDays = [...grouped.entries()].filter(([, dayTasks]) => {
    const scheduled = asString(dayTasks[0]?.post.scheduled_date);
    return scheduled > todayKey;
  });
  const postingAllowed = tasks.length > 0 && futureDays.length === 0 && !effectiveOptions.prep;
  const stamp = options.today ?? new Date();

  lines.push("# Compact Posting Packet");
  lines.push("");
  lines.push(`Today (${campaignTimeZone}): ${todayKey}`);
  lines.push(`Mode: ${effectiveOptions.prep ? "PREP ONLY" : postingAllowed ? "LIVE POSTING OK" : "HOLD"}`);
  lines.push(`Ready tasks included: ${tasks.length}`);
  if (autoChunk) {
    lines.push(`Source: due-pressure chunk (${autoChunk.scope})`);
    lines.push(`Chunk days: ${autoChunk.days.map((day) => `Day ${day}`).join(", ")}`);
    lines.push(`Prevention path: ${autoChunk.prevention_path}`);
  }
  if (futureDays.length) {
    lines.push("Gate: future scheduled day included; do not live post from this packet.");
  }
  lines.push("Use done-helper commands only after live post URL(s) exist; each helper writes the receipt, marks the queue, validates, and prints the next packet.");
  lines.push("");

  if (!tasks.length) {
    lines.push("No ready tasks matched this request.");
    return { ok: true, markdown: `${lines.join("\n")}\n`, selectedCount: 0, postingAllowed: false };
  }

  for (const [day, dayTasks] of grouped) {
    const post = dayTasks[0].post;
    const scheduled = asString(post.scheduled_date);
    const dayHold = effectiveOptions.prep || scheduled > todayKey;
    lines.push(`## Day ${day} - ${scheduled}`);
    lines.push("");
    lines.push(`Gate: ${dayHold ? "HOLD / PREP ONLY" : "LIVE POSTING OK"}`);
    lines.push("");
    lines.push("Caption:");
    lines.push("");
    lines.push("```text");
    lines.push(dayCaption(post, dayTasks[0].task));
    lines.push("```");
    lines.push("");
    lines.push("Tasks:");

    for (const selected of dayTasks) {
      const { post: selectedPost, task } = selected;
      const evidence = createEvidencePlan({
        postId: selectedPost.post_id,
        platform: task.platform,
        idempotencyKey: task.idempotency_key,
        timestamp: stamp
      });
      const surfaces = asStringArray(task.required_video_surfaces).join(", ");
      const missing = hasMissingRequiredAsset(selectedPost, task) ? " MISSING-ASSET" : "";
      lines.push(`- ${taskLabel(task)}${missing}`);
      lines.push(`  key: ${asString(task.idempotency_key)}`);
      lines.push(`  asset: ${firstApprovedAsset(selectedPost, task)}`);
      if (surfaces) lines.push(`  surfaces: ${surfaces}`);
      lines.push(`  receipt: ${evidence.recommended_receipt_path}`);
      lines.push(`  evidence: ${evidence.recommended_evidence_path}`);
      lines.push(`  done-helper: ${doneCommand(task)}`);
    }

    lines.push("");
  }

  lines.push("After each live post URL exists:");
  lines.push("");
  lines.push("```powershell");
  lines.push("# Run the matching done-helper line above.");
  lines.push("# It writes the receipt, marks the queue, validates, and prints the next packet.");
  lines.push("```");

  return {
    ok: true,
    markdown: `${lines.join("\n")}\n`,
    selectedCount: tasks.length,
    postingAllowed
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const validation = await validateSocialQueue();
  if (!validation.ok) {
    console.error(`Social queue validation failed:\n${validation.errors.join("\n")}`);
    process.exit(1);
  }

  const packet = buildCompactPostingPacket(validation.posts, options);
  if (options.write) {
    const resolved = resolvePacketSelection(validation.posts, options);
    const out = outputPathFor(resolved.tasks, { ...options, ...resolved.effectiveOptions });
    const absolute = join(process.cwd(), out);
    if (existsSync(absolute) && !options.force) {
      console.error(`Refusing to overwrite existing file without --force: ${out}`);
      process.exit(1);
    }
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, packet.markdown, "utf8");
    console.log(`Wrote ${out}`);
    console.log(`Ready tasks included: ${packet.selectedCount}`);
    console.log(`Posting allowed: ${packet.postingAllowed ? "yes" : "no"}`);
    return;
  }

  console.log(packet.markdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
