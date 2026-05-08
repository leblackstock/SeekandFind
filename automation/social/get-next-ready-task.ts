import { pathToFileURL } from "node:url";
import { PlatformTask, QueuePost, validateSocialQueue } from "./validate-queue.js";

export interface NextReadyTask {
  post_id: unknown;
  campaign_day: unknown;
  scheduled_date: unknown;
  platform: unknown;
  status: unknown;
  idempotency_key: unknown;
  board_name: unknown;
  media_assets: unknown;
  caption_source: unknown;
  source_refs: unknown;
  notes: unknown;
}

function platformTasks(post: QueuePost): PlatformTask[] {
  return Array.isArray(post.platform_tasks) ? post.platform_tasks as PlatformTask[] : [];
}

function buildNextTask(post: QueuePost, task: PlatformTask): NextReadyTask {
  return {
    post_id: post.post_id,
    campaign_day: post.campaign_day,
    scheduled_date: post.scheduled_date,
    platform: task.platform,
    status: task.status,
    idempotency_key: task.idempotency_key,
    board_name: task.board_name,
    media_assets: post.media_assets,
    caption_source: task.caption_source ?? post.caption_source,
    source_refs: post.source_refs,
    notes: post.notes
  };
}

export async function getNextReadyTask(): Promise<{ ok: boolean; next_task: NextReadyTask | null; message?: string; errors?: string[] }> {
  const validation = await validateSocialQueue();
  if (!validation.ok) {
    return {
      ok: false,
      next_task: null,
      message: "Social queue validation failed.",
      errors: validation.errors
    };
  }

  for (const post of validation.posts) {
    const readyTask = platformTasks(post).find((task) => task.status === "ready");
    if (readyTask) {
      return {
        ok: true,
        next_task: buildNextTask(post, readyTask)
      };
    }
  }

  return {
    ok: true,
    next_task: null,
    message: "No ready platform tasks found."
  };
}

async function main(): Promise<void> {
  const result = await getNextReadyTask();
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({
      ok: false,
      next_task: null,
      message: "Failed to read next ready social task.",
      errors: [message]
    }));
    process.exitCode = 1;
  });
}
