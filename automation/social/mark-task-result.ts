import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { PlatformTask, QueuePost, queuePath, validateSocialQueue } from "./validate-queue.js";

const allowedNewStatuses = new Set(["posted", "posted-early", "error", "skipped"]);

interface CliOptions {
  idempotencyKey?: string;
  status?: string;
  postedUrl?: string;
  postedAt?: string;
  receiptPath?: string;
  evidencePath?: string;
  error?: string;
  force: boolean;
}

interface TaskMatch {
  post: QueuePost;
  task: PlatformTask;
}

function readOption(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1];
  return undefined;
}

function parseArgs(args: string[]): CliOptions {
  const positional = args.filter((arg) => !arg.startsWith("--"));
  const positionalStatus = readOption(args, "status") ?? positional[1];
  const positionalRemainder = positional.slice(2);
  const positionalIsError = positionalStatus === "error" && positionalRemainder.length > 0;

  return {
    idempotencyKey: readOption(args, "idempotency-key") ?? positional[0],
    status: positionalStatus,
    postedUrl: readOption(args, "posted-url") ?? (!positionalIsError ? positionalRemainder[0] : undefined),
    postedAt: readOption(args, "posted-at") ?? (!positionalIsError ? positionalRemainder[1] : undefined),
    receiptPath: readOption(args, "receipt-path") ?? (!positionalIsError ? positionalRemainder[2] : undefined),
    evidencePath: readOption(args, "evidence-path") ?? (!positionalIsError ? positionalRemainder[3] : undefined),
    error: readOption(args, "error") ?? (positionalIsError ? positionalRemainder.join(" ") : positionalRemainder[4]),
    force: args.includes("--force")
  };
}

function fail(message: string, errors: string[] = [message]): never {
  console.log(JSON.stringify({ ok: false, message, errors }));
  process.exit(1);
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

function applyTaskUpdate(task: PlatformTask, options: CliOptions): void {
  task.status = options.status;
  if (options.postedUrl !== undefined) task.posted_url = options.postedUrl;
  if (options.postedAt !== undefined) task.posted_at = options.postedAt;
  if (options.receiptPath !== undefined) task.receipt_path = options.receiptPath;
  if (options.evidencePath !== undefined) task.evidence_path = options.evidencePath;
  if (options.error !== undefined) task.error = options.error;
}

async function markTaskResult(options: CliOptions): Promise<void> {
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

  applyTaskUpdate(match.task, options);
  await writeFile(join(process.cwd(), queuePath), `${JSON.stringify(before.queue, null, 2)}\n`, "utf8");

  const after = await validateSocialQueue();
  if (!after.ok) fail("Social queue validation failed after update.", after.errors);

  console.log(JSON.stringify({
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
  }));
}

async function main(): Promise<void> {
  await markTaskResult(parseArgs(process.argv.slice(2).filter((arg) => arg !== "--")));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({ ok: false, message, errors: [message] }));
    process.exitCode = 1;
  });
}
