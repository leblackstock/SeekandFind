import { pathToFileURL } from "node:url";
import { PlatformTask, QueuePost, validateSocialQueue } from "./validate-queue.js";

interface TaskMatch {
  post: QueuePost;
  task: PlatformTask;
}

export interface EvidencePlan {
  recommended_receipt_path: string;
  recommended_evidence_path: string;
  recommended_error_path: string;
  timestamp_slug: string;
}

function readOption(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1];
  return undefined;
}

function parseIdempotencyKey(args: string[]): string | undefined {
  const cleanArgs = args.filter((arg) => arg !== "--");
  return readOption(cleanArgs, "idempotency-key") ?? cleanArgs.find((arg) => !arg.startsWith("--"));
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

export function normalizePathPart(value: unknown): string {
  return String(value ?? "unknown")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

export function timestampSlug(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[:.]/g, "-");
}

function plannedPath(kind: "receipts" | "evidence", platform: string, postId: string, fileName: string): string {
  return `content/social/campaigns/book-01/${kind}/${platform}/${postId}/${fileName}`;
}

export function createEvidencePlan(input: { postId: unknown; platform: unknown; idempotencyKey: unknown; timestamp?: Date }): EvidencePlan {
  const postId = normalizePathPart(input.postId);
  const platform = normalizePathPart(input.platform);
  const key = normalizePathPart(input.idempotencyKey);
  const stamp = timestampSlug(input.timestamp);

  return {
    recommended_receipt_path: plannedPath("receipts", platform, postId, `${key}.json`),
    recommended_evidence_path: plannedPath("evidence", platform, postId, `${key}-${stamp}.png`),
    recommended_error_path: plannedPath("evidence", platform, postId, `${key}-${stamp}-error.json`),
    timestamp_slug: stamp
  };
}

async function planTaskEvidence(idempotencyKey: string | undefined): Promise<void> {
  if (!idempotencyKey) {
    console.log(JSON.stringify({
      ok: false,
      message: "Missing required --idempotency-key.",
      errors: ["Missing required --idempotency-key."]
    }));
    process.exit(1);
  }

  const validation = await validateSocialQueue();
  if (!validation.ok) {
    console.log(JSON.stringify({
      ok: false,
      message: "Social queue validation failed.",
      errors: validation.errors
    }));
    process.exit(1);
  }

  const matches = findMatches(validation.posts, idempotencyKey);
  if (matches.length !== 1) {
    console.log(JSON.stringify({
      ok: false,
      message: `Expected exactly one task for idempotency key "${idempotencyKey}", found ${matches.length}.`,
      errors: [`Expected exactly one task for idempotency key "${idempotencyKey}", found ${matches.length}.`]
    }));
    process.exit(1);
  }

  const match = matches[0];
  const evidencePlan = createEvidencePlan({
    postId: match.post.post_id,
    platform: match.task.platform,
    idempotencyKey: match.task.idempotency_key
  });

  console.log(JSON.stringify({
    ok: true,
    post_id: match.post.post_id,
    campaign_day: match.post.campaign_day,
    platform: match.task.platform,
    idempotency_key: match.task.idempotency_key,
    ...evidencePlan
  }));
}

async function main(): Promise<void> {
  await planTaskEvidence(parseIdempotencyKey(process.argv.slice(2)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({ ok: false, message, errors: [message] }));
    process.exitCode = 1;
  });
}
