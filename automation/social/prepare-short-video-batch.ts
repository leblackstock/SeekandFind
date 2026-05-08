import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { writeTextFileSafe } from "../../src/core/file-writer.js";
import { slugify } from "../../src/core/naming.js";
import { PlatformTask, QueuePost, validateSocialQueue } from "./validate-queue.js";

export type BranchClassification = "A" | "B" | "C" | "D";
export type ReadableTextStatus = "yes" | "no" | "not_applicable";
export type DirectImageToVideoRecommendation = "yes" | "no";

export interface ShortVideoBatchOptions {
  batchDate?: string;
  fromDay?: number;
  toDay?: number;
  rootDir?: string;
  force?: boolean;
}

export interface ImagePreflightRecord {
  day: number;
  slug: string;
  idempotency_key: string;
  current_queue_status: string;
  caption: string;
  current_media_asset_path: string | null;
  source_image_found: boolean;
  readable_text_detected: ReadableTextStatus;
  visible_text_found: string[];
  branch_classification: BranchClassification;
  direct_image_to_video_recommendation: DirectImageToVideoRecommendation;
  exact_next_asset_needed: string;
  approved_video_export_exists: boolean;
  readiness_mismatch: boolean;
  output_files: {
    image_preflight_json: string;
    image_preflight_md: string;
    video_source_image_prompt: string;
    image_to_video_prompt: string;
    review_checklist: string;
  };
}

export interface ShortVideoBatchPlan {
  batch_id: string;
  batch_date: string;
  batch_dir: string;
  day_range: {
    from: number;
    to: number;
  };
  branch_counts: Record<BranchClassification, number>;
  readiness_mismatches: ImagePreflightRecord[];
  records: ImagePreflightRecord[];
  output_files: {
    manifest: string;
    summary: string;
  };
}

export interface ShortVideoBatchResult {
  ok: boolean;
  batch_dir: string;
  days_included: number[];
  branch_counts: Record<BranchClassification, number>;
  readiness_mismatches: Array<{
    day: number;
    idempotency_key: string;
    current_queue_status: string;
    reason: string;
  }>;
  files: string[];
}

const defaultFromDay = 3;
const defaultToDay = 12;
const outputRoot = "content/outputs/videos/batches";

const daySlugOverrides: Record<number, string> = {
  3: "day-03-search-with-ember",
  4: "day-04-baby-flame-lantern",
  5: "day-05-lantern-maker-workshop",
  6: "day-06-cozy-dragon-village",
  7: "day-07-golden-welcome-bell",
  8: "day-08-firefly-flower-charm",
  9: "day-09-dragon-door-key",
  10: "day-10-sparkle-market-token",
  11: "day-11-ember-progress-note",
  12: "day-12-cozy-seek-and-find-adventure"
};

const exactVisibleTextByAssetName: Record<string, string[]> = {
  "book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png": [
    "Search with Ember!"
  ],
  "book-1-no-blank-promo-batch-02-02-baby-flame-lantern-teaser-balanced-approved-recovered-2026-05-05T05-47-13-309Z-1.png": [
    "Can you find the Baby Flame Lantern?"
  ],
  "book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-02-image-1-2026-05-05T04-51-23-244Z.png": [
    "Can you help Ember find it?"
  ],
  "book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-03-image-1-2026-05-05T04-51-29-569Z.png": [
    "Find the tiny treasure"
  ],
  "book-1-mission-item-promo-batch-03-01-golden-welcome-bell-teaser-recovered-2026-05-05T19-29-49-208Z.png": [
    "Can you find the Golden Welcome Bell?"
  ],
  "book-1-mission-item-promo-batch-03-02-firefly-flower-charm-teaser-recovered-2026-05-05T19-29-49-208Z.png": [
    "Find the Firefly Flower Charm"
  ],
  "book-1-mission-item-promo-batch-03-03-dragon-door-key-teaser-retry-recovered-2026-05-05T19-37-48-357Z.png": [
    "Can you find the Dragon Door Key?"
  ],
  "book-1-mission-item-promo-batch-03-04-sparkle-market-token-teaser-recovered-2026-05-05T19-29-49-208Z.png": [
    "Find the Sparkle Market Token"
  ],
  "book-1-no-blank-promo-batch-02-04-meet-ember-guide-recovered-2026-05-05T05-21-47-885Z.png": [
    "Meet Ember",
    "Your baby dragon guide"
  ]
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function campaignDay(post: QueuePost): number {
  return typeof post.campaign_day === "number" ? post.campaign_day : Number.MAX_SAFE_INTEGER;
}

function platformTasks(post: QueuePost): PlatformTask[] {
  return Array.isArray(post.platform_tasks) ? post.platform_tasks as PlatformTask[] : [];
}

function normalizedPath(value: string): string {
  return value.replaceAll("\\", "/");
}

function localPathExists(relativePath: string, rootDir?: string): boolean {
  if (!relativePath.trim()) return false;
  return existsSync(join(rootDir ?? process.cwd(), relativePath));
}

function isApprovedVideoExportPath(path: string): boolean {
  return /content\/outputs\/videos\/approved\/.+\.(mp4|mov|webm|m4v)$/i.test(normalizedPath(path));
}

function isApprovedImagePath(path: string): boolean {
  return /content\/outputs\/images\/approved\/.+\.(png|jpe?g|webp)$/i.test(normalizedPath(path));
}

function isApprovedVideoSourceImagePath(path: string): boolean {
  const normalized = normalizedPath(path);
  return isApprovedImagePath(path) && /(^|\/|-)video-source(\/|-)|source-image/i.test(normalized);
}

export function hasApprovedVideoExport(post: QueuePost, rootDir?: string): boolean {
  return asStringArray(post.media_assets).some((assetPath) => (
    isApprovedVideoExportPath(assetPath) && localPathExists(assetPath, rootDir)
  ));
}

function firstExistingAsset(paths: string[], predicate: (path: string) => boolean, rootDir?: string): string | null {
  return paths.find((assetPath) => predicate(assetPath) && localPathExists(assetPath, rootDir)) ?? null;
}

function captionText(post: QueuePost, task: PlatformTask): string {
  const source = (task.caption_source ?? post.caption_source) as { text?: unknown; cta?: unknown } | undefined;
  const text = asString(source?.text).trim();
  const cta = asString(source?.cta).trim();
  if (text && cta) return `${text}\n\nCTA: ${cta}`;
  return text || cta || "";
}

function deriveSlug(day: number, post: QueuePost): string {
  const override = daySlugOverrides[day];
  if (override) return override;
  const postId = asString(post.post_id);
  return postId ? slugify(postId) : `day-${String(day).padStart(2, "0")}-short-video`;
}

function visibleTextForAsset(assetPath: string | null): string[] {
  if (!assetPath) return [];
  return exactVisibleTextByAssetName[basename(assetPath)] ?? [];
}

function nextAssetNeeded(branch: BranchClassification): string {
  if (branch === "A") {
    return "Image-to-video prompt prep using the approved no-text video-source image, then a reviewed video export.";
  }
  if (branch === "B") {
    return "Reviewed video-safety decision before direct image-to-video, then a reviewed video export.";
  }
  if (branch === "C") {
    return "Clean no-text vertical 9:16 video-source image, then image-to-video prompt/export after that source image is approved.";
  }
  return "New clean no-text vertical 9:16 video-source image prompt from the task caption, queue details, Ember/Book 1 canon, and nearby approved assets if relevant.";
}

function classifyRecord(params: {
  day: number;
  slug: string;
  post: QueuePost;
  task: PlatformTask;
  batchDir: string;
  rootDir?: string;
}): ImagePreflightRecord {
  const assets = asStringArray(params.post.media_assets);
  const approvedVideoSourceImage = firstExistingAsset(assets, isApprovedVideoSourceImagePath, params.rootDir);
  const staticImage = firstExistingAsset(assets, isApprovedImagePath, params.rootDir);
  const currentMediaAssetPath = approvedVideoSourceImage ?? staticImage ?? assets[0] ?? null;
  const visibleText = visibleTextForAsset(staticImage);
  const approvedVideoExportExists = hasApprovedVideoExport(params.post, params.rootDir);

  let branch: BranchClassification;
  let sourceImageFound = false;
  let readableTextDetected: ReadableTextStatus = "not_applicable";
  let directRecommendation: DirectImageToVideoRecommendation = "no";

  if (approvedVideoSourceImage) {
    branch = "A";
    sourceImageFound = true;
    readableTextDetected = "no";
    directRecommendation = "yes";
  } else if (staticImage && visibleText.length > 0) {
    branch = "C";
    sourceImageFound = true;
    readableTextDetected = "yes";
  } else if (staticImage) {
    branch = "B";
    sourceImageFound = true;
    readableTextDetected = "no";
  } else {
    branch = "D";
  }

  const readinessMismatch = params.task.status === "ready" && !approvedVideoExportExists;
  const basePath = `${params.batchDir}/${params.slug}`;

  return {
    day: params.day,
    slug: params.slug,
    idempotency_key: asString(params.task.idempotency_key),
    current_queue_status: asString(params.task.status),
    caption: captionText(params.post, params.task),
    current_media_asset_path: currentMediaAssetPath,
    source_image_found: sourceImageFound,
    readable_text_detected: readableTextDetected,
    visible_text_found: branch === "C" ? visibleText : [],
    branch_classification: branch,
    direct_image_to_video_recommendation: directRecommendation,
    exact_next_asset_needed: nextAssetNeeded(branch),
    approved_video_export_exists: approvedVideoExportExists,
    readiness_mismatch: readinessMismatch,
    output_files: {
      image_preflight_json: `${basePath}/image-preflight.json`,
      image_preflight_md: `${basePath}/image-preflight.md`,
      video_source_image_prompt: `${basePath}/${params.slug}-video-source-image-prompt.md`,
      image_to_video_prompt: `${basePath}/${params.slug}-image-to-video-prompt.md`,
      review_checklist: `${basePath}/${params.slug}-review-checklist.md`
    }
  };
}

export function buildShortVideoBatchPlan(posts: QueuePost[], options: ShortVideoBatchOptions = {}): ShortVideoBatchPlan {
  const fromDay = options.fromDay ?? defaultFromDay;
  const toDay = options.toDay ?? defaultToDay;
  const batchDate = options.batchDate ?? new Date().toISOString().slice(0, 10);
  const batchId = `book-01-short-video-batch-${batchDate}`;
  const batchDir = `${outputRoot}/${batchId}`;
  const branchCounts: Record<BranchClassification, number> = { A: 0, B: 0, C: 0, D: 0 };
  const records = [...posts]
    .sort((left, right) => campaignDay(left) - campaignDay(right))
    .flatMap((post) => {
      const day = campaignDay(post);
      if (day < fromDay || day > toDay) return [];
      const task = platformTasks(post).find((candidate) => candidate.platform === "Short Video");
      if (!task) return [];
      const slug = deriveSlug(day, post);
      return [classifyRecord({ day, slug, post, task, batchDir, rootDir: options.rootDir })];
    });

  for (const record of records) branchCounts[record.branch_classification] += 1;

  return {
    batch_id: batchId,
    batch_date: batchDate,
    batch_dir: batchDir,
    day_range: {
      from: fromDay,
      to: toDay
    },
    branch_counts: branchCounts,
    readiness_mismatches: records.filter((record) => record.readiness_mismatch),
    records,
    output_files: {
      manifest: `${batchDir}/batch-manifest.json`,
      summary: `${batchDir}/batch-summary.md`
    }
  };
}

function yesNo(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}

function textList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `\`${item}\``).join(", ") : "None";
}

function renderPreflightMarkdown(record: ImagePreflightRecord): string {
  return `# ${record.slug} Image Preflight

Campaign: Book 1 Prelaunch Rolling Campaign
Campaign day: Day ${record.day}
Task: \`${record.idempotency_key}\`

## Result

| Field | Value |
| --- | --- |
| Current queue status | \`${record.current_queue_status}\` |
| Current media asset path | ${record.current_media_asset_path ? `\`${record.current_media_asset_path}\`` : "None"} |
| Source image found | ${yesNo(record.source_image_found)} |
| Readable text detected | ${record.readable_text_detected} |
| Exact visible text found | ${textList(record.visible_text_found)} |
| Branch classification | ${record.branch_classification} |
| Direct image-to-video recommendation | ${record.direct_image_to_video_recommendation} |
| Approved video export exists | ${yesNo(record.approved_video_export_exists)} |
| Readiness mismatch | ${yesNo(record.readiness_mismatch)} |
| Exact next asset needed | ${record.exact_next_asset_needed} |

## Caption

${record.caption || "No caption found."}

## Approval Gate

Do not mark this Short Video task ready in the queue until an approved local video export exists under \`content/outputs/videos/approved/\` and has been reviewed.
`;
}

function renderVideoSourcePrompt(record: ImagePreflightRecord): string {
  const referenceLine = record.current_media_asset_path
    ? `Use this static promo image as visual reference only:\n\n\`${record.current_media_asset_path}\``
    : "No usable static promo image exists. Build the image from the caption, campaign day, queue details, Ember/Book 1 canon, and nearby approved assets only if clearly relevant.";
  const textLine = record.visible_text_found.length > 0
    ? `The reference image contains readable text: ${record.visible_text_found.map((item) => `"${item}"`).join(", ")}. Remove that text completely.`
    : "Do not add any readable text.";

  return `# ${record.slug} Video-Source Image Prompt

Campaign: Book 1 Prelaunch Rolling Campaign
Campaign day: Day ${record.day}
Task: \`${record.idempotency_key}\`
Branch: ${record.branch_classification}
Purpose: create or identify the clean no-text source image for later image-to-video generation.

## Reference

${referenceLine}

Caption context:

${record.caption || "No caption found."}

## Prompt

Create one clean vertical 9:16 video-source image for a motion-only Ember short video.

Preserve Ember, the warm Sparkleflame Festival mood, the core marketing concept, the cozy lantern-lit colors, and the general composition implied by the reference/caption. ${textLine}

Keep Ember on-model as a tiny adorable reddish-orange baby dragon with soft pumpkin-orange and coral shading, shiny golden spiral-comma horns, large glossy blue-teal eyes, cream belly, plain bright blue-teal scarf, and tiny plain brown crossbody satchel with dull-gold button clasps.

Make the image clean, stable, cinematic, and easy to animate with a gentle push-in, light parallax, cozy lantern glow, subtle sparkles, breathing, blink, or tiny head tilt. Keep clear foreground, midground, and background zones.

No new characters. No new story elements. No fake cover, fake listing preview, fake interior page, or sales graphic.

## Negative Prompt / Avoid

No readable text, title graphics, captions, subtitles, labels, signs, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No scary expression, angry face, smug face, photorealism, flat cartoon style, distorted scarf, missing satchel, extra limbs, muddy glitter fog, heavy sparkle haze, or clutter that makes the scene hard to read.
`;
}

function renderImageToVideoPrompt(record: ImagePreflightRecord): string {
  return `# ${record.slug} Image-To-Video Prompt

Campaign: Book 1 Prelaunch Rolling Campaign
Campaign day: Day ${record.day}
Task: \`${record.idempotency_key}\`
Video type: motion-only image-to-video promo clip
Length: 5 seconds
Format: vertical 9:16

## Source Requirement

Use only the approved clean no-text video-source image for this day as the image-to-video input. Do not use a static promo image with readable text as the direct video source.

Queue status must not move to \`ready\` until the finished export is reviewed and an approved video file exists under \`content/outputs/videos/approved/\`.

## Prompt

Create a 5-second vertical 9:16 motion-only promo clip with gentle push-in/parallax, cozy lantern glow, subtle sparkles, and tiny natural movement.

Ember stays on-model, calm, cheerful, and closed-mouth. Keep Ember as a tiny reddish-orange baby dragon with golden spiral-comma horns, large blue-teal eyes, cream belly, bright blue-teal scarf, and small brown satchel.

No scene cuts. No new characters. No new story elements. Preserve the warm lantern-market / seek-and-find mood and child-friendly feel.

## Negative Prompt / Avoid

No readable text, captions, subtitles, labels, signs, logos, watermarks, fake UI, page numbers, arrows, circles, boxes, answer marks, or extra words.

Do not make Ember talk. Closed mouth only. No lip sync, no lip movement, no jaw movement, no exaggerated mouth movement, no teeth, no weird final-frame eyes, no held-long blink, no off-model face, no extra limbs, no distorted scarf, and no missing satchel.

No frantic camera movement, zoom whip, hard cuts, scary lighting, muddy glitter fog, heavy sparkles covering the scene, photorealism, flat cartoon style, fake book cover, fake listing preview, fake interior page, or Amazon/buy/order language inside the video.
`;
}

function renderReviewChecklist(record: ImagePreflightRecord): string {
  return `# ${record.slug} Review Checklist

Campaign: Book 1 Prelaunch Rolling Campaign
Campaign day: Day ${record.day}
Task: \`${record.idempotency_key}\`
Expected queue status before approved export: \`${record.current_queue_status}\`

## Image Preflight

- [ ] Preflight branch recorded as ${record.branch_classification}.
- [ ] Exact visible text recorded: ${textList(record.visible_text_found)}.
- [ ] Static promo image is not used directly for image-to-video when readable text exists.
- [ ] Approval gate is understood: queue status changes only after approved video export exists.

## Video-Source Image Review

- [ ] Vertical 9:16.
- [ ] No readable text.
- [ ] No title graphics, captions, labels, signs, UI, logos, watermarks, or extra words.
- [ ] Ember stays on-model: reddish-orange baby dragon, blue-teal eyes, golden spiral horns, cream belly, blue-teal scarf, brown satchel.
- [ ] Cozy lantern-market / seek-and-find mood is preserved.
- [ ] No new characters or new story elements.
- [ ] Stable composition suitable for gentle push-in/parallax.

## Video Export Review

- [ ] 5 seconds.
- [ ] Vertical 9:16.
- [ ] Motion-only promo clip.
- [ ] Uses approved clean no-text video-source image.
- [ ] Ember stays cheerful, calm, and child-safe.
- [ ] Ember does not talk.
- [ ] Closed mouth / no lip movement / no lip sync / no jaw movement.
- [ ] No extra limbs, distorted scarf, missing satchel, off-model face, or strange final-frame eyes.
- [ ] Motion is gentle: slow push-in, light parallax, cozy lantern glow, subtle sparkles.
- [ ] No hard cuts, frantic zooms, scary lighting, muddy fog, or overwhelming glitter.
- [ ] No generated text, captions, subtitles, logos, watermarks, labels, fake UI, page numbers, signs, arrows, circles, boxes, or answer marks.

## Posting Readiness

- [ ] Candidate video was owner-reviewed before moving to \`content/outputs/videos/approved/\`.
- [ ] Approved export path exists locally.
- [ ] Queue remains unchanged until a separate approved-export update pass.
`;
}

function renderSummary(plan: ShortVideoBatchPlan): string {
  const mismatchRows = plan.readiness_mismatches.length > 0
    ? plan.readiness_mismatches.map((record) => `| Day ${record.day} | \`${record.idempotency_key}\` | \`${record.current_queue_status}\` | No approved video export in media_assets. |`).join("\n")
    : "| None | None | None | None |";
  const dayRows = plan.records.map((record) => (
    `| Day ${record.day} | \`${record.current_queue_status}\` | ${record.branch_classification} | ${record.readable_text_detected} | ${textList(record.visible_text_found)} | ${record.exact_next_asset_needed} |`
  )).join("\n");

  return `# Book 1 Short-Video Batch Prep Summary

Batch: \`${plan.batch_id}\`
Day range: ${plan.day_range.from}-${plan.day_range.to}
Generated files only. No queue changes, images, videos, uploads, or posts were created by this prep.

## Branch Counts

| Branch | Count |
| --- | ---: |
| A | ${plan.branch_counts.A} |
| B | ${plan.branch_counts.B} |
| C | ${plan.branch_counts.C} |
| D | ${plan.branch_counts.D} |

## Day Plan

| Day | Queue Status | Branch | Readable Text | Exact Visible Text | Next Asset Needed |
| --- | --- | --- | --- | --- | --- |
${dayRows}

## Readiness Mismatches

Short Video tasks are not truly publishable unless \`media_assets\` includes an existing approved video export under \`content/outputs/videos/approved/\`.

| Day | Idempotency Key | Queue Status | Reason |
| --- | --- | --- | --- |
${mismatchRows}

## Approval Gate

Batch prep may create prompts and checklists only. Queue status can move to \`ready\` only after an approved export exists, has been reviewed, and is referenced in a separate queue update pass.

## Reporting TODO

Ensure any future social readiness reporting treats ready Short Video tasks without approved exports as false-ready, not publishable.
`;
}

async function writeJson(relativePath: string, value: unknown, options: ShortVideoBatchOptions): Promise<string> {
  return writeTextFileSafe(relativePath, `${JSON.stringify(value, null, 2)}\n`, {
    rootDir: options.rootDir,
    force: options.force
  });
}

async function writeMarkdown(relativePath: string, content: string, options: ShortVideoBatchOptions): Promise<string> {
  return writeTextFileSafe(relativePath, content, {
    rootDir: options.rootDir,
    force: options.force
  });
}

export async function writeShortVideoBatchPlan(plan: ShortVideoBatchPlan, options: ShortVideoBatchOptions = {}): Promise<ShortVideoBatchResult> {
  const files: string[] = [];
  files.push(await writeJson(plan.output_files.manifest, plan, options));
  files.push(await writeMarkdown(plan.output_files.summary, renderSummary(plan), options));

  for (const record of plan.records) {
    files.push(await writeJson(record.output_files.image_preflight_json, record, options));
    files.push(await writeMarkdown(record.output_files.image_preflight_md, renderPreflightMarkdown(record), options));
    files.push(await writeMarkdown(record.output_files.video_source_image_prompt, renderVideoSourcePrompt(record), options));
    files.push(await writeMarkdown(record.output_files.image_to_video_prompt, renderImageToVideoPrompt(record), options));
    files.push(await writeMarkdown(record.output_files.review_checklist, renderReviewChecklist(record), options));
  }

  return {
    ok: true,
    batch_dir: plan.batch_dir,
    days_included: plan.records.map((record) => record.day),
    branch_counts: plan.branch_counts,
    readiness_mismatches: plan.readiness_mismatches.map((record) => ({
      day: record.day,
      idempotency_key: record.idempotency_key,
      current_queue_status: record.current_queue_status,
      reason: "Short Video task is marked ready but no approved video export exists in media_assets."
    })),
    files
  };
}

export async function prepareShortVideoBatch(options: ShortVideoBatchOptions = {}): Promise<ShortVideoBatchResult> {
  const validation = await validateSocialQueue();
  if (!validation.ok) {
    throw new Error(`Social queue validation failed: ${validation.errors.join("; ")}`);
  }
  const plan = buildShortVideoBatchPlan(validation.posts, options);
  return writeShortVideoBatchPlan(plan, options);
}

function readOption(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function readFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`) || readOption(args, name) === "true";
}

function parseDay(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) throw new Error(`Invalid day value: ${value}`);
  return parsed;
}

function parseArgs(args: string[]): ShortVideoBatchOptions {
  return {
    batchDate: readOption(args, "date"),
    fromDay: parseDay(readOption(args, "from-day"), defaultFromDay),
    toDay: parseDay(readOption(args, "to-day"), defaultToDay),
    force: readFlag(args, "force")
  };
}

async function main(): Promise<void> {
  const result = await prepareShortVideoBatch(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
