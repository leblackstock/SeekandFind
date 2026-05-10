import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const defaultManifestPath = "content/outputs/videos/batches/book-01-short-video-batch-2026-05-08/start-end-frames/start-end-frame-manifest.json";
const defaultApprovedEndFrameDir = "content/outputs/images/approved/start-end-frames/book-01";
const defaultDownloadsDir = "C:/Users/outdo/Downloads";
const defaultFolderName = "ember-unapproved-start-end-frames";
const defaultApprovedFolderName = "ember-approved-start-end-frames";
type CopyMode = "unapproved" | "approved";

interface StartEndFrameRecord {
  day: number;
  slug: string;
  start_frame: string;
  expected_end_frame: string;
}

interface StartEndFrameManifest {
  records: StartEndFrameRecord[];
}

interface CopyOptions {
  rootDir?: string;
  manifestPath?: string;
  approvedEndFrameDir?: string;
  downloadsDir?: string;
  folderName?: string;
  dryRun?: boolean;
  mode?: CopyMode;
}

interface CopiedFrameSet {
  day: number;
  slug: string;
  source_start_frame: string;
  source_end_frame: string;
  copied_start_frame: string;
  copied_end_frame: string;
}

interface SkippedFrameSet {
  day: number;
  slug: string;
  reason: string;
}

interface CopyResult {
  ok: boolean;
  output_folder: string;
  copied_count: number;
  copied: CopiedFrameSet[];
  skipped: SkippedFrameSet[];
  manifest_path: string;
  readme_path: string;
  dry_run: boolean;
  mode: CopyMode;
}

function repoRoot(input?: string): string {
  return input ? resolve(input) : process.cwd();
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}

function option(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1];
  return undefined;
}

function flag(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}

export function parseCopyUnapprovedFrameArgs(args: string[] = process.argv.slice(2)): CopyOptions {
  const explicitMode = option(args, "mode");
  return {
    manifestPath: option(args, "manifest") ?? option(args, "manifest-path"),
    approvedEndFrameDir: option(args, "approved-dir") ?? option(args, "approved-end-frame-dir"),
    downloadsDir: option(args, "downloads-dir"),
    folderName: option(args, "folder-name"),
    dryRun: flag(args, "dry-run"),
    mode: explicitMode === "approved" || flag(args, "approved") || flag(args, "only-approved")
      ? "approved"
      : "unapproved"
  };
}

async function readManifest(path: string, root: string): Promise<StartEndFrameManifest> {
  const fullPath = join(root, path);
  const parsed = JSON.parse(await readFile(fullPath, "utf8")) as StartEndFrameManifest;
  if (!Array.isArray(parsed.records)) throw new Error(`Start/end frame manifest has no records array: ${path}`);
  return parsed;
}

function approvedEndFramePath(record: StartEndFrameRecord, approvedEndFrameDir: string): string {
  return normalizePath(`${approvedEndFrameDir}/${record.slug}/${record.slug}-end-frame-v01.png`);
}

function sourceExists(root: string, relativePath: string): boolean {
  return existsSync(join(root, relativePath));
}

function outputFolder(options: CopyOptions): string {
  const downloadsDir = options.downloadsDir ?? defaultDownloadsDir;
  const folderName = options.folderName ?? (options.mode === "approved" ? defaultApprovedFolderName : defaultFolderName);
  return resolve(downloadsDir, folderName);
}

async function copyFrame(root: string, sourceRelativePath: string, destinationAbsolutePath: string, dryRun: boolean): Promise<void> {
  if (dryRun) return;
  await mkdir(dirname(destinationAbsolutePath), { recursive: true });
  await copyFile(join(root, sourceRelativePath), destinationAbsolutePath);
}

async function clearPreviousCopyFolder(targetFolder: string, dryRun: boolean): Promise<void> {
  if (dryRun || !existsSync(targetFolder)) return;
  const entries = await readdir(targetFolder, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    if (!entry.name.endsWith(".png") && entry.name !== "copy-manifest.json" && entry.name !== "README.md") continue;
    await rm(join(targetFolder, entry.name), { force: true });
  }
}

function renderReadme(result: Omit<CopyResult, "readme_path">): string {
  const title = result.mode === "approved"
    ? "# Ember Approved Start/End Frames"
    : "# Ember Unapproved Start/End Frames";
  const lines = [
    title,
    "",
    `Created: ${new Date().toISOString()}`,
    "",
    "These are copies for review/use outside the repo. Original source files were not moved or edited. Re-running the tool refreshes this same folder.",
    "",
    `Copied day count: ${result.copied_count}`,
    "",
    "## Copied",
    ""
  ];

  if (result.copied.length === 0) {
    lines.push("- None");
  } else {
    for (const item of result.copied) {
      lines.push(`- Day ${String(item.day).padStart(2, "0")} ${item.slug}`);
      lines.push(`  - start: ${basename(item.copied_start_frame)}`);
      lines.push(`  - end: ${basename(item.copied_end_frame)}`);
    }
  }

  if (result.skipped.length > 0) {
    lines.push("", "## Skipped", "");
    for (const item of result.skipped) {
      lines.push(`- Day ${String(item.day).padStart(2, "0")} ${item.slug}: ${item.reason}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export async function copyUnapprovedStartEndFrames(options: CopyOptions = {}): Promise<CopyResult> {
  const root = repoRoot(options.rootDir);
  const mode = options.mode ?? "unapproved";
  const manifestPath = normalizePath(options.manifestPath ?? defaultManifestPath);
  const approvedEndFrameDir = normalizePath(options.approvedEndFrameDir ?? defaultApprovedEndFrameDir);
  const targetFolder = outputFolder({ ...options, mode });
  const manifest = await readManifest(manifestPath, root);
  const copied: CopiedFrameSet[] = [];
  const skipped: SkippedFrameSet[] = [];
  await clearPreviousCopyFolder(targetFolder, Boolean(options.dryRun));

  for (const record of manifest.records) {
    const startFrame = normalizePath(record.start_frame);
    const endFrame = normalizePath(record.expected_end_frame);
    const approvedEndFrame = approvedEndFramePath(record, approvedEndFrameDir);
    const sourceEndFrame = mode === "approved" ? approvedEndFrame : endFrame;

    if (mode === "unapproved" && sourceExists(root, approvedEndFrame)) {
      skipped.push({ day: record.day, slug: record.slug, reason: "end frame already approved" });
      continue;
    }
    if (mode === "approved" && !sourceExists(root, approvedEndFrame)) {
      skipped.push({ day: record.day, slug: record.slug, reason: `missing approved end frame: ${approvedEndFrame}` });
      continue;
    }
    if (!sourceExists(root, startFrame)) {
      skipped.push({ day: record.day, slug: record.slug, reason: `missing start frame: ${startFrame}` });
      continue;
    }
    if (!sourceExists(root, sourceEndFrame)) {
      const endFrameLabel = mode === "approved" ? "approved" : "pending-review";
      skipped.push({ day: record.day, slug: record.slug, reason: `missing ${endFrameLabel} end frame: ${sourceEndFrame}` });
      continue;
    }

    const copiedStart = join(targetFolder, `${record.slug}-start-frame.png`);
    const copiedEnd = join(targetFolder, `${record.slug}-end-frame-v01.png`);
    await copyFrame(root, startFrame, copiedStart, Boolean(options.dryRun));
    await copyFrame(root, sourceEndFrame, copiedEnd, Boolean(options.dryRun));
    copied.push({
      day: record.day,
      slug: record.slug,
      source_start_frame: startFrame,
      source_end_frame: sourceEndFrame,
      copied_start_frame: normalizePath(copiedStart),
      copied_end_frame: normalizePath(copiedEnd)
    });
  }

  const manifestOutputPath = normalizePath(join(targetFolder, "copy-manifest.json"));
  const readmePath = normalizePath(join(targetFolder, "README.md"));
  const resultWithoutReadme = {
    ok: true,
    output_folder: normalizePath(targetFolder),
    copied_count: copied.length,
    copied,
    skipped,
    manifest_path: manifestOutputPath,
    dry_run: Boolean(options.dryRun),
    mode
  };
  const result: CopyResult = {
    ...resultWithoutReadme,
    readme_path: readmePath
  };

  if (!options.dryRun) {
    await mkdir(targetFolder, { recursive: true });
    await writeFile(join(targetFolder, "copy-manifest.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
    await writeFile(join(targetFolder, "README.md"), renderReadme(resultWithoutReadme), "utf8");
  }

  return result;
}

async function main(): Promise<void> {
  const result = await copyUnapprovedStartEndFrames(parseCopyUnapprovedFrameArgs());
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
  process.exit(process.exitCode ?? 0);
}
