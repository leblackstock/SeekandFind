import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildPostingReceipt,
  ReceiptBuildResult,
  ReceiptOptions,
  TaskMatch
} from "./create-posting-receipt.js";
import {
  markTaskResult,
  MarkTaskResultOptions,
  MarkTaskResultSummary
} from "./mark-task-result.js";
import { buildCompactPostingPacket } from "./compact-posting-packet.js";
import { PlatformTask, QueuePost, validateSocialQueue } from "./validate-queue.js";

interface PlatformUrl {
  platform: string;
  url: string;
}

export interface CompletePostingOptions extends ReceiptOptions {
  status?: "posted" | "posted-early";
  skipNextPacket?: boolean;
}

export interface PostingCompletionPlan {
  receiptResult: ReceiptBuildResult;
  markOptions: MarkTaskResultOptions;
}

export interface PostingCompletionResult {
  ok: true;
  receipt_path: string;
  evidence_path: string;
  queue_result: MarkTaskResultSummary;
  validation_summary: string[];
  next_command: string;
  next_packet?: string;
}

const shortVideoSurfaceFlags: Array<[flag: string, platform: string]> = [
  ["youtube", "YouTube Shorts"],
  ["tiktok", "TikTok"],
  ["instagram", "Instagram Reels"],
  ["facebook", "Facebook Reels"],
  ["pinterest", "Pinterest Video Pin"]
];

const valueOptionNames = new Set([
  "idempotency-key",
  "posted-url",
  "url",
  "posted-at",
  "receipt-path",
  "evidence-path",
  "note",
  "status",
  "youtube",
  "tiktok",
  "instagram",
  "facebook",
  "pinterest"
]);

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

function positionalArgs(args: string[]): string[] {
  const consumed = new Set<number>();

  args.forEach((arg, index) => {
    if (!arg.startsWith("--")) return;
    const rawName = arg.slice(2).split("=")[0];
    consumed.add(index);
    if (valueOptionNames.has(rawName) && !arg.includes("=")) consumed.add(index + 1);
  });

  return args.filter((arg, index) => !consumed.has(index) && !arg.startsWith("--"));
}

export function parseCompletePostingArgs(args: string[]): CompletePostingOptions {
  const cleanArgs = args.filter((arg) => arg !== "--");
  const positional = positionalArgs(cleanArgs);
  const platformUrls: PlatformUrl[] = shortVideoSurfaceFlags
    .map(([flag, platform]) => ({ platform, url: readOption(cleanArgs, flag) }))
    .filter((entry): entry is PlatformUrl => typeof entry.url === "string" && entry.url.trim().length > 0);
  const status = readOption(cleanArgs, "status") === "posted-early" || readFlag(cleanArgs, "posted-early")
    ? "posted-early"
    : "posted";

  return {
    idempotencyKey: readOption(cleanArgs, "idempotency-key") ?? positional[0],
    postedUrl: readOption(cleanArgs, "posted-url") ?? readOption(cleanArgs, "url") ?? positional[1],
    postedAt: readOption(cleanArgs, "posted-at") ?? positional[2],
    receiptPath: readOption(cleanArgs, "receipt-path"),
    evidencePath: readOption(cleanArgs, "evidence-path"),
    note: readOption(cleanArgs, "note"),
    force: readFlag(cleanArgs, "force"),
    platformUrls,
    status,
    skipNextPacket: readFlag(cleanArgs, "no-next")
  };
}

function platformTasks(post: QueuePost): PlatformTask[] {
  return Array.isArray(post.platform_tasks) ? post.platform_tasks as PlatformTask[] : [];
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

async function writeReceipt(result: ReceiptBuildResult, force?: boolean): Promise<void> {
  const absoluteReceipt = join(process.cwd(), result.receiptPath);
  if (existsSync(absoluteReceipt) && !force) {
    throw new Error(`Refusing to overwrite existing receipt without --force: ${result.receiptPath}`);
  }

  await mkdir(dirname(absoluteReceipt), { recursive: true });
  await mkdir(dirname(join(process.cwd(), result.evidencePath)), { recursive: true });
  await writeFile(absoluteReceipt, `${JSON.stringify(result.receipt, null, 2)}\n`, "utf8");
}

export function buildPostingCompletionPlan(
  match: TaskMatch,
  options: CompletePostingOptions,
  now = new Date()
): PostingCompletionPlan {
  const receiptResult = buildPostingReceipt(match, options, now);
  const postedUrl = String(receiptResult.receipt.primary_posted_url ?? "");
  const postedAt = String(receiptResult.receipt.posted_at ?? "");

  return {
    receiptResult,
    markOptions: {
      idempotencyKey: String(match.task.idempotency_key ?? ""),
      status: options.status ?? "posted",
      postedUrl,
      postedAt,
      receiptPath: receiptResult.receiptPath,
      evidencePath: receiptResult.evidencePath,
      platformUrls: Array.isArray(receiptResult.receipt.platform_urls) ? receiptResult.receipt.platform_urls : undefined,
      force: options.force
    }
  };
}

export async function completePostingTask(options: CompletePostingOptions): Promise<PostingCompletionResult> {
  if (!options.idempotencyKey) throw new Error("Missing required idempotency key.");

  const before = await validateSocialQueue();
  if (!before.ok) throw new Error(`Social queue validation failed before update: ${before.errors.join("; ")}`);

  const matches = findMatches(before.posts, options.idempotencyKey);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one task for idempotency key "${options.idempotencyKey}", found ${matches.length}.`);
  }

  const plan = buildPostingCompletionPlan(matches[0], options);
  await writeReceipt(plan.receiptResult, options.force);
  const queueResult = await markTaskResult(plan.markOptions);
  const after = await validateSocialQueue();
  if (!after.ok) throw new Error(`Social queue validation failed after update: ${after.errors.join("; ")}`);

  const packet = options.skipNextPacket
    ? undefined
    : buildCompactPostingPacket(after.posts, { autoDuePressureChunk: true }).markdown;

  return {
    ok: true,
    receipt_path: plan.receiptResult.receiptPath,
    evidence_path: plan.receiptResult.evidencePath,
    queue_result: queueResult,
    validation_summary: after.summary,
    next_command: "npm run social:today",
    next_packet: packet
  };
}

async function main(): Promise<void> {
  const result = await completePostingTask(parseCompletePostingArgs(process.argv.slice(2)));
  const { next_packet: nextPacket, ...summary } = result;
  console.log(JSON.stringify(summary, null, 2));
  if (nextPacket) {
    console.log("\n--- next packet ---\n");
    console.log(nextPacket);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({ ok: false, message, errors: [message] }, null, 2));
    process.exitCode = 1;
  });
}
