import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { cdpUrlFromEnv } from "../../src/core/cdp-browser.js";

const queuePath = "content/social/campaigns/book-01/queue.json";
const day4PublishResultPath = "content/social/campaigns/book-01/evidence/day-04/meta-publish/publish-result.json";
const evidenceDir = "content/social/campaigns/book-01/evidence/meta-feed-4x5-replacement-2026-05-11/review";

interface QueueTask {
  platform?: string;
  idempotency_key?: string;
  posted_url?: string;
  status?: string;
}

interface QueuePost {
  campaign_day?: number;
  platform_tasks?: QueueTask[];
}

interface QueueFile {
  posts?: QueuePost[];
}

interface ReviewTarget {
  day: number;
  platform: "instagram" | "facebook";
  url: string;
  source: string;
}

interface ImageProbe {
  alt: string;
  src: string;
  currentSrc: string;
  clientWidth: number;
  clientHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}

interface ReviewResult {
  timestamp: string;
  cdpUrl: string;
  evidenceDir: string;
  targets: Array<{
    day: number;
    platform: string;
    source: string;
    url: string;
    finalUrl: string;
    screenshot: string;
    viewportScreenshot: string;
    title: string;
    blockerSeen: string | null;
    bodySnippet: string;
    images: ImageProbe[];
  }>;
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

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
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

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function findQueueTargets(queue: QueueFile): ReviewTarget[] {
  const targets: ReviewTarget[] = [];
  const posts = Array.isArray(queue.posts) ? queue.posts : [];

  for (const post of posts) {
    const day = Number(post.campaign_day);
    if (!Number.isInteger(day) || day < 1 || day > 3) continue;

    for (const task of post.platform_tasks ?? []) {
      const url = asString(task.posted_url);
      const key = asString(task.idempotency_key) ?? "";
      if (!url) continue;

      const platform = asString(task.platform)?.toLowerCase();
      if (platform === "instagram" && /instagram-feed-post/i.test(key)) {
        targets.push({ day, platform: "instagram", url, source: "queue.posted_url" });
      }

      if (platform === "facebook" && /facebook-page-post/i.test(key)) {
        targets.push({ day, platform: "facebook", url, source: "queue.posted_url" });
      }
    }
  }

  return targets;
}

async function findDay4Targets(): Promise<ReviewTarget[]> {
  const result = await readJson<{ urls?: Record<string, unknown> }>(day4PublishResultPath);
  const facebook = asString(result.urls?.facebook);
  const instagram = asString(result.urls?.instagram)?.replace(/\?.*$/, "");
  return [
    instagram ? { day: 4, platform: "instagram", url: instagram, source: "day-04 publish-result.json" } : null,
    facebook ? { day: 4, platform: "facebook", url: facebook, source: "day-04 publish-result.json" } : null
  ].filter((target): target is ReviewTarget => Boolean(target));
}

function isUsablePage(page: Page): boolean {
  try {
    const hostname = new URL(page.url()).hostname;
    return /instagram\.com|facebook\.com|business\.facebook\.com/i.test(hostname);
  } catch {
    return false;
  }
}

async function openContext(cdpUrl: string): Promise<{ browser: Browser; context: BrowserContext }> {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const contexts = browser.contexts();
  const existingPage = contexts.flatMap((context) => context.pages()).find(isUsablePage);
  const context = existingPage?.context() ?? contexts[0] ?? await browser.newContext();
  return { browser, context };
}

async function disconnect(browser: Browser): Promise<void> {
  const disconnectable = browser as Browser & { disconnect?: () => void };
  if (typeof disconnectable.disconnect === "function") {
    disconnectable.disconnect();
    return;
  }
  await browser.close();
}

async function saveScreenshot(page: Page, name: string, fullPage: boolean): Promise<string> {
  const relativePath = join(evidenceDir, name).replaceAll("\\", "/");
  const absolutePath = join(process.cwd(), relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await page.screenshot({ path: absolutePath, fullPage, timeout: 20000 })
    .catch(async () => {
      await page.screenshot({ path: absolutePath, fullPage: false, timeout: 20000 });
    });
  return relativePath;
}

async function imageProbes(page: Page): Promise<ImageProbe[]> {
  return page.locator("img").evaluateAll((images) =>
    images
      .map((img) => {
        const node = img as HTMLImageElement;
        return {
          alt: node.alt ?? "",
          src: node.src ?? "",
          currentSrc: node.currentSrc ?? "",
          clientWidth: node.clientWidth,
          clientHeight: node.clientHeight,
          naturalWidth: node.naturalWidth,
          naturalHeight: node.naturalHeight
        };
      })
      .filter((probe) => probe.naturalWidth >= 200 || probe.naturalHeight >= 200)
      .slice(0, 20)
  ).catch(() => []);
}

async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
}

function fileStem(target: ReviewTarget): string {
  return `day-${String(target.day).padStart(2, "0")}-${target.platform}`;
}

async function reviewTarget(context: BrowserContext, target: ReviewTarget): Promise<ReviewResult["targets"][number]> {
  const page = await context.newPage();
  await page.setViewportSize({ width: target.platform === "instagram" ? 430 : 1280, height: 930 }).catch(() => null);
  await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => null);
  await page.waitForTimeout(3500);

  const text = await bodyText(page);
  const blockerSeen = sensitiveBoundary(text);
  const stem = fileStem(target);
  const screenshot = await saveScreenshot(page, `${stem}-full.png`, true);
  const viewportScreenshot = await saveScreenshot(page, `${stem}-viewport.png`, false);
  const images = await imageProbes(page);
  const title = await page.title().catch(() => "");
  const finalUrl = page.url();
  await page.close().catch(() => null);

  return {
    day: target.day,
    platform: target.platform,
    source: target.source,
    url: target.url,
    finalUrl,
    screenshot,
    viewportScreenshot,
    title,
    blockerSeen,
    bodySnippet: text.replace(/\s+/g, " ").trim().slice(0, 1200),
    images
  };
}

async function main(): Promise<void> {
  const cdpUrl = optionValue("cdp-url") ?? cdpUrlFromEnv(["META_CDP_URL", "SOCIAL_CDP_URL"]);
  const queue = await readJson<QueueFile>(queuePath);
  const targets = [...findQueueTargets(queue), ...(await findDay4Targets())];
  const { browser, context } = await openContext(cdpUrl);

  const result: ReviewResult = {
    timestamp: new Date().toISOString(),
    cdpUrl,
    evidenceDir,
    targets: []
  };

  try {
    for (const target of targets) {
      result.targets.push(await reviewTarget(context, target));
    }
  } finally {
    await disconnect(browser);
  }

  const jsonPath = join(evidenceDir, "live-meta-review.json").replaceAll("\\", "/");
  const absoluteJsonPath = join(process.cwd(), jsonPath);
  await mkdir(dirname(absoluteJsonPath), { recursive: true });
  await writeFile(absoluteJsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ ok: true, reviewed: result.targets.length, evidence: jsonPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
