import { pathToFileURL } from "node:url";
import { PlatformTask, QueuePost, validateSocialQueue } from "./validate-queue.js";

const blockerStatusPriority = ["needs-account", "needs-video-export", "error"] as const;
type BlockerStatus = typeof blockerStatusPriority[number];

interface NextBlocker {
  post_id: unknown;
  campaign_day: unknown;
  scheduled_date: unknown;
  platform: unknown;
  status: BlockerStatus;
  idempotency_key: unknown;
  reason: string;
  media_assets: unknown;
  caption_source: unknown;
  notes: unknown;
  source_refs: unknown;
}

function platformTasks(post: QueuePost): PlatformTask[] {
  return Array.isArray(post.platform_tasks) ? post.platform_tasks as PlatformTask[] : [];
}

function asBlockerStatus(status: unknown): BlockerStatus | null {
  return blockerStatusPriority.find((candidate) => candidate === status) ?? null;
}

function campaignDayNumber(post: QueuePost): number {
  return typeof post.campaign_day === "number" ? post.campaign_day : Number.MAX_SAFE_INTEGER;
}

function blockerReason(status: BlockerStatus, task: PlatformTask): string {
  if (status === "needs-account") {
    return "Platform account or business connection must be resolved before this task can be posted.";
  }
  if (status === "needs-video-export") {
    return "A finished video export is required before this task can be posted.";
  }

  const error = typeof task.error === "string" && task.error.trim() ? task.error.trim() : null;
  return error ?? "Task is marked error and needs review before it can be posted.";
}

function sourceRefs(post: QueuePost, task: PlatformTask): unknown {
  if (Array.isArray(task.source_refs) && task.source_refs.length > 0) return task.source_refs;
  return post.source_refs;
}

function buildBlocker(post: QueuePost, task: PlatformTask, status: BlockerStatus): NextBlocker {
  return {
    post_id: post.post_id,
    campaign_day: post.campaign_day,
    scheduled_date: post.scheduled_date,
    platform: task.platform,
    status,
    idempotency_key: task.idempotency_key,
    reason: blockerReason(status, task),
    media_assets: post.media_assets,
    caption_source: task.caption_source ?? post.caption_source,
    notes: post.notes,
    source_refs: sourceRefs(post, task)
  };
}

export async function getNextBlocker(): Promise<
  | { ok: true; mode: "blocked"; blocker: NextBlocker }
  | { ok: true; mode: "clear"; blocker: null; message: string }
  | { ok: false; mode: "error"; blocker: null; message: string; errors: string[] }
> {
  const validation = await validateSocialQueue();
  if (!validation.ok) {
    return {
      ok: false,
      mode: "error",
      blocker: null,
      message: "Social queue validation failed.",
      errors: validation.errors
    };
  }

  const postsByDay = [...validation.posts].sort((left, right) => campaignDayNumber(left) - campaignDayNumber(right));
  for (const post of postsByDay) {
    const tasks = platformTasks(post);
    for (const status of blockerStatusPriority) {
      const task = tasks.find((candidate) => asBlockerStatus(candidate.status) === status);
      if (task) {
        return {
          ok: true,
          mode: "blocked",
          blocker: buildBlocker(post, task, status)
        };
      }
    }
  }

  return {
    ok: true,
    mode: "clear",
    blocker: null,
    message: "No blocker tasks found."
  };
}

async function main(): Promise<void> {
  const result = await getNextBlocker();
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({
      ok: false,
      mode: "error",
      blocker: null,
      message: "Failed to read next social blocker.",
      errors: [message]
    }));
    process.exitCode = 1;
  });
}
