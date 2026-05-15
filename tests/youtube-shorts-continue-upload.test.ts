import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chooseYoutubeTarget,
  classifyYoutubeState,
  compactYoutubeUploadResult,
  isMadeForKidsConfirmed,
  isYoutubeContentBusy,
  parseYoutubeUploadArgs,
  youtubeProductionUploadSafetyRule
} from "../automation/social/youtube-shorts-continue-upload.js";

describe("YouTube Shorts upload continuation state detection", () => {
  it("stops on the published confirmation modal", () => {
    expect(classifyYoutubeState("Video published Tiny Treasure #Shorts Published May 12, 2026")).toBe("published_modal");
  });

  it("recognizes the upload wizard", () => {
    expect(classifyYoutubeState("Details Video elements Checks Visibility Choose when to publish Save or publish")).toBe("upload_wizard");
  });

  it("does not treat dashboard text as an upload wizard", () => {
    expect(classifyYoutubeState("Channel dashboard Latest YouTube Short performance Creator Insider")).toBe("dashboard_or_content");
  });

  it("requires confirmed made-for-kids text before advancing", () => {
    expect(isMadeForKidsConfirmed("This video is set to made for kids Set by you")).toBe(true);
    expect(isMadeForKidsConfirmed("Is this video made for kids? (required) Yes, it's made for kids")).toBe(false);
  });

  it("stops while YouTube is still deleting videos", () => {
    expect(isYoutubeContentBusy("Deleting videos. While you wait, you can leave this screen.")).toBe(true);
    expect(isYoutubeContentBusy("Channel content Videos Shorts")).toBe(false);
  });

  it("returns null when no YouTube Studio tab is open", () => {
    expect(chooseYoutubeTarget([
      { title: "New Tab", url: "chrome://newtab/" },
      { title: "TikTok Studio", url: "https://www.tiktok.com/tiktokstudio/content" }
    ])).toBeNull();
  });

  it("prefers the Studio dashboard over the Shorts content table", () => {
    const dashboard = { title: "Channel dashboard - YouTube Studio", url: "https://studio.youtube.com/channel/abc" };
    const content = { title: "Channel content - YouTube Studio", url: "https://studio.youtube.com/channel/abc/videos/short" };
    expect(chooseYoutubeTarget([content, dashboard])).toBe(dashboard);
  });

  it("builds a compact upload summary without browser excerpts", () => {
    const summary = compactYoutubeUploadResult({
      ok: true,
      dry_run: true,
      youtube_url: "https://youtube.com/shorts/example",
      actions: [
        "youtube_studio_target_opened_from_available_browser",
        "audience_yes_selected_visible_radio",
        "details_next_clicked_dom",
        "dry_run_stopped_before_publish"
      ],
      body_excerpt: "large browser text"
    });

    expect(summary).toMatchObject({
      ok: true,
      youtube_url: "https://youtube.com/shorts/example",
      publish_clicked: false
    });
    expect(summary).not.toHaveProperty("body_excerpt");
  });

  it("parses verbose as an override for compact command output", () => {
    const options = parseYoutubeUploadArgs(["--compact", "--record-run", "--verbose"]);
    expect(options.compact).toBe(true);
    expect(options.recordRun).toBe(true);
    expect(options.verbose).toBe(true);
  });

  it("parses the direct existing-target CDP production mode", () => {
    expect(parseYoutubeUploadArgs(["--cdp-only"]).cdpOnly).toBe(true);
  });

  it("keeps the production Playwright upload path free of navigation and close calls", () => {
    const source = readFileSync("automation/social/youtube-shorts-continue-upload.ts", "utf8");
    const productionPath = source.match(/async function runYoutubeShortsUploadPlaywright[\s\S]*?\nasync function advanceWizardFast/);

    expect(youtubeProductionUploadSafetyRule).toContain("already-open YouTube Studio tab");
    expect(productionPath?.[0]).toBeTruthy();
    expect(productionPath?.[0]).not.toMatch(/\bpage\s*\.\s*(?:goto|reload|goBack|goForward)\s*\(/);
    expect(productionPath?.[0]).not.toMatch(/\b(?:newPage|newContext)\s*\(/);
    expect(source).not.toMatch(/\bbrowser\s*\.\s*close\s*\(/);
  });
});
