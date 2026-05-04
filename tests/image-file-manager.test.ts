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
import { parseBrokeModeArgs } from "../automation/playwright/scripts/chatgpt-broke-mode-generate.js";

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
});
