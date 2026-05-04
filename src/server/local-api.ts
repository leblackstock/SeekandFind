import express, { Request, Response } from "express";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { localApiPort, repoRoot } from "../config.js";
import { runWorkflow } from "../core/skill-runner.js";
import { generateMarketingPack } from "../generators/marketing-pack.js";
import { runKdpQaGenerator } from "../generators/kdp-qa.js";
import { generateSeekPage } from "../generators/seek-page.js";
import { generateStoryboard } from "../generators/seedance-storyboard.js";
import { generateTitlePage } from "../generators/title-page.js";
import { WorkflowName } from "../types.js";

const seekSchema = z.object({
  bookTitle: z.string().optional(),
  pageNumber: z.number().int().positive(),
  location: z.string().min(1),
  missionItem: z.string().min(1),
  ageRange: z.string().optional(),
  style: z.string().optional(),
  outputMode: z.string().optional(),
  force: z.boolean().optional()
});

const titleSchema = z.object({
  bookTitle: z.string().optional(),
  theme: z.string().optional(),
  ageRange: z.string().optional(),
  style: z.string().optional(),
  force: z.boolean().optional()
});

const storyboardSchema = z.object({
  clipLength: z.string().optional(),
  goal: z.string().optional(),
  scene: z.string().optional(),
  ageRange: z.string().optional(),
  force: z.boolean().optional()
});

const marketingSchema = z.object({
  platforms: z.array(z.string()).optional(),
  asset: z.string().optional(),
  goal: z.string().optional(),
  ageRange: z.string().optional(),
  force: z.boolean().optional()
});

const kdpSchema = z.object({
  file: z.string().optional(),
  text: z.string().optional(),
  force: z.boolean().optional()
});

const workflowSchema = z.object({
  workflow: z.enum(["seek-page", "title-page", "storyboard", "marketing-pack", "kdp-qa"]),
  input: z.unknown().default({}),
  force: z.boolean().optional()
});

type AsyncHandler = (request: Request, response: Response) => Promise<void>;

function route(handler: AsyncHandler): AsyncHandler {
  return async (request, response) => {
    try {
      await handler(request, response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes("already exists") ? 409 : 400;
      response.status(status).json({ ok: false, error: message });
    }
  };
}

export function createApp(options: { rootDir?: string } = {}) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "ember-content-studio", time: new Date().toISOString() });
  });

  app.post("/generate/seek-page", route(async (request, response) => {
    const parsed = seekSchema.parse(request.body);
    response.json(await generateSeekPage(parsed, { rootDir: options.rootDir, force: parsed.force }));
  }));

  app.post("/generate/title-page", route(async (request, response) => {
    const parsed = titleSchema.parse(request.body);
    response.json(await generateTitlePage(parsed, { rootDir: options.rootDir, force: parsed.force }));
  }));

  app.post("/generate/storyboard", route(async (request, response) => {
    const parsed = storyboardSchema.parse(request.body);
    response.json(await generateStoryboard(parsed, { rootDir: options.rootDir, force: parsed.force }));
  }));

  app.post("/generate/marketing-pack", route(async (request, response) => {
    const parsed = marketingSchema.parse(request.body);
    response.json(await generateMarketingPack(parsed, { rootDir: options.rootDir, force: parsed.force }));
  }));

  app.post("/qa/kdp", route(async (request, response) => {
    const parsed = kdpSchema.parse(request.body);
    response.json(await runKdpQaGenerator(parsed, { rootDir: options.rootDir, force: parsed.force }));
  }));

  app.post("/workflow/run", route(async (request, response) => {
    const parsed = workflowSchema.parse(request.body);
    response.json(await runWorkflow(parsed.workflow as WorkflowName, parsed.input, { rootDir: options.rootDir, force: parsed.force }));
  }));

  app.get("/workflow/status", route(async (_request, response) => {
    const root = repoRoot(options.rootDir);
    const statusFile = join(root, "content/workflows/book-01/production-status.md");
    response.json({
      ok: true,
      file: "content/workflows/book-01/production-status.md",
      content: existsSync(statusFile) ? await readFile(statusFile, "utf8") : ""
    });
  }));

  return app;
}

if (process.argv[1]?.endsWith("local-api.ts")) {
  const port = localApiPort();
  createApp().listen(port, () => {
    console.log(`Ember Content Studio API listening at http://localhost:${port}`);
  });
}
