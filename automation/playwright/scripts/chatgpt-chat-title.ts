import { Page } from "@playwright/test";

export interface ChatTitleResult {
  ok: boolean;
  title?: string;
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

export async function renameCurrentChat(page: Page, requestedTitle: string): Promise<ChatTitleResult> {
  const title = cleanChatTitle(requestedTitle);
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline && !/\/c\//.test(page.url())) {
    await page.waitForTimeout(1000);
  }

  if (!/\/c\//.test(page.url())) {
    return { ok: false, title, warning: "Chat title rename skipped because ChatGPT did not expose a conversation URL yet." };
  }

  return page.evaluate(async (titleToSet) => {
    const conversationId = location.pathname.match(/\/c\/([^/]+)/)?.[1];
    if (!conversationId) {
      return { ok: false, title: titleToSet, warning: "Chat title rename skipped because no conversation ID was found." };
    }

    const sessionResponse = await fetch("/api/auth/session");
    const session = await sessionResponse.json().catch(() => ({}));
    if (!session?.accessToken) {
      return { ok: false, title: titleToSet, warning: "Chat title rename skipped because the ChatGPT access token was unavailable." };
    }

    const response = await fetch(`/backend-api/conversation/${conversationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify({ title: titleToSet })
    });

    if (!response.ok) {
      return { ok: false, title: titleToSet, warning: `Chat title rename failed with HTTP ${response.status}.` };
    }

    return { ok: true, title: titleToSet };
  }, title);
}
