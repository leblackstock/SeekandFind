import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Browser, chromium, Page } from "@playwright/test";
import { repoRoot } from "../../../src/config.js";
import { appendSessionLog, updateProductionStatus } from "../../../src/core/progress-tracker.js";
import { GenerateResult } from "../../../src/types.js";

const defaultProjectUrl = "https://chatgpt.com/g/g-p-69efa9ddfdd08191b8673b0f32dfb621-seek-and-find-books/project";
const defaultCdpUrl = "http://127.0.0.1:9222";
const defaultEvidenceDir = "content/outputs/chatgpt-project-archive";
const projectUrlPattern = /^https:\/\/chatgpt\.com\/g\/g-p-[^/]*seek-and-find-books[^/]*\/project$/i;

export interface ArchiveProjectChatsOptions {
  cdpUrl: string;
  projectUrl: string;
  evidenceDir: string;
  confirm: boolean;
  limit?: number;
  maxLoadMore: number;
  excludeIds: string[];
  excludeTitlePattern?: string;
  logDryRun: boolean;
}

interface ProjectChatRow {
  conversationId: string;
  title: string;
  href: string;
  visible: boolean;
  rect: { x: number; y: number; w: number; h: number };
}

interface ArchiveResult {
  conversationId: string;
  title: string;
  ok: boolean;
  archived: boolean;
  skipped?: boolean;
  error?: string;
}

interface ArchiveEvidence {
  ok: boolean;
  dryRun: boolean;
  projectUrl: string;
  targetCount: number;
  archivedCount: number;
  skippedCount: number;
  errorCount: number;
  options: Omit<ArchiveProjectChatsOptions, "cdpUrl"> & { cdpUrl: string };
  targets: ProjectChatRow[];
  results: ArchiveResult[];
  warnings: string[];
  evidencePath?: string;
  sessionLog?: string;
  productionStatus?: string;
}

function option(args: string[], name: string): string | undefined {
  const envValue = process.env[`npm_config_${name.replaceAll("-", "_")}`];
  const exactIndex = args.indexOf(`--${name}`);
  if (exactIndex >= 0) {
    const value = args[exactIndex + 1];
    return value && !value.startsWith("--") ? value : envValue;
  }
  const prefix = `--${name}=`;
  const match = args.find((item) => item.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  if (envValue && !/^(true|1|yes)$/i.test(envValue)) return envValue;
  if (envValue && /^(true|1|yes)$/i.test(envValue)) {
    return args.find((arg) => !arg.startsWith("--"));
  }
  return undefined;
}

function flag(args: string[], name: string): boolean {
  const envValue = process.env[`npm_config_${name.replaceAll("-", "_")}`];
  return args.includes(`--${name}`) || args.includes(`--${name}=true`) || /^(true|1|yes)$/i.test(envValue ?? "");
}

function parsePositiveInteger(value: string | undefined, name: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`--${name} must be a positive integer.`);
  return parsed;
}

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseArchiveProjectChatsArgs(args = process.argv.slice(2)): ArchiveProjectChatsOptions {
  args = args.filter((arg) => arg !== "--");
  if (flag(args, "help")) {
    throw new Error(helpText());
  }

  const projectUrl = option(args, "project-url") ?? defaultProjectUrl;
  if (!projectUrlPattern.test(projectUrl)) {
    throw new Error(`Refusing to run outside the Seek and Find Books ChatGPT project. Received: ${projectUrl}`);
  }

  const maxLoadMore = parsePositiveInteger(option(args, "max-load-more") ?? "25", "max-load-more") ?? 25;
  if (maxLoadMore > 200) throw new Error("--max-load-more must be 200 or less.");

  return {
    cdpUrl: option(args, "cdp-url") ?? defaultCdpUrl,
    projectUrl,
    evidenceDir: option(args, "evidence-dir") ?? defaultEvidenceDir,
    confirm: flag(args, "confirm"),
    limit: parsePositiveInteger(option(args, "limit"), "limit"),
    maxLoadMore,
    excludeIds: parseList(option(args, "exclude-id") ?? option(args, "exclude-ids")),
    excludeTitlePattern: option(args, "exclude-title"),
    logDryRun: flag(args, "log-dry-run")
  };
}

function helpText(): string {
  return [
    "Usage:",
    "  npm run chatgpt:archive-seek-project -- --dry-run",
    "  npm run chatgpt:archive-seek-project -- --confirm",
    "",
    "Options:",
    "  --confirm                 Actually archive matched project chats. Without this, dry-run only.",
    "  --limit N                 Archive or preview only the first N matched chats.",
    "  --exclude-id a,b,c        Keep these conversation IDs.",
    "  --exclude-title PATTERN   Keep rows whose visible title matches this JavaScript regex.",
    "  --max-load-more N         Click Load more conversations up to N times before collecting rows. Default 25.",
    "  --cdp-url URL             Existing browser CDP URL. Default http://127.0.0.1:9222",
    "  --evidence-dir PATH       Evidence output folder.",
    "",
    "The script is standalone. It is not part of the video-source workflow."
  ].join("\n");
}

function timestampSlug(): string {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

async function connectExistingBrowser(cdpUrl: string): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.connectOverCDP(cdpUrl).catch(() => {
    throw new Error(`Could not connect to an existing browser at ${cdpUrl}. Start Chrome with --remote-debugging-port=9222 and log into ChatGPT first.`);
  });
  const context = browser.contexts()[0] ?? await browser.newContext();
  const page = context.pages().find((candidate) => /chatgpt\.com/.test(candidate.url())) ?? await context.newPage();
  return { browser, page };
}

async function openProject(page: Page, projectUrl: string): Promise<void> {
  await page.goto(projectUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.keyboard.press("Home").catch(() => undefined);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const element of Array.from(document.querySelectorAll<HTMLElement>("main, [role='main'], [data-radix-scroll-area-viewport], .overflow-y-auto"))) {
      element.scrollTop = 0;
    }
  }).catch(() => undefined);
  await page.waitForTimeout(750);
  const text = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  if (/log in|sign in|captcha|verify your account|payment|upgrade|subscribe|unusual activity/i.test(text)) {
    throw new Error("ChatGPT showed a login, verification, payment, CAPTCHA, or account boundary. Resolve it manually before archiving.");
  }
}

async function collectProjectRowsAcrossLoads(page: Page, projectUrl: string, maxLoadMore: number): Promise<{ rows: ProjectChatRow[]; warnings: string[] }> {
  const warnings: string[] = [];
  const byId = new Map<string, ProjectChatRow>();
  const rememberRows = async () => {
    for (const row of await collectProjectRows(page, projectUrl)) {
      byId.set(row.conversationId, row);
    }
  };

  await rememberRows();
  for (let index = 0; index < maxLoadMore; index += 1) {
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const button = buttons.find((candidate) => /load more conversations/i.test(candidate.textContent || candidate.getAttribute("aria-label") || ""));
      if (!button) return false;
      button.scrollIntoView({ block: "center" });
      button.click();
      return true;
    }).catch(() => false);
    if (!clicked) return { rows: Array.from(byId.values()), warnings };
    await page.waitForTimeout(1200);
    await rememberRows();
  }
  warnings.push(`Stopped after --max-load-more ${maxLoadMore}; more project rows may exist below the loaded list.`);
  return { rows: Array.from(byId.values()), warnings };
}

async function collectProjectRows(page: Page, projectUrl: string): Promise<ProjectChatRow[]> {
  const projectConversationPath = new URL(projectUrl).pathname.replace(/\/project$/i, "/c/");
  return page.evaluate((conversationPathPrefix) => {
    const byId = new Map<string, ProjectChatRow>();
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/c/"]'));
    for (const link of links) {
      const url = new URL(link.href);
      if (!url.pathname.startsWith(conversationPathPrefix)) continue;
      const id = link.href.match(/\/c\/([^/?#]+)/)?.[1];
      if (!id) continue;
      const row = link.closest("li") ?? link;
      const optionsButton = Array.from(row.querySelectorAll("button"))
        .find((button) => /conversation options/i.test(button.getAttribute("aria-label") || ""));
      if (!optionsButton) continue;
      const rect = link.getBoundingClientRect();
      const style = window.getComputedStyle(link);
      const visible = rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      const title = (link.textContent || link.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
      if (!visible || !title) continue;
      byId.set(id, {
        conversationId: id,
        title,
        href: link.href,
        visible,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) }
      });
    }
    return Array.from(byId.values());
  }, projectConversationPath);
}

export function filterArchiveTargets(rows: ProjectChatRow[], options: Pick<ArchiveProjectChatsOptions, "excludeIds" | "excludeTitlePattern" | "limit">): ProjectChatRow[] {
  const excluded = new Set(options.excludeIds);
  const titlePattern = options.excludeTitlePattern ? new RegExp(options.excludeTitlePattern, "i") : undefined;
  const filtered = rows.filter((row) => !excluded.has(row.conversationId))
    .filter((row) => !titlePattern?.test(row.title));
  return options.limit ? filtered.slice(0, options.limit) : filtered;
}

export function reconcileArchiveResults(results: ArchiveResult[], remainingRows: ProjectChatRow[]): ArchiveResult[] {
  const remainingIds = new Set(remainingRows.map((row) => row.conversationId));
  return results.map((result) => {
    if (result.ok || result.skipped || remainingIds.has(result.conversationId)) return result;
    return {
      ...result,
      ok: true,
      archived: true,
      error: undefined
    };
  });
}

async function archiveConversation(page: Page, target: ProjectChatRow): Promise<ArchiveResult> {
  try {
    const clicked = await page.evaluate((conversationId) => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(`a[href*="/c/${conversationId}"]`));
      for (const link of links) {
        const row = link.closest("li") ?? link;
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        if (rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden" || style.display === "none") continue;
        const button = Array.from(row.querySelectorAll("button"))
          .find((candidate) => /conversation options/i.test(candidate.getAttribute("aria-label") || ""));
        if (button instanceof HTMLElement) {
          link.scrollIntoView({ block: "center" });
          button.click();
          return true;
        }
      }
      return false;
    }, target.conversationId);

    if (!clicked) {
      return { conversationId: target.conversationId, title: target.title, ok: false, archived: false, error: "Conversation options menu was not found." };
    }

    await page.waitForTimeout(500);
    const archiveMenuItem = page.locator('[role="menuitem"], [cmdk-item], button')
      .filter({ hasText: /^Archive$/i })
      .last();
    await archiveMenuItem.click({ timeout: 10000 });
    await page.waitForTimeout(700);

    const confirmButton = page.getByRole("button", { name: /^Archive$/i }).last();
    if (await confirmButton.isVisible({ timeout: 1200 }).catch(() => false)) {
      await confirmButton.click();
      await page.waitForTimeout(1000);
    }

    const stillVisible = await page.evaluate((conversationId) => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(`a[href*="/c/${conversationId}"]`));
      return links.some((link) => {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      });
    }, target.conversationId);

    return {
      conversationId: target.conversationId,
      title: target.title,
      ok: !stillVisible,
      archived: !stillVisible,
      error: stillVisible ? "Archive clicked, but the row is still visible." : undefined
    };
  } catch (error) {
    return {
      conversationId: target.conversationId,
      title: target.title,
      ok: false,
      archived: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function writeEvidence(evidence: ArchiveEvidence, root: string): Promise<string> {
  const relative = `${evidence.options.evidenceDir}/seek-and-find-books-chat-archive-${timestampSlug()}.json`;
  const absolute = join(root, relative);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify({ ...evidence, evidencePath: relative }, null, 2)}\n`, "utf8");
  return relative;
}

async function writeLogs(evidence: ArchiveEvidence, root: string): Promise<{ sessionLog?: string; productionStatus?: string }> {
  if (evidence.dryRun && !evidence.options.logDryRun) return {};

  const sessionLog = await appendSessionLog({
    workflow: "chatgpt-project-chat-archive",
    inputs: {
      projectUrl: evidence.projectUrl,
      dryRun: evidence.dryRun,
      targetCount: evidence.targetCount,
      archivedCount: evidence.archivedCount,
      skippedCount: evidence.skippedCount,
      errorCount: evidence.errorCount
    },
    assumptions: [
      "Standalone utility only; not wired into the video-source workflow.",
      "Existing logged-in ChatGPT browser is controlled through CDP.",
      "No prompt generation, uploads, video export, social posting, or queue edits."
    ],
    outputsCreated: evidence.evidencePath ? [evidence.evidencePath] : [],
    warnings: [
      ...evidence.warnings,
      ...(evidence.errorCount ? evidence.results.filter((result) => result.error).map((result) => `${result.conversationId}: ${result.error}`) : [])
    ],
    qaResult: evidence.ok ? (evidence.dryRun ? "DRY-RUN PASS" : "PASS") : "WARN",
    nextManualStep: evidence.dryRun
      ? "Rerun with --confirm to archive the listed chats."
      : "Review the evidence JSON and confirm the project list is empty or contains only intentionally excluded chats."
  }, root);

  const statusResult: GenerateResult = {
    ok: evidence.ok,
    workflow: "chatgpt-project-chat-archive",
    summary: evidence.dryRun
      ? `Dry-run listed ${evidence.targetCount} Seek and Find Books project chats for archive.`
      : `Archived ${evidence.archivedCount}/${evidence.targetCount} Seek and Find Books project chats.`,
    files: evidence.evidencePath ? [evidence.evidencePath] : [],
    warnings: [
      ...evidence.warnings,
      ...(evidence.errorCount ? [`${evidence.errorCount} archive target(s) reported errors.`] : [])
    ],
    nextStep: evidence.dryRun
      ? "Rerun with --confirm when ready."
      : "Review evidence and continue with a clean ChatGPT project list."
  };
  const productionStatus = await updateProductionStatus(statusResult, root);
  return { sessionLog, productionStatus };
}

export async function runArchiveProjectChats(options: ArchiveProjectChatsOptions): Promise<ArchiveEvidence> {
  const root = repoRoot();
  const { browser, page } = await connectExistingBrowser(options.cdpUrl);
  try {
    await openProject(page, options.projectUrl);
    const { rows, warnings: loadWarnings } = await collectProjectRowsAcrossLoads(page, options.projectUrl, options.maxLoadMore);
    const targets = filterArchiveTargets(rows, options);
    const results: ArchiveResult[] = [];
    const warnings = [...loadWarnings];

    if (!options.confirm) {
      results.push(...targets.map((target) => ({
        conversationId: target.conversationId,
        title: target.title,
        ok: true,
        archived: false,
        skipped: true
      })));
    } else {
      for (const target of targets) {
        results.push(await archiveConversation(page, target));
        await page.waitForTimeout(350);
      }
      if (targets.length) {
        const unreconciledErrors = results.filter((result) => !result.ok).length;
        await openProject(page, options.projectUrl);
        const { rows: remainingRows, warnings: reconcileWarnings } = await collectProjectRowsAcrossLoads(page, options.projectUrl, options.maxLoadMore);
        warnings.push(...reconcileWarnings.map((warning) => `Reconciliation: ${warning}`));
        const reconciled = reconcileArchiveResults(results, remainingRows);
        const reconciledCount = reconciled.filter((result, index) => !results[index].ok && result.ok).length;
        results.splice(0, results.length, ...reconciled);
        if (unreconciledErrors && reconciledCount) {
          warnings.push(`Reconciled ${reconciledCount} archive result(s) after reloading the project list.`);
        }
      }
    }

    const evidence: ArchiveEvidence = {
      ok: results.every((result) => result.ok),
      dryRun: !options.confirm,
      projectUrl: options.projectUrl,
      targetCount: targets.length,
      archivedCount: results.filter((result) => result.archived).length,
      skippedCount: results.filter((result) => result.skipped).length,
      errorCount: results.filter((result) => !result.ok).length,
      options: { ...options, cdpUrl: options.cdpUrl.replace(/\/\/.*@/, "//***@") },
      targets,
      results,
      warnings
    };
    evidence.evidencePath = await writeEvidence(evidence, root);
    const logs = await writeLogs(evidence, root);
    evidence.sessionLog = logs.sessionLog;
    evidence.productionStatus = logs.productionStatus;
    return evidence;
  } finally {
    await browser.close().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  const options = parseArchiveProjectChatsArgs();
  const evidence = await runArchiveProjectChats(options);
  console.log(JSON.stringify(evidence, null, 2));
  if (!evidence.ok) process.exitCode = 1;
}

const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("chatgpt-archive-project-chats.ts") || invokedPath.endsWith("chatgpt-archive-project-chats.js")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
