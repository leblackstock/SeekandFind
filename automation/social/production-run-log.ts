import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface ProductionRunLogEntry {
  timestamp?: string;
  workflowName: string;
  summary: string;
  inputs: string[];
  assumptions: string[];
  outputsCreated: string[];
  warnings: string[];
  qaResult: string;
  nextManualStep: string;
}

const productionStatusPath = "content/workflows/book-01/production-status.md";

function pad(value: number): string {
  return String(Math.trunc(Math.abs(value))).padStart(2, "0");
}

export function localIsoWithOffset(date = new Date()): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
    sign,
    pad(Math.trunc(Math.abs(offsetMinutes) / 60)),
    ":",
    pad(Math.abs(offsetMinutes) % 60)
  ].join("");
}

function sessionLogPath(timestamp: string): string {
  return `content/outputs/session-logs/${timestamp.slice(0, 10)}-session.md`;
}

function listLines(label: string, values: string[]): string[] {
  return [`- ${label}: ${values.length ? values.join("; ") : "None."}`];
}

export async function appendProductionRunLog(entry: ProductionRunLogEntry): Promise<{
  production_status_path: string;
  session_log_path: string;
}> {
  const timestamp = entry.timestamp ?? localIsoWithOffset();
  const statusLine = `- ${timestamp} - ${entry.workflowName}: ${entry.summary} Next: ${entry.nextManualStep}`;
  const absoluteStatusPath = join(process.cwd(), productionStatusPath);
  const currentStatus = await readFile(absoluteStatusPath, "utf8").catch(() => [
    "# Book 1 Production Status",
    "",
    "This file is updated by `ember-content-studio` generator runs. It records generated automation outputs and next manual steps. It is not a substitute for final human approval.",
    ""
  ].join("\n"));
  const statusText = currentStatus.endsWith("\n")
    ? `${currentStatus}${statusLine}\n`
    : `${currentStatus}\n${statusLine}\n`;
  await mkdir(dirname(absoluteStatusPath), { recursive: true });
  await writeFile(absoluteStatusPath, statusText, "utf8");

  const logPath = sessionLogPath(timestamp);
  const absoluteLogPath = join(process.cwd(), logPath);
  const existingLog = await readFile(absoluteLogPath, "utf8").catch(() => `# ${timestamp.slice(0, 10)} Session Log\n`);
  const block = [
    "",
    `## ${timestamp} - ${entry.workflowName}`,
    "",
    ...listLines("Workflow name", [entry.workflowName]),
    ...listLines("Inputs", entry.inputs),
    ...listLines("Assumptions", entry.assumptions),
    ...listLines("Outputs created", entry.outputsCreated),
    ...listLines("Warnings", entry.warnings),
    `- QA result: ${entry.qaResult}`,
    `- Next manual step: ${entry.nextManualStep}`,
    ""
  ].join("\n");
  await mkdir(dirname(absoluteLogPath), { recursive: true });
  await writeFile(absoluteLogPath, `${existingLog.trimEnd()}\n${block}`, "utf8");

  return {
    production_status_path: productionStatusPath,
    session_log_path: logPath
  };
}
