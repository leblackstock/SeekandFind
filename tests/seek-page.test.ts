import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateSeekPage, parsePageMap, validateSeekPageAgainstPageMap } from "../src/generators/seek-page.js";

const pageMap = `
| Spread | Story/List Page | Seek Page | Working Location | Mission Item |
| ---: | ---: | ---: | --- | --- |
| 4 | 8 | 9 | Lantern Maker's Workshop | Baby Flame Lantern |
`;

describe("seek page source-truth validation", () => {
  it("parses page map rows", () => {
    const rows = parsePageMap(pageMap);
    expect(rows[0]).toMatchObject({
      spread: 4,
      storyListPage: 8,
      seekPage: 9,
      location: "Lantern Maker's Workshop",
      missionItem: "Baby Flame Lantern"
    });
  });

  it("rejects story/list pages as seek pages", () => {
    const rows = parsePageMap(pageMap);
    expect(() => validateSeekPageAgainstPageMap({
      bookTitle: "Ember and the Sparkleflame Festival Search",
      pageNumber: 8,
      location: "Glowing Lantern Garden",
      missionItem: "tiny golden lantern key",
      ageRange: "5-8",
      style: "soft rounded 2.25D children's storybook",
      outputMode: "prompt+qa"
    }, rows)).toThrow(/story\/list page/);
  });

  it("rejects mismatched mission items for canonical seek pages", () => {
    const rows = parsePageMap(pageMap);
    expect(() => validateSeekPageAgainstPageMap({
      bookTitle: "Ember and the Sparkleflame Festival Search",
      pageNumber: 9,
      location: "Lantern Maker's Workshop",
      missionItem: "tiny golden lantern key",
      ageRange: "5-8",
      style: "soft rounded 2.25D children's storybook",
      outputMode: "prompt+qa"
    }, rows)).toThrow(/mission item should be "Baby Flame Lantern"/);
  });

  it("allows non-canon prompts only when explicitly marked manual/test", () => {
    const rows = parsePageMap(pageMap);
    expect(() => validateSeekPageAgainstPageMap({
      bookTitle: "Ember and the Sparkleflame Festival Search",
      pageNumber: 8,
      location: "Glowing Lantern Garden",
      missionItem: "tiny golden lantern key",
      ageRange: "5-8",
      style: "soft rounded 2.25D children's storybook",
      outputMode: "manual-test"
    }, rows)).not.toThrow();
  });

  it("renders a canonical source-locked prompt without source-packet clutter", async () => {
    const root = await mkdtemp(join(tmpdir(), "ember-seek-page-"));
    try {
      await mkdir(join(root, "content/workflows/book-01"), { recursive: true });
      await writeFile(join(root, "content/workflows/book-01/page-map.md"), pageMap, "utf8");

      const result = await generateSeekPage({
        bookTitle: "Ember and the Sparkleflame Festival Search",
        pageNumber: 9,
        location: "Lantern Maker's Workshop",
        missionItem: "Baby Flame Lantern",
        ageRange: "5-8",
        style: "soft rounded 2.25D children's storybook"
      }, { rootDir: root });

      expect(result.ok).toBe(true);
      const prompt = await readFile(join(root, "content/outputs/prompts/book01-page009-lantern-maker-s-workshop-image-prompt.md"), "utf8");
      expect(prompt).toContain("Source row: Book 1 spread 4, story/list page 8, seek page 9, Lantern Maker's Workshop / Baby Flame Lantern.");
      expect(prompt).toContain("small friendly guide/helper");
      expect(prompt).toContain("visual budget");
      expect(prompt).toContain("visually unique enough to find");
      expect(prompt).toContain("Include exactly 50 hidden objects total");
      expect(prompt).toContain("49 additional unique hidden objects");
      expect(prompt).toContain("Name only the mission item");
      expect(prompt).toContain("sturdy lantern-making workbench");
      expect(prompt).toContain("Use Ember-001, Ember-002, and Ember-003 as visual references for Ember.");
      expect(prompt).toContain("duplicate Baby Flame Lantern");
      expect(prompt).not.toMatch(/Source mirror:|Marketing Image Prompts|marketing prompt pack|Canon To Preserve|when available|If references are unavailable/i);

      const splitTests = await readFile(join(root, "content/outputs/prompts/book01-page009-lantern-maker-s-workshop-split-test-prompts.md"), "utf8");
      expect(splitTests).toContain("Test 1 - Minimal Render");
      expect(splitTests).toContain("Test 6 - Add Full Avoid And Format Block");
      expect(splitTests).toContain("Paste one test at a time");
      expect(splitTests).toContain("Include exactly 50 hidden objects total");
      expect(splitTests).not.toMatch(/when available|If references are unavailable|Do not rewrite|project\/source context/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
