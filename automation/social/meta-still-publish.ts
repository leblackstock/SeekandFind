import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { cdpUrlFromEnv } from "../../src/core/cdp-browser.js";
import { campaignDateKey } from "./campaign-clock.js";
import { buildPostingAssetRequirements } from "./posting-assets.js";
import { buildPostingCaption } from "./social-captions.js";
import { completePostingTask } from "./complete-posting-task.js";
import { PlatformTask, QueuePost, validateSocialQueue } from "./validate-queue.js";

const composerUrl = "https://business.facebook.com/latest/composer";
const expectedFacebookPage = "Ember Dragon Books";
const expectedInstagramAccount = "emberdragonbooks";
const facebookProfileUrl = "https://www.facebook.com/profile.php?id=61589253935031";
const instagramProfileUrl = "https://www.instagram.com/emberdragonbooks/";

interface CliOptions {
  cdpUrl: string;
  day?: number;
  yesPublish: boolean;
  skipDone: boolean;
  compact: boolean;
}

interface MetaStillPlan {
  post: QueuePost;
  instagramTask: PlatformTask;
  facebookTask: PlatformTask;
  mediaAsset: string;
  caption: string;
  evidenceDir: string;
}

interface PublishResult {
  ok: boolean;
  mode: "ready-for-review" | "posted" | "blocked" | "error";
  campaign_day: number | null;
  media_asset: string | null;
  caption: string | null;
  screenshots: string[];
  actions: string[];
  blocker_seen: string | null;
  urls: {
    instagram: string | null;
    facebook: string | null;
  };
  queue_updates: unknown[];
  result_path: string;
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

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

function parseOptions(): CliOptions {
  const day = optionValue("day");
  return {
    cdpUrl: optionValue("cdp-url") ?? cdpUrlFromEnv(["META_CDP_URL", "SOCIAL_CDP_URL"]),
    day: day ? Number(day) : undefined,
    yesPublish: hasFlag("yes-publish"),
    skipDone: hasFlag("skip-done"),
    compact: hasFlag("compact")
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalized(value: string): string {
  return value.toLowerCase().replace(/^@/, "").replace(/\s+/g, " ").trim();
}

function bodyHasDestination(text: string, destination: string): boolean {
  return normalized(text).includes(normalized(destination));
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
  return page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
}

async function disconnect(browser: Browser): Promise<void> {
  const disconnectable = browser as Browser & { disconnect?: () => void };
  if (typeof disconnectable.disconnect === "function") {
    disconnectable.disconnect();
    return;
  }
  await browser.close();
}

function platformTasks(post: QueuePost): PlatformTask[] {
  return Array.isArray(post.platform_tasks) ? post.platform_tasks as PlatformTask[] : [];
}

function approvedMetaAsset(post: QueuePost, task: PlatformTask): string | null {
  return buildPostingAssetRequirements(post, task)
    .map((requirement) => requirement.approved_asset)
    .find((asset): asset is string => Boolean(asset)) ?? null;
}

function findReadyMetaPlan(posts: QueuePost[], options: CliOptions): MetaStillPlan {
  const today = campaignDateKey();
  const candidates = posts
    .filter((post) => {
      const day = Number(post.campaign_day);
      if (options.day !== undefined && day !== options.day) return false;
      const scheduled = asString(post.scheduled_date);
      return scheduled !== null && scheduled <= today;
    })
    .sort((a, b) => Number(a.campaign_day) - Number(b.campaign_day));

  for (const post of candidates) {
    const tasks = platformTasks(post);
    const instagramTask = tasks.find((task) =>
      task.platform === "Instagram"
      && task.status === "ready"
      && String(task.idempotency_key ?? "").includes("feed-post")
    );
    const facebookTask = tasks.find((task) =>
      task.platform === "Facebook"
      && task.status === "ready"
      && String(task.idempotency_key ?? "").includes("page-post")
    );
    if (!instagramTask || !facebookTask) continue;

    const instagramAsset = approvedMetaAsset(post, instagramTask);
    const facebookAsset = approvedMetaAsset(post, facebookTask);
    if (!instagramAsset || instagramAsset !== facebookAsset) {
      throw new Error(`Meta tasks for Day ${post.campaign_day} do not share one approved 4:5 asset.`);
    }
    if (!existsSync(join(process.cwd(), instagramAsset))) {
      throw new Error(`Approved Meta asset does not exist: ${instagramAsset}`);
    }

    const caption = buildPostingCaption(instagramTask.caption_source ?? post.caption_source, instagramTask.required_hashtags);
    if (!caption.trim()) throw new Error(`Meta caption is empty for Day ${post.campaign_day}.`);

    return {
      post,
      instagramTask,
      facebookTask,
      mediaAsset: instagramAsset,
      caption,
      evidenceDir: `content/social/campaigns/book-01/evidence/meta-still/book01-day-${String(post.campaign_day).padStart(2, "0")}`
    };
  }

  throw new Error("No due ready Instagram/Facebook still pair found.");
}

async function saveScreenshot(page: Page, evidenceDir: string, name: string, fullPage = true): Promise<string> {
  const relativePath = join(evidenceDir, name).replaceAll("\\", "/");
  const absolutePath = join(process.cwd(), relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await page.screenshot({ path: absolutePath, fullPage, timeout: 20000 })
    .catch(async () => {
      await page.screenshot({ path: absolutePath, fullPage: false, timeout: 20000 });
    });
  return relativePath;
}

async function writeResult(evidenceDir: string, result: Omit<PublishResult, "result_path">): Promise<PublishResult> {
  const resultPath = join(evidenceDir, "meta-still-publish-result.json").replaceAll("\\", "/");
  const absolutePath = join(process.cwd(), resultPath);
  await mkdir(dirname(absolutePath), { recursive: true });
  const full = { ...result, result_path: resultPath };
  await writeFile(absolutePath, `${JSON.stringify(full, null, 2)}\n`, "utf8");
  return full;
}

function isMetaPage(page: Page): boolean {
  try {
    const hostname = new URL(page.url()).hostname;
    return /(^|\.)business\.facebook\.com$/i.test(hostname) || /(^|\.)facebook\.com$/i.test(hostname);
  } catch {
    return false;
  }
}

async function openMetaPage(cdpUrl: string): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const contexts = browser.contexts();
  const existingPage = contexts.flatMap((context) => context.pages()).find(isMetaPage);
  const context = existingPage?.context() ?? contexts[0] ?? await browser.newContext();
  const page = existingPage ?? await context.newPage();
  return { browser, context, page };
}

async function dismissMaybeLater(page: Page, actions: string[]): Promise<void> {
  const maybeLater = page.getByRole("button", { name: /maybe later/i }).first();
  if (await visible(maybeLater, 1200)) {
    await maybeLater.click({ timeout: 4000 }).catch(() => null);
    actions.push("clicked_maybe_later");
    await page.waitForTimeout(1200);
  }
}

async function confirmDestinations(page: Page, actions: string[]): Promise<{ facebook: boolean; instagram: boolean }> {
  let text = await bodyText(page);
  let facebook = bodyHasDestination(text, expectedFacebookPage);
  let instagram = bodyHasDestination(text, expectedInstagramAccount);

  if (facebook && instagram) {
    actions.push("destinations_visible");
    return { facebook, instagram };
  }

  const controls = [
    page.getByText(/post to|publish to|share to|accounts|destinations|placements/i).first(),
    page.getByRole("button", { name: /post to|publish to|share to|accounts|destinations|placements|ember/i }).first()
  ];
  for (const control of controls) {
    if (!(await visible(control, 1800))) continue;
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

async function uploadMedia(page: Page, mediaAsset: string, actions: string[]): Promise<void> {
  const absolutePath = join(process.cwd(), mediaAsset);
  let inputs = page.locator("input[type='file']");
  if (await inputs.count() === 0) {
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
        return;
      }

      const uploadChoices = [
        page.getByRole("menuitem", { name: /upload from (desktop|computer)|from (desktop|computer)|choose file/i }).first(),
        page.getByRole("button", { name: /upload from (desktop|computer)|from (desktop|computer)|choose file/i }).first(),
        page.getByText(/upload from (desktop|computer)|from (desktop|computer)|choose file/i).first()
      ];
      for (const choice of uploadChoices) {
        if (!(await visible(choice, 2500))) continue;
        const nestedChooserPromise = page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null);
        await choice.click({ timeout: 5000 });
        actions.push("clicked_upload_choice");
        const nestedChooser = await nestedChooserPromise;
        if (nestedChooser) {
          await nestedChooser.setFiles(absolutePath);
          actions.push("media_uploaded_via_upload_choice");
          await page.waitForTimeout(12000);
          return;
        }
      }
    }

    await page.waitForTimeout(1500);
    inputs = page.locator("input[type='file']");
  }

  if (await inputs.count() === 0) throw new Error("Meta media file input was not found.");
  await inputs.first().setInputFiles(absolutePath);
  actions.push("media_uploaded");
  await page.waitForTimeout(12000);
}

async function fillCaption(page: Page, caption: string, actions: string[]): Promise<void> {
  const selectors = ["[contenteditable='true']", "div[role='textbox']", "textarea"];
  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    for (let index = 0; index < count; index += 1) {
      const field = page.locator(selector).nth(index);
      if (!(await field.isVisible({ timeout: 800 }).catch(() => false))) continue;
      const label = await field.getAttribute("aria-label").catch(() => null)
        ?? await field.getAttribute("placeholder").catch(() => null)
        ?? "";
      if (/search|hashtag|comment|reply|message|date|time/i.test(label)) continue;
      const box = await field.boundingBox().catch(() => null);
      if (!box || box.width < 120 || box.height < 20) continue;
      await field.click({ timeout: 4000 });
      await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => null);
      await page.keyboard.insertText(caption);
      actions.push(`caption_filled:${selector}:${index}`);
      await page.waitForTimeout(1000);
      return;
    }
  }
  throw new Error("Meta caption field was not found.");
}

async function clickPublish(page: Page, actions: string[]): Promise<void> {
  const publishButtons = page.getByRole("button", { name: /^Publish$/i });
  const deadline = Date.now() + 45000;
  do {
    const count = await publishButtons.count().catch(() => 0);
    for (let index = count - 1; index >= 0; index -= 1) {
      const button = publishButtons.nth(index);
      const visibleButton = await button.isVisible({ timeout: 500 }).catch(() => false);
      const enabled = await button.isEnabled({ timeout: 500 }).catch(() => false);
      if (!visibleButton || !enabled) continue;
      await button.click({ timeout: 10000 });
      actions.push("clicked_publish");
      return;
    }
    await page.waitForTimeout(1000);
  } while (Date.now() < deadline);

  throw new Error("Meta Publish button was not visible and enabled before timeout.");
}

async function firstInstagramPostUrl(context: BrowserContext, evidenceDir: string, actions: string[]): Promise<string | null> {
  const page = await context.newPage();
  try {
    await page.goto(instagramProfileUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(7000);
    await saveScreenshot(page, evidenceDir, "05-instagram-profile-after-publish.png", false);
    const href = await page.locator('a[href*="/p/"]').first().getAttribute("href", { timeout: 12000 }).catch(() => null);
    if (!href) return null;
    const url = new URL(href, instagramProfileUrl).toString().replace(/\?.*$/, "");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500);
    await saveScreenshot(page, evidenceDir, "06-instagram-post-opened.png", true);
    actions.push(`instagram_url_recovered:${url}`);
    return url;
  } finally {
    await page.close().catch(() => null);
  }
}

async function firstFacebookPostUrl(context: BrowserContext, evidenceDir: string, actions: string[]): Promise<string | null> {
  const page = await context.newPage();
  try {
    await page.goto(facebookProfileUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(7000);
    await saveScreenshot(page, evidenceDir, "07-facebook-page-after-publish.png", true);
    const hrefs = await page.locator("a[href]").evaluateAll((links) => links
      .map((link) => (link as HTMLAnchorElement).href)
      .filter((href) => /facebook\.com\/(?:photo|permalink|posts)|photo\.php|story_fbid|fbid=/i.test(href))
    ).catch(() => []);
    const href = hrefs.find((candidate) => /fbid=|photo/i.test(candidate)) ?? hrefs[0] ?? null;
    if (!href) return null;
    const url = href.replace(/&comment_id=.*$/, "");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500);
    await saveScreenshot(page, evidenceDir, "08-facebook-post-opened.png", true);
    actions.push(`facebook_url_recovered:${url}`);
    return url;
  } finally {
    await page.close().catch(() => null);
  }
}

async function run(): Promise<PublishResult> {
  const options = parseOptions();
  const validation = await validateSocialQueue();
  if (!validation.ok) throw new Error(`Social queue validation failed: ${validation.errors.join("; ")}`);
  const plan = findReadyMetaPlan(validation.posts, options);
  const actions: string[] = [];
  const screenshots: string[] = [];
  const queueUpdates: unknown[] = [];
  let blockerSeen: string | null = null;
  let browser: Browser | null = null;

  try {
    const session = await openMetaPage(options.cdpUrl);
    browser = session.browser;
    const page = session.page;
    await page.goto(composerUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(6000);
    await dismissMaybeLater(page, actions);
    screenshots.push(await saveScreenshot(page, plan.evidenceDir, "01-composer-opened.png"));

    let text = await bodyText(page);
    blockerSeen = sensitiveBoundary(text);
    if (blockerSeen) {
      return await writeResult(plan.evidenceDir, {
        ok: false,
        mode: "blocked",
        campaign_day: Number(plan.post.campaign_day),
        media_asset: plan.mediaAsset,
        caption: plan.caption,
        screenshots,
        actions,
        blocker_seen: blockerSeen,
        urls: { instagram: null, facebook: null },
        queue_updates: queueUpdates
      });
    }

    const destinations = await confirmDestinations(page, actions);
    if (!destinations.facebook || !destinations.instagram) {
      throw new Error("Meta composer did not show both Facebook and Instagram destinations.");
    }
    await uploadMedia(page, plan.mediaAsset, actions);
    await fillCaption(page, plan.caption, actions);
    await page.waitForTimeout(5000);
    screenshots.push(await saveScreenshot(page, plan.evidenceDir, "02-before-publish.png"));

    if (!options.yesPublish) {
      actions.push("stopped_before_publish_missing_yes_publish");
      return await writeResult(plan.evidenceDir, {
        ok: true,
        mode: "ready-for-review",
        campaign_day: Number(plan.post.campaign_day),
        media_asset: plan.mediaAsset,
        caption: plan.caption,
        screenshots,
        actions,
        blocker_seen: null,
        urls: { instagram: null, facebook: null },
        queue_updates: queueUpdates
      });
    }

    await clickPublish(page, actions);
    await page.waitForTimeout(18000);
    await dismissMaybeLater(page, actions);
    screenshots.push(await saveScreenshot(page, plan.evidenceDir, "03-after-publish.png"));

    const instagram = await firstInstagramPostUrl(session.context, plan.evidenceDir, actions);
    const facebook = await firstFacebookPostUrl(session.context, plan.evidenceDir, actions);

    if (instagram && !options.skipDone) {
      queueUpdates.push(await completePostingTask({
        idempotencyKey: asString(plan.instagramTask.idempotency_key) ?? undefined,
        postedUrl: instagram,
        evidencePath: `${plan.evidenceDir}/06-instagram-post-opened.png`,
        note: "Posted from one Meta Business Suite composer with Facebook.",
        skipNextPacket: true
      }));
    }

    if (facebook && !options.skipDone) {
      queueUpdates.push(await completePostingTask({
        idempotencyKey: asString(plan.facebookTask.idempotency_key) ?? undefined,
        postedUrl: facebook,
        evidencePath: `${plan.evidenceDir}/08-facebook-post-opened.png`,
        note: "Posted from one Meta Business Suite composer with Instagram.",
        skipNextPacket: true
      }));
    }

    return await writeResult(plan.evidenceDir, {
      ok: Boolean(instagram && facebook),
      mode: instagram && facebook ? "posted" : "error",
      campaign_day: Number(plan.post.campaign_day),
      media_asset: plan.mediaAsset,
      caption: plan.caption,
      screenshots,
      actions,
      blocker_seen: instagram && facebook ? null : "published_but_url_recovery_incomplete",
      urls: { instagram, facebook },
      queue_updates: queueUpdates
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return await writeResult(plan.evidenceDir, {
      ok: false,
      mode: "error",
      campaign_day: Number(plan.post.campaign_day),
      media_asset: plan.mediaAsset,
      caption: plan.caption,
      screenshots,
      actions,
      blocker_seen: message,
      urls: { instagram: null, facebook: null },
      queue_updates: queueUpdates
    });
  } finally {
    if (browser) await disconnect(browser).catch(() => null);
  }
}

export function compactMetaStillResult(result: PublishResult): Record<string, unknown> {
  return {
    ok: result.ok,
    mode: result.mode,
    campaign_day: result.campaign_day,
    urls: result.urls,
    blocker_seen: result.blocker_seen,
    screenshots: result.screenshots.length,
    actions: result.actions.length,
    queue_updates: result.queue_updates.length,
    result_path: result.result_path
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then((result) => {
    console.log(JSON.stringify(parseOptions().compact ? compactMetaStillResult(result) : result, null, 2));
    if (!result.ok) process.exitCode = result.mode === "ready-for-review" ? 0 : 1;
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({ ok: false, mode: "error", error: message }, null, 2));
    process.exitCode = 1;
  });
}
