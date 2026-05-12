export const requiredSocialHashtags = [
  "#SeekAndFind",
  "#KidsActivityBook",
  "#ChildrensBooks",
  "#ScreenFreeFun",
  "#BabyDragon",
  "#HiddenObjectBook",
  "#KidsBooks",
  "#FamilyReading",
  "#EmberDragonBooks",
  "#dragonbooks",
  "#dragonbooksforkids"
];

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function captionText(captionSource: unknown): string {
  if (typeof captionSource === "string") return captionSource.trim();
  if (!captionSource || typeof captionSource !== "object") return "";

  const source = captionSource as Record<string, unknown>;
  return [source.text, source.cta]
    .map((value) => asString(value))
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

export function normalizeHashtags(value: unknown): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawTag of asStringArray(value)) {
    const tag = rawTag.trim();
    if (!tag.startsWith("#")) continue;

    const normalized = tag.toLowerCase();
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    tags.push(tag);
  }

  return tags;
}

export function buildPostingCaption(captionSource: unknown, requiredHashtags: unknown): string {
  const base = captionText(captionSource);
  const baseLower = base.toLowerCase();
  const hashtagLine = normalizeHashtags(requiredHashtags)
    .filter((tag) => !baseLower.includes(tag.toLowerCase()))
    .join(" ");

  return [base, hashtagLine]
    .filter((value) => value.trim().length > 0)
    .join("\n\n");
}

export function firstCaptionLine(captionSource: unknown): string {
  return captionText(captionSource).split(/\r?\n/).find((line) => line.trim()) ?? "";
}
