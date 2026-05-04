import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { repoRoot } from "../config.js";
import { GenerateResult } from "../types.js";
import { datedSessionLogName } from "./naming.js";

export interface SessionEntry {
  workflow: string;
  inputs: unknown;
  assumptions: string[];
  outputsCreated: string[];
  warnings: string[];
  qaResult: string;
  nextManualStep: string;
}

export async function appendSessionLog(entry: SessionEntry, rootDir?: string): Promise<string> {
  const root = repoRoot(rootDir);
  const relative = `content/outputs/session-logs/${datedSessionLogName()}`;
  const absolute = join(root, relative);
  await mkdir(dirname(absolute), { recursive: true });

  const text = [
    `\n## ${new Date().toISOString()} - ${entry.workflow}`,
    "",
    `- Inputs: \`${JSON.stringify(entry.inputs)}\``,
    `- Assumptions: ${entry.assumptions.length ? entry.assumptions.join("; ") : "None"}`,
    `- Outputs created: ${entry.outputsCreated.length ? entry.outputsCreated.join(", ") : "None"}`,
    `- Warnings: ${entry.warnings.length ? entry.warnings.join("; ") : "None"}`,
    `- QA result: ${entry.qaResult}`,
    `- Next manual step: ${entry.nextManualStep}`,
    ""
  ].join("\n");

  if (!existsSync(absolute)) {
    await writeFile(absolute, `# Ember Content Studio Session Log\n`, "utf8");
  }
  await appendFile(absolute, text, "utf8");
  return relative;
}

export async function updateProductionStatus(result: GenerateResult, rootDir?: string): Promise<string> {
  const root = repoRoot(rootDir);
  const relative = "content/workflows/book-01/production-status.md";
  const absolute = join(root, relative);
  await mkdir(dirname(absolute), { recursive: true });

  let current = "# Book 1 Production Status\n\n";
  if (existsSync(absolute)) {
    current = await readFile(absolute, "utf8");
  }

  const line = `- ${new Date().toISOString()} - ${result.workflow}: ${result.summary} Files: ${result.files.join(", ")} Next: ${result.nextStep}\n`;
  await writeFile(absolute, `${current.trimEnd()}\n${line}`, "utf8");
  return relative;
}
