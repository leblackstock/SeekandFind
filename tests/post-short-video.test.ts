import { describe, expect, it } from "vitest";
import {
  buildPostShortVideoSummary,
  findShortVideoMatch,
  parsePostShortVideoArgs
} from "../automation/social/post-short-video.js";
import { QueuePost } from "../automation/social/validate-queue.js";

function posts(taskOverrides: Record<string, unknown> = {}): QueuePost[] {
  return [{
    post_id: "book01-day-06",
    campaign_day: 6,
    platform_tasks: [{
      platform: "Short Video",
      status: "ready",
      idempotency_key: "book01-day06-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public",
      required_video_surfaces: ["YouTube Shorts", "TikTok", "Instagram Reels", "Facebook Reels", "Pinterest Video Pin"],
      ...taskOverrides
    }]
  }];
}

describe("production short-video compact runner", () => {
  it("parses day selector and required platform URL flags", () => {
    const options = parsePostShortVideoArgs([
      "day-06",
      "--youtube",
      "https://youtube.com/shorts/example",
      "--tiktok=https://www.tiktok.com/@emberdragonbooks/video/example",
      "--instagram",
      "https://www.instagram.com/reel/example/",
      "--facebook",
      "https://www.facebook.com/reel/example/",
      "--pinterest",
      "https://www.pinterest.com/pin/example/",
      "--dry-run",
      "--verbose"
    ]);

    expect(options.selector).toBe("day-06");
    expect(options.dryRun).toBe(true);
    expect(options.verbose).toBe(true);
    expect(options.platformUrls).toHaveLength(5);
  });

  it("reconstructs short-video flags when npm consumes option names", () => {
    const previous = {
      youtube: process.env.npm_config_youtube,
      tiktok: process.env.npm_config_tiktok,
      instagram: process.env.npm_config_instagram,
      facebook: process.env.npm_config_facebook,
      pinterest: process.env.npm_config_pinterest,
      dryRun: process.env.npm_config_dry_run
    };
    process.env.npm_config_youtube = "true";
    process.env.npm_config_tiktok = "true";
    process.env.npm_config_instagram = "true";
    process.env.npm_config_facebook = "true";
    process.env.npm_config_pinterest = "true";
    process.env.npm_config_dry_run = "true";

    try {
      const options = parsePostShortVideoArgs([
        "day-06",
        "https://youtube.com/shorts/example",
        "https://www.tiktok.com/@emberdragonbooks/video/example",
        "https://www.instagram.com/reel/example/",
        "https://www.facebook.com/reel/example/",
        "https://www.pinterest.com/pin/example/"
      ]);

      expect(options.dryRun).toBe(true);
      expect(options.platformUrls.map((entry) => entry.platform)).toEqual([
        "YouTube Shorts",
        "TikTok",
        "Instagram Reels",
        "Facebook Reels",
        "Pinterest Video Pin"
      ]);
    } finally {
      const restore = (name: string, value: string | undefined) => {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      };
      restore("npm_config_youtube", previous.youtube);
      restore("npm_config_tiktok", previous.tiktok);
      restore("npm_config_instagram", previous.instagram);
      restore("npm_config_facebook", previous.facebook);
      restore("npm_config_pinterest", previous.pinterest);
      restore("npm_config_dry_run", previous.dryRun);
    }
  });

  it("resolves a day selector to the short-video task", () => {
    const match = findShortVideoMatch(posts(), "day-06");
    expect(match.task.idempotency_key).toBe("book01-day06-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public");
  });

  it("returns a compact blocked result until every surface URL is present", () => {
    const match = findShortVideoMatch(posts(), "day-06");
    const summary = buildPostShortVideoSummary(match, {
      selector: "day-06",
      platformUrls: [{ platform: "YouTube Shorts", url: "https://youtube.com/shorts/example" }]
    });

    expect(summary).toMatchObject({
      ok: false,
      missing_surfaces: ["TikTok", "Instagram Reels", "Facebook Reels", "Pinterest Video Pin"],
      ready_to_close_bundle: false
    });
  });

  it("returns a compact ready result when all surface URLs are present", () => {
    const match = findShortVideoMatch(posts(), "day-06");
    const summary = buildPostShortVideoSummary(match, {
      selector: "day-06",
      platformUrls: [
        { platform: "YouTube Shorts", url: "https://youtube.com/shorts/example" },
        { platform: "TikTok", url: "https://www.tiktok.com/@emberdragonbooks/video/example" },
        { platform: "Instagram Reels", url: "https://www.instagram.com/reel/example/" },
        { platform: "Facebook Reels", url: "https://www.facebook.com/reel/example/" },
        { platform: "Pinterest Video Pin", url: "https://www.pinterest.com/pin/example/" }
      ],
      verbose: true
    });

    expect(summary).toMatchObject({
      ok: true,
      platform_urls_count: 5,
      missing_surfaces: [],
      ready_to_close_bundle: true,
      platform_urls: [
        { platform: "YouTube Shorts", url: "https://youtube.com/shorts/example" },
        { platform: "TikTok", url: "https://www.tiktok.com/@emberdragonbooks/video/example" },
        { platform: "Instagram Reels", url: "https://www.instagram.com/reel/example/" },
        { platform: "Facebook Reels", url: "https://www.facebook.com/reel/example/" },
        { platform: "Pinterest Video Pin", url: "https://www.pinterest.com/pin/example/" }
      ]
    });
  });

  it("counts a recorded task URL plus newly provided remaining surfaces", () => {
    const match = findShortVideoMatch(posts({
      platform_urls: [{
        platform: "YouTube Shorts",
        url: "https://youtube.com/shorts/recorded"
      }]
    }), "day-06");
    const summary = buildPostShortVideoSummary(match, {
      selector: "day-06",
      platformUrls: [
        { platform: "TikTok", url: "https://www.tiktok.com/@emberdragonbooks/video/example" },
        { platform: "Instagram Reels", url: "https://www.instagram.com/reel/example/" },
        { platform: "Facebook Reels", url: "https://www.facebook.com/reel/example/" },
        { platform: "Pinterest Video Pin", url: "https://www.pinterest.com/pin/example/" }
      ],
      verbose: true
    });

    expect(summary).toMatchObject({
      ok: true,
      youtube_url: "https://youtube.com/shorts/recorded",
      platform_urls_count: 5,
      newly_provided_urls_count: 4,
      missing_surfaces: [],
      ready_to_close_bundle: true
    });
  });
});
