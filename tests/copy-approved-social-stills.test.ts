import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  copyApprovedSocialStills,
  parseCopyApprovedSocialStillArgs
} from "../automation/social/copy-approved-social-stills.js";

describe("approved social still copy", () => {
  it("copies day-labeled approved social PNGs from the canonical queue shape", async () => {
    const root = await mkdtemp(join(tmpdir(), "ember-approved-social-stills-"));
    const queuePath = "content/social/campaigns/book-01/queue.json";
    const downloadsDir = join(root, "Downloads");
    const assetA = "content/outputs/images/approved/book-1-test-a.png";
    const assetB = "content/outputs/images/approved/book-1-test-b.png";
    await mkdir(join(root, "content/social/campaigns/book-01"), { recursive: true });
    await mkdir(join(root, "content/outputs/images/approved"), { recursive: true });
    await mkdir(join(downloadsDir, "social-copy"), { recursive: true });
    await writeFile(join(root, assetA), "a");
    await writeFile(join(root, assetB), "b");
    await writeFile(join(downloadsDir, "social-copy/stale.png"), "stale");
    await writeFile(join(root, queuePath), JSON.stringify({
      posts: [
        {
          post_id: "book01-day-02",
          campaign_day: 2,
          status: "complete",
          media_assets: [assetA]
        },
        {
          post_id: "book01-day-03",
          campaign_day: 3,
          status: "ready-to-schedule",
          media_assets: [assetA]
        },
        {
          post_id: "book01-day-04",
          campaign_day: 4,
          status: "ready-to-schedule",
          media_assets: [assetB]
        },
        {
          post_id: "book01-day-05",
          campaign_day: 5,
          status: "ready-to-schedule",
          media_assets: ["content/outputs/videos/approved/test.mp4"]
        }
      ]
    }, null, 2), "utf8");

    const result = await copyApprovedSocialStills({
      rootDir: root,
      queuePath,
      downloadsDir,
      folderName: "social-copy",
      fromDay: 3,
      toDay: 5
    });

    expect(result.copied.map((item) => item.day)).toEqual([3, 4]);
    expect(result.skipped).toContainEqual({
      day: 5,
      post_id: "book01-day-05",
      reason: "missing approved PNG media asset"
    });
    expect(existsSync(join(downloadsDir, "social-copy/day-03-test-a.png"))).toBe(true);
    expect(existsSync(join(downloadsDir, "social-copy/day-04-test-b.png"))).toBe(true);
    expect(existsSync(join(downloadsDir, "social-copy/stale.png"))).toBe(false);
    expect(existsSync(join(downloadsDir, "social-copy/copy-manifest.json"))).toBe(true);
    expect(existsSync(join(downloadsDir, "social-copy/README.md"))).toBe(true);

    const manifest = JSON.parse(await readFile(join(downloadsDir, "social-copy/copy-manifest.json"), "utf8"));
    expect(manifest.copied_count).toBe(2);
  });

  it("parses reusable copy options", () => {
    expect(parseCopyApprovedSocialStillArgs([
      "--from-day",
      "3",
      "--to-day=12",
      "--downloads-dir",
      "C:/tmp",
      "--folder-name",
      "social",
      "--dry-run"
    ])).toMatchObject({
      fromDay: 3,
      toDay: 12,
      downloadsDir: "C:/tmp",
      folderName: "social",
      dryRun: true
    });
    expect(parseCopyApprovedSocialStillArgs(["--day", "day-08"])).toMatchObject({
      day: 8,
      fromDay: 8,
      toDay: 8
    });
  });
});
