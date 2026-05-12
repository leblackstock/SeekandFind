import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { requiredSocialHashtags } from "./social-captions.js";

export const queuePath = "content/social/campaigns/book-01/queue.json";
const expectedPostCount = 12;
const expectedTaskCount = 72;
const allowedTaskStatuses = new Set([
  "posted",
  "posted-early",
  "ready",
  "needs-account",
  "needs-video-export",
  "error",
  "skipped"
]);
const hashtagFriendlyPlatforms = new Set(["Pinterest", "Instagram", "Facebook", "Short Video"]);

export interface PlatformTask {
  platform?: unknown;
  status?: unknown;
  posted_url?: unknown;
  posted_at?: unknown;
  receipt_path?: unknown;
  evidence_path?: unknown;
  error?: unknown;
  idempotency_key?: unknown;
  board_name?: unknown;
  caption_source?: unknown;
  source_refs?: unknown;
  platform_urls?: unknown;
  required_video_surfaces?: unknown;
  legacy_missing_required_video_surfaces?: unknown;
  required_hashtags?: unknown;
}

export interface QueuePost {
  post_id?: unknown;
  campaign_day?: unknown;
  scheduled_date?: unknown;
  media_assets?: unknown;
  caption_source?: unknown;
  approved_platform_assets?: unknown;
  notes?: unknown;
  source_refs?: unknown;
  platform_tasks?: unknown;
}

export interface SocialQueue {
  campaign_id?: unknown;
  campaign_name?: unknown;
  posts?: unknown;
  posting_requirements?: unknown;
}

export interface QueueValidationResult {
  ok: boolean;
  queue: SocialQueue;
  posts: QueuePost[];
  tasks: PlatformTask[];
  errors: string[];
  summary: string[];
}

interface SurfaceUrlRecord {
  platform?: unknown;
  url?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasSourceRefs(post: QueuePost, task: PlatformTask): boolean {
  const taskRefs = Array.isArray(task.source_refs) ? task.source_refs : [];
  const postRefs = Array.isArray(post.source_refs) ? post.source_refs : [];
  return taskRefs.length > 0 || postRefs.length > 0;
}

function countStatuses(tasks: PlatformTask[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const task of tasks) {
    const status = String(task.status ?? "missing");
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

function formatStatusCounts(tasks: PlatformTask[]): string {
  return Object.entries(countStatuses(tasks))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${status}=${count}`)
    .join("; ");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function includesNormalized(values: string[], needle: string): boolean {
  const normalizedNeedle = needle.toLowerCase();
  return values.some((value) => value.toLowerCase() === normalizedNeedle);
}

function normalizeVideoSurface(value: string): string {
  const normalized = value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (normalized.includes("youtube") && normalized.includes("short")) return "YouTube Shorts";
  if (normalized.includes("tiktok") || normalized.includes("tik tok")) return "TikTok";
  if (normalized.includes("instagram") && normalized.includes("reel")) return "Instagram Reels";
  if (normalized.includes("facebook") && normalized.includes("reel")) return "Facebook Reels";
  if (normalized.includes("pinterest") && (normalized.includes("video") || normalized.includes("pin"))) {
    return "Pinterest Video Pin";
  }
  return value.trim();
}

function addSurfaceUrl(surfaces: Map<string, string>, platform: string, url: unknown): void {
  if (!isNonEmptyString(url)) return;
  surfaces.set(normalizeVideoSurface(platform), url);
}

function collectSurfaceUrls(value: unknown): Map<string, string> {
  const surfaces = new Map<string, string>();

  if (Array.isArray(value)) {
    for (const entry of value) {
      const record = entry as SurfaceUrlRecord;
      addSurfaceUrl(surfaces, asString(record.platform), record.url);
    }
    return surfaces;
  }

  if (value && typeof value === "object") {
    for (const [platform, url] of Object.entries(value as Record<string, unknown>)) {
      addSurfaceUrl(surfaces, platform, url);
    }
  }

  return surfaces;
}

function mergeSurfaceUrls(...surfaceSets: Map<string, string>[]): Map<string, string> {
  const merged = new Map<string, string>();
  for (const surfaceSet of surfaceSets) {
    for (const [surface, url] of surfaceSet) merged.set(surface, url);
  }
  return merged;
}

async function readReceiptSurfaceUrls(receiptPath: unknown, baseDir: string): Promise<{
  surfaces: Map<string, string>;
  errors: string[];
}> {
  if (!isNonEmptyString(receiptPath)) {
    return { surfaces: new Map(), errors: ["missing receipt_path"] };
  }

  try {
    const receipt = JSON.parse(await readFile(join(baseDir, receiptPath), "utf8")) as { platform_urls?: unknown };
    return { surfaces: collectSurfaceUrls(receipt.platform_urls), errors: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { surfaces: new Map(), errors: [`could not read/parse receipt_path "${receiptPath}": ${message}`] };
  }
}

export async function checkRequiredVideoSurfaces(
  task: PlatformTask,
  baseDir = process.cwd()
): Promise<{ missing: string[]; errors: string[] }> {
  const required = asStringArray(task.required_video_surfaces).map(normalizeVideoSurface);
  const legacyMissing = new Set(asStringArray(task.legacy_missing_required_video_surfaces).map(normalizeVideoSurface));
  if (!required.length) return { missing: [], errors: [] };

  const receiptCheck = await readReceiptSurfaceUrls(task.receipt_path, baseDir);
  const available = mergeSurfaceUrls(collectSurfaceUrls(task.platform_urls), receiptCheck.surfaces);
  const missing = required.filter((surface) => !legacyMissing.has(surface) && !available.has(surface));

  return {
    missing,
    errors: missing.length ? receiptCheck.errors : []
  };
}

function taskShouldDeclareRequiredHashtags(task: PlatformTask): boolean {
  return hashtagFriendlyPlatforms.has(asString(task.platform)) &&
    (task.status === "ready" || task.status === "needs-video-export");
}

export async function validateSocialQueue(): Promise<QueueValidationResult> {
  const errors: string[] = [];
  const absoluteQueuePath = join(process.cwd(), queuePath);

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(absoluteQueuePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      queue: {},
      posts: [],
      tasks: [],
      errors: [`JSON parse/read failed: ${message}`],
      summary: [`queue: ${queuePath}`]
    };
  }

  const queue = parsed as SocialQueue;
  if (!Array.isArray(queue.posts)) {
    errors.push("posts must be an array.");
  }

  const posts = Array.isArray(queue.posts) ? queue.posts as QueuePost[] : [];
  if (posts.length !== expectedPostCount) {
    errors.push(`expected ${expectedPostCount} posts, found ${posts.length}.`);
  }

  const tasks: PlatformTask[] = [];
  const taskKeys = new Set<string>();
  const duplicateKeys = new Set<string>();

  for (const [postIndex, post] of posts.entries()) {
    if (!Array.isArray(post.platform_tasks)) {
      errors.push(`post ${postIndex + 1} platform_tasks must be an array.`);
      continue;
    }

    const postTasks = post.platform_tasks as PlatformTask[];
    const postLabel = `post ${String(post.post_id ?? postIndex + 1)}`;
    const pinterestTasks = postTasks.filter((task) => task.platform === "Pinterest");
    if (pinterestTasks.length !== 3) {
      errors.push(`${postLabel} must have exactly 3 required Pinterest still Pin tasks; found ${pinterestTasks.length}.`);
    }
    for (const [pinterestIndex, pinterestTask] of pinterestTasks.entries()) {
      if (!isNonEmptyString(pinterestTask.board_name)) {
        errors.push(`${postLabel} Pinterest still Pin task ${pinterestIndex + 1} missing board_name.`);
      }
    }

    const shortVideoTasks = postTasks.filter((task) => task.platform === "Short Video");
    if (shortVideoTasks.length !== 1) {
      errors.push(`${postLabel} must have exactly 1 required Short Video bundle task; found ${shortVideoTasks.length}.`);
    } else {
      const shortVideoTask = shortVideoTasks[0];
      const requiredVideoSurfaces = asStringArray(shortVideoTask.required_video_surfaces);
      if (!includesNormalized(requiredVideoSurfaces, "Pinterest Video Pin")) {
        errors.push(`${postLabel} Short Video task must list Pinterest Video Pin in required_video_surfaces.`);
      }
      if (shortVideoTask.status === "posted" || shortVideoTask.status === "posted-early") {
        const surfaceCheck = await checkRequiredVideoSurfaces(shortVideoTask, process.cwd());
        for (const checkError of surfaceCheck.errors) {
          errors.push(`${postLabel} Short Video task cannot verify complete bundle: ${checkError}.`);
        }
        if (surfaceCheck.missing.length > 0) {
          errors.push(`${postLabel} Short Video task is ${shortVideoTask.status} but missing posted URL(s) for required surface(s): ${surfaceCheck.missing.join(", ")}.`);
        }
      }
    }

    postTasks.forEach((task, taskIndex) => {
      tasks.push(task);
      const label = `post ${String(post.post_id ?? postIndex + 1)} task ${taskIndex + 1}`;

      if (!isNonEmptyString(task.platform)) errors.push(`${label} missing platform.`);
      if (!isNonEmptyString(task.status)) {
        errors.push(`${label} missing status.`);
      } else if (!allowedTaskStatuses.has(task.status)) {
        errors.push(`${label} has invalid status "${task.status}".`);
      }
      if (!isNonEmptyString(task.idempotency_key)) {
        errors.push(`${label} missing idempotency_key.`);
      } else if (taskKeys.has(task.idempotency_key)) {
        duplicateKeys.add(task.idempotency_key);
      } else {
        taskKeys.add(task.idempotency_key);
      }

      if (
        (task.status === "posted" || task.status === "posted-early") &&
        !isNonEmptyString(task.posted_url) &&
        !hasSourceRefs(post, task)
      ) {
        errors.push(`${label} is ${task.status} but has no posted_url or source_refs.`);
      }

      if (task.platform === "Pinterest" && task.status === "ready" && !isNonEmptyString(task.board_name)) {
        errors.push(`${label} is a ready Pinterest task but missing board_name.`);
      }

      if (taskShouldDeclareRequiredHashtags(task)) {
        const hashtags = asStringArray(task.required_hashtags);
        for (const tag of requiredSocialHashtags) {
          if (!includesNormalized(hashtags, tag)) {
            errors.push(`${label} must require ${tag} in required_hashtags.`);
          }
        }
      }
    });
  }

  if (tasks.length !== expectedTaskCount) {
    errors.push(`expected ${expectedTaskCount} platform_tasks, found ${tasks.length}.`);
  }

  for (const duplicateKey of duplicateKeys) {
    errors.push(`duplicate platform task idempotency_key: ${duplicateKey}.`);
  }

  const summary = [
    `queue: ${queuePath}`,
    `posts: ${posts.length}/${expectedPostCount}`,
    `platform_tasks: ${tasks.length}/${expectedTaskCount}`,
    `unique_task_keys: ${taskKeys.size}/${tasks.length}`,
    `statuses: ${formatStatusCounts(tasks) || "none"}`
  ];

  return {
    ok: errors.length === 0,
    queue,
    posts,
    tasks,
    errors,
    summary
  };
}

async function main(): Promise<void> {
  const result = await validateSocialQueue();

  if (result.errors.length > 0) {
    console.error("Social queue validation: FAIL");
    for (const line of result.summary) console.error(line);
    console.error(`issues: ${result.errors.length}`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("Social queue validation: PASS");
  for (const line of result.summary) console.log(line);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Social queue validation: FAIL");
    console.error(`error: ${message}`);
    process.exitCode = 1;
  });
}
