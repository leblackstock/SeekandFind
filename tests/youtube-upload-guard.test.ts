import { describe, expect, it } from "vitest";
import {
  attachYoutubeUploadReloadCancelGuard,
  cancelPossibleYoutubeUploadReloadDialog,
  isReloadOrLeaveDialog,
  isYoutubeUploadScreenUrl,
  runYoutubeUploadReloadAttempt
} from "../automation/social/youtube-upload-guard.js";

describe("YouTube upload reload dialog guard", () => {
  type TestDialog = { type(): string; message(): string; dismiss(): Promise<void> };
  type TestHandler = (dialog: TestDialog) => void | Promise<void>;

  it("is scoped to YouTube Studio upload/draft screens", () => {
    expect(isYoutubeUploadScreenUrl("https://studio.youtube.com/channel/abc/videos/short?d=ud")).toBe(true);
    expect(isYoutubeUploadScreenUrl("https://studio.youtube.com/dashboard")).toBe(true);
    expect(isYoutubeUploadScreenUrl("https://www.youtube.com/watch?v=abc")).toBe(false);
    expect(isYoutubeUploadScreenUrl("https://business.facebook.com/latest/composer")).toBe(false);
  });

  it("recognizes reload and unsaved-change dialogs", () => {
    expect(isReloadOrLeaveDialog({
      type: () => "beforeunload",
      message: () => "Changes you made may not be saved.",
      dismiss: async () => undefined
    })).toBe(true);

    expect(isReloadOrLeaveDialog({
      type: () => "alert",
      message: () => "Reload site?",
      dismiss: async () => undefined
    })).toBe(true);
  });

  it("dismisses matching dialogs only on YouTube upload pages", async () => {
    let handler: TestHandler = async () => undefined;
    let dismissed = 0;
    const recorder = attachYoutubeUploadReloadCancelGuard({
      url: () => "https://studio.youtube.com/channel/abc/videos/short?d=ud",
      on: (_event, nextHandler) => {
        handler = nextHandler;
      }
    });

    await handler({
      type: () => "beforeunload",
      message: () => "Changes you made may not be saved.",
      dismiss: async () => {
        dismissed += 1;
      }
    });

    expect(dismissed).toBe(1);
    expect(recorder.canceledYoutubeUploadDialogs).toBe(1);
  });

  it("does not dismiss reload dialogs on non-YouTube pages", async () => {
    let handler: TestHandler = async () => undefined;
    let dismissed = 0;
    attachYoutubeUploadReloadCancelGuard({
      url: () => "https://business.facebook.com/latest/composer",
      on: (_event, nextHandler) => {
        handler = nextHandler;
      }
    });

    await handler({
      type: () => "beforeunload",
      message: () => "Changes you made may not be saved.",
      dismiss: async () => {
        dismissed += 1;
      }
    });

    expect(dismissed).toBe(0);
  });

  it("records a proactive cancel attempt without pressing Escape when no dialog event fires", async () => {
    const pressed: string[] = [];
    const recorder = await cancelPossibleYoutubeUploadReloadDialog({
      url: () => "https://studio.youtube.com/channel/abc/videos/short?d=ud",
      on: () => undefined,
      keyboard: {
        press: async (key) => {
          pressed.push(key);
        }
      }
    });

    expect(pressed).toEqual([]);
    expect(recorder.proactiveCancelAttempts).toBe(1);
    expect(recorder.messages).toContain("proactive-cancel-attempt-recorded-without-escape");
  });

  it("runs proactive cancel bookkeeping in a finally block after YouTube reload/navigation attempts", async () => {
    const pressed: string[] = [];
    const recorder = { canceledYoutubeUploadDialogs: 0, proactiveCancelAttempts: 0, messages: [] };
    const result = await runYoutubeUploadReloadAttempt(
      {
        url: () => "https://studio.youtube.com/channel/abc/videos/short?d=ud",
        on: () => undefined,
        keyboard: {
          press: async (key) => {
            pressed.push(key);
          }
        }
      },
      async () => "attempted",
      recorder
    );

    expect(result).toBe("attempted");
    expect(pressed).toEqual([]);
    expect(recorder.proactiveCancelAttempts).toBe(1);
  });
});
