import { DEFAULT_AGE_RANGE } from "../config.js";
import { canonAsPromptBlock, loadCanonBundle } from "../core/canon-loader.js";
import { writeTextFileSafe } from "../core/file-writer.js";
import { slugify } from "../core/naming.js";
import { runMarketingQa } from "../core/qa-engine.js";
import { appendSessionLog, updateProductionStatus } from "../core/progress-tracker.js";
import { renderTemplate } from "../core/template-renderer.js";
import { GenerateResult, MarketingPackInput, RunOptions } from "../types.js";

const marketingTemplate = `# Ember Marketing Pack

Asset: {{asset}}
Goal: {{goal}}
Platforms: {{platforms}}
Audience: children ages {{ageRange}} and adult gift-buyers.

{{canonBlock}}

## Pinterest

Title: Magical seek-and-find adventure for kids ages {{ageRange}}
Description: A cozy Ember search-adventure teaser for families who love screen-free activity books, gentle fantasy worlds, and hidden-object fun.

## Facebook

Post: Meet Ember, a tiny baby dragon guide in a warm seek-and-find adventure for children ages {{ageRange}}. This teaser is based on {{asset}} and keeps the focus on cozy search fun.

## Instagram

Caption: A soft magical search moment with Ember, made for young seekers and family reading time. Children ages {{ageRange}} can look for little story treasures in a gentle fantasy world.

## Short Video Caption

Follow Ember into a cozy seek-and-find adventure.

## CTA Variants

- Save this for your next screen-free kids' activity idea.
- Follow for more Ember search-adventure updates.
- Watch for the next hidden treasure teaser.

## Hashtags

#SeekAndFind #KidsActivityBook #ChildrensBooks #ScreenFreeFun #BabyDragon #FantasyForKids

## Marketing Image Prompt

Create promotional-style art inspired by {{asset}}. Use Ember reference images Ember-001, Ember-002, and Ember-003 when available. Keep Ember on-model, cheerful, and child-safe. This is fresh promo art, not an interior sample page, not a fake cover, and not an Amazon listing preview.

No text unless exact approved marketing text is provided. No fake text, labels, logos, watermarks, page numbers, arrows, circles, boxes, or answer marks.

## Publication Claim Guardrail

Do not say available now, buy now, published, or inside-the-book unless production status confirms that wording.
`;

export function normalizeMarketingInput(input: Partial<MarketingPackInput>): MarketingPackInput {
  return {
    platforms: input.platforms?.length ? input.platforms : ["Pinterest", "Facebook", "Instagram"],
    asset: input.asset ?? "Book 1 Sparkleflame Festival teaser",
    goal: input.goal ?? "promote Ember seek-and-find book",
    ageRange: input.ageRange ?? DEFAULT_AGE_RANGE
  };
}

export async function generateMarketingPack(input: Partial<MarketingPackInput>, options: RunOptions = {}): Promise<GenerateResult> {
  const normalized = normalizeMarketingInput(input);
  const canon = await loadCanonBundle(options.rootDir);
  const pack = renderTemplate(marketingTemplate, {
    ...normalized,
    platforms: normalized.platforms.join(", "),
    canonBlock: canonAsPromptBlock(canon)
  });
  const qa = runMarketingQa(pack);
  const baseName = `marketing-${slugify(normalized.asset)}-${slugify(normalized.goal)}`;
  const files = [
    await writeTextFileSafe(`content/outputs/marketing/${baseName}.md`, pack, options)
  ];
  const result: GenerateResult = {
    ok: qa.passed,
    workflow: "marketing-pack",
    summary: "Generated marketing pack.",
    files,
    warnings: qa.failures.concat(qa.warnings),
    nextStep: "Review copy against current production status before posting."
  };
  await updateProductionStatus(result, options.rootDir);
  const sessionFile = await appendSessionLog({
    workflow: "marketing-pack",
    inputs: normalized,
    assumptions: ["Book is not described as published unless production status confirms it."],
    outputsCreated: files,
    warnings: result.warnings,
    qaResult: qa.passed ? "PASS" : "FAIL",
    nextManualStep: result.nextStep
  }, options.rootDir);
  result.files.push(sessionFile, "content/workflows/book-01/production-status.md");
  return result;
}
