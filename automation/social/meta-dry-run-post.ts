import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { cdpUrlFromEnv } from "../../src/core/cdp-browser.js";
import { validateSocialQueue, type PlatformTask, type QueuePost } from "./validate-queue.js";
import { buildPostingCaption } from "./social-captions.js";

const composerUrl = "https://business.facebook.com/latest/composer";
const evidenceDir = "content/social/campaigns/book-01/evidence/day-03/meta-dry-run";
const expectedFacebookPage = "Ember Dragon Books";
const expectedInstagramAccount = "emberdragonbooks";
const day3TaskKeys = new Set([
  "book01-day03-instagram-feed-post-plus-story-reshare",
  "book01-day03-facebook-page-post"
]);

interface CliOptions {
  cdpUrl: string;
}

interface Day3Plan {
  post: QueuePost;
  tasks: PlatformTask[];
  mediaAsset: string;
  caption: string;
}

interface MetaDryRunResult {
  ok: boolean;
  mode: "ready-for-review" | "blocked" | "error";
  stopped_before_publish: true;
  meta_opened: boolean;
  composer_opened: boolean;
  destinations_selected: {
    facebook_page: boolean;
    instagram: boolean;
  };
  media_used: string | null;
  media_attached: boolean;
  caption_used: string | null;
  caption_filled: boolean;
  blocker_seen: string | null;
  screenshots: string[];
  evidence_json_path: string;
  inspected_tasks: Array<{
    idempotency_key: string | null;
    platform: string | null;
    status: string | null;
    error: string | null;
  }>;
  actions: string[];
  ready_for_manual_publish: boolean;
  ready_for_auto_publish_implementation: boolean;
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
    cdpUrl: optionValue("cdp-url") ?? cdpUrlFromEnv(["META_CDP_URL", "SOCIAL_CDP_URL"])
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalized(value: string): string {
  return value
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function bodyHasDestination(text: string, destination: string): boolean {
  return normalized(text).includes(normalized(destination));
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

function sensitiveBoundary(text: string): string | null {
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

async function saveEvidence(result: Omit<MetaDryRunResult, "evidence_json_path">): Promise<string> {
  const relativePath = join(evidenceDir, "meta-dry-run.json").replaceAll("\\", "/");
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

function inspectedTasks(tasks: PlatformTask[]): MetaDryRunResult["inspected_tasks"] {
  return tasks.map((task) => ({
    idempotency_key: asString(task.idempotency_key),
    platform: asString(task.platform),
    status: asString(task.status),
    error: asString(task.error)
  }));
}

function findDay3Plan(posts: QueuePost[]): Day3Plan {
  const post = posts.find((candidate) => Number(candidate.campaign_day) === 3);
  if (!post) throw new Error("Campaign day 3 was not found in queue.json.");

  const tasks = (Array.isArray(post.platform_tasks) ? post.platform_tasks as PlatformTask[] : [])
    .filter((task) => {
      const key = asString(task.idempotency_key);
      return key ? day3TaskKeys.has(key) : false;
    });

  if (tasks.length !== day3TaskKeys.size) {
    throw new Error("Day 3 Instagram/Facebook tasks were not both found.");
  }

  const notReady = tasks.filter((task) => task.status !== "ready");
  if (notReady.length > 0) {
    throw new Error(`Day 3 Meta tasks must be ready before dry-run. Not ready: ${notReady.map((task) => task.idempotency_key).join(", ")}`);
  }

  const mediaAsset = Array.isArray(post.media_assets) ? asString(post.media_assets[0]) : null;
  if (!mediaAsset) throw new Error("Day 3 post has no media asset.");
  if (!existsSync(join(process.cwd(), mediaAsset))) throw new Error(`Day 3 media asset does not exist: ${mediaAsset}`);

  const captionTask = tasks.find((task) => task.caption_source) ?? tasks.find((task) => Array.isArray(task.required_hashtags));
  const caption = buildPostingCaption(captionTask?.caption_source ?? post.caption_source, captionTask?.required_hashtags);
  if (!caption.trim()) throw new Error("Day 3 caption is empty.");

  return { post, tasks, mediaAsset, caption };
}

async function clickComposerOpenIfNeeded(page: Page, actions: string[]): Promise<boolean> {
  const text = await bodyText(page);
  if (/post details|post to|share to|media|add photo|publish/i.test(text)) return true;

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

async function confirmDestinations(page: Page, actions: string[]): Promise<{ facebook: boolean; instagram: boolean }> {
  let text = await bodyText(page);
  let facebook = bodyHasDestination(text, expectedFacebookPage);
  let instagram = bodyHasDestination(text, expectedInstagramAccount);

  if (facebook && instagram) {
    actions.push("destinations_visible_before_selector_probe");
    return { facebook, instagram };
  }

  const destinationControls = [
    page.getByText(/post to|publish to|share to|accounts|destinations|placements/i).first(),
    page.getByRole("button", { name: /post to|publish to|share to|accounts|destinations|placements|ember/i }).first()
  ];

  for (const control of destinationControls) {
    if (!(await visible(control, 2000))) continue;
    await control.click({ timeout: 4000 }).catch(() => null);
    actions.push("opened_destination_selector");
    await page.waitForTimeout(1500);
    text = await bodyText(page);
    facebook = bodyHasDestination(text, expectedFacebookPage);
    instagram = bodyHasDestination(text, expectedInstagramAccount);
    await page.keyboard.press("Escape").catch(() => null);
    await page.waitForTimeout(500);
    break;
  }

  return { facebook, instagram };
}

async function uploadMedia(page: Page, mediaAsset: string, actions: string[]): Promise<boolean> {
  const absolutePath = join(process.cwd(), mediaAsset);
  let fileInputs = page.locator("input[type='file']");
  let count = await fileInputs.count();

  if (count === 0) {
    const addPhoto = page.getByRole("button", { name: /^add photo$/i }).first();
    if (await visible(addPhoto, 2500)) {
      const chooserPromise = page.waitForEvent("filechooser", { timeout: 5000 }).catch(() => null);
      await addPhoto.click({ timeout: 5000 });
      actions.push("clicked_add_photo");
      const chooser = await chooserPromise;
      if (chooser) {
        await chooser.setFiles(absolutePath);
        actions.push("media_uploaded_via_filechooser");
        await page.waitForTimeout(12000);
        return true;
      }

      const uploadFromDesktop = page.getByRole("menuitem", { name: /upload from desktop/i }).first();
      if (await visible(uploadFromDesktop, 2500)) {
        const uploadChooserPromise = page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null);
        await uploadFromDesktop.click({ timeout: 5000 });
        actions.push("clicked_upload_from_desktop");
        const uploadChooser = await uploadChooserPromise;
        if (uploadChooser) {
          await uploadChooser.setFiles(absolutePath);
          actions.push("media_uploaded_via_upload_from_desktop");
          await page.waitForTimeout(12000);
          return true;
        }
      }
    }

    await page.waitForTimeout(1500);
    fileInputs = page.locator("input[type='file']");
    count = await fileInputs.count();
    if (count === 0) {
      actions.push("media_input_not_found");
      return false;
    }
  }

  await fileInputs.first().setInputFiles(absolutePath);
  actions.push("media_uploaded");
  await page.waitForTimeout(12000);
  return true;
}

async function fillCaption(page: Page, caption: string, actions: string[]): Promise<boolean> {
  const candidateSelectors = [
    "[contenteditable='true']",
    "div[role='textbox']",
    "textarea"
  ];

  for (const selector of candidateSelectors) {
    const count = await page.locator(selector).count();
    for (let index = 0; index < count; index += 1) {
      const field = page.locator(selector).nth(index);
      if (!(await field.isVisible({ timeout: 800 }).catch(() => false))) continue;

      const label = await field.getAttribute("aria-label").catch(() => null)
        ?? await field.getAttribute("placeholder").catch(() => null)
        ?? "";
      const nearbyText = `${label}`.toLowerCase();
      if (/search|hashtag|comment|reply|message|date|time/i.test(nearbyText)) continue;

      const box = await field.boundingBox().catch(() => null);
      if (!box || box.width < 120 || box.height < 20) continue;

      await field.click({ timeout: 4000 });
      await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => null);
      await page.keyboard.type(caption, { delay: 1 });
      actions.push(`caption_filled:${selector}:${index}`);
      await page.waitForTimeout(1000);
      return true;
    }
  }

  actions.push("caption_field_not_found");
  return false;
}

function finalButtonsVisible(text: string): boolean {
  return /\bPublish\b|\bSchedule\b|\bBoost\b|\bPromote\b/.test(text);
}

async function run(): Promise<MetaDryRunResult> {
  const validation = await validateSocialQueue();
  if (!validation.ok) {
    const partial: Omit<MetaDryRunResult, "evidence_json_path"> = {
      ok: false,
      mode: "error",
      stopped_before_publish: true,
      meta_opened: false,
      composer_opened: false,
      destinations_selected: { facebook_page: false, instagram: false },
      media_used: null,
      media_attached: false,
      caption_used: null,
      caption_filled: false,
      blocker_seen: "queue_validation_failed",
      screenshots: [],
      inspected_tasks: [],
      actions: validation.errors,
      ready_for_manual_publish: false,
      ready_for_auto_publish_implementation: false
    };
    const evidencePath = await saveEvidence(partial);
    return { ...partial, evidence_json_path: evidencePath };
  }

  const plan = findDay3Plan(validation.posts);
  const options = parseOptions();
  const actions: string[] = ["No Post, Publish, Schedule, Boost, or Promote action clicked."];
  const screenshots: string[] = [];
  let browser: Browser | null = null;
  let metaOpened = false;
  let composerOpened = false;
  let destinations = { facebook: false, instagram: false };
  let mediaAttached = false;
  let captionFilled = false;
  let blockerSeen: string | null = null;

  try {
    const session = await openMetaPage(options.cdpUrl);
    browser = session.browser;
    const page = session.page;

    await page.goto(composerUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(6000);
    metaOpened = /business\.facebook\.com|facebook\.com/i.test(page.url());
    screenshots.push(await saveScreenshot(page, "01-composer-opened.png"));

    let text = await bodyText(page);
    blockerSeen = sensitiveBoundary(text);
    if (!blockerSeen) {
      composerOpened = await clickComposerOpenIfNeeded(page, actions);
      await page.waitForTimeout(2500);
      screenshots.push(await saveScreenshot(page, "02-before-fill.png"));
      text = await bodyText(page);
      blockerSeen = sensitiveBoundary(text);
    }

    if (!blockerSeen) {
      destinations = await confirmDestinations(page, actions);
      mediaAttached = await uploadMedia(page, plan.mediaAsset, actions);
      captionFilled = await fillCaption(page, plan.caption, actions);
      await page.waitForTimeout(5000);
      screenshots.push(await saveScreenshot(page, "03-pre-publish-ready.png"));
      text = await bodyText(page);
      blockerSeen = sensitiveBoundary(text);
      if (finalButtonsVisible(text)) actions.push("final_action_buttons_visible_but_not_clicked");
    }

    const ok = metaOpened && composerOpened && destinations.facebook && destinations.instagram && mediaAttached && captionFilled && !blockerSeen;
    const partial: Omit<MetaDryRunResult, "evidence_json_path"> = {
      ok,
      mode: ok ? "ready-for-review" : blockerSeen ? "blocked" : "error",
      stopped_before_publish: true,
      meta_opened: metaOpened,
      composer_opened: composerOpened,
      destinations_selected: {
        facebook_page: destinations.facebook,
        instagram: destinations.instagram
      },
      media_used: plan.mediaAsset,
      media_attached: mediaAttached,
      caption_used: plan.caption,
      caption_filled: captionFilled,
      blocker_seen: blockerSeen,
      screenshots,
      inspected_tasks: inspectedTasks(plan.tasks),
      actions,
      ready_for_manual_publish: ok,
      ready_for_auto_publish_implementation: ok
    };
    const evidencePath = await saveEvidence(partial);
    return { ...partial, evidence_json_path: evidencePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const partial: Omit<MetaDryRunResult, "evidence_json_path"> = {
      ok: false,
      mode: "error",
      stopped_before_publish: true,
      meta_opened: metaOpened,
      composer_opened: composerOpened,
      destinations_selected: {
        facebook_page: destinations.facebook,
        instagram: destinations.instagram
      },
      media_used: plan.mediaAsset,
      media_attached: mediaAttached,
      caption_used: plan.caption,
      caption_filled: captionFilled,
      blocker_seen: message,
      screenshots,
      inspected_tasks: inspectedTasks(plan.tasks),
      actions,
      ready_for_manual_publish: false,
      ready_for_auto_publish_implementation: false
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
    if (!result.ok) process.exitCode = result.mode === "blocked" ? 0 : 1;
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ ok: false, mode: "error", error: message, stopped_before_publish: true }, null, 2));
    process.exitCode = 1;
  });
}
