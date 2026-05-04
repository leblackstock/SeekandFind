import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { repoRoot, toRepoRelative } from "../config.js";

export interface SafeWriteOptions {
  rootDir?: string;
  force?: boolean;
}

export async function writeTextFileSafe(relativePath: string, content: string, options: SafeWriteOptions = {}): Promise<string> {
  const root = repoRoot(options.rootDir);
  const absolute = join(root, relativePath);

  if (existsSync(absolute) && !options.force) {
    throw new Error(`File already exists: ${relativePath}. Re-run with --force to overwrite.`);
  }

  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content, "utf8");
  return toRepoRelative(root, absolute);
}

export async function ensureDirectory(relativePath: string, rootDir?: string): Promise<void> {
  await mkdir(join(repoRoot(rootDir), relativePath), { recursive: true });
}
