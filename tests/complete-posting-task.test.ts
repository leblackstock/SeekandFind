import { describe, expect, it } from "vitest";
import {
  buildPostingCompletionPlan,
  parseCompletePostingArgs
} from "../automation/social/complete-posting-task.js";
import { TaskMatch } from "../automation/social/create-posting-receipt.js";

function match(platform = "Pinterest"): TaskMatch {
  return {
    post: {
      post_id: "book01-day-06",
      campaign_day: 6,
      scheduled_date: "2026-05-12",
      media_assets: ["day-6-still.png", "day-6-video.mp4"],
      caption_source: {
        text: "A cozy dragon-village search scene.",
        cta: "Save for later."
      }
    },
    task: {
      platform,
      status: "ready",
      idempotency_key: platform === "Short Video" ? "day-6-short-video" : "day-6-pinterest",
      board_name: platform === "Pinterest" ? "Dragon Books for Kids" : undefined,
      required_hashtags: ["#SeekAndFind", "#dragonbooks"],
      required_video_surfaces: platform === "Short Video"
        ? ["YouTube Shorts", "TikTok", "Instagram Reels", "Facebook Reels", "Pinterest Video Pin"]
        : undefined
    }
  };
}

describe("posting completion helper", () => {
  it("parses a one-url still-post completion command", () => {
    const options = parseCompletePostingArgs([
      "day-6-pinterest",
      "https://www.pinterest.com/pin/example/",
      "--posted-at",
      "2026-05-12T09:00:00-04:00"
    ]);

    expect(options).toMatchObject({
      idempotencyKey: "day-6-pinterest",
      postedUrl: "https://www.pinterest.com/pin/example/",
      postedAt: "2026-05-12T09:00:00-04:00",
      status: "posted"
    });
  });

  it("builds receipt and queue-mark options for one finish-button call", () => {
    const plan = buildPostingCompletionPlan(match(), {
      postedUrl: "https://www.pinterest.com/pin/example/",
      postedAt: "2026-05-12T09:00:00-04:00"
    }, new Date("2026-05-12T13:00:00Z"));

    expect(plan.receiptResult.receiptPath).toBe("content/social/campaigns/book-01/receipts/pinterest/book01-day-06/day-6-pinterest.json");
    expect(plan.markOptions).toMatchObject({
      idempotencyKey: "day-6-pinterest",
      status: "posted",
      postedUrl: "https://www.pinterest.com/pin/example/",
      postedAt: "2026-05-12T09:00:00-04:00",
      receiptPath: "content/social/campaigns/book-01/receipts/pinterest/book01-day-06/day-6-pinterest.json"
    });
  });

  it("keeps short-video surface URLs out of positional parsing", () => {
    const options = parseCompletePostingArgs([
      "day-6-short-video",
      "--youtube",
      "https://youtube.com/shorts/example",
      "--tiktok",
      "https://www.tiktok.com/@emberdragonbooks/video/example",
      "--instagram",
      "https://www.instagram.com/reel/example/",
      "--facebook",
      "https://www.facebook.com/reel/example/",
      "--pinterest",
      "https://www.pinterest.com/pin/example/",
      "--status",
      "posted-early"
    ]);

    expect(options.idempotencyKey).toBe("day-6-short-video");
    expect(options.postedAt).toBeUndefined();
    expect(options.status).toBe("posted-early");
    expect(options.platformUrls).toHaveLength(5);
  });

  it("carries short-video platform URLs into the queue-mark options", () => {
    const plan = buildPostingCompletionPlan(match("Short Video"), {
      platformUrls: [
        { platform: "YouTube Shorts", url: "https://youtube.com/shorts/example" },
        { platform: "TikTok", url: "https://www.tiktok.com/@emberdragonbooks/video/example" },
        { platform: "Instagram Reels", url: "https://www.instagram.com/reel/example/" },
        { platform: "Facebook Reels", url: "https://www.facebook.com/reel/example/" },
        { platform: "Pinterest Video Pin", url: "https://www.pinterest.com/pin/example/" }
      ]
    }, new Date("2026-05-12T13:00:00Z"));

    expect(plan.markOptions.platformUrls).toEqual(plan.receiptResult.receipt.platform_urls);
  });
});
