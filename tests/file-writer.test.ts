import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeTextFileSafe } from "../src/core/file-writer.js";

let root: string;

describe("file writer", () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ember-content-studio-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("writes UTF-8 text files", async () => {
    const relative = await writeTextFileSafe("out/test.md", "Ember's scarf stays blue-teal.", { rootDir: root });
    expect(relative).toBe("out/test.md");
    await expect(readFile(join(root, relative), "utf8")).resolves.toContain("blue-teal");
  });

  it("refuses overwrite without force", async () => {
    await writeTextFileSafe("out/test.md", "one", { rootDir: root });
    await expect(writeTextFileSafe("out/test.md", "two", { rootDir: root })).rejects.toThrow(/already exists/);
  });

  it("overwrites with force", async () => {
    await writeTextFileSafe("out/test.md", "one", { rootDir: root });
    await writeTextFileSafe("out/test.md", "two", { rootDir: root, force: true });
    await expect(readFile(join(root, "out/test.md"), "utf8")).resolves.toBe("two");
  });
});
