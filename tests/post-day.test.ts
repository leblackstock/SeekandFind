import { describe, expect, it } from "vitest";
import {
  buildPostDaySummary,
  findDayPost,
  parsePostDayArgs
} from "../automation/social/post-day.js";
import { QueuePost } from "../automation/social/validate-queue.js";

function posts(shortVideoOverrides: Record<string, unknown> = {}): QueuePost[] {
  return [{
    post_id: "book01-day-06",
    campaign_day: 6,
    scheduled_date: "2026-05-12",
    platform_tasks: [
      {
        platform: "Pinterest",
        status: "ready",
        idempotency_key: "day-6-pinterest"
      },
      {
        platform: "Short Video",
        status: "ready",
        idempotency_key: "day-6-short-video",
        required_video_surfaces: ["YouTube Shorts", "TikTok", "Instagram Reels", "Facebook Reels", "Pinterest Video Pin"],
        ...shortVideoOverrides
      }
    ]
  }];
}

describe("compact day runner", () => {
  it("parses a day closeout command", () => {
    const options = parsePostDayArgs([
      "day-06",
      "--close-short-video",
      "--youtube",
      "https://youtube.com/shorts/abc123",
      "--tiktok",
      "https://www.tiktok.com/@emberdragonbooks/video/1234567890",
      "--dry-run",
      "--verbose"
    ]);

    expect(options).toMatchObject({
      selector: "day-06",
      closeShortVideo: true,
      dryRun: true,
      verbose: true
    });
    expect(options.platformUrls).toHaveLength(2);
  });

  it("finds a post by day selector", () => {
    expect(findDayPost(posts(), "day-06").post_id).toBe("book01-day-06");
  });

  it("summarizes day status and missing short-video URLs", () => {
    const summary = buildPostDaySummary(findDayPost(posts(), "day-06"), {
      selector: "day-06",
      platformUrls: [
        { platform: "YouTube Shorts", url: "https://youtube.com/shorts/abc123" }
      ],
      verbose: true
    });

    expect(summary).toMatchObject({
      ok: true,
      campaign_day: 6,
      task_counts: { total: 2, posted: 0, ready: 2, blocked: 0 }
    });
    expect(summary.short_video).toMatchObject({
      provided_urls_count: 1,
      missing_provided_surfaces: ["TikTok", "Instagram Reels", "Facebook Reels", "Pinterest Video Pin"],
      can_close_from_inputs: false
    });
    expect(summary).toHaveProperty("all_tasks");
    expect(summary).toHaveProperty("provided_platform_urls");
  });

  it("summarizes recorded short-video URLs already stored on the task", () => {
    const summary = buildPostDaySummary(findDayPost(posts({
      platform_urls: [{
        platform: "YouTube Shorts",
        url: "https://youtube.com/shorts/recorded"
      }]
    }), "day-06"), {
      selector: "day-06",
      platformUrls: [],
      verbose: true
    });

    expect(summary.short_video).toMatchObject({
      recorded_urls_count: 1,
      provided_urls_count: 1,
      newly_provided_urls_count: 0,
      recorded_platform_urls: [{ platform: "YouTube Shorts", url: "https://youtube.com/shorts/recorded" }],
      missing_provided_surfaces: ["TikTok", "Instagram Reels", "Facebook Reels", "Pinterest Video Pin"],
      can_close_from_inputs: false,
      close_command: "npm run social:post-day -- day-06 --close-short-video --tiktok <URL> --instagram <URL> --facebook <URL> --pinterest <URL>"
    });
  });
});
