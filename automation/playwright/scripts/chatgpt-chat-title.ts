import { Page } from "@playwright/test";

export type ChatRenameMethod =
  | "project-list-row-menu"
  | "active-chat-visible-already-correct"
  | "api-only-untrusted"
  | "manual-required"
  | "not-attempted-no-conversation-id"
  | "failed";

interface VisibleRowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ChatTitleResult {
  ok: boolean;
  title?: string;
  requested?: boolean;
  apiVerified?: boolean;
  visibleVerified?: boolean;
  verificationMethod?: "visible";
  method?: ChatRenameMethod;
  conversationId?: string;
  expectedChatTitle?: string;
  observedVisibleChatTitle?: string;
  apiTitle?: string;
  visibleTitle?: string;
  visibleCandidates?: string[];
  activeChatUrl?: string;
  projectUrl?: string;
  visibleRowHref?: string;
  visibleRowRect?: VisibleRowRect;
  promptFingerprint?: string[];
  promptFingerprintVerified?: boolean;
  evidencePath?: string;
  screenshotPath?: string;
  warning?: string;
}

export function cleanChatTitle(value: string | undefined, fallback = "Ember Image Run"): string {
  const cleaned = (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
  return (cleaned || fallback).slice(0, 90).trim();
}

export function marketingChatTitle(campaign: string | undefined, promptTitle: string): string {
  const batchMatch = campaign?.match(/Batch\s+(\d+)/i);
  const bookMatch = campaign?.match(/Book\s+(\d+)/i);
  const slotMatch = promptTitle.match(/Image\s+(\d+)/i);
  const shortPrompt = promptTitle
    .replace(/^Book\s+\d+\s+Promo\s+Image\s+\d+\s+-\s*/i, "")
    .replace(/\s+Teaser$/i, "")
    .trim();
  const parts = [
    bookMatch ? `B${bookMatch[1]}` : undefined,
    batchMatch ? `Promo Batch ${batchMatch[1]}` : "Promo",
    slotMatch ? `Slot ${slotMatch[1]}` : undefined,
    shortPrompt || promptTitle
  ].filter(Boolean) as string[];
  return cleanChatTitle(parts.join(" - "));
}

export function brokeModeChatTitle(assetName: string): string {
  return cleanChatTitle(`Broke Mode - ${assetName}`);
}

export function visibleTextVerifiesChatTitle(visibleText: string, requestedTitle: string): boolean {
  const title = cleanChatTitle(requestedTitle);
  return cleanChatTitle(visibleText) === title;
}

export function visibleSidebarTextVerifiesChatTitle(visibleText: string, requestedTitle: string): boolean {
  const title = cleanChatTitle(requestedTitle);
  const visible = cleanChatTitle(visibleText);
  return visible === title || visible.startsWith(title);
}

export function chatGptProjectRootUrlFromConversation(url: string): string | undefined {
  const match = url.match(/^(https:\/\/chatgpt\.com\/g\/g-p-[^/]+)\/c\/[^/?#]+/i);
  return match ? `${match[1]}/project` : undefined;
}

async function visibleChatTitle(page: Page, requestedTitle: string, conversationId: string): Promise<{ verified: boolean; visibleTitle?: string; candidates: string[] }> {
  const activeLinks = await page.locator(`a[href*="/c/${conversationId}"]`).evaluateAll((elements) => elements
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    })
    .map((element) => (element.textContent || element.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
  ).catch(() => []);
  const activeCurrent = await page.locator("[aria-current='page']").evaluateAll((elements) => elements
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    })
    .map((element) => (element.textContent || element.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
  ).catch(() => []);
  const candidates = Array.from(new Set([...activeLinks, ...activeCurrent])).slice(0, 20);
  const visibleTitle = candidates.find((candidate) => visibleSidebarTextVerifiesChatTitle(candidate, requestedTitle));
  return { verified: Boolean(visibleTitle), visibleTitle, candidates };
}

async function waitForVisibleChatTitle(page: Page, requestedTitle: string, conversationId: string, timeoutMs: number): Promise<{ verified: boolean; visibleTitle?: string; candidates: string[] }> {
  const deadline = Date.now() + timeoutMs;
  let last: { verified: boolean; visibleTitle?: string; candidates: string[] } = { verified: false, candidates: [] };
  while (Date.now() <= deadline) {
    last = await visibleChatTitle(page, requestedTitle, conversationId);
    if (last.verified) return last;
    await page.waitForTimeout(500);
  }
  return last;
}

export async function verifyVisibleChatTitleForConversation(page: Page, requestedTitle: string, conversationId: string, timeoutMs = 5000): Promise<ChatTitleResult> {
  const title = cleanChatTitle(requestedTitle);
  const visible = await waitForVisibleChatTitle(page, title, conversationId, timeoutMs);
  if (visible.verified) {
    return {
      ok: true,
      title,
      requested: false,
      apiVerified: false,
      visibleVerified: true,
      verificationMethod: "visible",
      method: "active-chat-visible-already-correct",
      conversationId,
      expectedChatTitle: title,
      observedVisibleChatTitle: visible.visibleTitle,
      visibleTitle: visible.visibleTitle,
      visibleCandidates: visible.candidates
    };
  }

  return {
    ok: false,
    title,
    requested: false,
    apiVerified: false,
    visibleVerified: false,
    method: "failed",
    conversationId,
    expectedChatTitle: title,
    visibleCandidates: visible.candidates,
    warning: `Visible ChatGPT project/chat title did not show "${title}" for conversation ${conversationId}.`
  };
}

export async function renameChatViaProjectRowMenu(
  activePage: Page,
  requestedTitle: string,
  options: {
    conversationId?: string;
    projectUrl?: string;
    promptFingerprint?: string[];
    screenshotPath?: string;
    timeoutMs?: number;
  } = {}
): Promise<ChatTitleResult> {
  const title = cleanChatTitle(requestedTitle);
  const deadline = Date.now() + (options.timeoutMs ?? 20000);
  while (Date.now() < deadline && !/\/c\//.test(activePage.url())) {
    await activePage.waitForTimeout(500);
  }
  const activeChatUrl = activePage.url();
  const conversationId = options.conversationId ?? activeChatUrl.match(/\/c\/([^/?#]+)/)?.[1];
  const promptFingerprint = (options.promptFingerprint ?? []).map((marker) => marker.trim()).filter(Boolean);
  const promptFingerprintVerified = promptFingerprint.length
    ? await activePage.evaluate((markers) => {
      const text = document.body.innerText || "";
      return markers.every((marker) => text.includes(marker));
    }, promptFingerprint).catch(() => false)
    : undefined;

  if (!conversationId) {
    return {
      ok: false,
      title,
      requested: false,
      apiVerified: false,
      visibleVerified: false,
      method: "not-attempted-no-conversation-id",
      expectedChatTitle: title,
      activeChatUrl,
      promptFingerprint,
      promptFingerprintVerified,
      warning: "Chat title rename skipped because ChatGPT did not expose a conversation URL yet."
    };
  }

  const projectUrl = options.projectUrl ?? chatGptProjectRootUrlFromConversation(activeChatUrl);
  if (!projectUrl) {
    return {
      ok: false,
      title,
      requested: false,
      apiVerified: false,
      visibleVerified: false,
      method: "manual-required",
      conversationId,
      expectedChatTitle: title,
      activeChatUrl,
      promptFingerprint,
      promptFingerprintVerified,
      warning: `Manual rename TODO: set conversation ${conversationId} to "${title}". Project URL could not be derived from ${activeChatUrl}.`
    };
  }

  const projectPage = await activePage.context().newPage();
  try {
    await projectPage.goto(projectUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await projectPage.waitForTimeout(2500);
    const beforeRows = await visibleProjectRows(projectPage, conversationId);
    if (!beforeRows.length) {
      await projectPage.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await projectPage.waitForTimeout(2500);
    }

    const selectedBeforeRows = await visibleProjectRows(projectPage, conversationId);
    if (!selectedBeforeRows.length) {
      return {
        ok: false,
        title,
        requested: false,
        apiVerified: false,
        visibleVerified: false,
        method: "manual-required",
        conversationId,
        expectedChatTitle: title,
        activeChatUrl,
        projectUrl,
        visibleCandidates: beforeRows.map((row) => row.text),
        promptFingerprint,
        promptFingerprintVerified,
        warning: `Manual rename TODO: set conversation ${conversationId} to "${title}". No visible project row was found for that conversation ID.`
      };
    }

    const alreadyVisible = selectedBeforeRows.find((row) => visibleSidebarTextVerifiesChatTitle(row.text, title));
    if (alreadyVisible) {
      if (options.screenshotPath) await projectPage.screenshot({ path: options.screenshotPath, fullPage: false }).catch(() => undefined);
      return {
        ok: true,
        title,
        requested: false,
        apiVerified: false,
        visibleVerified: true,
        verificationMethod: "visible",
        method: "active-chat-visible-already-correct",
        conversationId,
        expectedChatTitle: title,
        observedVisibleChatTitle: alreadyVisible.text,
        visibleTitle: alreadyVisible.text,
        visibleCandidates: selectedBeforeRows.map((row) => row.text),
        activeChatUrl,
        projectUrl,
        visibleRowHref: alreadyVisible.href,
        visibleRowRect: alreadyVisible.rect,
        promptFingerprint,
        promptFingerprintVerified,
        screenshotPath: options.screenshotPath
      };
    }

    const clicked = await projectPage.evaluate((targetId) => {
      const links = Array.from(document.querySelectorAll(`a[href*="/c/${targetId}"]`));
      for (const link of links) {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        if (rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden" || style.display === "none") continue;
        const row = link.closest("li");
        const button = row ? Array.from(row.querySelectorAll("button")).find((candidate) => /conversation options/i.test(candidate.getAttribute("aria-label") || "")) : undefined;
        if (button instanceof HTMLElement) {
          button.click();
          return true;
        }
      }
      return false;
    }, conversationId);

    if (!clicked) {
      return {
        ok: false,
        title,
        requested: false,
        apiVerified: false,
        visibleVerified: false,
        method: "manual-required",
        conversationId,
        expectedChatTitle: title,
        activeChatUrl,
        projectUrl,
        visibleCandidates: selectedBeforeRows.map((row) => row.text),
        promptFingerprint,
        promptFingerprintVerified,
        warning: `Manual rename TODO: set conversation ${conversationId} to "${title}". Project row options menu was not found.`
      };
    }

    await projectPage.waitForTimeout(700);
    await projectPage.getByRole("menuitem", { name: /^Rename$/ }).click({ timeout: 10000 });
    await projectPage.waitForTimeout(500);
    const titleInput = projectPage.locator("input[aria-label='Chat title']").first();
    await titleInput.fill(title);
    await titleInput.press("Enter");
    await projectPage.waitForTimeout(2500);

    const verified = await waitForVisibleProjectRowTitle(projectPage, conversationId, title, options.timeoutMs ?? 10000);
    if (options.screenshotPath) await projectPage.screenshot({ path: options.screenshotPath, fullPage: false }).catch(() => undefined);

    if (verified.verified && verified.row) {
      return {
        ok: true,
        title,
        requested: true,
        apiVerified: false,
        visibleVerified: true,
        verificationMethod: "visible",
        method: "project-list-row-menu",
        conversationId,
        expectedChatTitle: title,
        observedVisibleChatTitle: verified.row.text,
        visibleTitle: verified.row.text,
        visibleCandidates: verified.rows.map((row) => row.text),
        activeChatUrl,
        projectUrl,
        visibleRowHref: verified.row.href,
        visibleRowRect: verified.row.rect,
        promptFingerprint,
        promptFingerprintVerified,
        screenshotPath: options.screenshotPath
      };
    }

    return {
      ok: false,
      title,
      requested: true,
      apiVerified: false,
      visibleVerified: false,
      method: "failed",
      conversationId,
      expectedChatTitle: title,
      observedVisibleChatTitle: verified.rows[0]?.text,
      visibleCandidates: verified.rows.map((row) => row.text),
      activeChatUrl,
      projectUrl,
      promptFingerprint,
      promptFingerprintVerified,
      screenshotPath: options.screenshotPath,
      warning: `Project-list row rename was requested, but visible title did not show "${title}".`
    };
  } catch (error) {
    return {
      ok: false,
      title,
      requested: true,
      apiVerified: false,
      visibleVerified: false,
      method: "failed",
      conversationId,
      expectedChatTitle: title,
      activeChatUrl,
      projectUrl,
      promptFingerprint,
      promptFingerprintVerified,
      screenshotPath: options.screenshotPath,
      warning: `Project-list row rename failed: ${error instanceof Error ? error.message : String(error)}. Manual rename TODO: set conversation ${conversationId} to "${title}".`
    };
  } finally {
    await projectPage.close().catch(() => undefined);
  }
}

async function visibleProjectRows(page: Page, conversationId: string): Promise<Array<{ text: string; href?: string; rect: VisibleRowRect }>> {
  return page.evaluate((targetId) => Array.from(document.querySelectorAll(`a[href*="/c/${targetId}"]`)).map((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return {
      text: (element.textContent || element.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim(),
      href: element.getAttribute("href") || undefined,
      visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none",
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) }
    };
  }).filter((row) => row.visible).map(({ text, href, rect }) => ({ text, href, rect })), conversationId).catch(() => []);
}

async function waitForVisibleProjectRowTitle(page: Page, conversationId: string, requestedTitle: string, timeoutMs: number): Promise<{ verified: boolean; row?: { text: string; href?: string; rect: VisibleRowRect }; rows: Array<{ text: string; href?: string; rect: VisibleRowRect }> }> {
  const deadline = Date.now() + timeoutMs;
  let rows: Array<{ text: string; href?: string; rect: VisibleRowRect }> = [];
  while (Date.now() <= deadline) {
    rows = await visibleProjectRows(page, conversationId);
    const row = rows.find((candidate) => visibleSidebarTextVerifiesChatTitle(candidate.text, requestedTitle));
    if (row) return { verified: true, row, rows };
    await page.waitForTimeout(500);
  }
  return { verified: false, rows };
}

export async function renameCurrentChat(page: Page, requestedTitle: string): Promise<ChatTitleResult> {
  const title = cleanChatTitle(requestedTitle);
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline && !/\/c\//.test(page.url())) {
    await page.waitForTimeout(1000);
  }

  if (!/\/c\//.test(page.url())) {
    return { ok: false, title, requested: false, apiVerified: false, visibleVerified: false, warning: "Chat title rename skipped because ChatGPT did not expose a conversation URL yet." };
  }

  let lastWarning = "Chat title rename was not verified.";
  let lastApiTitle: string | undefined;
  let lastApiVerified = false;
  let lastConversationId: string | undefined;
  let lastVisibleTitle: string | undefined;
  let lastVisibleCandidates: string[] = [];

  const initialConversationId = page.url().match(/\/c\/([^/]+)/)?.[1];
  if (initialConversationId) {
    const visible = await waitForVisibleChatTitle(page, title, initialConversationId, 5000);
    if (visible.verified) {
      return {
        ok: true,
        title,
        requested: false,
        apiVerified: false,
        visibleVerified: true,
        verificationMethod: "visible",
        conversationId: initialConversationId,
        visibleTitle: visible.visibleTitle,
        visibleCandidates: visible.candidates
      };
    }
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const patchResult = await page.evaluate(async (titleToSet) => {
      const conversationId = location.pathname.match(/\/c\/([^/]+)/)?.[1];
      if (!conversationId) return { ok: false, warning: "Chat title rename skipped because no conversation ID was found." };

      const sessionResponse = await fetch("/api/auth/session");
      const session = await sessionResponse.json().catch(() => ({}));
      if (!session?.accessToken) return { ok: false, warning: "Chat title rename skipped because the ChatGPT access token was unavailable." };

      const response = await fetch(`/backend-api/conversation/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({ title: titleToSet })
      });

      if (!response.ok) return { ok: false, warning: `Chat title rename failed with HTTP ${response.status}.` };
      return { ok: true };
    }, title).catch((error: unknown) => ({ ok: false, warning: error instanceof Error ? error.message : String(error) }));

    if (!patchResult.ok) {
      lastWarning = patchResult.warning ?? lastWarning;
      await page.waitForTimeout(1000);
      continue;
    }

    for (let verifyAttempt = 1; verifyAttempt <= 5; verifyAttempt += 1) {
      await page.waitForTimeout(1000);
      const verifyResult = await page.evaluate(async () => {
        const conversationId = location.pathname.match(/\/c\/([^/]+)/)?.[1];
        if (!conversationId) return { ok: false, warning: "Chat title verification skipped because no conversation ID was found." };

        const sessionResponse = await fetch("/api/auth/session");
        const session = await sessionResponse.json().catch(() => ({}));
        if (!session?.accessToken) return { ok: false, warning: "Chat title verification skipped because the ChatGPT access token was unavailable." };

        const verifyResponse = await fetch(`/backend-api/conversation/${conversationId}`, {
          headers: { Authorization: `Bearer ${session.accessToken}` }
        }).catch(() => undefined);
        if (!verifyResponse?.ok) return { ok: false, warning: `Chat title verification failed with HTTP ${verifyResponse?.status ?? "unknown"}.` };
        const verifyJson = await verifyResponse.json().catch(() => ({}));
        const apiTitle = typeof verifyJson?.title === "string" ? verifyJson.title : undefined;
        return { ok: true, apiTitle, conversationId };
      }).catch((error: unknown) => ({ ok: false, warning: error instanceof Error ? error.message : String(error) }));

      const apiTitle = "apiTitle" in verifyResult ? verifyResult.apiTitle : undefined;
      const conversationId = "conversationId" in verifyResult ? verifyResult.conversationId : undefined;
      lastApiTitle = apiTitle;
      lastApiVerified = Boolean(verifyResult.ok && apiTitle === title);
      lastConversationId = conversationId;

      if (conversationId) {
        const visible = await waitForVisibleChatTitle(page, title, conversationId, 2500);
        lastVisibleTitle = visible.visibleTitle;
        lastVisibleCandidates = visible.candidates;
        if (visible.verified) {
          return {
            ok: true,
            title,
            requested: true,
            apiVerified: lastApiVerified,
            visibleVerified: true,
            verificationMethod: "visible",
            conversationId,
            apiTitle,
            visibleTitle: visible.visibleTitle,
            visibleCandidates: visible.candidates
          };
        }
      }

      lastWarning = lastApiVerified
        ? `Chat title rename API verification matched "${title}", but the active ChatGPT sidebar/chat title did not visibly show that title.`
        : apiTitle
          ? `Chat title rename request completed, but API title is still "${apiTitle}".`
        : verifyResult.warning ?? `Chat title rename request completed but "${title}" was not verified.`;
    }
  }

  return {
    ok: false,
    title,
    requested: true,
    apiVerified: lastApiVerified,
    visibleVerified: false,
    conversationId: lastConversationId,
    apiTitle: lastApiTitle,
    visibleTitle: lastVisibleTitle,
    visibleCandidates: lastVisibleCandidates,
    warning: `${lastWarning} Manual rename TODO: set the chat title to "${title}".`
  };
}
