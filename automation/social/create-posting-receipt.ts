import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildPostingAssetRequirements } from "./posting-assets.js";
import { createEvidencePlan } from "./plan-task-evidence.js";
import { buildPostingCaption } from "./social-captions.js";
import { PlatformTask, QueuePost, validateSocialQueue } from "./validate-queue.js";

export interface TaskMatch {
  post: QueuePost;
  task: PlatformTask;
}

interface PlatformUrl {
  platform: string;
  url: string;
}

export interface ReceiptOptions {
  idempotencyKey?: string;
  postedUrl?: string;
  postedAt?: string;
  receiptPath?: string;
  evidencePath?: string;
  note?: string;
  force?: boolean;
  platformUrls?: PlatformUrl[];
}

export interface ReceiptBuildResult {
  receipt: Record<string, unknown>;
  receiptPath: string;
  evidencePath: string;
  markCommand: string;
}

const shortVideoSurfaceFlags: Array<[flag: string, platform: string]> = [
  ["youtube", "YouTube Shorts"],
  ["tiktok", "TikTok"],
  ["instagram", "Instagram Reels"],
  ["facebook", "Facebook Reels"],
  ["pinterest", "Pinterest Video Pin"]
];

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

function readFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`) || args.includes(name);
}

function parseArgs(args: string[]): ReceiptOptions {
  const cleanArgs = args.filter((arg) => arg !== "--");
  const positional = cleanArgs.filter((arg) => !arg.startsWith("--"));
  const platformUrls = shortVideoSurfaceFlags
    .map(([flag, platform]) => ({ platform, url: readOption(cleanArgs, flag) }))
    .filter((entry): entry is PlatformUrl => typeof entry.url === "string" && entry.url.trim().length > 0);

  return {
    idempotencyKey: readOption(cleanArgs, "idempotency-key") ?? positional[0],
    postedUrl: readOption(cleanArgs, "posted-url") ?? readOption(cleanArgs, "url") ?? positional[1],
    postedAt: readOption(cleanArgs, "posted-at") ?? positional[2],
    receiptPath: readOption(cleanArgs, "receipt-path"),
    evidencePath: readOption(cleanArgs, "evidence-path"),
    note: readOption(cleanArgs, "note"),
    force: readFlag(cleanArgs, "force"),
    platformUrls
  };
}

function findMatches(posts: QueuePost[], idempotencyKey: string): TaskMatch[] {
  const matches: TaskMatch[] = [];
  for (const post of posts) {
    for (const task of platformTasks(post)) {
      if (task.idempotency_key === idempotencyKey) matches.push({ post, task });
    }
  }
  return matches;
}

function localIsoWithOffset(date = new Date()): string {
  const pad = (value: number, size = 2) => String(Math.trunc(Math.abs(value))).padStart(size, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const offsetHours = Math.trunc(Math.abs(offsetMinutes) / 60);
  const offsetRemainder = Math.abs(offsetMinutes) % 60;
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
    sign,
    pad(offsetHours),
    ":",
    pad(offsetRemainder)
  ].join("");
}

function firstApprovedAsset(post: QueuePost, task: PlatformTask): string | null {
  return buildPostingAssetRequirements(post, task)
    .map((requirement) => requirement.approved_asset)
    .find((asset): asset is string => Boolean(asset)) ?? null;
}

function primaryPostedUrl(task: PlatformTask, options: ReceiptOptions): string | null {
  if (options.postedUrl?.trim()) return options.postedUrl.trim();
  if (task.platform !== "Short Video") return null;

  const youtube = options.platformUrls?.find((entry) => entry.platform === "YouTube Shorts")?.url;
  return youtube ?? options.platformUrls?.[0]?.url ?? null;
}

function requiredSurfaceErrors(task: PlatformTask, platformUrls: PlatformUrl[]): string[] {
  if (task.platform !== "Short Video") return [];

  const available = new Set(platformUrls.map((entry) => entry.platform.toLowerCase()));
  const missing = asStringArray(task.required_video_surfaces)
    .filter((surface) => !available.has(surface.toLowerCase()));

  return missing.length
    ? [`Missing URL(s) for required short-video surface(s): ${missing.join(", ")}.`]
    : [];
}

function markResultCommand(input: {
  idempotencyKey: string;
  postedUrl: string;
  postedAt: string;
  receiptPath: string;
  evidencePath: string;
}): string {
  return [
    "npm run social:mark-result --",
    input.idempotencyKey,
    "posted",
    input.postedUrl,
    input.postedAt,
    input.receiptPath,
    input.evidencePath
  ].join(" ");
}

export function buildPostingReceipt(
  match: TaskMatch,
  options: ReceiptOptions,
  now = new Date()
): ReceiptBuildResult {
  const key = asString(match.task.idempotency_key);
  const evidencePlan = createEvidencePlan({
    postId: match.post.post_id,
    platform: match.task.platform,
    idempotencyKey: match.task.idempotency_key,
    timestamp: now
  });
  const postedAt = options.postedAt ?? localIsoWithOffset(now);
  const platformUrls = options.platformUrls ?? [];
  const postedUrl = primaryPostedUrl(match.task, options);

  if (!postedUrl) {
    throw new Error("Missing posted URL. Use a positional URL, --url, or short-video surface URL flags.");
  }

  const surfaceErrors = requiredSurfaceErrors(match.task, platformUrls);
  if (surfaceErrors.length) throw new Error(surfaceErrors.join(" "));

  const receiptPath = options.receiptPath ?? evidencePlan.recommended_receipt_path;
  const evidencePath = options.evidencePath ?? evidencePlan.recommended_evidence_path;
  const receipt: Record<string, unknown> = {
    idempotency_key: key,
    post_id: match.post.post_id,
    campaign_day: asNumber(match.post.campaign_day),
    campaign_date: match.post.scheduled_date,
    platform: match.task.platform,
    board_name: match.task.board_name ?? null,
    posted_at: postedAt,
    status: "posted",
    primary_posted_url: postedUrl,
    approved_asset: firstApprovedAsset(match.post, match.task),
    caption: buildPostingCaption(match.task.caption_source ?? match.post.caption_source, match.task.required_hashtags),
    evidence_path: evidencePath,
    source_records: [
      "content/social/campaigns/book-01/views/tomorrow-start-plan.md",
      "npm run social:receipt",
      "npm run social:done"
    ]
  };

  if (platformUrls.length) receipt.platform_urls = platformUrls;
  if (options.note) receipt.notes = options.note;

  return {
    receipt,
    receiptPath,
    evidencePath,
    markCommand: markResultCommand({
      idempotencyKey: key,
      postedUrl,
      postedAt,
      receiptPath,
      evidencePath
    })
  };
}

async function createReceipt(options: ReceiptOptions): Promise<void> {
  if (!options.idempotencyKey) throw new Error("Missing required idempotency key.");

  const validation = await validateSocialQueue();
  if (!validation.ok) throw new Error(`Social queue validation failed: ${validation.errors.join("; ")}`);

  const matches = findMatches(validation.posts, options.idempotencyKey);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one task for idempotency key "${options.idempotencyKey}", found ${matches.length}.`);
  }

  const result = buildPostingReceipt(matches[0], options);
  const absoluteReceipt = join(process.cwd(), result.receiptPath);
  if (existsSync(absoluteReceipt) && !options.force) {
    throw new Error(`Refusing to overwrite existing receipt without --force: ${result.receiptPath}`);
  }

  await mkdir(dirname(absoluteReceipt), { recursive: true });
  await mkdir(dirname(join(process.cwd(), result.evidencePath)), { recursive: true });
  await writeFile(absoluteReceipt, `${JSON.stringify(result.receipt, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    ok: true,
    receipt_path: result.receiptPath,
    evidence_path: result.evidencePath,
    mark_command: result.markCommand
  }, null, 2));
}

async function main(): Promise<void> {
  await createReceipt(parseArgs(process.argv.slice(2)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({ ok: false, message, errors: [message] }, null, 2));
    process.exitCode = 1;
  });
}
