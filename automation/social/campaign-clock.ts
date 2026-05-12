export const campaignTimeZone = "America/New_York";

const campaignDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: campaignTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function partsFor(date: Date): Record<string, string> {
  return Object.fromEntries(campaignDateFormatter.formatToParts(date)
    .map((part) => [part.type, part.value]));
}

export function campaignDateKey(date = new Date()): string {
  const parts = partsFor(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function dateFromCampaignKey(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Expected campaign date as YYYY-MM-DD, received: ${value}`);
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function addCampaignDaysKey(date: Date, days: number): string {
  const parts = partsFor(date);
  const shifted = new Date(Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day) + days,
    12,
    0,
    0
  ));
  return campaignDateKey(shifted);
}
