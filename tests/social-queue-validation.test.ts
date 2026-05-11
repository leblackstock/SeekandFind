import { describe, expect, it } from "vitest";
import { validateSocialQueue } from "../automation/social/validate-queue.js";

const requiredHashtags = ["#dragonbooks", "#dragonbooksforkids"];

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

describe("canonical social queue requirements", () => {
  it("requires Pinterest still Pins, Pinterest Video Pins, and dragon hashtags for open hashtag surfaces", async () => {
    const result = await validateSocialQueue();

    expect(result.errors).toEqual([]);
    for (const post of result.posts) {
      const tasks = Array.isArray(post.platform_tasks) ? post.platform_tasks : [];
      const pinterestTasks = tasks.filter((task) => task.platform === "Pinterest");
      const shortVideoTask = tasks.find((task) => task.platform === "Short Video");

      expect(pinterestTasks, `Day ${String(post.campaign_day)} Pinterest still Pin tasks`).toHaveLength(3);
      expect(asStringArray(shortVideoTask?.required_video_surfaces)).toContain("Pinterest Video Pin");

      for (const task of tasks) {
        if (
          (task.platform === "Pinterest" || task.platform === "Instagram" || task.platform === "Short Video") &&
          (task.status === "ready" || task.status === "needs-video-export")
        ) {
          expect(asStringArray(task.required_hashtags), String(task.idempotency_key)).toEqual(
            expect.arrayContaining(requiredHashtags)
          );
        }
      }
    }
  });
});
