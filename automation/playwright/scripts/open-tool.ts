import { chromium } from "@playwright/test";
import { resolveToolTarget } from "../../../src/integrations/playwright-client.js";

function option(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const tool = option("tool", "seedance")!;
const target = resolveToolTarget(tool);
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto(target.url, { waitUntil: "domcontentloaded" });
console.log(`Opened ${target.name} at ${target.url}. Review manually. Close the browser when finished.`);
