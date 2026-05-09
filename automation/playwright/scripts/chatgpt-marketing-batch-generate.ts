import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { BrowserContext, chromium, Page } from "@playwright/test";
import { repoRoot } from "../../../src/config.js";
import {
  archiveFailedAttempt,
  createSafeAssetSlug,
  createTimestampSlug,
  ensureImageOutputFolders,
  imageOutputFolders,
  saveAttemptMetadata,
  saveTextArtifact
} from "../../../src/core/image-file-manager.js";
import { saveImageQaReport } from "../../../src/core/image-qa.js";
import { appendSessionLog, updateProductionStatus } from "../../../src/core/progress-tracker.js";
import { GenerateResult } from "../../../src/types.js";
import { marketingChatTitle, renameCurrentChat } from "./chatgpt-chat-title.js";
import { assertPromptQaPassed, prepareRawPromptForChatGPTImageGeneration, resolveReferenceImagePaths, selectGeneratedImageCandidate } from "./chatgpt-broke-mode-generate.js";

const defaultProjectUrl = "https://chatgpt.com/g/g-p-69efa9ddfdd08191b8673b0f32dfb621-seek-and-find-books/project";
const defaultCdpUrl = "http://127.0.0.1:9222";
const defaultGenerationTimeoutMs = 120000;
const boundaryPattern = /captcha|rate limit|cooldown|try again later|too many requests|payment|upgrade|subscribe|subscription|verify your account|account warning|unusual activity|log in|sign in|couldn.t sign you in|browser or app may not be secure/i;

interface MarketingBatchPrompt {
  id: string;
  title: string;
  useCase: string;
  promptPath: string;
  assetName: string;
}

interface MarketingBatchManifest {
  campaign: string;
  prompts: MarketingBatchPrompt[];
}

interface BatchOptions {
  manifest: string;
  promptId?: string;
  concurrency: number;
  cdpUrl: string;
  projectUrl: string;
  referenceImageRoot: string;
  timeoutMs: number;
  force: boolean;
}

interface GeneratedImageCandidate {
  src: string;
  alt: string;
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
}

function option(args: string[], name: string): string | undefined {
  const exactIndex = args.indexOf(`--${name}`);
  if (exactIndex >= 0) return args[exactIndex + 1];
  const prefix = `--${name}=`;
  const match = args.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : process.env[`npm_config_${name.replaceAll("-", "_")}`];
}

function flag(args: string[], name: string): boolean {
  const envValue = process.env[`npm_config_${name.replaceAll("-", "_")}`];
  return args.includes(`--${name}`) || args.includes(`--${name}=true`) || /^(true|1|yes)$/i.test(envValue ?? "");
}

function parseArgs(args = process.argv.slice(2)): BatchOptions {
  const manifest = option(args, "manifest") ?? args.find((arg) => !arg.startsWith("--"));
  if (!manifest) {
    throw new Error("Usage: npm run image:marketing-batch -- --manifest content/outputs/marketing/batches/<batch>/manifest.json");
  }
  const concurrency = Number.parseInt(option(args, "concurrency") ?? "4", 10);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) {
    throw new Error("--concurrency must be an integer from 1 to 4.");
  }
  const timeoutSeconds = Number.parseInt(option(args, "timeout-seconds") ?? String(defaultGenerationTimeoutMs / 1000), 10);
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 30 || timeoutSeconds > 900) {
    throw new Error("--timeout-seconds must be an integer from 30 to 900.");
  }
  return {
    manifest,
    promptId: option(args, "prompt-id"),
    concurrency,
    cdpUrl: option(args, "cdp-url") ?? defaultCdpUrl,
    projectUrl: option(args, "project-url") ?? defaultProjectUrl,
    referenceImageRoot: option(args, "reference-image-root") ?? "Ember's Adventures/EtD Images",
    timeoutMs: timeoutSeconds * 1000,
    force: flag(args, "force")
  };
}

async function readManifest(path: string, root: string): Promise<MarketingBatchManifest> {
  const absolute = join(root, path);
  if (!existsSync(absolute)) throw new Error(`Marketing batch manifest does not exist: ${path}`);
  const manifest = JSON.parse(await readFile(absolute, "utf8")) as MarketingBatchManifest;
  if (!Array.isArray(manifest.prompts) || manifest.prompts.length === 0) {
    throw new Error(`Marketing batch manifest has no prompts: ${path}`);
  }
  return manifest;
}

function withReferenceGuard(prompt: string): string {
  return [
    "Use attached image(s) only as visual references for the requested promotional image. Create one image from the prompt below. Do not make a collage, reference sheet, lineup, model sheet, or isolated character study.",
    prompt
  ].join("\n\n");
}

async function findComposer(page: Page) {
  const candidates = [
    page.getByRole("textbox").last(),
    page.locator("textarea").last(),
    page.locator("[contenteditable='true']").last(),
    page.locator(".ProseMirror").last()
  ];
  for (const candidate of candidates) {
    if (await candidate.count().catch(() => 0)) {
      await candidate.waitFor({ state: "visible", timeout: 10000 }).catch(() => undefined);
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }
  }
  throw new Error("Could not find the ChatGPT prompt input.");
}

async function pastePrompt(page: Page, prompt: string): Promise<void> {
  const composer = await findComposer(page);
  await composer.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText(prompt);
}

async function uploadReferenceImages(page: Page, referenceImages: string[]): Promise<void> {
  if (!referenceImages.length) return;
  const waitForAcceptedUploads = async (): Promise<void> => {
    const expectedCount = referenceImages.length;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const uploadedImages = await page.locator("img").evaluateAll((images) => images
        .filter((image) => /uploaded image/i.test((image as HTMLImageElement).alt || ""))
        .length).catch(() => 0);
      const removeButtons = await page.locator("[aria-label*='Remove' i], [data-testid*='remove' i]").count().catch(() => 0);
      if (Math.max(uploadedImages, removeButtons) >= expectedCount) return;
      await page.waitForTimeout(1000);
    }
    throw new Error(`Reference upload did not show ${expectedCount} accepted attachment(s) before submit.`);
  };
  const directInput = page.locator("input#upload-photos, input[type='file'][accept*='image'], input[type='file']").first();
  await directInput.waitFor({ state: "attached", timeout: 10000 }).catch(() => undefined);
  if (await directInput.count().catch(() => 0)) {
    await directInput.setInputFiles(referenceImages);
    await waitForAcceptedUploads();
    return;
  }
  const chooserPromise = page.waitForEvent("filechooser", { timeout: 10000 }).catch(() => undefined);
  const addButton = page.getByRole("button", { name: /add files|attach|upload/i }).last();
  if (await addButton.isVisible().catch(() => false)) {
    await addButton.click();
  } else {
    await page.locator("[aria-label*='Add files' i], [aria-label*='Attach' i], [data-testid*='attach' i]").last().click();
  }
  const uploadMenuItem = page.getByText(/upload photos|upload files|upload photos & files/i).last();
  if (await uploadMenuItem.isVisible({ timeout: 1500 }).catch(() => false)) {
    await uploadMenuItem.click();
  }
  const chooser = await chooserPromise;
  if (!chooser) throw new Error("Could not open ChatGPT file chooser for reference uploads.");
  await chooser.setFiles(referenceImages);
  await waitForAcceptedUploads();
}

async function submitPrompt(page: Page): Promise<void> {
  const sendButton = page.getByRole("button", { name: /send|submit/i }).last();
  if (await sendButton.isVisible().catch(() => false)) {
    await sendButton.click();
    return;
  }
  await page.keyboard.press("Enter");
}

async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
}

async function assertNoBoundary(page: Page): Promise<void> {
  const text = await bodyText(page);
  if (boundaryPattern.test(text) || /auth\/login|\/login/.test(page.url())) {
    throw new Error("ChatGPT showed a login, limit, cooldown, warning, CAPTCHA, payment, or verification boundary.");
  }
}

async function generatedImageCandidates(page: Page): Promise<GeneratedImageCandidate[]> {
  return page.locator("img").evaluateAll((images) => images.map((image) => {
    const img = image as HTMLImageElement;
    return {
      src: img.currentSrc || img.src,
      alt: img.alt || "",
      width: img.naturalWidth,
      height: img.naturalHeight,
      clientWidth: img.clientWidth,
      clientHeight: img.clientHeight
    };
  })).catch(() => []);
}

async function generatedImageCount(page: Page): Promise<number> {
  return new Set((await generatedImageCandidates(page))
    .filter((candidate) => selectGeneratedImageCandidate([candidate]))
    .map((candidate) => candidate.src)).size;
}

async function waitForGeneratedImage(page: Page, startingGeneratedImageCount: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await assertNoBoundary(page);
    if (await generatedImageCount(page) > startingGeneratedImageCount) return;
    await page.waitForTimeout(5000);
  }
  throw new Error(`Timed out after ${Math.round(timeoutMs / 1000)} seconds waiting for ChatGPT marketing image generation to complete.`);
}

async function saveGeneratedImage(page: Page, assetSlug: string, timestamp: string, root: string): Promise<string | undefined> {
  const candidate = selectGeneratedImageCandidate(await generatedImageCandidates(page));
  if (!candidate) return undefined;
  const response = await page.context().request.get(candidate.src, { timeout: 60000 }).catch(() => undefined);
  if (!response?.ok()) return undefined;
  const contentType = response.headers()["content-type"] ?? "";
  const extension = /webp/i.test(contentType) ? ".webp" : /jpe?g/i.test(contentType) ? ".jpg" : ".png";
  const relativePath = `${imageOutputFolders.pendingReview}/${assetSlug}-${timestamp}${extension}`;
  await mkdir(join(root, imageOutputFolders.pendingReview), { recursive: true });
  await writeFile(join(root, relativePath), await response.body());
  return relativePath;
}

async function captureScreenshot(page: Page, assetSlug: string, timestamp: string, root: string): Promise<string> {
  const relativePath = `${imageOutputFolders.pendingReview}/${assetSlug}-${timestamp}-chatgpt-screenshot.png`;
  await mkdir(join(root, imageOutputFolders.pendingReview), { recursive: true });
  await page.screenshot({ path: join(root, relativePath), fullPage: true });
  return relativePath;
}

async function runOnePrompt(params: {
  context: BrowserContext;
  prompt: MarketingBatchPrompt;
  campaign?: string;
  options: BatchOptions;
  root: string;
}): Promise<{ ok: boolean; files: string[]; warnings: string[]; error?: string }> {
  const { context, prompt, options, root } = params;
  const timestamp = createTimestampSlug();
  const assetName = prompt.assetName ?? basename(prompt.promptPath, extname(prompt.promptPath));
  const assetSlug = createSafeAssetSlug(assetName);
  const sourcePrompt = await readFile(join(root, prompt.promptPath), "utf8");
  const preparedPrompt = prepareRawPromptForChatGPTImageGeneration(sourcePrompt);
  const referenceResolution = resolveReferenceImagePaths(sourcePrompt, {
    referenceImages: ["auto"],
    referenceImageRoot: options.referenceImageRoot
  }, root);
  const referenceImageMetadata = referenceResolution.paths.map((path) => relative(root, path).replace(/\\/g, "/"));
  const promptText = referenceResolution.paths.length ? withReferenceGuard(preparedPrompt.prompt) : preparedPrompt.prompt;
  const promptQa = assertPromptQaPassed(promptText);
  const promptCopyPath = await saveTextArtifact(`${imageOutputFolders.pendingReview}/${assetSlug}-${timestamp}-prompt.md`, promptText, { rootDir: root, force: options.force });
  const page = await context.newPage();
  let screenshotPath: string | undefined;
  let imagePath: string | undefined;
  let metadataPath: string | undefined;
  let qaReportPath: string | undefined;
  const warnings = [...preparedPrompt.warnings, ...referenceResolution.warnings, ...promptQa.warnings];
  const chatTitle = marketingChatTitle(params.campaign, prompt.title);

  try {
    console.log(`Opening Seek and Find Books project for ${prompt.id}.`);
    await page.goto(options.projectUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (!/chatgpt\.com/.test(page.url()) || !/seek-and-find-books|g-p-69efa9ddfdd08191b8673b0f32dfb621/i.test(page.url())) {
      throw new Error(`ChatGPT page is not in the Seek and Find Books project: ${page.url()}`);
    }
    await assertNoBoundary(page);
    await uploadReferenceImages(page, referenceResolution.paths);
    console.log(`Uploaded ${referenceResolution.paths.length} reference image(s) for ${prompt.id}.`);
    await pastePrompt(page, promptText);
    const startingGeneratedImageCount = await generatedImageCount(page);
    await submitPrompt(page);
    const titleResult = await renameCurrentChat(page, chatTitle);
    if (titleResult.ok) console.log(`Renamed ChatGPT chat to "${titleResult.title}".`);
    else if (titleResult.warning) warnings.push(titleResult.warning);
    console.log(`Submitted ${prompt.id}; waiting up to ${Math.round(options.timeoutMs / 1000)} seconds.`);
    await waitForGeneratedImage(page, startingGeneratedImageCount, options.timeoutMs);
    imagePath = await saveGeneratedImage(page, assetSlug, timestamp, root);
    screenshotPath = await captureScreenshot(page, assetSlug, timestamp, root);
    if (!imagePath) throw new Error("No generated marketing image candidate could be saved.");

    metadataPath = await saveAttemptMetadata({
      timestamp,
      workflow: "chatgpt-broke-mode-image-generation",
      status: "pending-review",
      assetName,
      assetSlug,
      promptPath: prompt.promptPath,
      promptCopyPath,
      imagePath,
      screenshotPath,
      warnings,
      dryRun: false,
      autoSubmit: true,
      maxAttempts: 1,
      browserMode: "existing",
      cdpUrl: options.cdpUrl,
      referenceImages: referenceImageMetadata,
      chatTitle
    }, { rootDir: root, force: options.force });
    const qa = await saveImageQaReport({ imagePath, metadataPath, promptCopyPath, rootDir: root, force: options.force });
    qaReportPath = qa.reportPath;
    const files = [promptCopyPath, imagePath, screenshotPath, metadataPath, qaReportPath].filter(Boolean) as string[];
    console.log(`Completed ${prompt.id}: ${qa.status.toUpperCase()}.`);
    return { ok: qa.passed, files, warnings: warnings.concat(qa.warnings, qa.failures) };
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : String(error);
    screenshotPath = screenshotPath ?? await captureScreenshot(page, assetSlug, timestamp, root).catch(() => undefined);
    metadataPath = await saveAttemptMetadata({
      timestamp,
      workflow: "chatgpt-broke-mode-image-generation",
      status: "failed",
      assetName,
      assetSlug,
      promptPath: prompt.promptPath,
      promptCopyPath,
      imagePath,
      screenshotPath,
      qaReportPath,
      failureReason,
      warnings: [failureReason, ...warnings],
      dryRun: false,
      autoSubmit: true,
      maxAttempts: 1,
      browserMode: "existing",
      cdpUrl: options.cdpUrl,
      referenceImages: referenceImageMetadata,
      chatTitle
    }, { rootDir: root, force: options.force }).catch(() => undefined);
    const archived = await archiveFailedAttempt({ assetSlug, timestamp, promptCopyPath, metadataPath, qaReportPath, imagePath, screenshotPath, failureReason }, { rootDir: root, force: options.force }).catch(() => []);
    console.log(`Failed ${prompt.id}: ${failureReason}`);
    return { ok: false, files: archived, warnings: [failureReason], error: failureReason };
  } finally {
    await page.close().catch(() => undefined);
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

export async function runMarketingBatch(options: BatchOptions): Promise<void> {
  const root = repoRoot();
  await ensureImageOutputFolders(root);
  const manifest = await readManifest(options.manifest, root);
  const prompts = options.promptId ? manifest.prompts.filter((prompt) => prompt.id === options.promptId) : manifest.prompts;
  if (options.promptId && prompts.length === 0) {
    throw new Error(`No prompt found for --prompt-id ${options.promptId} in ${options.manifest}`);
  }
  const browser = await chromium.connectOverCDP(options.cdpUrl);
  const context = browser.contexts()[0] ?? await browser.newContext({ acceptDownloads: true });
  const results: Array<{ ok: boolean; files: string[]; warnings: string[]; error?: string }> = [];
  try {
    for (const group of chunk(prompts, options.concurrency)) {
      results.push(...await Promise.all(group.map((prompt) => runOnePrompt({ context, prompt, campaign: manifest.campaign, options, root }))));
    }
  } finally {
    const disconnectable = browser as typeof browser & { disconnect?: () => void };
    if (typeof disconnectable.disconnect === "function") disconnectable.disconnect();
    else await browser.close();
  }

  const files = results.flatMap((result) => result.files);
  const warnings = results.flatMap((result) => result.warnings);
  const successful = results.filter((result) => result.ok).length;
  const failed = results.length - successful;
  await appendSessionLog({
    workflow: "image-marketing-batch",
    inputs: { manifest: options.manifest, promptId: options.promptId, concurrency: options.concurrency, timeoutSeconds: Math.round(options.timeoutMs / 1000), projectUrl: options.projectUrl },
    assumptions: [
      "ChatGPT web UI stayed in the Seek and Find Books project.",
      "Uploaded reference images are excluded from generated-result selection.",
      "Images remain pending review until human approval."
    ],
    outputsCreated: files,
    warnings,
    qaResult: failed ? `PARTIAL ${successful}/${results.length}` : "PASS",
    nextManualStep: "Manual visual and text QA each pending-review promo image before approving or posting."
  }, root);
  const statusResult: GenerateResult = {
    ok: failed === 0,
    workflow: "image-marketing-batch",
    summary: `Ran promotional image batch through supervised Broke Mode (${successful}/${results.length} passed automated QA).`,
    files,
    warnings,
    nextStep: "Manual visual and text QA each pending-review promo image before approval."
  };
  await updateProductionStatus(statusResult, root);
  console.log(JSON.stringify({ ok: failed === 0, successful, failed, files, warnings }, null, 2));
  if (failed) process.exitCode = 1;
}

if ((process.argv[1] ?? "").endsWith("chatgpt-marketing-batch-generate.ts")) {
  runMarketingBatch(parseArgs()).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
