import { PlatformTask, QueuePost } from "./validate-queue.js";

export type PostingAssetStatus = "available" | "missing";

export interface PostingAssetRequirement {
  slot: string;
  required: boolean;
  status: PostingAssetStatus;
  approved_asset: string | null;
  fallback_assets: string[];
  rule: string;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mediaAssets(post: QueuePost): string[] {
  return asStringArray(post.media_assets);
}

function firstAssetWithExtension(post: QueuePost, extensions: string[]): string | null {
  return mediaAssets(post).find((asset) => {
    const lower = asset.toLowerCase();
    return extensions.some((extension) => lower.endsWith(extension));
  }) ?? null;
}

function approvedPlatformAssets(post: QueuePost): Record<string, unknown> {
  if (post.approved_platform_assets && typeof post.approved_platform_assets === "object") {
    return post.approved_platform_assets as Record<string, unknown>;
  }
  return {};
}

function taskApprovedAsset(task: PlatformTask): string | null {
  const value = (task as { approved_asset?: unknown }).approved_asset;
  return typeof value === "string" && value.trim() ? value : null;
}

function feedSlot(task: PlatformTask): string | null {
  const platform = asString(task.platform);
  const key = asString(task.idempotency_key).toLowerCase();
  if (platform === "Instagram" && key.includes("feed")) return "instagram_feed_4x5";
  if (platform === "Facebook" && key.includes("page-post")) return "facebook_feed_4x5";
  return null;
}

function feedRequirement(post: QueuePost, slot: string): PostingAssetRequirement {
  const assets = approvedPlatformAssets(post);
  const approved = asString(assets[slot]) || asString(assets.meta_feed_4x5) || null;
  return {
    slot,
    required: true,
    status: approved ? "available" : "missing",
    approved_asset: approved,
    fallback_assets: mediaAssets(post).filter((asset) => asset.toLowerCase().endsWith(".png")),
    rule: "Feed stills require a separately approved native 4:5 asset. One approved meta_feed_4x5 image can satisfy both Instagram and Facebook feed tasks if it is approved for both; do not crop, resize, or repurpose 9:16 Pinterest/Shorts/Story art."
  };
}

export function buildPostingAssetRequirements(post: QueuePost, task: PlatformTask): PostingAssetRequirement[] {
  const feed = feedSlot(task);
  if (feed) return [feedRequirement(post, feed)];

  if (task.platform === "Short Video") {
    const approved = taskApprovedAsset(task) ?? firstAssetWithExtension(post, [".mp4", ".mov"]);
    return [{
      slot: "short_video_mp4",
      required: true,
      status: approved ? "available" : "missing",
      approved_asset: approved,
      fallback_assets: mediaAssets(post),
      rule: "Short-video posting packs must include the approved video export for each required video surface."
    }];
  }

  if (task.platform === "Pinterest") {
    const approved = firstAssetWithExtension(post, [".png", ".jpg", ".jpeg", ".webp"]);
    return [{
      slot: "pinterest_still",
      required: true,
      status: approved ? "available" : "missing",
      approved_asset: approved,
      fallback_assets: mediaAssets(post),
      rule: "Pinterest still posting packs must include the approved still image for the Pin."
    }];
  }

  return [{
    slot: "campaign_media_asset",
    required: false,
    status: mediaAssets(post).length > 0 ? "available" : "missing",
    approved_asset: mediaAssets(post)[0] ?? null,
    fallback_assets: mediaAssets(post),
    rule: "Posting packs should include the approved media asset used for the platform task."
  }];
}
