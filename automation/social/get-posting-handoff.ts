import { pathToFileURL } from "node:url";
import { getNextReadyTask } from "./get-next-ready-task.js";
import { createEvidencePlan } from "./plan-task-evidence.js";

async function getPostingHandoff(): Promise<unknown> {
  const nextReady = await getNextReadyTask();
  if (!nextReady.ok) {
    return {
      ok: false,
      mode: "error",
      task: null,
      message: nextReady.message ?? "Failed to get next ready social task.",
      errors: nextReady.errors ?? []
    };
  }

  if (!nextReady.next_task) {
    return {
      ok: true,
      mode: "empty",
      task: null,
      message: "No ready platform tasks found."
    };
  }

  return {
    ok: true,
    mode: "ready",
    task: nextReady.next_task,
    evidence_plan: createEvidencePlan({
      postId: nextReady.next_task.post_id,
      platform: nextReady.next_task.platform,
      idempotencyKey: nextReady.next_task.idempotency_key
    })
  };
}

async function main(): Promise<void> {
  const result = await getPostingHandoff();
  console.log(JSON.stringify(result));
  if (typeof result === "object" && result && "ok" in result && result.ok === false) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({
      ok: false,
      mode: "error",
      task: null,
      message,
      errors: [message]
    }));
    process.exitCode = 1;
  });
}
