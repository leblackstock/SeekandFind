import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

function option(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const name = option("name", "browser-check")!.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
const url = option("url", "http://localhost:3333/health")!;
const outputDir = "content/outputs/session-logs/screenshots";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(url, { waitUntil: "domcontentloaded" });
const outputPath = join(outputDir, `${new Date().toISOString().slice(0, 10)}-${name}.png`);
await page.screenshot({ path: outputPath, fullPage: true });
await browser.close();
console.log(outputPath);
