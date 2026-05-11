import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertNoUnsafeNavigation,
  liveUploadRecoveryRule,
  parseLiveUploadRecoveryArgs
} from "../automation/social/live-upload-recovery.js";

describe("live upload recovery guard", () => {
  it("defaults to existing-browser inspection without requiring navigation arguments", () => {
    const options = parseLiveUploadRecoveryArgs([]);

    expect(options.cdpUrl).toBe("http://127.0.0.1:9222");
    expect(options.matchUrl).toBe("studio.youtube.com");
    expect(options.screenshotPath).toContain("live-upload-safe-recovery-");
    expect(options.includeBodyText).toBe(false);
  });

  it("parses explicit safe inspection options", () => {
    expect(parseLiveUploadRecoveryArgs([
      "--match-url",
      "business.facebook.com",
      "--screenshot-path=tmp/live-upload.png",
      "--include-body-text"
    ])).toMatchObject({
      matchUrl: "business.facebook.com",
      screenshotPath: "tmp/live-upload.png",
      includeBodyText: true
    });
  });

  it("rejects reload, goto, back, forward, and attached-browser close calls in live upload recovery snippets", () => {
    expect(() => assertNoUnsafeNavigation("await page.reload();")).toThrow(/unsafe live-upload navigation/);
    expect(() => assertNoUnsafeNavigation("await uploadPage.goto(url);")).toThrow(/unsafe live-upload navigation/);
    expect(() => assertNoUnsafeNavigation("await targetPage.goBack();")).toThrow(/unsafe live-upload navigation/);
    expect(() => assertNoUnsafeNavigation("await draftPage.goForward();")).toThrow(/unsafe live-upload navigation/);
    expect(() => assertNoUnsafeNavigation("await browser.close();")).toThrow(/unsafe live-upload navigation/);
    expect(() => assertNoUnsafeNavigation("await chromium.connectOverCDP(url);")).not.toThrow();
    expect(() => assertNoUnsafeNavigation("await page.screenshot({ path });")).not.toThrow();
  });

  it("keeps the committed recovery helper free of unsafe navigation calls", () => {
    const source = readFileSync("automation/social/live-upload-recovery.ts", "utf8");

    expect(liveUploadRecoveryRule).toContain("must not reload");
    expect(() => assertNoUnsafeNavigation(source, "automation/social/live-upload-recovery.ts")).not.toThrow();
  });
});
