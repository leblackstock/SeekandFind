import { describe, expect, it } from "vitest";
import { buildCompactPostingPacket } from "../automation/social/compact-posting-packet.js";
import { QueuePost } from "../automation/social/validate-queue.js";

function post(day: number, scheduledDate: string): QueuePost {
  return {
    post_id: `book01-day-${String(day).padStart(2, "0")}`,
    campaign_day: day,
    scheduled_date: scheduledDate,
    media_assets: [`day-${day}.png`, `day-${day}.mp4`],
    approved_platform_assets: {
      meta_feed_4x5: `day-${day}-meta.png`
    },
    caption_source: {
      text: `Caption ${day}`,
      cta: "Save this."
    },
    platform_tasks: [
      {
        platform: "Pinterest",
        status: "ready",
        idempotency_key: `day-${day}-pinterest`,
        board_name: "Dragon Books for Kids",
        required_hashtags: ["#SeekAndFind", "#dragonbooks"]
      },
      {
        platform: "Instagram",
        status: "ready",
        idempotency_key: `day-${day}-instagram-feed-post`,
        required_hashtags: ["#SeekAndFind", "#dragonbooks"]
      }
    ]
  };
}

describe("compact posting packet", () => {
  it("holds a future day unless prep mode is explicitly used", () => {
    const packet = buildCompactPostingPacket([post(6, "2026-05-12")], {
      days: [6],
      today: new Date("2026-05-11T12:00:00-04:00")
    });

    expect(packet.postingAllowed).toBe(false);
    expect(packet.markdown).toContain("Mode: HOLD");
    expect(packet.markdown).toContain("Gate: HOLD / PREP ONLY");
  });

  it("builds a compact prep packet with captions, assets, and receipt paths", () => {
    const packet = buildCompactPostingPacket([post(6, "2026-05-12")], {
      days: [6],
      prep: true,
      today: new Date("2026-05-11T12:00:00-04:00")
    });

    expect(packet.selectedCount).toBe(2);
    expect(packet.markdown).toContain("Mode: PREP ONLY");
    expect(packet.markdown).toContain("Caption 6");
    expect(packet.markdown).toContain("#SeekAndFind #dragonbooks");
    expect(packet.markdown).toContain("asset: day-6.png");
    expect(packet.markdown).toContain("asset: day-6-meta.png");
    expect(packet.markdown).toContain("receipt: content/social/campaigns/book-01/receipts/pinterest/book01-day-06/day-6-pinterest.json");
    expect(packet.markdown).toContain("done-helper: npm run social:done -- day-6-pinterest <POST_URL>");
    expect(packet.markdown).toContain("each helper writes the receipt, marks the queue, validates, and prints the next packet");
    expect(packet.markdown).not.toContain("mark: npm run social:mark-result");
  });

  it("uses the due-soon chunk as the default today prep packet", () => {
    const packet = buildCompactPostingPacket([
      post(6, "2026-05-12"),
      post(7, "2026-05-13"),
      post(8, "2026-05-14")
    ], {
      autoDuePressureChunk: true,
      today: new Date("2026-05-11T21:42:00-04:00")
    });

    expect(packet.postingAllowed).toBe(false);
    expect(packet.selectedCount).toBe(4);
    expect(packet.markdown).toContain("Today (America/New_York): 2026-05-11");
    expect(packet.markdown).toContain("Mode: PREP ONLY");
    expect(packet.markdown).toContain("Source: due-pressure chunk (due_soon_next_2_days)");
    expect(packet.markdown).toContain("Chunk days: Day 6, Day 7");
    expect(packet.markdown).toContain("## Day 6 - 2026-05-12");
    expect(packet.markdown).toContain("## Day 7 - 2026-05-13");
    expect(packet.markdown).not.toContain("## Day 8 - 2026-05-14");
  });

  it("uses the campaign timezone instead of the host UTC date", () => {
    const packet = buildCompactPostingPacket([
      post(6, "2026-05-12"),
      post(7, "2026-05-13"),
      post(8, "2026-05-14")
    ], {
      autoDuePressureChunk: true,
      today: new Date("2026-05-12T03:53:00Z")
    });

    expect(packet.markdown).toContain("Today (America/New_York): 2026-05-11");
    expect(packet.markdown).toContain("Source: due-pressure chunk (due_soon_next_2_days)");
    expect(packet.markdown).toContain("Chunk days: Day 6, Day 7");
  });

  it("allows live posting for an automatic chunk that is due today", () => {
    const packet = buildCompactPostingPacket([
      post(5, "2026-05-11"),
      post(6, "2026-05-12")
    ], {
      autoDuePressureChunk: true,
      today: new Date("2026-05-11T21:42:00-04:00")
    });

    expect(packet.postingAllowed).toBe(true);
    expect(packet.selectedCount).toBe(2);
    expect(packet.markdown).toContain("Mode: LIVE POSTING OK");
    expect(packet.markdown).toContain("Source: due-pressure chunk (behind_or_due_today)");
    expect(packet.markdown).toContain("Chunk days: Day 5");
    expect(packet.markdown).toContain("## Day 5 - 2026-05-11");
    expect(packet.markdown).not.toContain("## Day 6 - 2026-05-12");
  });
});
