import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const defaultQueuePath = "content/social/campaigns/book-01/queue.json";
const defaultDownloadsDir = "C:/Users/outdo/Downloads";
const defaultFolderName = "ember-approved-social-stills";

interface SocialQueue {
  posts: SocialQueuePost[];
}

interface SocialQueuePost {
  post_id: string;
  campaign_day: number;
  status: string;
  media_assets?: string[];
}

interface CopyApprovedSocialStillOptions {
  rootDir?: string;
  queuePath?: string;
  downloadsDir?: string;
  folderName?: string;
  fromDay?: number;
  toDay?: number;
  day?: number;
  dryRun?: boolean;
}

interface CopiedSocialStill {
  day: number;
  post_id: string;
  status: string;
  source: string;
  copied: string;
}

interface SkippedSocialStill {
  day: number;
  post_id: string;
  reason: string;
}

interface CopyApprovedSocialStillResult {
  ok: boolean;
  output_folder: string;
  copied_count: number;
  copied: CopiedSocialStill[];
  skipped: SkippedSocialStill[];
  queue_path: string;
  manifest_path: string;
  readme_path: string;
  dry_run: boolean;
  day_range: {
    from: number;
    to: number;
  };
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

function parseDay(value: string | undefined, label: string): number | undefined {
  if (!value) return undefined;
  const match = value.match(/\d+/);
  if (!match) throw new Error(`Invalid ${label}: ${value}`);
  const day = Number.parseInt(match[0], 10);
  if (!Number.isFinite(day) || day < 1) throw new Error(`Invalid ${label}: ${value}`);
  return day;
}

export function parseCopyApprovedSocialStillArgs(
  args: string[] = process.argv.slice(2)
): CopyApprovedSocialStillOptions {
  const day = parseDay(option(args, "day"), "day");
  return {
    queuePath: option(args, "queue") ?? option(args, "queue-path"),
    downloadsDir: option(args, "downloads-dir"),
    folderName: option(args, "folder-name"),
    fromDay: day ?? parseDay(option(args, "from-day"), "from-day"),
    toDay: day ?? parseDay(option(args, "to-day"), "to-day"),
    day,
    dryRun: flag(args, "dry-run")
  };
}

async function readQueue(path: string, root: string): Promise<SocialQueue> {
  const parsed = JSON.parse(await readFile(join(root, path), "utf8")) as SocialQueue;
  if (!Array.isArray(parsed.posts)) throw new Error(`Social queue has no posts array: ${path}`);
  return parsed;
}

function outputFolder(options: CopyApprovedSocialStillOptions): string {
  return resolve(options.downloadsDir ?? defaultDownloadsDir, options.folderName ?? defaultFolderName);
}

function firstApprovedPng(post: SocialQueuePost): string | undefined {
  return post.media_assets?.find((asset) => (
    normalizePath(asset).startsWith("content/outputs/images/approved/")
    && normalizePath(asset).toLowerCase().endsWith(".png")
  ));
}

function copiedFileName(day: number, source: string): string {
  const normalizedSource = normalizePath(source);
  const extension = extname(normalizedSource);
  const sourceName = basename(normalizedSource, extension).replace(/^book-1-/, "");
  return `day-${String(day).padStart(2, "0")}-${sourceName}${extension}`;
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

function renderReadme(result: Omit<CopyApprovedSocialStillResult, "readme_path">): string {
  const lines = [
    "# Ember Approved Social Stills",
    "",
    `Created: ${new Date().toISOString()}`,
    "",
    "These are copies of approved text-bearing social stills from the canonical Book 1 social queue. Original source files were not moved or edited. Re-running the tool refreshes this same folder.",
    "",
    `Day range: ${String(result.day_range.from).padStart(2, "0")}-${String(result.day_range.to).padStart(2, "0")}`,
    `Copied count: ${result.copied_count}`,
    "",
    "## Copied",
    ""
  ];

  if (result.copied.length === 0) {
    lines.push("- None");
  } else {
    for (const item of result.copied) {
      lines.push(`- Day ${String(item.day).padStart(2, "0")} ${item.post_id}: ${basename(item.copied)}`);
    }
  }

  if (result.skipped.length > 0) {
    lines.push("", "## Skipped", "");
    for (const item of result.skipped) {
      lines.push(`- Day ${String(item.day).padStart(2, "0")} ${item.post_id}: ${item.reason}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export async function copyApprovedSocialStills(
  options: CopyApprovedSocialStillOptions = {}
): Promise<CopyApprovedSocialStillResult> {
  const root = repoRoot(options.rootDir);
  const queuePath = normalizePath(options.queuePath ?? defaultQueuePath);
  const fromDay = options.day ?? options.fromDay ?? 3;
  const toDay = options.day ?? options.toDay ?? 12;
  if (fromDay > toDay) throw new Error(`Invalid day range: ${fromDay}-${toDay}`);

  const targetFolder = outputFolder(options);
  const queue = await readQueue(queuePath, root);
  const copied: CopiedSocialStill[] = [];
  const skipped: SkippedSocialStill[] = [];
  await clearPreviousCopyFolder(targetFolder, Boolean(options.dryRun));

  const posts = queue.posts
    .filter((post) => post.campaign_day >= fromDay && post.campaign_day <= toDay)
    .sort((left, right) => left.campaign_day - right.campaign_day);

  for (const post of posts) {
    const source = firstApprovedPng(post);
    if (!source) {
      skipped.push({ day: post.campaign_day, post_id: post.post_id, reason: "missing approved PNG media asset" });
      continue;
    }

    const normalizedSource = normalizePath(source);
    const sourceAbsolutePath = join(root, normalizedSource);
    if (!existsSync(sourceAbsolutePath)) {
      skipped.push({ day: post.campaign_day, post_id: post.post_id, reason: `missing source asset: ${normalizedSource}` });
      continue;
    }

    const copiedPath = join(targetFolder, copiedFileName(post.campaign_day, normalizedSource));
    if (!options.dryRun) {
      await mkdir(dirname(copiedPath), { recursive: true });
      await copyFile(sourceAbsolutePath, copiedPath);
    }

    copied.push({
      day: post.campaign_day,
      post_id: post.post_id,
      status: post.status,
      source: normalizedSource,
      copied: normalizePath(copiedPath)
    });
  }

  const manifestPath = normalizePath(join(targetFolder, "copy-manifest.json"));
  const readmePath = normalizePath(join(targetFolder, "README.md"));
  const resultWithoutReadme = {
    ok: true,
    output_folder: normalizePath(targetFolder),
    copied_count: copied.length,
    copied,
    skipped,
    queue_path: queuePath,
    manifest_path: manifestPath,
    dry_run: Boolean(options.dryRun),
    day_range: { from: fromDay, to: toDay }
  };
  const result: CopyApprovedSocialStillResult = {
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
  const result = await copyApprovedSocialStills(parseCopyApprovedSocialStillArgs());
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
  process.exit(process.exitCode ?? 0);
}
