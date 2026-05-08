import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const defaultCdpUrl = "http://127.0.0.1:9222";
const defaultTimeoutMs = 180000;

interface CliOptions {
  cdpUrl: string;
  timeoutMs: number;
}

interface HandoffTask {
  platform?: unknown;
  idempotency_key?: unknown;
  board_name?: unknown;
}

interface HandoffResult {
  ok?: unknown;
  mode?: unknown;
  message?: unknown;
  task?: HandoffTask | null;
}

interface DryRunResult {
  ok?: unknown;
  mode?: unknown;
  platform?: unknown;
  idempotency_key?: unknown;
  evidence_path?: unknown;
  error_path?: unknown;
  stopped_before_publish?: unknown;
  actions?: unknown;
  error?: unknown;
}

function npmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function optionValue(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1];
  return undefined;
}

function parseArgs(args: string[]): CliOptions {
  const cleanArgs = args.filter((arg) => arg !== "--");
  const timeoutValue = optionValue(cleanArgs, "timeout-ms");
  return {
    cdpUrl: optionValue(cleanArgs, "cdp-url") ?? process.env.PINTEREST_CDP_URL ?? defaultCdpUrl,
    timeoutMs: timeoutValue ? Number(timeoutValue) : defaultTimeoutMs
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function parseLastJson<T>(stdout: string, label: string): T {
  const line = stdout.trim().split(/\r?\n/).reverse().find((candidate) => candidate.trim().startsWith("{"));
  if (!line) throw new Error(`${label} did not return JSON.`);
  return JSON.parse(line) as T;
}

async function runNpmJson<T>(script: string, options: { env?: NodeJS.ProcessEnv; timeoutMs: number }): Promise<T> {
  const { stdout } = await execFileAsync(npmCommand(), ["run", script, "--silent"], {
    cwd: process.cwd(),
    env: { ...process.env, ...options.env },
    shell: process.platform === "win32",
    maxBuffer: 1024 * 1024,
    timeout: options.timeoutMs
  });
  return parseLastJson<T>(stdout, script);
}

function printRecoveryCommand(idempotencyKey: string, evidencePath: string, cdpUrl: string): void {
  console.log("");
  console.log("After Pinterest shows \"You created a Pin,\" run:");
  console.log("");
  console.log("PowerShell command:");
  console.log(`$env:PINTEREST_CDP_URL="${cdpUrl}"`);
  console.log(`npm run social:pinterest-recover-result -- --idempotency-key ${idempotencyKey} --evidence-path "${evidencePath}"`);
  console.log("Remove-Item Env:PINTEREST_CDP_URL");
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const handoff = await runNpmJson<HandoffResult>("social:handoff", { timeoutMs: 30000 });

  if (handoff.ok !== true) {
    console.log(`Pinterest supervised flow failed: ${asString(handoff.message) ?? "social:handoff failed."}`);
    process.exitCode = 1;
    return;
  }

  if (handoff.mode === "empty" || !handoff.task) {
    console.log(asString(handoff.message) ?? "No ready platform tasks found.");
    return;
  }

  const platform = asString(handoff.task.platform);
  if (platform?.toLowerCase() !== "pinterest") {
    console.log(`Next ready task is ${platform ?? "unknown"}, not Pinterest. No browser action taken.`);
    process.exitCode = 1;
    return;
  }

  const idempotencyKey = asString(handoff.task.idempotency_key);
  const boardName = asString(handoff.task.board_name);
  if (!idempotencyKey) {
    console.log("Pinterest supervised flow failed: handoff task is missing idempotency_key.");
    process.exitCode = 1;
    return;
  }

  const dryRun = await runNpmJson<DryRunResult>("social:dry-run-post", {
    env: { PINTEREST_CDP_URL: options.cdpUrl },
    timeoutMs: options.timeoutMs
  });

  const evidencePath = asString(dryRun.evidence_path);
  const errorPath = asString(dryRun.error_path);

  if (dryRun.ok !== true) {
    console.log("Pinterest supervised flow failed during dry-run.");
    console.log(`Task: ${idempotencyKey}`);
    if (errorPath) console.log(`Error proof: ${errorPath}`);
    if (asString(dryRun.error)) console.log(`Error: ${asString(dryRun.error)}`);
    process.exitCode = 1;
    return;
  }

  if (asString(dryRun.idempotency_key) !== idempotencyKey) {
    console.log("Pinterest supervised flow failed: dry-run task did not match handoff task.");
    console.log(`Handoff task: ${idempotencyKey}`);
    console.log(`Dry-run task: ${asString(dryRun.idempotency_key) ?? "unknown"}`);
    process.exitCode = 1;
    return;
  }

  if (!evidencePath) {
    console.log("Pinterest supervised flow failed: dry-run did not return an evidence screenshot path.");
    process.exitCode = 1;
    return;
  }

  console.log("Prepared task:");
  console.log(`- Idempotency key: ${idempotencyKey}`);
  console.log(`- Platform: ${asString(dryRun.platform) ?? "Pinterest"}`);
  console.log(`- Board selected: ${boardName ?? "unknown"}`);
  console.log(`- Evidence screenshot: ${evidencePath}`);
  console.log("");
  console.log("STOP: Review the open Pinterest composer, then manually click Publish.");
  printRecoveryCommand(idempotencyKey, evidencePath, options.cdpUrl);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Pinterest supervised flow failed: ${message}`);
    process.exitCode = 1;
  });
}
