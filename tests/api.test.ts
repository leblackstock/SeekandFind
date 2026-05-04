import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/server/local-api.js";

let root: string;

describe("local api", () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ember-api-"));
    await mkdir(join(root, "content/workflows/book-01"), { recursive: true });
    await writeFile(join(root, "content/workflows/book-01/page-map.md"), [
      "| Spread | Story/List Page | Seek Page | Working Location | Mission Item |",
      "| ---: | ---: | ---: | --- | --- |",
      "| 4 | 8 | 9 | Lantern Maker's Workshop | Baby Flame Lantern |"
    ].join("\n"), "utf8");
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
      .send({ pageNumber: 9, location: "Lantern Maker's Workshop", missionItem: "Baby Flame Lantern" });

    expect(response.status).toBe(200);
    expect(response.body.workflow).toBe("seek-page");
    expect(response.body.files).toContain("content/outputs/prompts/book01-page009-lantern-maker-s-workshop-image-prompt.md");
  });
});
