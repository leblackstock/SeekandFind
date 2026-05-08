import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "@playwright/test";
import { validateSocialQueue } from "./validate-queue.js";

/*
PowerShell:
$env:PINTEREST_CDP_URL="http://127.0.0.1:9222"
npm run social:pinterest-auto-publish -- --yes-publish
npm run social:pinterest-auto-publish -- --yes-publish --max 3
Remove-Item Env:PINTEREST_CDP_URL
*/

const execFileAsync = promisify(execFile);
const defaultCdpUrl = "http://127.0.0.1:9222";
const defaultTimeoutMs = 240000;
const maxBatchCap = 3;
const betweenPostDelayMs = 12000;

interface CliOptions {
  cdpUrl: string;
  timeoutMs: number;
  yesPublish: boolean;
  requestedMax: number;
  max: number;
}

interface HandoffTask {
  platform?: unknown;
  status?: unknown;
  idempotency_key?: unknown;
  board_name?: unknown;
  media_assets?: unknown;
  caption_source?: unknown;
}

interface HandoffResult {
  ok?: unknown;
  mode?: unknown;
  task?: HandoffTask | null;
  message?: unknown;
}

interface DryRunResult {
  ok?: unknown;
  platform?: unknown;
  idempotency_key?: unknown;
  evidence_path?: unknown;
  error_path?: unknown;
  actions?: unknown;
  error?: unknown;
}

interface RecoveryResult {
  ok?: unknown;
  idempotency_key?: unknown;
  posted_url?: unknown;
  evidence_path?: unknown;
  validation_ok?: unknown;
  error_path?: unknown;
  error?: unknown;
  message?: unknown;
}

interface ComposerVerification {
  mediaPresent: boolean;
  titleFilled: boolean;
  descriptionFilled: boolean;
  boardMatches: boolean;
  boardText: string | null;
  details: string[];
}

interface PublishResult {
  ok: boolean;
  idempotency_key: string | null;
  board_name: string | null;
  posted_url: string | null;
  pre_publish_evidence_path: string | null;
  post_publish_evidence_path: string | null;
  validation_passed: boolean;
  error?: string;
  publish_clicked?: boolean;
  manual_recovery_command?: string[] | null;
  old_status?: string | null;
  new_status?: string | null;
}

interface BatchSummary {
  ok: boolean;
  requested_max: number;
  max_used: number;
  actual_attempted: number;
  successful_posted_count: number;
  stopped_reason: string;
  posted_urls: string[];
  failed_idempotency_key: string | null;
  results: PublishResult[];
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

function hasFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`) || process.env[`npm_config_${name.replaceAll("-", "_")}`] === "true";
}

function npmConfigValue(name: string): string | undefined {
  return process.env[`npm_config_${name.replaceAll("-", "_")}`];
}

function maxValue(args: string[]): string | undefined {
  const explicit = optionValue(args, "max");
  if (explicit !== undefined) return explicit;

  const envValue = npmConfigValue("max");
  if (envValue && envValue !== "true" && envValue !== "false") return envValue;

  // npm on Windows consumes `--max N` as its own `maxsockets` config before
  // forwarding script args. Treat that value as this command's batch max.
  const npmMaxSockets = process.env.npm_config_maxsockets;
  if (npmMaxSockets && /^\d+$/.test(npmMaxSockets)) return npmMaxSockets;

  if (envValue === "true") {
    return args.find((arg) => !arg.startsWith("--") && /^\d+$/.test(arg));
  }

  return undefined;
}

function parseArgs(args: string[]): CliOptions {
  const cleanArgs = args.filter((arg) => arg !== "--");
  const timeoutValue = optionValue(cleanArgs, "timeout-ms");
  const rawMax = maxValue(cleanArgs);
  const requestedMax = rawMax === undefined ? 1 : Number(rawMax);
  return {
    cdpUrl: optionValue(cleanArgs, "cdp-url") ?? process.env.PINTEREST_CDP_URL ?? defaultCdpUrl,
    timeoutMs: timeoutValue ? Number(timeoutValue) : defaultTimeoutMs,
    yesPublish: hasFlag(cleanArgs, "yes-publish"),
    requestedMax,
    max: Number.isFinite(requestedMax) ? Math.min(requestedMax, maxBatchCap) : Number.NaN
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function captionText(captionSource: unknown): string {
  if (typeof captionSource === "string") return captionSource;
  if (!captionSource || typeof captionSource !== "object") return "";

  const source = captionSource as Record<string, unknown>;
  return [source.text, source.cta]
    .map((value) => asString(value))
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

function titleText(captionSource: unknown): string {
  const firstLine = captionText(captionSource).split(/\r?\n/).find((line) => line.trim());
  return firstLine ? firstLine.slice(0, 90) : "";
}

function parseLastJson<T>(stdout: string, label: string): T {
  const line = stdout.trim().split(/\r?\n/).reverse().find((candidate) => candidate.trim().startsWith("{"));
  if (!line) throw new Error(`${label} did not return JSON.`);
  return JSON.parse(line) as T;
}

async function runNpmJson<T>(args: string[], options: { env?: NodeJS.ProcessEnv; timeoutMs: number; label: string }): Promise<T> {
  const { stdout } = await execFileAsync(npmCommand(), args, {
    cwd: process.cwd(),
    env: { ...process.env, ...options.env },
    shell: process.platform === "win32",
    maxBuffer: 1024 * 1024,
    timeout: options.timeoutMs
  });
  return parseLastJson<T>(stdout, options.label);
}

function isPinterestPage(page: Page): boolean {
  try {
    return new URL(page.url()).hostname.endsWith("pinterest.com");
  } catch {
    return false;
  }
}

async function connectPinterestPage(cdpUrl: string): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const pages = browser.contexts().flatMap((context) => context.pages()).filter(isPinterestPage);
  const page = pages.find((candidate) => /pin-builder/i.test(candidate.url()))
    ?? pages.find((candidate) => /\/pin\//i.test(candidate.url()))
    ?? pages[0];

  if (!page) {
    const disconnectable = browser as Browser & { disconnect?: () => void };
    if (typeof disconnectable.disconnect === "function") disconnectable.disconnect();
    throw new Error("No Pinterest page found in the CDP browser.");
  }

  return { browser, page };
}

async function disconnect(browser: Browser): Promise<void> {
  const disconnectable = browser as Browser & { disconnect?: () => void };
  if (typeof disconnectable.disconnect === "function") {
    disconnectable.disconnect();
    return;
  }
  await browser.close();
}

async function saveScreenshot(page: Page, path: string | null): Promise<string | null> {
  if (!path) return null;
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true, timeout: 15000 });
  return path;
}

function createPostPublishEvidencePath(prePublishPath: string): string {
  return prePublishPath.replace(/\.png$/i, "-post-publish.png");
}

function publishErrorPath(prePublishPath: string): string {
  return prePublishPath.replace(/\.png$/i, "-publish-error.png");
}

async function verifyPreparedComposer(page: Page, task: HandoffTask): Promise<ComposerVerification> {
  const expectedBoard = asString(task.board_name) ?? "";
  const expectedTitle = titleText(task.caption_source);
  const expectedDescription = captionText(task.caption_source);
  const bodyText = await page.locator("body").innerText({ timeout: 5000 });
  const normalizedBody = normalizeText(bodyText);
  const boardText = await page.locator("[data-test-id='board-dropdown-item-selected']").first()
    .innerText({ timeout: 5000 })
    .catch(() => null);

  const visibleMediaCount = await page.locator("img,video,canvas").evaluateAll((elements) => elements.filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width >= 80 && rect.height >= 80;
  }).length).catch(() => 0);

  const titleFilled = expectedTitle ? normalizedBody.includes(normalizeText(expectedTitle)) : false;
  const descriptionFilled = expectedDescription
    ? expectedDescription.split(/\r?\n/).filter((line) => line.trim()).every((line) => normalizedBody.includes(normalizeText(line)))
    : false;
  const boardMatches = Boolean(boardText) && normalizeText(boardText as string) === normalizeText(expectedBoard);

  const details: string[] = [];
  if (visibleMediaCount < 1) details.push("No visible uploaded media detected.");
  if (!titleFilled) details.push("Expected title text was not visible.");
  if (!descriptionFilled) details.push("Expected description text was not visible.");
  if (!boardMatches) details.push(`Selected board "${boardText ?? "unknown"}" did not exactly match "${expectedBoard}".`);

  return {
    mediaPresent: visibleMediaCount > 0,
    titleFilled,
    descriptionFilled,
    boardMatches,
    boardText,
    details
  };
}

async function clickPublishOnce(page: Page): Promise<void> {
  const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
  await publishButton.waitFor({ state: "visible", timeout: 10000 });
  if (!(await publishButton.isEnabled({ timeout: 5000 }))) {
    throw new Error("Pinterest Publish button is visible but disabled.");
  }
  await publishButton.click({ timeout: 10000 });
}

async function waitForPinterestSuccess(page: Page, timeoutMs: number): Promise<void> {
  await page.waitForFunction(() => {
    const body = document.body.innerText || "";
    return /you created a pin|created a pin|see your pin/i.test(body)
      || /pinterest\.com\/pin\/\d+/i.test(location.href);
  }, null, { timeout: timeoutMs });
}

function manualRecoveryCommand(idempotencyKey: string, evidencePath: string, cdpUrl: string): string[] {
  return [
    `$env:PINTEREST_CDP_URL="${cdpUrl}"`,
    `npm run social:pinterest-recover-result -- --idempotency-key ${idempotencyKey} --evidence-path "${evidencePath}"`,
    "Remove-Item Env:PINTEREST_CDP_URL"
  ];
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function publishOneReadyPinterestTask(options: CliOptions): Promise<PublishResult> {
  const handoff = await runNpmJson<HandoffResult>(["run", "social:handoff", "--silent"], {
    timeoutMs: 30000,
    label: "social:handoff"
  });

  if (handoff.ok !== true || handoff.mode !== "ready" || !handoff.task) {
    return {
      ok: false,
      idempotency_key: null,
      board_name: null,
      posted_url: null,
      pre_publish_evidence_path: null,
      post_publish_evidence_path: null,
      validation_passed: false,
      error: asString(handoff.message) ?? "No ready handoff task found."
    };
  }

  const task = handoff.task;
  const idempotencyKey = asString(task.idempotency_key);
  const boardName = asString(task.board_name);
  const platform = asString(task.platform);

  if (platform?.toLowerCase() !== "pinterest") {
    return {
      ok: false,
      idempotency_key: idempotencyKey,
      board_name: boardName,
      posted_url: null,
      pre_publish_evidence_path: null,
      post_publish_evidence_path: null,
      validation_passed: false,
      error: `Next ready task is ${platform ?? "unknown"}, not Pinterest.`
    };
  }

  const missingFields = [
    idempotencyKey ? null : "idempotency_key",
    isNonEmptyArray(task.media_assets) ? null : "media_assets",
    task.caption_source ? null : "caption_source",
    boardName ? null : "board_name"
  ].filter((field): field is string => Boolean(field));

  if (task.status !== "ready" || missingFields.length > 0 || !idempotencyKey || !boardName) {
    return {
      ok: false,
      idempotency_key: idempotencyKey,
      board_name: boardName,
      posted_url: null,
      pre_publish_evidence_path: null,
      post_publish_evidence_path: null,
      validation_passed: false,
      status: task.status ?? null,
      missing_fields: missingFields,
      error: "Pinterest task is not automation-ready."
    } as PublishResult;
  }

  const dryRun = await runNpmJson<DryRunResult>(["run", "social:dry-run-post", "--silent"], {
    env: { PINTEREST_CDP_URL: options.cdpUrl },
    timeoutMs: options.timeoutMs,
    label: "social:dry-run-post"
  });

  const prePublishEvidencePath = asString(dryRun.evidence_path);
  const dryRunErrorPath = asString(dryRun.error_path);
  if (dryRun.ok !== true || asString(dryRun.idempotency_key) !== idempotencyKey || !prePublishEvidencePath) {
    return {
      ok: false,
      idempotency_key: idempotencyKey,
      board_name: boardName,
      posted_url: null,
      pre_publish_evidence_path: prePublishEvidencePath,
      post_publish_evidence_path: null,
      validation_passed: false,
      error: asString(dryRun.error) ?? "Pinterest dry-run did not prepare the expected task.",
      error_path: dryRunErrorPath,
      publish_clicked: false
    } as PublishResult;
  }

  let publishClicked = false;
  let browser: Browser | null = null;
  let page: Page | null = null;
  try {
    const session = await connectPinterestPage(options.cdpUrl);
    browser = session.browser;
    page = session.page;
    await page.bringToFront();

    const verification = await verifyPreparedComposer(page, task);
    if (!verification.mediaPresent || !verification.titleFilled || !verification.descriptionFilled || !verification.boardMatches) {
      await saveScreenshot(page, publishErrorPath(prePublishEvidencePath)).catch(() => null);
      return {
        ok: false,
        idempotency_key: idempotencyKey,
        board_name: boardName,
        posted_url: null,
        pre_publish_evidence_path: prePublishEvidencePath,
        post_publish_evidence_path: null,
        validation_passed: false,
        publish_clicked: false,
        verification,
        error: "Prepared Pinterest composer failed pre-publish verification.",
        error_path: publishErrorPath(prePublishEvidencePath)
      } as PublishResult;
    }

    await clickPublishOnce(page);
    publishClicked = true;
    await waitForPinterestSuccess(page, options.timeoutMs);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (page) await saveScreenshot(page, publishErrorPath(prePublishEvidencePath)).catch(() => null);
    return {
      ok: false,
      idempotency_key: idempotencyKey,
      board_name: boardName,
      posted_url: null,
      pre_publish_evidence_path: prePublishEvidencePath,
      post_publish_evidence_path: null,
      validation_passed: false,
      publish_clicked: publishClicked,
      error: message,
      error_path: publishErrorPath(prePublishEvidencePath),
      manual_recovery_command: publishClicked ? manualRecoveryCommand(idempotencyKey, prePublishEvidencePath, options.cdpUrl) : null
    } as PublishResult;
  } finally {
    if (browser) await disconnect(browser).catch(() => undefined);
  }

  const recovery = await runNpmJson<RecoveryResult>([
    "run",
    "social:pinterest-recover-result",
    "--silent",
    "--",
    "--idempotency-key",
    idempotencyKey,
    "--evidence-path",
    prePublishEvidencePath
  ], {
    env: { PINTEREST_CDP_URL: options.cdpUrl },
    timeoutMs: options.timeoutMs,
    label: "social:pinterest-recover-result"
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message } as RecoveryResult;
  });

  const postedUrl = asString(recovery.posted_url);
  if (recovery.ok !== true || !postedUrl) {
    return {
      ok: false,
      idempotency_key: idempotencyKey,
      board_name: boardName,
      posted_url: postedUrl,
      validation_passed: false,
      publish_clicked: true,
      pre_publish_evidence_path: prePublishEvidencePath,
      post_publish_evidence_path: null,
      recovery_error: asString(recovery.error) ?? asString(recovery.message) ?? "Pinterest publish succeeded, but URL recovery failed.",
      manual_recovery_command: manualRecoveryCommand(idempotencyKey, prePublishEvidencePath, options.cdpUrl)
    } as PublishResult;
  }

  const postPublishEvidencePath = createPostPublishEvidencePath(prePublishEvidencePath);
  let savedPostPublishEvidencePath: string | null = null;
  const postSession = await connectPinterestPage(options.cdpUrl).catch(() => null);
  if (postSession) {
    savedPostPublishEvidencePath = await saveScreenshot(postSession.page, postPublishEvidencePath).catch(() => null);
    await disconnect(postSession.browser).catch(() => undefined);
  }

  const validation = await validateSocialQueue();
  return {
    ok: validation.ok,
    idempotency_key: idempotencyKey,
    board_name: boardName,
    posted_url: postedUrl,
    pre_publish_evidence_path: prePublishEvidencePath,
    post_publish_evidence_path: savedPostPublishEvidencePath,
    validation_passed: validation.ok,
    old_status: "ready",
    new_status: validation.ok ? "posted" : null
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!options.yesPublish) {
    console.log(JSON.stringify({
      ok: false,
      error: "Refusing to publish without --yes-publish.",
      required_command: "npm run social:pinterest-auto-publish -- --yes-publish"
    }));
    process.exitCode = 1;
    return;
  }

  if (!Number.isInteger(options.requestedMax) || options.requestedMax < 1) {
    console.log(JSON.stringify({
      ok: false,
      error: "Invalid --max. Use a positive integer from 1 to 3.",
      requested_max: Number.isFinite(options.requestedMax) ? options.requestedMax : null
    }));
    process.exitCode = 1;
    return;
  }

  const initialValidation = await validateSocialQueue();
  if (!initialValidation.ok) {
    console.log(JSON.stringify({
      ok: false,
      requested_max: options.requestedMax,
      max_used: options.max,
      actual_attempted: 0,
      successful_posted_count: 0,
      stopped_reason: "initial-validation-failed",
      posted_urls: [],
      failed_idempotency_key: null,
      errors: initialValidation.errors
    }));
    process.exitCode = 1;
    return;
  }

  const summary: BatchSummary = {
    ok: true,
    requested_max: options.requestedMax,
    max_used: options.max,
    actual_attempted: 0,
    successful_posted_count: 0,
    stopped_reason: "max-reached",
    posted_urls: [],
    failed_idempotency_key: null,
    results: []
  };

  for (let index = 0; index < options.max; index += 1) {
    const result = await publishOneReadyPinterestTask(options).catch((error: unknown): PublishResult => {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        idempotency_key: null,
        board_name: null,
        posted_url: null,
        pre_publish_evidence_path: null,
        post_publish_evidence_path: null,
        validation_passed: false,
        publish_clicked: false,
        error: message
      };
    });
    if (!result.ok && result.error === "No ready platform tasks found.") {
      summary.stopped_reason = "no-ready-task";
      break;
    }
    if (!result.ok && result.error?.includes("not Pinterest")) {
      summary.stopped_reason = "next-ready-not-pinterest";
      break;
    }

    summary.actual_attempted += 1;
    summary.results.push(result);

    if (!result.ok) {
      summary.ok = false;
      summary.stopped_reason = "error";
      summary.failed_idempotency_key = result.idempotency_key;
      break;
    }

    if (result.posted_url) summary.posted_urls.push(result.posted_url);
    summary.successful_posted_count += 1;

    const validation = await validateSocialQueue();
    if (!validation.ok) {
      summary.ok = false;
      summary.stopped_reason = "post-validation-failed";
      summary.failed_idempotency_key = result.idempotency_key;
      break;
    }

    if (index < options.max - 1) await delay(betweenPostDelayMs);
  }

  console.log(JSON.stringify(summary));
  if (!summary.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({ ok: false, error: message }));
    process.exitCode = 1;
  });
}
