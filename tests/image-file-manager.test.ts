import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  archiveFailedAttempt,
  createSafeAssetSlug,
  defaultBrokeModeOptions,
  enforceMaxAttempts,
  ensureImageOutputFolders,
  imageOutputFolders,
  saveAttemptMetadata,
  savePromptCopy
} from "../src/core/image-file-manager.js";
import {
  managedModeBlockedByInsecureBrowser,
  manualModeMessage,
  generationStillInProgress,
  normalizeReferenceNamesForBrokeMode,
  parseBrokeModeArgs,
  parseBrowserMode,
  preparePromptForChatGPTImageGeneration,
  sanitizePromptForBrokeMode
} from "../automation/playwright/scripts/chatgpt-broke-mode-generate.js";

let root: string;

describe("image file manager", () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ember-image-manager-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("creates expected image output folders", async () => {
    await ensureImageOutputFolders(root);
    for (const folder of Object.values(imageOutputFolders)) {
      await expect(mkdir(join(root, folder), { recursive: true })).resolves.toBeUndefined();
    }
  });

  it("creates safe asset slugs", () => {
    expect(createSafeAssetSlug("Book 1: Glowing Lantern Garden!")).toBe("book-1-glowing-lantern-garden");
    expect(createSafeAssetSlug("!!!", "fallback")).toBe("fallback");
  });

  it("prevents metadata overwrite by default", async () => {
    const metadata = {
      timestamp: "2026-05-04T00-00-00-000Z",
      workflow: "chatgpt-broke-mode-image-generation" as const,
      status: "dry-run" as const,
      assetName: "Asset",
      assetSlug: "asset",
      promptPath: "prompt.md",
      warnings: [],
      dryRun: true,
      autoSubmit: false,
      maxAttempts: 1
    };
    await saveAttemptMetadata(metadata, { rootDir: root });
    await expect(saveAttemptMetadata(metadata, { rootDir: root })).rejects.toThrow(/already exists/);
  });

  it("archives failed attempts with prompt, metadata, QA report, and failure reason", async () => {
    await ensureImageOutputFolders(root);
    await mkdir(join(root, "content/outputs/prompts"), { recursive: true });
    await writeFile(join(root, "content/outputs/prompts/example.md"), "prompt", "utf8");
    const promptCopyPath = await savePromptCopy("content/outputs/prompts/example.md", "asset", "stamp", { rootDir: root });
    const metadataPath = await saveAttemptMetadata({
      timestamp: "stamp",
      workflow: "chatgpt-broke-mode-image-generation",
      status: "failed",
      assetName: "Asset",
      assetSlug: "asset",
      promptPath: "content/outputs/prompts/example.md",
      promptCopyPath,
      warnings: ["failed"],
      dryRun: false,
      autoSubmit: false,
      maxAttempts: 1
    }, { rootDir: root });
    const qaReportPath = "content/outputs/image-qa-reports/asset-qa.md";
    await writeFile(join(root, qaReportPath), "# QA\n", "utf8");

    const archived = await archiveFailedAttempt({
      assetSlug: "asset",
      timestamp: "stamp",
      promptCopyPath,
      metadataPath,
      qaReportPath,
      failureReason: "QA failed"
    }, { rootDir: root });

    expect(archived).toContain("content/outputs/images/failed/asset-stamp/asset-stamp-prompt.md");
    expect(archived).toContain("content/outputs/images/failed/asset-stamp/asset-stamp-metadata.json");
    expect(archived).toContain("content/outputs/images/failed/asset-stamp/asset-qa.md");
    await expect(readFile(join(root, "content/outputs/images/failed/asset-stamp/failure-reason.md"), "utf8")).resolves.toContain("QA failed");
  });

  it("caps max attempts at 3", () => {
    expect(enforceMaxAttempts(3)).toBe(3);
    expect(() => enforceMaxAttempts(4)).toThrow(/capped at 3/);
  });

  it("defaults autoSubmit to false", () => {
    expect(defaultBrokeModeOptions("prompt.md").autoSubmit).toBe(false);
    expect(parseBrokeModeArgs(["--prompt", "prompt.md"]).autoSubmit).toBe(false);
    expect(parseBrokeModeArgs(["--prompt", "prompt.md", "--auto-submit=true"]).autoSubmit).toBe(true);
  });

  it("defaults to existing browser mode", () => {
    expect(defaultBrokeModeOptions("prompt.md").browserMode).toBe("existing");
    expect(parseBrokeModeArgs(["--prompt", "prompt.md"]).browserMode).toBe("existing");
  });

  it("parses browser modes", () => {
    expect(parseBrowserMode("existing")).toBe("existing");
    expect(parseBrokeModeArgs(["--prompt", "prompt.md", "--browser-mode=managed"]).browserMode).toBe("managed");
    expect(parseBrokeModeArgs(["--prompt", "prompt.md", "--browser-mode=manual"]).browserMode).toBe("manual");
    expect(() => parseBrowserMode("factory")).toThrow(/browser-mode/);
  });

  it("detects managed insecure-browser boundary wording", () => {
    expect(managedModeBlockedByInsecureBrowser("Couldn't sign you in. This browser or app may not be secure.")).toBe(true);
  });

  it("does not treat ChatGPT thinking state as image-ready", () => {
    expect(generationStillInProgress("Thinking")).toBe(false);
    expect(generationStillInProgress("Generating an image based on user input")).toBe(true);
    expect(generationStillInProgress("Cancel loading")).toBe(true);
    expect(generationStillInProgress("Download image")).toBe(false);
  });

  it("provides manual mode fallback messaging", () => {
    const message = manualModeMessage("content/outputs/prompts/example.md");
    expect(message).toContain("No browser will be opened");
    expect(message).toContain("npm run image:qa");
  });

  it("normalizes sandbox reference paths for Broke Mode", () => {
    const result = normalizeReferenceNamesForBrokeMode("Use /mnt/data/Ember-001.png and sandbox:/mnt/data/HootiePuff-001.webp.");
    expect(result.prompt).toContain("Ember-001");
    expect(result.prompt).toContain("HootiePuff-001");
    expect(result.prompt).not.toContain("/mnt/data");
    expect(result.warnings.length).toBe(2);
  });

  it("sanitizes local file paths before Broke Mode paste", () => {
    const result = preparePromptForChatGPTImageGeneration(`
Use image at C:\\Users\\outdo\\Documents\\Seek and Find Books\\Ember's Adventures\\EtD Images\\Ember-001.png.
See folder: content/canon/
Create a scene in Glowing Lantern Garden with one tiny golden lantern key.
No readable generated text.
`);

    expect(result.prompt).toContain("Ember-001");
    expect(result.prompt).not.toMatch(/C:\\Users|content\/canon|See folder|Ember-001\.png/i);
  });

  it("keeps only visible reference names from local markdown links", () => {
    const result = sanitizePromptForBrokeMode(`
Use [Ember-001](file:///C:/Users/outdo/EtD Images/Ember-001.png), [Ember-002](content/canon/Ember-002.png), and [Ember-003](./Ember-003.webp).
Mission item: tiny golden lantern key in Glowing Lantern Garden.
`);

    expect(result.prompt).toContain("Ember-001");
    expect(result.prompt).toContain("Ember-002");
    expect(result.prompt).toContain("Ember-003");
    expect(result.prompt).not.toMatch(/file:\/\/|content\/canon|\.png|\.webp|\]\(/i);
  });

  it("adds missing aspect ratio and KDP format requirements once", () => {
    const result = preparePromptForChatGPTImageGeneration(`
Create a children's seek-and-find image in Glowing Lantern Garden.
Ember appears exactly once. Ember is visible as the helper/guide, not hidden.
Use Ember-001, Ember-002, and Ember-003.
No readable generated text.
The mission item appears exactly once and is findable: tiny golden lantern key.
`);

    expect(result.prompt).toContain("17:22 aspect ratio");
    expect(result.prompt).toContain("vertical 8.5 x 11 inch page");
    expect(result.prompt).toContain("full-color KDP-style interior page");
    expect(result.prompt.match(/17:22 aspect ratio/g)?.length).toBe(1);
  });

  it("preserves QA-relevant scene instructions while cleaning references", () => {
    const result = preparePromptForChatGPTImageGeneration(`
Use [Ember-001](content/canon/Ember-001.png).
Location: Glowing Lantern Garden.
Hide one tiny golden lantern key fairly.
No readable generated text.
Ember appears exactly once and is visible as the helper/guide, not hidden.
The mission item appears exactly once and is findable.
`);

    expect(result.prompt).toContain("Glowing Lantern Garden");
    expect(result.prompt).toContain("tiny golden lantern key");
    expect(result.prompt).toMatch(/no readable generated text/i);
    expect(result.prompt).toContain("Ember-001");
    expect(result.prompt).not.toContain("content/canon");
  });

  it("compacts source packets to image-facing ChatGPT prompts", () => {
    const result = preparePromptForChatGPTImageGeneration(`
Location: Glowing Lantern Garden
Mission item: tiny golden lantern key
Audience: children ages 5-8
Style: soft rounded 2.25D children's storybook

# Ember Character Canon

## Reference Names

- Ember-001
- Ember-002
- Ember-003

## Visual Rules

- tiny adorable reddish-orange baby dragon
- large glossy blue-teal eyes
- plain bright blue-teal scarf
- tiny plain brown crossbody satchel with dull-gold button clasps

# Book 1 Sparkleflame Canon

## KDP Working Assumptions

- Interior target: 24 pages.
- Pages 22-23 are the reward recap spread.

# No Readable Text Policy

## Marketing Image Prompts

For every marketing prompt, list exact words if text should appear.

## Final Image Prompt

Create a production-ready children's seek-and-find illustration for Ember and the Sparkleflame Festival Search, page 8, set in Glowing Lantern Garden.

Ember appears exactly once. Ember is visible as the friendly guide/helper, not hidden as a target object.

Hide one tiny golden lantern key fairly in the scene. The mission item appears exactly once and must be findable for children ages 5-8.

No readable generated text.

## Hidden Object Category Guidance

- Main Finds: choose 10 clear objects after the approved image exists.

## Negative Prompt / Avoid

Avoid: off-model Ember, duplicate Ember, hidden Ember, readable text, fake text, labels, answer marks, circles, boxes, arrows.
`);

    expect(result.prompt).toContain("Create one image now.");
    expect(result.prompt).toContain("## Ember Appearance");
    expect(result.prompt).toContain("Use Ember-001, Ember-002, and Ember-003 as visual references for Ember.");
    expect(result.prompt).toContain("plain bright blue-teal scarf");
    expect(result.prompt).toContain("Glowing Lantern Garden");
    expect(result.prompt).toContain("tiny golden lantern key");
    expect(result.prompt).toContain("17:22 aspect ratio");
    expect(result.prompt).not.toMatch(/\n\s*He has rounded/);
    expect(result.prompt).not.toMatch(/KDP Working Assumptions|Marketing Image Prompts|Hidden Object Category Guidance|Pages 22-23|Main Finds/i);
    expect(result.prompt).not.toMatch(/when available|If references are unavailable|project\/source context|Do not rewrite|turn this into a planning response/i);
  });

  it("does not duplicate metadata when compacting an already compact prompt", () => {
    const result = preparePromptForChatGPTImageGeneration(`
## Character Reference Handling

Use the character reference images available in this ChatGPT project/source context when available: Ember-001, Ember-002, Ember-003.

## Essential Ember Visual Canon

- tiny adorable reddish-orange baby dragon
- plain bright blue-teal scarf

## Final Image Prompt

Location: Glowing Lantern Garden
Mission item: tiny golden lantern key
Audience: children ages 5-8
Style: soft rounded 2.25D children's storybook

Create a production-ready children's seek-and-find illustration for Ember and the Sparkleflame Festival Search, page 8, set in Glowing Lantern Garden.

Ember appears exactly once as a small friendly guide/helper, not hidden.

The mission item appears exactly once and is findable: tiny golden lantern key.

No readable generated text.
`);

    expect(result.prompt.match(/^Location:/gm)?.length).toBe(1);
    expect(result.prompt.match(/^Mission item:/gm)?.length).toBe(1);
    expect(result.prompt.match(/^Audience:/gm)?.length).toBe(1);
    expect(result.prompt.match(/^Style:/gm)?.length).toBe(1);
    expect(result.prompt).not.toMatch(/when available|If references are not available|project\/source context/i);
  });

  it("prepares a direct broke-mode prompt without assistant-routing language", () => {
    const result = preparePromptForChatGPTImageGeneration(`
# Ember and the Sparkleflame Festival Search - Page 9 Seek Render Prompt

Source row: Book 1 spread 4, story/list page 8, seek page 9, Lantern Maker's Workshop / Baby Flame Lantern.
Location: Lantern Maker's Workshop
Mission item: Baby Flame Lantern
Audience: children ages 5-8
Style: soft rounded 2.25D children's storybook

## Final Image Prompt

Create a production-ready children's seek-and-find illustration for Ember and the Sparkleflame Festival Search, seek page 9, set in Lantern Maker's Workshop.

Use Ember-001, Ember-002, and Ember-003 as visual references for Ember. Ember must match this canon: tiny adorable reddish-orange baby dragon guide, about small-cat sized, with a plain bright blue-teal scarf and tiny plain brown crossbody satchel.

Ember appears exactly once as a small friendly guide/helper without dominating the page like cover art. Ember is visible, not hidden.

Hide one Baby Flame Lantern fairly in the scene. The mission item appears exactly once and must be findable for children ages 5-8.

Build a rich but readable seek-and-find scene with 4-6 intentional search zones across foreground, midground, and background: a clear foreground entry edge where Ember stands small at the side; a sturdy lantern-making workbench; wall hooks with distinct paper shades; ribbon-and-wick shelves; a finished-lantern display stand; and a side basket or bench corner. Keep paths open.

Use the page's visual budget carefully: when adding searchable objects, reduce repeated decorative filler. Theme motifs such as lanterns may stay when specific examples are visually unique enough to find; limit repeated generic versions.

No readable generated text. No labels, arrows, circles, boxes, outlines, halos, highlights, or answer marks.

## Negative Prompt / Avoid

Avoid: off-model Ember, cover-art-sized Ember, duplicate Ember, hidden Ember, duplicate Baby Flame Lantern, readable text, fake text, labels, answer marks, circles, boxes, arrows.
`);

    expect(result.prompt.startsWith("Create one image now.")).toBe(true);
    expect(result.prompt).toContain("## Visual References");
    expect(result.prompt).toContain("Use Ember-001, Ember-002, and Ember-003 as visual references for Ember.");
    expect(result.prompt).toContain("Lantern Maker's Workshop");
    expect(result.prompt).toContain("sturdy lantern-making workbench");
    expect(result.prompt.match(/Use Ember-001, Ember-002, and Ember-003 as visual references for Ember\./g)?.length).toBe(1);
    expect(result.prompt).not.toMatch(/Ember must match this canon/);
    expect(result.prompt).not.toMatch(/when available|If references are unavailable|If references are not available|project\/source context|Do not rewrite|summarize|planning response/i);
  });
});
