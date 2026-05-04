import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { chromium, Locator, Page } from "@playwright/test";
import { repoRoot } from "../../../src/config.js";
import { appendSessionLog, updateProductionStatus } from "../../../src/core/progress-tracker.js";
import {
  archiveFailedAttempt,
  assertPromptFile,
  BrokeModeRuntimeOptions,
  createSafeAssetSlug,
  createTimestampSlug,
  defaultBrokeModeOptions,
  enforceMaxAttempts,
  ensureImageOutputFolders,
  imageOutputFolders,
  safeImageFileName,
  saveAttemptMetadata,
  savePromptCopy
} from "../../../src/core/image-file-manager.js";
import { saveImageQaReport } from "../../../src/core/image-qa.js";
import { GenerateResult } from "../../../src/types.js";

const chatGptUrl = "https://chatgpt.com/";

const boundaryPattern = /captcha|rate limit|cooldown|try again later|too many requests|payment|upgrade|subscribe|subscription|verify your account|account warning|unusual activity|log in|sign in|couldn.t sign you in|browser or app may not be secure|try using a different browser/i;
const imageReadyPattern = /download|regenerate|share|copy|image/i;

function option(args: string[], name: string): string | undefined {
  const exactIndex = args.indexOf(`--${name}`);
  if (exactIndex >= 0) return args[exactIndex + 1];
  const prefix = `--${name}=`;
  const match = args.find((item) => item.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  return process.env[`npm_config_${name.replaceAll("-", "_")}`];
}

function flag(args: string[], name: string): boolean {
  const envValue = process.env[`npm_config_${name.replaceAll("-", "_")}`];
  return args.includes(`--${name}`) || args.includes(`--${name}=true`) || /^(true|1|yes)$/i.test(envValue ?? "");
}

function booleanOption(args: string[], name: string, fallback: boolean): boolean {
  const raw = option(args, name);
  if (raw === undefined) return flag(args, name) || fallback;
  if (/^(true|1|yes)$/i.test(raw)) return true;
  if (/^(false|0|no)$/i.test(raw)) return false;
  throw new Error(`--${name} must be true or false.`);
}

export function parseBrokeModeArgs(args: string[] = process.argv.slice(2)): BrokeModeRuntimeOptions {
  const positionalArgs = args.filter((item) => !item.startsWith("--"));
  const prompt = option(args, "prompt") ?? positionalArgs[0];
  if (!prompt) {
    throw new Error("Usage: npm run image:broke-mode -- --prompt content/outputs/prompts/example.md");
  }

  const defaults = defaultBrokeModeOptions(prompt);
  const maxAttempts = enforceMaxAttempts(Number.parseInt(option(args, "max-attempts") ?? String(defaults.maxAttempts), 10));
  const cooldownSeconds = Number.parseInt(option(args, "cooldown-seconds") ?? String(defaults.cooldownSeconds), 10);
  if (!Number.isInteger(cooldownSeconds) || cooldownSeconds < 0) {
    throw new Error("--cooldown-seconds must be a non-negative integer.");
  }

  return {
    ...defaults,
    prompt,
    assetName: option(args, "asset-name") ?? positionalArgs[1],
    browserChannel: option(args, "browser-channel") ?? option(args, "channel"),
    profileDir: option(args, "profile-dir") ?? defaults.profileDir,
    autoSubmit: booleanOption(args, "auto-submit", defaults.autoSubmit),
    maxAttempts,
    cooldownSeconds,
    dryRun: flag(args, "dry-run"),
    force: flag(args, "force")
  };
}

async function launchChatGptContext(root: string, options: Pick<BrokeModeRuntimeOptions, "browserChannel" | "profileDir">) {
  return chromium.launchPersistentContext(join(root, options.profileDir), {
    headless: false,
    acceptDownloads: true,
    channel: options.browserChannel
  });
}

async function waitForApproval(): Promise<boolean> {
  const rl = createInterface({ input, output });
  const answer = await rl.question("Submit this prompt to ChatGPT now? Type YES to submit: ");
  rl.close();
  return answer.trim() === "YES";
}

async function findComposer(page: Page): Promise<Locator> {
  const candidates = [
    page.getByRole("textbox").last(),
    page.locator("textarea").last(),
    page.locator("[contenteditable='true']").last(),
    page.locator(".ProseMirror").last()
  ];
  for (const candidate of candidates) {
    if (await candidate.count().catch(() => 0)) {
      await candidate.waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }
  }
  throw new Error("Could not find the ChatGPT prompt input. The UI may have changed.");
}

async function pastePrompt(page: Page, prompt: string): Promise<void> {
  const composer = await findComposer(page);
  await composer.click();
  await page.keyboard.insertText(prompt);
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
    throw new Error("ChatGPT showed a login, insecure-browser, limit, cooldown, warning, CAPTCHA, payment, or verification boundary.");
  }
}

async function waitForGeneration(page: Page): Promise<void> {
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    await assertNoBoundary(page);
    const text = await bodyText(page);
    const hasDownloadButton = await page.getByRole("button", { name: /download/i }).count().catch(() => 0);
    const hasImage = await page.locator("img").count().catch(() => 0);
    if (hasDownloadButton > 0 || (hasImage > 0 && imageReadyPattern.test(text))) return;
    await page.waitForTimeout(5000);
  }
  throw new Error("Timed out waiting for ChatGPT image generation to complete.");
}

async function captureScreenshot(page: Page, assetSlug: string, timestamp: string, rootDir: string): Promise<string> {
  const relative = `${imageOutputFolders.pendingReview}/${assetSlug}-${timestamp}-chatgpt-screenshot.png`;
  const absolute = join(rootDir, relative);
  await mkdir(join(rootDir, imageOutputFolders.pendingReview), { recursive: true });
  await page.screenshot({ path: absolute, fullPage: true });
  return relative;
}

async function tryDownloadImage(page: Page, assetSlug: string, timestamp: string, rootDir: string): Promise<string | undefined> {
  const downloadButton = page.getByRole("button", { name: /download/i }).last();
  if (!(await downloadButton.isVisible().catch(() => false))) return undefined;

  const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
  await downloadButton.click();
  const download = await downloadPromise;
  const suggested = download.suggestedFilename();
  const extension = extname(suggested) || ".png";
  const fileName = safeImageFileName(assetSlug, timestamp, extension);
  const relative = `${imageOutputFolders.pendingReview}/${fileName}`;
  await download.saveAs(join(rootDir, relative));
  return relative;
}

async function logAttempt(params: {
  options: BrokeModeRuntimeOptions;
  status: string;
  outputs: string[];
  warnings: string[];
  qaResult: string;
  nextManualStep: string;
}, rootDir: string): Promise<void> {
  await appendSessionLog({
    workflow: "chatgpt-broke-mode-image-generation",
    inputs: params.options,
    assumptions: ["One supervised image attempt at a time; no unattended bulk generation."],
    outputsCreated: params.outputs,
    warnings: params.warnings,
    qaResult: params.qaResult,
    nextManualStep: params.nextManualStep
  }, rootDir);
}

async function runOneAttempt(options: BrokeModeRuntimeOptions): Promise<void> {
  const root = repoRoot();
  const timestamp = createTimestampSlug();
  await ensureImageOutputFolders(root);
  const promptText = await assertPromptFile(options.prompt, root);
  const assetName = options.assetName ?? basename(options.prompt, extname(options.prompt));
  const assetSlug = createSafeAssetSlug(assetName);
  const promptCopyPath = await savePromptCopy(options.prompt, assetSlug, timestamp, { rootDir: root, force: options.force });

  if (options.dryRun) {
    const metadataPath = await saveAttemptMetadata({
      timestamp,
      workflow: "chatgpt-broke-mode-image-generation",
      status: "dry-run",
      assetName,
      assetSlug,
      promptPath: options.prompt,
      promptCopyPath,
      warnings: [],
      dryRun: true,
      autoSubmit: options.autoSubmit,
      maxAttempts: options.maxAttempts
    }, { rootDir: root, force: options.force });
    await logAttempt({
      options,
      status: "dry-run",
      outputs: [promptCopyPath, metadataPath],
      warnings: [],
      qaResult: "DRY RUN",
      nextManualStep: "Run without --dry-run when ready to paste into ChatGPT."
    }, root);
    console.log(JSON.stringify({ ok: true, dryRun: true, promptCharacters: promptText.length, files: [promptCopyPath, metadataPath] }, null, 2));
    return;
  }

  const context = await launchChatGptContext(root, options);
  const page = context.pages()[0] ?? await context.newPage();
  let screenshotPath: string | undefined;
  let imagePath: string | undefined;
  let metadataPath: string | undefined;
  let qaReportPath: string | undefined;

  try {
    await page.goto(chatGptUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);
    try {
      await assertNoBoundary(page);
    } catch (error) {
      screenshotPath = await captureScreenshot(page, assetSlug, timestamp, root);
      throw new Error(`${error instanceof Error ? error.message : error} Log into ChatGPT in the Playwright Chromium browser, then rerun this command.`);
    }

    await pastePrompt(page, promptText);
    console.log("Prompt pasted into ChatGPT. Review it in the browser.");
    if (!options.autoSubmit) {
      const approved = await waitForApproval();
      if (!approved) {
        metadataPath = await saveAttemptMetadata({
          timestamp,
          workflow: "chatgpt-broke-mode-image-generation",
          status: "canceled",
          assetName,
          assetSlug,
          promptPath: options.prompt,
          promptCopyPath,
          warnings: ["Submission declined by human reviewer."],
          dryRun: false,
          autoSubmit: false,
          maxAttempts: options.maxAttempts
        }, { rootDir: root, force: options.force });
        await logAttempt({
          options,
          status: "canceled",
          outputs: [promptCopyPath, metadataPath],
          warnings: ["Submission declined by human reviewer."],
          qaResult: "CANCELED",
          nextManualStep: "Rerun when the prompt is ready."
        }, root);
        console.log(JSON.stringify({ ok: false, canceled: true, files: [promptCopyPath, metadataPath] }, null, 2));
        return;
      }
    }

    await submitPrompt(page);
    await waitForGeneration(page);
    imagePath = await tryDownloadImage(page, assetSlug, timestamp, root);
    screenshotPath = await captureScreenshot(page, assetSlug, timestamp, root);

    if (!imagePath) {
      const failureReason = "No reliable ChatGPT image download button was found. Screenshot evidence was saved for manual download.";
      metadataPath = await saveAttemptMetadata({
        timestamp,
        workflow: "chatgpt-broke-mode-image-generation",
        status: "failed",
        assetName,
        assetSlug,
        promptPath: options.prompt,
        promptCopyPath,
        screenshotPath,
        failureReason,
        warnings: [failureReason],
        dryRun: false,
        autoSubmit: options.autoSubmit,
        maxAttempts: options.maxAttempts
      }, { rootDir: root, force: options.force });
      const archived = await archiveFailedAttempt({ assetSlug, timestamp, promptCopyPath, metadataPath, screenshotPath, failureReason }, { rootDir: root, force: options.force });
      await logAttempt({
        options,
        status: "failed",
        outputs: archived,
        warnings: [failureReason],
        qaResult: "FAIL",
        nextManualStep: "Download the image manually from ChatGPT, then run image QA."
      }, root);
      console.log(JSON.stringify({ ok: false, manualDownloadRequired: true, files: archived }, null, 2));
      return;
    }

    metadataPath = await saveAttemptMetadata({
      timestamp,
      workflow: "chatgpt-broke-mode-image-generation",
      status: "pending-review",
      assetName,
      assetSlug,
      promptPath: options.prompt,
      promptCopyPath,
      imagePath,
      screenshotPath,
      warnings: [],
      dryRun: false,
      autoSubmit: options.autoSubmit,
      maxAttempts: options.maxAttempts
    }, { rootDir: root, force: options.force });
    const qa = await saveImageQaReport({ imagePath, metadataPath, promptCopyPath, rootDir: root, force: options.force });
    qaReportPath = qa.reportPath;

    const outputs = [promptCopyPath, imagePath, screenshotPath, metadataPath, qaReportPath].filter(Boolean) as string[];
    if (!qa.passed) {
      const archived = await archiveFailedAttempt({
        assetSlug,
        timestamp,
        promptCopyPath,
        metadataPath,
        qaReportPath,
        imagePath,
        screenshotPath,
        failureReason: qa.failures.join("; ")
      }, { rootDir: root, force: options.force });
      await logAttempt({
        options,
        status: "failed",
        outputs: archived,
        warnings: qa.failures.concat(qa.warnings),
        qaResult: "FAIL",
        nextManualStep: "Review the failed archive before trying again."
      }, root);
      console.log(JSON.stringify({ ok: false, qa, files: archived }, null, 2));
      return;
    }

    await logAttempt({
      options,
      status: qa.status,
      outputs,
      warnings: qa.warnings,
      qaResult: qa.status.toUpperCase(),
      nextManualStep: "Manual visual QA is required before moving the image to approved."
    }, root);
    const statusResult: GenerateResult = {
      ok: true,
      workflow: "image-broke-mode",
      summary: "Generated supervised ChatGPT image attempt.",
      files: outputs,
      warnings: qa.warnings,
      nextStep: "Manual visual QA is required before approval."
    };
    await updateProductionStatus(statusResult, root);
    console.log(JSON.stringify({ ok: true, qa, files: outputs }, null, 2));
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : String(error);
    if (!screenshotPath && page) {
      screenshotPath = await captureScreenshot(page, assetSlug, timestamp, root).catch(() => undefined);
    }
    metadataPath = await saveAttemptMetadata({
      timestamp,
      workflow: "chatgpt-broke-mode-image-generation",
      status: "failed",
      assetName,
      assetSlug,
      promptPath: options.prompt,
      promptCopyPath,
      imagePath,
      screenshotPath,
      qaReportPath,
      failureReason,
      warnings: [failureReason],
      dryRun: false,
      autoSubmit: options.autoSubmit,
      maxAttempts: options.maxAttempts
    }, { rootDir: root, force: options.force }).catch(() => undefined);
    const archived = await archiveFailedAttempt({ assetSlug, timestamp, promptCopyPath, metadataPath, qaReportPath, imagePath, screenshotPath, failureReason }, { rootDir: root, force: options.force }).catch(() => []);
    await logAttempt({
      options,
      status: "failed",
      outputs: archived,
      warnings: [failureReason],
      qaResult: "FAIL",
      nextManualStep: "Resolve the boundary or UI issue manually before rerunning."
    }, root);
    console.error(JSON.stringify({ ok: false, error: failureReason, files: archived }, null, 2));
    process.exitCode = 1;
  } finally {
    await context.close();
  }
}

export async function runBrokeMode(options: BrokeModeRuntimeOptions): Promise<void> {
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    await runOneAttempt(options);
    if (options.dryRun || options.maxAttempts === 1 || process.exitCode === 1) return;
    if (attempt < options.maxAttempts) {
      console.log(`Waiting ${options.cooldownSeconds} seconds before the next explicitly requested supervised attempt.`);
      await new Promise((resolve) => setTimeout(resolve, options.cooldownSeconds * 1000));
    }
  }
}

const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("automation\\playwright\\scripts\\chatgpt-broke-mode-generate.ts") || invokedPath.endsWith("automation/playwright/scripts/chatgpt-broke-mode-generate.ts")) {
  const setupLogin = flag(process.argv.slice(2), "setup-login");
  if (setupLogin) {
    const options = parseBrokeModeArgs();
    const root = repoRoot();
    const context = await launchChatGptContext(root, options);
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(chatGptUrl, { waitUntil: "domcontentloaded" });
    console.log(`Log into ChatGPT in this supervised browser, close the browser when finished, then rerun the command. Profile: ${options.profileDir}. Channel: ${options.browserChannel ?? "playwright chromium"}.`);
  } else {
    runBrokeMode(parseBrokeModeArgs()).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
  }
}
