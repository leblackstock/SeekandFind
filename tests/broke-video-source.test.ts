import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildShortVideoBatchPlan,
  writeShortVideoBatchPlan
} from "../automation/social/prepare-short-video-batch.js";
import {
  buildVideoSourceBrokeModeState,
  parseVideoSourceBrokeModeArgs,
  runVideoSourceBrokeMode,
  selectVideoSourceJobs
} from "../automation/social/broke-video-source.js";
import { QueuePost } from "../automation/social/validate-queue.js";

let root: string;

const searchWithEmberAsset = "content/outputs/images/approved/book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png";

const assetsByDay: Record<number, string> = {
  3: searchWithEmberAsset,
  4: "content/outputs/images/approved/book-1-no-blank-promo-batch-02-02-baby-flame-lantern-teaser-balanced-approved-recovered-2026-05-05T05-47-13-309Z-1.png",
  5: "content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-02-image-1-2026-05-05T04-51-23-244Z.png",
  6: "content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-03-image-1-2026-05-05T04-51-29-569Z.png",
  7: "content/outputs/images/approved/book-1-mission-item-promo-batch-03-01-golden-welcome-bell-teaser-recovered-2026-05-05T19-29-49-208Z.png",
  8: "content/outputs/images/approved/book-1-mission-item-promo-batch-03-02-firefly-flower-charm-teaser-recovered-2026-05-05T19-29-49-208Z.png",
  9: "content/outputs/images/approved/book-1-mission-item-promo-batch-03-03-dragon-door-key-teaser-retry-recovered-2026-05-05T19-37-48-357Z.png",
  10: "content/outputs/images/approved/book-1-mission-item-promo-batch-03-04-sparkle-market-token-teaser-recovered-2026-05-05T19-29-49-208Z.png",
  11: "content/outputs/images/approved/book-1-no-blank-promo-batch-02-04-meet-ember-guide-recovered-2026-05-05T05-21-47-885Z.png",
  12: searchWithEmberAsset
};

describe("Broke Mode video-source batch integration", () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ember-broke-video-source-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("selects the next missing video-source day by default", async () => {
    const plan = await makePlan();
    const state = await buildVideoSourceBrokeModeState(plan, { rootDir: root, downloadsDir: join(root, "Downloads") });

    const selection = selectVideoSourceJobs(plan, state);

    expect(selection.records.map((record) => record.day)).toEqual([3]);
  });

  it("skips days with existing pending-review or approved video-source images", async () => {
    const plan = await makePlan();
    await writeAsset("content/outputs/images/pending-review/video-source/book-01/day-03-search-with-ember-video-source-no-text-v01-test.png");
    await writeAsset("content/outputs/images/approved/video-source/book-01/day-04-baby-flame-lantern-video-source-no-text-approved-test.png");
    const state = await buildVideoSourceBrokeModeState(plan, { rootDir: root, downloadsDir: join(root, "Downloads") });

    const selection = selectVideoSourceJobs(plan, state, { max: 2 });

    expect(selection.records.map((record) => record.day)).toEqual([5, 6]);
    expect(selection.skipped.map((item) => item.day)).toEqual([3, 4]);
  });

  it("parses --max 3 without treating 3 as a positional day", () => {
    expect(parseVideoSourceBrokeModeArgs(["--max", "3"])).toMatchObject({
      max: 3,
      day: undefined
    });
    expect(parseVideoSourceBrokeModeArgs(["--list", "--max", "3"])).toMatchObject({
      list: true,
      max: 3,
      day: undefined
    });
    expect(parseVideoSourceBrokeModeArgs(["--day", "08"])).toMatchObject({
      day: 8
    });
  });

  it("parses redo targets through normal args and npm-forwarded env args", () => {
    expect(parseVideoSourceBrokeModeArgs(["--redo", "day-10"])).toMatchObject({
      redo: "day-10",
      day: undefined
    });

    const previousRedo = process.env.npm_config_redo;
    process.env.npm_config_redo = "true";
    try {
      expect(parseVideoSourceBrokeModeArgs(["day-10"])).toMatchObject({
        redo: "day-10",
        day: undefined
      });
    } finally {
      if (previousRedo === undefined) delete process.env.npm_config_redo;
      else process.env.npm_config_redo = previousRedo;
    }
  });

  it("falls back to npm_config_max when npm passes --max without a value", () => {
    const previous = process.env.npm_config_max;
    process.env.npm_config_max = "3";
    try {
      expect(parseVideoSourceBrokeModeArgs(["--max"])).toMatchObject({
        max: 3,
        day: undefined
      });
    } finally {
      if (previous === undefined) delete process.env.npm_config_max;
      else process.env.npm_config_max = previous;
    }
  });

  it("falls back to npm_config_maxsockets because npm maps --max there", () => {
    const previousMax = process.env.npm_config_max;
    const previousMaxSockets = process.env.npm_config_maxsockets;
    delete process.env.npm_config_max;
    process.env.npm_config_maxsockets = "3";
    try {
      expect(parseVideoSourceBrokeModeArgs(["--max"])).toMatchObject({
        max: 3,
        day: undefined
      });
    } finally {
      if (previousMax === undefined) delete process.env.npm_config_max;
      else process.env.npm_config_max = previousMax;
      if (previousMaxSockets === undefined) delete process.env.npm_config_maxsockets;
      else process.env.npm_config_maxsockets = previousMaxSockets;
    }
  });

  it("list mode with --max 3 selects exactly the next three missing days after completed days", async () => {
    const plan = await makePlan();
    await writeShortVideoBatchPlan(plan, { rootDir: root, force: true });
    await writeDownloadsReferences();
    await writeEmberReferences();
    await writeAsset("content/outputs/images/pending-review/video-source/book-01/day-03-search-with-ember-video-source-no-text-v01-test.png");
    await writeAsset("content/outputs/images/approved/video-source/book-01/day-04-baby-flame-lantern-video-source-no-text-approved-test.png");

    const result = await runVideoSourceBrokeMode({
      ...parseVideoSourceBrokeModeArgs(["--max", "3"]),
      rootDir: root,
      downloadsDir: join(root, "Downloads"),
      list: true
    });

    expect(result.selected_days).toEqual([5, 6, 7]);
    expect(result.selected_days).not.toContain(8);
  });

  it("explicit --day 08 selects Day 8", async () => {
    const plan = await makePlan();
    await writeShortVideoBatchPlan(plan, { rootDir: root, force: true });
    await writeDownloadsReferences();
    await writeEmberReferences();

    const result = await runVideoSourceBrokeMode({
      ...parseVideoSourceBrokeModeArgs(["--day", "08"]),
      rootDir: root,
      downloadsDir: join(root, "Downloads"),
      list: true
    });

    expect(result.selected_days).toEqual([8]);
    expect(result.jobs[0].slug).toBe("day-08-firefly-flower-charm");
  });

  it("keeps the Day 12 chat title hyphenated as seek-and-find", async () => {
    const plan = await makePlan();
    await writeShortVideoBatchPlan(plan, { rootDir: root, force: true });
    await writeDownloadsReferences();
    await writeEmberReferences();

    const result = await runVideoSourceBrokeMode({
      ...parseVideoSourceBrokeModeArgs(["--day", "12"]),
      rootDir: root,
      downloadsDir: join(root, "Downloads"),
      list: true
    });

    expect(result.jobs[0].chat_title).toBe("Book 1 Day 12 Video Source Image - Cozy Seek-and-Find Adventure");
  });

  it("caps max batch size at 4", async () => {
    const plan = await makePlan();
    const state = await buildVideoSourceBrokeModeState(plan, { rootDir: root, downloadsDir: join(root, "Downloads") });

    expect(() => selectVideoSourceJobs(plan, state, { max: 5 })).toThrow(/capped at 4/);
    expect(selectVideoSourceJobs(plan, state, { max: 4 }).records).toHaveLength(4);
  });

  it("keeps Day 8 included as needs-video-export without a readiness mismatch", async () => {
    const plan = await makePlan();
    const day8 = plan.records.find((record) => record.day === 8);

    expect(day8).toMatchObject({
      current_queue_status: "needs-video-export",
      readiness_mismatch: false
    });
  });

  it("list mode writes batch tracking without modifying queue.json", async () => {
    const plan = await makePlan();
    await writeShortVideoBatchPlan(plan, { rootDir: root, force: true });
    await writeDownloadsReferences();
    await writeEmberReferences();
    const queuePath = "content/social/campaigns/book-01/queue.json";
    await writeAsset(queuePath, "{\"unchanged\":true}\n");
    const before = await readFile(join(root, queuePath), "utf8");

    const result = await runVideoSourceBrokeMode({
      rootDir: root,
      downloadsDir: join(root, "Downloads"),
      list: true
    });

    const after = await readFile(join(root, queuePath), "utf8");
    expect(after).toBe(before);
    expect(result.queue_json_touched).toBe(false);
    expect(result.state_file).toBe("content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/video-source-broke-mode-state.json");
    expect(result.selected_days).toEqual([3]);
  });

  it("selected job includes the day reference and three Ember character references", async () => {
    const plan = await makePlan();
    await writeShortVideoBatchPlan(plan, { rootDir: root, force: true });
    await writeDownloadsReferences();
    await writeEmberReferences();

    const result = await runVideoSourceBrokeMode({
      rootDir: root,
      downloadsDir: join(root, "Downloads"),
      list: true
    });

    expect(result.jobs[0].reference_images).toEqual([
      join(root, "Downloads/day-03-reference-search-with-ember.png").replaceAll("\\", "/"),
      "Ember's Adventures/EtD Images/Ember-001.png",
      "Ember's Adventures/EtD Images/Ember-002.png",
      "Ember's Adventures/EtD Images/Ember-003.png"
    ]);
    expect(result.jobs[0].reference_image_count).toBe(4);
  });

  it("fails early when Ember character references are missing", async () => {
    const plan = await makePlan();
    await writeShortVideoBatchPlan(plan, { rootDir: root, force: true });
    await writeDownloadsReferences();

    await expect(runVideoSourceBrokeMode({
      rootDir: root,
      downloadsDir: join(root, "Downloads"),
      list: true
    })).rejects.toThrow(/Required Ember reference image missing for Day 3/);
  });

  it("writes prompt language for the day promo reference and Ember character references", async () => {
    const plan = await makePlan();
    await writeShortVideoBatchPlan(plan, { rootDir: root, force: true });
    await writeDownloadsReferences();
    await writeEmberReferences();

    const result = await runVideoSourceBrokeMode({
      rootDir: root,
      downloadsDir: join(root, "Downloads"),
      list: true
    });
    const prompt = await readFile(join(root, result.jobs[0].prompt_path), "utf8");

    expect(prompt).toContain("Attached images are visual references only. The day-specific promo image is for composition, mood, color palette, and concept only.");
    expect(prompt).toContain("Use the uploaded day-specific promo image as the composition and mood reference only.");
    expect(prompt).toContain("Use the uploaded Ember-001, Ember-002, and Ember-003 images as character reference images.");
    expect(prompt).toContain("Ember accuracy is the highest priority in this generation.");
    expect(prompt).toContain("simplify the market details rather than changing Ember");
    expect(prompt).toContain("Do not render, imply, or invent any text, words, letters, captions, title graphics, signs, labels, UI, logos, or marketing copy.");
    expect(prompt).toContain("Avoid paper, tag, scrap, note, sign-like rectangle, label-like shape, or decorative stroke details that look like letters");
    expect(prompt).toContain("Do not turn Ember into a fox, cat, generic dragon, wizard, plush toy, mascot, chibi monster, or different character.");
    expect(prompt).toContain("no readable text anywhere");
    expect(prompt).toContain("no paper/tag/scrap marks that resemble writing");
    expect(prompt).toContain("Ember clearly matches the three uploaded Ember reference images");
  });

  it("adds the Day 4 single Baby Flame Lantern shelf rule", async () => {
    const plan = await makePlan();
    await writeShortVideoBatchPlan(plan, { rootDir: root, force: true });
    await writeDownloadsReferences();
    await writeEmberReferences();

    const result = await runVideoSourceBrokeMode({
      rootDir: root,
      downloadsDir: join(root, "Downloads"),
      list: true,
      day: 4
    });
    const prompt = await readFile(join(root, result.jobs[0].prompt_path), "utf8");

    expect(prompt).toContain("include exactly one Baby Flame Lantern");
    expect(prompt).toContain("place that single Baby Flame Lantern on a shelf");
    expect(prompt).toContain("Do not create a second baby-flame-lantern-shaped object.");
  });

  it("keeps Day 4 object rules out of non-Day 4 prompts", async () => {
    const plan = await makePlan();
    await writeShortVideoBatchPlan(plan, { rootDir: root, force: true });
    await writeDownloadsReferences();
    await writeEmberReferences();

    const result = await runVideoSourceBrokeMode({
      rootDir: root,
      downloadsDir: join(root, "Downloads"),
      list: true,
      day: 10
    });
    const prompt = await readFile(join(root, result.jobs[0].prompt_path), "utf8");

    expect(prompt).toContain("Sparkle Market Token concept is present");
    expect(prompt).not.toContain("Baby Flame Lantern");
    expect(prompt).not.toMatch(/[\u00e2\u00c3]/);
  });

  it("removes publish copy, CTA text, and social captions from video-source prompts", async () => {
    const plan = await makePlan();
    await writeShortVideoBatchPlan(plan, { rootDir: root, force: true });
    await writeDownloadsReferences();
    await writeEmberReferences();

    const result = await runVideoSourceBrokeMode({
      rootDir: root,
      downloadsDir: join(root, "Downloads"),
      list: true
    });
    const prompt = await readFile(join(root, result.jobs[0].prompt_path), "utf8");

    expect(prompt).not.toContain("Coming soon to Amazon");
    expect(prompt).not.toContain("CTA");
    expect(prompt).not.toContain("Share with");
    expect(prompt).not.toContain("Day 3 caption");
    expect(prompt).toContain("Campaign concept: Search with Ember in a cozy, child-friendly seek-and-find world");
  });

  it("generates a clean chat title from the day and asset purpose", async () => {
    const plan = await makePlan();
    await writeShortVideoBatchPlan(plan, { rootDir: root, force: true });
    await writeDownloadsReferences();
    await writeEmberReferences();

    const result = await runVideoSourceBrokeMode({
      rootDir: root,
      downloadsDir: join(root, "Downloads"),
      list: true
    });

    expect(result.jobs[0].chat_title).toBe("Book 1 Day 03 Video Source Image - Search with Ember");
  });

  it("lists a recovery job without submitting a new prompt or touching queue.json", async () => {
    const plan = await makePlan();
    await writeShortVideoBatchPlan(plan, { rootDir: root, force: true });
    await writeDownloadsReferences();
    await writeEmberReferences();
    const queuePath = "content/social/campaigns/book-01/queue.json";
    await writeAsset(queuePath, "{\"unchanged\":true}\n");
    const before = await readFile(join(root, queuePath), "utf8");

    const result = await runVideoSourceBrokeMode({
      rootDir: root,
      downloadsDir: join(root, "Downloads"),
      recover: "day-03",
      list: true
    });

    expect(result.selected_days).toEqual([3]);
    expect(result.queue_json_touched).toBe(false);
    await expect(readFile(join(root, queuePath), "utf8")).resolves.toBe(before);
  });
});

async function makePlan() {
  for (const asset of Object.values(assetsByDay)) await writeAsset(asset);
  const posts = Object.entries(assetsByDay).map(([day, asset]) => makePost(Number(day), "needs-video-export", asset));
  return buildShortVideoBatchPlan(posts, {
    batchDate: "2026-05-08",
    rootDir: root
  });
}

function makePost(day: number, status: string, asset: string): QueuePost {
  return {
    post_id: `book01-day-${String(day).padStart(2, "0")}`,
    campaign_day: day,
    scheduled_date: "2026-05-08",
    media_assets: [asset],
    caption_source: {
      type: "calendar_slot",
      text: `Day ${day} caption`,
      cta: "Save this."
    },
    platform_tasks: [
      {
        platform: "Short Video",
        status,
        idempotency_key: `book01-day${String(day).padStart(2, "0")}-short-video-youtube-shorts-public-tiktok-public-instagram-reels-public-facebook-reels-public-pinterest-video-pin-public`,
        caption_source: {
          type: "calendar_slot",
          text: `Day ${day} caption\n\nComing soon to Amazon.`,
          cta: "Share with a little dragon fan."
        }
      }
    ]
  };
}

async function writeDownloadsReferences(): Promise<void> {
  const names = [
    "day-03-reference-search-with-ember.png",
    "day-04-reference-baby-flame-lantern.png",
    "day-05-reference-lantern-maker-workshop.png",
    "day-06-reference-cozy-dragon-village.png",
    "day-07-reference-golden-welcome-bell.png",
    "day-08-reference-firefly-flower-charm.png",
    "day-09-reference-dragon-door-key.png",
    "day-10-reference-sparkle-market-token.png",
    "day-11-reference-ember-progress-note.png",
    "day-12-reference-cozy-seek-and-find-adventure.png"
  ];
  for (const name of names) {
    await writeAsset(join("Downloads", name), "fake reference");
  }
}

async function writeEmberReferences(): Promise<void> {
  for (const name of ["Ember-001.png", "Ember-002.png", "Ember-003.png"]) {
    await writeAsset(join("Ember's Adventures/EtD Images", name), "fake Ember reference");
  }
}

async function writeAsset(relativePath: string, content = "fake image"): Promise<void> {
  const absolute = join(root, relativePath);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
}
