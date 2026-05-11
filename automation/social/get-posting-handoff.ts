import { pathToFileURL } from "node:url";
import { buildDuePressureChunk, ReadyChunkTask } from "./due-pressure-chunks.js";
import { getNextReadyTask } from "./get-next-ready-task.js";
import { createEvidencePlan } from "./plan-task-evidence.js";
import { validateSocialQueue } from "./validate-queue.js";

function buildChunkEvidencePlans(tasks: ReadyChunkTask[]): unknown[] {
  return tasks.map((task) => ({
    post_id: task.post_id,
    campaign_day: task.campaign_day,
    platform: task.platform,
    idempotency_key: task.idempotency_key,
    evidence_plan: createEvidencePlan({
      postId: task.post_id,
      platform: task.platform,
      idempotencyKey: task.idempotency_key
    })
  }));
}

async function getPostingHandoff(): Promise<unknown> {
  const validation = await validateSocialQueue();
  if (!validation.ok) {
    return {
      ok: false,
      mode: "error",
      task: null,
      message: "Social queue validation failed.",
      errors: validation.errors
    };
  }

  const duePressureChunk = buildDuePressureChunk(validation.posts);
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
      message: "No ready platform tasks found.",
      due_pressure_chunk: null,
      workflow_efficiency: {
        question: "Can any upcoming or looming task be kept from becoming Q1?",
        recommendation: "No ready platform tasks are available to chunk right now."
      }
    };
  }

  return {
    ok: true,
    mode: "ready",
    task: nextReady.next_task,
    due_pressure_chunk: duePressureChunk
      ? {
          ...duePressureChunk,
          evidence_plans: buildChunkEvidencePlans(duePressureChunk.tasks)
        }
      : null,
    workflow_efficiency: {
      question: "Can any upcoming or looming task be kept from becoming Q1?",
      recommendation: duePressureChunk
        ? duePressureChunk.prevention_path
        : "No due-pressure chunk is currently ready; use the single next task."
    },
    evidence_plan: createEvidencePlan({
      postId: nextReady.next_task.post_id,
      platform: nextReady.next_task.platform,
      idempotencyKey: nextReady.next_task.idempotency_key
    }),
    live_upload_recovery: nextReady.next_task.platform === "Short Video"
      ? {
          command: "npm run social:live-upload-recovery -- --match-url studio.youtube.com",
          rule: "Use this for controlled inspection of an open upload draft. Do not reload, navigate, go back, go forward, or close the attached browser session; cancel any reload dialog immediately."
        }
      : null
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
