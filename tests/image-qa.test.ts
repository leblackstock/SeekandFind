import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runBasicImageQa, saveImageQaReport } from "../src/core/image-qa.js";

let root: string;

function pngHeader(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(32);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

describe("image QA", () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ember-image-qa-"));
    await mkdir(join(root, "content/outputs/images/pending-review"), { recursive: true });
    await mkdir(join(root, "content/outputs/image-qa-reports"), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("creates image QA reports", async () => {
    const imagePath = "content/outputs/images/pending-review/vertical.png";
    const metadataPath = "content/outputs/images/pending-review/vertical-metadata.json";
    const promptCopyPath = "content/outputs/images/pending-review/vertical-prompt.md";
    await writeFile(join(root, imagePath), pngHeader(850, 1100));
    await writeFile(join(root, metadataPath), "{}\n", "utf8");
    await writeFile(join(root, promptCopyPath), "prompt\n", "utf8");

    const result = await saveImageQaReport({ imagePath, metadataPath, promptCopyPath, rootDir: root });
    expect(result.passed).toBe(true);
    expect(result.reportPath).toMatch(/content\/outputs\/image-qa-reports\/vertical-/);
    await expect(readFile(join(root, result.reportPath!), "utf8")).resolves.toContain("Manual Visual QA Required");
  });

  it("warns on non-vertical aspect ratio", async () => {
    const imagePath = "content/outputs/images/pending-review/wide.png";
    await writeFile(join(root, imagePath), pngHeader(1200, 800));

    const result = await runBasicImageQa({ imagePath, rootDir: root });
    expect(result.passed).toBe(true);
    expect(result.status).toBe("warn");
    expect(result.warnings.join(" ")).toMatch(/not vertical/);
  });
});
