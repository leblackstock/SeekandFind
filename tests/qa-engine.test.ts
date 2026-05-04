import { describe, expect, it } from "vitest";
import { runImagePromptQa, runKdpQa, runMarketingQa, runStoryboardQa } from "../src/core/qa-engine.js";

const goodPrompt = `
Ember appears exactly once. Ember is visible as the guide/helper.
Use reference images Ember-001, Ember-002, and Ember-003.
No readable generated text. Vertical KDP-style 8.5x11 portrait aspect ratio 8.5:11 / 17:22 for children ages 5-8.
Ember stays a small friendly guide without dominating the page like cover art.
Use the page's visual budget carefully: reduce repeated decorative filler when adding searchable objects.
Theme motifs may stay when they are visually unique enough to find; limit repeated generic versions.
Hide one tiny frosted bell fairly. No labels, arrows, circles, boxes, outlines, or highlights.
`;

describe("qa engine", () => {
  it("passes a compliant image prompt", () => {
    expect(runImagePromptQa(goodPrompt, "tiny frosted bell").passed).toBe(true);
  });

  it("fails when Ember exact-once rule is missing", () => {
    const qa = runImagePromptQa("Use Ember-001. No readable text. 8.5x11 ages 5-8.", "bell");
    expect(qa.passed).toBe(false);
    expect(qa.failures.join(" ")).toMatch(/Ember appears exactly once/);
  });

  it("fails when explicit aspect ratio is missing", () => {
    const qa = runImagePromptQa(`
Ember appears exactly once. Ember is visible as the guide/helper.
Use reference images Ember-001, Ember-002, and Ember-003.
No readable generated text. Vertical KDP-style 8.5x11 for children ages 5-8.
Hide one tiny frosted bell fairly. No labels, arrows, circles, boxes, outlines, or highlights.
`, "tiny frosted bell");
    expect(qa.passed).toBe(false);
    expect(qa.failures.join(" ")).toMatch(/aspect ratio/);
  });

  it("fails when reference images use sandbox paths", () => {
    const qa = runImagePromptQa(`
Ember appears exactly once. Ember is visible as the guide/helper.
Use reference images /mnt/data/Ember-001.png, Ember-002, and Ember-003.
No readable generated text. Vertical KDP-style 8.5x11 portrait aspect ratio 8.5:11 / 17:22 for children ages 5-8.
Hide one tiny frosted bell fairly. No labels, arrows, circles, boxes, outlines, or highlights.
`, "tiny frosted bell");
    expect(qa.passed).toBe(false);
    expect(qa.failures.join(" ")).toMatch(/project reference IDs/);
  });

  it("fails assistant-routing language that can stall broke mode", () => {
    const qa = runImagePromptQa(`
Ember appears exactly once. Ember is visible as the guide/helper.
Use reference images Ember-001, Ember-002, and Ember-003 when available. If references are unavailable, follow canon.
No readable generated text. Vertical KDP-style 8.5x11 portrait aspect ratio 8.5:11 / 17:22 for children ages 5-8.
Ember stays a small friendly guide without dominating the page like cover art.
Use the page's visual budget carefully: reduce repeated decorative filler when adding searchable objects.
Theme motifs may stay when they are visually unique enough to find; limit repeated generic versions.
Hide one tiny frosted bell fairly. No labels, arrows, circles, boxes, outlines, or highlights.
`, "tiny frosted bell");
    expect(qa.passed).toBe(false);
    expect(qa.failures.join(" ")).toMatch(/assistant-routing/);
  });

  it("checks storyboard basics", () => {
    const qa = runStoryboardQa("15-second Beat 1 0:00 reference camera CapCut");
    expect(qa.passed).toBe(true);
  });

  it("blocks unconfirmed publication claims", () => {
    const qa = runMarketingQa("Pinterest Facebook Instagram CTA children ages 5-8 available now", "");
    expect(qa.passed).toBe(false);
  });

  it("allows explicit no-publication-claim wording", () => {
    const qa = runMarketingQa("Pinterest Facebook Instagram CTA children ages 5-8 promote the book without claiming it is already published", "");
    expect(qa.passed).toBe(true);
  });

  it("checks KDP essentials", () => {
    const qa = runKdpQa("KDP 8.5x11 safe area bleed trim no readable text Ember density readable");
    expect(qa.passed).toBe(true);
  });
});
