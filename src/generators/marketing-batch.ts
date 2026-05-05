import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_AGE_RANGE } from "../config.js";
import { writeTextFileSafe } from "../core/file-writer.js";
import { slugify } from "../core/naming.js";
import { runMarketingQa } from "../core/qa-engine.js";
import { appendSessionLog, updateProductionStatus } from "../core/progress-tracker.js";
import { GenerateResult, RunOptions } from "../types.js";

export interface MarketingBatchInput {
  campaign: string;
  asset: string;
  goal: string;
  imageCount: number;
  ageRange: string;
}

export interface MarketingPromptSpec {
  id: string;
  title: string;
  useCase: string;
  prompt: string;
}

const defaultCampaign = "Book 1 Lantern Maker's Workshop teaser batch";
const defaultAsset = "Book 1 Lantern Maker's Workshop approved spread";
const defaultGoal = "promote Ember seek-and-find book without claiming it is published";

function normalizeInput(input: Partial<MarketingBatchInput>): MarketingBatchInput {
  const imageCount = input.imageCount ?? 4;
  if (!Number.isInteger(imageCount) || imageCount < 1 || imageCount > 4) {
    throw new Error("Marketing batch image count must be an integer from 1 to 4.");
  }
  return {
    campaign: input.campaign ?? defaultCampaign,
    asset: input.asset ?? defaultAsset,
    goal: input.goal ?? defaultGoal,
    imageCount,
    ageRange: input.ageRange ?? DEFAULT_AGE_RANGE
  };
}

function promptHeader(title: string, useCase: string, exactText?: string): string {
  const textRule = exactText
    ? `Exact text to render: ${exactText}
- Render only that exact text.
- Make the text large, readable, correctly spelled, and inside safe margins.
- Do not add any extra words.`
    : `No text.
- Make the image post-usable without added text: suitable as a background, profile/header image, banner, or caption-only post image.
- Avoid large blank parchment, empty sky, empty wall, or open template space.`;
  return `# ${title}

Create one image now.

Image type: promotional art for an Ember children's seek-and-find book.
Use case: ${useCase}.
Audience: children ages 5-8 and adult gift-buyers.
Character references: use Ember-001, Ember-002, and Ember-003 for Ember.
Format: vertical social-promo composition, phone-friendly, warm, polished, full-color.

Hard marketing guardrails:
- Fresh promo art only.
- Do not make a fake book cover.
- Do not make an Amazon listing preview.
- Do not make a fake interior sample page.
- Do not imply the book is published, available now, or for sale.
- Do not make a blank template that requires added text before it can be posted.
- Avoid promo-template compositions built around large blank/open areas.
${textRule}
- No logos, watermarks, fake captions, page numbers, labels, arrows, circles, boxes, answer marks, or UI mockups.
- Keep Ember on-model, cheerful, kid-friendly, and safe.
`;
}

function createPromptSpecs(input: MarketingBatchInput): MarketingPromptSpec[] {
  const specs: MarketingPromptSpec[] = [
    {
      id: "01-search-with-ember",
      title: "Book 1 Promo Image 01 - Search With Ember",
      useCase: "Pinterest pin, Instagram post, and Facebook teaser",
      prompt: `${promptHeader("Book 1 Promo Image 01 - Search With Ember", "Pinterest pin, Instagram post, and Facebook teaser", "Search with Ember!")}
Scene: Ember stands in a full-frame Sparkleflame Festival market lane packed with warm lanterns, ribbons, baskets, cupcakes, bells, and tiny sparkle treasures arranged in clear cozy clusters. The exact text should sit naturally across the top like polished social-promo lettering, with art and details filling the rest of the frame. Do not create a blank parchment panel, empty sky, or template area.`
    },
    {
      id: "02-baby-flame-lantern-teaser",
      title: "Book 1 Promo Image 02 - Baby Flame Lantern Teaser",
      useCase: "story/reel cover and mission-item teaser",
      prompt: `${promptHeader("Book 1 Promo Image 02 - Baby Flame Lantern Teaser", "story/reel cover and mission-item teaser", "Can you find the Baby Flame Lantern?")}
Scene: Ember peeks playfully into a cozy lantern maker's workshop filled with warm paper lanterns, ribbon spools, tiny safe tools, shelves, baskets, wood textures, colorful festival ribbons, and child-nameable props. Hide one Baby Flame Lantern fairly somewhere in the midground among other lanterns on a shelf or hanging cluster. Keep the Baby Flame Lantern findable but not marked and not the biggest lantern. Restore a magical festival feeling with a moderate amount of clean sparkle: about 8 to 15 small golden sparkle accents, soft rim glows around a few lanterns, and warm reflections on nearby ribbons and wood. Keep all object shapes clear and separated. Avoid glitter clouds, muddy shimmer, heavy magical dust, or dense all-over speckles. Do not circle, arrow, label, outline, spotlight, or highlight the lantern. Keep the scene visually full and post-ready; do not include blank panels or large open areas.`
    },
    {
      id: "03-screen-free-dragon-fun",
      title: "Book 1 Promo Image 03 - Screen-Free Dragon Fun",
      useCase: "gift-buyer ad creative and Facebook post image",
      prompt: `${promptHeader("Book 1 Promo Image 03 - Screen-Free Dragon Fun", "gift-buyer ad creative and Facebook post image", "Screen-free dragon fun")}
Scene: Ember smiles in a warm reading-and-activity nook that opens into the Sparkleflame Festival, surrounded by lanterns, small treasure bowls, ribbons, cozy books with no readable covers, cupcakes, bells, and sparkle clues. Make it feel like a complete cozy social post for families who want screen-free search fun. Fill the frame with inviting details and avoid blank parchment or empty text-space areas.`
    },
    {
      id: "04-meet-ember-guide",
      title: "Book 1 Promo Image 04 - Meet Ember Guide",
      useCase: "character intro post and profile-friendly promo image",
      prompt: `${promptHeader("Book 1 Promo Image 04 - Meet Ember Guide", "character intro post and profile-friendly promo image", "Meet Ember\nYour baby dragon guide")}
Scene: Ember is the clear cheerful focus, waving beside a full, cozy Sparkleflame Festival scene with glowing lantern strings, little treasure baskets, ribbons, cupcakes, bells, village rooftops, and soft magical sparks. The exact text should be integrated as large clean social-promo lettering, with no extra words. Keep the image full and finished, not a blank character card or template.`
    }
  ];
  return specs.slice(0, input.imageCount);
}

function renderCopyPack(input: MarketingBatchInput, specs: MarketingPromptSpec[]): string {
  return `# Ember Promotional Batch - ${input.campaign}

Asset basis: ${input.asset}
Goal: ${input.goal}
Audience: children ages ${input.ageRange} and adult gift-buyers.
Production status: not claimed as published or available for sale.

## Campaign Strategy

Use the approved Book 1 Lantern Maker's Workshop workflow as proof that the seek and story/list production lane is working, but keep public-facing promotion broad and curiosity-driven. The campaign should sell the feeling: cozy dragon world, screen-free searching, tiny treasures, and Ember as a friendly guide.

## Core Hooks

- Can your child help Ember find the tiny festival treasure?
- A cozy seek-and-find adventure for little dragon fans.
- Screen-free search fun with a tiny baby dragon guide.
- Warm fantasy, gentle challenge, and lots of tiny things to spot.

## Pinterest

Title: Cozy dragon seek-and-find adventure for kids ages ${input.ageRange}

Description: Meet Ember, a tiny baby dragon guide for a warm seek-and-find adventure filled with lanterns, tiny treasures, and screen-free search fun for children ages ${input.ageRange}. Follow for production updates and more Ember sneak peeks.

## Facebook

Post: We have a working Ember seek-and-find production workflow now, and the Lantern Maker's Workshop is glowing. This cozy children's search adventure is being built for ages ${input.ageRange}, with Ember as the tiny baby dragon guide and lots of little treasures to spot. Follow along for behind-the-scenes updates and upcoming sneak peeks.

## Instagram

Caption: Lanterns, tiny treasures, and one very curious baby dragon. Ember's seek-and-find world is coming together for kids ages ${input.ageRange} and families who love cozy screen-free activities.

## Short Video Caption

Can you spot the tiny treasure before Ember does?

## CTA Variants

- Follow for more Ember production updates.
- Save this for screen-free kids' activity ideas.
- Watch for the next tiny treasure teaser.
- Share with a little dragon fan.
- Follow Ember's search adventure as it grows.

## Hashtags

#SeekAndFind #KidsActivityBook #ChildrensBooks #ScreenFreeFun #BabyDragon #HiddenObjectBook #FantasyForKids #KidsBooks #FamilyReading #ActivityBook

## Image Prompt Plan

${specs.map((spec, index) => `${index + 1}. ${spec.title}: ${spec.useCase}`).join("\n")}

## Publication Claim Guardrail

Do not say available now, buy now, published, on Amazon, order today, or inside the book unless production status later confirms that wording.
Do not present fresh promo art as a real cover, real interior sample, Amazon listing preview, or finished product mockup.
Do not create blank promo templates that require Lauren to add text before posting; each image must either include exact approved text or be useful without text as a background, profile/header image, banner, or caption-only post image.
Avoid promo-template compositions built around large blank parchment, empty sky, empty wall, or open text space.
`;
}

export async function generateMarketingBatch(input: Partial<MarketingBatchInput>, options: RunOptions = {}): Promise<GenerateResult> {
  const normalized = normalizeInput(input);
  const specs = createPromptSpecs(normalized);
  const batchSlug = slugify(normalized.campaign);
  const batchDir = `content/outputs/marketing/batches/${batchSlug}`;
  const copyPack = renderCopyPack(normalized, specs);
  const qa = runMarketingQa(copyPack);

  const files: string[] = [];
  files.push(await writeTextFileSafe(`${batchDir}/copy-pack.md`, copyPack, options));
  for (const spec of specs) {
    files.push(await writeTextFileSafe(`${batchDir}/prompts/${spec.id}.md`, spec.prompt, options));
  }

  const manifest = {
    campaign: normalized.campaign,
    asset: normalized.asset,
    goal: normalized.goal,
    imageCount: normalized.imageCount,
    ageRange: normalized.ageRange,
    prompts: specs.map((spec) => ({
      id: spec.id,
      title: spec.title,
      useCase: spec.useCase,
      promptPath: `${batchDir}/prompts/${spec.id}.md`,
      assetName: `${batchSlug}-${spec.id}`
    }))
  };
  const manifestPath = `${batchDir}/manifest.json`;
  const root = options.rootDir ?? process.cwd();
  const absoluteManifest = join(root, manifestPath);
  if (existsSync(absoluteManifest) && !options.force) {
    throw new Error(`File already exists: ${manifestPath}. Re-run with --force to overwrite.`);
  }
  await writeFileSafeJson(absoluteManifest, manifest);
  files.push(manifestPath);

  const result: GenerateResult = {
    ok: qa.passed,
    workflow: "marketing-batch",
    summary: "Generated promotional copy pack and image prompt batch.",
    files,
    warnings: qa.failures.concat(qa.warnings),
    nextStep: "Run the marketing image batch through supervised Broke Mode, then manually approve usable images."
  };
  await updateProductionStatus(result, options.rootDir);
  const sessionFile = await appendSessionLog({
    workflow: "marketing-batch",
    inputs: normalized,
    assumptions: [
      "Book is not described as published or available for sale.",
      "Promo art is fresh marketing art, not a fake cover, fake listing preview, or interior sample.",
      "Promo images are post-ready as generated, or useful without added text as background/profile/banner assets."
    ],
    outputsCreated: files,
    warnings: result.warnings,
    qaResult: qa.passed ? "PASS" : "FAIL",
    nextManualStep: result.nextStep
  }, options.rootDir);
  result.files.push(sessionFile, "content/workflows/book-01/production-status.md");
  return result;
}

async function writeFileSafeJson(absolutePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readMarketingBatchManifest(manifestPath: string, rootDir?: string): Promise<ReturnType<typeof JSON.parse>> {
  const root = rootDir ?? process.cwd();
  return JSON.parse(await readFile(join(root, manifestPath), "utf8"));
}
