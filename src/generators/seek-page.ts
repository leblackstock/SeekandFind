import { DEFAULT_AGE_RANGE, DEFAULT_BOOK_TITLE, DEFAULT_STYLE } from "../config.js";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { repoRoot } from "../config.js";
import { GenerateResult, RunOptions, SeekPageInput } from "../types.js";
import { renderTemplate } from "../core/template-renderer.js";
import { seekPageBaseName } from "../core/naming.js";
import { writeTextFileSafe } from "../core/file-writer.js";
import { runImagePromptQa } from "../core/qa-engine.js";
import { appendSessionLog, updateProductionStatus } from "../core/progress-tracker.js";

export const seekPageDefaults = {
  bookTitle: DEFAULT_BOOK_TITLE,
  ageRange: DEFAULT_AGE_RANGE,
  style: DEFAULT_STYLE,
  outputMode: "prompt+qa"
};

const seekTemplate = `# {{bookTitle}} - Page {{pageNumber}} Seek Render Prompt

Source row: Book 1 spread {{spread}}, story/list page {{storyListPage}}, seek page {{seekPage}}, {{location}} / {{missionItem}}.
Location: {{location}}
Mission item: {{missionItem}}
Paired story/list page: {{storyListPage}}
Audience: children ages {{ageRange}}
Style: {{style}}
Format: vertical KDP-style 8.5x11 full-color interior page, portrait aspect ratio 8.5:11 (17:22), with bleed, trim, and safe-area awareness.

## Final Image Prompt

Create a production-ready children's seek-and-find illustration for {{bookTitle}}, seek page {{seekPage}}, set in {{location}}.

Use Ember-001, Ember-002, and Ember-003 as visual references for Ember. Ember must match this canon: tiny adorable reddish-orange baby dragon guide, about small-cat sized, with soft pumpkin-orange and coral shading, a cream belly, tiny shiny golden spiral-comma horns, large glossy blue-teal eyes, a plain bright blue-teal scarf, and a tiny plain brown crossbody satchel with dull-gold button clasps. He has rounded plush-like baby-dragon proportions, soft storybook scale texture, bright friendly eyes, and a cheerful curious expression. He is not a fox, cat, human wizard, or generic fantasy animal.

Ember appears exactly once as a small friendly guide/helper in the foreground or midground. He should help the child enter the scene without dominating the page like cover art. Ember is visible, not hidden, and is not a target object.

Hide one {{missionItem}} fairly in the scene. The mission item appears exactly once and must be findable for children ages {{ageRange}}. Place it naturally on a believable surface or tucked edge, not randomly in a walkway. Do not include duplicate or similar lookalike mission items.

Include exactly 50 hidden objects total in the seek image: 1 exact named mission item plus 49 additional unique hidden objects. Name only the mission item. Do not list exact names for the other 49 hidden objects. Make those 49 additional hidden objects one-of-a-kind, child-nameable, readable at final print size, and clearly different in silhouette, material, scale, edge style, handle/closure/detail pattern, color grouping, and placement. Place them naturally on scene-appropriate surfaces with no duplicate designs, near-duplicate silhouettes, or simple color-swap repeats.

Build a rich but readable seek-and-find scene with 4-6 intentional search zones across foreground, midground, and background: {{searchZones}} Keep paths, doorways, bridge surfaces, and the main eye path mostly open.

Use the page's visual budget carefully: when adding searchable objects, reduce repeated decorative filler. Replace some repeated atmosphere with distinct child-nameable search objects that belong naturally in {{location}}. Theme motifs such as flowers, lanterns, crystals, jars, ribbons, or mushrooms may stay when specific examples are visually unique enough to find; limit repeated generic versions so they do not become clutter.

No readable generated text. No labels, signs, page numbers, watermarks, gibberish text, arrows, circles, boxes, outlines, halos, highlights, or answer marks. Do not imitate protected brands or famous seek-and-find trade dress.

Keep the tone warm, magical, cheerful, and child-safe for ages {{ageRange}}.

## Hidden Object Category Guidance

- Mission Item: {{missionItem}} appears once.
- Additional Hidden Objects: 49 unnamed unique objects should be present as visible candidates, but they should be generated from uniqueness traits rather than exact item names in this prompt.
- Main Finds: leave room for 10 clear objects to be selected after the approved image exists.
- Bonus Finds: leave room for 5-15 optional objects to be selected from visible approved art.

## Negative Prompt / Avoid

Avoid: off-model Ember, cover-art-sized Ember, duplicate Ember, hidden Ember, duplicate {{missionItem}}, similar lookalike mission items, readable text, fake text, labels, answer marks, circles, boxes, arrows, scary lighting, weapons focus, muddy clutter, random floor scatter, repeated generic flowers or lanterns overwhelming the search, copyrighted character imitation, and important details too close to trim or gutter.
`;

function renderSplitTestPromptLadder(input: {
  bookTitle: string;
  seekPage: number;
  location: string;
  missionItem: string;
  ageRange: string;
  style: string;
  searchZones: string;
}): string {
  const emberAppearance = [
    "tiny adorable reddish-orange baby dragon",
    "tiny shiny golden spiral-comma horns",
    "large glossy blue-teal eyes",
    "cream belly",
    "small-cat sized, not a fox, cat, human wizard, or generic fantasy animal",
    "plain bright blue-teal scarf",
    "tiny plain brown crossbody satchel with dull-gold button clasps",
    "rounded plush-like form",
    "cheerful, curious expression"
  ].map((line) => `- ${line}`).join("\n");

  const commonHeader = [
    `# ${input.bookTitle} - Page ${input.seekPage} Split Prompt Test Ladder`,
    "",
    `Location: ${input.location}`,
    `Mission item: ${input.missionItem}`,
    `Audience: children ages ${input.ageRange}`,
    `Style: ${input.style}`,
    "",
    "Paste one test at a time. Record whether ChatGPT immediately enters image generation, writes a planning response, stays blank on Thinking, reaches the detailed-image placeholder, times out, or completes.",
    "",
    "Do not treat any completed split-test image as approved canon until it passes normal art review.",
    ""
  ].join("\n");

  const tests = [
    {
      title: "Test 1 - Minimal Render",
      body: [
        "Create one image now.",
        "",
        `Create one vertical children's seek-and-find image set in ${input.location}.`,
        "",
        "Ember appearance:",
        emberAppearance,
        "",
        `Hide one ${input.missionItem} fairly in the scene. No readable text. Vertical 8.5 x 11 inch page, 17:22 aspect ratio.`
      ].join("\n")
    },
    {
      title: "Test 2 - Add Ember Reference Names",
      body: [
        "Create one image now.",
        "",
        "Use Ember-001, Ember-002, and Ember-003 as visual references for Ember.",
        "",
        `Create one vertical children's seek-and-find image set in ${input.location}.`,
        "",
        "Ember appearance:",
        emberAppearance,
        "",
        `Hide one ${input.missionItem} fairly in the scene. No readable text. Vertical 8.5 x 11 inch page, 17:22 aspect ratio.`
      ].join("\n")
    },
    {
      title: "Test 3 - Add Seek-Play Controls",
      body: [
        "Create one image now.",
        "",
        "Use Ember-001, Ember-002, and Ember-003 as visual references for Ember.",
        "",
        `Create one production-ready children's seek-and-find illustration for ${input.bookTitle}, seek page ${input.seekPage}, set in ${input.location}.`,
        "",
        "Ember appearance:",
        emberAppearance,
        "",
        "Ember appears exactly once as a small friendly guide/helper in the foreground or midground. Ember is visible, not hidden, and is not a target object.",
        "",
        `Hide one ${input.missionItem} fairly in the scene. The mission item appears exactly once and must be findable for children ages ${input.ageRange}. Do not include duplicate or similar lookalike mission items.`,
        "",
        "No readable text. Vertical 8.5 x 11 inch page, 17:22 aspect ratio."
      ].join("\n")
    },
    {
      title: "Test 4 - Add Scene Zones",
      body: [
        "Create one image now.",
        "",
        "Use Ember-001, Ember-002, and Ember-003 as visual references for Ember.",
        "",
        `Create one production-ready children's seek-and-find illustration for ${input.bookTitle}, seek page ${input.seekPage}, set in ${input.location}.`,
        "",
        "Ember appearance:",
        emberAppearance,
        "",
        "Ember appears exactly once as a small friendly guide/helper in the foreground or midground. Ember is visible, not hidden, and is not a target object.",
        "",
        `Hide one ${input.missionItem} fairly in the scene. The mission item appears exactly once and must be findable for children ages ${input.ageRange}. Do not include duplicate or similar lookalike mission items.`,
        "",
        `Use these intentional search zones: ${input.searchZones} Keep paths, doorways, bridge surfaces, and the main eye path mostly open.`,
        "",
        "No readable text. Vertical 8.5 x 11 inch page, 17:22 aspect ratio."
      ].join("\n")
    },
    {
      title: "Test 5 - Add 50-Object And Visual-Budget Rules",
      body: [
        "Create one image now.",
        "",
        "Use Ember-001, Ember-002, and Ember-003 as visual references for Ember.",
        "",
        `Create one production-ready children's seek-and-find illustration for ${input.bookTitle}, seek page ${input.seekPage}, set in ${input.location}.`,
        "",
        "Ember appearance:",
        emberAppearance,
        "",
        "Ember appears exactly once as a small friendly guide/helper in the foreground or midground. Ember is visible, not hidden, and is not a target object.",
        "",
        `Hide one ${input.missionItem} fairly in the scene. The mission item appears exactly once and must be findable for children ages ${input.ageRange}. Do not include duplicate or similar lookalike mission items.`,
        "",
        "Include exactly 50 hidden objects total: 1 exact named mission item plus 49 additional unique hidden objects. Name only the mission item. Do not list exact names for the other 49 hidden objects. Make those 49 additional hidden objects one-of-a-kind, child-nameable, varied in silhouette/material/scale/detail pattern, and readable at final print size.",
        "",
        `Use these intentional search zones: ${input.searchZones} Keep paths, doorways, bridge surfaces, and the main eye path mostly open.`,
        "",
        `Use the page's visual budget carefully: when adding searchable objects, reduce repeated decorative filler. Replace repeated atmosphere with distinct child-nameable search objects that belong naturally in ${input.location}.`,
        "",
        "No readable text. Vertical 8.5 x 11 inch page, 17:22 aspect ratio."
      ].join("\n")
    },
    {
      title: "Test 6 - Add Full Avoid And Format Block",
      body: [
        "Create one image now.",
        "",
        "Use Ember-001, Ember-002, and Ember-003 as visual references for Ember.",
        "",
        `Create one production-ready children's seek-and-find illustration for ${input.bookTitle}, seek page ${input.seekPage}, set in ${input.location}.`,
        "",
        "Ember appearance:",
        emberAppearance,
        "",
        "Ember appears exactly once as a small friendly guide/helper in the foreground or midground. Ember is visible, not hidden, and is not a target object.",
        "",
        `Hide one ${input.missionItem} fairly in the scene. The mission item appears exactly once and must be findable for children ages ${input.ageRange}. Do not include duplicate or similar lookalike mission items.`,
        "",
        "Include exactly 50 hidden objects total: 1 exact named mission item plus 49 additional unique hidden objects. Name only the mission item. Do not list exact names for the other 49 hidden objects. Make those 49 additional hidden objects one-of-a-kind, child-nameable, varied in silhouette/material/scale/detail pattern, and readable at final print size.",
        "",
        `Use these intentional search zones: ${input.searchZones} Keep paths, doorways, bridge surfaces, and the main eye path mostly open.`,
        "",
        `Use the page's visual budget carefully: when adding searchable objects, reduce repeated decorative filler. Replace repeated atmosphere with distinct child-nameable search objects that belong naturally in ${input.location}.`,
        "",
        "No readable generated text. No labels, signs, page numbers, watermarks, gibberish text, arrows, circles, boxes, outlines, halos, highlights, or answer marks. Do not imitate protected brands or famous seek-and-find trade dress.",
        "",
        "Vertical full-page children's seek-and-find illustration. Vertical 8.5 x 11 inch page. 17:22 aspect ratio. Full-color KDP-style interior page with bleed, trim, and safe-area awareness."
      ].join("\n")
    }
  ];

  return [
    commonHeader,
    tests.map((test) => [`## ${test.title}`, "", "```text", test.body, "```"].join("\n")).join("\n\n"),
    ""
  ].join("\n");
}

export function normalizeSeekPageInput(input: Partial<SeekPageInput>): SeekPageInput {
  if (!input.pageNumber) throw new Error("pageNumber is required.");
  if (!input.location) throw new Error("location is required.");
  if (!input.missionItem) throw new Error("missionItem is required.");
  return {
    bookTitle: input.bookTitle ?? seekPageDefaults.bookTitle,
    pageNumber: input.pageNumber,
    location: input.location,
    missionItem: input.missionItem,
    ageRange: input.ageRange ?? seekPageDefaults.ageRange,
    style: input.style ?? seekPageDefaults.style,
    outputMode: input.outputMode ?? seekPageDefaults.outputMode
  };
}

export interface PageMapRow {
  spread: number;
  storyListPage: number;
  seekPage: number;
  location: string;
  missionItem: string;
}

function searchZoneGuidance(location: string): string {
  if (/lantern maker'?s workshop/i.test(location)) {
    return "a clear foreground entry edge where Ember stands small at the side; a sturdy lantern-making workbench with a few frames, wicks, and safe rounded tools; wall hooks with a limited number of distinct paper shades; ribbon-and-wick shelves with small jars and spools; a finished-lantern display stand; and a side basket or bench corner for tucked child-nameable props.";
  }

  return "a clear foreground entry edge with Ember small at the side; one main work surface or display surface; shelves, hooks, or ledges for tucked objects; a side basket, bench, planter, or doorway edge; and a background feature with a few readable props.";
}

function allowsManualTestMode(input: SeekPageInput): boolean {
  return /\b(test|manual)\b/i.test(input.outputMode);
}

export function parsePageMap(markdown: string): PageMapRow[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 5)
    .map((cells) => ({
      spread: Number.parseInt(cells[0], 10),
      storyListPage: Number.parseInt(cells[1], 10),
      seekPage: Number.parseInt(cells[2], 10),
      location: cells[3],
      missionItem: cells[4]
    }))
    .filter((row) => Number.isInteger(row.spread) && Number.isInteger(row.storyListPage) && Number.isInteger(row.seekPage));
}

function canonEqual(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function validateSeekPageAgainstPageMap(input: SeekPageInput, rows: PageMapRow[]): void {
  if (allowsManualTestMode(input)) return;

  const storyRow = rows.find((row) => row.storyListPage === input.pageNumber);
  if (storyRow && storyRow.seekPage !== input.pageNumber) {
    throw new Error(`Page ${input.pageNumber} is a story/list page for spread ${storyRow.spread}, not a seek image. Use seek page ${storyRow.seekPage}: ${storyRow.location} / ${storyRow.missionItem}.`);
  }

  const seekRow = rows.find((row) => row.seekPage === input.pageNumber);
  if (!seekRow) return;

  const problems: string[] = [];
  if (!canonEqual(input.location, seekRow.location)) {
    problems.push(`location should be "${seekRow.location}"`);
  }
  if (!canonEqual(input.missionItem, seekRow.missionItem)) {
    problems.push(`mission item should be "${seekRow.missionItem}"`);
  }
  if (problems.length) {
    throw new Error(`Book 1 page-map conflict for seek page ${input.pageNumber}: ${problems.join("; ")}.`);
  }
}

function resolveSeekPageRow(input: SeekPageInput, rows: PageMapRow[]): PageMapRow {
  if (allowsManualTestMode(input)) {
    return {
      spread: 0,
      storyListPage: 0,
      seekPage: input.pageNumber,
      location: input.location,
      missionItem: input.missionItem
    };
  }

  const seekRow = rows.find((row) => row.seekPage === input.pageNumber);
  if (!seekRow) {
    throw new Error(`No canonical Book 1 seek-page row found for page ${input.pageNumber}. Use outputMode "manual-test" for non-canon experiments.`);
  }
  return seekRow;
}

async function loadPageMapRows(rootDir?: string): Promise<PageMapRow[]> {
  const root = repoRoot(rootDir);
  const absolute = join(root, "content/workflows/book-01/page-map.md");
  if (!existsSync(absolute)) return [];
  return parsePageMap(await readFile(absolute, "utf8"));
}

export async function generateSeekPage(input: Partial<SeekPageInput>, options: RunOptions = {}): Promise<GenerateResult> {
  const normalized = normalizeSeekPageInput(input);
  const pageMapRows = await loadPageMapRows(options.rootDir);
  validateSeekPageAgainstPageMap(normalized, pageMapRows);
  const sourceRow = resolveSeekPageRow(normalized, pageMapRows);
  const promptInput = {
    ...normalized,
    pageNumber: sourceRow.seekPage,
    location: sourceRow.location,
    missionItem: sourceRow.missionItem,
    spread: sourceRow.spread,
    storyListPage: sourceRow.storyListPage,
    seekPage: sourceRow.seekPage,
    searchZones: searchZoneGuidance(sourceRow.location)
  };
  const baseName = seekPageBaseName(promptInput.pageNumber, promptInput.location);
  const prompt = renderTemplate(seekTemplate, {
    ...promptInput
  });
  const splitTestPrompts = renderSplitTestPromptLadder(promptInput);
  const qa = runImagePromptQa(prompt, promptInput.missionItem);
  const qaMarkdown = [
    `# QA Report - ${normalized.bookTitle} Page ${normalized.pageNumber}`,
    "",
    `Workflow: seek-page`,
    `Prompt file: content/outputs/prompts/${baseName}-image-prompt.md`,
    `QA result: ${qa.passed ? "PASS" : "FAIL"}`,
    "",
    "## Failures",
    qa.failures.length ? qa.failures.map((item) => `- ${item}`).join("\n") : "- None",
    "",
    "## Warnings",
    qa.warnings.length ? qa.warnings.map((item) => `- ${item}`).join("\n") : "- None",
    "",
    "## Checklist",
    "- Ember appears exactly once",
    "- Ember is visible, not hidden",
    "- Reference images are named",
    "- No readable generated text",
    "- Mission item appears once",
    "- Exactly 50 hidden objects requested: 1 named mission item plus 49 unnamed unique objects",
    "- Additional hidden objects are not named individually in the image prompt",
    "- Vertical KDP-style 8.5x11 format with explicit 8.5:11 / 17:22 aspect ratio",
    "- Safe-area awareness included",
    "- Kid-friendly ages 5-8"
  ].join("\n");

  const files = [
    await writeTextFileSafe(`content/outputs/prompts/${baseName}-image-prompt.md`, prompt, options),
    await writeTextFileSafe(`content/outputs/prompts/${baseName}-split-test-prompts.md`, splitTestPrompts, options),
    await writeTextFileSafe(`content/outputs/qa-reports/${baseName}-qa.md`, qaMarkdown, options)
  ];

  const result: GenerateResult = {
    ok: qa.passed,
    workflow: "seek-page",
    summary: "Generated seek-page prompt, split-test ladder, and QA report.",
    files,
    warnings: qa.warnings.concat(qa.failures),
    nextStep: "Run split-prompt tests before the next full live image attempt, then run KDP QA after an image is approved."
  };

  await updateProductionStatus(result, options.rootDir);
  const sessionFile = await appendSessionLog({
    workflow: "seek-page",
    inputs: promptInput,
    assumptions: allowsManualTestMode(normalized)
      ? ["Manual/test prompt mode; output is not Book 1 canon."]
      : ["Book 1 canonical page-map row locked before prompt rendering."],
    outputsCreated: files,
    warnings: result.warnings,
    qaResult: qa.passed ? "PASS" : "FAIL",
    nextManualStep: result.nextStep
  }, options.rootDir);
  result.files.push(sessionFile, "content/workflows/book-01/production-status.md");

  return result;
}
