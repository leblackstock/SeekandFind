import { mkdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Browser, BrowserContext, chromium, Locator, Page } from "@playwright/test";
import { repoRoot } from "../../../src/config.js";
import { appendSessionLog, updateProductionStatus } from "../../../src/core/progress-tracker.js";
import {
  archiveFailedAttempt,
  assertPromptFile,
  BrowserMode,
  BrokeModeRuntimeOptions,
  createSafeAssetSlug,
  createTimestampSlug,
  defaultBrokeModeOptions,
  enforceMaxAttempts,
  ensureImageOutputFolders,
  imageOutputFolders,
  safeImageFileName,
  saveAttemptMetadata,
  saveTextArtifact
} from "../../../src/core/image-file-manager.js";
import { saveImageQaReport } from "../../../src/core/image-qa.js";
import { GenerateResult } from "../../../src/types.js";

const chatGptUrl = "https://chatgpt.com/";

const boundaryPattern = /captcha|rate limit|cooldown|try again later|too many requests|payment|upgrade|subscribe|subscription|verify your account|account warning|unusual activity|log in|sign in|couldn.t sign you in|browser or app may not be secure|try using a different browser/i;
const insecureBrowserPattern = /couldn.t sign you in|browser or app may not be secure|try using a different browser/i;
const imageReadyPattern = /download|regenerate/i;
const generationInProgressPattern = /\b(generating|creating|working on it|cancel loading)\b/i;

export function isBoundaryText(text: string): boolean {
  return boundaryPattern.test(text);
}

export function managedModeBlockedByInsecureBrowser(text: string): boolean {
  return insecureBrowserPattern.test(text);
}

export function generationStillInProgress(text: string): boolean {
  return generationInProgressPattern.test(text);
}

export function manualModeMessage(promptPath: string): string {
  return [
    "Manual Broke Mode selected. No browser will be opened or controlled.",
    `Prompt file: ${promptPath}`,
    "Open ChatGPT in your normal logged-in browser, paste the prompt manually, generate one image, then save it under content/outputs/images/pending-review/.",
    "After saving, run: npm run image:qa -- --file=content/outputs/images/pending-review/YOUR-FILE.png"
  ].join("\n");
}

export function normalizeReferenceNamesForBrokeMode(prompt: string): { prompt: string; warnings: string[] } {
  const warnings: string[] = [];
  const normalized = prompt.replace(/(?:sandbox:)?\/mnt\/data\/([A-Za-z0-9_-]+)(?:\.(?:png|jpg|jpeg|webp))?/gi, (_match, name: string) => {
    warnings.push(`Converted sandbox reference path to project reference name: ${name}`);
    return name;
  });
  return { prompt: normalized, warnings: Array.from(new Set(warnings)) };
}

const referenceNamePattern = /\b(?:Ember|HootiePuff|Pebblekins|Luma_Leafwhisk|Gemma_Glint|Elder_Glowkeeper|Ember_Cast_Lineup)-\d{3}\b/gi;
const localPathPattern = /(?:file:\/\/\/|[A-Za-z]:[\\/]|(?:^|[\s`"'(])(?:content|automation|src|tests|\.agents|Ember's Adventures)[\\/][^\s`"')\]]+|\/mnt\/data\/|sandbox:\/mnt\/data\/)/i;
const localFileNamePattern = /\b[\w .,'()-]+\.(?:md|png|jpe?g|webp|json|ts|tsx)\b/i;

const requiredPromptRequirements: Array<{ label: string; pattern: RegExp }> = [
  {
    label: "vertical full-page children's seek-and-find illustration",
    pattern: /vertical[\s\S]{0,80}seek-and-find|seek-and-find[\s\S]{0,80}vertical/i
  },
  {
    label: "vertical 8.5 x 11 inch page",
    pattern: /vertical 8\.5 x 11 inch page/i
  },
  {
    label: "17:22 aspect ratio",
    pattern: /17\s*:\s*22/i
  },
  {
    label: "full-color KDP-style interior page",
    pattern: /full-color KDP-style interior page/i
  },
  {
    label: "bleed, trim, and safe-area awareness",
    pattern: /bleed[\s\S]{0,80}trim[\s\S]{0,80}safe[- ]?area|safe[- ]?area[\s\S]{0,80}bleed[\s\S]{0,80}trim/i
  },
  {
    label: "no readable generated text",
    pattern: /no readable generated text/i
  },
  {
    label: "Ember appears exactly once",
    pattern: /Ember appears exactly once/i
  },
  {
    label: "Ember is visible as the helper/guide, not hidden",
    pattern: /Ember is visible[\s\S]{0,120}(helper|guide)[\s\S]{0,120}not hidden|not hidden[\s\S]{0,120}(helper|guide)/i
  },
  {
    label: "mission item appears exactly once and is findable",
    pattern: /mission item appears exactly once[\s\S]{0,80}findable|findable[\s\S]{0,80}mission item appears exactly once/i
  },
  {
    label: "soft rounded 2.25D children's storybook style",
    pattern: /soft rounded 2\.25D children's storybook/i
  },
  {
    label: "audience kids ages 5-8",
    pattern: /children ages 5-8|kids ages 5-8|ages 5-8/i
  }
];

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function collectReferenceNames(text: string): string[] {
  return uniqueValues(Array.from(text.matchAll(referenceNamePattern), (match) => match[0]));
}

function normalizeReferenceFileNames(text: string): string {
  return text
    .replace(new RegExp(`(${referenceNamePattern.source})(?:\\.(?:png|jpg|jpeg|webp))?`, "gi"), (_match, name: string) => name)
    .replace(new RegExp(`\`(${referenceNamePattern.source})\``, "gi"), (_match, name: string) => name);
}

function stripMarkdownLinks(text: string, warnings: string[]): string {
  return text.replace(/!?\[([^\]]*)\]\(([^)]*)\)/g, (_match, label: string, target: string) => {
    const references = uniqueValues([...collectReferenceNames(label), ...collectReferenceNames(target)]);
    if (references.length) {
      warnings.push(`Converted markdown reference link to project reference name: ${references.join(", ")}`);
      return references.join(", ");
    }
    if (localPathPattern.test(target) || localFileNamePattern.test(target)) {
      warnings.push("Removed local markdown link target from ChatGPT prompt.");
      return label.trim();
    }
    return label.trim() || target.trim();
  });
}

function lineHasOnlyLocalSourceInfo(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^(source mirror|source file|source folder|see folder|see file|file|folder|prompt file)\s*:/i.test(trimmed)) return true;
  if (/^(?:[-*]\s*)?`?(?:content|automation|src|tests|\.agents|Ember's Adventures)[\\/]/i.test(trimmed)) return true;
  if (/^(?:[-*]\s*)?`?file:\/\/\//i.test(trimmed)) return true;
  if (/^(?:[-*]\s*)?`?[A-Za-z]:[\\/]/i.test(trimmed)) return true;
  return false;
}

function stripLocalPathMaterial(text: string, warnings: string[]): string {
  const lines = text.split(/\r?\n/);
  const cleanedLines = lines.map((line) => {
    const references = collectReferenceNames(line);
    const hadLocalPath = localPathPattern.test(line) || /(?:[\\/][^\s`"')\]]+){2,}/.test(line);
    const hadLocalFile = localFileNamePattern.test(line);

    if (lineHasOnlyLocalSourceInfo(line) || ((hadLocalPath || hadLocalFile) && references.length === 0)) {
      warnings.push("Removed local file or folder path from ChatGPT prompt.");
      return "";
    }

    if (hadLocalPath || hadLocalFile) {
      warnings.push(`Removed local path details while preserving reference names: ${references.join(", ") || "none"}`);
    }

    let cleaned = normalizeReferenceFileNames(line);
    cleaned = cleaned.replace(/(?:sandbox:)?\/mnt\/data\/([A-Za-z0-9_-]+)(?:\.(?:png|jpg|jpeg|webp))?/gi, (_match, name: string) => name);
    cleaned = cleaned.replace(/file:\/\/\/[^\s`"')\]]+/gi, "");
    cleaned = cleaned.replace(/[A-Za-z]:[\\/][^\s`"')\]]+/g, "");
    cleaned = cleaned.replace(/(?:^|[\s`"'(])(?:content|automation|src|tests|\.agents|Ember's Adventures)[\\/][^\s`"')\]]+/g, " ");
    cleaned = cleaned.replace(/`([^`]*\.(?:md|png|jpe?g|webp|json|ts|tsx))`/gi, "");
    return cleaned.replace(/[ \t]{2,}/g, " ").trimEnd();
  });

  return cleanedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeExistingReferenceInstruction(text: string): string {
  const finalPromptIndex = text.search(/(?:^|\r?\n)## Final Image Prompt\b/i);
  if (finalPromptIndex >= 0) {
    const prefix = text.slice(0, finalPromptIndex);
    const finalPrompt = text.slice(finalPromptIndex);
    return [
      removeExistingReferenceInstruction(prefix),
      finalPrompt.trim()
    ].filter(Boolean).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  const lines = text.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (/^## Reference Instruction$/i.test(trimmed)) return "";
    if (!/reference|Ember-001|Ember-002|Ember-003|stop and ask/i.test(trimmed)) return line;

    const sentences = line.match(/[^.!?]+[.!?]|\S.+$/g);
    if (!sentences) return line;

    const kept = sentences.filter((sentence) => {
      const sentenceText = sentence.trim();
      if (/Use .*reference images.*Ember-001.*Ember-002.*Ember-003/i.test(sentenceText)) return false;
      if (/If (a needed )?references? (file )?(is|are) not (present|available)|If references are unavailable/i.test(sentenceText)) return false;
      if (/stop and ask before producing a final prompt/i.test(sentenceText)) return false;
      return true;
    });

    if (!kept.length && kept.length !== sentences.length) return "";
    return kept.join(" ").trimEnd();
  });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function referenceInstruction(referenceNames: string[]): string {
  const emberReferences = ["Ember-001", "Ember-002", "Ember-003"];
  const names = uniqueValues([...emberReferences, ...referenceNames]);
  const otherNames = names.filter((name) => !emberReferences.includes(name));
  return [
    "## Visual References",
    "",
    "Use Ember-001, Ember-002, and Ember-003 as visual references for Ember.",
    otherNames.length ? `Use ${otherNames.join(", ")} as visual references for their named characters.` : undefined
  ].filter((part): part is string => typeof part === "string").join("\n");
}

function missingRequirements(prompt: string): string[] {
  return requiredPromptRequirements
    .filter((requirement) => !requirement.pattern.test(prompt))
    .map((requirement) => requirement.label);
}

function appendMissingRequirements(prompt: string): { prompt: string; warnings: string[] } {
  const missing = missingRequirements(prompt);
  if (!missing.length) return { prompt, warnings: [] };
  return {
    prompt: [
      prompt.trim(),
      "",
      "## Format Requirements",
      "",
      ...missing.map((requirement) => `- ${requirement}`)
    ].join("\n"),
    warnings: [`Added missing ChatGPT image-generation requirements: ${missing.join("; ")}`]
  };
}

export function sanitizePromptForBrokeMode(prompt: string): { prompt: string; warnings: string[] } {
  const warnings: string[] = [];
  const linkStripped = stripMarkdownLinks(prompt, warnings);
  const referenceNames = collectReferenceNames(linkStripped);
  const pathStripped = stripLocalPathMaterial(linkStripped, warnings);
  const withoutOldReferenceInstruction = removeExistingReferenceInstruction(pathStripped);
  const promptWithReferenceInstruction = [
    referenceInstruction(referenceNames),
    "",
    withoutOldReferenceInstruction
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { prompt: promptWithReferenceInstruction, warnings: uniqueValues(warnings) };
}

function extractField(text: string, label: string): string | undefined {
  const match = text.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim();
}

function extractSection(text: string, heading: string): string | undefined {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`(?:^|\\r?\\n)## ${escapedHeading}\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |\\r?\\n# |$)`, "i"));
  return match?.[1]?.trim();
}

function extractFinalImagePrompt(text: string): string | undefined {
  const match = text.match(/(?:^|\r?\n)## Final Image Prompt\s*\r?\n([\s\S]*?)(?=\r?\n## Hidden Object Category Guidance|\r?\n## Negative Prompt \/ Avoid|\r?\n## Format Requirements|$)/i);
  return match?.[1]?.trim();
}

function extractNegativePrompt(text: string): string | undefined {
  const match = text.match(/(?:^|\r?\n)## Negative Prompt \/ Avoid\s*\r?\n([\s\S]*?)(?=\r?\n## Format Requirements|$)/i);
  return match?.[1]?.trim();
}

function stripLeadingMetadataBlock(text: string): string {
  const metadataLine = /^(?:Location|Mission item|Audience|Style|Format|Paired story\/list page|Source row):\s*.+$/i;
  const lines = text.split(/\r?\n/);
  let index = 0;
  while (index < lines.length && (metadataLine.test(lines[index].trim()) || lines[index].trim() === "")) {
    index += 1;
  }
  return lines.slice(index).join("\n").trim();
}

function stripInlineReferenceParagraphs(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .filter((paragraph) => {
      const compact = paragraph.replace(/\s+/g, " ").trim();
      if (/^Use Ember-001, Ember-002, and Ember-003 as visual references for Ember\./i.test(compact)) return false;
      if (/^Use Ember reference images Ember-001, Ember-002, and Ember-003/i.test(compact)) return false;
      return true;
    })
    .join("\n\n")
    .trim();
}

function compactPromptForChatGPTImageGeneration(prompt: string): { prompt: string; warnings: string[] } {
  const referenceNames = collectReferenceNames(prompt);
  const location = extractField(prompt, "Location");
  const missionItem = extractField(prompt, "Mission item");
  const audience = extractField(prompt, "Audience");
  const style = extractField(prompt, "Style");
  const visualRules = extractSection(prompt, "Visual Rules");
  const finalImagePrompt = extractFinalImagePrompt(prompt);
  const negativePrompt = extractNegativePrompt(prompt);

  if (!finalImagePrompt) {
    return {
      prompt,
      warnings: ["Could not find a Final Image Prompt section, so Broke Mode kept the sanitized source prompt."]
    };
  }

  const metadataLines = [
    location ? `Location: ${location}` : undefined,
    missionItem ? `Mission item: ${missionItem}` : undefined,
    audience ? `Audience: ${audience}` : undefined,
    style ? `Style: ${style}` : undefined
  ].filter(Boolean) as string[];

  const parts = [
    "Create one image now.",
    "",
    referenceInstruction(referenceNames),
    "",
    "## Ember Appearance",
    "",
    visualRules ?? [
      "- tiny adorable reddish-orange baby dragon",
      "- tiny shiny golden spiral-comma horns",
      "- large glossy blue-teal eyes",
      "- cream belly",
      "- small-cat sized, not a fox, cat, human wizard, or generic fantasy animal",
      "- plain bright blue-teal scarf",
      "- tiny plain brown crossbody satchel with dull-gold button clasps",
      "- rounded plush-like form",
      "- cheerful, curious expression"
    ].join("\n"),
    "",
    "## Image Prompt",
    "",
    ...metadataLines,
    metadataLines.length ? "" : undefined,
    stripInlineReferenceParagraphs(stripLeadingMetadataBlock(finalImagePrompt)),
    negativePrompt ? "" : undefined,
    negativePrompt ? "## Avoid" : undefined,
    negativePrompt ? "" : undefined,
    negativePrompt
  ].filter((part): part is string => typeof part === "string").join("\n");

  return {
    prompt: parts.replace(/\n{3,}/g, "\n\n").trim(),
    warnings: ["Compacted Broke Mode prompt to image-facing sections only."]
  };
}

export function ensureImageGenerationPromptRequirements(prompt: string): { prompt: string; warnings: string[] } {
  return appendMissingRequirements(prompt);
}

export function preparePromptForChatGPTImageGeneration(prompt: string): { prompt: string; warnings: string[] } {
  const normalized = normalizeReferenceNamesForBrokeMode(prompt);
  const sanitized = sanitizePromptForBrokeMode(normalized.prompt);
  const compacted = compactPromptForChatGPTImageGeneration(sanitized.prompt);
  const enforced = ensureImageGenerationPromptRequirements(compacted.prompt);
  return {
    prompt: enforced.prompt,
    warnings: uniqueValues([...normalized.warnings, ...sanitized.warnings, ...compacted.warnings, ...enforced.warnings])
  };
}

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

export function parseBrowserMode(value: string): BrowserMode {
  if (value === "existing" || value === "managed" || value === "manual") return value;
  throw new Error("--browser-mode must be one of: existing, managed, manual.");
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
    browserMode: parseBrowserMode(option(args, "browser-mode") ?? defaults.browserMode),
    cdpUrl: option(args, "cdp-url") ?? defaults.cdpUrl,
    browserChannel: option(args, "browser-channel") ?? option(args, "channel"),
    profileDir: option(args, "profile-dir") ?? defaults.profileDir,
    autoSubmit: booleanOption(args, "auto-submit", defaults.autoSubmit),
    maxAttempts,
    cooldownSeconds,
    dryRun: flag(args, "dry-run"),
    force: flag(args, "force")
  };
}

interface BrowserSession {
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}

async function choosePage(context: BrowserContext): Promise<Page> {
  const pages = context.pages();
  const chatPage = pages.find((candidate) => /chatgpt\.com/.test(candidate.url()));
  return chatPage ?? pages[0] ?? context.newPage();
}

async function launchManagedContext(root: string, options: Pick<BrokeModeRuntimeOptions, "browserChannel" | "profileDir">): Promise<BrowserSession> {
  const context = await chromium.launchPersistentContext(join(root, options.profileDir), {
    headless: false,
    acceptDownloads: true,
    channel: options.browserChannel
  });
  return { context, page: await choosePage(context), close: () => context.close() };
}

async function disconnectBrowser(browser: Browser): Promise<void> {
  const disconnectable = browser as Browser & { disconnect?: () => void };
  if (typeof disconnectable.disconnect === "function") {
    disconnectable.disconnect();
    return;
  }
  await browser.close();
}

async function connectExistingBrowser(options: Pick<BrokeModeRuntimeOptions, "cdpUrl">): Promise<BrowserSession> {
  let browser: Browser;
  try {
    browser = await chromium.connectOverCDP(options.cdpUrl);
  } catch {
    throw new Error(`Could not connect to an existing browser at ${options.cdpUrl}. Start a normal browser with remote debugging or use --browser-mode=manual. Example: chrome.exe --remote-debugging-port=9222 --user-data-dir="%TEMP%\\ember-chatgpt-cdp-profile"`);
  }
  const context = browser.contexts()[0] ?? await browser.newContext({ acceptDownloads: true });
  return { context, page: await choosePage(context), close: () => disconnectBrowser(browser) };
}

async function openBrowserSession(root: string, options: BrokeModeRuntimeOptions): Promise<BrowserSession> {
  if (options.browserMode === "existing") return connectExistingBrowser(options);
  if (options.browserMode === "managed") return launchManagedContext(root, options);
  throw new Error("Manual browser mode does not open or control ChatGPT.");
}

async function prepareChatGptPage(page: Page, options: BrokeModeRuntimeOptions): Promise<void> {
  if (options.browserMode === "existing" && /chatgpt\.com/.test(page.url())) {
    console.log(`Using existing ChatGPT tab: ${page.url()}`);
    return;
  }
  await page.goto(chatGptUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
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
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
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
  if (isBoundaryText(text) || /auth\/login|\/login/.test(page.url())) {
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
    if (generationStillInProgress(text)) {
      await page.waitForTimeout(5000);
      continue;
    }
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

function metadataCommon(options: BrokeModeRuntimeOptions): Pick<Parameters<typeof saveAttemptMetadata>[0], "browserMode" | "cdpUrl"> {
  return {
    browserMode: options.browserMode,
    cdpUrl: options.browserMode === "existing" ? options.cdpUrl : undefined
  };
}

async function runOneAttempt(options: BrokeModeRuntimeOptions): Promise<void> {
  const root = repoRoot();
  const timestamp = createTimestampSlug();
  await ensureImageOutputFolders(root);
  const rawPromptText = await assertPromptFile(options.prompt, root);
  const preparedPrompt = preparePromptForChatGPTImageGeneration(rawPromptText);
  const promptText = preparedPrompt.prompt;
  const assetName = options.assetName ?? basename(options.prompt, extname(options.prompt));
  const assetSlug = createSafeAssetSlug(assetName);
  const promptCopyPath = await saveTextArtifact(`${imageOutputFolders.pendingReview}/${assetSlug}-${timestamp}-prompt.md`, promptText, { rootDir: root, force: options.force });

  if (options.dryRun) {
    const metadataPath = await saveAttemptMetadata({
      timestamp,
      workflow: "chatgpt-broke-mode-image-generation",
      status: "dry-run",
      assetName,
      assetSlug,
      promptPath: options.prompt,
      promptCopyPath,
      warnings: preparedPrompt.warnings,
      dryRun: true,
      autoSubmit: options.autoSubmit,
      maxAttempts: options.maxAttempts,
      ...metadataCommon(options)
    }, { rootDir: root, force: options.force });
    await logAttempt({
      options,
      status: "dry-run",
      outputs: [promptCopyPath, metadataPath],
      warnings: preparedPrompt.warnings,
      qaResult: "DRY RUN",
      nextManualStep: options.browserMode === "existing"
        ? "Run without --dry-run after confirming an existing CDP-enabled browser is logged into ChatGPT."
        : "Run without --dry-run when ready to paste into ChatGPT."
    }, root);
    console.log(JSON.stringify({ ok: true, dryRun: true, browserMode: options.browserMode, promptCharacters: promptText.length, files: [promptCopyPath, metadataPath] }, null, 2));
    return;
  }

  if (options.browserMode === "manual") {
    const message = manualModeMessage(options.prompt);
    const metadataPath = await saveAttemptMetadata({
      timestamp,
      workflow: "chatgpt-broke-mode-image-generation",
      status: "canceled",
      assetName,
      assetSlug,
      promptPath: options.prompt,
      promptCopyPath,
      warnings: ["Manual mode selected; no browser automation was run.", ...preparedPrompt.warnings],
      dryRun: false,
      autoSubmit: options.autoSubmit,
      maxAttempts: options.maxAttempts,
      ...metadataCommon(options)
    }, { rootDir: root, force: options.force });
    await logAttempt({
      options,
      status: "manual",
      outputs: [promptCopyPath, metadataPath],
      warnings: ["Manual mode selected; no browser automation was run.", ...preparedPrompt.warnings],
      qaResult: "MANUAL",
      nextManualStep: "Paste the prompt in your normal browser, save the image to pending-review, then run image QA."
    }, root);
    console.log(JSON.stringify({ ok: true, manualMode: true, message, files: [promptCopyPath, metadataPath] }, null, 2));
    return;
  }

  const session = await openBrowserSession(root, options);
  const page = session.page;
  let screenshotPath: string | undefined;
  let imagePath: string | undefined;
  let metadataPath: string | undefined;
  let qaReportPath: string | undefined;

  try {
    await prepareChatGptPage(page, options);
    await page.waitForTimeout(3000);
    try {
      await assertNoBoundary(page);
    } catch (error) {
      screenshotPath = await captureScreenshot(page, assetSlug, timestamp, root);
      throw new Error(`${error instanceof Error ? error.message : error} Log into ChatGPT manually in the existing normal browser, then rerun. If managed mode hits Google's insecure-browser warning, switch to --browser-mode=existing or --browser-mode=manual.`);
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
          warnings: ["Submission declined by human reviewer.", ...preparedPrompt.warnings],
          dryRun: false,
          autoSubmit: false,
          maxAttempts: options.maxAttempts,
          ...metadataCommon(options)
        }, { rootDir: root, force: options.force });
        await logAttempt({
          options,
          status: "canceled",
          outputs: [promptCopyPath, metadataPath],
          warnings: ["Submission declined by human reviewer.", ...preparedPrompt.warnings],
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
        warnings: [failureReason, ...preparedPrompt.warnings],
        dryRun: false,
        autoSubmit: options.autoSubmit,
        maxAttempts: options.maxAttempts,
        ...metadataCommon(options)
      }, { rootDir: root, force: options.force });
      const archived = await archiveFailedAttempt({ assetSlug, timestamp, promptCopyPath, metadataPath, screenshotPath, failureReason }, { rootDir: root, force: options.force });
      await logAttempt({
        options,
        status: "failed",
        outputs: archived,
        warnings: [failureReason, ...preparedPrompt.warnings],
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
      warnings: preparedPrompt.warnings,
      dryRun: false,
      autoSubmit: options.autoSubmit,
      maxAttempts: options.maxAttempts,
      ...metadataCommon(options)
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
      warnings: [failureReason, ...preparedPrompt.warnings],
      dryRun: false,
      autoSubmit: options.autoSubmit,
      maxAttempts: options.maxAttempts,
      ...metadataCommon(options)
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
    await session.close();
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
    if (options.browserMode === "manual") {
      console.log(manualModeMessage(options.prompt));
      process.exit(0);
    }
    const root = repoRoot();
    const session = await openBrowserSession(root, options);
    try {
      const page = session.page;
      await prepareChatGptPage(page, options);
      await page.waitForTimeout(3000);
      await assertNoBoundary(page);
      console.log(options.browserMode === "existing"
        ? `Connected to existing browser at ${options.cdpUrl}; ChatGPT appears ready without a login/security boundary.`
        : `Managed browser reached ChatGPT without a login/security boundary. Profile: ${options.profileDir}. Channel: ${options.browserChannel ?? "playwright chromium"}.`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      console.error(options.browserMode === "existing"
        ? "Log into ChatGPT manually in the existing normal browser, then rerun. Do not automate login."
        : "Log into ChatGPT manually in this managed browser if it is allowed. If Google blocks it, use --browser-mode=existing or --browser-mode=manual.");
      process.exitCode = 1;
    } finally {
      if (options.browserMode === "existing") await session.close();
    }
  } else {
    runBrokeMode(parseBrokeModeArgs()).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
  }
}
