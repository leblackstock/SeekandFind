import { describe, expect, it } from "vitest";
import { parsePageMap, validateSeekPageAgainstPageMap } from "../src/generators/seek-page.js";

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
});
