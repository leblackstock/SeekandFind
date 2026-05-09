import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative } from "node:path";
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
import { brokeModeChatTitle, ChatTitleResult, renameChatViaProjectRowMenu } from "./chatgpt-chat-title.js";

const chatGptUrl = "https://chatgpt.com/";
const minimumGenerationTimeoutMs = 60000;
const defaultPollIntervalMs = 15000;
const watcherCleanupReserveMs = 30000;

const boundaryPattern = /captcha|rate limit|cooldown|try again later|too many requests|payment|upgrade|subscribe|subscription|verify your account|account warning|unusual activity|log in|sign in|couldn.t sign you in|browser or app may not be secure|try using a different browser/i;
const insecureBrowserPattern = /couldn.t sign you in|browser or app may not be secure|try using a different browser/i;
const imageReadyPattern = /download|regenerate/i;
const generationInProgressPattern = /\b(generating|creating|working on it|cancel loading)\b/i;
const referenceImageExtensions = [".png", ".jpg", ".jpeg", ".webp"];

interface GeneratedImageCandidate {
  src: string;
  alt: string;
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
  ariaLabel?: string;
  parentText?: string;
  role?: string | null;
}

export interface GenerationDetectionResult {
  ok: boolean;
  signal: string;
  elapsedMs: number;
  candidateCount: number;
  downloadButtonCount: number;
  imageActionCount: number;
  stopButtonCount?: number;
}

export function isBoundaryText(text: string): boolean {
  return boundaryPattern.test(text);
}

export function managedModeBlockedByInsecureBrowser(text: string): boolean {
  return insecureBrowserPattern.test(text);
}

export function generationStillInProgress(text: string): boolean {
  return generationInProgressPattern.test(text);
}

export function activeGenerationWatchTimeoutMs(generationTimeoutMs: number): number {
  if (generationTimeoutMs <= minimumGenerationTimeoutMs + watcherCleanupReserveMs) return generationTimeoutMs;
  return generationTimeoutMs - watcherCleanupReserveMs;
}

export function selectGeneratedImageCandidate(candidates: GeneratedImageCandidate[]): GeneratedImageCandidate | undefined {
  const usable = candidates
    .filter((candidate) => candidate.src && !/cdn\.auth0\.com\/avatars/i.test(candidate.src))
    .filter((candidate) => !/uploaded image|reference image|attached image/i.test(`${candidate.alt} ${candidate.ariaLabel} ${candidate.parentText}`))
    .filter((candidate) => Math.max(candidate.width, candidate.clientWidth) >= 300)
    .filter((candidate) => Math.max(candidate.height, candidate.clientHeight) >= 300);

  const uniqueBySrc = Array.from(new Map(usable.map((candidate) => [candidate.src, candidate])).values());
  return uniqueBySrc.sort((left, right) => (right.width * right.height) - (left.width * left.height))[0];
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
const distractingPromptPatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: "local file path", pattern: localPathPattern },
  { label: "expected save path", pattern: /expected .*save path/i },
  { label: "campaign bookkeeping", pattern: /^Campaign(?: day)?:/im },
  { label: "task id bookkeeping", pattern: /^Task:/im },
  { label: "caption or CTA copy", pattern: /^(Caption context|CTA):|Coming soon to Amazon/im },
  { label: "source file label", pattern: /^(Approved source image|Start frame|Source image|Source file|Source folder):/im },
  { label: "assistant-routing language", pattern: /do not rewrite|summarize|planning response|turn this into/i }
];

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

function parseListOption(value: string | undefined, fallback: string[]): string[] {
  if (value === undefined) return fallback;
  const values = value.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
  if (values.some((item) => /^(none|off|false|no)$/i.test(item))) return [];
  return values;
}

function referenceFamilyName(referenceName: string): string {
  return referenceName.replace(/-\d{3}$/i, "");
}

function pageMentionsCharacter(prompt: string, family: string): boolean {
  const friendly = family.replaceAll("_", "[ _-]?");
  return new RegExp(`\\b${friendly}\\b`, "i").test(prompt);
}

function defaultReferenceNamesForPrompt(prompt: string): string[] {
  const names = new Set(collectReferenceNames(prompt));
  const familyTriggers = ["Ember", "HootiePuff", "Pebblekins", "Luma_Leafwhisk", "Gemma_Glint", "Elder_Glowkeeper"];
  const mentionedFamilies = familyTriggers.filter((family) => pageMentionsCharacter(prompt, family));

  if (mentionedFamilies.includes("Ember") || names.size > 0) {
    for (const name of ["Ember-001", "Ember-002", "Ember-003"]) names.add(name);
  }

  for (const family of mentionedFamilies) {
    if (family === "Ember") continue;
    for (const suffix of ["001", "002", "003"]) names.add(`${family}-${suffix}`);
  }

  const nonEmberFamilies = Array.from(names).map(referenceFamilyName).filter((family) => family !== "Ember" && family !== "Ember_Cast_Lineup");
  if (nonEmberFamilies.length > 0) {
    names.add("Ember_Cast_Lineup-001");
    names.add("Ember_Cast_Lineup-002");
  }

  return Array.from(names);
}

function resolveReferenceName(name: string, root: string, referenceImageRoot: string): string | undefined {
  const base = join(root, referenceImageRoot);
  for (const extension of referenceImageExtensions) {
    const absolute = join(base, `${name}${extension}`);
    if (existsSync(absolute)) return absolute;
  }
  return undefined;
}

export function resolveReferenceImagePaths(prompt: string, options: Pick<BrokeModeRuntimeOptions, "referenceImages" | "referenceImageRoot">, root: string = repoRoot()): { paths: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const values = options.referenceImages;
  const paths = new Set<string>();

  for (const value of values) {
    if (/^auto$/i.test(value)) {
      for (const name of defaultReferenceNamesForPrompt(prompt)) {
        const resolved = resolveReferenceName(name, root, options.referenceImageRoot);
        if (resolved) {
          paths.add(resolved);
        } else {
          warnings.push(`Auto reference image not found: ${name}`);
        }
      }
      continue;
    }

    const absolute = isAbsolute(value) ? value : join(root, value);
    if (!existsSync(absolute)) {
      throw new Error(`Reference image file does not exist: ${value}`);
    }
    paths.add(absolute);
  }

  return { paths: Array.from(paths), warnings: Array.from(new Set(warnings)) };
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

function extractAvoidSection(text: string): string | undefined {
  return extractNegativePrompt(text) ?? extractSection(text, "Avoid");
}

export interface PromptQaResult {
  passed: boolean;
  failures: string[];
  warnings: string[];
}

export function qaPromptForChatGPTImageGeneration(prompt: string): PromptQaResult {
  const failures = distractingPromptPatterns
    .filter((rule) => rule.pattern.test(prompt))
    .map((rule) => `Prompt contains ${rule.label}.`);
  const warnings: string[] = [];
  if (prompt.length > 4500) warnings.push(`Prompt is long for direct image generation: ${prompt.length} characters.`);
  if (!/create|generate|make/i.test(prompt)) failures.push("Prompt does not clearly ask ChatGPT to create an image.");
  if (!/no readable text|no readable generated text|no text|without text/i.test(prompt)) {
    warnings.push("Prompt does not explicitly forbid readable text.");
  }
  return { passed: failures.length === 0, failures, warnings };
}

export function assertPromptQaPassed(prompt: string): PromptQaResult {
  const qa = qaPromptForChatGPTImageGeneration(prompt);
  if (!qa.passed) {
    throw new Error(`Prompt QA failed before ChatGPT submission: ${qa.failures.join(" ")}`);
  }
  return qa;
}

export function prepareRawPromptForChatGPTImageGeneration(prompt: string): { prompt: string; warnings: string[] } {
  const warnings: string[] = ["Raw prompt mode selected; image prompt QA and cleanup still ran before submission."];
  const normalized = normalizeReferenceNamesForBrokeMode(prompt);
  warnings.push(...normalized.warnings);
  const withoutLinks = stripMarkdownLinks(normalized.prompt, warnings);
  const withoutPaths = stripLocalPathMaterial(withoutLinks, warnings);
  const imagePrompt = extractSection(withoutPaths, "Prompt")
    ?? extractFinalImagePrompt(withoutPaths)
    ?? withoutPaths;
  const avoid = extractAvoidSection(withoutPaths);
  const prepared = [
    "Create one image now.",
    "",
    "Use the attached reference image as the exact visual anchor when a reference image is uploaded.",
    "",
    "## Image Prompt",
    "",
    imagePrompt.trim(),
    avoid ? "" : undefined,
    avoid ? "## Avoid" : undefined,
    avoid ? "" : undefined,
    avoid
  ].filter((part): part is string => typeof part === "string").join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const qa = assertPromptQaPassed(prepared);
  return {
    prompt: prepared,
    warnings: uniqueValues([...warnings, ...qa.warnings, "Prompt QA passed before ChatGPT submission."])
  };
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
  const qa = assertPromptQaPassed(enforced.prompt);
  return {
    prompt: enforced.prompt,
    warnings: uniqueValues([...normalized.warnings, ...sanitized.warnings, ...compacted.warnings, ...enforced.warnings, ...qa.warnings, "Prompt QA passed before ChatGPT submission."])
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
  const timeoutMinutes = option(args, "timeout-minutes");
  const generationTimeoutMs = timeoutMinutes !== undefined
    ? Number.parseInt(timeoutMinutes, 10) * 60000
    : Number.parseInt(option(args, "generation-timeout-ms") ?? String(defaults.generationTimeoutMs), 10);
  if (!Number.isInteger(generationTimeoutMs) || generationTimeoutMs < minimumGenerationTimeoutMs) {
    throw new Error(`--generation-timeout-ms or --timeout-minutes must resolve to at least ${minimumGenerationTimeoutMs}ms.`);
  }
  const pollIntervalMs = Number.parseInt(option(args, "poll-interval-ms") ?? String(defaults.pollIntervalMs), 10);
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 1000) {
    throw new Error("--poll-interval-ms must be an integer of at least 1000.");
  }

  return {
    ...defaults,
    prompt,
    assetName: option(args, "asset-name") ?? positionalArgs[1],
    chatTitle: option(args, "chat-title"),
    browserMode: parseBrowserMode(option(args, "browser-mode") ?? defaults.browserMode),
    cdpUrl: option(args, "cdp-url") ?? defaults.cdpUrl,
    browserChannel: option(args, "browser-channel") ?? option(args, "channel"),
    profileDir: option(args, "profile-dir") ?? defaults.profileDir,
    rawPrompt: flag(args, "raw-prompt"),
    referenceImages: parseListOption(option(args, "reference-images"), defaults.referenceImages),
    referenceImageRoot: option(args, "reference-image-root") ?? defaults.referenceImageRoot,
    outputFolder: option(args, "output-folder") ?? defaults.outputFolder,
    generationTimeoutMs,
    pollIntervalMs,
    recoverOnly: flag(args, "recover-only"),
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

function projectRootUrlFromConversation(url: string): string | undefined {
  const match = url.match(/^(https:\/\/chatgpt\.com\/g\/g-p-[^/]+)\/c\/[^/?#]+/i);
  return match ? `${match[1]}/project` : undefined;
}

async function prepareChatGptPage(page: Page, options: BrokeModeRuntimeOptions): Promise<void> {
  if (options.browserMode === "existing" && /chatgpt\.com/.test(page.url())) {
    const projectRootUrl = projectRootUrlFromConversation(page.url());
    if (projectRootUrl && !options.recoverOnly) {
      await page.goto(projectRootUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      console.log(`Starting a fresh ChatGPT project chat from: ${projectRootUrl}`);
      return;
    }
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

async function dismissDuplicateFileModal(page: Page): Promise<boolean> {
  const modal = page.locator("[data-testid='modal-duplicate-file'], #modal-duplicate-file").first();
  if (!(await modal.isVisible({ timeout: 1000 }).catch(() => false))) return false;

  const okButton = modal.getByRole("button", { name: /^ok$/i }).last();
  if (await okButton.isVisible().catch(() => false)) {
    await okButton.click();
  } else {
    await page.keyboard.press("Escape");
  }
  await modal.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
  console.log("Dismissed ChatGPT duplicate-file modal before continuing.");
  return true;
}

async function queuedAttachmentRemoveButtons(page: Page): Promise<Locator> {
  return page.getByRole("button", { name: /^remove file \d+:/i });
}

async function queuedAttachmentCount(page: Page): Promise<number> {
  return (await queuedAttachmentRemoveButtons(page)).count().catch(() => 0);
}

async function clearQueuedAttachments(page: Page): Promise<number> {
  let removed = 0;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await dismissDuplicateFileModal(page);
    const buttons = await queuedAttachmentRemoveButtons(page);
    if (!(await buttons.first().isVisible({ timeout: 750 }).catch(() => false))) break;
    await buttons.first().click();
    removed += 1;
    await page.waitForTimeout(250);
  }
  return removed;
}

async function composerText(page: Page): Promise<string> {
  const composer = await findComposer(page).catch(() => undefined);
  if (!composer) return "";
  const text = await composer.innerText({ timeout: 1000 }).catch(() => "");
  if (text.trim()) return text;
  return composer.inputValue({ timeout: 1000 }).catch(() => "");
}

async function clearComposer(page: Page): Promise<boolean> {
  const composer = await findComposer(page).catch(() => undefined);
  if (!composer) return false;
  const existingText = await composerText(page);
  if (!existingText.trim()) return false;
  await composer.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  return true;
}

async function preflightCleanComposerState(page: Page): Promise<void> {
  await dismissDuplicateFileModal(page);
  const removedAttachments = await clearQueuedAttachments(page);
  const clearedPrompt = await clearComposer(page);
  await dismissDuplicateFileModal(page);
  if (removedAttachments || clearedPrompt) {
    console.log(`Cleaned ChatGPT composer before run: removedAttachments=${removedAttachments}; clearedPrompt=${clearedPrompt}.`);
  }
}

async function waitForUploadedReferences(page: Page, expectedCount: number): Promise<void> {
  const deadline = Date.now() + 20000;
  let lastCount = 0;
  while (Date.now() < deadline) {
    await dismissDuplicateFileModal(page);
    lastCount = await queuedAttachmentCount(page);
    if (lastCount >= expectedCount) return;
    await page.waitForTimeout(500);
  }
  throw new Error(`Reference upload did not show ${expectedCount} queued attachment(s). Last visible attachment count: ${lastCount}.`);
}

async function pastePrompt(page: Page, prompt: string): Promise<void> {
  const composer = await findComposer(page);
  await composer.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText(prompt);
}

async function uploadReferenceImages(page: Page, referenceImages: string[]): Promise<void> {
  if (referenceImages.length === 0) return;

  const directInput = page.locator("input#upload-photos, input[type='file'][accept*='image'], input[type='file']").first();
  await directInput.waitFor({ state: "attached", timeout: 10000 }).catch(() => undefined);
  if (await directInput.count().catch(() => 0)) {
    await directInput.setInputFiles(referenceImages);
    await page.waitForTimeout(1000);
    await waitForUploadedReferences(page, referenceImages.length);
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
  await page.waitForTimeout(1000);
  await waitForUploadedReferences(page, referenceImages.length);
}

function addReferenceUploadGuard(prompt: string, guard?: string): string {
  const guardText = guard ?? "Use attached image(s) only as visual references for the requested image. Create one image from the prompt below. Do not make a collage, reference sheet, lineup, model sheet, or isolated character study.";
  if (prompt.includes(guardText)) return prompt;
  return [
    guardText,
    prompt
  ].join("\n\n");
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

async function generatedImageCandidates(page: Page): Promise<GeneratedImageCandidate[]> {
  return page.locator("img").evaluateAll((images) => images.map((image) => {
    const img = image as HTMLImageElement;
    const parent = img.closest("[data-message-author-role], article, main, [role='group'], [data-testid]");
    return {
      src: img.src,
      alt: img.alt,
      width: img.naturalWidth,
      height: img.naturalHeight,
      clientWidth: img.clientWidth,
      clientHeight: img.clientHeight,
      ariaLabel: img.getAttribute("aria-label") ?? "",
      parentText: parent?.textContent?.slice(0, 500) ?? "",
      role: parent?.getAttribute("data-message-author-role") ?? parent?.getAttribute("role") ?? null
    };
  })).catch(() => []);
}

async function generatedImageSources(page: Page): Promise<string[]> {
  const candidates = await generatedImageCandidates(page);
  return Array.from(new Set(candidates
    .filter((candidate) => selectGeneratedImageCandidate([candidate]))
    .map((candidate) => candidate.src)));
}

export async function detectGenerationSuccess(page: Page, startingGeneratedImageCount = 0, elapsedMs = 0, startingGeneratedImageSources: string[] = []): Promise<GenerationDetectionResult> {
  const generatedSources = await generatedImageSources(page);
  const generatedCandidateCount = generatedSources.length;
  const downloadButtonCount = await page.getByRole("button", { name: /download/i }).count().catch(() => 0);
  const stopButtonCount = await page.locator("button[aria-label*='Stop' i], button:has-text('Stop')").count().catch(() => 0);
  const imageActionCount = await page.locator([
    "button[aria-label*='Download' i]",
    "button[aria-label*='Open image' i]",
    "button[aria-label*='View image' i]",
    "button[aria-label*='More' i]",
    "[data-testid*='image' i]",
    "[data-testid*='download' i]",
    "a[href*='backend-api'][href*='file']",
    "a[href*='estuary']"
  ].join(", ")).count().catch(() => 0);
  const text = await bodyText(page);
  const startingSourceSet = new Set(startingGeneratedImageSources);
  const newGeneratedSources = generatedSources.filter((src) => !startingSourceSet.has(src));
  const hasNewGeneratedImage = startingGeneratedImageSources.length > 0
    ? newGeneratedSources.length > 0
    : generatedCandidateCount > startingGeneratedImageCount;
  const hasUsableCandidate = startingGeneratedImageCount === 0 && startingGeneratedImageSources.length === 0
    ? generatedCandidateCount > 0
    : hasNewGeneratedImage;
  if (hasNewGeneratedImage) return { ok: true, signal: "new generated image candidate", elapsedMs, candidateCount: generatedCandidateCount, downloadButtonCount, imageActionCount, stopButtonCount };
  if (downloadButtonCount > 0 && hasUsableCandidate) return { ok: true, signal: "download button visible", elapsedMs, candidateCount: generatedCandidateCount, downloadButtonCount, imageActionCount, stopButtonCount };
  if (imageActionCount > 0 && hasUsableCandidate) return { ok: true, signal: "image action control visible", elapsedMs, candidateCount: generatedCandidateCount, downloadButtonCount, imageActionCount, stopButtonCount };
  if (imageReadyPattern.test(text) && hasUsableCandidate) return { ok: true, signal: "assistant response includes image-ready text", elapsedMs, candidateCount: generatedCandidateCount, downloadButtonCount, imageActionCount, stopButtonCount };
  return { ok: false, signal: generationStillInProgress(text) ? "generation in progress" : "no generated image signal", elapsedMs, candidateCount: generatedCandidateCount, downloadButtonCount, imageActionCount, stopButtonCount };
}

async function waitForGeneration(page: Page, startingGeneratedImageSources: string[], options: Pick<BrokeModeRuntimeOptions, "generationTimeoutMs" | "pollIntervalMs">): Promise<GenerationDetectionResult> {
  const startedAt = Date.now();
  const activeTimeoutMs = activeGenerationWatchTimeoutMs(options.generationTimeoutMs);
  const deadline = startedAt + activeTimeoutMs;
  const startingGeneratedImageCount = startingGeneratedImageSources.length;
  let lastResult: GenerationDetectionResult = { ok: false, signal: "not checked", elapsedMs: 0, candidateCount: 0, downloadButtonCount: 0, imageActionCount: 0, stopButtonCount: 0 };
  if (activeTimeoutMs !== options.generationTimeoutMs) {
    console.log(`Broke Mode watcher budget: active=${Math.round(activeTimeoutMs / 1000)}s; cleanupReserve=${Math.round((options.generationTimeoutMs - activeTimeoutMs) / 1000)}s; total=${Math.round(options.generationTimeoutMs / 1000)}s.`);
  }
  while (Date.now() < deadline) {
    await assertNoBoundary(page);
    lastResult = await detectGenerationSuccess(page, startingGeneratedImageCount, Date.now() - startedAt, startingGeneratedImageSources);
    console.log(`Broke Mode watcher: ${Math.round(lastResult.elapsedMs / 1000)}s elapsed; signal=${lastResult.signal}; candidates=${lastResult.candidateCount}; downloads=${lastResult.downloadButtonCount}; actions=${lastResult.imageActionCount}; stopButtons=${lastResult.stopButtonCount ?? 0}`);
    if (lastResult.ok) return lastResult;
    await page.waitForTimeout(Math.min(options.pollIntervalMs, Math.max(1000, deadline - Date.now())));
  }
  const finalResult = await detectGenerationSuccess(page, startingGeneratedImageCount, Date.now() - startedAt, startingGeneratedImageSources);
  console.log(`Broke Mode watcher final recovery scan: signal=${finalResult.signal}; candidates=${finalResult.candidateCount}; downloads=${finalResult.downloadButtonCount}; actions=${finalResult.imageActionCount}; stopButtons=${finalResult.stopButtonCount ?? 0}`);
  if (finalResult.ok) return finalResult;
  throw new Error(`generated-image-not-detected after ${Math.round(activeTimeoutMs / 1000)} seconds of active watching within a ${Math.round(options.generationTimeoutMs / 1000)} second run budget. Last signal: ${lastResult.signal}; candidates=${lastResult.candidateCount}; downloads=${lastResult.downloadButtonCount}; actions=${lastResult.imageActionCount}; stopButtons=${lastResult.stopButtonCount ?? 0}.`);
}

async function captureScreenshot(page: Page, assetSlug: string, timestamp: string, rootDir: string, outputFolder: string = imageOutputFolders.pendingReview): Promise<string> {
  const relative = `${outputFolder}/${assetSlug}-${timestamp}-chatgpt-screenshot.png`;
  const absolute = join(rootDir, relative);
  await mkdir(join(rootDir, outputFolder), { recursive: true });
  await page.screenshot({ path: absolute, fullPage: true });
  return relative;
}

async function tryDownloadImage(page: Page, assetSlug: string, timestamp: string, rootDir: string, outputFolder: string = imageOutputFolders.pendingReview): Promise<string | undefined> {
  const downloadButton = page.getByRole("button", { name: /download/i }).last();
  if (!(await downloadButton.isVisible().catch(() => false))) return undefined;

  const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
  await downloadButton.click();
  const download = await downloadPromise;
  const suggested = download.suggestedFilename();
  const extension = extname(suggested) || ".png";
  const fileName = safeImageFileName(assetSlug, timestamp, extension);
  const relative = `${outputFolder}/${fileName}`;
  await download.saveAs(join(rootDir, relative));
  return relative;
}

async function trySaveVisibleGeneratedImage(page: Page, assetSlug: string, timestamp: string, rootDir: string, outputFolder: string = imageOutputFolders.pendingReview): Promise<string | undefined> {
  const candidate = selectGeneratedImageCandidate(await generatedImageCandidates(page));
  if (!candidate) return undefined;

  const response = await page.context().request.get(candidate.src, { timeout: 60000 }).catch(() => undefined);
  let body: Buffer | undefined;
  let contentType = "";
  if (response?.ok()) {
    body = await response.body();
    contentType = response.headers()["content-type"] ?? "";
  } else {
    const browserFetch = await page.evaluate(async (src) => {
      const fetched = await fetch(src);
      if (!fetched.ok) return undefined;
      const contentType = fetched.headers.get("content-type") ?? "";
      const buffer = await fetched.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
      return { contentType, base64: btoa(binary) };
    }, candidate.src).catch(() => undefined);
    if (!browserFetch) return undefined;
    body = Buffer.from(browserFetch.base64, "base64");
    contentType = browserFetch.contentType;
  }

  const extension = /webp/i.test(contentType) ? ".webp" : /jpe?g/i.test(contentType) ? ".jpg" : ".png";
  const fileName = safeImageFileName(assetSlug, timestamp, extension);
  const relative = `${outputFolder}/${fileName}`;
  await mkdir(join(rootDir, outputFolder), { recursive: true });
  await writeFile(join(rootDir, relative), body);
  return relative;
}

async function saveCurrentGeneratedImage(page: Page, assetSlug: string, timestamp: string, rootDir: string, outputFolder: string): Promise<{ imagePath?: string; signal: GenerationDetectionResult }> {
  const signal = await detectGenerationSuccess(page, 0, 0);
  let imagePath = await tryDownloadImage(page, assetSlug, timestamp, rootDir, outputFolder);
  if (!imagePath) imagePath = await trySaveVisibleGeneratedImage(page, assetSlug, timestamp, rootDir, outputFolder);
  if (imagePath) console.log(`Saved generated image from ChatGPT: ${imagePath}`);
  return { imagePath, signal };
}

function markWatcherComplete(imagePath: string, generationSignal: GenerationDetectionResult | undefined): void {
  const signal = generationSignal?.signal ?? "saved image";
  const elapsed = generationSignal ? ` elapsed=${Math.round(generationSignal.elapsedMs / 1000)}s;` : "";
  console.log(`Broke Mode watcher complete; local image saved; no further generation polling will run.${elapsed} signal=${signal}; image=${imagePath}`);
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

function metadataCommon(options: BrokeModeRuntimeOptions, referenceImages: string[] = [], chatTitle?: string): Pick<Parameters<typeof saveAttemptMetadata>[0], "browserMode" | "cdpUrl" | "referenceImages" | "chatTitle"> {
  return {
    browserMode: options.browserMode,
    cdpUrl: options.browserMode === "existing" ? options.cdpUrl : undefined,
    referenceImages,
    chatTitle
  };
}

function watcherGateFromChatTitle(result: ChatTitleResult | undefined): "visible-title-verified rename" | "rename-failed warning" | undefined {
  if (!result) return undefined;
  if (result.visibleVerified && result.verificationMethod === "visible") return "visible-title-verified rename";
  return "rename-failed warning";
}

function chatRenameMetadata(result: ChatTitleResult | undefined): Pick<Parameters<typeof saveAttemptMetadata>[0], "chat_rename_requested" | "chat_rename_verified" | "chat_rename_api_verified" | "chat_rename_visible_verified" | "chat_rename_verification_method" | "chat_rename_method" | "chat_rename_conversation_id" | "chat_rename_api_title" | "chat_rename_visible_title" | "chat_rename_visible_candidates" | "chat_rename_warning" | "chat_rename_evidence_path" | "chat_rename_screenshot_path" | "conversation_id" | "expected_chat_title" | "observed_visible_chat_title" | "watcher_started_after_chat_rename"> {
  if (!result) return {};
  return {
    chat_rename_requested: result.requested ?? false,
    chat_rename_verified: result.visibleVerified ?? false,
    chat_rename_api_verified: result.apiVerified ?? false,
    chat_rename_visible_verified: result.visibleVerified ?? false,
    chat_rename_verification_method: result.visibleVerified ? "visible" : "warning",
    chat_rename_method: result.method,
    chat_rename_conversation_id: result.conversationId,
    chat_rename_api_title: result.apiTitle,
    chat_rename_visible_title: result.visibleTitle ?? result.observedVisibleChatTitle,
    chat_rename_visible_candidates: result.visibleCandidates,
    chat_rename_warning: result.visibleVerified ? undefined : result.warning,
    chat_rename_evidence_path: result.evidencePath,
    chat_rename_screenshot_path: result.screenshotPath,
    conversation_id: result.conversationId,
    expected_chat_title: result.expectedChatTitle ?? result.title,
    observed_visible_chat_title: result.observedVisibleChatTitle ?? result.visibleTitle,
    watcher_started_after_chat_rename: watcherGateFromChatTitle(result)
  };
}

function chatRenameScreenshotPath(assetSlug: string, timestamp: string, outputFolder: string): string {
  return `${outputFolder}/${assetSlug}-${timestamp}-chat-rename-project-row.png`;
}

function chatRenameEvidencePath(assetSlug: string, timestamp: string, outputFolder: string): string {
  return `${outputFolder}/${assetSlug}-${timestamp}-chat-rename-evidence.json`;
}

function promptFingerprintForRename(chatTitle: string, promptText: string, assetName: string): string[] {
  void chatTitle;
  const markers = promptText.includes(assetName) ? [assetName] : [];
  const conceptMatch = promptText.match(/Campaign concept:\s*([^\n]+)/i);
  if (conceptMatch?.[1]) markers.push(conceptMatch[1].trim().slice(0, 120));
  const firstPromptLine = promptText.split(/\r?\n/).map((line) => line.trim()).find((line) => line.length >= 30);
  if (firstPromptLine) markers.push(firstPromptLine.slice(0, 120));
  return Array.from(new Set(markers.filter(Boolean)));
}

async function saveChatRenameEvidence(result: ChatTitleResult, assetSlug: string, timestamp: string, root: string, outputFolder: string, force: boolean): Promise<ChatTitleResult> {
  const evidencePath = chatRenameEvidencePath(assetSlug, timestamp, outputFolder);
  const evidence = {
    timestamp,
    workflow: "chatgpt-project-chat-rename",
    chat_rename_requested: result.requested ?? false,
    chat_rename_api_verified: result.apiVerified ?? false,
    chat_rename_visible_verified: result.visibleVerified ?? false,
    chat_rename_method: result.method,
    conversation_id: result.conversationId,
    expected_chat_title: result.expectedChatTitle ?? result.title,
    observed_visible_chat_title: result.observedVisibleChatTitle ?? result.visibleTitle,
    active_chat_url: result.activeChatUrl,
    project_url: result.projectUrl,
    visible_row_href: result.visibleRowHref,
    visible_row_rect: result.visibleRowRect,
    visible_candidates: result.visibleCandidates,
    prompt_fingerprint: result.promptFingerprint,
    prompt_fingerprint_verified: result.promptFingerprintVerified,
    screenshot_path: result.screenshotPath,
    warning: result.warning
  };
  const savedPath = await saveTextArtifact(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { rootDir: root, force });
  return { ...result, evidencePath: savedPath };
}

async function runOneAttempt(options: BrokeModeRuntimeOptions): Promise<void> {
  const root = repoRoot();
  const timestamp = createTimestampSlug();
  await ensureImageOutputFolders(root);
  const outputFolder = options.outputFolder ?? imageOutputFolders.pendingReview;
  const rawPromptText = await assertPromptFile(options.prompt, root);
  const preparedPrompt = options.rawPrompt
    ? prepareRawPromptForChatGPTImageGeneration(rawPromptText)
    : preparePromptForChatGPTImageGeneration(rawPromptText);
  let promptText = preparedPrompt.prompt;
  const referenceResolution = resolveReferenceImagePaths(promptText, options, root);
  const referenceImagePaths = referenceResolution.paths;
  const referenceImageMetadata = referenceImagePaths.map((path) => relative(root, path).replace(/\\/g, "/"));
  const warnings = [...preparedPrompt.warnings, ...referenceResolution.warnings];
  if (referenceImagePaths.length > 0) {
    promptText = addReferenceUploadGuard(promptText, options.referenceUploadGuard);
  }
  const guardedPromptQa = assertPromptQaPassed(promptText);
  const promptQaWarnings = guardedPromptQa.warnings.length ? guardedPromptQa.warnings : [];
  warnings.push(...promptQaWarnings);
  const assetName = options.assetName ?? basename(options.prompt, extname(options.prompt));
  const assetSlug = createSafeAssetSlug(assetName);
  const chatTitle = options.chatTitle ?? brokeModeChatTitle(assetName);
  const promptCopyPath = await saveTextArtifact(`${outputFolder}/${assetSlug}-${timestamp}-prompt.md`, promptText, { rootDir: root, force: options.force });

  if (options.dryRun) {
    const metadataPath = await saveAttemptMetadata({
      timestamp,
      workflow: "chatgpt-broke-mode-image-generation",
      status: "dry-run",
      assetName,
      assetSlug,
      promptPath: options.prompt,
      promptCopyPath,
      warnings,
      dryRun: true,
      autoSubmit: options.autoSubmit,
      maxAttempts: options.maxAttempts,
      ...metadataCommon(options, referenceImageMetadata, chatTitle)
    }, { rootDir: root, force: options.force, outputFolder });
    await logAttempt({
      options,
      status: "dry-run",
      outputs: [promptCopyPath, metadataPath],
      warnings,
      qaResult: "DRY RUN",
      nextManualStep: options.browserMode === "existing"
        ? "Run without --dry-run after confirming an existing CDP-enabled browser is logged into ChatGPT."
        : "Run without --dry-run when ready to paste into ChatGPT."
    }, root);
    console.log(JSON.stringify({ ok: true, dryRun: true, browserMode: options.browserMode, promptCharacters: promptText.length, referenceImages: referenceImageMetadata, files: [promptCopyPath, metadataPath] }, null, 2));
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
      warnings: ["Manual mode selected; no browser automation was run.", ...warnings],
      dryRun: false,
      autoSubmit: options.autoSubmit,
      maxAttempts: options.maxAttempts,
      ...metadataCommon(options, referenceImageMetadata, chatTitle)
    }, { rootDir: root, force: options.force, outputFolder });
    await logAttempt({
      options,
      status: "manual",
      outputs: [promptCopyPath, metadataPath],
      warnings: ["Manual mode selected; no browser automation was run.", ...warnings],
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
  let titleResult: ChatTitleResult | undefined;

  try {
    await prepareChatGptPage(page, options);
    await page.waitForTimeout(3000);
    try {
      await assertNoBoundary(page);
    } catch (error) {
      screenshotPath = await captureScreenshot(page, assetSlug, timestamp, root, outputFolder);
      throw new Error(`${error instanceof Error ? error.message : error} Log into ChatGPT manually in the existing normal browser, then rerun. If managed mode hits Google's insecure-browser warning, switch to --browser-mode=existing or --browser-mode=manual.`);
    }

    if (options.recoverOnly) {
      const recovered = await saveCurrentGeneratedImage(page, assetSlug, timestamp, root, outputFolder);
      screenshotPath = await captureScreenshot(page, assetSlug, timestamp, root, outputFolder);
      imagePath = recovered.imagePath;
      if (!imagePath) {
        throw new Error(`Recovery mode did not find a generated ChatGPT image in the current chat. Signal: ${recovered.signal.signal}; candidates=${recovered.signal.candidateCount}; downloads=${recovered.signal.downloadButtonCount}; actions=${recovered.signal.imageActionCount}.`);
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
        warnings: [`Recovered existing generated image from current ChatGPT chat without uploading files or submitting a prompt. Signal: ${recovered.signal.signal}.`, ...warnings],
        dryRun: false,
        autoSubmit: false,
        maxAttempts: options.maxAttempts,
        ...metadataCommon(options, referenceImageMetadata, chatTitle)
      }, { rootDir: root, force: options.force, outputFolder });
      const qa = await saveImageQaReport({ imagePath, metadataPath, promptCopyPath, rootDir: root, force: options.force });
      qaReportPath = qa.reportPath;
      const outputs = [promptCopyPath, imagePath, screenshotPath, metadataPath, qaReportPath].filter(Boolean) as string[];
      await logAttempt({
        options,
        status: qa.status,
        outputs,
        warnings: qa.warnings,
        qaResult: qa.status.toUpperCase(),
        nextManualStep: "Manual visual QA is required before moving the recovered image to approved."
      }, root);
      console.log(JSON.stringify({ ok: true, recovered: true, signal: recovered.signal, qa, files: outputs }, null, 2));
      return;
    }

    await preflightCleanComposerState(page);
    await uploadReferenceImages(page, referenceImagePaths);
    if (referenceImagePaths.length) {
      console.log(`Uploaded ${referenceImagePaths.length} reference image(s) to ChatGPT.`);
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
          warnings: ["Submission declined by human reviewer.", ...warnings],
          dryRun: false,
          autoSubmit: false,
          maxAttempts: options.maxAttempts,
          ...metadataCommon(options, referenceImageMetadata, chatTitle)
        }, { rootDir: root, force: options.force, outputFolder });
        await logAttempt({
          options,
          status: "canceled",
          outputs: [promptCopyPath, metadataPath],
          warnings: ["Submission declined by human reviewer.", ...warnings],
          qaResult: "CANCELED",
          nextManualStep: "Rerun when the prompt is ready."
        }, root);
        console.log(JSON.stringify({ ok: false, canceled: true, files: [promptCopyPath, metadataPath] }, null, 2));
        return;
      }
    }

    const startingGeneratedImageSources = await generatedImageSources(page);
    await submitPrompt(page);
    const renameScreenshotPath = chatRenameScreenshotPath(assetSlug, timestamp, outputFolder);
    titleResult = await renameChatViaProjectRowMenu(page, chatTitle, {
      promptFingerprint: promptFingerprintForRename(chatTitle, promptText, assetName),
      screenshotPath: join(root, renameScreenshotPath)
    }).then((result) => ({ ...result, screenshotPath: renameScreenshotPath })).catch((error: unknown) => ({
      ok: false,
      title: chatTitle,
      expectedChatTitle: chatTitle,
      method: "failed",
      warning: `Chat title rename failed without blocking generation: ${error instanceof Error ? error.message : String(error)}`
    }));
    try {
      titleResult = await saveChatRenameEvidence(titleResult, assetSlug, timestamp, root, outputFolder, options.force);
    } catch (error) {
      titleResult = {
        ...titleResult,
        warning: `${titleResult.warning ?? "Chat title rename evidence was not saved."} Evidence save failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
    const watcherGate = watcherGateFromChatTitle(titleResult) ?? "rename-failed warning";
    if (titleResult.visibleVerified) {
      console.log(`Chat rename visible-verified; starting image watcher after ${watcherGate}.`);
      warnings.push(`chat_rename_requested: ${titleResult.requested ?? false}; chat_rename_method: ${titleResult.method ?? "unknown"}; chat_rename_visible_verified: true; conversation_id=${titleResult.conversationId ?? "unknown"}; watcher_started_after=${watcherGate}.`);
    } else {
      const renameWarning = `chat_rename_requested: ${titleResult.requested ?? false}; chat_rename_method: ${titleResult.method ?? "unknown"}; chat_rename_visible_verified: false; conversation_id=${titleResult.conversationId ?? "unknown"}; watcher_started_after=rename-failed warning; ${titleResult.warning ?? "Chat title rename was not visibly verified."}`;
      console.warn(renameWarning);
      warnings.push(renameWarning);
    }
    let generationSignal: GenerationDetectionResult | undefined;
    try {
      generationSignal = await waitForGeneration(page, startingGeneratedImageSources, options);
    } catch (error) {
      const recovered = await saveCurrentGeneratedImage(page, assetSlug, timestamp, root, outputFolder);
      if (recovered.imagePath) {
        imagePath = recovered.imagePath;
        generationSignal = recovered.signal;
        warnings.push(`Timed out waiting, then recovered image during final scan. Signal: ${recovered.signal.signal}.`);
      } else {
        throw error;
      }
    }
    if (!imagePath) {
      const saved = await saveCurrentGeneratedImage(page, assetSlug, timestamp, root, outputFolder);
      imagePath = saved.imagePath;
      generationSignal = generationSignal ?? saved.signal;
    }
    if (imagePath) {
      markWatcherComplete(imagePath, generationSignal);
    }
    if (generationSignal?.ok) {
      warnings.push(`Generation watcher success: ${generationSignal.signal}; elapsed=${Math.round(generationSignal.elapsedMs / 1000)}s; candidates=${generationSignal.candidateCount}; downloads=${generationSignal.downloadButtonCount}; actions=${generationSignal.imageActionCount}; stopButtons=${generationSignal.stopButtonCount ?? 0}.`);
    }
    screenshotPath = await captureScreenshot(page, assetSlug, timestamp, root, outputFolder);

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
        warnings: [failureReason, ...warnings],
        dryRun: false,
        autoSubmit: options.autoSubmit,
        maxAttempts: options.maxAttempts,
        ...chatRenameMetadata(titleResult),
        ...metadataCommon(options, referenceImageMetadata, chatTitle)
      }, { rootDir: root, force: options.force, outputFolder });
      const archived = await archiveFailedAttempt({ assetSlug, timestamp, promptCopyPath, metadataPath, screenshotPath, failureReason }, { rootDir: root, force: options.force });
      await logAttempt({
        options,
        status: "failed",
        outputs: archived,
        warnings: [failureReason, ...warnings],
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
      warnings,
      dryRun: false,
      autoSubmit: options.autoSubmit,
      maxAttempts: options.maxAttempts,
      ...chatRenameMetadata(titleResult),
      ...metadataCommon(options, referenceImageMetadata, chatTitle)
    }, { rootDir: root, force: options.force, outputFolder });
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
      }, { rootDir: root, force: options.force, outputFolder });
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
      screenshotPath = await captureScreenshot(page, assetSlug, timestamp, root, outputFolder).catch(() => undefined);
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
      warnings: [failureReason, ...warnings],
      dryRun: false,
      autoSubmit: options.autoSubmit,
      maxAttempts: options.maxAttempts,
      ...chatRenameMetadata(titleResult),
      ...metadataCommon(options, referenceImageMetadata, chatTitle)
    }, { rootDir: root, force: options.force, outputFolder }).catch(() => undefined);
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
    await runBrokeMode(parseBrokeModeArgs()).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
    process.exit(process.exitCode ?? 0);
  }
}
