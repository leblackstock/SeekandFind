import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { repoRoot, toRepoRelative } from "../../src/config.js";
import { writeTextFileSafe } from "../../src/core/file-writer.js";
import { slugify } from "../../src/core/naming.js";
import { appendSessionLog, updateProductionStatus } from "../../src/core/progress-tracker.js";
import { GenerateResult } from "../../src/types.js";

interface StartEndFrameOptions {
  rootDir?: string;
  batchDir: string;
  approvedDir: string;
  outputDir: string;
  fromDay: number;
  toDay: number;
  day?: number;
  dryRun: boolean;
  force: boolean;
}

interface BatchRecord {
  day: number;
  slug: string;
  idempotency_key?: string;
  caption?: string;
}

interface PreparedFrameRecord {
  day: number;
  slug: string;
  idempotency_key: string;
  caption: string;
  start_frame_mode: "approved-still" | "create-both";
  source_image: string | null;
  start_frame: string;
  expected_end_frame: string;
  output_files: {
    manifest: string;
    start_prompt: string;
    end_prompt: string;
    keyframe_video_prompt: string;
    review_checklist: string;
  };
  owner_review?: OwnerReviewRecord;
}

type OwnerReviewRecord =
  | {
      status: "approved";
      motion_object: string;
      approved_end_frame: string;
    }
  | {
      status: "regenerate";
      reason: string;
    };

interface StartEndFramePlan {
  batchDir: string;
  outputDir: string;
  day_range: { from: number; to: number };
  records: PreparedFrameRecord[];
  missing: Array<{ day: number; slug: string; reason: string }>;
  output_files: {
    manifest: string;
    summary: string;
    workflow: string;
  };
}

interface StartEndFrameResult {
  ok: boolean;
  dryRun: boolean;
  preparedCount: number;
  missingCount: number;
  files: string[];
  warnings: string[];
  plan: StartEndFramePlan;
  sessionLog?: string;
  productionStatus?: string;
}

const defaultBatchDir = "content/outputs/videos/batches/book-01-short-video-batch-2026-05-08";
const defaultApprovedDir = "content/outputs/images/approved/video-source/book-01";
const defaultOutputDir = "content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/start-end-frames";

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

function option(args: string[], name: string): string | undefined {
  const envValue = process.env[`npm_config_${name.replaceAll("-", "_")}`];
  const exactIndex = args.indexOf(`--${name}`);
  if (exactIndex >= 0) {
    const value = args[exactIndex + 1];
    return value && !value.startsWith("--") ? value : undefined;
  }
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  return envValue && !/^(true|1|yes)$/i.test(envValue) ? envValue : undefined;
}

function flag(args: string[], name: string): boolean {
  const envValue = process.env[`npm_config_${name.replaceAll("-", "_")}`];
  return args.includes(`--${name}`) || args.includes(`--${name}=true`) || /^(true|1|yes)$/i.test(envValue ?? "");
}

function envForwardedValue(name: string): boolean {
  return /^(true|1|yes)$/i.test(process.env[`npm_config_${name.replaceAll("-", "_")}`] ?? "");
}

function parseDay(value: string | undefined, name: string): number | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().replace(/^day-?/, "");
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) throw new Error(`--${name} must be a campaign day number.`);
  return parsed;
}

function cleanText(value: string): string {
  return value
    .replaceAll("\u00e2\u20ac\u2122", "'")
    .replaceAll("\u00e2\u20ac\u0153", "\"")
    .replaceAll("\u00e2\u20ac\u009d", "\"")
    .replaceAll("\u00e2\u20ac\u00a6", "...")
    .replaceAll("\u00e2\u20ac\u201d", "-")
    .replaceAll("\u00e2\u20ac\u201c", "-");
}

export function parseStartEndFrameArgs(args = process.argv.slice(2)): StartEndFrameOptions {
  args = args.filter((arg) => arg !== "--");
  const positionals = args.filter((arg) => !arg.startsWith("--"));
  const rawDay = option(args, "day") ?? (envForwardedValue("day") ? positionals[0] : undefined);
  const rawFromDay = option(args, "from-day") ?? (envForwardedValue("from-day") ? positionals[0] : undefined);
  const rawToDay = option(args, "to-day") ?? (envForwardedValue("to-day") ? positionals[1] : undefined);
  const rawPositionalDay = !rawDay && !rawFromDay && !rawToDay && positionals.length === 1 ? positionals[0] : undefined;
  const day = parseDay(rawDay ?? rawPositionalDay, "day");
  const fallbackFrom = !day && !rawDay && !rawFromDay && !rawToDay && positionals[0] ? positionals[0] : undefined;
  const fallbackTo = !day && !rawDay && !rawFromDay && !rawToDay && positionals[1] ? positionals[1] : undefined;
  const fromDay = day ?? parseDay(rawFromDay ?? fallbackFrom, "from-day") ?? 3;
  const toDay = day ?? parseDay(rawToDay ?? fallbackTo, "to-day") ?? 12;
  if (fromDay > toDay) throw new Error("--from-day cannot be greater than --to-day.");

  return {
    batchDir: option(args, "batch-dir") ?? defaultBatchDir,
    approvedDir: option(args, "approved-dir") ?? defaultApprovedDir,
    outputDir: option(args, "output-dir") ?? defaultOutputDir,
    fromDay,
    toDay,
    day,
    dryRun: flag(args, "dry-run"),
    force: flag(args, "force")
  };
}

function isPrimaryPng(name: string): boolean {
  return /\.png$/i.test(name) && !/(screenshot|project-row|rename|evidence)/i.test(name);
}

export function selectApprovedSourceImage(files: string[], slug: string): string | undefined {
  return files
    .filter((name) => name.includes(slug) && isPrimaryPng(name))
    .sort()
    .at(-1);
}

async function readBatchRecords(options: StartEndFrameOptions): Promise<Map<number, BatchRecord>> {
  const root = repoRoot(options.rootDir);
  const manifestPath = join(root, options.batchDir, "batch-manifest.json");
  const records = new Map<number, BatchRecord>();
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { records?: BatchRecord[] };
    for (const record of manifest.records ?? []) {
      if (typeof record.day === "number" && typeof record.slug === "string") records.set(record.day, record);
    }
  }
  for (let day = options.fromDay; day <= options.toDay; day += 1) {
    if (!records.has(day)) {
      records.set(day, {
        day,
        slug: daySlugOverrides[day] ?? `day-${String(day).padStart(2, "0")}-${slugify(`short video ${day}`)}`,
        caption: ""
      });
    }
  }
  return records;
}

async function listApprovedImages(options: StartEndFrameOptions): Promise<string[]> {
  const absolute = join(repoRoot(options.rootDir), options.approvedDir);
  if (!existsSync(absolute)) return [];
  return readdir(absolute);
}

async function readOwnerReviewRecords(options: StartEndFrameOptions): Promise<Map<number, OwnerReviewRecord>> {
  const root = repoRoot(options.rootDir);
  const reviewPath = join(root, options.outputDir, "start-end-frame-owner-review-2026-05-09.json");
  const records = new Map<number, OwnerReviewRecord>();
  if (!existsSync(reviewPath)) return records;

  const review = JSON.parse(await readFile(reviewPath, "utf8")) as {
    approved?: Array<{ day: number; motion_object?: string; approved_end_frame?: string }>;
    regenerate?: Array<{ day: number; reason?: string }>;
  };

  for (const item of review.regenerate ?? []) {
    if (typeof item.day === "number") records.set(item.day, {
      status: "regenerate",
      reason: item.reason ?? "Owner requested regeneration."
    });
  }

  for (const item of review.approved ?? []) {
    if (typeof item.day === "number" && item.motion_object && item.approved_end_frame) records.set(item.day, {
      status: "approved",
      motion_object: item.motion_object,
      approved_end_frame: item.approved_end_frame
    });
  }

  return records;
}

function imageConcept(record: PreparedFrameRecord): string {
  const lines = (record.caption || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^CTA:/i.test(line) && !/^Coming soon to Amazon\.?$/i.test(line));
  return lines[0] ?? `Book 1 Day ${record.day} cozy Ember seek-and-find scene.`;
}

function renderStartPrompt(record: PreparedFrameRecord): string {
  const sourceSection = record.source_image
    ? "Use the attached approved no-text video-source image as the exact visual base. No new start-frame image generation is needed unless the approved still fails visual QA or needs a deliberate repair."
    : `Create the START FRAME from this image concept: ${imageConcept(record)}`;

  return `# ${record.slug} Start Frame Prompt

## Image Reference

${sourceSection}

## Prompt

${record.source_image ? "Use this only if a start-frame repair is explicitly needed." : "Create this start frame now."} Create the START FRAME for a 5-second vertical 9:16 image-to-video clip.

${record.source_image ? "Match the approved source image exactly in character design, scene layout, lighting, colors, scale, art style, object placement, and no-text cleanliness." : "Create a clean, stable, no-text Ember scene that matches the day concept and feels ready for gentle motion."} This is the first keyframe, so it should feel like a polished still with only tiny natural readiness for motion.

Keep Ember on-model as a tiny adorable reddish-orange baby dragon with soft pumpkin-orange and coral shading, shiny golden spiral-comma horns, large glossy blue-teal eyes, cream belly, plain bright blue-teal scarf, and tiny plain brown crossbody satchel with dull-gold button clasps.

Use a calm, stable composition suitable for a gentle push-in, subtle parallax, soft lantern glow, and tiny sparkle glints.

## Negative Prompt / Avoid

No readable text, captions, subtitles, title graphics, signs, labels, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No new characters, new story elements, changed outfit, missing satchel, distorted scarf, extra limbs, photorealism, flat cartoon style, scary expression, open-mouth talking, lip sync, jaw movement, hard zoom, cluttered foreground, or muddy sparkle fog.
`;
}

function renderEndPrompt(record: PreparedFrameRecord): string {
  const references = record.source_image
    ? "Use the attached start frame as the exact visual anchor."
    : "Use the generated and approved start frame as the exact visual anchor.";

  return `# ${record.slug} End Frame Prompt

## Image Reference

${references}

## Prompt

Create the END FRAME for the same 5-second vertical 9:16 clip.

It must look like the same shot, same location, same Ember, same props, same palette, same object layout, and same soft 2.25D children's storybook style. Do not create a new scene.

Show a clear but gentle natural progression from the start frame: a 3-5 percent gentle camera push-in, slightly warmer lantern glow, very subtle sparkle glints, and required visible Ember motion such as a small head turn, small paw shift, small body lean, soft blink, or friendly posture change.

Ember must not stay frozen between frames. Anything Ember is holding, wearing, carrying, touching, or otherwise attached to him should move with Ember between the start frame and end frame, including a held lantern, scarf, satchel, tail, paws, horns, or any small carried prop. These Ember-held, Ember-worn, and Ember-attached items should visibly follow Ember's movement; they do not count as the chosen scene-object motion.

Add exactly one chosen scene-object motion in addition to Ember's motion. The chosen motion object must be separate from Ember: a nearby bell lightly tinkles, a pen or pencil rolls a tiny bit, a separate lantern sways softly, a ribbon flutters, a hanging charm wiggles, or one nearby prop shifts just enough to feel alive. Use only one chosen scene-object motion. Do not use Ember, Ember's body parts, or anything Ember is holding, wearing, carrying, touching, or attached to as the chosen motion object. Do not rearrange the scene or move the mission item in a way that changes the seek-and-find answer.

Ember stays closed-mouth and does not talk.

Keep the scene clean and animation-friendly. Preserve foreground, midground, and background depth without rearranging important props.

## Negative Prompt / Avoid

No readable text, captions, subtitles, title graphics, signs, labels, UI, fake logos, watermarks, page numbers, arrows, circles, boxes, answer marks, decorative lettering, or gibberish text.

No frozen Ember, frozen held item, frozen scarf, frozen satchel, frozen attached prop, new characters, new mission items, new props that change the search scene, changed outfit, missing satchel, distorted scarf, extra limbs, off-model face, strange final-frame eyes, long held blink, open mouth, teeth, lip sync, jaw movement, hard zoom, hard cut, scary lighting, photorealism, flat cartoon style, fake book cover, fake listing preview, or muddy sparkle fog.
`;
}

function renderKeyframeVideoPrompt(record: PreparedFrameRecord): string {
  const approvedMotionObject = record.owner_review?.status === "approved"
    ? `\nOwner-approved chosen motion object for this video: ${record.owner_review.motion_object}. Use that as the single chosen scene-object motion; do not substitute an Ember-held or Ember-attached item as the chosen object motion.\n`
    : "";

  return `# ${record.slug} Keyframe Image-To-Video Prompt

Campaign: Book 1 Prelaunch Rolling Campaign
Campaign day: Day ${record.day}
Task: \`${record.idempotency_key}\`
Video type: motion-only start/end-frame image-to-video
Length: 5 seconds
Format: vertical 9:16

## Upload Order

1. Upload start frame:
   \`${record.start_frame}\`
2. Upload approved end frame:
   \`${record.expected_end_frame}\`

## Motion Prompt

Use the start frame and end frame as exact visual anchors. Create a gentle, cozy 5-second vertical animation that moves from the start frame toward the end frame.

Motion should be small and calm but visible: slow push-in, soft lantern glow, slight 2.25D parallax, tiny sparkle glints, required natural Ember motion, and one gentle chosen scene-object motion such as a tinkling bell, rolling pen, separate swaying lantern, fluttering ribbon, or tiny charm wiggle. Ember and anything he is holding, wearing, carrying, touching, or otherwise attached to should move together between frames; his held lantern, scarf, satchel, tail, paws, horns, and carried props must not freeze while Ember moves. The chosen motion object is one additional scene object separate from Ember and must not be Ember, Ember's body parts, or anything Ember is holding/wearing/carrying/touching/attached to. Keep Ember on-model, friendly, and closed-mouth.
${approvedMotionObject}

No scene cuts. No new characters. No generated readable words. No talking or lip movement.

## Negative Prompt / Avoid

No readable text, captions, subtitles, labels, signs, logos, watermarks, fake UI, page numbers, arrows, circles, boxes, answer marks, or extra words.

Do not make Ember talk. Closed mouth only. No lip sync, no lip movement, no jaw movement, no exaggerated mouth movement, no teeth, no frozen Ember, no frozen held item, no frozen scarf, no frozen satchel, no weird final-frame eyes, no held-long blink, no off-model face, no extra limbs, no distorted scarf, and no missing satchel.

No frantic camera movement, hard cuts, scary lighting, muddy glitter fog, heavy sparkles covering the scene, photorealism, flat cartoon style, fake book cover, fake listing preview, fake interior page, or Amazon/buy/order language inside the video.
`;
}

function renderReviewChecklist(record: PreparedFrameRecord): string {
  const approvedMotionObject = record.owner_review?.status === "approved"
    ? `- [ ] Owner-approved chosen motion object is used: ${record.owner_review.motion_object}.\n`
    : "";

  return `# ${record.slug} Start/End Frame Review Checklist

Campaign: Book 1 Prelaunch Rolling Campaign
Campaign day: Day ${record.day}
Task: \`${record.idempotency_key}\`

## Start Frame

- [ ] Start frame uses the approved no-text video-source image.
- [ ] Vertical 9:16.
- [ ] No readable text, labels, signs, logos, watermarks, or fake UI.
- [ ] Ember is on-model: reddish-orange baby dragon, golden spiral horns, blue-teal eyes, cream belly, blue-teal scarf, brown satchel.
- [ ] Scene is stable and suitable for gentle animation.

## End Frame

- [ ] Same shot, same scene, same Ember, same props, same color palette.
- [ ] Clear but gentle progression from the start frame: gentle push-in, warmer glow, tiny sparkle, and visible natural Ember motion.
- [ ] Exactly one small chosen scene-object motion is included, such as a tinkling bell, rolling pen, swaying lantern, fluttering ribbon, or tiny charm wiggle.
- [ ] Chosen scene-object motion follows any owner-approved motion object recorded for this day.
${approvedMotionObject}- [ ] The chosen motion object is not held by Ember and is not attached to Ember.
- [ ] Ember is not frozen between frames.
- [ ] Anything Ember is holding, wearing, carrying, touching, or otherwise attached to moves visibly with Ember between frames, including a held lantern, scarf, satchel, tail, paws, horns, or other attached/carried items.
- [ ] Object motion does not rearrange the scene or move the mission item in a way that changes the seek-and-find answer.
- [ ] Ember stays closed-mouth and does not talk.
- [ ] No new characters, new props, rearranged layout, or off-model features.
- [ ] No readable text or pseudo-lettering.

## Video Generation

- [ ] Start frame uploaded first.
- [ ] End frame uploaded last.
- [ ] 5-second vertical 9:16 output.
- [ ] Motion is gentle and continuous.
- [ ] No cuts, no captions, no subtitles, no generated text, no logos, no watermarks.
- [ ] Finished MP4 is owner-reviewed before moving to \`content/outputs/videos/approved/\`.
`;
}

function renderSummary(plan: StartEndFramePlan, dryRun: boolean): string {
  const rows = plan.records.map((record) => `| Day ${record.day} | ${record.slug} | ${record.start_frame_mode} | ${record.source_image ? `\`${record.source_image}\`` : "None; create start frame"} | \`${record.start_frame}\` | \`${record.expected_end_frame}\` |`).join("\n");
  const missingRows = plan.missing.length
    ? plan.missing.map((item) => `| Day ${item.day} | ${item.slug} | ${item.reason} |`).join("\n")
    : "| None | None | None |";

  return `# Book 1 Start/End Frame Prep Summary

Batch source: \`${plan.batchDir}\`
Output folder: \`${plan.outputDir}\`
Day range: ${plan.day_range.from}-${plan.day_range.to}
Dry run: ${dryRun ? "yes" : "no"}

This tool prepares motion-only start/end-frame packages for video generation. When an approved text-less video-source still exists, it stages that still as the start frame. When no approved still exists, it prepares prompts to create both the start frame and end frame. It does not submit ChatGPT image generation or generate videos.

## Prepared Days

| Day | Slug | Start-frame mode | Approved source image | Start frame | Expected end frame |
| --- | --- | --- | --- | --- | --- |
${rows || "| None | None | None | None | None | None |"}

## Missing Days

| Day | Slug | Reason |
| --- | --- | --- |
${missingRows}

## Next Step

Generate or approve each end frame using the saved end-frame prompt, then use the keyframe image-to-video prompt with the staged approved-still start frame and approved end frame.
`;
}

function renderWorkflowDoc(): string {
  return `# Start/End Frame Workflow

This is a standalone prep lane for motion-only video generation from approved no-text video-source images.

Hard rule: if a generated approved text-less still exists, that still is the start frame. The tool copies/stages that still as-is; do not regenerate a start frame unless the approved still needs an explicit repair.

Fallback rule: if no generated approved text-less still exists, create both a start frame and end frame from the saved prompts. The start frame must be approved before using it as the anchor for the end frame.

## Command

\`\`\`powershell
npm run social:start-end-frames -- --day 03
npm run social:start-end-frames -- --from-day 03 --to-day 12
\`\`\`

Use \`--dry-run\` to preview, and \`--force\` to overwrite an existing prep package.

## Copy Unapproved Frames For Review

Use this whenever you need review copies of only the still-unapproved days. It creates or refreshes one folder under Downloads, copies each selected day’s start frame and pending-review end frame directly into that folder, and never moves or edits the originals.

\`\`\`powershell
npm run social:copy-unapproved-frames
\`\`\`

The copy folder is \`C:\\Users\\outdo\\Downloads\\ember-unapproved-start-end-frames\`. It also includes \`README.md\` and \`copy-manifest.json\`. Days with already-approved end frames are skipped automatically.

## Motion Object Rule

For each approved start/end-frame still, record the chosen motion object for the later video render. The chosen motion object must be one separate scene object, not Ember, not Ember's body parts, and not anything Ember is holding, wearing, carrying, touching, or otherwise attached to, such as his scarf, satchel, horns, paws, tail, or held lantern. Ember and anything he is holding, wearing, carrying, touching, or otherwise attached to should move visibly between the start frame and end frame. Ember-held, Ember-worn, Ember-carried, and Ember-attached items do not count as the chosen scene-object motion.

## Output

For each day, the tool:

- stages the approved video-source image as the start frame when one exists
- writes a start-frame prompt for reference/repair, or for creation when no approved still exists
- writes an end-frame prompt for a matched final keyframe
- writes a keyframe image-to-video prompt
- writes a review checklist

## Boundary

The tool does not submit image generation, video generation, social posting, or queue status updates. End-frame generation and video export remain separate reviewable steps.
`;
}

async function copyFileSafe(fromRelative: string, toRelative: string, options: StartEndFrameOptions): Promise<string> {
  const root = repoRoot(options.rootDir);
  const absoluteFrom = join(root, fromRelative);
  const absoluteTo = join(root, toRelative);
  if (existsSync(absoluteTo) && !options.force) {
    throw new Error(`File already exists: ${toRelative}. Re-run with --force to overwrite.`);
  }
  await mkdir(dirname(absoluteTo), { recursive: true });
  await copyFile(absoluteFrom, absoluteTo);
  return toRepoRelative(root, absoluteTo);
}

async function writeJson(relativePath: string, value: unknown, options: StartEndFrameOptions): Promise<string> {
  return writeTextFileSafe(relativePath, `${JSON.stringify(value, null, 2)}\n`, {
    rootDir: options.rootDir,
    force: options.force
  });
}

export async function buildStartEndFramePlan(options: StartEndFrameOptions): Promise<StartEndFramePlan> {
  const recordsByDay = await readBatchRecords(options);
  const approvedFiles = await listApprovedImages(options);
  const ownerReviewByDay = await readOwnerReviewRecords(options);
  const records: PreparedFrameRecord[] = [];
  const missing: StartEndFramePlan["missing"] = [];

  for (let day = options.fromDay; day <= options.toDay; day += 1) {
    const batchRecord = recordsByDay.get(day);
    if (!batchRecord) continue;
    const slug = batchRecord.slug;
    const imageName = selectApprovedSourceImage(approvedFiles, slug);
    const dayDir = `${options.outputDir}/${slug}`;
    const generatedFrameDir = `content/outputs/images/pending-review/start-end-frames/book-01/${slug}`;
    records.push({
      day,
      slug,
      idempotency_key: batchRecord.idempotency_key ?? "",
      caption: cleanText(batchRecord.caption ?? ""),
      start_frame_mode: imageName ? "approved-still" : "create-both",
      source_image: imageName ? `${options.approvedDir}/${imageName}` : null,
      start_frame: imageName ? `${dayDir}/${slug}-start-frame.png` : `${generatedFrameDir}/${slug}-start-frame-v01.png`,
      expected_end_frame: `${generatedFrameDir}/${slug}-end-frame-v01.png`,
      output_files: {
        manifest: `${dayDir}/${slug}-start-end-frame-manifest.json`,
        start_prompt: `${dayDir}/${slug}-start-frame-prompt.md`,
        end_prompt: `${dayDir}/${slug}-end-frame-prompt.md`,
        keyframe_video_prompt: `${dayDir}/${slug}-keyframe-image-to-video-prompt.md`,
        review_checklist: `${dayDir}/${slug}-start-end-frame-review-checklist.md`
      },
      owner_review: ownerReviewByDay.get(day)
    });
  }

  return {
    batchDir: options.batchDir,
    outputDir: options.outputDir,
    day_range: { from: options.fromDay, to: options.toDay },
    records,
    missing,
    output_files: {
      manifest: `${options.outputDir}/start-end-frame-manifest.json`,
      summary: `${options.outputDir}/start-end-frame-summary.md`,
      workflow: `${options.outputDir}/start-end-frame-workflow.md`
    }
  };
}

export async function prepareStartEndFrames(options: StartEndFrameOptions): Promise<StartEndFrameResult> {
  const plan = await buildStartEndFramePlan(options);
  const files: string[] = [];
  const warnings = plan.missing.map((item) => `Day ${item.day}: ${item.reason}`);

  if (!options.dryRun) {
    for (const record of plan.records) {
      if (record.source_image) {
        files.push(await copyFileSafe(record.source_image, record.start_frame, options));
      }
      files.push(await writeTextFileSafe(record.output_files.start_prompt, renderStartPrompt(record), options));
      files.push(await writeTextFileSafe(record.output_files.end_prompt, renderEndPrompt(record), options));
      files.push(await writeTextFileSafe(record.output_files.keyframe_video_prompt, renderKeyframeVideoPrompt(record), options));
      files.push(await writeTextFileSafe(record.output_files.review_checklist, renderReviewChecklist(record), options));
      files.push(await writeJson(record.output_files.manifest, record, options));
    }
    files.push(await writeJson(plan.output_files.manifest, plan, options));
    files.push(await writeTextFileSafe(plan.output_files.summary, renderSummary(plan, false), options));
    files.push(await writeTextFileSafe(plan.output_files.workflow, renderWorkflowDoc(), options));

    const sessionLog = await appendSessionLog({
      workflow: "start-end-frame-prep",
      inputs: {
        batchDir: options.batchDir,
        approvedDir: options.approvedDir,
        outputDir: options.outputDir,
        fromDay: options.fromDay,
        toDay: options.toDay,
        day: options.day
      },
      assumptions: [
        "Approved no-text video-source image is the first/start keyframe and is copied/staged as-is when it exists.",
        "When no approved still exists, the package prepares prompts to create both start and end frames.",
        "End-frame image generation and video generation remain separate reviewable steps.",
        "No social queue status, video export, platform upload, or ChatGPT submission was performed."
      ],
      outputsCreated: files,
      warnings,
      qaResult: warnings.length ? "WARN" : "PASS",
      nextManualStep: "Generate or approve end frames, then run keyframe image-to-video using the saved prompts."
    }, options.rootDir);

    const statusResult: GenerateResult = {
      ok: warnings.length === 0,
      workflow: "start-end-frame-prep",
      summary: `Prepared ${plan.records.length} start/end-frame package(s) for Book 1 short videos.`,
      files,
      warnings,
      nextStep: "Generate or approve end frames before video export."
    };
    const productionStatus = await updateProductionStatus(statusResult, options.rootDir);

    return {
      ok: warnings.length === 0,
      dryRun: false,
      preparedCount: plan.records.length,
      missingCount: plan.missing.length,
      files,
      warnings,
      plan,
      sessionLog,
      productionStatus
    };
  }

  return {
    ok: warnings.length === 0,
    dryRun: true,
    preparedCount: plan.records.length,
    missingCount: plan.missing.length,
    files: [],
    warnings,
    plan
  };
}

async function main(): Promise<void> {
  const options = parseStartEndFrameArgs();
  const result = await prepareStartEndFrames(options);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("prepare-start-end-frames.ts") || invokedPath.endsWith("prepare-start-end-frames.js")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
