import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../config.js";

export interface CanonBundle {
  ember: string;
  book: string;
  style: string;
  noReadableText: string;
}

async function readIfExists(root: string, relativePath: string): Promise<string> {
  const absolute = join(root, relativePath);
  return existsSync(absolute) ? readFile(absolute, "utf8") : "";
}

export async function loadCanonBundle(rootDir?: string): Promise<CanonBundle> {
  const root = repoRoot(rootDir);
  return {
    ember: await readIfExists(root, "content/canon/ember-character-canon.md"),
    book: await readIfExists(root, "content/canon/book-01-sparkleflame-canon.md"),
    style: await readIfExists(root, "content/canon/visual-style-guide.md"),
    noReadableText: await readIfExists(root, "content/canon/no-readable-text-policy.md")
  };
}

export function canonAsPromptBlock(canon: CanonBundle): string {
  return [
    "## Canon To Preserve",
    canon.ember,
    canon.book,
    canon.style,
    canon.noReadableText
  ].filter(Boolean).join("\n\n");
}
