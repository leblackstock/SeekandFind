import { describe, expect, it } from "vitest";
import {
  filterArchiveTargets,
  parseArchiveProjectChatsArgs,
  reconcileArchiveResults
} from "../automation/playwright/scripts/chatgpt-archive-project-chats.js";

describe("ChatGPT Seek and Find project archive utility", () => {
  it("defaults to dry-run against the Seek and Find Books project", () => {
    const options = parseArchiveProjectChatsArgs([]);

    expect(options.confirm).toBe(false);
    expect(options.projectUrl).toContain("seek-and-find-books/project");
    expect(options.cdpUrl).toBe("http://127.0.0.1:9222");
    expect(options.maxLoadMore).toBe(25);
  });

  it("requires the project URL to stay inside Seek and Find Books", () => {
    expect(() => parseArchiveProjectChatsArgs([
      "--project-url",
      "https://chatgpt.com/g/g-p-other-project/project"
    ])).toThrow(/Seek and Find Books/);
  });

  it("tolerates a standalone npm argument separator", () => {
    expect(parseArchiveProjectChatsArgs(["--", "--max-load-more", "5"]).maxLoadMore).toBe(5);
  });

  it("handles npm env forwarding for valued options", () => {
    const previous = process.env.npm_config_max_load_more;
    process.env.npm_config_max_load_more = "true";
    try {
      expect(parseArchiveProjectChatsArgs(["5"]).maxLoadMore).toBe(5);
    } finally {
      if (previous === undefined) delete process.env.npm_config_max_load_more;
      else process.env.npm_config_max_load_more = previous;
    }
  });

  it("filters archive targets by excluded ids, excluded titles, and limit", () => {
    const rows = [
      row("one", "Keep This Chat"),
      row("two", "Archive This Chat"),
      row("three", "Archive Another Chat")
    ];

    expect(filterArchiveTargets(rows, {
      excludeIds: ["one"],
      excludeTitlePattern: "Another",
      limit: 1
    }).map((target) => target.conversationId)).toEqual(["two"]);
  });

  it("reconciles archive clicks after ChatGPT removes rows only on reload", () => {
    const results = reconcileArchiveResults([
      {
        conversationId: "archived-after-refresh",
        title: "Archived After Refresh",
        ok: false,
        archived: false,
        error: "Archive clicked, but the row is still visible."
      },
      {
        conversationId: "still-present",
        title: "Still Present",
        ok: false,
        archived: false,
        error: "Archive clicked, but the row is still visible."
      }
    ], [
      row("still-present", "Still Present")
    ]);

    expect(results[0]).toMatchObject({
      conversationId: "archived-after-refresh",
      ok: true,
      archived: true
    });
    expect(results[0].error).toBeUndefined();
    expect(results[1]).toMatchObject({
      conversationId: "still-present",
      ok: false,
      archived: false,
      error: "Archive clicked, but the row is still visible."
    });
  });
});

function row(conversationId: string, title: string) {
  return {
    conversationId,
    title,
    href: `https://chatgpt.com/g/g-p-69efa9ddfdd08191b8673b0f32dfb621-seek-and-find-books/c/${conversationId}`,
    visible: true,
    rect: { x: 0, y: 0, w: 200, h: 30 }
  };
}
