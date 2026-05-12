import { describe, expect, it } from "vitest";
import { buildDuePressureChunk } from "../automation/social/due-pressure-chunks.js";
import { QueuePost } from "../automation/social/validate-queue.js";

function post(day: number, scheduledDate: string, statuses: string[]): QueuePost {
  return {
    post_id: `book01-day-${String(day).padStart(2, "0")}`,
    campaign_day: day,
    scheduled_date: scheduledDate,
    media_assets: [`day-${day}.png`],
    caption_source: { text: `Caption ${day}` },
    platform_tasks: statuses.map((status, index) => ({
      platform: index === 0 ? "Instagram" : "Facebook",
      status,
      idempotency_key: index === 0 ? `day-${day}-instagram-feed-post` : `day-${day}-facebook-page-post`
    }))
  };
}

describe("due-pressure chunks", () => {
  it("groups ready work that is behind or due today as Q1", () => {
    const chunk = buildDuePressureChunk([
      post(4, "2026-05-10", ["ready", "posted"]),
      post(5, "2026-05-11", ["ready", "ready"]),
      post(6, "2026-05-12", ["ready"])
    ], new Date("2026-05-11T12:00:00-04:00"));

    expect(chunk?.scope).toBe("behind_or_due_today");
    expect(chunk?.quadrant).toBe("Q1");
    expect(chunk?.days).toEqual([4, 5]);
    expect(chunk?.task_count).toBe(3);
    expect(chunk?.prevention_path).toContain("one Day 4-5 chunk packet");
    expect(chunk?.tasks[0].posting_asset_requirements).toContainEqual(expect.objectContaining({
      slot: "instagram_feed_4x5",
      required: true,
      status: "missing"
    }));
    expect(chunk?.tasks[0].posting_caption).toBe("Caption 4");
  });

  it("groups the next two days as Q2 when nothing is due now", () => {
    const chunk = buildDuePressureChunk([
      post(6, "2026-05-12", ["ready"]),
      post(7, "2026-05-13", ["ready"]),
      post(8, "2026-05-14", ["ready"])
    ], new Date("2026-05-11T12:00:00-04:00"));

    expect(chunk?.scope).toBe("due_soon_next_2_days");
    expect(chunk?.quadrant).toBe("Q2");
    expect(chunk?.days).toEqual([6, 7]);
    expect(chunk?.task_count).toBe(2);
  });
});
