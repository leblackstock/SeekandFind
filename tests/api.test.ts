import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/server/local-api.js";

let root: string;

describe("local api", () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ember-api-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns health", async () => {
    const response = await request(createApp({ rootDir: root })).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("generates seek-page outputs", async () => {
    const response = await request(createApp({ rootDir: root }))
      .post("/generate/seek-page")
      .send({ pageNumber: 6, location: "Cloud Bakery", missionItem: "tiny frosted bell" });

    expect(response.status).toBe(200);
    expect(response.body.workflow).toBe("seek-page");
    expect(response.body.files).toContain("content/outputs/prompts/book01-page006-cloud-bakery-image-prompt.md");
  });
});
