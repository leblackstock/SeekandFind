import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildShortVideoBatchPlan,
  writeShortVideoBatchPlan
} from "../automation/social/prepare-short-video-batch.js";
import { QueuePost } from "../automation/social/validate-queue.js";

let root: string;

const searchWithEmberAsset = "content/outputs/images/approved/book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png";

const assetsByDay: Record<number, string> = {
  3: searchWithEmberAsset,
  4: "content/outputs/images/approved/book-1-no-blank-promo-batch-02-02-baby-flame-lantern-teaser-balanced-approved-recovered-2026-05-05T05-47-13-309Z-1.png",
  5: "content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-02-image-1-2026-05-05T04-51-23-244Z.png",
  6: "content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-03-image-1-2026-05-05T04-51-29-569Z.png",
  7: "content/outputs/images/approved/book-1-mission-item-promo-batch-03-01-golden-welcome-bell-teaser-recovered-2026-05-05T19-29-49-208Z.png",
  8: "content/outputs/images/approved/book-1-mission-item-promo-batch-03-02-firefly-flower-charm-teaser-recovered-2026-05-05T19-29-49-208Z.png",
  9: "content/outputs/images/approved/book-1-mission-item-promo-batch-03-03-dragon-door-key-teaser-retry-recovered-2026-05-05T19-37-48-357Z.png",
  10: "content/outputs/images/approved/book-1-mission-item-promo-batch-03-04-sparkle-market-token-teaser-recovered-2026-05-05T19-29-49-208Z.png",
  11: "content/outputs/images/approved/book-1-no-blank-promo-batch-02-04-meet-ember-guide-recovered-2026-05-05T05-21-47-885Z.png",
  12: searchWithEmberAsset
};

describe("short-video batch prep", () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ember-short-video-batch-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("classifies a text-heavy static promo image as Branch C with exact visible text", async () => {
    await writeAsset(searchWithEmberAsset);
    const plan = buildShortVideoBatchPlan([makePost(3, "needs-video-export", searchWithEmberAsset)], {
      batchDate: "2026-05-08",
      rootDir: root
    });

    expect(plan.records).toHaveLength(1);
    expect(plan.records[0]).toMatchObject({
      branch_classification: "C",
      readable_text_detected: "yes",
      visible_text_found: ["Search with Ember!"],
      direct_image_to_video_recommendation: "no"
    });
  });

  it("supports Branch D when no usable image exists", () => {
    const plan = buildShortVideoBatchPlan([makePost(3, "needs-video-export")], {
      batchDate: "2026-05-08",
      rootDir: root
    });

    expect(plan.records[0]).toMatchObject({
      branch_classification: "D",
      source_image_found: false,
      readable_text_detected: "not_applicable"
    });
  });

  it("builds a Days 3-12 manifest plan and detects the Day 8 false-ready mismatch", async () => {
    for (const asset of Object.values(assetsByDay)) await writeAsset(asset);
    const posts = Object.entries(assetsByDay).map(([day, asset]) => (
      makePost(Number(day), Number(day) === 8 ? "ready" : "needs-video-export", asset)
    ));

    const plan = buildShortVideoBatchPlan(posts, {
      batchDate: "2026-05-08",
      rootDir: root
    });

    expect(plan.records.map((record) => record.day)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(plan.branch_counts).toEqual({ A: 0, B: 0, C: 10, D: 0 });
    expect(plan.readiness_mismatches.map((record) => record.day)).toEqual([8]);
    expect(plan.output_files.manifest).toBe("content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/batch-manifest.json");
  });

  it("refuses to overwrite generated batch files unless force is used", async () => {
    await writeAsset(searchWithEmberAsset);
    const plan = buildShortVideoBatchPlan([makePost(3, "needs-video-export", searchWithEmberAsset)], {
      batchDate: "2026-05-08",
      rootDir: root
    });

    await writeShortVideoBatchPlan(plan, { rootDir: root });
    await expect(writeShortVideoBatchPlan(plan, { rootDir: root })).rejects.toThrow(/already exists/);
    await expect(writeShortVideoBatchPlan(plan, { rootDir: root, force: true })).resolves.toMatchObject({
      ok: true,
      branch_counts: { A: 0, B: 0, C: 1, D: 0 }
    });
  });
});

function makePost(day: number, status: string, asset?: string): QueuePost {
  return {
    post_id: `book01-day-${String(day).padStart(2, "0")}`,
    campaign_day: day,
    scheduled_date: "2026-05-08",
    media_assets: asset ? [asset] : [],
    caption_source: {
      type: "calendar_slot",
      text: `Day ${day} caption`,
      cta: "Save this."
    },
    platform_tasks: [
      {
        platform: "Short Video",
        status,
        idempotency_key: `book01-day${String(day).padStart(2, "0")}-short-video-tiktok-youtube-shorts-instagram-reels-facebook-reels`,
        caption_source: {
          type: "calendar_slot",
          text: `Day ${day} caption\n\nComing soon to Amazon.`,
          cta: "Save this."
        }
      }
    ]
  };
}

async function writeAsset(relativePath: string): Promise<void> {
  const absolute = join(root, relativePath);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, "fake image");
}
