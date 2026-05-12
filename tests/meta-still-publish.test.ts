import { describe, expect, it } from "vitest";
import { compactMetaStillResult } from "../automation/social/meta-still-publish.js";

describe("Meta still publish compact result", () => {
  it("removes caption and screenshot path detail from stdout summary", () => {
    const summary = compactMetaStillResult({
      ok: true,
      mode: "ready-for-review",
      campaign_day: 6,
      media_asset: "asset.png",
      caption: "Long caption",
      screenshots: ["one.png", "two.png"],
      actions: ["opened", "filled"],
      blocker_seen: null,
      urls: { instagram: null, facebook: null },
      queue_updates: [],
      result_path: "content/social/result.json"
    });

    expect(summary).toEqual({
      ok: true,
      mode: "ready-for-review",
      campaign_day: 6,
      urls: { instagram: null, facebook: null },
      blocker_seen: null,
      screenshots: 2,
      actions: 2,
      queue_updates: 0,
      result_path: "content/social/result.json"
    });
  });
});
