import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { repoRoot, toRepoRelative } from "../config.js";
import { slugify } from "./naming.js";

export const imageOutputFolders = {
  pendingReview: "content/outputs/images/pending-review",
  approved: "content/outputs/images/approved",
  failed: "content/outputs/images/failed",
  imageQaReports: "content/outputs/image-qa-reports"
} as const;

export type ImageAttemptStatus = "dry-run" | "canceled" | "pending-review" | "approved" | "failed";
export type BrowserMode = "existing" | "managed" | "manual";

export interface ImageAttemptMetadata {
  timestamp: string;
  workflow: "chatgpt-broke-mode-image-generation";
  status: ImageAttemptStatus;
  assetName: string;
  assetSlug: string;
  promptPath: string;
  promptCopyPath?: string;
  imagePath?: string;
  screenshotPath?: string;
  qaReportPath?: string;
  failureReason?: string;
  warnings: string[];
  dryRun: boolean;
  autoSubmit: boolean;
  maxAttempts: number;
  browserMode?: BrowserMode;
  cdpUrl?: string;
  referenceImages?: string[];
  chatTitle?: string;
  chat_rename_requested?: boolean;
  chat_rename_verified?: boolean;
  chat_rename_api_verified?: boolean;
  chat_rename_visible_verified?: boolean;
  chat_rename_verification_method?: "visible" | "warning";
  chat_rename_method?: string;
  chat_rename_conversation_id?: string;
  chat_rename_api_title?: string;
  chat_rename_visible_title?: string;
  chat_rename_visible_candidates?: string[];
  chat_rename_warning?: string;
  chat_rename_evidence_path?: string;
  chat_rename_screenshot_path?: string;
  conversation_id?: string;
  expected_chat_title?: string;
  observed_visible_chat_title?: string;
  watcher_started_after_chat_rename?: "visible-title-verified rename" | "rename-failed warning";
}

export interface ImageWriteOptions {
  rootDir?: string;
  force?: boolean;
  outputFolder?: string;
}

export interface BrokeModeRuntimeOptions {
  prompt: string;
  rawPrompt: boolean;
  referenceImages: string[];
  referenceImageRoot: string;
  outputFolder?: string;
  referenceUploadGuard?: string;
  generationTimeoutMs: number;
  pollIntervalMs: number;
  recoverOnly: boolean;
  autoSubmit: boolean;
  maxAttempts: number;
  cooldownSeconds: number;
  assetName?: string;
  chatTitle?: string;
  browserMode: BrowserMode;
  cdpUrl: string;
  browserChannel?: string;
  profileDir: string;
  dryRun: boolean;
  force: boolean;
}

export function createSafeAssetSlug(value: string, fallback = "ember-image"): string {
  const slug = slugify(value);
  return slug || fallback;
}

export function createTimestampSlug(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function enforceMaxAttempts(value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("max-attempts must be an integer from 1 to 3.");
  }
  if (value > 3) {
    throw new Error("max-attempts is capped at 3 for supervised Broke Mode.");
  }
  return value;
}

export function defaultBrokeModeOptions(prompt: string): BrokeModeRuntimeOptions {
  return {
    prompt,
    rawPrompt: false,
    referenceImages: ["auto"],
    referenceImageRoot: "Ember's Adventures/EtD Images",
    outputFolder: imageOutputFolders.pendingReview,
    autoSubmit: false,
    maxAttempts: 1,
    cooldownSeconds: 120,
    generationTimeoutMs: 180000,
    pollIntervalMs: 15000,
    recoverOnly: false,
    browserMode: "existing",
    cdpUrl: "http://127.0.0.1:9222",
    profileDir: ".cache/playwright-chatgpt-profile",
    dryRun: false,
    force: false
  };
}

export async function ensureImageOutputFolders(rootDir?: string): Promise<void> {
  const root = repoRoot(rootDir);
  await Promise.all(Object.values(imageOutputFolders).map((folder) => mkdir(join(root, folder), { recursive: true })));
}

export function resolveRepoPath(relativeOrAbsolute: string, rootDir?: string): string {
  const root = repoRoot(rootDir);
  return join(root, relativeOrAbsolute);
}

export async function assertPromptFile(promptPath: string, rootDir?: string): Promise<string> {
  const root = repoRoot(rootDir);
  const absolute = join(root, promptPath);
  if (!existsSync(absolute)) {
    throw new Error(`Prompt file does not exist: ${promptPath}`);
  }
  return readFile(absolute, "utf8");
}

async function writeSafeAbsolute(absolutePath: string, content: string | Buffer, force = false): Promise<void> {
  if (existsSync(absolutePath) && !force) {
    throw new Error(`File already exists: ${absolutePath}. Re-run with --force to overwrite.`);
  }
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);
}

export async function saveAttemptMetadata(metadata: ImageAttemptMetadata, options: ImageWriteOptions = {}): Promise<string> {
  const root = repoRoot(options.rootDir);
  const outputFolder = options.outputFolder ?? imageOutputFolders.pendingReview;
  const relative = `${outputFolder}/${metadata.assetSlug}-${metadata.timestamp}-metadata.json`;
  const absolute = join(root, relative);
  await writeSafeAbsolute(absolute, `${JSON.stringify(metadata, null, 2)}\n`, options.force);
  return toRepoRelative(root, absolute);
}

export async function savePromptCopy(promptPath: string, assetSlug: string, timestamp: string, options: ImageWriteOptions = {}): Promise<string> {
  const root = repoRoot(options.rootDir);
  const source = join(root, promptPath);
  const outputFolder = options.outputFolder ?? imageOutputFolders.pendingReview;
  const relative = `${outputFolder}/${assetSlug}-${timestamp}-prompt.md`;
  const absolute = join(root, relative);
  if (existsSync(absolute) && !options.force) {
    throw new Error(`File already exists: ${relative}. Re-run with --force to overwrite.`);
  }
  await mkdir(dirname(absolute), { recursive: true });
  await copyFile(source, absolute);
  return toRepoRelative(root, absolute);
}

export async function saveTextArtifact(relativePath: string, content: string, options: ImageWriteOptions = {}): Promise<string> {
  const root = repoRoot(options.rootDir);
  const absolute = join(root, relativePath);
  await writeSafeAbsolute(absolute, content, options.force);
  return toRepoRelative(root, absolute);
}

export async function moveImageToApproved(imagePath: string, options: ImageWriteOptions = {}): Promise<string> {
  const root = repoRoot(options.rootDir);
  const source = join(root, imagePath);
  const relative = `${imageOutputFolders.approved}/${basename(imagePath)}`;
  const target = join(root, relative);
  if (existsSync(target) && !options.force) {
    throw new Error(`File already exists: ${relative}. Re-run with --force to overwrite.`);
  }
  await mkdir(dirname(target), { recursive: true });
  await rename(source, target);
  return toRepoRelative(root, target);
}

export async function archiveFailedAttempt(params: {
  assetSlug: string;
  timestamp: string;
  promptCopyPath?: string;
  metadataPath?: string;
  qaReportPath?: string;
  imagePath?: string;
  screenshotPath?: string;
  failureReason: string;
}, options: ImageWriteOptions = {}): Promise<string[]> {
  const root = repoRoot(options.rootDir);
  const archiveRelative = `${imageOutputFolders.failed}/${params.assetSlug}-${params.timestamp}`;
  const archiveAbsolute = join(root, archiveRelative);
  await mkdir(archiveAbsolute, { recursive: true });

  const paths = [params.promptCopyPath, params.metadataPath, params.qaReportPath, params.imagePath, params.screenshotPath].filter(Boolean) as string[];
  const archived: string[] = [];
  for (const relativePath of paths) {
    const source = join(root, relativePath);
    if (!existsSync(source)) continue;
    const targetRelative = `${archiveRelative}/${basename(relativePath)}`;
    const target = join(root, targetRelative);
    if (existsSync(target) && !options.force) {
      throw new Error(`File already exists: ${targetRelative}. Re-run with --force to overwrite.`);
    }
    await rename(source, target);
    archived.push(toRepoRelative(root, target));
  }

  const failureRelative = `${archiveRelative}/failure-reason.md`;
  await writeSafeAbsolute(join(root, failureRelative), `# Failure Reason\n\n${params.failureReason}\n`, options.force);
  archived.push(failureRelative);
  return archived;
}

export function safeImageFileName(assetSlug: string, timestamp: string, extension = ".png"): string {
  const cleanExtension = extname(`x${extension}`).replace(/[^.a-z0-9]/gi, "").toLowerCase() || ".png";
  return `${assetSlug}-${timestamp}${cleanExtension}`;
}

export async function imageReviewCli(args: string[] = process.argv.slice(2)): Promise<void> {
  const fileIndex = args.indexOf("--file");
  const file = fileIndex >= 0 ? args[fileIndex + 1] : process.env.npm_config_file;
  if (!file) {
    throw new Error("Usage: npm run image:review -- --file <pending-image-path> [--approve|--fail]");
  }
  const force = args.includes("--force") || /^(true|1|yes)$/i.test(process.env.npm_config_force ?? "");
  if (args.includes("--approve") || /^(true|1|yes)$/i.test(process.env.npm_config_approve ?? "")) {
    const moved = await moveImageToApproved(file, { force });
    console.log(JSON.stringify({ ok: true, status: "approved", file: moved }, null, 2));
    return;
  }
  if (args.includes("--fail") || /^(true|1|yes)$/i.test(process.env.npm_config_fail ?? "")) {
    const assetSlug = createSafeAssetSlug(basename(file, extname(file)));
    const timestamp = createTimestampSlug();
    const archived = await archiveFailedAttempt({ assetSlug, timestamp, imagePath: file, failureReason: "Marked failed by manual review." }, { force });
    console.log(JSON.stringify({ ok: true, status: "failed", files: archived }, null, 2));
    return;
  }
  console.log(JSON.stringify({ ok: true, status: "pending-manual-review", file }, null, 2));
}

const invokedPath = process.argv[1] ? join(process.cwd(), process.argv[1]) : "";
if (invokedPath.endsWith("src\\core\\image-file-manager.ts") || invokedPath.endsWith("src/core/image-file-manager.ts")) {
  imageReviewCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
