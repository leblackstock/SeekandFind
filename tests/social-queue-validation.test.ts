import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkRequiredVideoSurfaces, metaStillPairShapeErrors, validateSocialQueue } from "../automation/social/validate-queue.js";

const requiredHashtags = [
  "#SeekAndFind",
  "#KidsActivityBook",
  "#ChildrensBooks",
  "#ScreenFreeFun",
  "#BabyDragon",
  "#HiddenObjectBook",
  "#KidsBooks",
  "#FamilyReading",
  "#EmberDragonBooks",
  "#dragonbooks",
  "#dragonbooksforkids"
];

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

describe("canonical social queue requirements", () => {
  it("requires Pinterest still Pins, Pinterest Video Pins, and the full hashtag block for open posting surfaces", async () => {
    const result = await validateSocialQueue();

    expect(result.errors).toEqual([]);
    for (const post of result.posts) {
      const tasks = Array.isArray(post.platform_tasks) ? post.platform_tasks : [];
      const pinterestTasks = tasks.filter((task) => task.platform === "Pinterest");
      const shortVideoTask = tasks.find((task) => task.platform === "Short Video");
      const instagramFeedTasks = tasks.filter((task) => task.platform === "Instagram" && String(task.idempotency_key).includes("feed"));
      const facebookTasks = tasks.filter((task) => task.platform === "Facebook");

      expect(pinterestTasks, `Day ${String(post.campaign_day)} Pinterest still Pin tasks`).toHaveLength(3);
      expect(asStringArray(shortVideoTask?.required_video_surfaces)).toContain("Pinterest Video Pin");
      expect(instagramFeedTasks.length, `Day ${String(post.campaign_day)} Instagram feed tasks`).toBeLessThanOrEqual(1);
      expect(facebookTasks.every((task) => String(task.idempotency_key).includes("page-post"))).toBe(true);

      for (const task of tasks) {
        if (
          (task.platform === "Pinterest" || task.platform === "Instagram" || task.platform === "Facebook" || task.platform === "Short Video") &&
          (task.status === "ready" || task.status === "needs-video-export")
        ) {
          expect(asStringArray(task.required_hashtags), String(task.idempotency_key)).toEqual(
            expect.arrayContaining(requiredHashtags)
          );
        }
      }
    }

    expect(result.queue.posting_requirements).toMatchObject({
      approved_feed_still_assets: expect.objectContaining({
        rule: expect.stringContaining("separately approved native 4:5")
      })
    });
  });

  it("does not treat a bundled short-video task as complete until every required surface has a URL", async () => {
    const root = await mkdtemp(join(tmpdir(), "ember-social-queue-"));
    const receiptPath = "partial-short-video-receipt.json";
    await writeFile(join(root, receiptPath), JSON.stringify({
      platform_urls: [
        { platform: "YouTube Shorts", url: "https://youtube.com/shorts/example" }
      ]
    }), "utf8");

    const result = await checkRequiredVideoSurfaces({
      platform: "Short Video",
      status: "posted",
      receipt_path: receiptPath,
      required_video_surfaces: ["YouTube Shorts", "TikTok", "Pinterest Video Pin"]
    }, root);

    expect(result.missing).toEqual(["TikTok", "Pinterest Video Pin"]);
  });

  it("accepts receipt platform aliases for completed bundled short-video surfaces", async () => {
    const root = await mkdtemp(join(tmpdir(), "ember-social-queue-"));
    const receiptPath = "complete-short-video-receipt.json";
    await writeFile(join(root, receiptPath), JSON.stringify({
      platform_urls: [
        { platform: "Instagram Reel", url: "https://www.instagram.com/reel/example/" },
        { platform: "Facebook Reel", url: "https://www.facebook.com/reel/example" }
      ]
    }), "utf8");

    const result = await checkRequiredVideoSurfaces({
      platform: "Short Video",
      status: "posted",
      receipt_path: receiptPath,
      required_video_surfaces: ["Instagram Reels", "Facebook Reels"]
    }, root);

    expect(result).toEqual({ missing: [], errors: [] });
  });

  it("blocks ready Meta still posting when Facebook lacks a matching Instagram feed task", () => {
    const errors = metaStillPairShapeErrors({
      post_id: "book01-day-08",
      campaign_day: 8,
      platform_tasks: [
        {
          platform: "Instagram",
          status: "ready",
          idempotency_key: "book01-day08-instagram-story-or-reel-cover"
        },
        {
          platform: "Facebook",
          status: "ready",
          idempotency_key: "book01-day08-facebook-page-post"
        }
      ]
    }, "post book01-day-08");

    expect(errors).toEqual([
      expect.stringContaining("Meta still production blocker")
    ]);
    expect(errors[0]).toContain("book01-day08-instagram-story-or-reel-cover");
  });

  it("allows a partially closed Meta still pair after Instagram is posted", () => {
    const errors = metaStillPairShapeErrors({
      post_id: "book01-day-08",
      campaign_day: 8,
      platform_tasks: [
        {
          platform: "Instagram",
          status: "posted",
          idempotency_key: "book01-day08-instagram-feed-post-plus-story-reshare"
        },
        {
          platform: "Facebook",
          status: "ready",
          idempotency_key: "book01-day08-facebook-page-post"
        }
      ]
    }, "post book01-day-08");

    expect(errors).toEqual([]);
  });
});
