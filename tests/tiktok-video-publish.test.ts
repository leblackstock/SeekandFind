import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classifyTikTokStatus,
  loadTikTokPlan,
  parseTikTokPublishArgs,
  recoverTikTokUrlFromTargets,
  tiktokProductionUploadSafetyRule
} from "../automation/social/tiktok-video-publish.js";

describe("TikTok production video publishing helper", () => {
  it("parses day, compact output, recording, and dry-run flags", () => {
    const options = parseTikTokPublishArgs(["day-07", "--compact", "--record-run", "--dry-run", "--recover-url-only", "--verbose"]);

    expect(options.daySelector).toBe("day-07");
    expect(options.compact).toBe(true);
    expect(options.recordRun).toBe(true);
    expect(options.noPublish).toBe(true);
    expect(options.recoverUrlOnly).toBe(true);
    expect(options.verbose).toBe(true);
  });

  it("reconstructs evidence-dir when npm consumes the option name", () => {
    const previous = process.env.npm_config_evidence_dir;
    process.env.npm_config_evidence_dir = "true";
    try {
      const options = parseTikTokPublishArgs([
        "day-07",
        "content/social/campaigns/book-01/evidence/short-video/book01-day-07/tiktok-url-recovery"
      ]);
      expect(options.evidenceDir).toBe("content/social/campaigns/book-01/evidence/short-video/book01-day-07/tiktok-url-recovery");
    } finally {
      if (previous === undefined) delete process.env.npm_config_evidence_dir;
      else process.env.npm_config_evidence_dir = previous;
    }
  });

  it("loads the Day 7 Short Video plan from platform_tasks in the production queue", async () => {
    const plan = await loadTikTokPlan(parseTikTokPublishArgs(["day-07", "--dry-run"]));

    expect(plan.postId).toBe("book01-day-07");
    expect(plan.taskKey).toBe("book01-day07-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public");
    expect(plan.videoAsset).toBe("content/outputs/videos/approved/day-7-golden-welcome-bell-veo31-canva-approved-2026-05-10.mp4");
    expect(plan.captionLead).toBe("Can your little seeker find the Golden Welcome Bell among the festival decorations?");
    expect(plan.caption).toContain("#SeekAndFind");
  });

  it("treats review and Only me rows as not public yet", () => {
    const status = classifyTikTokStatus(
      "Can your little seeker find the Golden Welcome Bell among the festival decorations? Content under review Only me 0 0 0",
      "Can your little seeker find the Golden Welcome Bell among the festival decorations?"
    );

    expect(status.visible).toBe(true);
    expect(status.underReview).toBe(true);
    expect(status.onlyMe).toBe(true);
    expect(status.public).toBe(false);
  });

  it("treats the row as public after it shows Everyone without review text", () => {
    const status = classifyTikTokStatus(
      "Can your little seeker find the Golden Welcome Bell among the festival decorations? May 14, 9:41 PM Everyone 0 0 0",
      "Can your little seeker find the Golden Welcome Bell among the festival decorations?"
    );

    expect(status.visible).toBe(true);
    expect(status.underReview).toBe(false);
    expect(status.onlyMe).toBe(false);
    expect(status.public).toBe(true);
  });

  it("recovers a public TikTok URL from an open Studio analytics target", () => {
    expect(recoverTikTokUrlFromTargets([{
      title: "TikTok Studio",
      type: "page",
      url: "https://www.tiktok.com/tiktokstudio/analytics/7639927542748597535"
    }])).toBe("https://www.tiktok.com/@emberdragonbooks/video/7639927542748597535");
  });

  it("keeps the live production path on the existing TikTok tab", () => {
    const source = readFileSync("automation/social/tiktok-video-publish.ts", "utf8");
    const productionPath = source.match(/export async function runTikTokPublish[\s\S]*?\nasync function main/);

    expect(tiktokProductionUploadSafetyRule).toContain("already-open TikTok Studio tab");
    expect(tiktokProductionUploadSafetyRule).toContain("real Playwright file chooser");
    expect(productionPath?.[0]).toBeTruthy();
    expect(productionPath?.[0]).not.toMatch(/\bpage\s*\.\s*(?:goto|reload|goBack|goForward)\s*\(/);
    expect(productionPath?.[0]).not.toMatch(/\b(?:newPage|newContext)\s*\(/);
    expect(source).not.toMatch(/\bbrowser\s*\.\s*close\s*\(/);
  });
});
