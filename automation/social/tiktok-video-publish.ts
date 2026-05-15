import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Locator, type Page } from "@playwright/test";
import { cdpUrlFromEnv } from "../../src/core/cdp-browser.js";
import { buildPostingCaption, firstCaptionLine } from "./social-captions.js";
import { appendProductionRunLog } from "./production-run-log.js";

const queuePath = "content/social/campaigns/book-01/queue.json";
const defaultWaitForPublicMs = 180000;
const defaultPollIntervalMs = 15000;

export interface TikTokPublishOptions {
  cdpUrl: string;
  daySelector: string;
  videoAsset?: string;
  caption?: string;
  evidenceDir?: string;
  waitForPublicMs: number;
  pollIntervalMs: number;
  compact: boolean;
  recordRun: boolean;
  verbose: boolean;
  noPublish: boolean;
  recoverUrlOnly: boolean;
}

export interface TikTokPlan {
  postId: string;
  campaignDay: number;
  taskKey: string;
  videoAsset: string;
  caption: string;
  captionLead: string;
}

export interface TikTokStatus {
  public: boolean;
  underReview: boolean;
  onlyMe: boolean;
  visible: boolean;
  excerpt: string;
}

export const tiktokProductionUploadSafetyRule =
  "TikTok production publishing must use the already-open TikTok Studio tab over CDP, attach the video with a real Playwright file chooser, and avoid page reloads, navigation, new browser pages, or closing the user's browser.";

interface QueueTask {
  platform?: unknown;
  idempotency_key?: unknown;
  approved_asset?: unknown;
  caption_source?: unknown;
  required_hashtags?: unknown;
}

interface QueuePost {
  post_id?: unknown;
  campaign_day?: unknown;
  platform_tasks?: unknown;
  tasks?: unknown;
}

interface QueueFile {
  posts?: unknown;
}

interface CdpTarget {
  id?: string;
  title?: string;
  url?: string;
  type?: string;
  webSocketDebuggerUrl?: string;
}

function readOption(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1];
  const envValue = process.env[`npm_config_${name.replaceAll("-", "_")}`];
  return envValue && !/^(true|false)$/i.test(envValue) ? envValue : undefined;
}

function readFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`) || process.env[`npm_config_${name.replaceAll("-", "_")}`] === "true";
}

function numberOption(args: string[], name: string, fallback: number): number {
  const value = Number(readOption(args, name));
  return Number.isFinite(value) ? value : fallback;
}

function timestampSlug(date = new Date()): string {
  return date.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}

export function parseTikTokPublishArgs(args: string[]): TikTokPublishOptions {
  const cleanArgs = args.filter((arg) => arg !== "--");
  const positionalPaths = cleanArgs.filter((arg) => !arg.startsWith("--") && /[\\/]/.test(arg));
  return {
    cdpUrl: readOption(cleanArgs, "cdp-url") ?? cdpUrlFromEnv(["TIKTOK_CDP_URL", "SOCIAL_CDP_URL"]),
    daySelector: readOption(cleanArgs, "day") ?? cleanArgs.find((arg) => /^day-\d+$/i.test(arg) || /^\d+$/.test(arg)) ?? "day-07",
    videoAsset: readOption(cleanArgs, "video-asset"),
    caption: readOption(cleanArgs, "caption"),
    evidenceDir: readOption(cleanArgs, "evidence-dir") ?? (process.env.npm_config_evidence_dir === "true" ? positionalPaths[0] : undefined),
    waitForPublicMs: numberOption(cleanArgs, "wait-for-public-ms", defaultWaitForPublicMs),
    pollIntervalMs: numberOption(cleanArgs, "poll-interval-ms", defaultPollIntervalMs),
    compact: readFlag(cleanArgs, "compact"),
    recordRun: readFlag(cleanArgs, "record-run"),
    verbose: readFlag(cleanArgs, "verbose"),
    noPublish: readFlag(cleanArgs, "no-publish") || readFlag(cleanArgs, "dry-run"),
    recoverUrlOnly: readFlag(cleanArgs, "recover-url-only")
  };
}

function dayNumber(selector: string): number {
  const match = selector.match(/\d+/);
  if (!match) throw new Error(`Day selector must include a number: ${selector}`);
  return Number(match[0]);
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asTaskArray(value: unknown): QueueTask[] {
  return Array.isArray(value) ? value.filter((item): item is QueueTask => Boolean(asObject(item))) : [];
}

export async function loadTikTokPlan(options: TikTokPublishOptions): Promise<TikTokPlan> {
  const raw = await readFile(join(process.cwd(), queuePath), "utf8");
  const queue = JSON.parse(raw) as QueueFile;
  const day = dayNumber(options.daySelector);
  const posts = Array.isArray(queue.posts) ? queue.posts as QueuePost[] : [];
  const post = posts.find((candidate) => candidate.campaign_day === day);
  if (!post) throw new Error(`No queue post found for Day ${day}.`);

  const task = asTaskArray(post.platform_tasks ?? post.tasks).find((candidate) => asString(candidate.platform) === "Short Video");
  if (!task) throw new Error(`No Short Video task found for Day ${day}.`);

  const taskKey = asString(task.idempotency_key);
  const videoAsset = options.videoAsset ?? asString(task.approved_asset);
  const caption = options.caption ?? buildPostingCaption(task.caption_source, task.required_hashtags);
  const captionLead = firstCaptionLine(task.caption_source);
  const postId = asString(post.post_id);

  if (!taskKey) throw new Error(`Day ${day} Short Video task is missing idempotency_key.`);
  if (!videoAsset) throw new Error(`Day ${day} Short Video task is missing approved_asset.`);
  if (!caption) throw new Error(`Day ${day} Short Video task is missing caption text.`);
  if (!captionLead) throw new Error(`Day ${day} Short Video task is missing a usable first caption line.`);
  if (!postId) throw new Error(`Day ${day} queue post is missing post_id.`);

  return {
    postId,
    campaignDay: day,
    taskKey,
    videoAsset,
    caption,
    captionLead
  };
}

export function classifyTikTokStatus(bodyText: string, captionLead: string): TikTokStatus {
  const normalized = bodyText.replace(/\s+/g, " ").trim();
  const leadIndex = normalized.toLowerCase().indexOf(captionLead.toLowerCase());
  const excerpt = leadIndex >= 0 ? normalized.slice(leadIndex, leadIndex + 700) : normalized.slice(0, 700);
  const visible = leadIndex >= 0;

  return {
    public: visible && /\bEveryone\b/i.test(excerpt) && !/Content under review|Only me/i.test(excerpt),
    underReview: visible && /Content under review/i.test(excerpt),
    onlyMe: visible && /\bOnly me\b/i.test(excerpt),
    visible,
    excerpt
  };
}

function defaultEvidenceDir(plan: TikTokPlan): string {
  return `content/social/campaigns/book-01/evidence/short-video/book01-day-${String(plan.campaignDay).padStart(2, "0")}/tiktok-production-${timestampSlug()}`;
}

async function ensureParent(relativePath: string): Promise<void> {
  await mkdir(dirname(join(process.cwd(), relativePath)), { recursive: true });
}

async function writeJson(relativePath: string, value: unknown): Promise<void> {
  await ensureParent(relativePath);
  await writeFile(join(process.cwd(), relativePath), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function saveScreenshot(page: Page, evidenceDir: string, name: string): Promise<string | null> {
  const relativePath = join(evidenceDir, name).replaceAll("\\", "/");
  await ensureParent(relativePath);
  await withTimeout(page.screenshot({ path: join(process.cwd(), relativePath), fullPage: true, timeout: 15000 }), 20000, `Screenshot ${name}`)
    .catch(async () => {
      await withTimeout(page.screenshot({ path: join(process.cwd(), relativePath), fullPage: false, timeout: 15000 }), 20000, `Viewport screenshot ${name}`);
    });
  return relativePath;
}

async function visible(locator: Locator, timeout = 1500): Promise<boolean> {
  return locator.first().isVisible({ timeout }).catch(() => false);
}

async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText({ timeout: 8000 }).catch(() => "");
}

async function listCdpTargets(cdpUrl: string): Promise<CdpTarget[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  return await fetch(new URL("/json/list", cdpUrl), { signal: controller.signal })
    .then((response) => response.json())
    .finally(() => clearTimeout(timer)) as CdpTarget[];
}

async function connectTikTokPage(cdpUrl: string): Promise<{ browser: Browser; page: Page }> {
  const target = (await listCdpTargets(cdpUrl)).find((candidate) => /tiktok\.com\/tiktokstudio/i.test(candidate.url ?? ""));
  if (!target) throw new Error("No existing TikTok Studio target was found at the CDP endpoint. Open TikTok Studio first.");

  const browser = await withTimeout(chromium.connectOverCDP(cdpUrl, { timeout: 30000 }), 35000, "TikTok CDP connection");
  const page = browser.contexts()
    .flatMap((context) => context.pages())
    .find((candidate) => /tiktok\.com\/tiktokstudio/i.test(candidate.url()));
  if (!page) {
    const disconnectable = browser as Browser & { disconnect?: () => void };
    if (typeof disconnectable.disconnect === "function") disconnectable.disconnect();
    throw new Error("No existing TikTok Studio page was found. Open TikTok Studio first.");
  }
  return { browser, page };
}

async function disconnect(browser: Browser): Promise<void> {
  const disconnectable = browser as Browser & { disconnect?: () => void };
  if (typeof disconnectable.disconnect === "function") {
    disconnectable.disconnect();
    return;
  }
}

async function recoverUploaderIfNeeded(page: Page, actions: string[]): Promise<void> {
  const retry = page.getByRole("button", { name: /retry/i }).first();
  if (await visible(retry, 3000)) {
    await retry.click({ timeout: 5000 });
    actions.push("retry_clicked");
    await page.waitForTimeout(6000);
  }
}

async function openUploaderIfNeeded(page: Page, actions: string[]): Promise<void> {
  const text = await bodyText(page);
  if (/Select video to upload|Select video/i.test(text)) return;

  const uploadButton = page.getByRole("button", { name: /\+?\s*upload/i }).first();
  if (await visible(uploadButton, 3000)) {
    await uploadButton.click({ timeout: 8000 });
    actions.push("upload_clicked");
    await page.waitForTimeout(6000);
  }
}

async function attachVideoWithFileChooser(page: Page, videoAsset: string, actions: string[]): Promise<void> {
  const selectVideo = page.getByText(/select video/i).first();
  await selectVideo.waitFor({ state: "visible", timeout: 30000 });
  const chooserPromise = page.waitForEvent("filechooser", { timeout: 15000 }).catch(() => null);
  await selectVideo.click({ timeout: 10000, force: true });
  const chooser = await chooserPromise;
  if (!chooser) throw new Error("TikTok file chooser did not open.");
  await chooser.setFiles(resolve(videoAsset));
  actions.push("video_filechooser_set");
  await page.waitForTimeout(22000);
}

async function fillCaption(page: Page, caption: string, actions: string[]): Promise<void> {
  const fields = page.locator("[contenteditable='true'], textarea");
  const count = await fields.count();
  for (let index = 0; index < count; index += 1) {
    const field = fields.nth(index);
    if (!(await visible(field, 800))) continue;
    const box = await field.boundingBox().catch(() => null);
    if (!box || box.width < 150 || box.height < 20) continue;
    const label = `${await field.getAttribute("aria-label").catch(() => "") ?? ""} ${await field.getAttribute("placeholder").catch(() => "") ?? ""}`;
    if (/search|comment|reply/i.test(label)) continue;

    await field.click({ timeout: 5000 });
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => null);
    await page.keyboard.type(caption, { delay: 1 });
    actions.push(`caption_filled:${index}`);
    await page.waitForTimeout(2000);
    return;
  }
  throw new Error("TikTok caption field was not found.");
}

async function clickPost(page: Page, actions: string[]): Promise<void> {
  const post = page.getByRole("button", { name: /^(post|publish)$/i }).last();
  await post.waitFor({ state: "visible", timeout: 30000 });
  if (!(await post.isEnabled({ timeout: 5000 }).catch(() => false))) {
    throw new Error("TikTok Post button is visible but disabled.");
  }
  await post.click({ timeout: 10000 });
  actions.push("post_clicked");
}

async function waitForPublicStatus(
  page: Page,
  plan: TikTokPlan,
  options: TikTokPublishOptions,
  actions: string[]
): Promise<TikTokStatus> {
  const deadline = Date.now() + options.waitForPublicMs;
  let lastStatus = classifyTikTokStatus(await bodyText(page), plan.captionLead);

  while (Date.now() < deadline) {
    if (lastStatus.public) return lastStatus;
    await page.waitForTimeout(options.pollIntervalMs);
    lastStatus = classifyTikTokStatus(await bodyText(page), plan.captionLead);
    actions.push(`status_poll:${lastStatus.public ? "public" : lastStatus.underReview ? "under_review" : lastStatus.onlyMe ? "only_me" : "not_ready"}`);
  }

  return lastStatus;
}

async function tryRecoverTikTokUrl(page: Page, cdpUrl: string, actions: string[]): Promise<string | null> {
  const openButtons = page.locator("button, [role='button'], a").filter({ hasText: /^$/ });
  const body = await bodyText(page);
  if (!/Everyone/i.test(body)) return null;

  // The TikTok Studio table exposes an external/open icon in the first row. It has
  // no stable label, so use a coordinate fallback after public status is verified.
  await page.mouse.click(1724, 249);
  actions.push("top_row_open_clicked");
  await page.waitForTimeout(5000);

  const targets = await listCdpTargets(cdpUrl);
  const target = targets.find((candidate) => /tiktok\.com\/@emberdragonbooks\/video\/\d+/i.test(candidate.url ?? ""));
  void openButtons;
  return target?.url ?? null;
}

export function recoverTikTokUrlFromTargets(targets: CdpTarget[], username = "emberdragonbooks"): string | null {
  const publicTarget = targets.find((candidate) => /tiktok\.com\/@emberdragonbooks\/video\/\d+/i.test(candidate.url ?? ""));
  if (publicTarget?.url) return publicTarget.url;

  const analyticsTarget = targets.find((candidate) => /tiktok\.com\/tiktokstudio\/analytics\/\d+/i.test(candidate.url ?? ""));
  const videoId = analyticsTarget?.url?.match(/\/analytics\/(\d+)/)?.[1];
  return videoId ? `https://www.tiktok.com/@${username}/video/${videoId}` : null;
}

async function runTikTokUrlRecovery(plan: TikTokPlan, options: TikTokPublishOptions, evidenceDir: string): Promise<Record<string, unknown>> {
  const targets = await listCdpTargets(options.cdpUrl);
  const relevantTargets = targets
    .filter((candidate) => /tiktok\.com\/(?:@emberdragonbooks\/video\/\d+|tiktokstudio\/analytics\/\d+|tiktokstudio)/i.test(candidate.url ?? ""))
    .map((candidate) => ({
      title: candidate.title,
      type: candidate.type,
      url: candidate.url
    }));
  const tiktokUrl = recoverTikTokUrlFromTargets(targets);
  const result = {
    ok: Boolean(tiktokUrl),
    mode: tiktokUrl ? "url-recovered-from-cdp-targets" : "url-not-recovered",
    day: plan.campaignDay,
    task: plan.taskKey,
    tiktok_url: tiktokUrl,
    evidence_dir: evidenceDir,
    cdp_targets_checked: targets.length,
    relevant_targets: relevantTargets
  };

  await writeJson(`${evidenceDir}/tiktok-publish-result.json`, result);

  if (options.recordRun) {
    await appendProductionRunLog({
      workflowName: "social-tiktok-url-recovery",
      summary: `Recovered TikTok URL for Day ${plan.campaignDay}: ${tiktokUrl ?? "none"}. Evidence: ${evidenceDir}/tiktok-publish-result.json`,
      inputs: [plan.taskKey],
      assumptions: ["Existing TikTok Studio or public TikTok target is open in the durable CDP browser."],
      outputsCreated: [`${evidenceDir}/tiktok-publish-result.json`],
      warnings: tiktokUrl ? [] : ["TikTok URL was not recovered automatically from CDP targets."],
      qaResult: tiktokUrl ? "PASS: TikTok public URL recovered from CDP targets." : "BLOCKED: TikTok public URL still needs manual recovery.",
      nextManualStep: tiktokUrl
        ? "Use the TikTok URL with the short-video bundle closeout once the remaining platform URLs exist."
        : "Open the top TikTok Studio row manually and copy the public video URL."
    });
  }

  console.log(JSON.stringify(options.compact && !options.verbose ? {
    ok: result.ok,
    mode: result.mode,
    tiktok_url: result.tiktok_url,
    evidence_dir: evidenceDir
  } : result, null, 2));
  if (!result.ok) process.exitCode = 1;
  return result;
}

export async function runTikTokPublish(options: TikTokPublishOptions): Promise<Record<string, unknown>> {
  const plan = await loadTikTokPlan(options);
  const evidenceDir = options.evidenceDir ?? defaultEvidenceDir(plan);
  const screenshots: string[] = [];
  const actions: string[] = [];
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    if (options.recoverUrlOnly) return await runTikTokUrlRecovery(plan, options, evidenceDir);

    const session = await connectTikTokPage(options.cdpUrl);
    browser = session.browser;
    page = session.page;
    await withTimeout(page.bringToFront(), 10000, "TikTok page bringToFront");

    await recoverUploaderIfNeeded(page, actions);
    await openUploaderIfNeeded(page, actions);
    screenshots.push(await saveScreenshot(page, evidenceDir, "01-upload-ready.png") ?? "");
    await attachVideoWithFileChooser(page, plan.videoAsset, actions);
    screenshots.push(await saveScreenshot(page, evidenceDir, "02-after-filechooser.png") ?? "");

    const afterAttach = await bodyText(page);
    if (/Something went wrong/i.test(afterAttach)) {
      throw new Error("TikTok returned 'Something went wrong' after video attach.");
    }

    await fillCaption(page, plan.caption, actions);
    screenshots.push(await saveScreenshot(page, evidenceDir, "03-before-post.png") ?? "");

    if (options.noPublish) {
      actions.push("dry_run_stopped_before_post");
      const result = {
        ok: true,
        mode: "ready-for-review",
        stopped_before_publish: true,
        day: plan.campaignDay,
        task: plan.taskKey,
        tiktok_url: null,
        actions,
        screenshots: screenshots.filter(Boolean),
        evidence_dir: evidenceDir
      };
      await writeJson(`${evidenceDir}/tiktok-publish-result.json`, result);
      console.log(JSON.stringify(options.compact && !options.verbose ? { ok: true, mode: "ready-for-review", evidence_dir: evidenceDir } : result, null, 2));
      return result;
    }

    await clickPost(page, actions);
    await page.waitForTimeout(30000);
    screenshots.push(await saveScreenshot(page, evidenceDir, "04-after-post.png") ?? "");
    const status = await waitForPublicStatus(page, plan, options, actions);
    screenshots.push(await saveScreenshot(page, evidenceDir, "05-final-status.png") ?? "");
    const tiktokUrl = status.public ? await tryRecoverTikTokUrl(page, options.cdpUrl, actions) : null;

    const result = {
      ok: status.public,
      mode: status.public ? "public" : status.underReview ? "under-review" : "not-public",
      day: plan.campaignDay,
      task: plan.taskKey,
      tiktok_url: tiktokUrl,
      public_status: status,
      actions,
      screenshots: screenshots.filter(Boolean),
      evidence_dir: evidenceDir
    };
    await writeJson(`${evidenceDir}/tiktok-publish-result.json`, result);

    if (options.recordRun) {
      await appendProductionRunLog({
        workflowName: "social-tiktok-publish",
        summary: `Ran TikTok publish for Day ${plan.campaignDay}; public=${String(status.public)}; URL=${tiktokUrl ?? "none"}. Evidence: ${evidenceDir}/tiktok-publish-result.json`,
        inputs: [plan.videoAsset, plan.taskKey],
        assumptions: ["Existing TikTok Studio tab is open in the durable CDP browser.", "TikTok review may delay public URL recovery."],
        outputsCreated: [`${evidenceDir}/tiktok-publish-result.json`, ...screenshots.filter(Boolean)],
        warnings: status.public ? (tiktokUrl ? [] : ["Public status was visible, but a public TikTok URL was not recovered automatically."]) : [`TikTok final status was ${result.mode}.`],
        qaResult: status.public ? "PASS: TikTok row reached Everyone visibility." : "BLOCKED: TikTok row did not reach Everyone visibility before timeout.",
        nextManualStep: tiktokUrl
          ? "Use the TikTok URL with the short-video bundle closeout once the remaining platform URLs exist."
          : "Recover the TikTok public URL manually from the top TikTok Studio row."
      });
    }

    console.log(JSON.stringify(options.compact && !options.verbose ? {
      ok: result.ok,
      mode: result.mode,
      tiktok_url: result.tiktok_url,
      evidence_dir: evidenceDir
    } : result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const bodyExcerpt = page ? (await bodyText(page)).replace(/\s+/g, " ").slice(0, 1200) : "";
    const result = {
      ok: false,
      mode: "error",
      day: plan.campaignDay,
      task: plan.taskKey,
      tiktok_url: null,
      actions,
      screenshots: screenshots.filter(Boolean),
      evidence_dir: evidenceDir,
      body_excerpt: bodyExcerpt,
      error: message
    };
    await writeJson(`${evidenceDir}/tiktok-publish-result.json`, result);
    console.log(JSON.stringify(options.compact && !options.verbose ? {
      ok: false,
      mode: "error",
      error: message,
      evidence_dir: evidenceDir
    } : result, null, 2));
    process.exitCode = 1;
    return result;
  } finally {
    if (browser) await disconnect(browser).catch(() => null);
  }
}

async function main(): Promise<void> {
  await runTikTokPublish(parseTikTokPublishArgs(process.argv.slice(2)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ ok: false, error: message }, null, 2));
    process.exitCode = 1;
  });
}
