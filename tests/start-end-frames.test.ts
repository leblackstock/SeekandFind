import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  buildStartEndFramePlan,
  parseStartEndFrameArgs,
  prepareStartEndFrames,
  selectApprovedSourceImage
} from "../automation/social/prepare-start-end-frames.js";
import {
  copyUnapprovedStartEndFrames,
  parseCopyUnapprovedFrameArgs
} from "../automation/social/copy-unapproved-start-end-frames.js";

describe("start/end frame prep", () => {
  it("parses day-scoped arguments", () => {
    const options = parseStartEndFrameArgs(["--day", "day-10", "--dry-run"]);

    expect(options.fromDay).toBe(10);
    expect(options.toDay).toBe(10);
    expect(options.day).toBe(10);
    expect(options.dryRun).toBe(true);
  });

  it("handles npm stripped day values", () => {
    const previous = process.env.npm_config_day;
    process.env.npm_config_day = "true";
    try {
      const options = parseStartEndFrameArgs(["10"]);

      expect(options.fromDay).toBe(10);
      expect(options.toDay).toBe(10);
      expect(options.day).toBe(10);
    } finally {
      if (previous === undefined) delete process.env.npm_config_day;
      else process.env.npm_config_day = previous;
    }
  });

  it("treats one stripped positional day as a single-day run", () => {
    const options = parseStartEndFrameArgs(["10"]);

    expect(options.fromDay).toBe(10);
    expect(options.toDay).toBe(10);
    expect(options.day).toBe(10);
  });

  it("handles npm stripped from/to day values", () => {
    const previousFrom = process.env.npm_config_from_day;
    const previousTo = process.env.npm_config_to_day;
    process.env.npm_config_from_day = "true";
    process.env.npm_config_to_day = "true";
    try {
      const options = parseStartEndFrameArgs(["4", "6"]);

      expect(options.fromDay).toBe(4);
      expect(options.toDay).toBe(6);
    } finally {
      if (previousFrom === undefined) delete process.env.npm_config_from_day;
      else process.env.npm_config_from_day = previousFrom;
      if (previousTo === undefined) delete process.env.npm_config_to_day;
      else process.env.npm_config_to_day = previousTo;
    }
  });

  it("selects the latest primary approved PNG and ignores screenshots", () => {
    expect(selectApprovedSourceImage([
      "day-03-search-with-ember-video-source-no-text-v01-2026-05-08T01.png",
      "day-03-search-with-ember-video-source-no-text-v01-2026-05-08T02-chatgpt-screenshot.png",
      "day-03-search-with-ember-video-source-no-text-v01-2026-05-08T03.png"
    ], "day-03-search-with-ember")).toBe("day-03-search-with-ember-video-source-no-text-v01-2026-05-08T03.png");
  });

  it("builds and writes a reusable frame package from an approved source image", async () => {
    const root = await mkdtemp(join(tmpdir(), "ember-start-end-frames-"));
    const batchDir = "content/outputs/videos/batches/test-batch";
    const approvedDir = "content/outputs/images/approved/video-source/book-01";
    const outputDir = `${batchDir}/start-end-frames`;
    await mkdir(join(root, batchDir), { recursive: true });
    await writeFile(join(root, batchDir, "batch-manifest.json"), JSON.stringify({
      records: [{
        day: 3,
        slug: "day-03-search-with-ember",
        idempotency_key: "day-3-short-video",
          caption: "Search with Ember."
        }]
    }, null, 2), "utf8");
    await mkdir(join(root, approvedDir), { recursive: true });
    await writeFile(join(root, approvedDir, "day-03-search-with-ember-video-source-no-text-v01-test.png"), Buffer.from("fake image"));

    const plan = await buildStartEndFramePlan({
      rootDir: root,
      batchDir,
      approvedDir,
      outputDir,
      fromDay: 3,
      toDay: 3,
      dryRun: true,
      force: false
    });

    expect(plan.records).toHaveLength(1);
    expect(plan.records[0].start_frame).toBe(`${outputDir}/day-03-search-with-ember/day-03-search-with-ember-start-frame.png`);

    const result = await prepareStartEndFrames({
      rootDir: root,
      batchDir,
      approvedDir,
      outputDir,
      fromDay: 3,
      toDay: 3,
      dryRun: false,
      force: false
    });

    expect(result.ok).toBe(true);
    expect(result.preparedCount).toBe(1);
    expect(existsSync(join(root, plan.records[0].start_frame))).toBe(true);
    const startPrompt = await readFile(join(root, plan.records[0].output_files.start_prompt), "utf8");
    expect(startPrompt).toContain("approved text-less still is the start frame");
    const endPrompt = await readFile(join(root, plan.records[0].output_files.end_prompt), "utf8");
    expect(endPrompt).toContain("Create the END FRAME");
    expect(endPrompt).toContain("closed-mouth");
    expect(endPrompt).toContain("one small object motion");
    expect(endPrompt).toContain("Do not rearrange the scene or move the mission item");
  });

  it("prepares create-both prompts when no approved still exists", async () => {
    const root = await mkdtemp(join(tmpdir(), "ember-start-end-frames-no-still-"));
    const batchDir = "content/outputs/videos/batches/test-batch";
    const approvedDir = "content/outputs/images/approved/video-source/book-01";
    const outputDir = `${batchDir}/start-end-frames`;
    await mkdir(join(root, batchDir), { recursive: true });
    await mkdir(join(root, approvedDir), { recursive: true });
    await writeFile(join(root, batchDir, "batch-manifest.json"), JSON.stringify({
      records: [{
        day: 4,
        slug: "day-04-baby-flame-lantern",
        idempotency_key: "day-4-short-video",
        caption: "Find the Baby Flame Lantern."
      }]
    }, null, 2), "utf8");

    const result = await prepareStartEndFrames({
      rootDir: root,
      batchDir,
      approvedDir,
      outputDir,
      fromDay: 4,
      toDay: 4,
      dryRun: false,
      force: false
    });

    expect(result.ok).toBe(true);
    expect(result.plan.records[0]).toMatchObject({
      start_frame_mode: "create-both",
      source_image: null,
      start_frame: "content/outputs/images/pending-review/start-end-frames/book-01/day-04-baby-flame-lantern/day-04-baby-flame-lantern-start-frame-v01.png"
    });
    const startPrompt = await readFile(join(root, result.plan.records[0].output_files.start_prompt), "utf8");
    expect(startPrompt).toContain("no approved still exists; create both start and end frames");
    expect(startPrompt).toContain("Create this start frame now");
  });

  it("copies only unapproved start/end frame pairs into a Downloads folder", async () => {
    const root = await mkdtemp(join(tmpdir(), "ember-copy-unapproved-frames-"));
    const manifestPath = "content/outputs/videos/batches/test-batch/start-end-frames/start-end-frame-manifest.json";
    const approvedDir = "content/outputs/images/approved/start-end-frames/book-01";
    const downloadsDir = join(root, "Downloads");
    await mkdir(join(root, "content/outputs/videos/batches/test-batch/start-end-frames/day-03-approved"), { recursive: true });
    await mkdir(join(root, "content/outputs/videos/batches/test-batch/start-end-frames/day-04-pending"), { recursive: true });
    await mkdir(join(root, "content/outputs/images/pending-review/start-end-frames/book-01/day-04-pending"), { recursive: true });
    await mkdir(join(root, approvedDir, "day-03-approved"), { recursive: true });
    await writeFile(join(root, "content/outputs/videos/batches/test-batch/start-end-frames/day-03-approved/day-03-approved-start-frame.png"), "approved-start");
    await writeFile(join(root, "content/outputs/videos/batches/test-batch/start-end-frames/day-04-pending/day-04-pending-start-frame.png"), "pending-start");
    await writeFile(join(root, "content/outputs/images/pending-review/start-end-frames/book-01/day-04-pending/day-04-pending-end-frame-v01.png"), "pending-end");
    await writeFile(join(root, approvedDir, "day-03-approved/day-03-approved-end-frame-v01.png"), "approved-end");
    await mkdir(join(root, "content/outputs/videos/batches/test-batch/start-end-frames"), { recursive: true });
    await mkdir(join(downloadsDir, "review-copy"), { recursive: true });
    await writeFile(join(downloadsDir, "review-copy/stale-approved-day.png"), "stale");
    await writeFile(join(root, manifestPath), JSON.stringify({
      records: [
        {
          day: 3,
          slug: "day-03-approved",
          start_frame: "content/outputs/videos/batches/test-batch/start-end-frames/day-03-approved/day-03-approved-start-frame.png",
          expected_end_frame: "content/outputs/images/pending-review/start-end-frames/book-01/day-03-approved/day-03-approved-end-frame-v01.png"
        },
        {
          day: 4,
          slug: "day-04-pending",
          start_frame: "content/outputs/videos/batches/test-batch/start-end-frames/day-04-pending/day-04-pending-start-frame.png",
          expected_end_frame: "content/outputs/images/pending-review/start-end-frames/book-01/day-04-pending/day-04-pending-end-frame-v01.png"
        }
      ]
    }, null, 2), "utf8");

    const result = await copyUnapprovedStartEndFrames({
      rootDir: root,
      manifestPath,
      approvedEndFrameDir: approvedDir,
      downloadsDir,
      folderName: "review-copy"
    });

    expect(result.copied.map((item) => item.day)).toEqual([4]);
    expect(result.skipped).toContainEqual({ day: 3, slug: "day-03-approved", reason: "end frame already approved" });
    expect(existsSync(join(downloadsDir, "review-copy/day-04-pending-start-frame.png"))).toBe(true);
    expect(existsSync(join(downloadsDir, "review-copy/day-04-pending-end-frame-v01.png"))).toBe(true);
    expect(existsSync(join(downloadsDir, "review-copy/copy-manifest.json"))).toBe(true);
    expect(existsSync(join(downloadsDir, "review-copy/README.md"))).toBe(true);
    expect(existsSync(join(downloadsDir, "review-copy/stale-approved-day.png"))).toBe(false);
  });

  it("parses copy options", () => {
    expect(parseCopyUnapprovedFrameArgs(["--downloads-dir", "C:/tmp", "--folder-name", "frames", "--dry-run"])).toMatchObject({
      downloadsDir: "C:/tmp",
      folderName: "frames",
      dryRun: true
    });
  });

});
