import { describe, expect, it } from "vitest";
import { validateProductionUrl, validateProductionUrls } from "../automation/social/production-url-guard.js";

describe("production URL guard", () => {
  it("accepts expected public platform URLs", () => {
    expect(validateProductionUrls([
      { platform: "YouTube Shorts", url: "https://youtube.com/shorts/abc123" },
      { platform: "TikTok", url: "https://www.tiktok.com/@emberdragonbooks/video/1234567890" },
      { platform: "Instagram Reels", url: "https://www.instagram.com/reel/ABC123/" },
      { platform: "Facebook Reels", url: "https://www.facebook.com/reel/1234567890/" },
      { platform: "Pinterest Video Pin", url: "https://www.pinterest.com/pin/1148417973750674294/" }
    ])).toMatchObject({ ok: true, errors: [] });
  });

  it("rejects placeholder/example URLs", () => {
    const result = validateProductionUrl("YouTube Shorts", "https://youtube.com/shorts/example");
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("placeholder/example");
  });

  it("rejects URLs on the wrong host", () => {
    const result = validateProductionUrl("TikTok", "https://youtube.com/shorts/abc123");
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("host");
  });
});
