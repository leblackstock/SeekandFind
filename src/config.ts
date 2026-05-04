import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv();

export const DEFAULT_BOOK_TITLE = "Ember and the Sparkleflame Festival Search";
export const DEFAULT_AGE_RANGE = "5-8";
export const DEFAULT_STYLE = "soft rounded 2.25D children's storybook";

export function repoRoot(rootDir?: string): string {
  return rootDir ? path.resolve(rootDir) : process.cwd();
}

export function localApiPort(): number {
  const raw = process.env.LOCAL_API_PORT ?? "3333";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 3333;
}

export function toRepoRelative(rootDir: string, absolutePath: string): string {
  return path.relative(rootDir, absolutePath).replaceAll(path.sep, "/");
}
