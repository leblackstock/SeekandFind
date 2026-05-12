import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  PlatformTask,
  QueuePost,
  checkRequiredVideoSurfaces,
  queuePath,
  validateSocialQueue
} from "./validate-queue.js";

const allowedNewStatuses = new Set(["posted", "posted-early", "error", "skipped"]);
const valueOptionNames = ["idempotency-key", "status", "posted-url", "posted-at", "receipt-path", "evidence-path", "error"];

export interface MarkTaskResultOptions {
  idempotencyKey?: string;
  status?: string;
  postedUrl?: string;
  postedAt?: string;
  receiptPath?: string;
  evidencePath?: string;
  error?: string;
  platformUrls?: unknown[];
  force?: boolean;
}

export interface MarkTaskResultSummary {
  ok: true;
  idempotency_key: string;
  post_id: unknown;
  platform: unknown;
  old_status: string | null;
  new_status: unknown;
  posted_url: unknown;
  posted_at: unknown;
  receipt_path: unknown;
  evidence_path: unknown;
  error: unknown;
}

interface TaskMatch {
  post: QueuePost;
  task: PlatformTask;
}

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

  const namesConsumedByNpm = valueOptionNames.filter((name) => npmConfigValue(name) === "true");
  if (!namesConsumedByNpm.length) return args;

  const normalized: string[] = [];
  let positionalIndex = 0;

  for (const name of valueOptionNames) {
    const envValue = npmConfigValue(name);
    if (envValue === undefined) continue;
    if (isNpmBooleanConfig(envValue)) {
      if (envValue === "true") {
        const positionalValue = args[positionalIndex];
        if (positionalValue !== undefined) {
          normalized.push(`--${name}`, positionalValue);
          positionalIndex += 1;
        }
      }
      continue;
    }
    normalized.push(`--${name}`, envValue);
  }

  normalized.push(...args.slice(positionalIndex));
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
  const value = readOption(args, name);
  if (value !== undefined) return !/^(false|0|no)$/i.test(value);
  return args.includes(`--${name}`);
}

function parseArgs(args: string[]): MarkTaskResultOptions {
  const normalizedArgs = normalizeNpmConsumedArgs(args);
  const positional = normalizedArgs.filter((arg) => !arg.startsWith("--"));
  const positionalStatus = readOption(normalizedArgs, "status") ?? positional[1];
  const positionalRemainder = positional.slice(2);
  const positionalIsError = positionalStatus === "error" && positionalRemainder.length > 0;

  return {
    idempotencyKey: readOption(normalizedArgs, "idempotency-key") ?? positional[0],
    status: positionalStatus,
    postedUrl: readOption(normalizedArgs, "posted-url") ?? (!positionalIsError ? positionalRemainder[0] : undefined),
    postedAt: readOption(normalizedArgs, "posted-at") ?? (!positionalIsError ? positionalRemainder[1] : undefined),
    receiptPath: readOption(normalizedArgs, "receipt-path") ?? (!positionalIsError ? positionalRemainder[2] : undefined),
    evidencePath: readOption(normalizedArgs, "evidence-path") ?? (!positionalIsError ? positionalRemainder[3] : undefined),
    error: readOption(normalizedArgs, "error") ?? (positionalIsError ? positionalRemainder.join(" ") : positionalRemainder[4]),
    force: readFlag(normalizedArgs, "force")
  };
}

export class MarkTaskResultError extends Error {
  errors: string[];

  constructor(message: string, errors: string[] = [message]) {
    super(message);
    this.name = "MarkTaskResultError";
    this.errors = errors;
  }
}

function fail(message: string, errors: string[] = [message]): never {
  throw new MarkTaskResultError(message, errors);
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

function applyTaskUpdate(task: PlatformTask, options: MarkTaskResultOptions): void {
  task.status = options.status;
  if (options.postedUrl !== undefined) task.posted_url = options.postedUrl;
  if (options.postedAt !== undefined) task.posted_at = options.postedAt;
  if (options.receiptPath !== undefined) task.receipt_path = options.receiptPath;
  if (options.evidencePath !== undefined) task.evidence_path = options.evidencePath;
  if (options.error !== undefined) task.error = options.error;
  if (options.platformUrls !== undefined) task.platform_urls = options.platformUrls;
}

function isPostedStatus(status: unknown): boolean {
  return status === "posted" || status === "posted-early";
}

export async function markTaskResult(options: MarkTaskResultOptions): Promise<MarkTaskResultSummary> {
  if (!options.idempotencyKey) fail("Missing required --idempotency-key.");
  if (!options.status) fail("Missing required --status.");
  if (!allowedNewStatuses.has(options.status)) {
    fail(`Invalid --status "${options.status}".`, [
      `Allowed statuses: ${Array.from(allowedNewStatuses).join(", ")}.`
    ]);
  }

  const before = await validateSocialQueue();
  if (!before.ok) fail("Social queue validation failed before update.", before.errors);

  const matches = findMatches(before.posts, options.idempotencyKey);
  if (matches.length !== 1) {
    fail(`Expected exactly one task for idempotency key "${options.idempotencyKey}", found ${matches.length}.`);
  }

  const match = matches[0];
  const oldStatus = typeof match.task.status === "string" ? match.task.status : null;
  if ((oldStatus === "posted" || oldStatus === "posted-early") && !options.force) {
    fail(`Task "${options.idempotencyKey}" is already ${oldStatus}. Re-run with --force to overwrite.`);
  }

  const updatedTask = { ...match.task };
  applyTaskUpdate(updatedTask, options);

  if (updatedTask.platform === "Short Video" && isPostedStatus(updatedTask.status)) {
    const surfaceCheck = await checkRequiredVideoSurfaces(updatedTask);
    if (surfaceCheck.errors.length > 0 || surfaceCheck.missing.length > 0) {
      fail(`Short Video bundle "${options.idempotencyKey}" is not complete across all required video surfaces.`, [
        ...surfaceCheck.errors,
        ...(surfaceCheck.missing.length
          ? [`Missing posted URL(s) for required surface(s): ${surfaceCheck.missing.join(", ")}.`]
          : []),
        "Keep the task ready until the receipt/platform_urls include every required video surface."
      ]);
    }
  }

  applyTaskUpdate(match.task, options);
  await writeFile(join(process.cwd(), queuePath), `${JSON.stringify(before.queue, null, 2)}\n`, "utf8");

  const after = await validateSocialQueue();
  if (!after.ok) fail("Social queue validation failed after update.", after.errors);

  return {
    ok: true,
    idempotency_key: options.idempotencyKey,
    post_id: match.post.post_id,
    platform: match.task.platform,
    old_status: oldStatus,
    new_status: match.task.status,
    posted_url: match.task.posted_url ?? null,
    posted_at: match.task.posted_at ?? null,
    receipt_path: match.task.receipt_path ?? null,
    evidence_path: match.task.evidence_path ?? null,
    error: match.task.error ?? null
  };
}

async function main(): Promise<void> {
  const result = await markTaskResult(parseArgs(process.argv.slice(2).filter((arg) => arg !== "--")));
  console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const errors = error instanceof MarkTaskResultError ? error.errors : [message];
    console.log(JSON.stringify({ ok: false, message, errors }));
    process.exitCode = 1;
  });
}
