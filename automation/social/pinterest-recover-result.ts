import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { createEvidencePlan } from "./plan-task-evidence.js";
import { PlatformTask, QueuePost, validateSocialQueue } from "./validate-queue.js";

const execFileAsync = promisify(execFile);
const defaultCdpUrl = "http://127.0.0.1:9222";
const defaultTimeoutMs = 45000;

interface CliOptions {
  idempotencyKey?: string;
  cdpUrl: string;
  evidencePath?: string;
  errorPath?: string;
  timeoutMs: number;
  forceRecord: boolean;
}

interface CdpTarget {
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

interface CdpResponse {
  id?: number;
  result?: unknown;
  error?: { message?: string };
}

interface CdpEvaluateResult {
  result?: { value?: unknown };
  exceptionDetails?: { text?: string };
}

interface CdpCaptureScreenshotResult {
  data?: string;
}

interface CdpClient {
  send<T = unknown>(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<T>;
  close(): void;
}

interface TaskMatch {
  post: QueuePost;
  task: PlatformTask;
}

interface RecoveryResult {
  ok: boolean;
  postedUrl?: string;
  clickedSeePin: boolean;
  currentUrl?: string;
  visibleTextExcerpt?: string;
  error?: string;
}

interface MarkResult {
  ok?: boolean;
  old_status?: unknown;
  new_status?: unknown;
  posted_url?: unknown;
  posted_at?: unknown;
  evidence_path?: unknown;
  receipt_path?: unknown;
  message?: unknown;
  errors?: unknown;
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
  return args.includes(`--${name}`);
}

function parseArgs(args: string[]): CliOptions {
  const cleanArgs = args.filter((arg) => arg !== "--");
  const positional = cleanArgs.filter((arg) => !arg.startsWith("--"));
  const timeoutValue = optionValue(cleanArgs, "timeout-ms");
  return {
    idempotencyKey: optionValue(cleanArgs, "idempotency-key") ?? positional[0],
    cdpUrl: optionValue(cleanArgs, "cdp-url") ?? process.env.PINTEREST_CDP_URL ?? defaultCdpUrl,
    evidencePath: optionValue(cleanArgs, "evidence-path") ?? positional[1],
    errorPath: optionValue(cleanArgs, "error-path") ?? positional[2],
    timeoutMs: timeoutValue ? Number(timeoutValue) : defaultTimeoutMs,
    forceRecord: hasFlag(cleanArgs, "force-record")
  };
}

function cleanPinUrl(value: unknown): string | null {
  if (typeof value !== "string" || !/pinterest\.com\/pin\/\d+/i.test(value)) return null;
  const parsed = new URL(value);
  return `${parsed.origin}${parsed.pathname}`;
}

function isPinterestPage(target: CdpTarget): boolean {
  try {
    return target.type === "page" && new URL(target.url).hostname.endsWith("pinterest.com");
  } catch {
    return false;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function platformTasks(post: QueuePost): PlatformTask[] {
  return Array.isArray(post.platform_tasks) ? post.platform_tasks as PlatformTask[] : [];
}

function findTask(posts: QueuePost[], idempotencyKey: string): TaskMatch | null {
  const matches: TaskMatch[] = [];
  for (const post of posts) {
    for (const task of platformTasks(post)) {
      if (task.idempotency_key === idempotencyKey) matches.push({ post, task });
    }
  }
  if (matches.length !== 1) return null;
  return matches[0];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`CDP endpoint failed: ${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

function createCdpClient(wsUrl: string): Promise<CdpClient> {
  const WebSocketCtor = (globalThis as unknown as {
    WebSocket?: new (url: string) => {
      onopen: (() => void) | null;
      onerror: (() => void) | null;
      onmessage: ((event: { data: string }) => void) | null;
      send(data: string): void;
      close(): void;
    };
  }).WebSocket;

  if (!WebSocketCtor) {
    throw new Error("Global WebSocket is unavailable in this Node runtime.");
  }

  const ws = new WebSocketCtor(wsUrl);
  let nextId = 0;
  const pending = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }>();

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data) as CdpResponse;
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message ?? "CDP command failed."));
    else request.resolve(message.result);
  };

  return new Promise((resolve, reject) => {
    const openTimer = setTimeout(() => reject(new Error("CDP websocket connection timed out.")), 5000);
    ws.onerror = () => {
      clearTimeout(openTimer);
      reject(new Error("CDP websocket connection failed."));
    };
    ws.onopen = () => {
      clearTimeout(openTimer);
      resolve({
        send<T = unknown>(method: string, params: Record<string, unknown> = {}, timeoutMs = 10000): Promise<T> {
          const id = nextId += 1;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise<T>((commandResolve, commandReject) => {
            const timer = setTimeout(() => {
              pending.delete(id);
              commandReject(new Error(`${method} timed out.`));
            }, timeoutMs);
            pending.set(id, {
              resolve: (value) => commandResolve(value as T),
              reject: commandReject,
              timer
            });
          });
        },
        close(): void {
          for (const request of pending.values()) clearTimeout(request.timer);
          pending.clear();
          ws.close();
        }
      });
    };
  });
}

async function evaluate<T = unknown>(client: CdpClient, expression: string, timeoutMs = 10000): Promise<T> {
  const result = await client.send<CdpEvaluateResult>("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  }, timeoutMs);

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "CDP Runtime.evaluate failed.");
  }
  return result.result?.value as T;
}

async function saveErrorProof(client: CdpClient, screenshotPath: string | undefined, errorPath: string | undefined, payload: Record<string, unknown>): Promise<void> {
  if (screenshotPath) {
    const result = await client.send<CdpCaptureScreenshotResult>("Page.captureScreenshot", { format: "png", fromSurface: true }, 15000)
      .catch(() => null);
    if (result?.data) {
      const absoluteScreenshotPath = resolve(process.cwd(), screenshotPath);
      await mkdir(dirname(absoluteScreenshotPath), { recursive: true });
      await writeFile(absoluteScreenshotPath, Buffer.from(result.data, "base64"));
    }
  }

  if (errorPath) {
    const absoluteErrorPath = resolve(process.cwd(), errorPath);
    await mkdir(dirname(absoluteErrorPath), { recursive: true });
    await writeFile(absoluteErrorPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
}

async function findPinterestTarget(cdpUrl: string): Promise<CdpTarget> {
  const targets = await fetchJson<CdpTarget[]>(`${cdpUrl.replace(/\/$/, "")}/json/list`);
  const target = targets.find((item) => isPinterestPage(item) && /\/pin\//i.test(item.url))
    ?? targets.find((item) => isPinterestPage(item) && /pin-builder/i.test(item.url))
    ?? targets.find(isPinterestPage);
  if (!target?.webSocketDebuggerUrl) {
    throw new Error("No controllable Pinterest page was found in the CDP browser.");
  }
  return target;
}

async function findPinUrlInTargets(cdpUrl: string): Promise<string | null> {
  const targets = await fetchJson<CdpTarget[]>(`${cdpUrl.replace(/\/$/, "")}/json/list`);
  for (const target of targets) {
    const url = cleanPinUrl(target.url);
    if (url) return url;
  }
  return null;
}

async function recoverPinterestResult(options: CliOptions): Promise<RecoveryResult> {
  const target = await findPinterestTarget(options.cdpUrl);
  const client = await createCdpClient(target.webSocketDebuggerUrl as string);
  let clickedSeePin = false;

  try {
    await client.send("Runtime.enable");
    await client.send("Page.enable");

    let postedUrl = cleanPinUrl(target.url);

    if (!postedUrl) {
      const seePinResult = await evaluate<{ found: boolean; clicked: boolean; href: string | null; text: string; body: string; url: string }>(client, `(() => {
        const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
        const body = document.body.innerText || '';
        const hasSuccessText = /you created a pin|created a pin/i.test(body);
        const elements = Array.from(document.querySelectorAll('a,button,[role="button"]'));
        const seePin = elements.find((element) => /see\\s+(your\\s+)?pin|view\\s+(your\\s+)?pin|open\\s+(your\\s+)?pin/i.test(
          normalize(element.innerText || element.textContent || element.getAttribute('aria-label') || '')
        ));
        if (!seePin) {
          return {
            found: false,
            clicked: false,
            href: null,
            text: hasSuccessText ? 'success text found without See your Pin control' : '',
            body: body.slice(0, 1200),
            url: location.href
          };
        }
        const href = seePin.href || seePin.getAttribute('href');
        seePin.click();
        return {
          found: true,
          clicked: true,
          href: href ? new URL(href, location.href).href : null,
          text: normalize(seePin.innerText || seePin.textContent || seePin.getAttribute('aria-label') || ''),
          body: body.slice(0, 1200),
          url: location.href
        };
      })()`);

      clickedSeePin = seePinResult.clicked;
      postedUrl = cleanPinUrl(seePinResult.href);

      if (!seePinResult.found) {
        return {
          ok: false,
          clickedSeePin,
          currentUrl: seePinResult.url,
          visibleTextExcerpt: seePinResult.body,
          error: "Pinterest success control was not found. Expected text like \"You created a Pin\" and a \"See your Pin\" link/button."
        };
      }
    }

    const deadline = Date.now() + options.timeoutMs;
    while (!postedUrl && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      postedUrl = await findPinUrlInTargets(options.cdpUrl)
        ?? cleanPinUrl(await evaluate<string>(client, "location.href", 3000).catch(() => ""));
    }

    if (!postedUrl) {
      const currentUrl = await evaluate<string>(client, "location.href", 3000).catch(() => target.url);
      const body = await evaluate<string>(client, "document.body.innerText.slice(0, 1200)", 3000).catch(() => "");
      return {
        ok: false,
        clickedSeePin,
        currentUrl,
        visibleTextExcerpt: body,
        error: "Timed out waiting for a live Pinterest Pin URL after opening See your Pin."
      };
    }

    return { ok: true, postedUrl, clickedSeePin };
  } finally {
    client.close();
  }
}

async function markPosted(input: { idempotencyKey: string; postedUrl: string; evidencePath: string | undefined; force: boolean }): Promise<MarkResult> {
  const args = [
    "run",
    "social:mark-result",
    "--",
    "--idempotency-key",
    input.idempotencyKey,
    "--status",
    "posted",
    "--posted-url",
    input.postedUrl,
    "--posted-at",
    new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
  ];

  if (input.evidencePath) args.push("--evidence-path", input.evidencePath);
  if (input.force) args.push("--force");

  const { stdout } = await execFileAsync(npmCommand(), args, {
    cwd: process.cwd(),
    shell: process.platform === "win32",
    maxBuffer: 1024 * 1024
  });

  const jsonLine = stdout.trim().split(/\r?\n/).reverse().find((line) => line.trim().startsWith("{"));
  if (!jsonLine) throw new Error("social:mark-result did not return JSON.");
  return JSON.parse(jsonLine) as MarkResult;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!options.idempotencyKey) {
    console.log(JSON.stringify({ ok: false, message: "Missing required --idempotency-key." }));
    process.exitCode = 1;
    return;
  }

  const validation = await validateSocialQueue();
  if (!validation.ok) {
    console.log(JSON.stringify({ ok: false, message: "Social queue validation failed before recovery.", errors: validation.errors }));
    process.exitCode = 1;
    return;
  }

  const match = findTask(validation.posts, options.idempotencyKey);
  if (!match) {
    console.log(JSON.stringify({ ok: false, message: `Expected exactly one task for idempotency key "${options.idempotencyKey}".` }));
    process.exitCode = 1;
    return;
  }

  const plannedEvidence = createEvidencePlan({
    postId: match.post.post_id,
    platform: match.task.platform,
    idempotencyKey: match.task.idempotency_key
  });
  const evidencePath = options.evidencePath ?? asString(match.task.evidence_path);
  const errorPath = options.errorPath ?? plannedEvidence.recommended_error_path.replace(/-error\.json$/, "-recover-error.json");
  const errorScreenshotPath = plannedEvidence.recommended_evidence_path.replace(/\.png$/, "-recover-error.png");

  const recovery = await recoverPinterestResult(options);
  if (!recovery.ok || !recovery.postedUrl) {
    const target = await findPinterestTarget(options.cdpUrl).catch(() => null);
    if (target?.webSocketDebuggerUrl) {
      const client = await createCdpClient(target.webSocketDebuggerUrl);
      await client.send("Page.enable").catch(() => undefined);
      await saveErrorProof(client, errorScreenshotPath, errorPath, {
        ok: false,
        idempotency_key: options.idempotencyKey,
        error: recovery.error ?? "Pinterest Pin URL was not recovered.",
        clicked_see_pin: recovery.clickedSeePin,
        current_url: recovery.currentUrl ?? target.url,
        visible_text_excerpt: recovery.visibleTextExcerpt ?? null,
        timestamp: new Date().toISOString()
      }).catch(() => undefined);
      client.close();
    }
    console.log(JSON.stringify({
      ok: false,
      mode: "pinterest-recover-result",
      idempotency_key: options.idempotencyKey,
      clicked_see_pin: recovery.clickedSeePin,
      error: recovery.error ?? "Pinterest Pin URL was not recovered.",
      current_url: recovery.currentUrl ?? null,
      visible_text_excerpt: recovery.visibleTextExcerpt ?? null,
      error_path: errorPath,
      evidence_path: errorScreenshotPath
    }));
    process.exitCode = 1;
    return;
  }

  const oldStatus = asString(match.task.status) ?? null;
  const existingPostedUrl = asString(match.task.posted_url);
  let recordResult: MarkResult | null = null;
  let recordMode = "updated";

  if ((oldStatus === "posted" || oldStatus === "posted-early") && existingPostedUrl === recovery.postedUrl && !options.forceRecord) {
    recordMode = "already-recorded";
  } else if ((oldStatus === "posted" || oldStatus === "posted-early") && !options.forceRecord) {
    console.log(JSON.stringify({
      ok: false,
      mode: "pinterest-recover-result",
      idempotency_key: options.idempotencyKey,
      posted_url: recovery.postedUrl,
      existing_posted_url: existingPostedUrl ?? null,
      old_status: oldStatus,
      message: "Task is already posted with a different URL. Re-run with --force-record to overwrite."
    }));
    process.exitCode = 1;
    return;
  } else {
    recordResult = await markPosted({
      idempotencyKey: options.idempotencyKey,
      postedUrl: recovery.postedUrl,
      evidencePath,
      force: options.forceRecord
    });
  }

  const after = await validateSocialQueue();
  console.log(JSON.stringify({
    ok: true,
    mode: "pinterest-recover-result",
    idempotency_key: options.idempotencyKey,
    pin_url_recovered: true,
    clicked_see_pin: recovery.clickedSeePin,
    posted_url: recovery.postedUrl,
    old_status: recordResult?.old_status ?? oldStatus,
    new_status: recordResult?.new_status ?? oldStatus,
    evidence_path: recordResult?.evidence_path ?? evidencePath ?? null,
    record_mode: recordMode,
    validation_ok: after.ok,
    validation_summary: after.summary
  }));

  if (!after.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({ ok: false, mode: "pinterest-recover-result", message, errors: [message] }));
    process.exitCode = 1;
  });
}
