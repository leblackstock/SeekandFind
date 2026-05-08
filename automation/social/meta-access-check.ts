import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { validateSocialQueue, type PlatformTask, type QueuePost } from "./validate-queue.js";

const defaultCdpUrl = "http://127.0.0.1:9222";
const composerUrl = "https://business.facebook.com/latest/composer";
const evidenceDir = "content/social/campaigns/book-01/evidence/day-03/meta-access-check";
const expectedFacebookPage = "Ember Dragon Books";
const expectedInstagramHandle = "@emberdragonbooks";
const expectedInstagramBare = "emberdragonbooks";
const blockedTaskKeys = new Set([
  "book01-day03-instagram-feed-post-plus-story-reshare",
  "book01-day03-facebook-page-post"
]);

interface CliOptions {
  cdpUrl: string;
}

interface SelectorProbe {
  label: string;
  opened: boolean;
  text: string | null;
}

interface MetaAccessResult {
  ok: boolean;
  mode: "verified" | "blocked" | "partial" | "error";
  meta_opened: boolean;
  composer_opened: boolean;
  facebook_destination_selectable: boolean;
  instagram_destination_selectable: boolean;
  blocker_seen: string | null;
  screenshots: string[];
  evidence_json_path: string;
  inspected_tasks: Array<{
    idempotency_key: string | null;
    platform: string | null;
    status: string | null;
    error: string | null;
  }>;
  selector_probes: SelectorProbe[];
  should_promote_day3_ig_facebook_to_ready: boolean;
  later_ig_facebook_needs_account_likely_stale: boolean;
  stopped_before_publish: true;
  notes: string[];
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

function parseOptions(): CliOptions {
  return {
    cdpUrl: optionValue("cdp-url") ?? process.env.META_CDP_URL ?? process.env.SOCIAL_CDP_URL ?? defaultCdpUrl
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function includesDestination(text: string, destination: string): boolean {
  return normalizeText(text).includes(normalizeText(destination));
}

function taskLabel(task: PlatformTask): string | null {
  return asString(task.idempotency_key);
}

function isMetaPage(page: Page): boolean {
  try {
    const hostname = new URL(page.url()).hostname;
    return /(^|\.)business\.facebook\.com$/i.test(hostname) || /(^|\.)facebook\.com$/i.test(hostname);
  } catch {
    return false;
  }
}

function isFinalActionLabel(label: string): boolean {
  return /^(post|publish|schedule|boost|promote)$/i.test(label.trim());
}

function isSensitiveBoundaryText(text: string): string | null {
  const checks: Array<[RegExp, string]> = [
    [/captcha|security check|checkpoint|confirm your identity|identity confirmation/i, "security_or_identity_prompt"],
    [/payment|billing|subscribe|subscription/i, "payment_or_subscription_prompt"],
    [/\blog in\b|\bsign in\b|enter your password|forgot password/i, "login_prompt"],
    [/you don't have permission|request access|access denied|not authorized/i, "permission_prompt"]
  ];

  for (const [pattern, label] of checks) {
    if (pattern.test(text)) return label;
  }
  return null;
}

async function visible(locator: Locator, timeout = 1500): Promise<boolean> {
  return locator.first().isVisible({ timeout }).catch(() => false);
}

async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText({ timeout: 8000 }).catch(() => "");
}

async function disconnect(browser: Browser): Promise<void> {
  const disconnectable = browser as Browser & { disconnect?: () => void };
  if (typeof disconnectable.disconnect === "function") {
    disconnectable.disconnect();
    return;
  }
  await browser.close();
}

async function saveScreenshot(page: Page, name: string): Promise<string> {
  const relativePath = join(evidenceDir, name).replaceAll("\\", "/");
  const absolutePath = join(process.cwd(), relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await page.screenshot({ path: absolutePath, fullPage: true, timeout: 15000 })
    .catch(async () => {
      await page.screenshot({ path: absolutePath, fullPage: false, timeout: 15000 });
    });
  return relativePath;
}

async function saveEvidence(result: Omit<MetaAccessResult, "evidence_json_path">): Promise<string> {
  const relativePath = join(evidenceDir, "meta-access-check.json").replaceAll("\\", "/");
  const absolutePath = join(process.cwd(), relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify({ ...result, evidence_json_path: relativePath }, null, 2)}\n`, "utf8");
  return relativePath;
}

async function openMetaPage(cdpUrl: string): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const contexts = browser.contexts();
  const existingPage = contexts.flatMap((context) => context.pages()).find(isMetaPage);
  const context = existingPage?.context() ?? contexts[0] ?? await browser.newContext();
  const page = existingPage ?? await context.newPage();
  return { browser, context, page };
}

async function clickComposerOpenIfNeeded(page: Page, actions: string[]): Promise<boolean> {
  const before = await bodyText(page);
  if (/what do you want to post|create post|post details|publish to|share to|placements|accounts/i.test(before)) {
    return true;
  }

  const candidates = [
    page.getByRole("button", { name: /create post/i }),
    page.getByRole("link", { name: /create post/i }),
    page.getByRole("button", { name: /^create$/i }),
    page.getByRole("link", { name: /^create$/i })
  ];

  for (const candidate of candidates) {
    if (!(await visible(candidate, 2500))) continue;
    const label = await candidate.first().innerText({ timeout: 1000 }).catch(() => "Create post");
    if (isFinalActionLabel(label)) {
      actions.push(`skipped_final_action_button:${label}`);
      continue;
    }

    await candidate.first().click({ timeout: 5000 });
    actions.push(`clicked_composer_open:${label.replace(/\s+/g, " ").trim()}`);
    await page.waitForTimeout(3500);
    return true;
  }

  return false;
}

async function clickProbe(locator: Locator, label: string, page: Page): Promise<SelectorProbe> {
  if (!(await visible(locator, 1800))) {
    return { label, opened: false, text: null };
  }

  const before = await bodyText(page);
  await locator.first().click({ timeout: 4000 }).catch(() => null);
  await page.waitForTimeout(1500);
  const after = await bodyText(page);

  return {
    label,
    opened: after.length !== before.length || after !== before,
    text: after.slice(0, 4000)
  };
}

async function probeSelectors(page: Page): Promise<SelectorProbe[]> {
  const probes: SelectorProbe[] = [];
  const candidates: Array<[string, Locator]> = [
    ["account_switcher", page.getByRole("button", { name: /account|profile|business account|ember/i })],
    ["publish_to", page.getByText(/publish to|post to|share to|accounts|destinations|placements/i).first()],
    ["facebook_destination_text", page.getByText(/Ember Dragon Books/i).first()],
    ["instagram_destination_text", page.getByText(/emberdragonbooks/i).first()]
  ];

  for (const [label, locator] of candidates) {
    probes.push(await clickProbe(locator, label, page));
  }

  await page.keyboard.press("Escape").catch(() => null);
  await page.waitForTimeout(500);
  return probes;
}

function inspectedBlockedTasks(posts: QueuePost[]): MetaAccessResult["inspected_tasks"] {
  return posts.flatMap((post) => Array.isArray(post.platform_tasks) ? post.platform_tasks as PlatformTask[] : [])
    .filter((task) => {
      const key = taskLabel(task);
      return key ? blockedTaskKeys.has(key) : false;
    })
    .map((task) => ({
      idempotency_key: asString(task.idempotency_key),
      platform: asString(task.platform),
      status: asString(task.status),
      error: asString(task.error)
    }));
}

function laterNeedsAccountLikelyStale(posts: QueuePost[]): boolean {
  return posts.some((post) => {
    const day = typeof post.campaign_day === "number" ? post.campaign_day : Number(post.campaign_day);
    if (!Number.isFinite(day) || day <= 3) return false;
    const tasks = Array.isArray(post.platform_tasks) ? post.platform_tasks as PlatformTask[] : [];
    return tasks.some((task) =>
      (task.platform === "Instagram" || task.platform === "Facebook") &&
      task.status === "needs-account"
    );
  });
}

async function run(): Promise<MetaAccessResult> {
  const validation = await validateSocialQueue();
  if (!validation.ok) {
    const partial: Omit<MetaAccessResult, "evidence_json_path"> = {
      ok: false,
      mode: "error",
      meta_opened: false,
      composer_opened: false,
      facebook_destination_selectable: false,
      instagram_destination_selectable: false,
      blocker_seen: "queue_validation_failed",
      screenshots: [],
      inspected_tasks: inspectedBlockedTasks(validation.posts),
      selector_probes: [],
      should_promote_day3_ig_facebook_to_ready: false,
      later_ig_facebook_needs_account_likely_stale: false,
      stopped_before_publish: true,
      notes: validation.errors
    };
    const evidencePath = await saveEvidence(partial);
    return { ...partial, evidence_json_path: evidencePath };
  }

  const options = parseOptions();
  const screenshots: string[] = [];
  const notes: string[] = ["No media uploaded. No Post, Publish, Schedule, Boost, or Promote action clicked."];
  const selectorProbes: SelectorProbe[] = [];
  let browser: Browser | null = null;
  let metaOpened = false;
  let composerOpened = false;
  let blockerSeen: string | null = null;

  try {
    const session = await openMetaPage(options.cdpUrl);
    browser = session.browser;
    const page = session.page;

    await page.goto(composerUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(6000);
    metaOpened = /business\.facebook\.com|facebook\.com/i.test(page.url());
    screenshots.push(await saveScreenshot(page, "01-meta-composer-load.png"));

    let text = await bodyText(page);
    blockerSeen = isSensitiveBoundaryText(text);
    if (!blockerSeen) {
      composerOpened = await clickComposerOpenIfNeeded(page, notes);
      await page.waitForTimeout(3000);
      screenshots.push(await saveScreenshot(page, "02-meta-composer-or-destinations.png"));
      text = await bodyText(page);
      blockerSeen = isSensitiveBoundaryText(text);
    }

    if (!blockerSeen) {
      selectorProbes.push(...await probeSelectors(page));
      screenshots.push(await saveScreenshot(page, "03-meta-selector-state.png"));
    }

    const combinedText = [
      text,
      ...selectorProbes.map((probe) => probe.text ?? "")
    ].join("\n");
    const facebookSelectable = includesDestination(combinedText, expectedFacebookPage);
    const instagramSelectable = includesDestination(combinedText, expectedInstagramHandle) || includesDestination(combinedText, expectedInstagramBare);
    const verified = metaOpened && composerOpened && facebookSelectable && instagramSelectable && !blockerSeen;

    const partial: Omit<MetaAccessResult, "evidence_json_path"> = {
      ok: verified,
      mode: verified ? "verified" : blockerSeen ? "blocked" : "partial",
      meta_opened: metaOpened,
      composer_opened: composerOpened,
      facebook_destination_selectable: facebookSelectable,
      instagram_destination_selectable: instagramSelectable,
      blocker_seen: blockerSeen,
      screenshots,
      inspected_tasks: inspectedBlockedTasks(validation.posts),
      selector_probes: selectorProbes,
      should_promote_day3_ig_facebook_to_ready: verified,
      later_ig_facebook_needs_account_likely_stale: verified && laterNeedsAccountLikelyStale(validation.posts),
      stopped_before_publish: true,
      notes
    };
    const evidencePath = await saveEvidence(partial);
    return { ...partial, evidence_json_path: evidencePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const partial: Omit<MetaAccessResult, "evidence_json_path"> = {
      ok: false,
      mode: "error",
      meta_opened: metaOpened,
      composer_opened: composerOpened,
      facebook_destination_selectable: false,
      instagram_destination_selectable: false,
      blocker_seen: message,
      screenshots,
      inspected_tasks: inspectedBlockedTasks(validation.posts),
      selector_probes: selectorProbes,
      should_promote_day3_ig_facebook_to_ready: false,
      later_ig_facebook_needs_account_likely_stale: false,
      stopped_before_publish: true,
      notes
    };
    const evidencePath = await saveEvidence(partial);
    return { ...partial, evidence_json_path: evidencePath };
  } finally {
    if (browser) await disconnect(browser).catch(() => null);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = result.mode === "partial" || result.mode === "blocked" ? 0 : 1;
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ ok: false, mode: "error", error: message, stopped_before_publish: true }, null, 2));
    process.exitCode = 1;
  });
}
