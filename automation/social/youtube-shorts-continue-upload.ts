import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "@playwright/test";
import { cdpUrlFromEnv } from "../../src/core/cdp-browser.js";
import { appendProductionRunLog } from "./production-run-log.js";
import { youtubeUploadReloadCancelRule } from "./youtube-upload-guard.js";

interface DevToolsTarget {
  title?: string;
  url?: string;
  webSocketDebuggerUrl?: string;
}

interface CdMessage {
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { message?: string };
}

export interface CliOptions {
  cdpUrl: string;
  studioUrl: string;
  evidenceDir: string;
  videoAsset: string;
  title: string;
  description: string;
  stepTimeoutMs: number;
  publishTimeoutMs: number;
  maxNextSteps: number;
  afterPublishWaitMs: number;
  dryRun: boolean;
  allowNewDraft: boolean;
  compact: boolean;
  verbose: boolean;
  recordRun: boolean;
  cdpOnly: boolean;
}

export const youtubeProductionUploadSafetyRule =
  "The YouTube production upload helper must attach only to an already-open YouTube Studio tab; it must not navigate, reload, open a new page, or close the attached browser session.";

const defaultVideoAsset = "content/outputs/videos/approved/day-6-tiny-treasure-veo31-canva-approved-2026-05-10.mp4";
const defaultStudioUrl = "https://studio.youtube.com/channel/UC9I5x3-uPYURdn__A8x9xuA";
const defaultTitle = "Tiny Treasure #Shorts";
const defaultDescription = [
  "A cozy dragon-village search scene, made to feel warm, gentle, and findable for young readers.",
  "",
  "Coming soon to Amazon.",
  "",
  "Save for later if you love hidden-object books.",
  "",
  "#SeekAndFind #KidsActivityBook #ChildrensBooks #ScreenFreeFun #BabyDragon #HiddenObjectBook #KidsBooks #FamilyReading #EmberDragonBooks #dragonbooks #dragonbooksforkids"
].join("\n");

function readOption(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1];
  const envName = `npm_config_${name.replaceAll("-", "_")}`;
  return process.env[envName];
}

function npmFlag(name: string): boolean {
  const value = process.env[`npm_config_${name.replaceAll("-", "_")}`];
  return value === "true" || value === "1";
}

function readFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`) || npmFlag(name);
}

export function parseYoutubeUploadArgs(args: string[]): CliOptions {
  const cleanArgs = args.filter((arg) => arg !== "--");
  const stepTimeoutMs = Number(readOption(cleanArgs, "step-timeout-ms") ?? "5000");
  const publishTimeoutMs = Number(readOption(cleanArgs, "publish-timeout-ms") ?? "5000");
  const maxNextSteps = Number(readOption(cleanArgs, "max-next-steps") ?? "3");
  const afterPublishWaitMs = Number(readOption(cleanArgs, "after-publish-wait-ms") ?? "3000");
  return {
    cdpUrl: readOption(cleanArgs, "cdp-url") ?? cdpUrlFromEnv(["YOUTUBE_CDP_URL", "SOCIAL_CDP_URL"]),
    studioUrl: readOption(cleanArgs, "studio-url") ?? defaultStudioUrl,
    evidenceDir: readOption(cleanArgs, "evidence-dir") ?? "content/social/campaigns/book-01/evidence/short-video/book01-day-06/youtube",
    videoAsset: readOption(cleanArgs, "video-asset") ?? defaultVideoAsset,
    title: readOption(cleanArgs, "title") ?? defaultTitle,
    description: readOption(cleanArgs, "description") ?? defaultDescription,
    stepTimeoutMs: Number.isFinite(stepTimeoutMs) ? stepTimeoutMs : 5000,
    publishTimeoutMs: Number.isFinite(publishTimeoutMs) ? publishTimeoutMs : 5000,
    maxNextSteps: Number.isFinite(maxNextSteps) ? maxNextSteps : 3,
    afterPublishWaitMs: Number.isFinite(afterPublishWaitMs) ? afterPublishWaitMs : 3000,
    dryRun: cleanArgs.includes("--dry-run")
      || cleanArgs.includes("--no-publish")
      || npmFlag("dry-run")
      || npmFlag("no-publish"),
    allowNewDraft: cleanArgs.includes("--allow-new-draft") || npmFlag("allow-new-draft"),
    compact: readFlag(cleanArgs, "compact"),
    verbose: readFlag(cleanArgs, "verbose"),
    recordRun: readFlag(cleanArgs, "record-run"),
    cdpOnly: readFlag(cleanArgs, "cdp-only")
  };
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTargets(cdpUrl: string): Promise<DevToolsTarget[]> {
  const response = await fetch(new URL("/json/list", cdpUrl));
  if (!response.ok) throw new Error(`Failed to read DevTools targets: ${response.status}`);
  return await response.json() as DevToolsTarget[];
}

export function chooseYoutubeTarget(targets: DevToolsTarget[]): DevToolsTarget | null {
  const studioTargets = targets.filter((target) => /studio\.youtube\.com/i.test(target.url ?? "")
    || /youtube studio/i.test(target.title ?? ""));
  return studioTargets.find((target) => /channel dashboard/i.test(target.title ?? ""))
    ?? studioTargets.find((target) => /\/channel\/[^/]+\/?$/i.test(target.url ?? ""))
    ?? studioTargets.find((target) => !/\/video\/[^/]+\/edit|\/videos\/short/i.test(target.url ?? ""))
    ?? studioTargets.find((target) => /studio\.youtube\.com/i.test(target.url ?? ""))
    ?? studioTargets.find((target) => /youtube studio/i.test(target.title ?? ""))
    ?? null;
}

async function openYoutubeStudioTarget(cdpUrl: string, studioUrl: string): Promise<DevToolsTarget> {
  const encodedUrl = encodeURIComponent(studioUrl);
  let response = await fetch(new URL(`/json/new?${encodedUrl}`, cdpUrl), { method: "PUT" });
  if (!response.ok) {
    response = await fetch(new URL(`/json/new?${encodedUrl}`, cdpUrl));
  }
  if (!response.ok) throw new Error(`Failed to open YouTube Studio target: ${response.status}`);
  return await response.json() as DevToolsTarget;
}

class CdpClient {
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: CdMessage) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();

  constructor(private readonly ws: WebSocket) {
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as CdMessage;
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message ?? JSON.stringify(message.error)));
      else pending.resolve(message);
    });
  }

  call(method: string, params: Record<string, unknown> = {}, timeoutMs = 12000): Promise<CdMessage> {
    const id = this.nextId++;
    const timer = setTimeout(() => {
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      pending.reject(new Error(`${method} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const promise = new Promise<CdMessage>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, timer });
    });
    this.ws.send(JSON.stringify({ id, method, params }));
    return promise;
  }

  close(): void {
    this.ws.close();
  }
}

async function connect(target: DevToolsTarget): Promise<CdpClient> {
  if (!target.webSocketDebuggerUrl) throw new Error("YouTube target has no DevTools websocket URL.");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out opening YouTube DevTools websocket.")), 15000);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("YouTube DevTools websocket failed."));
    }, { once: true });
  });
  return new CdpClient(ws);
}

const continueScript = String.raw`
(async () => {
  function allRoots(root = document) {
    const roots = [root];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.shadowRoot) roots.push(node.shadowRoot);
    }
    return roots;
  }
  function visible(el) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }
  function textOf(el) {
    return (el.innerText || el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
  }
  function findByText(pattern) {
    for (const root of allRoots()) {
      const matches = [...root.querySelectorAll("*")].filter((el) => visible(el) && pattern.test(textOf(el)));
      if (matches.length) return matches[0];
    }
    return null;
  }
  function clickText(pattern) {
    const el = findByText(pattern);
    if (!el) return false;
    el.click();
    return true;
  }
  function clickButton(label) {
    for (const root of allRoots()) {
      const buttons = [...root.querySelectorAll("button, ytcp-button, tp-yt-paper-button")].filter((el) => visible(el));
      const candidate = buttons.find((el) => {
        const text = textOf(el).toLowerCase();
        return (text === label.toLowerCase() || text.includes(label.toLowerCase()))
          && el.getAttribute("aria-disabled") !== "true"
          && !el.disabled;
      });
      if (candidate) {
        candidate.click();
        return true;
      }
    }
    return false;
  }
  function clickAudienceMadeForKids() {
    const text = findByText(/yes,.*made for kids/i);
    if (!text) return false;
    const candidate = text.closest("tp-yt-paper-radio-button, ytcp-radio-button, ytcp-ve, label, div");
    (candidate || text).click();
    const input = text.closest("label")?.querySelector("input[type=radio]");
    if (input) {
      input.checked = true;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return true;
  }
  function pageText() {
    return textOf(document.body);
  }
  const actions = [];
  const yes = clickAudienceMadeForKids();
  if (yes) actions.push("audience_yes_clicked");
  else actions.push("audience_yes_not_found");
  return { actions, text: pageText().slice(0, 2000) };
})()
`;

const helperScript = String.raw`
function allRoots(root = document) {
  const roots = [root];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.shadowRoot) roots.push(node.shadowRoot);
  }
  return roots;
}
function visible(el) {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}
function textOf(el) {
  return (el.innerText || el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
}
function findByText(pattern) {
  for (const root of allRoots()) {
    const matches = [...root.querySelectorAll("*")].filter((el) => visible(el) && pattern.test(textOf(el)));
    if (matches.length) return matches[0];
  }
  return null;
}
function clickText(pattern) {
  const el = findByText(pattern);
  if (!el) return false;
  el.click();
  return true;
}
function clickButton(label) {
  for (const root of allRoots()) {
    const buttons = [...root.querySelectorAll("button, ytcp-button, tp-yt-paper-button")].filter((el) => visible(el));
    const candidate = buttons.find((el) => {
      const text = textOf(el).toLowerCase();
      return (text === label.toLowerCase() || text.includes(label.toLowerCase()))
        && el.getAttribute("aria-disabled") !== "true"
        && !el.disabled;
    });
    if (candidate) {
      candidate.click();
      return true;
    }
  }
  return false;
}
function hasUploadDetails() {
  return Boolean(findByText(/^details$/i)
    && findByText(/^video elements$/i)
    && findByText(/^checks$/i)
    && findByText(/^visibility$/i));
}
`;

function hasBlockingAction(actions: string[]): boolean {
  return actions.includes("upload_file_input_not_found")
    || actions.includes("video_file_attach_failed")
    || actions.includes("details_fields_not_ready")
    || actions.includes("not_upload_wizard_after_setup_stop");
}

function jsonString(value: string): string {
  return JSON.stringify(value);
}

async function runtimeEvaluate(client: CdpClient, expression: string, timeoutMs = 15000): Promise<unknown> {
  const result = await client.call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  }, timeoutMs);
  return (result.result as { result?: { value?: unknown } } | undefined)?.result?.value;
}

async function pageText(client: CdpClient): Promise<string> {
  return String(await runtimeEvaluate(client, "document.body ? document.body.innerText : ''", 5000).catch(() => ""));
}

export function classifyYoutubeState(text: string): "published_modal" | "upload_wizard" | "dashboard_or_content" {
  if (/video published|published\s+[A-Z][a-z]+\s+\d{1,2},\s+\d{4}/i.test(text)) return "published_modal";
  if (/Details\s+Video elements\s+Checks\s+Visibility/i.test(text)
    || (/Choose when to publish/i.test(text) && /Save or publish/i.test(text))) {
    return "upload_wizard";
  }
  return "dashboard_or_content";
}

export function isMadeForKidsConfirmed(text: string): boolean {
  return /this video is set to made for kids|set by you/i.test(text);
}

export function isYoutubeContentBusy(text: string): boolean {
  return /deleting videos?|while you wait, you can leave this screen/i.test(text);
}

async function viewport(client: CdpClient): Promise<{ width: number; height: number }> {
  const value = await runtimeEvaluate(client, "({ width: window.innerWidth, height: window.innerHeight })", 5000)
    .catch(() => null);
  const maybeViewport = value as { width?: unknown; height?: unknown } | null;
  return {
    width: typeof maybeViewport?.width === "number" ? maybeViewport.width : 1920,
    height: typeof maybeViewport?.height === "number" ? maybeViewport.height : 993
  };
}

async function clickViewportRatio(
  client: CdpClient,
  xRatio: number,
  yRatio: number,
  actions: string[],
  label: string
): Promise<void> {
  const size = await viewport(client);
  const x = Math.round(size.width * xRatio);
  const y = Math.round(size.height * yRatio);
  await client.call("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" }, 3000).catch(() => undefined);
  await client.call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, 3000);
  await client.call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, 3000);
  actions.push(label);
}

async function clickVisibleTextByRect(client: CdpClient, patternSource: string, actions: string[], label: string): Promise<boolean> {
  const rect = await runtimeEvaluate(client, `(function(){${helperScript}
    const pattern = new RegExp(${jsonString(patternSource)}, "i");
    const element = findByText(pattern);
    if (!element) return null;
    const target = element.closest("tp-yt-paper-item, ytd-menu-service-item-renderer, [role='menuitem'], ytcp-ve, a, button") || element;
    const box = target.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  })()`, 5000).catch(() => null) as { x?: unknown; y?: unknown; width?: unknown; height?: unknown } | null;
  if (!rect
    || typeof rect.x !== "number"
    || typeof rect.y !== "number"
    || typeof rect.width !== "number"
    || typeof rect.height !== "number"
    || rect.width <= 0
    || rect.height <= 0) {
    actions.push(`${label}_rect_not_found`);
    return false;
  }

  const x = Math.round(rect.x + rect.width / 2);
  const y = Math.round(rect.y + rect.height / 2);
  await client.call("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" }, 3000).catch(() => undefined);
  await client.call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, 3000);
  await client.call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, 3000);
  actions.push(`${label}_clicked_visible_rect`);
  return true;
}

async function captureScreenshot(client: CdpClient, evidenceDir: string, name: string): Promise<string | null> {
  const relativePath = join(evidenceDir, name).replaceAll("\\", "/");
  try {
    const screenshot = await client.call("Page.captureScreenshot", { format: "png", fromSurface: true }, 10000);
    const data = (screenshot.result as { data?: unknown } | undefined)?.data;
    if (typeof data !== "string") return null;
    const absolutePath = join(process.cwd(), relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, Buffer.from(data, "base64"));
    return relativePath;
  } catch {
    return null;
  }
}

export function compactYoutubeUploadResult(result: Record<string, unknown>): Record<string, unknown> {
  const actions = Array.isArray(result.actions) ? result.actions.filter((action): action is string => typeof action === "string") : [];
  const markerNames = [
    "youtube_studio_target_opened_from_available_browser",
    "youtube_studio_loaded_after_new_tab",
    "playwright_filechooser_flow",
    "video_file_attached_via_filechooser",
    "upload_wizard_ready_after_file_attach",
    "details_title_description_filled_playwright",
    "audience_yes_selected_playwright",
    "audience_yes_selected_visible_radio",
    "details_next_clicked_dom",
    "public_selected_playwright",
    "dry_run_stopped_before_publish"
  ];
  return {
    ok: result.ok === true,
    dry_run: result.dry_run === true,
    youtube_url: result.youtube_url ?? null,
    markers: Object.fromEntries(markerNames.map((marker) => [marker, actions.includes(marker)])),
    publish_clicked: actions.some((action) => /publish_clicked/.test(action)),
    result_path: result.result_path,
    compact_result_path: result.compact_result_path,
    screenshots: Array.isArray(result.screenshots) ? result.screenshots.length : 0,
    error: result.error ?? null
  };
}

async function waitForCondition(
  client: CdpClient,
  expression: string,
  timeoutMs: number,
  intervalMs = 1000
): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const result = await runtimeEvaluate(client, expression, 5000).catch(() => false);
    if (result) return true;
    await delay(intervalMs);
  }
  return false;
}

async function cancelPossibleReloadDialog(client: CdpClient, actions: string[]): Promise<void> {
  await client.call("Page.handleJavaScriptDialog", { accept: false }, 2000)
    .then(() => actions.push("proactive_youtube_reload_dialog_cancel_sent"))
    .catch(() => actions.push("proactive_youtube_reload_dialog_cancel_attempt_no_open_dialog"));
}

async function waitForYoutubeStudioLoaded(client: CdpClient, actions: string[], timeoutMs = 45000): Promise<void> {
  const loaded = await waitForCondition(client, `
    document.body && /YouTube Studio|Channel content|Channel dashboard|Create|Your channel/i.test(document.body.innerText || "")
  `, timeoutMs, 1000);
  actions.push(loaded ? "youtube_studio_loaded_after_new_tab" : "youtube_studio_new_tab_load_not_verified");
}

async function selectUploadFile(client: CdpClient, filePath: string): Promise<boolean> {
  await client.call("DOM.enable").catch(() => undefined);
  const documentNode = await client.call("DOM.getDocument", { depth: -1, pierce: true }, 15000);
  const rootNodeId = (documentNode.result as { root?: { nodeId?: unknown } } | undefined)?.root?.nodeId;
  if (typeof rootNodeId !== "number") return false;
  const query = await client.call("DOM.querySelectorAll", { nodeId: rootNodeId, selector: "input[type=file]" }, 15000);
  const nodeIds = (query.result as { nodeIds?: unknown } | undefined)?.nodeIds;
  const nodeId = Array.isArray(nodeIds) ? nodeIds.find((id): id is number => typeof id === "number") : null;
  if (typeof nodeId !== "number") return false;
  await client.call("DOM.setFileInputFiles", { nodeId, files: [resolve(filePath)] }, 15000);
  return true;
}

async function ensureUploadDialog(client: CdpClient, options: CliOptions, actions: string[]): Promise<void> {
  if (isYoutubeContentBusy(await pageText(client))) {
    actions.push("youtube_content_busy_stop");
    return;
  }

  const currentState = classifyYoutubeState(await pageText(client));
  if (currentState === "published_modal") {
    if (options.dryRun && options.allowNewDraft) {
      actions.push("published_modal_detected_closing_for_draft_run");
      await closePublishedModalForDraftRun(client, actions);
      const afterCloseState = classifyYoutubeState(await pageText(client));
      if (afterCloseState === "published_modal") {
        actions.push("published_modal_still_open_stop");
        return;
      }
    } else {
    actions.push("published_modal_detected_stop");
    return;
    }
  }

  const alreadyOpen = await runtimeEvaluate(client, `(function(){${helperScript} return hasUploadDetails();})()`, 8000).catch(() => false);
  if (alreadyOpen) {
    actions.push("upload_dialog_already_open");
    return;
  }
  if (options.dryRun && !options.allowNewDraft) {
    actions.push("dry_run_no_open_upload_dialog_no_new_draft");
    return;
  }

  const openUploadInputReady = await waitForCondition(client, `(function(){${helperScript}
    for (const root of allRoots()) {
      if ([...root.querySelectorAll("input[type=file]")].length > 0) return true;
    }
    return false;
  })()`, 2000);
  if (openUploadInputReady) {
    actions.push("upload_file_input_ready_from_open_dialog");
    const fileSelected = await selectUploadFile(client, options.videoAsset);
    actions.push(fileSelected ? "video_file_attached" : "video_file_attach_failed");
    await delay(3000);
    await cancelPossibleReloadDialog(client, actions);
    return;
  }

  let uploadClicked = Boolean(await runtimeEvaluate(client, `(function(){${helperScript}
    return clickText(/^upload videos?$/i) || clickText(/upload videos?/i);
  })()`, 8000).catch(() => false));

  if (!uploadClicked) {
    let createClicked = false;
    if (options.dryRun && options.allowNewDraft) {
      await clickViewportRatio(client, 0.939, 0.031, actions, "create_clicked_coordinate_fallback");
      createClicked = true;
    } else {
      createClicked = Boolean(await runtimeEvaluate(client, `(function(){${helperScript}
        return clickButton("Create") || clickText(/^create$/i);
      })()`, 8000).catch(() => false));
      if (!createClicked) {
        await clickViewportRatio(client, 0.939, 0.031, actions, "create_clicked_coordinate_fallback");
        createClicked = true;
      }
    }
    actions.push(createClicked ? "create_clicked" : "create_not_clicked");
    await delay(1500);
    await cancelPossibleReloadDialog(client, actions);

    const menuVisible = await waitForCondition(client, `(function(){${helperScript}
      return Boolean(findByText(/^upload videos?$/i) || findByText(/upload videos?/i));
    })()`, 5000, 500);
    actions.push(menuVisible ? "upload_videos_menu_visible" : "upload_videos_menu_not_visible");
    if (menuVisible) {
      uploadClicked = await clickVisibleTextByRect(client, "upload videos?", actions, "upload_videos");
    }
  } else {
    actions.push("upload_videos_clicked_from_open_menu");
  }

  if (!uploadClicked) {
    await clickViewportRatio(client, 0.912, 0.077, actions, "upload_videos_clicked_coordinate_fallback");
    await delay(2500);
    uploadClicked = Boolean(await runtimeEvaluate(client, `(function(){${helperScript}
      for (const root of allRoots()) {
        if ([...root.querySelectorAll("input[type=file]")].length > 0) return true;
      }
      return hasUploadDetails();
    })()`, 5000).catch(() => false));
  }
  actions.push(uploadClicked ? "upload_videos_clicked" : "upload_videos_not_clicked");
  await delay(1500);
  await cancelPossibleReloadDialog(client, actions);

  let inputReady = await waitForCondition(client, `(function(){${helperScript}
    for (const root of allRoots()) {
      if ([...root.querySelectorAll("input[type=file]")].length > 0) return true;
    }
    return false;
  })()`, 10000);
  if (!inputReady && uploadClicked) {
    actions.push("upload_file_input_not_found_after_menu_click_retrying_coordinate");
    await clickViewportRatio(client, 0.939, 0.031, actions, "create_clicked_retry_coordinate");
    await delay(1000);
    await clickViewportRatio(client, 0.914, 0.077, actions, "upload_videos_clicked_retry_coordinate");
    await delay(2500);
    inputReady = await waitForCondition(client, `(function(){${helperScript}
      for (const root of allRoots()) {
        if ([...root.querySelectorAll("input[type=file]")].length > 0) return true;
      }
      return false;
    })()`, 10000);
  }
  actions.push(inputReady ? "upload_file_input_ready" : "upload_file_input_not_found");
  if (!inputReady) return;

  const fileSelected = await selectUploadFile(client, options.videoAsset);
  actions.push(fileSelected ? "video_file_attached" : "video_file_attach_failed");
  await delay(3000);
  await cancelPossibleReloadDialog(client, actions);
}

async function fillDetails(client: CdpClient, options: CliOptions, actions: string[]): Promise<void> {
  const filled = await waitForCondition(client, `(function(){${helperScript}
    const editables = [];
    for (const root of allRoots()) {
      for (const el of root.querySelectorAll('[contenteditable="true"], textarea')) {
        if (visible(el)) editables.push(el);
      }
    }
    return editables.length >= 2;
  })()`, 15000);
  actions.push(filled ? "details_fields_ready" : "details_fields_not_ready");
  if (!filled) return;

  const result = await runtimeEvaluate(client, `(function(){${helperScript}
    const title = ${jsonString(options.title)};
    const description = ${jsonString(options.description)};
    function setField(el, value) {
      el.focus();
      if (el.tagName && el.tagName.toLowerCase() === "textarea") {
        el.value = value;
      } else {
        document.execCommand("selectAll", false);
        document.execCommand("insertText", false, value);
        if ((el.innerText || el.textContent || "").trim() !== value.trim()) {
          el.textContent = value;
        }
      }
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const editables = [];
    for (const root of allRoots()) {
      for (const el of root.querySelectorAll('[contenteditable="true"], textarea')) {
        if (visible(el)) editables.push(el);
      }
    }
    if (editables.length < 2) return { ok: false, count: editables.length };
    setField(editables[0], title);
    setField(editables[1], description);
    return { ok: true, count: editables.length };
  })()`, 12000).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  actions.push((result as { ok?: boolean } | null)?.ok ? "details_title_description_filled" : "details_title_description_not_filled");
  const stateAfterDetails = classifyYoutubeState(await pageText(client));
  if (stateAfterDetails !== "upload_wizard") {
    actions.push("not_upload_wizard_after_setup_stop");
  }
}

async function selectMadeForKids(client: CdpClient, actions: string[], evidenceDir: string, screenshots: string[]): Promise<boolean> {
  const beforeText = await pageText(client);
  if (!/made for kids/i.test(beforeText)) {
    actions.push("audience_screen_not_visible");
    return false;
  }

  const domClicked = await runtimeEvaluate(client, continueScript, 8000).catch(() => null);
  actions.push("audience_dom_click_attempted");
  await delay(800);
  await cancelPossibleReloadDialog(client, actions);
  const afterDom = await pageText(client);
  if (isMadeForKidsConfirmed(afterDom)) {
    actions.push("audience_yes_selected_dom");
    return true;
  }

  const scrolledToAudience = await runtimeEvaluate(client, `(function(){${helperScript}
    function inViewport(el) {
      const rect = el.getBoundingClientRect();
      return rect.top >= 140 && rect.bottom <= window.innerHeight - 80;
    }
    function scrollables() {
      const items = [];
      for (const root of allRoots()) {
        for (const el of root.querySelectorAll("*")) {
          if (!visible(el)) continue;
          if (el.scrollHeight > el.clientHeight + 80 && el.clientHeight > 160) items.push(el);
        }
      }
      return items;
    }
    for (const ratio of [0.35, 0.55, 0.75, 1]) {
      const yesText = findByText(/yes,.*made for kids/i);
      if (yesText) {
        yesText.scrollIntoView({ block: "center", inline: "nearest" });
        if (inViewport(yesText)) return true;
      }
      for (const el of scrollables()) {
        el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) * ratio);
      }
    }
    const yesText = findByText(/yes,.*made for kids/i);
    if (!yesText) return false;
    yesText.scrollIntoView({ block: "center", inline: "nearest" });
    return inViewport(yesText);
  })()`, 8000).catch(() => false);
  actions.push(scrolledToAudience ? "audience_scrolled_into_view" : "audience_scroll_failed");

  const radioRect = await runtimeEvaluate(client, `(function(){${helperScript}
    function candidateText(el) {
      return textOf(el).toLowerCase();
    }
    for (const root of allRoots()) {
      const radios = [...root.querySelectorAll("tp-yt-paper-radio-button, ytcp-radio-button, [role='radio']")]
        .filter((el) => visible(el) && /yes,.*made for kids/i.test(candidateText(el)));
      if (radios.length) {
        const radio = radios.sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return (ar.width * ar.height) - (br.width * br.height);
        })[0];
        radio.scrollIntoView({ block: "center", inline: "nearest" });
        const rect = radio.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, usedRadio: true };
      }
    }
    const labels = [];
    for (const root of allRoots()) {
      for (const el of root.querySelectorAll("*")) {
        if (!visible(el)) continue;
        const text = textOf(el);
        if (/^yes,.*made for kids$/i.test(text)) labels.push(el);
      }
    }
    if (!labels.length) return null;
    const label = labels.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    })[0];
    label.scrollIntoView({ block: "center", inline: "nearest" });
    const rect = label.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, usedRadio: false };
  })()`, 8000).catch(() => null) as { x?: unknown; y?: unknown; width?: unknown; height?: unknown } | null;
  if (!radioRect
    || typeof radioRect.x !== "number"
    || typeof radioRect.y !== "number"
    || typeof radioRect.width !== "number"
    || typeof radioRect.height !== "number") {
    actions.push("audience_yes_radio_rect_not_found");
    return false;
  }

  const usedRadio = (radioRect as { usedRadio?: unknown }).usedRadio === true;
  const clickX = usedRadio
    ? Math.round(radioRect.x + Math.min(24, Math.max(10, radioRect.width / 4)))
    : Math.round(radioRect.x - 22);
  const clickY = Math.round(radioRect.y + radioRect.height / 2);
  await client.call("Input.dispatchMouseEvent", { type: "mouseMoved", x: clickX, y: clickY, button: "none" }, 3000).catch(() => undefined);
  await client.call("Input.dispatchMouseEvent", { type: "mousePressed", x: clickX, y: clickY, button: "left", buttons: 1, clickCount: 1 }, 3000);
  await client.call("Input.dispatchMouseEvent", { type: "mouseReleased", x: clickX, y: clickY, button: "left", buttons: 0, clickCount: 1 }, 3000);
  actions.push("audience_yes_clicked_visible_radio");
  await delay(1500);
  await cancelPossibleReloadDialog(client, actions);
  const shot = await captureScreenshot(client, evidenceDir, "made-for-kids-selected.png");
  if (shot) screenshots.push(shot);
  let afterCoordinate = await pageText(client);
  const confirmEnd = Date.now() + 6000;
  while (!isMadeForKidsConfirmed(afterCoordinate) && Date.now() < confirmEnd) {
    await delay(1000);
    afterCoordinate = await pageText(client);
  }
  if (isMadeForKidsConfirmed(afterCoordinate)) {
    actions.push("audience_yes_selected_visible_radio");
    return true;
  }
  actions.push("audience_yes_not_confirmed_stop");
  return false;
}

async function clickBottomRightWizardButton(client: CdpClient, actions: string[], label: string): Promise<void> {
  const domClicked = await runtimeEvaluate(client, `(function(){${helperScript}
    return clickButton("Next") || clickButton("Publish") || clickButton("Save");
  })()`, 5000).catch(() => false);
  if (domClicked) {
    actions.push(`${label}_clicked_dom`);
  } else {
    await clickViewportRatio(client, 0.722, 0.918, actions, `${label}_clicked_coordinate_fallback`);
  }
  await delay(1200);
  await cancelPossibleReloadDialog(client, actions);
}

async function choosePublicVisibility(client: CdpClient, actions: string[], evidenceDir: string, screenshots: string[]): Promise<void> {
  const domClicked = await runtimeEvaluate(client, `(function(){${helperScript}
    return clickText(/^public$/i);
  })()`, 5000).catch(() => false);
  if (domClicked) {
    actions.push("public_clicked_dom");
  } else {
    await clickViewportRatio(client, 0.307, 0.516, actions, "public_clicked_coordinate_fallback");
  }
  await delay(1000);
  await cancelPossibleReloadDialog(client, actions);
  const shot = await captureScreenshot(client, evidenceDir, "public-selected.png");
  if (shot) screenshots.push(shot);
}

async function closePublishedModalForDraftRun(client: CdpClient, actions: string[]): Promise<void> {
  const domClicked = await runtimeEvaluate(client, `(function(){${helperScript}
    return clickButton("Close") || clickText(/^close$/i);
  })()`, 5000).catch(() => false);
  if (domClicked) {
    actions.push("published_modal_close_clicked_dom");
  } else {
    await clickViewportRatio(client, 0.603, 0.713, actions, "published_modal_close_clicked_coordinate_fallback");
  }
  await delay(1200);
  await cancelPossibleReloadDialog(client, actions);
}

async function disconnectPlaywrightBrowser(browser: Browser): Promise<void> {
  const disconnectable = browser as Browser & { disconnect?: () => void };
  if (typeof disconnectable.disconnect === "function") {
    disconnectable.disconnect();
    return;
  }
  // For CDP-attached live browser sessions, closing the browser can close the
  // user's active page and trigger YouTube's beforeunload warning.
}

async function savePlaywrightScreenshot(page: Page, evidenceDir: string, name: string): Promise<string | null> {
  const relativePath = join(evidenceDir, name).replaceAll("\\", "/");
  const absolutePath = join(process.cwd(), relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await page.screenshot({ path: absolutePath, fullPage: true, timeout: 15000 })
    .catch(async () => {
      await page.screenshot({ path: absolutePath, fullPage: false, timeout: 15000 });
    });
  return relativePath;
}

async function playBodyText(page: Page): Promise<string> {
  return page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
}

function looksLikeUploadWizard(text: string): boolean {
  return classifyYoutubeState(text) === "upload_wizard";
}

async function visible(page: Page, selector: string, timeout = 1500): Promise<boolean> {
  return page.locator(selector).first().isVisible({ timeout }).catch(() => false);
}

async function clickFirstVisible(page: Page, locators: Array<ReturnType<Page["locator"]>>, actions: string[], label: string): Promise<boolean> {
  for (const locator of locators) {
    if (await locator.first().isVisible({ timeout: 1500 }).catch(() => false)) {
      await locator.first().click({ timeout: 8000, force: true });
      actions.push(label);
      return true;
    }
  }
  actions.push(`${label}_not_found`);
  return false;
}

async function openUploadWizardWithPlaywright(page: Page, options: CliOptions, actions: string[], screenshots: string[]): Promise<void> {
  let text = await playBodyText(page);
  if (classifyYoutubeState(text) === "published_modal") {
    if (options.dryRun && options.allowNewDraft) {
      const closed = await clickFirstVisible(page, [
        page.getByRole("button", { name: /^close$/i }),
        page.getByText(/^close$/i)
      ], actions, "published_modal_close_clicked_playwright");
      if (closed) await page.waitForTimeout(1200);
      text = await playBodyText(page);
    } else {
      actions.push("published_modal_detected_stop");
      return;
    }
  }

  if (looksLikeUploadWizard(text)) {
    actions.push("upload_dialog_already_open");
    return;
  }

  if (options.dryRun && !options.allowNewDraft) {
    actions.push("dry_run_no_open_upload_dialog_no_new_draft");
    return;
  }

  const createClicked = await clickFirstVisible(page, [
    page.getByRole("button", { name: /^Create$/i }),
    page.locator("button").filter({ hasText: /^Create$/i }),
    page.getByText(/^Create$/i)
  ], actions, "create_clicked_playwright");
  if (!createClicked) return;

  await page.waitForTimeout(800);
  await clickFirstVisible(page, [
    page.getByText(/^Upload videos$/i),
    page.getByRole("menuitem", { name: /upload videos/i }),
    page.locator("[role='menuitem']").filter({ hasText: /upload videos/i })
  ], actions, "upload_videos_clicked_playwright");

  await page.getByText(/^Select files$/i).first().waitFor({ state: "visible", timeout: 30000 });
  screenshots.push(await savePlaywrightScreenshot(page, options.evidenceDir, "upload-select-files-visible.png") ?? "");

  const selectFiles = page.getByText(/^Select files$/i).first();
  const input = page.locator("input[type=file]").first();
  let attached = false;
  try {
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 15000 }),
      selectFiles.click({ timeout: 10000, force: true })
    ]);
    await chooser.setFiles(resolve(options.videoAsset));
    attached = true;
    actions.push("video_file_attached_via_filechooser");
  } catch {
    if (await input.count().catch(() => 0)) {
      await input.setInputFiles(resolve(options.videoAsset));
      attached = true;
      actions.push("video_file_attached_via_input");
    }
  }
  if (!attached) {
    actions.push("video_file_attach_failed");
    return;
  }

  const wizardReady = await page.waitForFunction(() => {
    const body = document.body?.innerText || "";
    return /Details\s+Video elements\s+Checks\s+Visibility/i.test(body)
      && /Title \(required\)|Description|Made for kids/i.test(body);
  }, null, { timeout: 120000 }).then(() => true).catch(() => false);
  actions.push(wizardReady ? "upload_wizard_ready_after_file_attach" : "upload_wizard_not_ready_after_file_attach");
  screenshots.push(await savePlaywrightScreenshot(page, options.evidenceDir, "upload-wizard-after-file-attach.png") ?? "");
}

async function setEditableByIndex(page: Page, index: number, value: string): Promise<void> {
  const locator = page.locator('[contenteditable="true"], textarea').nth(index);
  await locator.waitFor({ state: "visible", timeout: 30000 });
  await locator.click({ timeout: 8000 });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type(value, { delay: 0 });
}

async function fillDetailsWithPlaywright(page: Page, options: CliOptions, actions: string[], screenshots: string[]): Promise<void> {
  await setEditableByIndex(page, 0, options.title);
  await setEditableByIndex(page, 1, options.description);
  actions.push("details_title_description_filled_playwright");
  screenshots.push(await savePlaywrightScreenshot(page, options.evidenceDir, "details-title-description-filled.png") ?? "");
}

async function selectMadeForKidsWithPlaywright(page: Page, actions: string[], screenshots: string[], evidenceDir: string): Promise<boolean> {
  const radio = page.locator("tp-yt-paper-radio-button, ytcp-radio-button, [role='radio']")
    .filter({ hasText: /Yes,.*made for kids/i })
    .first();
  await radio.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => null);
  if (!(await radio.isVisible({ timeout: 10000 }).catch(() => false))) {
    actions.push("audience_yes_radio_not_found_playwright");
    return false;
  }
  await radio.click({ timeout: 10000, force: true });
  await page.waitForTimeout(1000);
  const checked = await radio.getAttribute("aria-checked").catch(() => null);
  actions.push(checked === "true" ? "audience_yes_selected_playwright" : "audience_yes_clicked_playwright");
  screenshots.push(await savePlaywrightScreenshot(page, evidenceDir, "made-for-kids-selected.png") ?? "");
  return true;
}

async function clickWizardButtonWithPlaywright(page: Page, label: "Next" | "Publish", actions: string[]): Promise<void> {
  const button = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).last();
  await button.waitFor({ state: "visible", timeout: 30000 });
  await button.click({ timeout: 10000 });
  actions.push(`${label.toLowerCase()}_clicked_playwright`);
  await page.waitForTimeout(2000);
}

async function advanceWizardWithPlaywright(page: Page, options: CliOptions, actions: string[], screenshots: string[]): Promise<void> {
  const madeForKids = await selectMadeForKidsWithPlaywright(page, actions, screenshots, options.evidenceDir);
  if (!madeForKids) {
    actions.push("wizard_stopped_before_details_next");
    return;
  }

  await clickWizardButtonWithPlaywright(page, "Next", actions);
  screenshots.push(await savePlaywrightScreenshot(page, options.evidenceDir, "video-elements-screen.png") ?? "");
  await clickWizardButtonWithPlaywright(page, "Next", actions);
  await page.waitForFunction(() => /Checks complete|No issues found|Copyright|Visibility/i.test(document.body?.innerText || ""), null, { timeout: 120000 }).catch(() => null);
  screenshots.push(await savePlaywrightScreenshot(page, options.evidenceDir, "checks-screen.png") ?? "");
  await clickWizardButtonWithPlaywright(page, "Next", actions);
  screenshots.push(await savePlaywrightScreenshot(page, options.evidenceDir, "visibility-screen.png") ?? "");

  await selectPublicAndMaybePublishWithPlaywright(page, options, actions, screenshots);
}

async function selectPublicAndMaybePublishWithPlaywright(page: Page, options: CliOptions, actions: string[], screenshots: string[]): Promise<void> {
  const publicLabel = page.getByText(/^Public$/i).last();
  await publicLabel.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => null);
  const box = await publicLabel.boundingBox({ timeout: 10000 }).catch(() => null);
  if (!box) {
    actions.push("public_label_rect_not_found_playwright");
    return;
  }
  await page.mouse.click(Math.max(0, box.x - 22), box.y + box.height / 2);
  actions.push("public_selected_playwright");
  await page.waitForTimeout(1000);
  screenshots.push(await savePlaywrightScreenshot(page, options.evidenceDir, "public-selected.png") ?? "");
  if (options.dryRun) {
    actions.push("dry_run_stopped_before_publish");
    screenshots.push(await savePlaywrightScreenshot(page, options.evidenceDir, "dry-run-before-publish.png") ?? "");
    return;
  }

  await clickWizardButtonWithPlaywright(page, "Publish", actions);
  actions.push("publish_clicked_playwright");
}

async function youtubeUrlFromPage(page: Page): Promise<string | null> {
  const text = await playBodyText(page);
  const links = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => (anchor as HTMLAnchorElement).href)).catch(() => []);
  return text.match(/https:\/\/(?:www\.)?youtube\.com\/shorts\/[A-Za-z0-9_-]+(?:\?feature=share)?/)?.[0]
    ?? links.find((href) => /youtube\.com\/shorts\/[A-Za-z0-9_-]+|youtu\.be\/[A-Za-z0-9_-]+/.test(href))
    ?? links.find((href) => /youtube\.com\/watch\?v=[A-Za-z0-9_-]+/.test(href))
    ?? null;
}

async function runYoutubeShortsUploadPlaywright(options: CliOptions): Promise<Record<string, unknown>> {
  const actions: string[] = ["youtube_upload_only_no_reload_no_goto", "playwright_filechooser_flow"];
  const screenshots: string[] = [];
  let browser: Browser | null = null;
  let page: Page | null = null;

  async function writeResult(result: Record<string, unknown>): Promise<Record<string, unknown>> {
    const resultPath = join(options.evidenceDir, "continue-upload-result.json").replaceAll("\\", "/");
    const absoluteResultPath = join(process.cwd(), resultPath);
    const compactResultPath = join(options.evidenceDir, "continue-upload-compact-result.json").replaceAll("\\", "/");
    await mkdir(dirname(absoluteResultPath), { recursive: true });
    const fullResult: Record<string, unknown> = { ...result, result_path: resultPath, compact_result_path: compactResultPath };
    await writeFile(absoluteResultPath, `${JSON.stringify(fullResult, null, 2)}\n`, "utf8");
    const compactResult = compactYoutubeUploadResult(fullResult);
    if (options.compact || options.recordRun) {
      await writeFile(join(process.cwd(), compactResultPath), `${JSON.stringify(compactResult, null, 2)}\n`, "utf8");
    }
    if (options.recordRun) {
      await appendProductionRunLog({
        workflowName: options.dryRun ? "social-youtube-draft-compact-run" : "social-youtube-publish-compact-run",
        summary: `${options.dryRun ? "Prepared YouTube draft" : "Ran YouTube publish flow"} for ${options.title}; URL: ${String(compactResult.youtube_url ?? "none")}; stopped_before_publish=${String((compactResult.markers as Record<string, boolean>).dry_run_stopped_before_publish ?? false)}; publish_clicked=${String(compactResult.publish_clicked)}. Files: ${resultPath}, ${compactResultPath}`,
        inputs: [
          options.videoAsset,
          options.evidenceDir,
          options.dryRun ? "dry-run/no-publish" : "publish-enabled"
        ],
        assumptions: [
          "Durable CDP browser is available.",
          "YouTube Studio is handled through Playwright file chooser events.",
          options.dryRun ? "This run must stop before Publish." : "This run is allowed to click Publish."
        ],
        outputsCreated: [resultPath, compactResultPath, ...(Array.isArray(fullResult.screenshots) ? fullResult.screenshots as string[] : [])],
        warnings: [
          ...(options.dryRun ? ["No queue status was changed because this was draft-only."] : []),
          ...((compactResult.error ? [String(compactResult.error)] : []))
        ],
        qaResult: compactResult.ok ? "PASS: compact marker summary written." : "FAIL: see compact result and evidence folder.",
        nextManualStep: options.dryRun
          ? "Review/publish manually, then close the bundle only after every required platform URL exists."
          : "Use `npm run social:post-short-video -- <TASK_KEY> --youtube <URL> --tiktok <URL> --instagram <URL> --facebook <URL> --pinterest <URL>` after every required platform URL exists."
      });
    }
    console.log(JSON.stringify(options.compact && !options.verbose ? compactResult : fullResult, null, 2));
    return fullResult;
  }

  try {
    browser = await chromium.connectOverCDP(options.cdpUrl);
    const contexts = browser.contexts();
    const pages = contexts.flatMap((context) => context.pages());
    page = pages.find((candidate) => /studio\.youtube\.com/i.test(candidate.url())) ?? null;
    if (!page) {
      const result = {
        ok: false,
        dry_run: options.dryRun,
        rule: youtubeProductionUploadSafetyRule,
        target: null,
        actions: [...actions, "youtube_studio_existing_tab_not_found_stop"],
        youtube_url: null,
        screenshots: screenshots.filter(Boolean),
        body_excerpt: "",
        error: "No existing YouTube Studio tab was found. Open YouTube Studio manually, then rerun; production upload mode will not navigate or open a new tab."
      };
      process.exitCode = 1;
      return await writeResult(result);
    }
    page.on("dialog", async (dialog) => {
      actions.push(`dialog_dismissed:${dialog.type()}`);
      await dialog.dismiss().catch(() => null);
    });
    await page.bringToFront();
    await page.waitForLoadState("domcontentloaded", { timeout: 45000 }).catch(() => null);
    screenshots.push(await savePlaywrightScreenshot(page, options.evidenceDir, "continue-upload-before.png") ?? "");
    await openUploadWizardWithPlaywright(page, options, actions, screenshots);

    const textAfterOpen = await playBodyText(page);
    if (actions.includes("published_modal_detected_stop")) {
      const result = {
        ok: false,
        dry_run: options.dryRun,
        rule: youtubeUploadReloadCancelRule,
        target: { title: await page.title().catch(() => null), url: page.url() },
        actions,
        youtube_url: await youtubeUrlFromPage(page),
        screenshots: screenshots.filter(Boolean),
        body_excerpt: textAfterOpen.replace(/\s+/g, " ").slice(0, 1200),
        error: "YouTube is already showing the Video published modal; stopping without further clicks."
      };
      process.exitCode = 1;
      return await writeResult(result);
    }
    if (actions.includes("dry_run_no_open_upload_dialog_no_new_draft")) {
      return await writeResult({
        ok: true,
        dry_run: true,
        rule: youtubeUploadReloadCancelRule,
        target: { title: await page.title().catch(() => null), url: page.url() },
        actions,
        youtube_url: null,
        screenshots: screenshots.filter(Boolean),
        body_excerpt: textAfterOpen.replace(/\s+/g, " ").slice(0, 1200)
      });
    }
    if (!looksLikeUploadWizard(textAfterOpen) || actions.includes("video_file_attach_failed") || actions.includes("upload_wizard_not_ready_after_file_attach")) {
      const result = {
        ok: false,
        dry_run: options.dryRun,
        rule: youtubeUploadReloadCancelRule,
        target: { title: await page.title().catch(() => null), url: page.url() },
        actions,
        youtube_url: null,
        screenshots: screenshots.filter(Boolean),
        body_excerpt: textAfterOpen.replace(/\s+/g, " ").slice(0, 1200),
        error: "Upload setup did not reach a verified upload wizard with the requested video attached."
      };
      process.exitCode = 1;
      return await writeResult(result);
    }

    if (/Visibility\s+Choose when to publish/i.test(textAfterOpen)) {
      actions.push("resuming_existing_visibility_step");
      await selectPublicAndMaybePublishWithPlaywright(page, options, actions, screenshots);
    } else {
      await fillDetailsWithPlaywright(page, options, actions, screenshots);
      await advanceWizardWithPlaywright(page, options, actions, screenshots);
    }
    await page.waitForTimeout(options.afterPublishWaitMs);
    screenshots.push(await savePlaywrightScreenshot(page, options.evidenceDir, "continue-upload-after.png") ?? "");
    const finalText = await playBodyText(page);
    const youtubeUrl = await youtubeUrlFromPage(page);
    const ok = options.dryRun ? actions.includes("dry_run_stopped_before_publish") : Boolean(youtubeUrl);
    const result = {
      ok,
      dry_run: options.dryRun,
      rule: youtubeUploadReloadCancelRule,
      target: { title: await page.title().catch(() => null), url: page.url() },
      actions,
      youtube_url: youtubeUrl,
      screenshots: screenshots.filter(Boolean),
      body_excerpt: finalText.replace(/\s+/g, " ").slice(0, 1200)
    };
    if (!ok) process.exitCode = 1;
    return await writeResult(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const result = {
      ok: false,
      dry_run: options.dryRun,
      rule: youtubeUploadReloadCancelRule,
      target: page ? { title: await page.title().catch(() => null), url: page.url() } : null,
      actions,
      youtube_url: page ? await youtubeUrlFromPage(page).catch(() => null) : null,
      screenshots: screenshots.filter(Boolean),
      body_excerpt: page ? (await playBodyText(page).catch(() => "")).replace(/\s+/g, " ").slice(0, 1200) : "",
      error: message
    };
    process.exitCode = 1;
    return await writeResult(result);
  } finally {
    if (browser) await disconnectPlaywrightBrowser(browser).catch(() => null);
  }
}

async function runYoutubeShortsUploadCdpOnly(options: CliOptions): Promise<Record<string, unknown>> {
  const actions: string[] = ["youtube_upload_only_no_reload_no_goto", "cdp_existing_target_flow"];
  const screenshots: string[] = [];

  async function writeResult(result: Record<string, unknown>): Promise<Record<string, unknown>> {
    const resultPath = join(options.evidenceDir, "continue-upload-result.json").replaceAll("\\", "/");
    const absoluteResultPath = join(process.cwd(), resultPath);
    const compactResultPath = join(options.evidenceDir, "continue-upload-compact-result.json").replaceAll("\\", "/");
    await mkdir(dirname(absoluteResultPath), { recursive: true });
    const fullResult: Record<string, unknown> = { ...result, result_path: resultPath, compact_result_path: compactResultPath };
    await writeFile(absoluteResultPath, `${JSON.stringify(fullResult, null, 2)}\n`, "utf8");
    const compactResult = compactYoutubeUploadResult(fullResult);
    if (options.compact || options.recordRun) {
      await writeFile(join(process.cwd(), compactResultPath), `${JSON.stringify(compactResult, null, 2)}\n`, "utf8");
    }
    if (options.recordRun) {
      await appendProductionRunLog({
        workflowName: options.dryRun ? "social-youtube-draft-compact-run" : "social-youtube-publish-compact-run",
        summary: `${options.dryRun ? "Prepared YouTube draft" : "Ran YouTube publish flow"} for ${options.title}; URL: ${String(compactResult.youtube_url ?? "none")}; stopped_before_publish=${String((compactResult.markers as Record<string, boolean>).dry_run_stopped_before_publish ?? false)}; publish_clicked=${String(compactResult.publish_clicked)}. Files: ${resultPath}, ${compactResultPath}`,
        inputs: [
          options.videoAsset,
          options.evidenceDir,
          options.dryRun ? "dry-run/no-publish" : "publish-enabled"
        ],
        assumptions: [
          "Durable CDP browser is available.",
          "YouTube Studio is handled through a direct existing-tab CDP flow.",
          options.dryRun ? "This run must stop before Publish." : "This run is allowed to click Publish."
        ],
        outputsCreated: [resultPath, compactResultPath, ...screenshots],
        warnings: [
          ...(options.dryRun ? ["No queue status was changed because this was draft-only."] : []),
          ...((compactResult.error ? [String(compactResult.error)] : []))
        ],
        qaResult: compactResult.ok ? "PASS: compact marker summary written." : "FAIL: see compact result and evidence folder.",
        nextManualStep: options.dryRun
          ? "Review/publish manually, then close the bundle only after every required platform URL exists."
          : "Use `npm run social:post-short-video -- <TASK_KEY> --youtube <URL> --tiktok <URL> --instagram <URL> --facebook <URL> --pinterest <URL>` after every required platform URL exists."
      });
    }
    console.log(JSON.stringify(options.compact && !options.verbose ? compactResult : fullResult, null, 2));
    return fullResult;
  }

  let target: DevToolsTarget | null = null;
  let client: CdpClient | null = null;
  try {
    const targets = await fetchTargets(options.cdpUrl);
    target = chooseYoutubeTarget(targets);
    if (!target) {
      const result = {
        ok: false,
        dry_run: options.dryRun,
        rule: youtubeProductionUploadSafetyRule,
        target: null,
        actions: [...actions, "youtube_studio_existing_target_not_found_stop"],
        youtube_url: null,
        screenshots,
        body_excerpt: "",
        error: "No existing YouTube Studio target was found. Open YouTube Studio manually, then rerun; CDP-only production mode will not navigate or open a new tab."
      };
      process.exitCode = 1;
      return await writeResult(result);
    }

    client = await connect(target);
    await client.call("Page.enable").catch(() => undefined);
    await client.call("Runtime.enable").catch(() => undefined);
    await client.call("Page.bringToFront").catch(() => undefined);
    await delay(1000);
    await cancelPossibleReloadDialog(client, actions);
    const before = await captureScreenshot(client, options.evidenceDir, "continue-upload-before.png");
    if (before) screenshots.push(before);

    await ensureUploadDialog(client, options, actions);
    if (actions.includes("published_modal_detected_stop") || actions.includes("published_modal_still_open_stop")) {
      const text = await pageText(client);
      const result = {
        ok: false,
        dry_run: options.dryRun,
        rule: youtubeUploadReloadCancelRule,
        target: { title: target.title ?? null, url: target.url ?? null },
        actions,
        youtube_url: null,
        screenshots,
        body_excerpt: text.replace(/\s+/g, " ").slice(0, 1200),
        error: "YouTube is already showing the Video published modal; stopping without further clicks."
      };
      process.exitCode = 1;
      return await writeResult(result);
    }
    if (actions.includes("dry_run_no_open_upload_dialog_no_new_draft")) {
      return await writeResult({
        ok: true,
        dry_run: true,
        rule: youtubeUploadReloadCancelRule,
        target: { title: target.title ?? null, url: target.url ?? null },
        actions,
        youtube_url: null,
        screenshots,
        body_excerpt: (await pageText(client)).replace(/\s+/g, " ").slice(0, 1200)
      });
    }
    const started = await captureScreenshot(client, options.evidenceDir, "upload-dialog-started.png");
    if (started) screenshots.push(started);
    if (hasBlockingAction(actions)) {
      const result = {
        ok: false,
        dry_run: options.dryRun,
        rule: youtubeUploadReloadCancelRule,
        target: { title: target.title ?? null, url: target.url ?? null },
        actions,
        youtube_url: null,
        screenshots,
        body_excerpt: (await pageText(client)).replace(/\s+/g, " ").slice(0, 1200),
        error: "Upload setup did not reach a verified upload wizard with the requested video attached; stopped before title/description writes."
      };
      process.exitCode = 1;
      return await writeResult(result);
    }

    await fillDetails(client, options, actions);
    if (hasBlockingAction(actions)) {
      const result = {
        ok: false,
        dry_run: options.dryRun,
        rule: youtubeUploadReloadCancelRule,
        target: { title: target.title ?? null, url: target.url ?? null },
        actions,
        youtube_url: null,
        screenshots,
        body_excerpt: (await pageText(client)).replace(/\s+/g, " ").slice(0, 1200),
        error: "Details were not safely filled; stopped before advancing the upload wizard."
      };
      process.exitCode = 1;
      return await writeResult(result);
    }

    await advanceWizardFast(client, options, actions, screenshots);
    await delay(options.afterPublishWaitMs);
    const after = await captureScreenshot(client, options.evidenceDir, "continue-upload-after.png");
    if (after) screenshots.push(after);
    const text = await pageText(client);
    const linkText = String(await runtimeEvaluate(client, `document.body ? document.body.innerText : ""`, 5000).catch(() => ""));
    const url = linkText.match(/https:\/\/(?:www\.)?youtube\.com\/shorts\/[A-Za-z0-9_-]+(?:\?feature=share)?/)?.[0]
      ?? linkText.match(/https:\/\/(?:www\.)?youtube\.com\/watch\?v=[A-Za-z0-9_-]+/)?.[0]
      ?? null;
    const result = {
      ok: options.dryRun ? actions.includes("dry_run_stopped_before_publish") : Boolean(url),
      dry_run: options.dryRun,
      rule: youtubeUploadReloadCancelRule,
      target: { title: target.title ?? null, url: target.url ?? null },
      actions,
      youtube_url: url,
      screenshots,
      body_excerpt: text.replace(/\s+/g, " ").slice(0, 1200)
    };
    if (!result.ok) process.exitCode = 1;
    return await writeResult(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const result = {
      ok: false,
      dry_run: options.dryRun,
      rule: youtubeUploadReloadCancelRule,
      target: target ? { title: target.title ?? null, url: target.url ?? null } : null,
      actions,
      youtube_url: null,
      screenshots,
      body_excerpt: client ? (await pageText(client).catch(() => "")).replace(/\s+/g, " ").slice(0, 1200) : "",
      error: message
    };
    process.exitCode = 1;
    return await writeResult(result);
  } finally {
    client?.close();
  }
}

async function advanceWizardFast(client: CdpClient, options: CliOptions, actions: string[], screenshots: string[]): Promise<void> {
  const madeForKidsConfirmed = await selectMadeForKids(client, actions, options.evidenceDir, screenshots);
  if (!madeForKidsConfirmed) {
    actions.push("wizard_stopped_before_details_next");
    return;
  }
  await clickBottomRightWizardButton(client, actions, "details_next");
  const elementsShot = await captureScreenshot(client, options.evidenceDir, "video-elements-screen.png");
  if (elementsShot) screenshots.push(elementsShot);

  await clickBottomRightWizardButton(client, actions, "video_elements_next");
  const checksShot = await captureScreenshot(client, options.evidenceDir, "checks-screen.png");
  if (checksShot) screenshots.push(checksShot);

  await clickBottomRightWizardButton(client, actions, "checks_next");
  const visibilityShot = await captureScreenshot(client, options.evidenceDir, "visibility-screen.png");
  if (visibilityShot) screenshots.push(visibilityShot);

  await choosePublicVisibility(client, actions, options.evidenceDir, screenshots);
  if (options.dryRun) {
    actions.push("dry_run_stopped_before_publish");
    const dryRunShot = await captureScreenshot(client, options.evidenceDir, "dry-run-before-publish.png");
    if (dryRunShot) screenshots.push(dryRunShot);
    return;
  }
  await clickBottomRightWizardButton(client, actions, "publish");
}

export async function runYoutubeShortsUpload(options: CliOptions): Promise<Record<string, unknown>> {
  if (options.cdpOnly) return await runYoutubeShortsUploadCdpOnly(options);
  return await runYoutubeShortsUploadPlaywright(options);
}

async function main(): Promise<void> {
  await runYoutubeShortsUpload(parseYoutubeUploadArgs(process.argv.slice(2)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({ ok: false, error: message, rule: youtubeUploadReloadCancelRule }, null, 2));
    process.exitCode = 1;
  });
}
