import { DEFAULT_AGE_RANGE, DEFAULT_BOOK_TITLE, DEFAULT_STYLE } from "../config.js";
import { canonAsPromptBlock, loadCanonBundle } from "../core/canon-loader.js";
import { writeTextFileSafe } from "../core/file-writer.js";
import { slugify } from "../core/naming.js";
import { appendSessionLog, updateProductionStatus } from "../core/progress-tracker.js";
import { renderTemplate } from "../core/template-renderer.js";
import { GenerateResult, RunOptions, TitlePageInput } from "../types.js";

const titleTemplate = `# {{bookTitle}} - Title Page Prompt

Theme: {{theme}}
Audience: children ages {{ageRange}}
Style: {{style}}

{{canonBlock}}

## Final Image Prompt

Create a warm title-page illustration for {{bookTitle}}. This is not a hidden-object page.

Use the project/source reference images Ember-001, Ember-002, and Ember-003 when available. Ember must be clear, friendly, and on-model.

Composition: Ember appears in a welcoming title-page scene inspired by {{theme}}, with clear visual hierarchy, soft magical lighting, and enough open space for real layout typography.

Text policy: do not ask the image model to invent title words, fake labels, page numbers, or gibberish text. If exact title text is needed, it must be added later with editable typography unless the user explicitly requests exact text generation.

Format: vertical KDP-style 8.5x11 title page with bleed, trim, gutter, and safe-area awareness.
`;

export function normalizeTitlePageInput(input: Partial<TitlePageInput>): TitlePageInput {
  return {
    bookTitle: input.bookTitle ?? DEFAULT_BOOK_TITLE,
    theme: input.theme ?? "Sparkleflame Festival entrance",
    ageRange: input.ageRange ?? DEFAULT_AGE_RANGE,
    style: input.style ?? DEFAULT_STYLE
  };
}

export async function generateTitlePage(input: Partial<TitlePageInput>, options: RunOptions = {}): Promise<GenerateResult> {
  const normalized = normalizeTitlePageInput(input);
  const canon = await loadCanonBundle(options.rootDir);
  const baseName = `title-page-${slugify(normalized.bookTitle)}-${slugify(normalized.theme)}`;
  const prompt = renderTemplate(titleTemplate, {
    ...normalized,
    canonBlock: canonAsPromptBlock(canon)
  });
  const files = [
    await writeTextFileSafe(`content/outputs/prompts/${baseName}-prompt.md`, prompt, options)
  ];
  const result: GenerateResult = {
    ok: true,
    workflow: "title-page",
    summary: "Generated title-page prompt.",
    files,
    warnings: [],
    nextStep: "Create title art or build typography in the layout tool."
  };
  await updateProductionStatus(result, options.rootDir);
  const sessionFile = await appendSessionLog({
    workflow: "title-page",
    inputs: normalized,
    assumptions: ["Title text should be added with editable typography unless explicitly approved for image generation."],
    outputsCreated: files,
    warnings: [],
    qaResult: "PASS",
    nextManualStep: result.nextStep
  }, options.rootDir);
  result.files.push(sessionFile, "content/workflows/book-01/production-status.md");
  return result;
}
