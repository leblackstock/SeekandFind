import { DEFAULT_AGE_RANGE, DEFAULT_BOOK_TITLE, DEFAULT_STYLE } from "../config.js";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { repoRoot } from "../config.js";
import { GenerateResult, RunOptions, SeekPageInput } from "../types.js";
import { canonAsPromptBlock, loadCanonBundle } from "../core/canon-loader.js";
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

const seekTemplate = `# {{bookTitle}} - Page {{pageNumber}} Seek Prompt

Location: {{location}}
Mission item: {{missionItem}}
Audience: children ages {{ageRange}}
Style: {{style}}
Format: vertical KDP-style 8.5x11 full-color interior page, portrait aspect ratio 8.5:11 (17:22), with bleed, trim, and safe-area awareness.

{{canonBlock}}

## Final Image Prompt

Create a production-ready children's seek-and-find illustration for {{bookTitle}}, page {{pageNumber}}, set in {{location}}.

Ember appears exactly once. Ember is visible as the friendly guide/helper, not hidden as a target object. Use the project/source reference images Ember-001, Ember-002, and Ember-003 when available. If references are unavailable, follow the written Ember character canon exactly.

Hide one {{missionItem}} fairly in the scene. The mission item appears exactly once and must be findable for children ages {{ageRange}}. Place it naturally on a believable surface or tucked edge, not randomly in a walkway.

Build a rich but readable seek-and-find scene with clear foreground, midground, and background zones. Keep search density age-appropriate and avoid muddy clutter. Use clustered details, open eye paths, and fair hiding.

No readable generated text. No labels, signs, page numbers, watermarks, gibberish text, arrows, circles, boxes, outlines, halos, highlights, or answer marks. Do not imitate protected brands or famous seek-and-find trade dress.

Keep the tone warm, magical, cheerful, and child-safe for ages {{ageRange}}.

## Hidden Object Category Guidance

- Mission Item: {{missionItem}} appears once.
- Main Finds: choose 10 clear objects after the approved image exists.
- Bonus Finds: choose 5-15 optional objects from visible approved art.

## Negative Prompt / Avoid

Avoid: off-model Ember, duplicate Ember, hidden Ember, readable text, fake text, labels, answer marks, circles, boxes, arrows, scary lighting, weapons focus, muddy clutter, overly tiny targets, copyrighted character imitation, and important details too close to trim or gutter.
`;

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

async function loadPageMapRows(rootDir?: string): Promise<PageMapRow[]> {
  const root = repoRoot(rootDir);
  const absolute = join(root, "content/workflows/book-01/page-map.md");
  if (!existsSync(absolute)) return [];
  return parsePageMap(await readFile(absolute, "utf8"));
}

export async function generateSeekPage(input: Partial<SeekPageInput>, options: RunOptions = {}): Promise<GenerateResult> {
  const normalized = normalizeSeekPageInput(input);
  validateSeekPageAgainstPageMap(normalized, await loadPageMapRows(options.rootDir));
  const canon = await loadCanonBundle(options.rootDir);
  const baseName = seekPageBaseName(normalized.pageNumber, normalized.location);
  const prompt = renderTemplate(seekTemplate, {
    ...normalized,
    canonBlock: canonAsPromptBlock(canon)
  });
  const qa = runImagePromptQa(prompt, normalized.missionItem);
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
    "- Vertical KDP-style 8.5x11 format with explicit 8.5:11 / 17:22 aspect ratio",
    "- Safe-area awareness included",
    "- Kid-friendly ages 5-8"
  ].join("\n");

  const files = [
    await writeTextFileSafe(`content/outputs/prompts/${baseName}-image-prompt.md`, prompt, options),
    await writeTextFileSafe(`content/outputs/qa-reports/${baseName}-qa.md`, qaMarkdown, options)
  ];

  const result: GenerateResult = {
    ok: qa.passed,
    workflow: "seek-page",
    summary: "Generated seek-page prompt and QA report.",
    files,
    warnings: qa.warnings.concat(qa.failures),
    nextStep: "Generate the image, then run KDP QA."
  };

  await updateProductionStatus(result, options.rootDir);
  const sessionFile = await appendSessionLog({
    workflow: "seek-page",
    inputs: normalized,
    assumptions: ["Book 1 Sparkleflame Festival canon unless input says otherwise."],
    outputsCreated: files,
    warnings: result.warnings,
    qaResult: qa.passed ? "PASS" : "FAIL",
    nextManualStep: result.nextStep
  }, options.rootDir);
  result.files.push(sessionFile, "content/workflows/book-01/production-status.md");

  return result;
}
