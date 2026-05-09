import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";
import { repoRoot, toRepoRelative } from "../../src/config.js";
import { writeTextFileSafe } from "../../src/core/file-writer.js";
import { slugify } from "../../src/core/naming.js";
import { BrowserMode, defaultBrokeModeOptions } from "../../src/core/image-file-manager.js";
import { ImagePreflightRecord, ShortVideoBatchPlan } from "./prepare-short-video-batch.js";

export type VideoSourceBrokeModeStatus =
  | "not-started"
  | "broke-mode-running"
  | "generated-pending-review"
  | "failed-needs-regeneration"
  | "user-approved-video-source"
  | "video-export-needed"
  | "video-export-pending-review"
  | "video-approved";

export interface VideoSourceBrokeModeStateEntry {
  day: number;
  slug: string;
  idempotency_key: string;
  status: VideoSourceBrokeModeStatus;
  reference_image_downloads_path: string;
  ember_reference_images: string[];
  required_reference_images: string[];
  reference_image_count: number;
  source_reference_image: string | null;
  prompt_path: string;
  review_checklist_path: string;
  pending_review_images: string[];
  approved_video_source_images: string[];
  failed_paths: string[];
  notes: string[];
  updated_at: string;
}

export interface VideoSourceBrokeModeState {
  batch_id: string;
  batch_dir: string;
  state_file: string;
  pending_review_folder: string;
  approved_folder: string;
  allowed_statuses: VideoSourceBrokeModeStatus[];
  days: VideoSourceBrokeModeStateEntry[];
  last_selection: Array<{
    day: number;
    slug: string;
    status: VideoSourceBrokeModeStatus;
    reason: string;
  }>;
  updated_at: string;
}

export interface VideoSourceSelectionOptions {
  max?: number;
  day?: number;
  redo?: string | boolean;
  recover?: string | boolean;
}

export interface VideoSourceBrokeModeOptions extends VideoSourceSelectionOptions {
  batchDir?: string;
  downloadsDir?: string;
  rootDir?: string;
  list?: boolean;
  dryRun?: boolean;
  force?: boolean;
  browserMode?: BrowserMode;
  cdpUrl?: string;
  autoSubmit?: boolean;
  timeoutMinutes?: number;
}

export interface VideoSourceBrokeModeJob {
  day: number;
  slug: string;
  idempotency_key: string;
  prompt_path: string;
  reference_image_downloads_path: string;
  ember_reference_images: string[];
  reference_images: string[];
  reference_image_count: number;
  expected_output_filename: string;
  pending_review_folder: string;
  approved_folder: string;
  review_checklist_path: string;
  asset_name: string;
  chat_title: string;
}

export interface VideoSourceBrokeModeResult {
  ok: boolean;
  batch_dir: string;
  state_file: string;
  docs_file: string;
  selected_days: number[];
  jobs: VideoSourceBrokeModeJob[];
  skipped: Array<{ day: number; slug: string; reason: string }>;
  dry_run: boolean;
  list: boolean;
  queue_json_touched: false;
}

const defaultBatchDir = "content/outputs/videos/batches/book-01-short-video-batch-2026-05-08";
const pendingReviewFolder = "content/outputs/images/pending-review/video-source/book-01";
const approvedFolder = "content/outputs/images/approved/video-source/book-01";
const stateFileName = "video-source-broke-mode-state.json";
const docsFileName = "broke-mode-video-source-workflow.md";
const promptsFolderName = "broke-mode-prompts";
const emberReferenceImages = [
  "Ember's Adventures/EtD Images/Ember-001.png",
  "Ember's Adventures/EtD Images/Ember-002.png",
  "Ember's Adventures/EtD Images/Ember-003.png"
];
const videoSourceReferenceUploadGuard = "Attached images are visual references only. The day-specific promo image is for composition, mood, color palette, and concept only. Ember-001, Ember-002, and Ember-003 are character references for Ember’s appearance and proportions. Do not create a character reference sheet, collage, lineup, turnaround, model sheet, or isolated character study. Create the requested full-scene video-source image from the prompt below.";
const requiredReferenceImageCount = 4;
const allowedStatuses: VideoSourceBrokeModeStatus[] = [
  "not-started",
  "broke-mode-running",
  "generated-pending-review",
  "failed-needs-regeneration",
  "user-approved-video-source",
  "video-export-needed",
  "video-export-pending-review",
  "video-approved"
];

function nowIso(): string {
  return new Date().toISOString();
}

function dayToken(day: number): string {
  return String(day).padStart(2, "0");
}

function slugWithoutDay(slug: string): string {
  return slug.replace(/^day-\d{2}-/, "");
}

function titleFromSlug(slug: string): string {
  if (slug === "day-12-cozy-seek-and-find-adventure") return "Cozy Seek-and-Find Adventure";
  const lowerCaseWords = new Set(["and", "with", "for", "of", "the", "a", "an"]);
  return slugWithoutDay(slug)
    .split("-")
    .filter(Boolean)
    .map((word, index) => index > 0 && lowerCaseWords.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}

function cleanText(value: string): string {
  return value
    .replaceAll("\u00e2\u20ac\u2122", "’")
    .replaceAll("\u00e2\u20ac\u0153", "\"")
    .replaceAll("\u00e2\u20ac\u009d", "\"")
    .replaceAll("\u00e2\u20ac\u00a6", "…")
    .replaceAll("\u00e2\u20ac\u201d", "—")
    .replaceAll("\u00e2\u20ac\u201c", "–");
}

function assertNoMojibake(text: string, context: string): void {
  if (/[\u00e2\u00c3]/.test(text)) {
    throw new Error(`${context} contains mojibake; fix UTF-8 text before writing or submitting.`);
  }
}

function repoRelativeFromAbsolute(root: string, path: string): string {
  return normalizePath(toRepoRelative(root, path));
}

function downloadsReferencePath(record: ImagePreflightRecord, downloadsDir = "C:/Users/outdo/Downloads"): string {
  return normalizePath(join(downloadsDir, `day-${dayToken(record.day)}-reference-${slugWithoutDay(record.slug)}.png`));
}

function requiredReferenceImages(dayReferencePath: string): string[] {
  return [normalizePath(dayReferencePath), ...emberReferenceImages];
}

function absoluteReferencePath(root: string, referencePath: string): string {
  return isAbsolute(referencePath) ? referencePath : join(root, referencePath);
}

function validateReferenceImages(
  job: Pick<VideoSourceBrokeModeJob, "day" | "reference_image_downloads_path" | "ember_reference_images" | "reference_images">,
  root: string
): void {
  if (!existsSync(absoluteReferencePath(root, job.reference_image_downloads_path))) {
    throw new Error(`Downloads reference image does not exist for Day ${job.day}: ${job.reference_image_downloads_path}`);
  }

  const missingEmberReferences = job.ember_reference_images.filter((referencePath) => !existsSync(absoluteReferencePath(root, referencePath)));
  if (missingEmberReferences.length > 0) {
    throw new Error(`Required Ember reference image missing for Day ${job.day}: ${missingEmberReferences.join(", ")}`);
  }

  if (job.reference_images.length < requiredReferenceImageCount) {
    throw new Error(`Day ${job.day} requires ${requiredReferenceImageCount} reference images before Broke Mode can run; found ${job.reference_images.length}.`);
  }
}

function promptPathFor(batchDir: string, slug: string): string {
  return `${batchDir}/${promptsFolderName}/${slug}-broke-video-source-prompt.md`;
}

function assetNameFor(record: ImagePreflightRecord): string {
  return `${record.slug}-video-source-no-text-v01`;
}

function expectedOutputFilename(record: ImagePreflightRecord): string {
  return `${assetNameFor(record)}-{TIMESTAMP}.png`;
}

async function listMatchingFiles(root: string, folder: string, slug: string): Promise<string[]> {
  const absolute = join(root, folder);
  if (!existsSync(absolute)) return [];
  const names = await readdir(absolute);
  return names
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .filter((name) => name.includes(slug) && /video-source/i.test(name))
    .map((name) => normalizePath(`${folder}/${name}`))
    .sort();
}

async function listMatchingFailedPaths(root: string, slug: string): Promise<string[]> {
  const folder = "content/outputs/images/failed";
  const absolute = join(root, folder);
  if (!existsSync(absolute)) return [];
  const names = await readdir(absolute);
  return names
    .filter((name) => name.includes(slug) && /video-source/i.test(name))
    .map((name) => normalizePath(`${folder}/${name}`))
    .sort();
}

async function readManifest(batchDir: string, root: string): Promise<ShortVideoBatchPlan> {
  const manifestPath = join(root, batchDir, "batch-manifest.json");
  return JSON.parse(await readFile(manifestPath, "utf8")) as ShortVideoBatchPlan;
}

async function readExistingState(batchDir: string, root: string): Promise<VideoSourceBrokeModeState | null> {
  const statePath = join(root, batchDir, stateFileName);
  if (!existsSync(statePath)) return null;
  return JSON.parse(await readFile(statePath, "utf8")) as VideoSourceBrokeModeState;
}

function isStaleRunning(previous: VideoSourceBrokeModeStateEntry | undefined): boolean {
  if (previous?.status !== "broke-mode-running") return false;
  const updatedAt = Date.parse(previous.updated_at);
  if (!Number.isFinite(updatedAt)) return true;
  return Date.now() - updatedAt > 10 * 60 * 1000;
}

function stateStatusFromFiles(previous: VideoSourceBrokeModeStateEntry | undefined, pending: string[], approved: string[], failed: string[]): VideoSourceBrokeModeStatus {
  if (approved.length > 0) return "user-approved-video-source";
  if (pending.length > 0) return "generated-pending-review";
  if (failed.length > 0) return "failed-needs-regeneration";
  if (isStaleRunning(previous)) return "failed-needs-regeneration";
  if (previous && previous.status !== "generated-pending-review" && previous.status !== "user-approved-video-source") return previous.status;
  return "not-started";
}

function notesForCurrentStatus(notes: string[], status: VideoSourceBrokeModeStatus): string[] {
  if (!["generated-pending-review", "user-approved-video-source"].includes(status)) return notes;
  return notes.filter((note) => ![
    /^Broke Mode run failed before a pending-review video-source image was created/i,
    /^Broke Mode run ended without a pending-review image/i,
    /^Owner disapproved video-source image/i,
    ...(status === "user-approved-video-source"
      ? [/^Generated video-source image is pending owner review/i]
      : [])
  ].some((pattern) => pattern.test(note)));
}

export async function buildVideoSourceBrokeModeState(
  plan: ShortVideoBatchPlan,
  options: Pick<VideoSourceBrokeModeOptions, "downloadsDir" | "rootDir"> = {}
): Promise<VideoSourceBrokeModeState> {
  const root = repoRoot(options.rootDir);
  const existing = await readExistingState(plan.batch_dir, root);
  const previousBySlug = new Map((existing?.days ?? []).map((entry) => [entry.slug, entry]));
  const timestamp = nowIso();
  const days: VideoSourceBrokeModeStateEntry[] = [];

  for (const record of plan.records) {
    const previous = previousBySlug.get(record.slug);
    const pending = await listMatchingFiles(root, pendingReviewFolder, record.slug);
    const approved = await listMatchingFiles(root, approvedFolder, record.slug);
    const failed = await listMatchingFailedPaths(root, record.slug);
    const dayReferencePath = downloadsReferencePath(record, options.downloadsDir);
    const status = stateStatusFromFiles(previous, pending, approved, failed);
    days.push({
      day: record.day,
      slug: record.slug,
      idempotency_key: record.idempotency_key,
      status,
      reference_image_downloads_path: dayReferencePath,
      ember_reference_images: emberReferenceImages,
      required_reference_images: requiredReferenceImages(dayReferencePath),
      reference_image_count: requiredReferenceImageCount,
      source_reference_image: record.current_media_asset_path,
      prompt_path: promptPathFor(plan.batch_dir, record.slug),
      review_checklist_path: record.output_files.review_checklist,
      pending_review_images: pending,
      approved_video_source_images: approved,
      failed_paths: failed.length > 0 ? failed : previous?.failed_paths ?? [],
      notes: notesForCurrentStatus(previous?.notes ?? [], status),
      updated_at: timestamp
    });
  }

  return {
    batch_id: plan.batch_id,
    batch_dir: plan.batch_dir,
    state_file: `${plan.batch_dir}/${stateFileName}`,
    pending_review_folder: pendingReviewFolder,
    approved_folder: approvedFolder,
    allowed_statuses: allowedStatuses,
    days,
    last_selection: existing?.last_selection ?? [],
    updated_at: timestamp
  };
}

function redoMatches(record: ImagePreflightRecord, redo: string | boolean | undefined): boolean {
  if (!redo) return false;
  if (redo === true) return true;
  const normalized = slugify(String(redo));
  return normalized === record.slug || normalized === `day-${dayToken(record.day)}` || normalized === String(record.day);
}

function recoverMatches(record: ImagePreflightRecord, recover: string | boolean | undefined): boolean {
  if (!recover) return false;
  if (recover === true) return true;
  const normalized = slugify(String(recover));
  return normalized === record.slug || normalized === `day-${dayToken(record.day)}` || normalized === String(record.day);
}

function dayMatches(record: ImagePreflightRecord, day: number | undefined): boolean {
  return day === undefined || record.day === day;
}

function maxSelection(value: number | undefined): number {
  const max = value ?? 1;
  if (!Number.isInteger(max) || max < 1) throw new Error("--max must be an integer from 1 to 4.");
  if (max > 4) throw new Error("--max is capped at 4 for supervised video-source Broke Mode.");
  return max;
}

export function selectVideoSourceJobs(
  plan: ShortVideoBatchPlan,
  state: VideoSourceBrokeModeState,
  options: VideoSourceSelectionOptions = {}
): { records: ImagePreflightRecord[]; skipped: Array<{ day: number; slug: string; reason: string }> } {
  const max = maxSelection(options.max);
  const selected: ImagePreflightRecord[] = [];
  const skipped: Array<{ day: number; slug: string; reason: string }> = [];
  const stateBySlug = new Map(state.days.map((entry) => [entry.slug, entry]));
  const redoValue = options.redo;
  const recoverValue = options.recover;

  for (const record of plan.records) {
    if (!dayMatches(record, options.day) && !redoMatches(record, redoValue) && !recoverMatches(record, recoverValue)) continue;
    const stateEntry = stateBySlug.get(record.slug);
    const redo = redoMatches(record, redoValue);
    const recover = recoverMatches(record, recoverValue);
    if (!stateEntry) {
      skipped.push({ day: record.day, slug: record.slug, reason: "missing tracking state" });
      continue;
    }
    if (!redo && !recover && stateEntry.approved_video_source_images.length > 0) {
      skipped.push({ day: record.day, slug: record.slug, reason: "approved video-source image already exists" });
      continue;
    }
    if (!redo && !recover && stateEntry.pending_review_images.length > 0) {
      skipped.push({ day: record.day, slug: record.slug, reason: "pending-review video-source image already exists" });
      continue;
    }
    if (!redo && !recover && ["generated-pending-review", "user-approved-video-source", "video-export-needed", "video-export-pending-review", "video-approved"].includes(stateEntry.status)) {
      skipped.push({ day: record.day, slug: record.slug, reason: `tracking status is ${stateEntry.status}` });
      continue;
    }
    selected.push(record);
    if (selected.length >= max) break;
  }

  return { records: selected, skipped };
}

function daySpecificPromptRule(record: ImagePreflightRecord): string {
  if (record.slug === "day-04-baby-flame-lantern") {
    return "Day 4 object rule: include exactly one Baby Flame Lantern, and place that single Baby Flame Lantern on a shelf. Do not put a Baby Flame Lantern on the table, floor, foreground, wall, in Ember's hands, or anywhere else. Do not create a second baby-flame-lantern-shaped object.";
  }
  return `Day ${record.day} object rule: keep the ${titleFromSlug(record.slug)} concept visible as a small seek-and-find treasure or scene idea, but do not add labels, words, arrows, circles, boxes, answer marks, or sign-like callouts.`;
}

function daySpecificSelfCheck(record: ImagePreflightRecord): string {
  if (record.slug === "day-04-baby-flame-lantern") return "- exactly one Baby Flame Lantern on a shelf";
  return `- the ${titleFromSlug(record.slug)} concept is present without any label, words, arrow, circle, box, or answer mark`;
}

function renderBrokeModePrompt(record: ImagePreflightRecord): string {
  const visibleText = record.visible_text_found.length > 0
    ? record.visible_text_found.map((text) => `"${cleanText(text)}"`).join(", ")
    : "any readable text";
  const concept = `Campaign concept: ${titleFromSlug(record.slug)} in a cozy, child-friendly seek-and-find world with lanterns, tiny treasures, and one curious baby dragon.`;
  const daySpecificObjectRule = daySpecificPromptRule(record);
  const selfCheck = daySpecificSelfCheck(record);

  const prompt = `${videoSourceReferenceUploadGuard}

Create one clean vertical 9:16 video-source image for a motion-only Ember short video.

Use the uploaded day-specific promo image as the composition and mood reference only. It is static promo art, not the final image-to-video source.

Use the uploaded Ember-001, Ember-002, and Ember-003 images as character reference images. Ember accuracy is the highest priority in this generation. Study those three references closely and match Ember's face shape, baby-dragon proportions, horn shape, eye size, scarf color, satchel shape, body color, and sweet friendly expression. If the scene becomes too busy, simplify the market details rather than changing Ember.

Remove all readable text from the reference. The reference includes: ${visibleText}. Remove the text completely.

Create a clean no-text video-source image suitable for later gentle animation. Preserve Ember, the warm Sparkleflame Festival mood, the cozy lantern-lit colors, and the campaign concept below.

${concept}

${daySpecificObjectRule}

Do not render, imply, or invent any text, words, letters, captions, title graphics, signs, labels, UI, logos, or marketing copy.

Avoid paper, tag, scrap, note, sign-like rectangle, label-like shape, or decorative stroke details that look like letters, handwriting, words, numbers, captions, or pseudo-text.

Keep Ember on-model as a tiny adorable reddish-orange baby dragon with soft pumpkin-orange and coral shading, shiny golden spiral-comma horns, large glossy blue-teal eyes, cream belly, plain bright blue-teal scarf, and tiny plain brown crossbody satchel with dull-gold button clasps.

Do not turn Ember into a fox, cat, generic dragon, wizard, plush toy, mascot, chibi monster, or different character. Do not make Ember's head too large, horns too oversized, eyes the wrong color, scarf the wrong color, satchel missing, satchel too ornate, body too smooth-plastic, or expression too goofy.

No new characters. No new story elements. No fake cover, fake listing preview, fake interior page, or sales graphic.

Make the image clean, stable, cinematic, and easy to animate with gentle push-in, light parallax, cozy lantern glow, subtle sparkles, breathing, blink, or a tiny head tilt. Keep clear foreground, midground, and background zones.

Self-check before finishing:
- vertical 9:16 framing
- no readable text anywhere
- no gibberish lettering
- no paper/tag/scrap marks that resemble writing
- no watermarks or fake UI
- Ember on-model
- Ember clearly matches the three uploaded Ember reference images
- blue-teal scarf present
- brown satchel present
- golden spiral-comma horns match the references
${selfCheck}
- no new characters
- no new story elements
- stable foreground/midground/background
- suitable for gentle push-in/parallax animation

Avoid:
No readable text, title graphics, captions, subtitles, labels, signs, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No paper scraps, tags, labels, sign-like rectangles, or decorative strokes with marks that resemble writing, letters, numbers, or pseudo-lettering.

No scary expression, angry face, smug face, photorealism, flat cartoon style, distorted scarf, missing satchel, extra limbs, muddy glitter fog, heavy sparkle haze, or clutter that makes the scene hard to read.
`;
  assertNoMojibake(prompt, `Broke Mode prompt for Day ${record.day}`);
  return prompt;
}

function renderWorkflowDoc(batchDir: string): string {
  return `# Broke Mode Video-Source Workflow

Batch: \`book-01-short-video-batch-2026-05-08\`

This file makes the existing Broke Mode ChatGPT image-generation process an official execution step for the Book 1 short-video batch.

## Source Of Truth

- Manifest: \`${batchDir}/batch-manifest.json\`
- Guide: \`${batchDir}/video-source-image-generation-guide.md\`
- Tracking: \`${batchDir}/${stateFileName}\`
- Downloads references: \`C:/Users/outdo/Downloads/\`
- Ember references:
  - \`Ember's Adventures/EtD Images/Ember-001.png\`
  - \`Ember's Adventures/EtD Images/Ember-002.png\`
  - \`Ember's Adventures/EtD Images/Ember-003.png\`

## Commands

Next missing image:

\`\`\`powershell
npm run social:broke-video-source
\`\`\`

List the next missing image without opening ChatGPT:

\`\`\`powershell
npm run social:broke-video-source -- --list
\`\`\`

Prepare/run up to 4 images:

\`\`\`powershell
npm run social:broke-video-source -- --max 4
\`\`\`

Specific day:

\`\`\`powershell
npm run social:broke-video-source -- --day 03
\`\`\`

Redo a failed day:

\`\`\`powershell
npm run social:broke-video-source -- --redo day-03
\`\`\`

If npm/PowerShell forwarding strips a flag, use the direct tsx form:

\`\`\`powershell
npx tsx automation/social/broke-video-source.ts --redo day-03
\`\`\`

Before any one-day or batch run, verify selection without opening/submitting ChatGPT:

\`\`\`powershell
npm run social:broke-video-source -- --list --redo day-03
\`\`\`

Recover a completed-after-timeout image from the current ChatGPT chat without submitting a new prompt:

\`\`\`powershell
npm run social:broke-video-source -- --recover day-03
\`\`\`

Existing-browser Broke Mode uses the already logged-in ChatGPT project tab:

\`\`\`powershell
npm run social:broke-video-source -- --browser-mode existing --cdp-url http://127.0.0.1:9222
\`\`\`

## Start Over After A Stuck Browser Upload

The runner preflights the ChatGPT composer before each one-day or batch job: it dismisses the duplicate-file modal, removes queued attachments, clears stale prompt text, and verifies the expected 4 reference attachments before submitting. If a batch is interrupted outside the runner or the browser is left in a mixed manual state, do not click Send and do not continue the batch. Treat the browser state as contaminated if the project composer has mixed day references, more than 4 attachments, an empty prompt with queued images, or a duplicate-file modal blocking the prompt box.

Clean restart procedure for one day:

1. Stop any still-running \`social:broke-video-source\` / \`broke-video-source.ts\` node processes.
2. Prefer rerunning through this workflow so the automated preflight clears the composer. If working manually, dismiss any duplicate-file modal and remove every queued attachment, or reload the project tab until the composer has an empty prompt and zero attachments.
3. Verify the exact one-day selection without opening/submitting ChatGPT:

\`\`\`powershell
npm run social:broke-video-source -- --list --redo day-08
\`\`\`

4. Rerun only that day:

\`\`\`powershell
npm run social:broke-video-source -- --redo day-08
\`\`\`

Do not use \`--max\` again until the contaminated browser state is cleared and the one-day redo succeeds or fails cleanly. Recovery mode is only for a generated image already visible in the current chat; it is not the right tool for a pre-submit duplicate-file modal or mixed-attachment composer.

Interrupted \`broke-mode-running\` entries older than 10 minutes are treated as failed/regeneration-needed on the next state rebuild unless a pending-review or approved source image exists on disk.

## Output Rules

Each generation uploads exactly 4 reference images before the prompt is submitted:

1. The day-specific Downloads promo reference for composition and mood.
2. \`Ember-001.png\` as a character reference.
3. \`Ember-002.png\` as a character reference.
4. \`Ember-003.png\` as a character reference.

The prompt tells ChatGPT that the day-specific image is reference-only static promo art and that the three Ember images control Ember's appearance, proportions, scarf, satchel, horns, eyes, and colors. If any of the 4 required references are missing, the runner fails before opening/submitting Broke Mode.

Video-source prompts do not include social captions, CTA text, Amazon availability copy, or publish copy. They keep only safe visual concept context and a hard no-text instruction.

After successful prompt submission, Broke Mode asks ChatGPT to rename the chat with this format:

\`Book 1 Day 03 Video Source Image - Search with Ember\`

The watcher polls the ChatGPT UI for up to 3 minutes by default, every 15 seconds. It looks for generated image previews, visible download controls, image action controls, image-backed assistant responses, and fetchable image URLs. On timeout it performs one final recovery scan of the current chat before reporting \`generated-image-not-detected\`. Use \`--timeout-minutes 6\` only when a longer active watch is intentionally needed.

After submission, the workflow captures the new ChatGPT conversation ID, opens the project list in a second browser page, renames the exact row whose link contains that conversation ID through the row options menu, and verifies that the visible row starts with the expected title. API-only title agreement is not trusted as success. If the visible project-row title cannot be verified, the workflow records a warning/TODO and continues watching the already-submitted generation. Chat rename failure alone must not fail image generation.

Generated images save to:

\`content/outputs/images/pending-review/video-source/book-01/\`

Approved video-source images later move to:

\`content/outputs/images/approved/video-source/book-01/\`

Approved video-source images are still not final videos. The Short Video queue task remains blocked until a reviewed approved video export exists later.

## Approval Rules

- Broke Mode may generate pending-review images only.
- Passing local QA does not approve the asset.
- Nothing moves to approved unless the user explicitly approves it.
- \`queue.json\` is never updated by this workflow.
- This workflow never generates videos and never uploads/posts to social platforms.
- This workflow uses explicit Downloads reference images and existing Ember character reference images. It must not modify \`Ember's Adventures/\`.
`;
}

async function writePromptFile(record: ImagePreflightRecord, promptPath: string, root: string, force = true): Promise<string> {
  return writeTextFileSafe(promptPath, renderBrokeModePrompt(record), { rootDir: root, force });
}

async function writeState(state: VideoSourceBrokeModeState, root: string): Promise<string> {
  const absolute = join(root, state.state_file);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return repoRelativeFromAbsolute(root, absolute);
}

async function writeWorkflowDoc(batchDir: string, root: string): Promise<string> {
  const relativePath = `${batchDir}/${docsFileName}`;
  const absolute = join(root, relativePath);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, renderWorkflowDoc(batchDir), "utf8");
  return repoRelativeFromAbsolute(root, absolute);
}

function addNote(entry: VideoSourceBrokeModeStateEntry, note: string): void {
  if (!entry.notes.includes(note)) entry.notes = [...entry.notes, note];
}

async function finalizeJobStateAfterRun(entry: VideoSourceBrokeModeStateEntry, root: string, reasonIfNoOutput: string): Promise<void> {
  const pending = await listMatchingFiles(root, pendingReviewFolder, entry.slug);
  const approved = await listMatchingFiles(root, approvedFolder, entry.slug);
  const failed = await listMatchingFailedPaths(root, entry.slug);
  entry.pending_review_images = pending;
  entry.approved_video_source_images = approved;
  entry.failed_paths = failed.length > 0 ? failed : entry.failed_paths;
  if (approved.length > 0) entry.status = "user-approved-video-source";
  else if (pending.length > 0) {
    entry.status = "generated-pending-review";
    addNote(entry, "Generated video-source image is pending owner review; not queue-ready until approved MP4 exists.");
  }
  else {
    entry.status = "failed-needs-regeneration";
    addNote(entry, reasonIfNoOutput);
  }
  entry.notes = notesForCurrentStatus(entry.notes, entry.status);
  entry.updated_at = nowIso();
}

function makeJob(record: ImagePreflightRecord, entry: VideoSourceBrokeModeStateEntry): VideoSourceBrokeModeJob {
  return {
    day: record.day,
    slug: record.slug,
    idempotency_key: record.idempotency_key,
    prompt_path: entry.prompt_path,
    reference_image_downloads_path: entry.reference_image_downloads_path,
    ember_reference_images: entry.ember_reference_images,
    reference_images: entry.required_reference_images,
    reference_image_count: entry.required_reference_images.length,
    expected_output_filename: expectedOutputFilename(record),
    pending_review_folder: pendingReviewFolder,
    approved_folder: approvedFolder,
    review_checklist_path: entry.review_checklist_path,
    asset_name: assetNameFor(record),
    chat_title: `Book 1 Day ${dayToken(record.day)} Video Source Image - ${titleFromSlug(record.slug)}`
  };
}

function envOption(name: string): string | undefined {
  const normalized = name.replaceAll("-", "_");
  return process.env[`npm_config_${normalized}`]
    ?? (normalized === "max" ? process.env.npm_config_maxsockets : undefined);
}

function parseOption(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  if (index >= 0) {
    const value = args[index + 1];
    return value && !value.startsWith("--") ? value : envOption(name);
  }
  return envOption(name);
}

function parseFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`) || /^(true|1|yes)$/i.test(parseOption(args, name) ?? "");
}

function positionalArgs(args: string[]): string[] {
  const consumed = new Set<number>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--") || arg.includes("=")) continue;
    const value = args[index + 1];
    if (value && !value.startsWith("--")) consumed.add(index + 1);
  }
  return args.filter((arg, index) => !arg.startsWith("--") && !consumed.has(index));
}

function isTruthyOptionValue(value: string | undefined): boolean {
  return /^(true|1|yes)$/i.test(value ?? "");
}

function parseDay(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value.match(/^day-?(\d{1,2})$/i)?.[1] ?? value;
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed)) throw new Error(`Invalid day value: ${value}`);
  return parsed;
}

function parseRedo(args: string[], positional = positionalArgs(args)): string | boolean | undefined {
  const value = parseOption(args, "redo");
  if (value && !isTruthyOptionValue(value)) return value;
  if (isTruthyOptionValue(value)) return positional[0] ?? true;
  return args.includes("--redo") ? true : undefined;
}

function parseRecover(args: string[], positional = positionalArgs(args)): string | boolean | undefined {
  const value = parseOption(args, "recover");
  if (value && !isTruthyOptionValue(value)) return value;
  if (isTruthyOptionValue(value)) return positional[0] ?? true;
  return args.includes("--recover") ? true : undefined;
}

export function parseVideoSourceBrokeModeArgs(args: string[]): VideoSourceBrokeModeOptions {
  const positional = positionalArgs(args);
  const recover = parseRecover(args, positional);
  const redo = parseRedo(args, positional);
  const dayOption = parseOption(args, "day");
  const day = recover || redo
    ? undefined
    : parseDay(dayOption && !isTruthyOptionValue(dayOption) ? dayOption : positional[0]);
  return {
    batchDir: parseOption(args, "batch-dir"),
    downloadsDir: parseOption(args, "downloads-dir"),
    max: Number.parseInt(parseOption(args, "max") ?? "1", 10),
    day,
    redo,
    recover,
    list: parseFlag(args, "list"),
    dryRun: parseFlag(args, "dry-run"),
    force: parseFlag(args, "force"),
    browserMode: (parseOption(args, "browser-mode") as BrowserMode | undefined) ?? undefined,
    cdpUrl: parseOption(args, "cdp-url"),
    autoSubmit: parseFlag(args, "auto-submit"),
    timeoutMinutes: parseOption(args, "timeout-minutes") ? Number.parseInt(parseOption(args, "timeout-minutes")!, 10) : undefined
  };
}

export async function runVideoSourceBrokeMode(options: VideoSourceBrokeModeOptions = {}): Promise<VideoSourceBrokeModeResult> {
  const root = repoRoot(options.rootDir);
  const batchDir = options.batchDir ?? defaultBatchDir;
  const plan = await readManifest(batchDir, root);
  let state = await buildVideoSourceBrokeModeState(plan, { downloadsDir: options.downloadsDir, rootDir: root });
  const selection = selectVideoSourceJobs(plan, state, options);
  const stateBySlug = new Map(state.days.map((entry) => [entry.slug, entry]));
  const jobs = selection.records.map((record) => makeJob(record, stateBySlug.get(record.slug)!));
  const docsFile = await writeWorkflowDoc(batchDir, root);

  state = {
    ...state,
    last_selection: jobs.map((job) => ({
      day: job.day,
      slug: job.slug,
      status: stateBySlug.get(job.slug)?.status ?? "not-started",
      reason: options.list ? "listed only" : options.recover ? "selected for recovery" : options.dryRun ? "dry run selected" : "selected for Broke Mode"
    })),
    updated_at: nowIso()
  };

  for (const job of jobs) {
    validateReferenceImages(job, root);
  }

  for (const record of selection.records) {
    const entry = stateBySlug.get(record.slug)!;
    await writePromptFile(record, entry.prompt_path, root, true);
  }

  if (!options.list) {
    for (const job of jobs) {
      const entry = state.days.find((candidate) => candidate.slug === job.slug)!;
      if (!options.dryRun) {
        entry.status = "broke-mode-running";
        entry.updated_at = nowIso();
        await writeState(state, root);
      }

      const brokeModeDefaults = defaultBrokeModeOptions(job.prompt_path);
      const { runBrokeMode } = await import("../playwright/scripts/chatgpt-broke-mode-generate.js");
      try {
        await runBrokeMode({
          ...brokeModeDefaults,
          prompt: job.prompt_path,
          rawPrompt: true,
          referenceImages: job.reference_images,
          referenceImageRoot: ".",
          outputFolder: pendingReviewFolder,
          referenceUploadGuard: videoSourceReferenceUploadGuard,
          assetName: job.asset_name,
          chatTitle: job.chat_title,
          browserMode: options.browserMode ?? brokeModeDefaults.browserMode,
          cdpUrl: options.cdpUrl ?? brokeModeDefaults.cdpUrl,
          generationTimeoutMs: options.timeoutMinutes ? options.timeoutMinutes * 60000 : brokeModeDefaults.generationTimeoutMs,
          pollIntervalMs: brokeModeDefaults.pollIntervalMs,
          recoverOnly: Boolean(options.recover),
          dryRun: options.dryRun ?? false,
          autoSubmit: options.autoSubmit ?? brokeModeDefaults.autoSubmit,
          force: options.force ?? false
        });
        await finalizeJobStateAfterRun(
          entry,
          root,
          "Broke Mode run ended without a pending-review image, approved source image, or failed archive."
        );
        await writeState(state, root);
      } catch (error) {
        await finalizeJobStateAfterRun(
          entry,
          root,
          `Broke Mode run failed before a pending-review video-source image was created: ${error instanceof Error ? error.message : String(error)}`
        );
        await writeState(state, root);
        throw error;
      }

      if (process.exitCode === 1 && entry.status === "broke-mode-running") {
        entry.status = "failed-needs-regeneration";
        entry.failed_paths = entry.failed_paths.length > 0
          ? entry.failed_paths
          : [`content/outputs/images/failed/${job.asset_name}`];
        addNote(entry, "Broke Mode run failed before a pending-review video-source image was created.");
        entry.updated_at = nowIso();
        await writeState(state, root);
      }
    }

    state = await buildVideoSourceBrokeModeState(plan, { downloadsDir: options.downloadsDir, rootDir: root });
  }

  const stateFile = await writeState(state, root);
  return {
    ok: true,
    batch_dir: batchDir,
    state_file: stateFile,
    docs_file: docsFile,
    selected_days: jobs.map((job) => job.day),
    jobs,
    skipped: selection.skipped,
    dry_run: options.dryRun ?? false,
    list: options.list ?? false,
    queue_json_touched: false
  };
}

async function main(): Promise<void> {
  const result = await runVideoSourceBrokeMode(parseVideoSourceBrokeModeArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
  process.exit(process.exitCode ?? 0);
}
