export interface UrlGuardResult {
  ok: boolean;
  errors: string[];
}

const placeholderPatterns = [
  /<[^>]*url[^>]*>/i,
  /\bexample\b/i,
  /\bplaceholder\b/i,
  /\bfake\b/i,
  /\btbd\b/i,
  /\bTODO\b/i
];

function expectedHostPattern(platform: string): RegExp | null {
  switch (platform) {
    case "YouTube Shorts":
      return /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i;
    case "TikTok":
      return /(^|\.)tiktok\.com$/i;
    case "Instagram Reels":
    case "Instagram":
      return /(^|\.)instagram\.com$/i;
    case "Facebook Reels":
    case "Facebook":
      return /(^|\.)facebook\.com$|(^|\.)fb\.com$/i;
    case "Pinterest Video Pin":
    case "Pinterest":
      return /(^|\.)pinterest\.com$/i;
    default:
      return null;
  }
}

function expectedPathPattern(platform: string): RegExp | null {
  switch (platform) {
    case "YouTube Shorts":
      return /\/shorts\/[A-Za-z0-9_-]+|\/watch\?v=[A-Za-z0-9_-]+/i;
    case "TikTok":
      return /\/@[^/]+\/video\/\d+/i;
    case "Instagram Reels":
      return /\/reel\/[^/]+/i;
    case "Facebook Reels":
      return /\/reel\/\d+|\/share\/r\//i;
    case "Pinterest Video Pin":
    case "Pinterest":
      return /\/pin\/\d+/i;
    default:
      return null;
  }
}

export function validateProductionUrl(platform: string, url: string): UrlGuardResult {
  const errors: string[] = [];
  const trimmed = url.trim();

  if (!trimmed) {
    return { ok: false, errors: [`${platform} URL is empty.`] };
  }

  for (const pattern of placeholderPatterns) {
    if (pattern.test(trimmed)) {
      errors.push(`${platform} URL looks like a placeholder/example URL: ${trimmed}`);
      break;
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, errors: [`${platform} URL is not a valid absolute URL: ${trimmed}`] };
  }

  if (parsed.protocol !== "https:") errors.push(`${platform} URL must use https.`);
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(parsed.hostname)) {
    errors.push(`${platform} URL must not be a local URL.`);
  }

  const hostPattern = expectedHostPattern(platform);
  if (hostPattern && !hostPattern.test(parsed.hostname)) {
    errors.push(`${platform} URL host does not match expected platform: ${parsed.hostname}`);
  }

  const pathPattern = expectedPathPattern(platform);
  if (pathPattern && !pathPattern.test(`${parsed.pathname}${parsed.search}`)) {
    errors.push(`${platform} URL path does not look like the expected public post URL.`);
  }

  return { ok: errors.length === 0, errors };
}

export function validateProductionUrls(urls: Array<{ platform: string; url: string }>): UrlGuardResult {
  const errors = urls.flatMap((entry) => validateProductionUrl(entry.platform, entry.url).errors);
  return { ok: errors.length === 0, errors };
}
