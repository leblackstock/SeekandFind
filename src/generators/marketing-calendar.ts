import { DEFAULT_AGE_RANGE } from "../config.js";
import { writeTextFileSafe } from "../core/file-writer.js";
import { slugify } from "../core/naming.js";
import { runMarketingQa } from "../core/qa-engine.js";
import { appendSessionLog, updateProductionStatus } from "../core/progress-tracker.js";
import { GenerateResult, RunOptions } from "../types.js";

export interface MarketingCalendarInput {
  campaign: string;
  startDate: string;
  resumeDate?: string;
  completedCount: number;
  ageRange: string;
}

export interface MarketingCalendarSlot {
  order: number;
  relativeDay: string;
  scheduledDate: string;
  status: "locked-complete" | "ready-to-schedule";
  platform: string;
  theme: string;
  asset: string;
  caption: string;
  cta: string;
  notes: string;
}

interface CalendarPlanSlot {
  platform: string;
  theme: string;
  asset: string;
  caption: string;
  cta: string;
  notes: string;
}

const defaultCampaign = "Book 1 Prelaunch Rolling Campaign";

const approvedAssets = {
  meetEmber: "content/outputs/images/approved/book-1-no-blank-promo-batch-02-04-meet-ember-guide-recovered-2026-05-05T05-21-47-885Z.png",
  searchWithEmber: "content/outputs/images/approved/book-1-no-blank-promo-batch-02-01-search-with-ember-recovered-2026-05-05T05-21-26-346Z.png",
  screenFree: "content/outputs/images/approved/book-1-no-blank-promo-batch-02-03-screen-free-dragon-fun-recovered-2026-05-05T05-21-40-725Z.png",
  babyFlameLantern: "content/outputs/images/approved/book-1-no-blank-promo-batch-02-02-baby-flame-lantern-teaser-balanced-approved-recovered-2026-05-05T05-47-13-309Z-1.png",
  lanternWorkshop02: "content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-02-image-1-2026-05-05T04-51-23-244Z.png",
  lanternWorkshop03: "content/outputs/images/approved/book-1-lantern-maker-workshop-promo-batch-01-recovered-chat-03-image-1-2026-05-05T04-51-29-569Z.png",
  goldenWelcomeBell: "content/outputs/images/approved/book-1-mission-item-promo-batch-03-01-golden-welcome-bell-teaser-recovered-2026-05-05T19-29-49-208Z.png",
  fireflyFlowerCharmTall: "content/outputs/images/approved/book-1-mission-item-promo-batch-03-02-firefly-flower-charm-teaser-recovered-2026-05-05T19-29-49-208Z.png",
  dragonDoorKey: "content/outputs/images/approved/book-1-mission-item-promo-batch-03-03-dragon-door-key-teaser-retry-recovered-2026-05-05T19-37-48-357Z.png",
  sparkleMarketToken: "content/outputs/images/approved/book-1-mission-item-promo-batch-03-04-sparkle-market-token-teaser-recovered-2026-05-05T19-29-49-208Z.png"
};

const basePlan: CalendarPlanSlot[] = [
  {
    platform: "Pinterest primary, Instagram/Facebook secondary",
    theme: "Meet Ember",
    asset: approvedAssets.meetEmber,
    caption: "Meet Ember, a tiny baby dragon guide for a cozy seek-and-find adventure made for children ages 5-8.",
    cta: "Follow for more Ember sneak peeks.",
    notes: "Good first pinned or profile-intro post. Keep it as a character intro, not a cover claim."
  },
  {
    platform: "Pinterest",
    theme: "Screen-free activity idea",
    asset: approvedAssets.screenFree,
    caption: "A warm little search adventure for families who love screen-free kids' activity ideas and gentle fantasy worlds.",
    cta: "Save this for screen-free activity inspiration.",
    notes: "Use on activity-book and screen-free boards."
  },
  {
    platform: "Instagram/Facebook",
    theme: "Search with Ember",
    asset: approvedAssets.searchWithEmber,
    caption: "Lanterns, tiny treasures, and one curious baby dragon. Ember's world is built for little seekers.",
    cta: "Share with a little dragon fan.",
    notes: "Simple caption-only post. No added image text required."
  },
  {
    platform: "Pinterest",
    theme: "Baby Flame Lantern teaser",
    asset: approvedAssets.babyFlameLantern,
    caption: "Can you find the Baby Flame Lantern hiding in Ember's cozy festival world?",
    cta: "Save this tiny-treasure challenge.",
    notes: "Use the balanced approved regenerate. Avoid the failed muddy-sparkle version."
  },
  {
    platform: "Facebook",
    theme: "Lantern workshop warmth",
    asset: approvedAssets.lanternWorkshop02,
    caption: "The Lantern Maker's Workshop is full of tiny details for young eyes to explore.",
    cta: "Follow for the next Ember progress update.",
    notes: "Approved Batch 01 image with no blank-template issue."
  },
  {
    platform: "Instagram",
    theme: "Cozy search mood",
    asset: approvedAssets.lanternWorkshop03,
    caption: "A cozy dragon-village search scene, made to feel warm, gentle, and findable for young readers.",
    cta: "Save for later if you love hidden-object books.",
    notes: "Approved Batch 01 image with no blank-template issue."
  },
  {
    platform: "Pinterest",
    theme: "Golden Welcome Bell challenge",
    asset: approvedAssets.goldenWelcomeBell,
    caption: "Can your little seeker find the Golden Welcome Bell among the festival decorations?",
    cta: "Save the challenge and try it together.",
    notes: "Mission-item teaser. Keep copy playful and low-pressure."
  },
  {
    platform: "Instagram Story/Reel cover, YouTube Shorts cover, Pinterest Idea Pin",
    theme: "Firefly Flower Charm vertical teaser",
    asset: approvedAssets.fireflyFlowerCharmTall,
    caption: "Find the Firefly Flower Charm.",
    cta: "Tap, pause, and search.",
    notes: "Tall/mobile-first asset. Best for Story, Reel cover, Shorts cover, or Pinterest Idea Pin."
  },
  {
    platform: "Pinterest and Facebook",
    theme: "Dragon Door Key challenge",
    asset: approvedAssets.dragonDoorKey,
    caption: "A tiny Dragon Door Key is tucked somewhere in Ember's festival scene.",
    cta: "Can you spot it?",
    notes: "Mission-item teaser. Do not add answer marks or hint overlays."
  },
  {
    platform: "Pinterest",
    theme: "Sparkle Market Token challenge",
    asset: approvedAssets.sparkleMarketToken,
    caption: "Can you find the Sparkle Market Token among the cozy market treasures?",
    cta: "Save this for a quick seek-and-find break.",
    notes: "Mission-item teaser. Good for hidden-object and activity-book boards."
  },
  {
    platform: "Instagram/Facebook",
    theme: "Production progress note",
    asset: approvedAssets.meetEmber,
    caption: "The seek-page and story/list workflow is working, and Ember's first book world is getting closer one approved asset at a time.",
    cta: "Follow along as the book comes together.",
    notes: "Behind-the-scenes copy. Do not present promo art as an interior sample."
  },
  {
    platform: "Pinterest primary, Facebook secondary",
    theme: "Giftable cozy adventure",
    asset: approvedAssets.searchWithEmber,
    caption: "A cozy seek-and-find adventure for kids who love tiny treasures, gentle magic, and baby dragons.",
    cta: "Save for children's book gift ideas.",
    notes: "Gift-buyer angle. Keep links blank until a real store URL exists."
  }
];

function parseIsoDate(value: string, fieldName: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format.`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${fieldName} is not a real calendar date.`);
  }
  return date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return formatIsoDate(new Date());
}

export function normalizeMarketingCalendarInput(input: Partial<MarketingCalendarInput>): MarketingCalendarInput {
  const completedCount = input.completedCount ?? 0;
  if (!Number.isInteger(completedCount) || completedCount < 0 || completedCount > basePlan.length) {
    throw new Error(`completedCount must be an integer from 0 to ${basePlan.length}.`);
  }

  const normalized: MarketingCalendarInput = {
    campaign: input.campaign ?? defaultCampaign,
    startDate: input.startDate ?? todayIso(),
    resumeDate: input.resumeDate,
    completedCount,
    ageRange: input.ageRange ?? DEFAULT_AGE_RANGE
  };

  parseIsoDate(normalized.startDate, "startDate");
  if (normalized.resumeDate) parseIsoDate(normalized.resumeDate, "resumeDate");
  return normalized;
}

export function buildMovableMarketingCalendar(input: Partial<MarketingCalendarInput>): MarketingCalendarSlot[] {
  const normalized = normalizeMarketingCalendarInput(input);
  const start = parseIsoDate(normalized.startDate, "startDate");
  const resume = parseIsoDate(normalized.resumeDate ?? formatIsoDate(addDays(start, normalized.completedCount)), "resumeDate");

  return basePlan.map((slot, index) => {
    const completed = index < normalized.completedCount;
    const scheduledDate = completed
      ? formatIsoDate(addDays(start, index))
      : formatIsoDate(addDays(resume, index - normalized.completedCount));

    return {
      order: index + 1,
      relativeDay: `Day ${index + 1}`,
      scheduledDate,
      status: completed ? "locked-complete" : "ready-to-schedule",
      ...slot
    };
  });
}

function markdownTable(slots: MarketingCalendarSlot[]): string {
  const rows = slots.map((slot) => [
    slot.order,
    slot.relativeDay,
    slot.scheduledDate,
    slot.status,
    slot.platform,
    slot.theme,
    slot.asset,
    slot.caption,
    slot.cta,
    slot.notes
  ]);

  return [
    "| Order | Relative Day | Scheduled Date | Status | Platform | Theme | Asset | Caption | CTA | Notes |",
    "| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replaceAll("|", "\\|")).join(" | ")} |`)
  ].join("\n");
}

export function renderMarketingCalendar(input: Partial<MarketingCalendarInput>): string {
  const normalized = normalizeMarketingCalendarInput(input);
  const slots = buildMovableMarketingCalendar(normalized);
  const slug = slugify(normalized.campaign);

  return `# ${normalized.campaign}

Audience: children ages ${normalized.ageRange} and adult gift-buyers.
Strategy: Pinterest is the main discovery engine. Instagram, Facebook, Shorts/Reels covers, and Idea Pins reuse the same approved images and copy.
Calendar type: rolling queue. Dates can move; the order is the source of truth.

## Move Rules

If a day is missed, do not skip the post and do not compress two posts into one day. Keep completed posts locked, then slide unfinished posts forward from the next realistic work day.

Regenerate the full queue:

\`\`\`powershell
npm run generate:marketing-calendar -- -- --start-date ${normalized.startDate} --force
\`\`\`

Regenerate after some posts are already done:

\`\`\`powershell
npm run generate:marketing-calendar -- -- --start-date ${normalized.startDate} --completed-count <posted-count> --resume-date <next-work-day> --force
\`\`\`

Example: if the first 3 posts are already done and the next work day is 2026-05-09:

\`\`\`powershell
npm run generate:marketing-calendar -- -- --start-date ${normalized.startDate} --completed-count 3 --resume-date 2026-05-09 --force
\`\`\`

## Posting Queue

${markdownTable(slots)}

## Step Readiness Procedure

When Lauren asks about any campaign step, treat the question as a readiness check and output the useful posting information, not just a yes/no answer.

For the requested date or step:

1. Read the matching calendar row from this file or the JSON manifest.
2. Verify the approved asset file exists.
3. Check basic image facts when possible: file type, dimensions, and file size.
4. Confirm the row has platform, theme, caption, CTA, and notes.
5. Add practical posting copy for the platform: Pinterest title/description, Instagram/Facebook caption, alt text, hashtags, and link status.
6. Call out anything missing as a blocker or warning.
7. Keep prelaunch guardrails active: use follow/save/progress wording only until production status confirms stronger sales or listing language.

Readiness answer format:

- Readiness: ready, ready with warning, or blocked.
- Art: approved asset path plus verified image facts.
- Words: platform-specific title, caption/description, CTA, alt text, hashtags.
- Missing or warnings: link, dimensions, approval, copy, or status gaps.
- Next action: the exact thing Lauren should do next.

## Batch Rules

- Use only approved images listed in this calendar unless a later human approval tracker adds more.
- The Firefly Flower Charm image is tall/mobile-first; prioritize Story, Reel cover, Shorts cover, and Pinterest Idea Pin use.
- Do not add overlay text to assets that were approved as no-added-text images.
- For images with generated text, the text must be exact, readable, and approved before posting.
- Keep links blank until a real store or landing URL exists.

## Platform Defaults

Pinterest: publish the main image as a Pin with a curiosity title, a concise description, and no store link until the link is real.

Instagram: use caption-first posts, Reels covers, or Stories. Do not depend on Lauren adding image text.

Facebook: use warmer progress-note copy and family/gift-buyer framing.

Short video covers: use the tall Firefly Flower Charm asset first, then generate more vertical covers only after this queue needs them.

## CTA Bank

- Follow for more Ember sneak peeks.
- Save this tiny-treasure challenge.
- Share with a little dragon fan.
- Save for screen-free activity inspiration.
- Follow along as the book comes together.

## Publication Claim Guardrail

Do not say available now, buy now, order today, on Amazon, published, launch day, or inside the book unless production status confirms that wording. Fresh promo art is not a real cover, real interior sample, real listing preview, or real product mockup.

## Automation Notes

- Calendar slug: ${slug}
- Source behavior: order-first movable queue.
- Missed-day behavior: keep completed rows locked, then reschedule open rows from the next work day.
- Human approval remains required before any new image enters this calendar.
`;
}

export async function generateMarketingCalendar(input: Partial<MarketingCalendarInput>, options: RunOptions = {}): Promise<GenerateResult> {
  const normalized = normalizeMarketingCalendarInput(input);
  const calendar = renderMarketingCalendar(normalized);
  const slots = buildMovableMarketingCalendar(normalized);
  const qa = runMarketingQa(calendar);
  const slug = slugify(normalized.campaign);
  const basePath = `content/outputs/marketing/calendar/${slug}`;

  const manifest = {
    campaign: normalized.campaign,
    startDate: normalized.startDate,
    resumeDate: normalized.resumeDate ?? null,
    completedCount: normalized.completedCount,
    ageRange: normalized.ageRange,
    movableRule: "Completed slots stay locked; unfinished slots reschedule from resumeDate or the first open day.",
    slots
  };

  const files = [
    await writeTextFileSafe(`${basePath}.md`, calendar, options),
    await writeTextFileSafe(`${basePath}.json`, `${JSON.stringify(manifest, null, 2)}\n`, options)
  ];

  const result: GenerateResult = {
    ok: qa.passed,
    workflow: "marketing-calendar",
    summary: "Generated movable marketing campaign calendar.",
    files,
    warnings: qa.failures.concat(qa.warnings),
    nextStep: "Review the dated queue, then schedule or post the first ready-to-schedule item."
  };

  await updateProductionStatus(result, options.rootDir);
  const sessionFile = await appendSessionLog({
    workflow: "marketing-calendar",
    inputs: normalized,
    assumptions: [
      "Pinterest is the primary discovery channel.",
      "The book is not claimed as purchasable unless production status later confirms it.",
      "Approved promo images can be posted without Lauren adding overlay text."
    ],
    outputsCreated: files,
    warnings: result.warnings,
    qaResult: qa.passed ? "PASS" : "FAIL",
    nextManualStep: result.nextStep
  }, options.rootDir);
  result.files.push(sessionFile, "content/workflows/book-01/production-status.md");
  return result;
}
