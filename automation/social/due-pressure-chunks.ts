import { PlatformTask, QueuePost } from "./validate-queue.js";
import { buildPostingAssetRequirements, PostingAssetRequirement } from "./posting-assets.js";
import { buildPostingCaption } from "./social-captions.js";
import { addCampaignDaysKey, campaignDateKey } from "./campaign-clock.js";

export type DuePressureScope = "behind_or_due_today" | "due_soon_next_2_days";
export type DuePressureQuadrant = "Q1" | "Q2";

export interface ReadyChunkTask {
  post_id: unknown;
  campaign_day: unknown;
  scheduled_date: unknown;
  platform: unknown;
  status: unknown;
  idempotency_key: unknown;
  board_name: unknown;
  required_hashtags: unknown;
  required_video_surfaces: unknown;
  legacy_missing_required_video_surfaces: unknown;
  media_assets: unknown;
  posting_asset_requirements: PostingAssetRequirement[];
  caption_source: unknown;
  posting_caption: string;
  source_refs: unknown;
  notes: unknown;
}

export interface DuePressureChunk {
  scope: DuePressureScope;
  quadrant: DuePressureQuadrant;
  importance: number;
  urgency: number;
  days: number[];
  task_count: number;
  tasks: ReadyChunkTask[];
  prevention_question: string;
  prevention_path: string;
}

interface ReadyTaskWithSort {
  post: QueuePost;
  task: PlatformTask;
  taskIndex: number;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function campaignDay(post: QueuePost): number {
  return typeof post.campaign_day === "number" ? post.campaign_day : Number.MAX_SAFE_INTEGER;
}

function platformTasks(post: QueuePost): PlatformTask[] {
  return Array.isArray(post.platform_tasks) ? post.platform_tasks as PlatformTask[] : [];
}

function scheduledDate(post: QueuePost): string {
  return asString(post.scheduled_date);
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildReadyTask(post: QueuePost, task: PlatformTask): ReadyChunkTask {
  return {
    post_id: post.post_id,
    campaign_day: post.campaign_day,
    scheduled_date: post.scheduled_date,
    platform: task.platform,
    status: task.status,
    idempotency_key: task.idempotency_key,
    board_name: task.board_name,
    required_hashtags: task.required_hashtags,
    required_video_surfaces: task.required_video_surfaces,
    legacy_missing_required_video_surfaces: task.legacy_missing_required_video_surfaces,
    media_assets: post.media_assets,
    posting_asset_requirements: buildPostingAssetRequirements(post, task),
    caption_source: task.caption_source ?? post.caption_source,
    posting_caption: buildPostingCaption(task.caption_source ?? post.caption_source, task.required_hashtags),
    source_refs: post.source_refs,
    notes: post.notes
  };
}

function sortedReadyTasks(posts: QueuePost[]): ReadyTaskWithSort[] {
  return posts.flatMap((post) => platformTasks(post)
    .map((task, taskIndex) => ({ post, task, taskIndex }))
    .filter((item) => item.task.status === "ready"))
    .sort((left, right) => {
      const dayDelta = campaignDay(left.post) - campaignDay(right.post);
      if (dayDelta !== 0) return dayDelta;
      return left.taskIndex - right.taskIndex;
    });
}

function tasksOnOrBefore(posts: QueuePost[], cutoffDate: string): ReadyTaskWithSort[] {
  return sortedReadyTasks(posts).filter((item) => {
    const date = scheduledDate(item.post);
    return isIsoDate(date) && date <= cutoffDate;
  });
}

function uniqueDays(items: ReadyTaskWithSort[]): number[] {
  return [...new Set(items.map((item) => campaignDay(item.post)).filter((day) => Number.isFinite(day)))]
    .sort((left, right) => left - right);
}

function buildChunk(
  scope: DuePressureScope,
  quadrant: DuePressureQuadrant,
  importance: number,
  urgency: number,
  items: ReadyTaskWithSort[]
): DuePressureChunk {
  const days = uniqueDays(items);
  return {
    scope,
    quadrant,
    importance,
    urgency,
    days,
    task_count: items.length,
    tasks: items.map((item) => buildReadyTask(item.post, item.task)),
    prevention_question: "Can any upcoming or looming task be kept from becoming Q1?",
    prevention_path: scope === "behind_or_due_today"
      ? `Use one Day ${days.join("-")} chunk packet before opening browser tabs, then post from that packet and record receipts once.`
      : `Prepare the Day ${days.join("-")} due-soon chunk packet before it becomes overdue.`
  };
}

export function buildDuePressureChunk(posts: QueuePost[], today = new Date()): DuePressureChunk | null {
  const todayKey = campaignDateKey(today);
  const dueSoonKey = addCampaignDaysKey(today, 2);
  const behindOrDue = tasksOnOrBefore(posts, todayKey);
  if (behindOrDue.length > 0) {
    return buildChunk("behind_or_due_today", "Q1", 5, 5, behindOrDue);
  }

  const dueSoon = tasksOnOrBefore(posts, dueSoonKey);
  if (dueSoon.length > 0) {
    return buildChunk("due_soon_next_2_days", "Q2", 4, 3, dueSoon);
  }

  return null;
}
