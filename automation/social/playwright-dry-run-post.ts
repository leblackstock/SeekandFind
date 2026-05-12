import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { cdpSetupHint, durableCdpBrowser, optionalCdpUrlFromEnv } from "../../src/core/cdp-browser.js";
import { buildPostingCaption, firstCaptionLine } from "./social-captions.js";

const execFileAsync = promisify(execFile);
const pinterestCreateUrl = "https://www.pinterest.com/pin-builder/";
const defaultPinterestProfileDir = ".cache/playwright/social/pinterest-profile";

type BrowserMode = "cdp" | "persistent-profile";

interface BrowserOptions {
  browserMode: BrowserMode;
  cdpUrl: string | null;
  closeBrowser: boolean;
}

interface BrowserSession {
  browserMode: BrowserMode;
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
  cdpUrl: string | null;
  profilePath: string | null;
  reusedExistingPinterestTab: boolean;
}

interface HandoffEvidencePlan {
  recommended_receipt_path?: unknown;
  recommended_evidence_path?: unknown;
  recommended_error_path?: unknown;
  timestamp_slug?: unknown;
}

interface HandoffTask {
  platform?: unknown;
  idempotency_key?: unknown;
  board_name?: unknown;
  media_assets?: unknown;
  caption_source?: unknown;
  posting_caption?: unknown;
  required_hashtags?: unknown;
  notes?: unknown;
}

interface HandoffResult {
  ok?: unknown;
  mode?: unknown;
  message?: unknown;
  task?: HandoffTask | null;
  evidence_plan?: HandoffEvidencePlan;
}

interface DryRunSummary {
  ok: boolean;
  mode: string;
  platform: string | null;
  idempotency_key: string | null;
  evidence_path: string | null;
  error_path: string | null;
  stopped_before_publish: true;
  browser_mode?: BrowserMode;
  browser_left_open?: boolean;
  reused_existing_pinterest_tab?: boolean;
  cdp_url?: string | null;
  profile_path?: string | null;
  message?: string;
  error?: string;
  actions?: string[];
}

function npmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).filter((arg) => arg !== "--").includes(`--${name}`);
}

function optionValue(name: string): string | undefined {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1];
  return undefined;
}

function browserOptions(): BrowserOptions {
  const requestedMode = (optionValue("browser-mode") ?? process.env.npm_config_browser_mode)?.toLowerCase();
  const cdpUrl = optionValue("cdp-url") ?? process.env.npm_config_cdp_url ?? optionalCdpUrlFromEnv(["PINTEREST_CDP_URL", "SOCIAL_CDP_URL"]);
  const useCdp = Boolean(cdpUrl) || requestedMode === "existing" || requestedMode === "cdp";
  return {
    browserMode: useCdp ? "cdp" : "persistent-profile",
    cdpUrl: useCdp ? cdpUrl || durableCdpBrowser.defaultUrl : null,
    closeBrowser: hasFlag("close-browser")
  };
}

function pinterestProfileDir(): string {
  return resolve(process.cwd(), process.env.PINTEREST_PLAYWRIGHT_PROFILE_DIR ?? defaultPinterestProfileDir);
}

function firstString(values: unknown): string | null {
  if (Array.isArray(values)) {
    for (const value of values) {
      const text = asString(value);
      if (text) return text;
    }
  }
  return asString(values);
}

function titleText(captionSource: unknown): string {
  const text = firstCaptionLine(captionSource);
  return text ? text.slice(0, 90) : "Ember Seek-and-Find Challenge";
}

function postingCaption(task: HandoffTask): string {
  return asString(task.posting_caption) ?? buildPostingCaption(task.caption_source, task.required_hashtags);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizedUiText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\u2026/g, "")
    .replace(/\.\.\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function boardVisiblePrefix(boardName: string): string {
  const tokens = normalizedUiText(boardName).split(" ").filter(Boolean);
  return tokens.slice(0, Math.min(2, tokens.length)).join(" ");
}

function safePath(relativePath: string | null): string | null {
  return relativePath ? resolve(process.cwd(), relativePath) : null;
}

async function ensureParentDir(relativePath: string | null): Promise<void> {
  const absolutePath = safePath(relativePath);
  if (absolutePath) await mkdir(dirname(absolutePath), { recursive: true });
}

async function runHandoff(): Promise<HandoffResult> {
  const { stdout } = await execFileAsync(npmCommand(), ["run", "social:handoff", "--silent"], {
    cwd: process.cwd(),
    shell: process.platform === "win32",
    maxBuffer: 1024 * 1024
  });
  const output = stdout.trim();
  if (!output) throw new Error("social:handoff returned no output.");
  return JSON.parse(output) as HandoffResult;
}

async function visible(locator: Locator): Promise<boolean> {
  return locator.first().isVisible({ timeout: 1500 }).catch(() => false);
}

async function fillFirstVisible(locators: Locator[], value: string): Promise<boolean> {
  if (!value.trim()) return false;

  for (const locator of locators) {
    if (await visible(locator)) {
      const field = locator.first();
      const filled = await field.fill(value, { timeout: 3000 })
        .then(() => true)
        .catch(async () => field.click({ timeout: 1500 })
          .then(async () => {
            await field.pressSequentially(value, { delay: 1 });
            return true;
          })
          .catch(() => false));
      if (filled) return true;
    }
  }

  return false;
}

async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
}

async function hasSensitiveUiBoundary(page: Page): Promise<boolean> {
  const sensitiveElements = [
    page.getByRole("button", { name: /^log in$/i }),
    page.getByRole("link", { name: /^log in$/i }),
    page.getByRole("button", { name: /^sign up$/i }),
    page.getByRole("link", { name: /^sign up$/i }),
    page.getByText(/captcha|payment|subscribe|subscription|verify your account|identity verification|rate limit/i)
  ];

  for (const element of sensitiveElements) {
    if (await visible(element)) return true;
  }
  return false;
}

function isSensitiveBoundary(text: string): boolean {
  return /captcha|payment|subscribe|subscription|verify your account|identity verification|rate limit|log in|sign in|sign up|create account/i.test(text);
}

async function saveScreenshot(page: Page, relativePath: string | null): Promise<string | null> {
  if (!relativePath) return null;
  const absolutePath = safePath(relativePath);
  if (!absolutePath) return null;
  await ensureParentDir(relativePath);
  await page.screenshot({ path: absolutePath, fullPage: true, timeout: 15000 });
  return relativePath;
}

async function saveError(relativePath: string | null, payload: Record<string, unknown>): Promise<string | null> {
  if (!relativePath) return null;
  const absolutePath = safePath(relativePath);
  if (!absolutePath) return null;
  await ensureParentDir(relativePath);
  await writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return relativePath;
}

async function disconnectBrowser(browser: Browser): Promise<void> {
  const disconnectable = browser as Browser & { disconnect?: () => void };
  if (typeof disconnectable.disconnect === "function") {
    disconnectable.disconnect();
    return;
  }
  throw new Error("Connected CDP browser does not expose a safe disconnect method.");
}

function allPages(contexts: BrowserContext[]): Page[] {
  return contexts.flatMap((context) => context.pages());
}

function isPinterestPage(page: Page): boolean {
  try {
    return /(^|\.)pinterest\.com/i.test(new URL(page.url()).hostname);
  } catch {
    return false;
  }
}

async function openPersistentSession(): Promise<BrowserSession> {
  const profilePath = pinterestProfileDir();
  const context = await chromium.launchPersistentContext(profilePath, { headless: false });
  const page = context.pages()[0] ?? await context.newPage();
  return {
    browserMode: "persistent-profile",
    context,
    page,
    close: () => context.close(),
    cdpUrl: null,
    profilePath,
    reusedExistingPinterestTab: /pinterest\.com/i.test(page.url())
  };
}

async function openCdpSession(cdpUrl: string): Promise<BrowserSession> {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const contexts = browser.contexts();
  const existingPinterestPage = allPages(contexts).find((candidate) => isPinterestPage(candidate));
  const context = existingPinterestPage?.context() ?? contexts[0] ?? await browser.newContext();
  const page = existingPinterestPage ?? await context.newPage();

  return {
    browserMode: "cdp",
    context,
    page,
    close: () => disconnectBrowser(browser),
    cdpUrl,
    profilePath: null,
    reusedExistingPinterestTab: Boolean(existingPinterestPage)
  };
}

async function openBrowserSession(options: BrowserOptions): Promise<BrowserSession> {
  if (options.browserMode === "cdp") {
    if (!options.cdpUrl) throw new Error(`CDP browser mode requires --cdp-url or PINTEREST_CDP_URL. ${cdpSetupHint()}`);
    return openCdpSession(options.cdpUrl);
  }
  return openPersistentSession();
}

async function uploadMediaIfPossible(page: Page, mediaAsset: string | null, actions: string[]): Promise<void> {
  if (!mediaAsset) {
    actions.push("media_missing_in_handoff");
    return;
  }

  const absoluteAssetPath = join(process.cwd(), mediaAsset);
  if (!existsSync(absoluteAssetPath)) {
    throw new Error(`Media asset not found: ${mediaAsset}`);
  }

  const fileInput = page.locator("input[type='file']").first();
  if (await fileInput.count()) {
    await fileInput.setInputFiles(absoluteAssetPath);
    actions.push("media_uploaded");
  } else {
    actions.push("media_input_not_found");
  }
}

async function fillPinterestFields(page: Page, task: HandoffTask, actions: string[]): Promise<void> {
  const title = titleText(task.caption_source);
  const description = postingCaption(task);

  const titleFilled = await fillFirstVisible([
    page.getByLabel(/title/i),
    page.locator("input[aria-label*='title' i]"),
    page.locator("textarea[aria-label*='title' i]"),
    page.locator("input[placeholder*='title' i]"),
    page.locator("textarea[placeholder*='title' i]")
  ], title);
  actions.push(titleFilled ? "title_filled" : "title_field_not_found");

  const descriptionFilled = await fillFirstVisible([
    page.getByLabel(/description/i),
    page.locator("textarea[aria-label*='description' i]"),
    page.locator("textarea[placeholder*='description' i]"),
    page.locator("[contenteditable='true']").first()
  ], description);
  actions.push(descriptionFilled ? "description_filled" : "description_field_not_found");
}

async function clickPinterestBoardDropdownNearPublish(page: Page, actions: string[]): Promise<void> {
  const selectedBoard = page.locator("[data-test-id='board-dropdown-item-selected']").first();
  if (await visible(selectedBoard)) {
    const clickedLabel = await selectedBoard.evaluate((selected) => {
      const clickableSelector = "button,[role='button'],[aria-haspopup],div[tabindex],[data-test-id*='board-dropdown']";
      let candidate: Element | null = selected;

      for (let depth = 0; candidate && depth < 8; depth += 1) {
        if (candidate.matches(clickableSelector)) {
          (candidate as HTMLElement).click();
          return [
            candidate.getAttribute("aria-label"),
            candidate.getAttribute("title"),
            candidate.textContent
          ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
        }
        candidate = candidate.parentElement;
      }

      (selected as HTMLElement).click();
      return selected.textContent?.replace(/\s+/g, " ").trim() || null;
    });

    actions.push(`board_dropdown_opened:${clickedLabel ?? "selected-board-control"}`);
    return;
  }

  const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
  await publishButton.waitFor({ state: "visible", timeout: 5000 });
  const publishHandle = await publishButton.elementHandle({ timeout: 3000 });
  if (!publishHandle) {
    throw new Error("Could not find Pinterest Publish button to anchor board selector.");
  }

  const clickedLabel = await page.evaluate((publish) => {
    const publishRect = publish.getBoundingClientRect();
    const publishCenterY = publishRect.top + publishRect.height / 2;

    const visibleButtons = Array.from(document.querySelectorAll("button"))
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const label = [
          button.getAttribute("aria-label"),
          button.getAttribute("title"),
          button.textContent
        ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
        return { button, rect, label };
      })
      .filter(({ button, rect, label }) => {
        if (button === publish) return false;
        if (rect.width < 60 || rect.height < 25) return false;
        if (rect.right > publishRect.left + 8) return false;
        if (rect.left < publishRect.left - 380) return false;
        if (Math.abs((rect.top + rect.height / 2) - publishCenterY) > 38) return false;
        return !/publish|delete|duplicate|edit|remove|carousel|alt text|create board|more options/i.test(label);
      })
      .sort((left, right) => right.rect.right - left.rect.right);

    const boardButton = visibleButtons[0];
    if (!boardButton) return null;
    boardButton.button.click();
    return boardButton.label || null;
  }, publishHandle);

  if (!clickedLabel) {
    throw new Error("Could not open Pinterest board selector near Publish.");
  }

  actions.push(`board_dropdown_opened:${clickedLabel}`);
}

async function clickPinterestBoardOption(page: Page, boardName: string, actions: string[]): Promise<void> {
  const exactBoardRow = await page.evaluate((targetBoardName) => {
    const desired = targetBoardName.replace(/\s+/g, " ").trim();
    const rows = Array.from(document.querySelectorAll("div[role='button']"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const label = (element.textContent ?? "").replace(/\s+/g, " ").trim();
        const board = label.replace(/Publish$/i, "").trim();
        return {
          board,
          label,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        };
      })
      .filter((row) => row.width > 250 && row.height >= 40 && row.label.endsWith("Publish"));

    return rows.find((row) => row.board === desired) ?? null;
  }, boardName);

  if (exactBoardRow) {
    await page.mouse.click(
      Math.round(exactBoardRow.x + 24),
      Math.round(exactBoardRow.y + exactBoardRow.height / 2)
    );
    actions.push(`board_selected:${exactBoardRow.board}`);
    return;
  }

  throw new Error(`Pinterest board "${boardName}" did not appear as an exact result after search.`);
}

async function readPinterestBoardButtonNearPublish(page: Page): Promise<string | null> {
  const selectedBoard = page.locator("[data-test-id='board-dropdown-item-selected']").first();
  if (await visible(selectedBoard)) {
    return selectedBoard.innerText({ timeout: 3000 }).catch(() => null);
  }

  const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
  const publishHandle = await publishButton.elementHandle({ timeout: 3000 }).catch(() => null);
  if (!publishHandle) return null;

  return page.evaluate((publish) => {
    const publishRect = publish.getBoundingClientRect();
    const publishCenterY = publishRect.top + publishRect.height / 2;

    const visibleButtons = Array.from(document.querySelectorAll("button"))
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const label = [
          button.getAttribute("aria-label"),
          button.getAttribute("title"),
          button.textContent
        ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
        return { button, rect, label };
      })
      .filter(({ button, rect, label }) => {
        if (button === publish) return false;
        if (rect.width < 60 || rect.height < 25) return false;
        if (rect.right > publishRect.left + 8) return false;
        if (rect.left < publishRect.left - 380) return false;
        if (Math.abs((rect.top + rect.height / 2) - publishCenterY) > 38) return false;
        return !/publish|delete|duplicate|edit|remove|carousel|alt text|create board|more options/i.test(label);
      })
      .sort((left, right) => right.rect.right - left.rect.right);

    return visibleButtons[0]?.label || null;
  }, publishHandle);
}

async function verifyPinterestBoardSelected(page: Page, boardName: string, actions: string[]): Promise<void> {
  const selectedBoard = page.locator("[data-test-id='board-dropdown-item-selected']").first();
  if (await visible(selectedBoard)) {
    const selectedLabel = await selectedBoard.innerText({ timeout: 3000 }).catch(() => "");
    const selected = normalizedUiText(selectedLabel);
    const expected = normalizedUiText(boardName);
    if (!selected.includes(expected)) {
      throw new Error(`Pinterest board "${boardName}" was not visibly selected. Current selected board text: ${selectedLabel || "unknown"}.`);
    }
    actions.push(`board_verified:${selectedLabel}`);
    return;
  }

  const selectedLabel = await readPinterestBoardButtonNearPublish(page);
  const selected = selectedLabel ? normalizedUiText(selectedLabel) : "";
  const expected = normalizedUiText(boardName);
  const prefix = boardVisiblePrefix(boardName);
  const matches = Boolean(selected)
    && (selected.includes(expected) || expected.includes(selected) || selected.startsWith(prefix));

  if (!matches) {
    throw new Error(`Pinterest board "${boardName}" was not visibly selected. Current selector text: ${selectedLabel ?? "unknown"}.`);
  }

  actions.push(`board_verified:${selectedLabel}`);
}

async function selectPinterestBoard(page: Page, boardName: string | null, actions: string[]): Promise<void> {
  if (!boardName) {
    throw new Error("Pinterest task is missing board_name.");
  }

  await clickPinterestBoardDropdownNearPublish(page, actions);
  await page.waitForTimeout(1000);
  const searchInput = page.locator("input[aria-label='Search through your boards'], input[placeholder='Search']").first();
  if (!(await visible(searchInput))) {
    throw new Error("Pinterest board search field was not available after opening the board selector.");
  }
  await searchInput.fill(boardName, { timeout: 3000 });
  actions.push("board_search_filled_exact");
  await page.waitForTimeout(1000);

  await clickPinterestBoardOption(page, boardName, actions);
  await page.waitForTimeout(1000);
  await verifyPinterestBoardSelected(page, boardName, actions);
}

async function dryRunPinterest(task: HandoffTask, evidencePlan: HandoffEvidencePlan, options: BrowserOptions): Promise<DryRunSummary> {
  const platform = asString(task.platform) ?? "Pinterest";
  const idempotencyKey = asString(task.idempotency_key);
  const evidencePath = asString(evidencePlan.recommended_evidence_path);
  const errorPath = asString(evidencePlan.recommended_error_path);
  const actions: string[] = [];
  let session: BrowserSession | null = null;
  let page: Page | null = null;

  try {
    session = await openBrowserSession(options);
    page = session.page;
    actions.push(`browser_mode:${session.browserMode}`);
    if (session.reusedExistingPinterestTab) actions.push("reused_existing_pinterest_tab");
    else actions.push("opened_new_pinterest_tab");

    await page.goto(pinterestCreateUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);
    actions.push("opened_pinterest_builder");

    const text = await bodyText(page);
    if (isSensitiveBoundary(text) || await hasSensitiveUiBoundary(page)) {
      throw new Error("Stopped at login or sensitive platform boundary.");
    }

    await uploadMediaIfPossible(page, firstString(task.media_assets), actions);
    await fillPinterestFields(page, task, actions);
    await selectPinterestBoard(page, asString(task.board_name), actions);
    if (actions.includes("media_input_not_found") && actions.includes("title_field_not_found") && actions.includes("description_field_not_found")) {
      throw new Error("Pinterest create controls were not available; likely login, wrong page, or unsupported UI.");
    }
    await saveScreenshot(page, evidencePath);
    actions.push("screenshot_saved");

    return {
      ok: true,
      mode: "dry-run",
      platform,
      idempotency_key: idempotencyKey,
      evidence_path: evidencePath,
      error_path: errorPath,
      stopped_before_publish: true,
      browser_mode: session.browserMode,
      browser_left_open: session.browserMode === "cdp" || !options.closeBrowser,
      reused_existing_pinterest_tab: session.reusedExistingPinterestTab,
      cdp_url: session.cdpUrl,
      profile_path: session.profilePath,
      message: options.closeBrowser || session.browserMode === "cdp" ? undefined : "Browser left open for manual login/review.",
      actions
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const loginBoundary = /login|sensitive platform boundary/i.test(message);
    const browserMessage = loginBoundary
      ? "Browser left open for manual login/review. Log in in this same browser window, then rerun npm run social:dry-run-post."
      : "Browser left open for manual login/review.";
    if (page) {
      await saveScreenshot(page, evidencePath).catch(() => null);
    }
    await saveError(errorPath, {
      ok: false,
      mode: "dry-run-error",
      platform,
      idempotency_key: idempotencyKey,
      error: message,
      url: page ? page.url() : null,
      stopped_before_publish: true,
      browser_mode: session?.browserMode ?? options.browserMode,
      browser_left_open: session?.browserMode === "cdp" || !options.closeBrowser,
      reused_existing_pinterest_tab: session?.reusedExistingPinterestTab ?? false,
      cdp_url: session?.cdpUrl ?? options.cdpUrl,
      profile_path: session?.profilePath ?? (options.browserMode === "persistent-profile" ? pinterestProfileDir() : null),
      message: options.closeBrowser && session?.browserMode !== "cdp" ? undefined : browserMessage,
      actions,
      timestamp: new Date().toISOString()
    });

    return {
      ok: false,
      mode: "dry-run-error",
      platform,
      idempotency_key: idempotencyKey,
      evidence_path: evidencePath,
      error_path: errorPath,
      stopped_before_publish: true,
      browser_mode: session?.browserMode ?? options.browserMode,
      browser_left_open: session?.browserMode === "cdp" || !options.closeBrowser,
      reused_existing_pinterest_tab: session?.reusedExistingPinterestTab ?? false,
      cdp_url: session?.cdpUrl ?? options.cdpUrl,
      profile_path: session?.profilePath ?? (options.browserMode === "persistent-profile" ? pinterestProfileDir() : null),
      message: options.closeBrowser && session?.browserMode !== "cdp" ? undefined : browserMessage,
      error: message,
      actions
    };
  } finally {
    if (session?.browserMode === "cdp") {
      await session.close().catch(() => undefined);
    } else if (options.closeBrowser) {
      await session?.close().catch(() => undefined);
    }
  }
}

async function main(): Promise<void> {
  const options = browserOptions();
  const handoff = await runHandoff();

  if (handoff.mode === "empty") {
    console.log(JSON.stringify({
      ok: true,
      mode: "empty",
      platform: null,
      idempotency_key: null,
      evidence_path: null,
      error_path: null,
      stopped_before_publish: true,
      message: asString(handoff.message) ?? "No ready platform tasks found."
    }));
    return;
  }

  if (handoff.ok !== true || handoff.mode !== "ready" || !handoff.task || !handoff.evidence_plan) {
    throw new Error("social:handoff did not return a ready task.");
  }

  const platform = asString(handoff.task.platform);
  if (platform?.toLowerCase() !== "pinterest") {
    const errorPath = asString(handoff.evidence_plan.recommended_error_path);
    await saveError(errorPath, {
      ok: false,
      mode: "unsupported-platform",
      platform,
      idempotency_key: asString(handoff.task.idempotency_key),
      error: "Only Pinterest dry-runs are supported right now.",
      stopped_before_publish: true,
      timestamp: new Date().toISOString()
    });
    console.log(JSON.stringify({
      ok: false,
      mode: "unsupported-platform",
      platform,
      idempotency_key: asString(handoff.task.idempotency_key),
      evidence_path: asString(handoff.evidence_plan.recommended_evidence_path),
      error_path: errorPath,
      stopped_before_publish: true,
      error: "Only Pinterest dry-runs are supported right now."
    }));
    process.exitCode = 1;
    return;
  }

  const summary = await dryRunPinterest(handoff.task, handoff.evidence_plan, options);
  console.log(JSON.stringify(summary));
  if (!summary.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({
      ok: false,
      mode: "runtime-error",
      platform: null,
      idempotency_key: null,
      evidence_path: null,
      error_path: null,
      stopped_before_publish: true,
      error: message
    }));
    process.exitCode = 1;
  }).finally(() => {
    process.exit(process.exitCode ?? 0);
  });
}
