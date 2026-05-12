import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { generateMarketingBatch } from "../src/generators/marketing-batch.js";

describe("marketing batch", () => {
  it("writes the native 4:5 promo-art rule into generated prompt packs", async () => {
    const root = await mkdtemp(join(tmpdir(), "ember-marketing-batch-"));

    const result = await generateMarketingBatch({
      campaign: "Test Promo Rule",
      asset: "Test approved art",
      goal: "test promo generation",
      imageCount: 1
    }, { rootDir: root });

    const promptPath = result.files.find((file) => file.endsWith("prompts/01-golden-welcome-bell-teaser.md"));
    const copyPackPath = result.files.find((file) => file.endsWith("copy-pack.md"));

    expect(promptPath).toBeTruthy();
    expect(copyPackPath).toBeTruthy();

    const promptText = await readFile(join(root, promptPath!), "utf8");
    const copyPackText = await readFile(join(root, copyPackPath!), "utf8");

    expect(promptText).toContain("create it separately as a native 4:5 composition");
    expect(promptText).toContain("One approved meta_feed_4x5 image may serve both Instagram feed and Facebook Page feed posts");
    expect(promptText).toContain("Do not crop, resize, or repurpose a 9:16 Pinterest/Shorts/Story image into 4:5");
    expect(copyPackText).toContain("A shared approved meta_feed_4x5 image can be used for both Facebook and Instagram feed posts");
  });
});
