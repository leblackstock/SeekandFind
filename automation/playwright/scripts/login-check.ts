import { chromium } from "@playwright/test";
import { isSensitiveBoundary, resolveToolTarget } from "../../../src/integrations/playwright-client.js";

function option(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const tool = option("tool", "seedance")!;
const target = resolveToolTarget(tool);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(target.url, { waitUntil: "domcontentloaded" });
const text = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
await browser.close();

if (isSensitiveBoundary(text) || /log in|sign in/i.test(text)) {
  console.log(JSON.stringify({ ok: false, tool: target.name, status: "manual_login_or_sensitive_boundary" }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, tool: target.name, status: "no_obvious_login_boundary" }, null, 2));
}
