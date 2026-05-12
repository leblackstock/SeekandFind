export const durableCdpBrowser = {
  defaultUrl: "http://127.0.0.1:9222",
  defaultProfileDir: ".cache/ember-cdp-browser-profile",
  openCommand: "npm run browser:open"
} as const;

export function cdpUrlFromEnv(envNames: string[] = [], fallback = durableCdpBrowser.defaultUrl): string {
  for (const name of envNames) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return fallback;
}

export function optionalCdpUrlFromEnv(envNames: string[] = []): string | undefined {
  for (const name of envNames) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

export function cdpSetupHint(cdpUrl: string = durableCdpBrowser.defaultUrl): string {
  return `Run ${durableCdpBrowser.openCommand} first, then reconnect to ${cdpUrl}.`;
}
