import { describe, expect, it } from "vitest";
import { buildMovableMarketingCalendar, renderMarketingCalendar } from "../src/generators/marketing-calendar.js";

describe("marketing calendar", () => {
  it("moves the whole queue when the start date changes", () => {
    const first = buildMovableMarketingCalendar({ startDate: "2026-05-05" });
    const moved = buildMovableMarketingCalendar({ startDate: "2026-05-07" });

    expect(first[0].scheduledDate).toBe("2026-05-05");
    expect(first[3].scheduledDate).toBe("2026-05-08");
    expect(moved[0].scheduledDate).toBe("2026-05-07");
    expect(moved[3].scheduledDate).toBe("2026-05-10");
  });

  it("keeps completed posts locked and slides unfinished posts to the resume date", () => {
    const slots = buildMovableMarketingCalendar({
      startDate: "2026-05-05",
      completedCount: 3,
      resumeDate: "2026-05-10"
    });

    expect(slots[0]).toMatchObject({ scheduledDate: "2026-05-05", status: "locked-complete" });
    expect(slots[2]).toMatchObject({ scheduledDate: "2026-05-07", status: "locked-complete" });
    expect(slots[3]).toMatchObject({ scheduledDate: "2026-05-10", status: "ready-to-schedule" });
    expect(slots[4]).toMatchObject({ scheduledDate: "2026-05-11", status: "ready-to-schedule" });
  });

  it("marks the tall approved image for mobile-first use", () => {
    const slots = buildMovableMarketingCalendar({ startDate: "2026-05-05" });
    const tallSlot = slots.find((slot) => slot.theme.includes("Firefly Flower Charm"));

    expect(tallSlot?.platform).toContain("Instagram Story/Reel cover");
    expect(tallSlot?.notes).toContain("Tall/mobile-first asset");
  });

  it("renders posting guardrails without confirmed purchase claims", () => {
    const text = renderMarketingCalendar({ startDate: "2026-05-05" });
    const claimSurface = text.replace(/## Publication Claim Guardrail[\s\S]*/i, "");

    expect(text).toContain("rolling queue");
    expect(text).toContain("## Step Readiness Procedure");
    expect(text).toContain("Readiness: ready, ready with warning, or blocked.");
    expect(text).toContain("Do not say available now");
    expect(claimSurface).not.toMatch(/\bavailable now\b/i);
    expect(claimSurface).not.toMatch(/\bbuy now\b/i);
    expect(claimSurface).not.toMatch(/\border today\b/i);
  });
});
