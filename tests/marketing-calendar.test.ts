import { describe, expect, it } from "vitest";
import {
  buildLaunchPlan,
  buildMovableMarketingCalendar,
  buildPlatformTasks,
  renderFullLaunchPlan,
  renderMarketingCalendar,
  renderReusableLaunchWorkflow
} from "../src/generators/marketing-calendar.js";

describe("marketing calendar", () => {
  it("moves the whole queue when the start date changes", () => {
    const first = buildMovableMarketingCalendar({ startDate: "2026-05-05" });
    const moved = buildMovableMarketingCalendar({ startDate: "2026-05-07" });

    expect(first[0].scheduledDate).toBe("2026-05-05");
    expect(first[3].scheduledDate).toBe("2026-05-08");
    expect(moved[0].scheduledDate).toBe("2026-05-07");
    expect(moved[3].scheduledDate).toBe("2026-05-10");
  });

  it("keeps fully completed campaign days locked and slides unfinished days to the resume date", () => {
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

  it("marks a day with a posted platform task as in-progress, not complete", () => {
    const slots = buildMovableMarketingCalendar({ startDate: "2026-05-05", completedCount: 0 });

    expect(slots[0]).toMatchObject({ scheduledDate: "2026-05-05", status: "in-progress" });
    expect(slots[1]).toMatchObject({ scheduledDate: "2026-05-06", status: "ready-to-schedule" });
  });

  it("marks the tall approved image for mobile-first use", () => {
    const slots = buildMovableMarketingCalendar({ startDate: "2026-05-05" });
    const tallSlot = slots.find((slot) => slot.theme.includes("Firefly Flower Charm"));

    expect(tallSlot?.platform).toContain("Instagram Story/Reel cover");
    expect(tallSlot?.notes).toContain("Tall/mobile-first asset");
  });

  it("builds a platform task schedule from the daily queue", () => {
    const slots = buildMovableMarketingCalendar({ startDate: "2026-05-05", completedCount: 0 });
    const tasks = buildPlatformTasks(slots);
    const dayOnePinterestTasks = tasks.filter((task) => task.dayOrder === 1 && task.platform === "Pinterest");
    const dayOnePrimaryPinterest = dayOnePinterestTasks.find((task) => task.placement === "Dragon Books for Kids");
    const dayTwoPinterestTasks = tasks.filter((task) => task.dayOrder === 2 && task.platform === "Pinterest");
    const dayTwoPrimaryPinterest = dayTwoPinterestTasks.find((task) => task.placement === "Screen-Free Activities for Kids");
    const dayTwoSecondaryPinterest = dayTwoPinterestTasks.find((task) => task.placement === "Children’s Activity Books");
    const dayTwoThirdPinterest = dayTwoPinterestTasks.find((task) => task.placement === "Gift Ideas for Kids Ages 5–8");
    const fireflyVideo = tasks.find((task) => task.theme.includes("Firefly Flower Charm") && task.platform === "Short Video");

    expect(tasks).toHaveLength(slots.length * 6);
    expect(dayOnePinterestTasks).toHaveLength(3);
    expect(dayOnePinterestTasks.every((task) => task.status === "posted")).toBe(true);
    expect(dayOnePrimaryPinterest).toMatchObject({
      status: "posted",
      placement: "Dragon Books for Kids",
      link: "https://www.pinterest.com/pin/1148417973750217999"
    });
    expect(dayTwoPrimaryPinterest).toMatchObject({
      status: "ready",
      placement: "Screen-Free Activities for Kids"
    });
    expect(dayTwoSecondaryPinterest).toMatchObject({
      status: "ready",
      placement: "Children’s Activity Books",
      theme: "Screen-free activity idea Activity Book Sneak Peek"
    });
    expect(dayTwoThirdPinterest).toMatchObject({
      status: "ready",
      placement: "Gift Ideas for Kids Ages 5–8",
      theme: "Screen-free activity idea Gift Idea for Kids Ages 5-8"
    });
    expect(dayOnePinterestTasks.map((task) => task.theme).join(" ")).not.toContain("Pinterest angle");
    expect(dayTwoSecondaryPinterest?.copy).not.toBe(dayTwoPrimaryPinterest?.copy);
    expect(dayTwoThirdPinterest?.copy).not.toBe(dayTwoPrimaryPinterest?.copy);
    expect(dayTwoThirdPinterest?.copy).not.toBe(dayTwoSecondaryPinterest?.copy);
    expect(fireflyVideo).toMatchObject({
      status: "ready",
      placement: "TikTok, YouTube Shorts, Instagram Reels, Facebook Reels",
      notes: "Tall asset is ready for mobile-first Seedance storyboard/export use."
    });
  });

  it("builds the full launch plan layer above the daily calendar", () => {
    const slots = buildMovableMarketingCalendar({ startDate: "2026-05-05", completedCount: 0 });
    const tasks = buildPlatformTasks(slots);
    const plan = buildLaunchPlan(slots, tasks);
    const text = renderFullLaunchPlan({ startDate: "2026-05-05", completedCount: 0 });

    expect(plan.platformSetups.map((item) => item.platform)).toEqual([
      "Pinterest",
      "Instagram",
      "Facebook",
      "YouTube Shorts",
      "TikTok",
      "Landing / Store Link"
    ]);
    expect(plan.structures.some((item) => item.name === "Screen-Free Activities for Kids")).toBe(true);
    expect(plan.reusePlan.some((item) => item.source === "Mission-item teaser asset")).toBe(true);
    expect(text).toContain("## Platform Setup And Checking");
    expect(text).toContain("## Boards, Playlists, Highlights, And Collections");
    expect(text).toContain("## Reusable Next-Book Inputs");
    expect(text).toContain("three distinct Pinterest Pins");
    expect(text).toContain("Seedance image-to-video export");
    expect(text).toContain("Day 1: Meet Ember");
  });

  it("renders a reusable next-book workflow template", () => {
    const text = renderReusableLaunchWorkflow();

    expect(text).toContain("# Reusable Ember Full Launch Workflow");
    expect(text).toContain("## Required Inputs");
    expect(text).toContain("## Generation Steps");
    expect(text).toContain("three distinct Pins per campaign day");
    expect(text).toContain("Seedance storyboard exports");
    expect(text).toContain("Do not reuse Book 1-specific Sparkleflame language");
  });

  it("renders posting guardrails without confirmed purchase claims", () => {
    const text = renderMarketingCalendar({ startDate: "2026-05-05" });
    const claimSurface = text.replace(/## Publication Claim Guardrail[\s\S]*/i, "");

    expect(text).toContain("rolling launch plan");
    expect(text).toContain("## Platform Readiness");
    expect(text).toContain("## Cross-Platform Launch Schedule");
    expect(text).toContain("## Step Readiness Procedure");
    expect(text).toContain("Readiness: ready, ready with warning, or blocked.");
    expect(text).toContain("Seedance image-to-video clips");
    expect(text).toContain("Do not say available now");
    expect(claimSurface).not.toMatch(/\bavailable now\b/i);
    expect(claimSurface).not.toMatch(/\bbuy now\b/i);
    expect(claimSurface).not.toMatch(/\border today\b/i);
  });
});
