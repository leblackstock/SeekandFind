import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { buildDuePressureChunk, DuePressureChunk } from "./due-pressure-chunks.js";
import { PlatformTask, QueuePost, validateSocialQueue } from "./validate-queue.js";

type Quadrant = "Q1" | "Q2" | "Q3" | "Q4";

interface Candidate {
  task: string;
  quadrant: Quadrant;
  importance: number;
  urgency: number;
  reason: string;
  usefulCommand: string;
  avoid?: string;
}

interface TaskWithPost {
  post: QueuePost;
  task: PlatformTask;
  taskIndex: number;
}

interface DayReadiness {
  campaignDay: number;
  staticReady: boolean;
  pinterestReady: boolean;
  metaReady: boolean;
  videoReady: boolean;
  fullyPrepared: boolean;
  missingVideoExport: boolean;
  warnings: string[];
}

interface ReadinessAudit {
  days: DayReadiness[];
  staticReadyDays: number[];
  pinterestReadyDays: number[];
  metaReadyDays: number[];
  videoReadyDays: number[];
  fullyPreparedDays: number[];
  missingVideoExportDays: number[];
  warnings: string[];
}

const quadrantLabels: Record<Quadrant, string> = {
  Q1: "Important + Urgent",
  Q2: "Important + Not Urgent",
  Q3: "Not Important + Urgent",
  Q4: "Not Important + Not Urgent"
};

const quadrantRank: Record<Quadrant, number> = {
  Q1: 4,
  Q2: 3,
  Q3: 2,
  Q4: 1
};

const statusOrder = ["posted", "posted-early", "ready", "needs-account", "needs-video-export", "error", "skipped"];
const blockerStatusPriority = ["needs-account", "needs-video-export", "error"];

function platformTasks(post: QueuePost): PlatformTask[] {
  return Array.isArray(post.platform_tasks) ? post.platform_tasks as PlatformTask[] : [];
}

function campaignDay(post: QueuePost): number {
  return typeof post.campaign_day === "number" ? post.campaign_day : Number.MAX_SAFE_INTEGER;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isDoneOrReady(status: unknown): boolean {
  return status === "ready" || status === "posted" || status === "posted-early";
}

function hasTextCaption(post: QueuePost): boolean {
  const postCaption = post.caption_source as { text?: unknown } | undefined;
  if (asString(postCaption?.text).trim()) return true;

  return platformTasks(post).some((task) => {
    const taskCaption = task.caption_source as { text?: unknown } | undefined;
    return Boolean(asString(taskCaption?.text).trim());
  });
}

function localPathExists(path: string): boolean {
  return path.length > 0 && existsSync(path);
}

function hasApprovedImage(post: QueuePost): boolean {
  const assets = Array.isArray(post.media_assets) ? post.media_assets : [];
  return assets.some((asset) => {
    const path = asString(asset);
    return /content\/outputs\/images\/approved\/.+\.(png|jpe?g|webp)$/i.test(path.replaceAll("\\", "/"))
      && localPathExists(path);
  });
}

function hasApprovedVideoExport(post: QueuePost): boolean {
  const assets = Array.isArray(post.media_assets) ? post.media_assets : [];
  return assets.some((asset) => {
    const path = asString(asset);
    return /content\/outputs\/videos\/approved\/.+\.(mp4|mov|webm|m4v)$/i.test(path.replaceAll("\\", "/"))
      && localPathExists(path);
  });
}

function allRequiredTasksReady(tasks: PlatformTask[], predicate: (task: PlatformTask) => boolean): boolean {
  const requiredTasks = tasks.filter(predicate);
  return requiredTasks.length > 0 && requiredTasks.every((task) => isDoneOrReady(task.status));
}

function auditReadiness(posts: QueuePost[]): ReadinessAudit {
  const days = sortedPosts(posts).map((post) => {
    const tasks = platformTasks(post);
    const day = campaignDay(post);
    const staticReady = hasApprovedImage(post) && hasTextCaption(post);
    const pinterestReady = allRequiredTasksReady(tasks, (task) => task.platform === "Pinterest");
    const metaReady = allRequiredTasksReady(tasks, (task) => task.platform === "Instagram" || task.platform === "Facebook");
    const shortVideoTask = tasks.find((task) => task.platform === "Short Video");
    const approvedVideoExists = hasApprovedVideoExport(post);
    const shortVideoReadyOrPosted = Boolean(shortVideoTask && isDoneOrReady(shortVideoTask.status));
    const videoReady = Boolean(shortVideoTask && shortVideoReadyOrPosted && approvedVideoExists);
    const fullyPrepared = pinterestReady && metaReady && videoReady;
    const warnings = tasks
      .filter((task) => task.status === "needs-video-export" || task.status === "needs-account")
      .map((task) => `Day ${day} ${asString(task.platform)} is ${asString(task.status)}.`);

    if (shortVideoTask?.status === "ready" && !approvedVideoExists) {
      warnings.push(`Day ${day} Short Video is ready but no approved video export is referenced in media_assets.`);
    }

    return {
      campaignDay: day,
      staticReady,
      pinterestReady,
      metaReady,
      videoReady,
      fullyPrepared,
      missingVideoExport: Boolean(shortVideoTask && !videoReady),
      warnings
    };
  });

  const collect = (predicate: (day: DayReadiness) => boolean) => days
    .filter(predicate)
    .map((day) => day.campaignDay);

  return {
    days,
    staticReadyDays: collect((day) => day.staticReady),
    pinterestReadyDays: collect((day) => day.pinterestReady),
    metaReadyDays: collect((day) => day.metaReady),
    videoReadyDays: collect((day) => day.videoReady),
    fullyPreparedDays: collect((day) => day.fullyPrepared),
    missingVideoExportDays: collect((day) => day.missingVideoExport),
    warnings: days.flatMap((day) => day.warnings)
  };
}

function formatDays(days: number[]): string {
  return days.length > 0 ? days.map((day) => `Day ${day}`).join(", ") : "none";
}

function formatChunkDays(chunk: DuePressureChunk | null): string {
  return chunk ? formatDays(chunk.days) : "none";
}

function formatChunkTasks(chunk: DuePressureChunk | null): string {
  if (!chunk) return "none";
  return chunk.tasks.map((task) => {
    const day = typeof task.campaign_day === "number" ? `Day ${task.campaign_day}` : "Unknown day";
    const platform = asString(task.platform) || "Unknown platform";
    const board = asString(task.board_name);
    return `${day} ${platform}${board ? ` (${board})` : ""}`;
  }).join("; ");
}

function statusCounts(tasks: PlatformTask[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const task of tasks) {
    const status = asString(task.status) || "missing";
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

function formatCounts(counts: Record<string, number>): string[] {
  return statusOrder
    .filter((status) => counts[status])
    .map((status) => `${status}: ${counts[status]}`);
}

function allTasks(posts: QueuePost[]): TaskWithPost[] {
  return posts.flatMap((post) => platformTasks(post).map((task, taskIndex) => ({ post, task, taskIndex })));
}

function sortedPosts(posts: QueuePost[]): QueuePost[] {
  return [...posts].sort((left, right) => campaignDay(left) - campaignDay(right));
}

function findNextReady(posts: QueuePost[]): TaskWithPost | null {
  for (const post of posts) {
    const tasks = platformTasks(post);
    const taskIndex = tasks.findIndex((task) => task.status === "ready");
    if (taskIndex >= 0) return { post, task: tasks[taskIndex], taskIndex };
  }
  return null;
}

function findNextBlocker(posts: QueuePost[], status?: string): TaskWithPost | null {
  for (const post of posts) {
    const tasks = platformTasks(post);
    const statuses = status ? [status] : blockerStatusPriority;
    for (const blockerStatus of statuses) {
      const taskIndex = tasks.findIndex((task) => task.status === blockerStatus);
      if (taskIndex >= 0) return { post, task: tasks[taskIndex], taskIndex };
    }
  }
  return null;
}

function taskLabel(item: TaskWithPost): string {
  const day = campaignDay(item.post);
  const platform = asString(item.task.platform) || "Unknown platform";
  const key = asString(item.task.idempotency_key);
  const board = asString(item.task.board_name);
  return `Day ${day} ${platform}${board ? ` (${board})` : ""}${key ? ` - ${key}` : ""}`;
}

function compactTask(item: TaskWithPost | null): string {
  return item ? taskLabel(item) : "none";
}

function scoreCandidates(
  posts: QueuePost[],
  validationOk: boolean,
  noPinterestPublishingToday: boolean,
  readiness: ReadinessAudit,
  duePressureChunk: DuePressureChunk | null
): Candidate[] {
  const candidates: Candidate[] = [];
  if (!validationOk) {
    candidates.push({
      task: "Fix social queue validation",
      quadrant: "Q1",
      importance: 5,
      urgency: 5,
      reason: "Broken validation can make posting or blocker cleanup unsafe.",
      usefulCommand: "npm run validate:social-queue",
      avoid: "Do not post or mark results until validation passes."
    });
    return candidates;
  }

  const postsByDay = sortedPosts(posts);
  const nextAccountBlocker = findNextBlocker(postsByDay, "needs-account");
  const nextVideoBlocker = findNextBlocker(postsByDay, "needs-video-export");
  const nextError = findNextBlocker(postsByDay, "error");
  const nextReady = findNextReady(postsByDay);
  const readyPinterest = nextReady?.task.platform === "Pinterest" ? nextReady : allTasks(postsByDay)
    .find((item) => item.task.status === "ready" && item.task.platform === "Pinterest") ?? null;

  const fullPreparedDays = readiness.fullyPreparedDays.length;
  const runwayBelowSevenDays = fullPreparedDays < 7;

  if (duePressureChunk) {
    candidates.push({
      task: `Build/post due-pressure chunk: ${formatChunkDays(duePressureChunk)}`,
      quadrant: duePressureChunk.quadrant,
      importance: duePressureChunk.importance,
      urgency: duePressureChunk.urgency,
      reason: duePressureChunk.scope === "behind_or_due_today"
        ? `Ready work is behind or due today across ${duePressureChunk.task_count} task(s); chunking prevents repeated handoff/browser/receipt setup.`
        : `Ready work is due within 2 days across ${duePressureChunk.task_count} task(s); preparing it now keeps it from becoming Q1.`,
      usefulCommand: "npm run social:today",
      avoid: "Do not run one-task handoff/browser loops when a due-pressure chunk exists."
    });
  }

  if (nextAccountBlocker) {
    candidates.push({
      task: `Resolve account blocker: ${taskLabel(nextAccountBlocker)}`,
      quadrant: "Q1",
      importance: 5,
      urgency: 5,
      reason: "Meta/Instagram/Facebook account blockers are stopping current and near-term cross-platform coverage.",
      usefulCommand: "npm run social:next-blocker",
      avoid: "Do not publish Pinterest while account blockers are the real bottleneck."
    });
  }

  if (nextVideoBlocker) {
    candidates.push({
      task: `Prepare missing video export: ${taskLabel(nextVideoBlocker)}`,
      quadrant: "Q1",
      importance: 4,
      urgency: 4,
      reason: nextAccountBlocker
        ? "Video exports matter for the campaign, but account blockers should be cleared first unless this video is needed immediately."
        : "Video exports are now the main campaign blocker because static, Pinterest, and Meta tasks are ready.",
      usefulCommand: "Use the Day 3 short-video asset brief, then export/review before marking the queue.",
      avoid: "Do not mark the short-video task posted without a finished export and live URLs."
    });
  }

  if (nextError) {
    candidates.push({
      task: `Review errored task: ${taskLabel(nextError)}`,
      quadrant: "Q1",
      importance: 5,
      urgency: 4,
      reason: "Errored automation can cause repeats or unsafe posting if ignored.",
      usefulCommand: "npm run validate:social-queue",
      avoid: "Do not retry the errored workflow until the error is understood."
    });
  }

  candidates.push({
    task: "Build/repair content runway",
    quadrant: runwayBelowSevenDays ? "Q1" : "Q2",
    importance: 4,
    urgency: runwayBelowSevenDays ? 3 : 2,
    reason: runwayBelowSevenDays
      ? `Full runway is ${fullPreparedDays} days, below the 7-day target; static runway alone does not count as full preparedness.`
      : "Full runway is at least 7 fully prepared days, so broader runway work can wait behind immediate blockers.",
    usefulCommand: "Ask Codex: Review the canonical queue and list the next missing content assets without posting.",
    avoid: "Do not spend this slot polishing old reports."
  });

  candidates.push({
    task: "Improve social automation and reporting",
    quadrant: "Q2",
    importance: 3,
    urgency: 2,
    reason: nextAccountBlocker
      ? "Automation improvements are useful, but only after Q1 account/video blockers are under control."
      : "Automation improvements are useful, but only after the Q1 video-export blocker is under control.",
    usefulCommand: "Ask Codex: Propose one small automation improvement for blocker cleanup.",
    avoid: "Do not over-optimize a working flow during a posting day."
  });

  if (readyPinterest) {
    candidates.push({
      task: `Pinterest publishing: ${taskLabel(readyPinterest)}`,
      quadrant: "Q4",
      importance: 1,
      urgency: noPinterestPublishingToday ? 1 : 2,
      reason: noPinterestPublishingToday
        ? "Pinterest publishing is explicitly paused today and Pinterest is already 2-4 days ahead."
        : "Pinterest is already 2-4 days ahead, so more publishing is not important right now.",
      usefulCommand: "Do not run Pinterest publish commands today.",
      avoid: "Do not run social:pinterest-auto-publish or click Publish."
    });
  }

  candidates.push({
    task: "Tidy old evidence/report folders",
    quadrant: "Q4",
    importance: 1,
    urgency: 1,
    reason: "Neatness is not a current campaign blocker.",
    usefulCommand: "Defer.",
    avoid: "Do not reorganize archives while account blockers remain."
  });

  return candidates;
}

function bestCandidate(candidates: Candidate[]): Candidate {
  return [...candidates].sort((left, right) => {
    const quadrantDelta = quadrantRank[right.quadrant] - quadrantRank[left.quadrant];
    if (quadrantDelta !== 0) return quadrantDelta;
    const importanceDelta = right.importance - left.importance;
    if (importanceDelta !== 0) return importanceDelta;
    return right.urgency - left.urgency;
  })[0];
}

function renderCandidate(candidate: Candidate, index: number): string {
  return `${index + 1}. [${candidate.quadrant}] ${candidate.task} - importance ${candidate.importance}/5, urgency ${candidate.urgency}/5`;
}

async function main(): Promise<void> {
  const validation = await validateSocialQueue();
  const postsByDay = sortedPosts(validation.posts);
  const tasks = allTasks(postsByDay).map((item) => item.task);
  const counts = statusCounts(tasks);
  const noPinterestPublishingToday = process.env.NO_PINTEREST_PUBLISHING_TODAY === "true";
  const readiness = auditReadiness(postsByDay);
  const duePressureChunk = validation.ok ? buildDuePressureChunk(postsByDay) : null;
  const candidates = scoreCandidates(postsByDay, validation.ok, noPinterestPublishingToday, readiness, duePressureChunk);
  const recommended = bestCandidate(candidates);
  const nextReady = validation.ok ? findNextReady(postsByDay) : null;
  const nextBlocker = validation.ok ? findNextBlocker(postsByDay) : null;
  const topCandidates = [...candidates].sort((left, right) => {
    const quadrantDelta = quadrantRank[right.quadrant] - quadrantRank[left.quadrant];
    if (quadrantDelta !== 0) return quadrantDelta;
    const importanceDelta = right.importance - left.importance;
    if (importanceDelta !== 0) return importanceDelta;
    return right.urgency - left.urgency;
  }).slice(0, 3);

  const doNotDo = recommended.avoid
    ?? (noPinterestPublishingToday ? "Do not publish Pinterest today." : "Do not jump past Q1 blockers.");
  const readinessWarnings = readiness.warnings.slice(0, 6);

  console.log(`# What's Next

Recommended next action:
${recommended.task}

Quadrant:
${recommended.quadrant} - ${quadrantLabels[recommended.quadrant]}

Why:
${recommended.reason}

Do not do right now:
${doNotDo}

Useful command/prompt:
${recommended.usefulCommand}

Top candidates:
${topCandidates.map(renderCandidate).join("\n")}

Compact status:
- ${formatCounts(counts).join("\n- ")}
- next publishable: ${compactTask(nextReady)}
- next blocker: ${compactTask(nextBlocker)}

Readiness runway:
- static-ready days: ${formatDays(readiness.staticReadyDays)}
- Pinterest-ready days: ${formatDays(readiness.pinterestReadyDays)}
- Meta-ready days: ${formatDays(readiness.metaReadyDays)}
- video-ready days: ${formatDays(readiness.videoReadyDays)}
- fully prepared days: ${formatDays(readiness.fullyPreparedDays)}
- missing video exports: ${formatDays(readiness.missingVideoExportDays)}
- 7-day full pre-launch ready: ${readiness.fullyPreparedDays.length >= 7 ? "yes" : "no"}

Q1 prevention / chunk check:
- due-pressure scope: ${duePressureChunk?.scope ?? "none"}
- chunk days: ${formatChunkDays(duePressureChunk)}
- chunk tasks: ${formatChunkTasks(duePressureChunk)}
- prevention path: ${duePressureChunk?.prevention_path ?? "No due-pressure chunk is currently ready."}
${readinessWarnings.length > 0 ? `\nWarnings:\n${readinessWarnings.map((warning) => `- ${warning}`).join("\n")}` : ""}
`);

  if (!validation.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`# What's Next

Recommended next action:
Fix social:what-next runtime error

Quadrant:
Q1 - Important + Urgent

Why:
${message}

Do not do right now:
Do not post until the command runs cleanly.

Useful command/prompt:
npm run lint
`);
    process.exitCode = 1;
  });
}
