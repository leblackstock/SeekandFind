export const youtubeUploadReloadCancelRule =
  "On YouTube Studio upload/draft screens only: if automation triggers a reload/leave-page dialog, immediately cancel it and continue the current YouTube upload flow.";

export interface DialogLike {
  type(): string;
  message(): string;
  dismiss(): Promise<void>;
}

export interface PageLike {
  url(): string;
  on(event: "dialog", handler: (dialog: DialogLike) => void | Promise<void>): void;
}

export interface KeyboardLike {
  press(key: string): Promise<void>;
}

export interface YoutubeUploadPageLike extends PageLike {
  keyboard?: KeyboardLike;
}

export interface YoutubeUploadReloadCancelRecorder {
  canceledYoutubeUploadDialogs: number;
  proactiveCancelAttempts: number;
  messages: string[];
}

export function isYoutubeUploadScreenUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!/(^|\.)studio\.youtube\.com$/i.test(parsed.hostname)) return false;
    return /\/channel\/|\/video\/|upload|\/videos\/(?:upload|short)|\/dashboard/i.test(parsed.pathname + parsed.search);
  } catch {
    return false;
  }
}

export function isReloadOrLeaveDialog(dialog: DialogLike): boolean {
  const type = dialog.type().toLowerCase();
  const message = dialog.message().toLowerCase();
  return type === "beforeunload"
    || /reload|leave|changes you made may not be saved|not be saved/i.test(message);
}

export function attachYoutubeUploadReloadCancelGuard(
  page: PageLike,
  recorder: YoutubeUploadReloadCancelRecorder = { canceledYoutubeUploadDialogs: 0, proactiveCancelAttempts: 0, messages: [] }
): YoutubeUploadReloadCancelRecorder {
  page.on("dialog", async (dialog) => {
    if (!isYoutubeUploadScreenUrl(page.url())) return;
    if (!isReloadOrLeaveDialog(dialog)) return;
    recorder.canceledYoutubeUploadDialogs += 1;
    recorder.messages.push(dialog.message());
    await dialog.dismiss();
  });
  return recorder;
}

export async function cancelPossibleYoutubeUploadReloadDialog(
  page: YoutubeUploadPageLike,
  recorder: YoutubeUploadReloadCancelRecorder = { canceledYoutubeUploadDialogs: 0, proactiveCancelAttempts: 0, messages: [] }
): Promise<YoutubeUploadReloadCancelRecorder> {
  if (!isYoutubeUploadScreenUrl(page.url())) return recorder;

  recorder.proactiveCancelAttempts += 1;
  recorder.messages.push("proactive-cancel-attempt-recorded-without-escape");
  return recorder;
}

export async function runYoutubeUploadReloadAttempt<T>(
  page: YoutubeUploadPageLike,
  action: () => Promise<T>,
  recorder: YoutubeUploadReloadCancelRecorder = attachYoutubeUploadReloadCancelGuard(page)
): Promise<T> {
  try {
    return await action();
  } finally {
    await cancelPossibleYoutubeUploadReloadDialog(page, recorder);
  }
}
