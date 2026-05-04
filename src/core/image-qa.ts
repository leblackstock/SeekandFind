import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { repoRoot, toRepoRelative } from "../config.js";
import { imageOutputFolders, saveTextArtifact } from "./image-file-manager.js";
import { createTimestampSlug, createSafeAssetSlug } from "./image-file-manager.js";

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageQaInput {
  imagePath: string;
  metadataPath?: string;
  promptCopyPath?: string;
  rootDir?: string;
  force?: boolean;
}

export interface ImageQaResult {
  passed: boolean;
  status: "pass" | "warn" | "fail";
  failures: string[];
  warnings: string[];
  dimensions?: ImageDimensions;
  reportPath?: string;
}

const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export async function detectImageDimensions(absolutePath: string): Promise<ImageDimensions> {
  const buffer = await readFile(absolutePath);
  if (buffer.length < 12) {
    throw new Error("Image file is too small to inspect.");
  }

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    if (buffer.length < 24) throw new Error("PNG header is incomplete.");
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
    throw new Error("JPEG dimensions were not found.");
  }

  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    const chunk = buffer.subarray(12, 16).toString("ascii");
    if (chunk === "VP8X" && buffer.length >= 30) {
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      return { width, height };
    }
    if (chunk === "VP8L" && buffer.length >= 25) {
      const b0 = buffer[21];
      const b1 = buffer[22];
      const b2 = buffer[23];
      const b3 = buffer[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + ((b3 << 6) | (b2 >> 2) | ((b1 & 0xc0) << 6));
      return { width, height };
    }
  }

  throw new Error("Unsupported or unreadable image format.");
}

export function basicAspectWarnings(dimensions: ImageDimensions): string[] {
  const warnings: string[] = [];
  if (dimensions.height <= dimensions.width) {
    warnings.push("Image is not vertical; KDP interior pages usually need a vertical composition.");
    return warnings;
  }
  const ratio = dimensions.width / dimensions.height;
  if (ratio < 0.65 || ratio > 0.9) {
    warnings.push(`Image aspect ratio ${ratio.toFixed(3)} may not be KDP-friendly for 8.5x11 vertical layout.`);
  }
  return warnings;
}

export async function runBasicImageQa(input: ImageQaInput): Promise<ImageQaResult> {
  const root = repoRoot(input.rootDir);
  const absolute = join(root, input.imagePath);
  const failures: string[] = [];
  const warnings: string[] = [];
  let dimensions: ImageDimensions | undefined;

  if (!existsSync(absolute)) {
    failures.push(`Image file does not exist: ${input.imagePath}`);
  } else {
    const info = await stat(absolute);
    if (info.size <= 0) failures.push("Image file is zero bytes.");
    const extension = extname(input.imagePath).toLowerCase();
    if (!allowedExtensions.has(extension)) failures.push(`Unsupported image extension: ${extension || "(none)"}`);
    if (!/^[a-z0-9._/-]+$/i.test(input.imagePath.replaceAll("\\", "/"))) {
      warnings.push("Image path contains unusual filename characters.");
    }
    try {
      dimensions = await detectImageDimensions(absolute);
      warnings.push(...basicAspectWarnings(dimensions));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "Image dimensions could not be detected.");
    }
  }

  if (input.metadataPath && !existsSync(join(root, input.metadataPath))) {
    failures.push(`Metadata JSON does not exist: ${input.metadataPath}`);
  }
  if (input.promptCopyPath && !existsSync(join(root, input.promptCopyPath))) {
    failures.push(`Prompt archive does not exist: ${input.promptCopyPath}`);
  }

  const status: ImageQaResult["status"] = failures.length ? "fail" : warnings.length ? "warn" : "pass";
  return { passed: failures.length === 0, status, failures, warnings, dimensions };
}

export function renderImageQaReport(input: {
  imagePath: string;
  metadataPath?: string;
  promptCopyPath?: string;
  result: ImageQaResult;
}): string {
  const dimensions = input.result.dimensions ? `${input.result.dimensions.width}x${input.result.dimensions.height}` : "unknown";
  return `# Image QA Report

Image: ${input.imagePath}
Metadata: ${input.metadataPath ?? "not provided"}
Prompt archive: ${input.promptCopyPath ?? "not provided"}
Status: ${input.result.status.toUpperCase()}
Dimensions: ${dimensions}

## Automated Checks

- File exists and opens: ${input.result.failures.some((item) => /does not exist|dimensions|unsupported|zero bytes/i.test(item)) ? "Needs attention" : "Pass"}
- Allowed format: ${input.result.failures.some((item) => /extension|format/i.test(item)) ? "Fail" : "Pass"}
- Nonzero file size: ${input.result.failures.some((item) => /zero bytes/i.test(item)) ? "Fail" : "Pass"}
- KDP vertical aspect: ${input.result.warnings.some((item) => /vertical|aspect ratio/i.test(item)) ? "Warning" : "Pass"}
- Metadata JSON exists: ${input.metadataPath ? (input.result.failures.some((item) => /Metadata JSON/i.test(item)) ? "Fail" : "Pass") : "Not checked"}
- Prompt archive exists: ${input.promptCopyPath ? (input.result.failures.some((item) => /Prompt archive/i.test(item)) ? "Fail" : "Pass") : "Not checked"}

## Failures

${input.result.failures.length ? input.result.failures.map((item) => `- ${item}`).join("\n") : "- None"}

## Warnings

${input.result.warnings.length ? input.result.warnings.map((item) => `- ${item}`).join("\n") : "- None"}

## Manual Visual QA Required

- Ember appears exactly once
- Ember matches canon
- blue-teal scarf present
- brown satchel present
- tiny golden spiral-comma horns present
- no readable text
- mission item visible
- scene not too cluttered
- child-friendly
- KDP-safe composition
`;
}

export async function saveImageQaReport(input: ImageQaInput & { result?: ImageQaResult }): Promise<ImageQaResult> {
  const root = repoRoot(input.rootDir);
  const result = input.result ?? await runBasicImageQa(input);
  const timestamp = createTimestampSlug();
  const assetSlug = createSafeAssetSlug(basename(input.imagePath, extname(input.imagePath)));
  const relative = `${imageOutputFolders.imageQaReports}/${assetSlug}-${timestamp}-qa.md`;
  const report = renderImageQaReport({
    imagePath: input.imagePath,
    metadataPath: input.metadataPath,
    promptCopyPath: input.promptCopyPath,
    result
  });
  result.reportPath = await saveTextArtifact(relative, report, { rootDir: root, force: input.force });
  return result;
}

export async function imageQaCli(args: string[] = process.argv.slice(2)): Promise<void> {
  const fileIndex = args.indexOf("--file");
  const file = fileIndex >= 0 ? args[fileIndex + 1] : process.env.npm_config_file;
  if (!file) {
    throw new Error("Usage: npm run image:qa -- --file <image-path> [--metadata <metadata.json>] [--prompt-copy <prompt.md>]");
  }
  const metadataIndex = args.indexOf("--metadata");
  const promptIndex = args.indexOf("--prompt-copy");
  const result = await saveImageQaReport({
    imagePath: file,
    metadataPath: metadataIndex >= 0 ? args[metadataIndex + 1] : process.env.npm_config_metadata,
    promptCopyPath: promptIndex >= 0 ? args[promptIndex + 1] : process.env.npm_config_prompt_copy,
    force: args.includes("--force") || /^(true|1|yes)$/i.test(process.env.npm_config_force ?? "")
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.passed ? 0 : 1;
}

const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("src\\core\\image-qa.ts") || invokedPath.endsWith("src/core/image-qa.ts")) {
  imageQaCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
