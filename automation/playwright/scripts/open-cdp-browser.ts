import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { durableCdpBrowser } from "../../../src/core/cdp-browser.js";

const defaultPort = Number(new URL(durableCdpBrowser.defaultUrl).port);
const defaultProfileDir = durableCdpBrowser.defaultProfileDir;
const defaultUrl = "https://www.pinterest.com/emberdragonbooks/";
const defaultWaitMs = 15000;

interface CliOptions {
  browserPath?: string;
  openUrl?: string;
  port: number;
  profileDir: string;
  printEnv: boolean;
  statusOnly: boolean;
  waitMs: number;
}

interface CdpVersion {
  Browser?: string;
  "Protocol-Version"?: string;
  webSocketDebuggerUrl?: string;
}

function optionValue(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1];
  return undefined;
}

function envOption(name: string): string | undefined {
  const envName = `npm_config_${name.replace(/-/g, "_")}`;
  const value = process.env[envName];
  return value && value !== "false" ? value : undefined;
}

function hasFlag(args: string[], name: string): boolean {
  const envValue = envOption(name);
  return args.includes(`--${name}`) || envValue === "true" || envValue === "1";
}

function cliOption(args: string[], name: string): string | undefined {
  return optionValue(args, name) ?? envOption(name);
}

function parsePort(value: string | undefined): number {
  if (!value) return defaultPort;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid --port value: ${value}`);
  }
  return parsed;
}

function parseWaitMs(value: string | undefined): number {
  if (!value) return defaultWaitMs;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid --wait-ms value: ${value}`);
  }
  return parsed;
}

function parseArgs(args: string[]): CliOptions {
  const cleanArgs = args.filter((arg) => arg !== "--");
  return {
    browserPath: cliOption(cleanArgs, "browser-path") ?? process.env.EMBER_CDP_BROWSER_PATH,
    openUrl: hasFlag(cleanArgs, "no-open-url") ? undefined : cliOption(cleanArgs, "url") ?? defaultUrl,
    port: parsePort(cliOption(cleanArgs, "port") ?? process.env.EMBER_CDP_PORT),
    profileDir: cliOption(cleanArgs, "profile-dir") ?? process.env.EMBER_CDP_PROFILE_DIR ?? defaultProfileDir,
    printEnv: hasFlag(cleanArgs, "print-env"),
    statusOnly: hasFlag(cleanArgs, "status"),
    waitMs: parseWaitMs(cliOption(cleanArgs, "wait-ms"))
  };
}

function endpoint(port: number): string {
  return `http://127.0.0.1:${port}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

async function cdpVersion(port: number): Promise<CdpVersion | null> {
  try {
    return await fetchJson<CdpVersion>(`${endpoint(port)}/json/version`);
  } catch {
    return null;
  }
}

function isChromeCdp(version: CdpVersion | null): boolean {
  return typeof version?.Browser === "string" && /Chrome|Chromium|HeadlessChrome|Edg/i.test(version.Browser);
}

async function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port, timeout: 750 });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

function candidateChromePaths(): string[] {
  if (process.platform === "win32") {
    const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
    const localAppData = process.env.LOCALAPPDATA;
    return [
      path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
      localAppData ? path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe") : "",
      path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe")
    ].filter(Boolean);
  }

  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    ];
  }

  return ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"];
}

function resolveBrowserPath(explicitPath?: string): string {
  if (explicitPath) {
    if (!existsSync(explicitPath) && process.platform === "win32") {
      throw new Error(`Browser path does not exist: ${explicitPath}`);
    }
    return explicitPath;
  }

  const found = candidateChromePaths().find((candidate) => {
    if (!candidate) return false;
    if (candidate.includes(path.sep)) return existsSync(candidate);
    return true;
  });
  if (!found) {
    throw new Error("Could not find Chrome, Chromium, or Edge. Pass --browser-path.");
  }
  return found;
}

async function openUrlInCdp(port: number, url: string): Promise<void> {
  const encoded = encodeURIComponent(url);
  try {
    await fetchJson(`${endpoint(port)}/json/new?${encoded}`, { method: "PUT" });
  } catch {
    await fetchJson(`${endpoint(port)}/json/new?${encoded}`);
  }
}

async function waitForChromeCdp(port: number, waitMs: number): Promise<CdpVersion | null> {
  const deadline = Date.now() + waitMs;
  do {
    const version = await cdpVersion(port);
    if (isChromeCdp(version)) return version;
    await new Promise((resolve) => setTimeout(resolve, 500));
  } while (Date.now() < deadline);
  return null;
}

async function readDevToolsActivePort(profileDir: string): Promise<string | null> {
  const filePath = path.join(profileDir, "DevToolsActivePort");
  try {
    const text = await readFile(filePath, "utf8");
    return text.trim();
  } catch {
    return null;
  }
}

async function writeRunLog(options: CliOptions, result: Record<string, unknown>): Promise<void> {
  const logDir = path.resolve("content/outputs/session-logs/cdp-browser");
  await mkdir(logDir, { recursive: true });
  const payload = {
    timestamp: new Date().toISOString(),
    command: "browser:open",
    cdpUrl: endpoint(options.port),
    profileDir: path.resolve(options.profileDir),
    ...result
  };
  await writeFile(path.join(logDir, "last-open-browser.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function printConnectionHints(port: number, profileDir: string): void {
  const cdpUrl = endpoint(port);
  console.log(`CDP URL: ${cdpUrl}`);
  console.log(`Profile: ${path.resolve(profileDir)}`);
  console.log(`PowerShell env for social scripts: $env:SOCIAL_CDP_URL="${cdpUrl}"`);
  console.log(`PowerShell env for Pinterest scripts: $env:PINTEREST_CDP_URL="${cdpUrl}"`);
  console.log(`PowerShell env for Meta scripts: $env:META_CDP_URL="${cdpUrl}"`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const profileDir = path.resolve(options.profileDir);
  await mkdir(profileDir, { recursive: true });

  const existingVersion = await cdpVersion(options.port);
  if (isChromeCdp(existingVersion)) {
    const browserName = existingVersion?.Browser ?? "Chrome";
    if (options.openUrl && !options.statusOnly) await openUrlInCdp(options.port, options.openUrl);
    console.log(`Reconnected to existing Chrome CDP endpoint at ${endpoint(options.port)}.`);
    console.log(`Browser: ${browserName}`);
    printConnectionHints(options.port, profileDir);
    await writeRunLog(options, { ok: true, action: "reconnected", browser: browserName });
    return;
  }

  if (options.statusOnly) {
    const activePort = await readDevToolsActivePort(profileDir);
    console.log(`No Chrome CDP endpoint found at ${endpoint(options.port)}.`);
    if (existingVersion?.Browser) console.log(`Port responded, but not as Chrome: ${existingVersion.Browser}`);
    if (activePort) console.log(`DevToolsActivePort in profile:\n${activePort}`);
    await writeRunLog(options, {
      ok: false,
      action: "status",
      activePort,
      message: "No Chrome CDP endpoint found at configured port."
    });
    return;
  }

  if (await isPortOpen(options.port)) {
    throw new Error(`Port ${options.port} is already open but is not a Chrome CDP endpoint. Use --port with a free port.`);
  }

  const browserPath = resolveBrowserPath(options.browserPath);
  const args = [
    `--remote-debugging-port=${options.port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check"
  ];
  if (options.openUrl) args.push(options.openUrl);

  const child = spawn(browserPath, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false
  });
  child.unref();

  const launchedVersion = await waitForChromeCdp(options.port, options.waitMs);
  if (!launchedVersion) {
    const activePort = await readDevToolsActivePort(profileDir);
    await writeRunLog(options, {
      ok: false,
      action: "launched",
      browserPath,
      activePort,
      message: "Browser launched but CDP endpoint did not become ready before timeout."
    });
    throw new Error(`Started browser, but ${endpoint(options.port)}/json/version did not become ready within ${options.waitMs}ms.`);
  }

  console.log(`Opened durable CDP browser at ${endpoint(options.port)}.`);
  console.log(`Browser: ${launchedVersion.Browser}`);
  printConnectionHints(options.port, profileDir);
  if (options.printEnv) {
    console.log("");
    console.log(`$env:SOCIAL_CDP_URL="${endpoint(options.port)}"`);
    console.log(`$env:PINTEREST_CDP_URL="${endpoint(options.port)}"`);
    console.log(`$env:META_CDP_URL="${endpoint(options.port)}"`);
  }
  await writeRunLog(options, { ok: true, action: "launched", browser: launchedVersion.Browser, browserPath });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  console.error(`Usage: npm run browser:open -- --url=${defaultUrl}`);
  process.exitCode = 1;
});
