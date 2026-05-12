import { describe, expect, it } from "vitest";
import { buildPostingReceipt, TaskMatch } from "../automation/social/create-posting-receipt.js";

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

describe("posting receipt helper", () => {
  it("builds a still-post receipt and mark command from one pasted URL", () => {
    const result = buildPostingReceipt(match(), {
      postedUrl: "https://www.pinterest.com/pin/example/",
      postedAt: "2026-05-12T09:00:00-04:00"
    }, new Date("2026-05-12T13:00:00Z"));

    expect(result.receiptPath).toBe("content/social/campaigns/book-01/receipts/pinterest/book01-day-06/day-6-pinterest.json");
    expect(result.evidencePath).toContain("content/social/campaigns/book-01/evidence/pinterest/book01-day-06/");
    expect(result.receipt).toMatchObject({
      idempotency_key: "day-6-pinterest",
      primary_posted_url: "https://www.pinterest.com/pin/example/",
      board_name: "Dragon Books for Kids",
      approved_asset: "day-6-still.png"
    });
    expect(result.receipt.caption).toContain("#SeekAndFind #dragonbooks");
    expect(result.markCommand).toContain("npm run social:mark-result -- day-6-pinterest posted https://www.pinterest.com/pin/example/ 2026-05-12T09:00:00-04:00");
  });

  it("requires every bundled short-video surface before writing a posted receipt", () => {
    expect(() => buildPostingReceipt(match("Short Video"), {
      platformUrls: [
        { platform: "YouTube Shorts", url: "https://youtube.com/shorts/example" }
      ]
    }, new Date("2026-05-12T13:00:00Z"))).toThrow("Missing URL(s) for required short-video surface(s)");
  });

  it("builds a complete short-video receipt with platform_urls", () => {
    const result = buildPostingReceipt(match("Short Video"), {
      postedAt: "2026-05-12T09:05:00-04:00",
      platformUrls: [
        { platform: "YouTube Shorts", url: "https://youtube.com/shorts/example" },
        { platform: "TikTok", url: "https://www.tiktok.com/@emberdragonbooks/video/example" },
        { platform: "Instagram Reels", url: "https://www.instagram.com/reel/example/" },
        { platform: "Facebook Reels", url: "https://www.facebook.com/reel/example/" },
        { platform: "Pinterest Video Pin", url: "https://www.pinterest.com/pin/example/" }
      ]
    }, new Date("2026-05-12T13:05:00Z"));

    expect(result.receipt.primary_posted_url).toBe("https://youtube.com/shorts/example");
    expect(result.receipt.platform_urls).toEqual([
      { platform: "YouTube Shorts", url: "https://youtube.com/shorts/example" },
      { platform: "TikTok", url: "https://www.tiktok.com/@emberdragonbooks/video/example" },
      { platform: "Instagram Reels", url: "https://www.instagram.com/reel/example/" },
      { platform: "Facebook Reels", url: "https://www.facebook.com/reel/example/" },
      { platform: "Pinterest Video Pin", url: "https://www.pinterest.com/pin/example/" }
    ]);
    expect(result.markCommand).toContain("day-6-short-video posted https://youtube.com/shorts/example 2026-05-12T09:05:00-04:00");
  });
});
