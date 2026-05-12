import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { cdpUrlFromEnv } from "../../src/core/cdp-browser.js";

export interface LiveUploadRecoveryOptions {
  cdpUrl: string;
  matchUrl: string;
  screenshotPath: string;
  includeBodyText: boolean;
}

export interface LiveUploadRecoveryResult {
  ok: boolean;
  mode: "inspected" | "no-page" | "error";
  matched_url: string | null;
  title: string | null;
  screenshot_path: string | null;
  body_text?: string;
  rule: string;
  error?: string;
}

const defaultMatchUrl = "studio.youtube.com";

export const liveUploadRecoveryRule =
  "Safe live-upload recovery may inspect the existing browser tab, but must not reload, navigate, go back, go forward, or close the attached browser session.";

export const unsafeNavigationCallPattern =
  /\b(?:browser\s*\.\s*close|(?:page|draftPage|uploadPage|targetPage)\s*\.\s*(?:reload|goto|goBack|goForward)\s*\()/;

function timestampSlug(date = new Date()): string {
  return date.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}

function defaultScreenshotPath(): string {
  return join(
    "content",
    "outputs",
    "marketing",
    "posts",
    "audits",
    `live-upload-safe-recovery-${timestampSlug()}.png`
  );
}

function readOption(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function readFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`) || readOption(args, name) === "true";
}

export function parseLiveUploadRecoveryArgs(args: string[]): LiveUploadRecoveryOptions {
  const cleanArgs = args.filter((arg) => arg !== "--");
  return {
    cdpUrl: readOption(cleanArgs, "cdp-url") ?? cdpUrlFromEnv(["SOCIAL_CDP_URL"]),
    matchUrl: readOption(cleanArgs, "match-url") ?? defaultMatchUrl,
    screenshotPath: readOption(cleanArgs, "screenshot-path") ?? defaultScreenshotPath(),
    includeBodyText: readFlag(cleanArgs, "include-body-text")
  };
}

export function assertNoUnsafeNavigation(source: string, label = "live upload recovery script"): void {
  const match = source.match(unsafeNavigationCallPattern);
  if (match) {
    throw new Error(`${label} contains unsafe live-upload navigation: ${match[0]}`);
  }
}

interface DevToolsTarget {
  title?: string;
  url?: string;
  webSocketDebuggerUrl?: string;
}

interface CdMessage {
  id?: number;
  method?: string;
  params?: {
    message?: string;
    url?: string;
    type?: string;
  };
  result?: unknown;
  error?: unknown;
}

async function fetchTargets(cdpUrl: string): Promise<DevToolsTarget[]> {
  const response = await fetch(new URL("/json", cdpUrl));
  if (!response.ok) throw new Error(`Failed to read DevTools targets: ${response.status}`);
  return await response.json() as DevToolsTarget[];
}

function chooseTarget(targets: DevToolsTarget[], matchUrl: string): DevToolsTarget | null {
  const needle = matchUrl.toLowerCase();
  return targets.find((target) => target.url?.toLowerCase().includes(needle))
    ?? targets.find((target) => target.title?.toLowerCase().includes(needle))
    ?? null;
}

function sendCd(ws: WebSocket, id: number, method: string, params: Record<string, unknown> = {}): void {
  ws.send(JSON.stringify({ id, method, params }));
}

async function connectTargetSocket(target: DevToolsTarget): Promise<WebSocket> {
  if (!target.webSocketDebuggerUrl) throw new Error("Matched target has no webSocketDebuggerUrl.");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error("DevTools WebSocket connection failed."));
  });
  return ws;
}

export async function inspectOpenLiveUploadDraft(
  options: LiveUploadRecoveryOptions
): Promise<LiveUploadRecoveryResult> {
  const targets = await fetchTargets(options.cdpUrl);
  const target = chooseTarget(targets, options.matchUrl);
  if (!target) {
    return {
      ok: false,
      mode: "no-page",
      matched_url: null,
      title: null,
      screenshot_path: null,
      rule: liveUploadRecoveryRule,
      error: `No open page matched "${options.matchUrl}".`
    };
  }

  await mkdir(dirname(options.screenshotPath), { recursive: true });
  const ws = await connectTargetSocket(target);
  let nextId = 1;
  const pending = new Map<number, (message: CdMessage) => void>();
  let canceledDialog = false;
  ws.onmessage = (event: MessageEvent) => {
    const message = JSON.parse(String(event.data)) as CdMessage;
    if (message.method === "Page.javascriptDialogOpening") {
      canceledDialog = true;
      sendCd(ws, nextId++, "Page.handleJavaScriptDialog", { accept: false });
      return;
    }
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    }
  };
  const call = (method: string, params: Record<string, unknown> = {}) => new Promise<CdMessage>((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    sendCd(ws, id, method, params);
  });
  try {
    await call("Page.enable");
    await call("Runtime.enable");
    const bodyResult = options.includeBodyText
      ? await call("Runtime.evaluate", {
          expression: "document.body ? document.body.innerText : ''",
          returnByValue: true
        })
      : null;
    const screenshot = await call("Page.captureScreenshot", { format: "png", fromSurface: true });
    const imageData = (screenshot.result as { data?: unknown } | undefined)?.data;
    if (typeof imageData !== "string") throw new Error("DevTools screenshot did not return image data.");
    await writeFile(options.screenshotPath, Buffer.from(imageData, "base64"));
    const bodyText = (bodyResult?.result as { result?: { value?: unknown } } | undefined)?.result?.value;
    return {
      ok: true,
      mode: "inspected",
      matched_url: target.url ?? null,
      title: target.title ?? null,
      screenshot_path: options.screenshotPath,
      body_text: options.includeBodyText
        ? `${typeof bodyText === "string" ? bodyText : ""}${canceledDialog ? "\n\n[Reload dialog appeared and was canceled.]" : ""}`
        : undefined,
      rule: liveUploadRecoveryRule
    };
  } catch (error) {
    return {
      ok: false,
      mode: "error",
      matched_url: null,
      title: null,
      screenshot_path: null,
      rule: liveUploadRecoveryRule,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    ws.close();
  }
}

async function main(): Promise<void> {
  const result = await inspectOpenLiveUploadDraft(parseLiveUploadRecoveryArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({
      ok: false,
      mode: "error",
      matched_url: null,
      title: null,
      screenshot_path: null,
      rule: liveUploadRecoveryRule,
      error: message
    }, null, 2));
    process.exitCode = 1;
  });
}
