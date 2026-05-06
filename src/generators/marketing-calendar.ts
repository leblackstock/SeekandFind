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
  status: "locked-complete" | "in-progress" | "ready-to-schedule";
  platform: string;
  theme: string;
  asset: string;
  caption: string;
  cta: string;
  notes: string;
}

export interface MarketingPlatformTask {
  dayOrder: number;
  scheduledDate: string;
  status: "posted" | "ready" | "needs-account" | "needs-video-export" | "blocked";
  platform: string;
  placement: string;
  theme: string;
  asset: string;
  copy: string;
  cta: string;
  link: string;
  notes: string;
}

export interface ExternalSourceCheck {
  platform: string;
  source: string;
  useInPlan: string;
}

export interface LaunchPlatformSetup {
  platform: string;
  currentState: string;
  setupChecks: string[];
  structureToCreate: string;
  dailyCheck: string;
  blocker: string;
}

export interface LaunchStructure {
  platform: string;
  type: string;
  name: string;
  status: "active" | "create-or-check" | "create-when-account-ready" | "account-gated" | "blocked";
  use: string;
  nextAction: string;
}

export interface ContentReusePlan {
  source: string;
  reuseSurfaces: string;
  creationNeeded: string;
  guardrail: string;
}

export interface ContentCreationItem {
  priority: string;
  item: string;
  output: string;
  ownerAction: string;
}

export interface LaunchPlan {
  sourceChecks: ExternalSourceCheck[];
  platformSetups: LaunchPlatformSetup[];
  structures: LaunchStructure[];
  reusePlan: ContentReusePlan[];
  creationBacklog: ContentCreationItem[];
  dailyOperatingSchedule: string[];
  weeklyReview: string[];
  phaseGates: string[];
}

interface PostedPlatformTask {
  dayOrder: number;
  platform: string;
  placement: string;
  theme?: string;
  link: string;
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

const postedPlatformTasks: PostedPlatformTask[] = [
  {
    dayOrder: 1,
    platform: "Pinterest",
    placement: "Dragon Books for Kids",
    link: "https://www.pinterest.com/pin/1148417973750217999",
    notes: "Posted and verified. Day 1 primary Pinterest Pin is complete."
  },
  {
    dayOrder: 1,
    platform: "Pinterest",
    placement: "Children's Activity Books",
    theme: "Meet Ember Activity Book Sneak Peek",
    link: "https://www.pinterest.com/pin/1148417973750222464/",
    notes: "Posted and verified. Day 1 second required Pinterest Pin is complete."
  },
  {
    dayOrder: 1,
    platform: "Pinterest",
    placement: "Gift Ideas for Kids Ages 5-8",
    theme: "Meet Ember Gift Idea for Kids Ages 5-8",
    link: "https://www.pinterest.com/pin/1148417973750222492/",
    notes: "Posted and verified. Day 1 third required Pinterest Pin is complete."
  }
];

const sourceChecks: ExternalSourceCheck[] = [
  {
    platform: "Pinterest",
    source: "https://help.pinterest.com/en/business/article/create-a-board",
    useInPlan: "Pinterest boards organize Pins from the business profile or Pin creation flow; this workflow uses three distinct Pinterest Pins per campaign day."
  },
  {
    platform: "YouTube",
    source: "https://support.google.com/youtube/answer/57792",
    useInPlan: "YouTube playlists can collect videos or Shorts; playlist creation and daily limits should be rechecked before batching."
  },
  {
    platform: "Meta / Facebook",
    source: "https://www.facebook.com/help/389849807718635",
    useInPlan: "Meta Business Suite is the planned scheduling/checking surface for Facebook Page posts and, after connection, Instagram."
  },
  {
    platform: "TikTok",
    source: "https://support.tiktok.com/en/using-tiktok/creating-videos/creator-playlist",
    useInPlan: "TikTok creator playlists are account-gated; if the option is missing, use pinned videos and consistent naming instead."
  }
];

const baseStructures: LaunchStructure[] = [
  {
    platform: "Pinterest",
    type: "Board",
    name: "Dragon Books for Kids",
    status: "active",
    use: "Meet Ember, baby dragon, and general Book 1 discovery Pins.",
    nextAction: "Keep Day 1 Pin here; add future broad Ember/dragon discovery Pins."
  },
  {
    platform: "Pinterest",
    type: "Board",
    name: "Screen-Free Activities for Kids",
    status: "create-or-check",
    use: "Day 2 and parent-facing screen-free activity posts.",
    nextAction: "Create or verify before posting Day 2."
  },
  {
    platform: "Pinterest",
    type: "Board",
    name: "Hidden Object Books for Kids",
    status: "create-or-check",
    use: "Can-you-find-it mission-item challenge Pins.",
    nextAction: "Create or verify before Day 4 and Batch 03 mission-item Pins."
  },
  {
    platform: "Pinterest",
    type: "Board",
    name: "Gift Ideas for Kids Ages 5-8",
    status: "create-or-check",
    use: "Gift-buyer and cozy adventure Pins.",
    nextAction: "Create or verify before the giftable Day 12 row."
  },
  {
    platform: "Pinterest",
    type: "Board",
    name: "Children's Activity Books",
    status: "create-or-check",
    use: "Activity-book positioning and broad children's book discovery.",
    nextAction: "Use for reused storybook search and activity-book content."
  },
  {
    platform: "Pinterest",
    type: "Board",
    name: "Fantasy Activity Books for Kids",
    status: "create-or-check",
    use: "Fantasy, dragon village, magical search content.",
    nextAction: "Use for magical seek-and-find and festival-world content."
  },
  {
    platform: "Instagram",
    type: "Highlight",
    name: "Meet Ember",
    status: "create-when-account-ready",
    use: "Profile intro and character identity.",
    nextAction: "Create after Instagram access is verified."
  },
  {
    platform: "Instagram",
    type: "Highlight",
    name: "Search Challenges",
    status: "create-when-account-ready",
    use: "Mission-item teasers and story/reel resharing.",
    nextAction: "Create after the first search challenge story is posted."
  },
  {
    platform: "Instagram",
    type: "Highlight",
    name: "Behind the Scenes",
    status: "create-when-account-ready",
    use: "Progress notes, approved art, and workflow updates.",
    nextAction: "Create after Facebook/Instagram account connection is checked."
  },
  {
    platform: "Facebook",
    type: "Page Surface",
    name: "Pinned Meet Ember Post",
    status: "create-when-account-ready",
    use: "First profile signal for parents and gift-buyers.",
    nextAction: "Post or pin a Day 1-style intro after Page access is verified."
  },
  {
    platform: "Facebook",
    type: "Album",
    name: "Ember Sneak Peeks",
    status: "create-when-account-ready",
    use: "Organize approved promo art without calling it interior or listing art.",
    nextAction: "Create once Page media tools are available."
  },
  {
    platform: "YouTube Shorts",
    type: "Playlist",
    name: "Ember Seek-and-Find Challenges",
    status: "create-when-account-ready",
    use: "Short challenge videos made from mission-item assets.",
    nextAction: "Create after the channel exists and first Short export is ready."
  },
  {
    platform: "YouTube Shorts",
    type: "Playlist",
    name: "Screen-Free Kids Activities",
    status: "create-when-account-ready",
    use: "Parent-facing activity idea Shorts.",
    nextAction: "Create after channel access is verified."
  },
  {
    platform: "YouTube Shorts",
    type: "Playlist",
    name: "Ember Book 1 Sneak Peeks",
    status: "create-when-account-ready",
    use: "General Book 1 prelaunch and progress videos.",
    nextAction: "Create after channel access is verified."
  },
  {
    platform: "TikTok",
    type: "Playlist",
    name: "Seek-and-Find Challenges",
    status: "account-gated",
    use: "Mission-item videos if creator playlists are enabled.",
    nextAction: "Check whether playlists are available; if not, use pinned videos and recurring caption labels."
  },
  {
    platform: "TikTok",
    type: "Playlist",
    name: "Meet Ember",
    status: "account-gated",
    use: "Character intro and cozy baby-dragon posts.",
    nextAction: "Check whether playlists are available; if not, use pinned videos."
  }
];

const reusePlan: ContentReusePlan[] = [
  {
    source: "Approved square or vertical promo image",
    reuseSurfaces: "Pinterest Pin; Instagram feed/story; Facebook Page post; short-video cover; later newsletter or website slot.",
    creationNeeded: "Platform-specific caption, alt text, hashtags, and a motion-only Seedance image-to-video export from the saved storyboard.",
    guardrail: "Do not call fresh promo art a real cover, real interior page, listing preview, or sample page."
  },
  {
    source: "Mission-item teaser asset",
    reuseSurfaces: "Pinterest challenge Pin; Instagram story; Facebook family post; TikTok/Shorts/Reels pause-and-search clip.",
    creationNeeded: "One short challenge caption plus either a motion-only Seedance image-to-video export or a separate captioned narration short.",
    guardrail: "Do not mark, circle, point to, or reveal the hidden item."
  },
  {
    source: "CapCut captioned narration storyboard",
    reuseSurfaces: "TikTok, YouTube Shorts, Instagram Reels, Facebook Reels, and Pinterest Idea Pins where bottom text/narration is desired.",
    creationNeeded: "Scene-by-scene script blocks that intentionally become visible bottom text, plus a clean image/media assignment and 9:16 ratio. This lane may later support AI animation too, but that workflow is not proven yet.",
    guardrail: "Do not use this subtype for clean motion-only videos; the words appear on the video."
  },
  {
    source: "Meet Ember asset",
    reuseSurfaces: "Pinned/profile intro; Page banner candidate; first post on each platform; welcome story highlight.",
    creationNeeded: "Account bio copy, alt text, and platform profile checklist.",
    guardrail: "Present Ember as guide/mascot, not as a licensed or borrowed character."
  },
  {
    source: "Approved interior or final cover asset",
    reuseSurfaces: "Listing images, store page, launch post, and stronger sales copy only after the real asset exists.",
    creationNeeded: "KDP-safe listing image set, real cover mockup, real interior previews, and live URL.",
    guardrail: "Real listing and inside-book claims require real book assets."
  }
];

const creationBacklog: ContentCreationItem[] = [
  {
    priority: "Now",
    item: "Day 2 Pinterest post record and board check",
    output: "Post record for Screen-free activity idea plus board status.",
    ownerAction: "Create or verify the Screen-Free Activities for Kids board, then post/schedule Day 2."
  },
  {
    priority: "Now",
    item: "Platform access tracker",
    output: "Confirmed status for Instagram, Facebook Page, YouTube channel, TikTok account, and Meta Business Suite.",
    ownerAction: "Open each platform, verify account/page/channel access, and record blockers."
  },
  {
    priority: "Next",
    item: "Motion-only Seedance short-video export template",
    output: "Reusable 15-second Seedance storyboard and manual export checklist for approved art with no on-video words.",
    ownerAction: "Create the Day 1 Meet Ember motion-only export from the saved prompt, not from CapCut storyboard text blocks."
  },
  {
    priority: "Next",
    item: "CapCut captioned narration short workflow",
    output: "Reusable marketing subtype for Shorts/Reels/TikToks where script words intentionally appear across the bottom of the image.",
    ownerAction: "Use the saved Day 1 CapCut discovery as the template for captioned narration clips, separate from clean motion-only exports. AI animation may become part of this lane later, but it still needs a tested checkpoint."
  },
  {
    priority: "Next",
    item: "Board/playlist/profile setup pass",
    output: "Pinterest boards, Instagram highlights, Facebook pinned/albums, YouTube playlists, TikTok fallback labels.",
    ownerAction: "Create only the structures that match active accounts and current platform options."
  },
  {
    priority: "Soon",
    item: "Reusable caption and alt-text bank",
    output: "Copy snippets by lane: Meet Ember, screen-free, challenge, progress, giftable.",
    ownerAction: "Approve wording style after Day 2 and Day 3 posts."
  },
  {
    priority: "Blocked",
    item: "Landing/store URL",
    output: "A real link for Pins/posts once the book or landing page is ready.",
    ownerAction: "Do not add a sales/store link until there is a real destination."
  },
  {
    priority: "Blocked",
    item: "Real cover and listing asset set",
    output: "Real cover preview, real interior preview images, and store-safe listing graphics.",
    ownerAction: "Wait for final cover/interior assets; do not use fresh promo art as fake listing material."
  }
];

const dailyOperatingSchedule = [
  "Read the next open calendar day and its platform tasks.",
  "Verify the approved asset exists and check any image warning from the post record or QA notes.",
      "Post or schedule the primary Pinterest Pin first because Pinterest is the active discovery platform.",
      "Post or schedule the second and third daily Pinterest Pins with distinct board angles, titles, and descriptions.",
      "If the third Pin cannot be made meaningfully different, record a content-creation blocker instead of treating it as optional.",
  "Post, schedule, or record blockers for Instagram, Facebook, YouTube Shorts, and TikTok.",
  "Reuse the same approved image only with platform-specific copy, alt text, hashtags, and link status.",
  "Create one missing asset or export only when it supports the next open calendar row.",
  "Save a post record with live URL, platform, board/playlist/placement, copy used, warnings, and next action.",
  "Regenerate the calendar only after completion state changes."
];

const weeklyReview = [
  "Check whether boards/playlists/highlights still match the active campaign lanes.",
  "Review live URLs, broken links, image warnings, and account blockers.",
  "Add one new reusable asset only if the next calendar week needs it.",
  "Review performance signals lightly: saves, clicks if available, follows, comments, and posts that are worth reusing.",
  "Confirm no customer-facing copy claims sale/listing status before the real link exists."
];

const phaseGates = [
  "Prelaunch now: follow, save, sneak peek, progress, and challenge wording only.",
  "Listing-ready later: switch to real cover, real interior previews, real store URL, and stronger product copy.",
  "Launch week: use the same platform structure, but update CTAs to the approved live-link wording.",
  "Post-launch: keep evergreen Pinterest boards alive, recycle best challenge assets, and add real reader-facing assets only after approval."
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
    const hasPostedPlatformTask = postedPlatformTasks.some((task) => task.dayOrder === index + 1);
    const scheduledDate = completed
      ? formatIsoDate(addDays(start, index))
      : formatIsoDate(addDays(resume, index - normalized.completedCount));

    return {
      order: index + 1,
      relativeDay: `Day ${index + 1}`,
      scheduledDate,
      status: completed ? "locked-complete" : hasPostedPlatformTask ? "in-progress" : "ready-to-schedule",
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

function copyForPlatform(slot: MarketingCalendarSlot, platform: string): string {
  if (platform === "Pinterest") {
    return `${slot.caption} ${slot.cta}`;
  }
  if (platform === "Instagram") {
    return `${slot.caption}\n\n${slot.cta}\n\n#SeekAndFind #KidsActivityBook #ChildrensBooks #ScreenFreeFun #BabyDragon #KidsBooks`;
  }
  if (platform === "Facebook") {
    return `${slot.caption}\n\n${slot.cta}`;
  }
  if (platform === "Short Video") {
    return slot.theme.includes("Firefly Flower Charm")
      ? "Find the Firefly Flower Charm. Pause and search."
      : `${slot.theme}. A quick cozy search moment with Ember.`;
  }
  return slot.caption;
}

function primaryPinterestBoard(slot: MarketingCalendarSlot): string {
  if (slot.theme.includes("Screen-free")) return "Screen-Free Activities for Kids";
  if (slot.theme.includes("Giftable")) return "Gift Ideas for Kids Ages 5-8";
  if (slot.theme.includes("challenge") || slot.theme.includes("teaser")) return "Hidden Object Books for Kids";
  return "Dragon Books for Kids";
}

function secondaryPinterestBoard(slot: MarketingCalendarSlot, primaryBoard: string): string {
  const preferred = slot.theme.includes("Screen-free") || slot.theme.includes("Giftable")
    ? "Children's Activity Books"
    : slot.theme.includes("challenge") || slot.theme.includes("teaser")
      ? "Fantasy Activity Books for Kids"
      : "Children's Activity Books";
  return preferred === primaryBoard ? "Fantasy Activity Books for Kids" : preferred;
}

function tertiaryPinterestBoard(slot: MarketingCalendarSlot, primaryBoard: string, secondaryBoard: string): string {
  const candidates = slot.theme.includes("Giftable")
    ? ["Gift Ideas for Kids Ages 5-8", "Fantasy Activity Books for Kids", "Dragon Books for Kids"]
    : slot.theme.includes("challenge") || slot.theme.includes("teaser")
      ? ["Dragon Books for Kids", "Children's Activity Books", "Screen-Free Activities for Kids"]
      : ["Gift Ideas for Kids Ages 5-8", "Fantasy Activity Books for Kids", "Screen-Free Activities for Kids"];
  return candidates.find((board) => board !== primaryBoard && board !== secondaryBoard) ?? "Gift Ideas for Kids Ages 5-8";
}

function secondaryPinterestCopy(slot: MarketingCalendarSlot, board: string): string {
  if (board === "Children's Activity Books") {
    return `${slot.caption} A gentle activity-book sneak peek for families collecting screen-free ideas. ${slot.cta}`;
  }
  if (board === "Fantasy Activity Books for Kids") {
    return `${slot.caption} A cozy fantasy search moment with a tiny dragon guide and lots of little details to notice. ${slot.cta}`;
  }
  if (board === "Gift Ideas for Kids Ages 5-8") {
    return `${slot.caption} A warm giftable book-world preview for kids who enjoy tiny treasures and gentle fantasy. ${slot.cta}`;
  }
  return `${slot.caption} Another fresh Ember angle for this campaign day. ${slot.cta}`;
}

function tertiaryPinterestCopy(slot: MarketingCalendarSlot, board: string): string {
  if (board === "Gift Ideas for Kids Ages 5-8") {
    return `${slot.caption} A coming-soon gift idea for kids who like cozy fantasy, tiny treasures, and gentle search activities. ${slot.cta}`;
  }
  if (board === "Fantasy Activity Books for Kids") {
    return `${slot.caption} A magical activity-book preview with a friendly baby dragon and a soft fantasy search mood. ${slot.cta}`;
  }
  if (board === "Screen-Free Activities for Kids") {
    return `${slot.caption} A screen-free family activity idea for a quiet search-and-find moment. ${slot.cta}`;
  }
  return `${slot.caption} A third fresh Pinterest angle for this campaign day. ${slot.cta}`;
}

function pinterestTitle(slot: MarketingCalendarSlot, placement: string, variant: "primary" | "secondary" | "third"): string {
  if (variant === "primary") return slot.theme;
  if (placement === "Children's Activity Books") return `${slot.theme} Activity Book Sneak Peek`;
  if (placement === "Gift Ideas for Kids Ages 5-8") return `${slot.theme} Gift Idea for Kids Ages 5-8`;
  if (placement === "Fantasy Activity Books for Kids") return `${slot.theme} Fantasy Activity Preview`;
  if (placement === "Screen-Free Activities for Kids") return `${slot.theme} Screen-Free Activity Idea`;
  return `${slot.theme} Pinterest Preview`;
}

function pinterestTask(slot: MarketingCalendarSlot, placement: string, variant: "primary" | "secondary" | "third"): MarketingPlatformTask {
  const postedTask = postedPlatformTasks.find((task) =>
    task.dayOrder === slot.order &&
    task.platform === "Pinterest" &&
    task.placement === placement
  );

  return {
    dayOrder: slot.order,
    scheduledDate: slot.scheduledDate,
    status: postedTask ? "posted" : "ready",
    platform: "Pinterest",
    placement,
    theme: postedTask?.theme ?? pinterestTitle(slot, placement, variant),
    asset: slot.asset,
    copy: variant === "primary"
      ? copyForPlatform(slot, "Pinterest")
      : variant === "secondary"
        ? secondaryPinterestCopy(slot, placement)
        : tertiaryPinterestCopy(slot, placement),
    cta: slot.cta,
    link: postedTask ? postedTask.link : "blank until real landing/store URL exists",
    notes: postedTask
      ? postedTask.notes
      : variant === "primary"
        ? "Create or schedule the primary daily Pin, add alt text, leave destination link blank unless a real URL exists, then record the live URL."
        : variant === "secondary"
          ? "Create or schedule the second daily Pin with distinct board fit and fresh copy; do not duplicate the primary Pin title/description exactly."
          : "Create or schedule the third daily Pin with distinct board fit and fresh copy; if it cannot be meaningfully distinct, record a content-creation blocker."
  };
}

export function buildPlatformTasks(slots: MarketingCalendarSlot[]): MarketingPlatformTask[] {
  const tasks: MarketingPlatformTask[] = [];

  for (const slot of slots) {
    const primaryBoard = primaryPinterestBoard(slot);
    const secondaryBoard = secondaryPinterestBoard(slot, primaryBoard);
    tasks.push(pinterestTask(slot, primaryBoard, "primary"));
    tasks.push(pinterestTask(slot, secondaryBoard, "secondary"));
    tasks.push(pinterestTask(slot, tertiaryPinterestBoard(slot, primaryBoard, secondaryBoard), "third"));

    tasks.push({
      dayOrder: slot.order,
      scheduledDate: slot.scheduledDate,
      status: "needs-account",
      platform: "Instagram",
      placement: slot.asset === approvedAssets.fireflyFlowerCharmTall ? "Story or Reel cover" : "Feed post plus Story reshare",
      theme: slot.theme,
      asset: slot.asset,
      copy: copyForPlatform(slot, "Instagram"),
      cta: slot.cta,
      link: "profile link only after a real landing/store URL exists",
      notes: "Account access is not verified in this repo yet. Post or schedule once Instagram is available."
    });

    tasks.push({
      dayOrder: slot.order,
      scheduledDate: slot.scheduledDate,
      status: "needs-account",
      platform: "Facebook",
      placement: "Page post",
      theme: slot.theme,
      asset: slot.asset,
      copy: copyForPlatform(slot, "Facebook"),
      cta: slot.cta,
      link: "blank until real landing/store URL exists",
      notes: "Account access is not verified in this repo yet. Use warmer progress-note wording for Facebook."
    });

    tasks.push({
      dayOrder: slot.order,
      scheduledDate: slot.scheduledDate,
      status: slot.asset === approvedAssets.fireflyFlowerCharmTall ? "ready" : "needs-video-export",
      platform: "Short Video",
      placement: "TikTok, YouTube Shorts, Instagram Reels, Facebook Reels",
      theme: slot.theme,
      asset: slot.asset,
      copy: copyForPlatform(slot, "Short Video"),
      cta: slot.theme.includes("Find") || slot.theme.includes("challenge") || slot.theme.includes("teaser")
        ? "Pause and search."
        : "Follow for more Ember sneak peeks.",
      link: "no link in video caption until real landing/store URL exists",
      notes: slot.asset === approvedAssets.fireflyFlowerCharmTall
        ? "Tall asset is ready for mobile-first Seedance storyboard/export use."
        : "Needs a Seedance image-to-video export using the saved storyboard before posting."
    });
  }

  return tasks;
}

function platformTaskTable(tasks: MarketingPlatformTask[]): string {
  return [
    "| Day | Date | Status | Platform | Placement | Theme | Asset | Copy | CTA | Link | Notes |",
    "| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...tasks.map((task) => `| ${[
      task.dayOrder,
      task.scheduledDate,
      task.status,
      task.platform,
      task.placement,
      task.theme,
      task.asset,
      task.copy,
      task.cta,
      task.link,
      task.notes
    ].map((cell) => String(cell).replaceAll("\n", "<br>").replaceAll("|", "\\|")).join(" | ")} |`)
  ].join("\n");
}

function platformReadinessTable(tasks: MarketingPlatformTask[]): string {
  const platforms = ["Pinterest", "Instagram", "Facebook", "Short Video"];
  return [
    "| Platform | Current State | Next Setup Action |",
    "| --- | --- | --- |",
    ...platforms.map((platform) => {
      const platformTasks = tasks.filter((task) => task.platform === platform);
      const posted = platformTasks.filter((task) => task.status === "posted").length;
      const ready = platformTasks.filter((task) => task.status === "ready").length;
      const needsAccount = platformTasks.filter((task) => task.status === "needs-account").length;
      const needsVideo = platformTasks.filter((task) => task.status === "needs-video-export").length;
      const state = [
        posted ? `${posted} posted` : undefined,
        ready ? `${ready} ready` : undefined,
        needsAccount ? `${needsAccount} need account access` : undefined,
        needsVideo ? `${needsVideo} need video export` : undefined
      ].filter(Boolean).join("; ");
      const next = platform === "Pinterest"
        ? "Continue posting or scheduling from the Pinterest queue."
        : platform === "Short Video"
          ? "Create reusable vertical video exports from approved art, starting with the tall Firefly Flower Charm asset."
          : `Verify ${platform} account access, then post/schedule matching daily tasks.`;
      return `| ${platform} | ${state || "No tasks"} | ${next} |`;
    })
  ].join("\n");
}

function dayCompletionTable(slots: MarketingCalendarSlot[], tasks: MarketingPlatformTask[]): string {
  return [
    "| Day | Date | Campaign Status | Posted | Ready | Blockers / Not Done | Next Action |",
    "| ---: | --- | --- | --- | --- | --- | --- |",
    ...slots.map((slot) => {
      const dayTasks = tasks.filter((task) => task.dayOrder === slot.order);
      const posted = dayTasks.filter((task) => task.status === "posted").map((task) => `${task.platform} (${task.placement})`);
      const ready = dayTasks.filter((task) => task.status === "ready").map((task) => `${task.platform} (${task.placement})`);
      const blockers = dayTasks
        .filter((task) => !["posted", "ready"].includes(task.status))
        .map((task) => `${task.platform} (${task.placement}): ${task.status}`);
      const nextAction = slot.status === "locked-complete"
        ? "No action needed unless a live URL changes."
        : slot.status === "in-progress"
          ? "Finish or explicitly block remaining platform tasks for this day before treating the day as complete."
          : "Start with the ready platform task, then record blockers for unavailable platforms.";
      return `| ${[
        slot.order,
        slot.scheduledDate,
        slot.status,
        posted.length ? posted.join(", ") : "None",
        ready.length ? ready.join(", ") : "None",
        blockers.length ? blockers.join("; ") : "None",
        nextAction
      ].map((cell) => String(cell).replaceAll("|", "\\|")).join(" | ")} |`;
    })
  ].join("\n");
}

function nextActionForSlot(slot: MarketingCalendarSlot, tasks: MarketingPlatformTask[]): string {
  const dayTasks = tasks.filter((task) => task.dayOrder === slot.order);
  const posted = dayTasks.filter((task) => task.status === "posted").map((task) => `${task.platform} (${task.placement})`);
  const notDone = dayTasks
    .filter((task) => task.status !== "posted")
    .map((task) => `${task.platform} (${task.placement}) ${task.status}`);

  if (slot.status === "locked-complete") {
    return `${slot.relativeDay}: ${slot.theme} is locked complete.`;
  }
  if (slot.status === "in-progress") {
    return `Continue ${slot.relativeDay}: ${slot.theme}. Posted: ${posted.join(", ") || "none"}. Not done: ${notDone.join("; ") || "none"}.`;
  }
  return `Continue with ${slot.relativeDay}: ${slot.theme}.`;
}

function listCell(items: string[]): string {
  return items.map((item) => `- ${item}`).join("<br>");
}

function sourceChecksTable(items: ExternalSourceCheck[]): string {
  return [
    "| Platform | Current Source Check | How This Workflow Uses It |",
    "| --- | --- | --- |",
    ...items.map((item) => `| ${item.platform} | ${item.source} | ${item.useInPlan} |`)
  ].join("\n");
}

function platformSetupTable(items: LaunchPlatformSetup[]): string {
  return [
    "| Platform | Current State | Setup Checks | Structure To Create | Daily Check | Blocker |",
    "| --- | --- | --- | --- | --- | --- |",
    ...items.map((item) => `| ${[
      item.platform,
      item.currentState,
      listCell(item.setupChecks),
      item.structureToCreate,
      item.dailyCheck,
      item.blocker
    ].map((cell) => String(cell).replaceAll("|", "\\|")).join(" | ")} |`)
  ].join("\n");
}

function structureTable(items: LaunchStructure[]): string {
  return [
    "| Platform | Type | Name | Status | Use | Next Action |",
    "| --- | --- | --- | --- | --- | --- |",
    ...items.map((item) => `| ${[
      item.platform,
      item.type,
      item.name,
      item.status,
      item.use,
      item.nextAction
    ].map((cell) => String(cell).replaceAll("|", "\\|")).join(" | ")} |`)
  ].join("\n");
}

function reuseTable(items: ContentReusePlan[]): string {
  return [
    "| Source | Reuse Surfaces | Creation Needed | Guardrail |",
    "| --- | --- | --- | --- |",
    ...items.map((item) => `| ${[
      item.source,
      item.reuseSurfaces,
      item.creationNeeded,
      item.guardrail
    ].map((cell) => String(cell).replaceAll("|", "\\|")).join(" | ")} |`)
  ].join("\n");
}

function creationBacklogTable(items: ContentCreationItem[]): string {
  return [
    "| Priority | Item | Output | Owner Action |",
    "| --- | --- | --- | --- |",
    ...items.map((item) => `| ${[
      item.priority,
      item.item,
      item.output,
      item.ownerAction
    ].map((cell) => String(cell).replaceAll("|", "\\|")).join(" | ")} |`)
  ].join("\n");
}

function orderedList(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function buildPlatformSetups(tasks: MarketingPlatformTask[]): LaunchPlatformSetup[] {
  const postedPinterest = tasks.filter((task) => task.platform === "Pinterest" && task.status === "posted").length;
  const readyPinterest = tasks.filter((task) => task.platform === "Pinterest" && task.status === "ready").length;
  const readyShortVideo = tasks.filter((task) => task.platform === "Short Video" && task.status === "ready").length;
  const needsVideoExport = tasks.filter((task) => task.platform === "Short Video" && task.status === "needs-video-export").length;

  return [
    {
      platform: "Pinterest",
      currentState: `${postedPinterest} posted; ${readyPinterest} ready from the current calendar.`,
      setupChecks: [
        "Confirm business/profile access.",
        "Confirm the Day 1 Pin URL and screenshot remain saved.",
        "Create or verify all campaign boards before their first use.",
        "Plan three distinct Pinterest Pins per campaign day.",
        "If any daily Pin cannot be made meaningfully distinct, record a content-creation blocker instead of skipping it.",
        "Keep destination links blank until a real landing/store URL exists."
      ],
      structureToCreate: "Boards for dragon books, screen-free activities, hidden-object challenges, gift ideas, activity books, and fantasy activity books.",
      dailyCheck: "Open all three daily Pinterest tasks, verify each board, asset, title, description, alt text, and link status.",
      blocker: "Missing board or account access blocks that platform task only, not the whole day."
    },
    {
      platform: "Instagram",
      currentState: "Account access is not verified in the repo.",
      setupChecks: [
        "Verify account login and profile name.",
        "Confirm whether a professional account is needed for scheduling/insights.",
        "Create highlights after the first stories exist.",
        "Check whether Meta Business Suite can see the account."
      ],
      structureToCreate: "Highlights: Meet Ember, Search Challenges, Behind the Scenes.",
      dailyCheck: "Post/schedule feed or story version when account access is ready; otherwise record needs-account.",
      blocker: "No verified account access."
    },
    {
      platform: "Facebook",
      currentState: "Page access is not verified in the repo.",
      setupChecks: [
        "Verify Page exists and Lauren can switch into it.",
        "Confirm Meta Business Suite access.",
        "Confirm whether posts can be scheduled from the planner.",
        "Create pinned intro post and optional promo-art album."
      ],
      structureToCreate: "Pinned Meet Ember post plus Ember Sneak Peeks album.",
      dailyCheck: "Post/schedule warmer parent/gift-buyer copy or record the account blocker.",
      blocker: "No verified Page or Meta Business Suite access."
    },
    {
      platform: "YouTube Shorts",
      currentState: `${readyShortVideo} ready short-video cover; ${needsVideoExport} need vertical export.`,
      setupChecks: [
        "Verify channel access.",
        "Create playlists only after the first video or Short exists.",
        "Check playlist creation limits before batching many playlists.",
        "Keep Shorts titles tied to the daily theme."
      ],
      structureToCreate: "Playlists: Ember Seek-and-Find Challenges, Screen-Free Kids Activities, Ember Book 1 Sneak Peeks.",
      dailyCheck: "If a vertical export exists, upload/schedule; otherwise mark needs-video-export.",
      blocker: "No channel access or no vertical export."
    },
    {
      platform: "TikTok",
      currentState: "Account and playlist access are not verified in the repo.",
      setupChecks: [
        "Verify account access.",
        "Check whether creator playlists are available.",
        "If playlists are missing, use pinned videos and recurring caption labels.",
        "Reuse the same short-video exports prepared for Shorts/Reels."
      ],
      structureToCreate: "Playlists if available: Seek-and-Find Challenges, Meet Ember.",
      dailyCheck: "Post/upload a short-video task when export and account access are ready; otherwise record blocker.",
      blocker: "No verified account access or account-gated playlist feature."
    },
    {
      platform: "Landing / Store Link",
      currentState: "No real landing/store URL is recorded.",
      setupChecks: [
        "Confirm the real destination before adding links.",
        "Update CTA language only after the link exists.",
        "Backfill active platform bios and future Pins/posts after approval."
      ],
      structureToCreate: "One approved link field shared across platform tasks.",
      dailyCheck: "Leave links blank until the real destination exists.",
      blocker: "No live destination."
    }
  ];
}

export function buildLaunchPlan(slots: MarketingCalendarSlot[] = buildMovableMarketingCalendar({}), tasks = buildPlatformTasks(slots)): LaunchPlan {
  return {
    sourceChecks,
    platformSetups: buildPlatformSetups(tasks),
    structures: baseStructures,
    reusePlan,
    creationBacklog,
    dailyOperatingSchedule,
    weeklyReview,
    phaseGates
  };
}

export function renderMarketingCalendar(input: Partial<MarketingCalendarInput>): string {
  const normalized = normalizeMarketingCalendarInput(input);
  const slots = buildMovableMarketingCalendar(normalized);
  const platformTasks = buildPlatformTasks(slots);
  const slug = slugify(normalized.campaign);

  return `# ${normalized.campaign}

Audience: children ages ${normalized.ageRange} and adult gift-buyers.
Strategy: Pinterest is the main discovery engine. Each campaign day now targets three distinct Pinterest Pins plus matching Instagram, Facebook, and short-video tasks.
Calendar type: rolling launch plan. Dates can move; the order and per-platform task state are the source of truth.
Full launch-plan file: \`content/outputs/marketing/launch-plan/${slug}-full-launch-plan.md\`
Reusable workflow file: \`content/workflows/marketing/full-launch-workflow.md\`

## What Changed

The old calendar was too thin because it treated one platform post as a whole day. This plan now separates the primary daily theme from the platform tasks needed to actually run the campaign.

Daily work means:

- Post or schedule three distinct Pinterest tasks: one primary Pin, one second-angle Pin, and one third-angle Pin.
- If a required Pinterest Pin cannot be made distinct, record a content-creation blocker instead of skipping it.
- Post or schedule the matching Instagram task when account access is available.
- Post or schedule the matching Facebook task when account access is available.
- Prepare or post the matching short-video task.
- Record the live URL, warning, or blocker for each platform.

## Move Rules

If a day is missed, do not skip the platform tasks and do not compress two campaign days into one day. Keep completed tasks locked, then slide unfinished tasks forward from the next realistic work day.

Regenerate the full queue:

\`\`\`powershell
npm run generate:marketing-calendar -- -- --start-date ${normalized.startDate} --force
\`\`\`

Regenerate after some full campaign days are already done:

\`\`\`powershell
npm run generate:marketing-calendar -- -- --start-date ${normalized.startDate} --completed-count <fully-complete-day-count> --resume-date <next-work-day> --force
\`\`\`

Example: if the first 3 campaign days are fully done across the tracked platform tasks and the next work day is 2026-05-09:

\`\`\`powershell
npm run generate:marketing-calendar -- -- --start-date ${normalized.startDate} --completed-count 3 --resume-date 2026-05-09 --force
\`\`\`

## Posting Queue

${markdownTable(slots)}

## Platform Readiness

${platformReadinessTable(platformTasks)}

## Day Completion Status

Day completion means the full campaign day is handled across tracked platform tasks. A single posted Pin does not complete the day.

${dayCompletionTable(slots, platformTasks)}

## Cross-Platform Launch Schedule

${platformTaskTable(platformTasks)}

## Daily Operating Checklist

For each campaign day:

1. Run the step readiness check for the primary theme.
2. Verify every platform task for that day: three Pinterest Pins, Instagram, Facebook, and Short Video.
3. Post or schedule every task that is ready.
4. Record any account blockers, video-export blockers, image warnings, or copy changes.
5. Save live URLs in a post record.
6. Regenerate the calendar only after updating completion state.

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

Pinterest: publish or schedule three distinct Pins per campaign day. Use different board fit, title/description angle, or crop/context. Do not dump the exact same image/copy onto multiple boards in one sitting. If one of the three required Pins cannot be meaningfully distinct, record it as a content-creation blocker.

Instagram: use caption-first posts, Reels covers, or Stories. Do not depend on Lauren adding image text.

Facebook: use warmer progress-note copy and family/gift-buyer framing.

Short video: make 15-second Seedance image-to-video clips from approved art using the saved storyboard, then trim/crop in CapCut only after review if a platform needs a shorter version. Use gentle motion, no unconfirmed sales wording, and no model-generated captions; add any text later as editable layout text.

TikTok: use the same short-video export and caption as Shorts/Reels once account access is available.

YouTube Shorts: use the same short-video export, with the title matching the daily theme.

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

export function renderFullLaunchPlan(input: Partial<MarketingCalendarInput>): string {
  const normalized = normalizeMarketingCalendarInput(input);
  const slots = buildMovableMarketingCalendar(normalized);
  const platformTasks = buildPlatformTasks(slots);
  const launchPlan = buildLaunchPlan(slots, platformTasks);
  const nextOpenSlot = slots.find((slot) => slot.status !== "locked-complete");
  const currentNextAction = nextOpenSlot ? nextActionForSlot(nextOpenSlot, platformTasks) : "All campaign days are locked complete.";
  const slug = slugify(normalized.campaign);

  return `# ${normalized.campaign} Full Launch Plan

Audience: children ages ${normalized.ageRange} and adult gift-buyers.
Book 1: Ember and the Sparkleflame Festival Search.
Plan type: reusable full launch workflow plus Book 1 filled-in execution plan.
Calendar file: \`content/outputs/marketing/calendar/${slug}.md\`
Reusable workflow file: \`content/workflows/marketing/full-launch-workflow.md\`
Current next action: ${currentNextAction}

## Launch System

This plan covers the whole launch machine:

- Platform setup and account checks.
- Boards, playlists, highlights, albums, and fallback structures.
- Daily posting schedule.
- Cross-platform content reuse.
- New content creation backlog.
- Post records, live URL tracking, warnings, and blockers.
- Weekly review and phase gates for prelaunch, launch week, and post-launch.

## External Source Checks

These are current platform help sources used to keep the workflow realistic. Recheck them before batching many setup actions because platform interfaces and limits can change.

${sourceChecksTable(launchPlan.sourceChecks)}

## Platform Setup And Checking

${platformSetupTable(launchPlan.platformSetups)}

## Boards, Playlists, Highlights, And Collections

${structureTable(launchPlan.structures)}

## Daily Posting Calendar

The detailed day-by-day queue lives in the calendar file and JSON manifest. Treat this table as the daily source of truth for theme/date order.

${markdownTable(slots)}

## Day Completion Status

Day completion means the full campaign day is handled across tracked platform tasks. A single posted Pin does not complete the day.

${dayCompletionTable(slots, platformTasks)}

## Cross-Platform Task Schedule

${platformTaskTable(platformTasks)}

## Content Reuse System

${reuseTable(launchPlan.reusePlan)}

## Content Creation Backlog

${creationBacklogTable(launchPlan.creationBacklog)}

## Daily Operating Workflow

${orderedList(launchPlan.dailyOperatingSchedule)}

## Weekly Review Workflow

${orderedList(launchPlan.weeklyReview)}

## Phase Gates

${orderedList(launchPlan.phaseGates)}

## Reusable Next-Book Inputs

To generate the next book launch, swap these inputs while keeping the same workflow:

1. Book title.
2. World or theme.
3. Audience, if different from ages ${normalized.ageRange}.
4. Product promise.
5. Approved character/canon references.
6. Approved promo asset pool.
7. Mission-item teaser list.
8. Real cover/listing asset status.
9. Starting date.
10. Completed-count and resume-date state.
11. Platform access state.
12. Board, playlist, highlight, and collection names.

## Next-Book Generation Command Pattern

\`\`\`powershell
npm run generate:marketing-calendar -- -- --campaign "Book 2 Prelaunch Rolling Campaign" --start-date YYYY-MM-DD --completed-count 0 --force
\`\`\`

Before using the output for another book, replace the book-specific calendar rows and asset pool with that book's approved materials. Do not reuse Book 1 Sparkleflame-specific assets or mission items for another book.

## Publication Claim Guardrail

Do not say available now, buy now, order today, on Amazon, published, launch day, or inside the book unless production status confirms that wording. Fresh promo art is not a real cover, real interior sample, real listing preview, or real product mockup.
`;
}

export function renderReusableLaunchWorkflow(): string {
  return `# Reusable Ember Full Launch Workflow

Use this workflow to generate and run a launch plan for any Ember book after that book has its canon, approved promo assets, and platform status ready. Pinterest is the high-volume discovery lane: plan three distinct Pins per campaign day.

## Required Inputs

1. Book title.
2. Book world or theme.
3. Audience and buyer.
4. Product promise.
5. Canon character/reference files.
6. Approved promo assets and approval status.
7. Mission-item teaser list.
8. Final cover/interior/listing asset status.
9. Start date.
10. Already-completed campaign day count.
11. Resume date if unfinished rows need to slide.
12. Platform access state for Pinterest, Instagram, Facebook, YouTube, TikTok, and landing/store URL.

## Generation Steps

1. Read the book canon and production status.
2. Build or update that book's approved promo asset pool.
3. Build the daily campaign queue from reusable lanes: Meet Ember, screen-free activity, search challenge, world mood, progress note, giftable angle, and launch/link update when allowed.
4. Generate the rolling calendar and full launch plan.
5. Create or check platform structures: Pinterest boards, Instagram highlights, Facebook Page surfaces, YouTube playlists, TikTok playlists or fallback labels.
6. Create platform-specific task rows for every day, including three Pinterest Pin rows per day.
7. Post or schedule only ready tasks.
8. Save a post record for every live post.
9. Regenerate the calendar after completion state changes.
10. Review weekly and update blockers.

## Reusable Content Lanes

| Lane | Purpose | Typical Platforms | Asset Need |
| --- | --- | --- | --- |
| Meet Ember | Character intro and profile signal | Pinterest, Instagram, Facebook, short video | Approved Ember promo art |
| Screen-free activity | Parent-facing discovery | Pinterest, Facebook, Instagram | Warm activity/giftable promo art |
| Search challenge | Mission-item engagement | Pinterest, Instagram stories, Reels, Shorts, TikTok | Mission-item teaser art |
| World mood | Cozy book-world signal | Instagram, Facebook, Pinterest | World/banner/promo art |
| Progress note | Build-in-public update | Facebook, Instagram | Approved art or workflow-safe image |
| Giftable angle | Buyer-facing evergreen post | Pinterest, Facebook | Giftable promo art or real listing asset later |
| Launch/link update | Stronger CTA after real link exists | All active platforms | Real cover/listing assets and approved URL |

## Platform Structure Template

| Platform | Structures To Plan | Reuse Rule |
| --- | --- | --- |
| Pinterest | 4-6 boards around discovery intent | Three distinct Pins per day; if a Pin cannot be meaningfully distinct, record a content-creation blocker |
| Instagram | Profile, highlights, feed/story/reel lanes | Reuse approved art with captions and no fake listing claims |
| Facebook | Page, pinned intro, albums, warmer posts | Use parent/gift-buyer framing and progress updates |
| YouTube Shorts | Channel and playlists | Use Seedance storyboard exports from approved art |
| TikTok | Account, playlists if available, pinned-video fallback | Use the same vertical exports and challenge captions |
| Landing/Store | One approved destination field | Leave blank until real URL exists |

## Daily Operating Checklist

${orderedList(dailyOperatingSchedule)}

## Weekly Review Checklist

${orderedList(weeklyReview)}

## Guardrails

- Do not invent canon, mission items, characters, or book status.
- Do not reuse Book 1-specific Sparkleflame language for another book unless that book is Book 1.
- Do not use fresh promo art as real cover, interior sample, listing preview, or product mockup.
- Do not add readable generated text to marketing art unless exact text is approved.
- Do not automate around payment, login protections, CAPTCHA, rate limits, free-credit limits, or platform restrictions.
- Stop browser automation at sensitive account/payment boundaries.
`;
}

export async function generateMarketingCalendar(input: Partial<MarketingCalendarInput>, options: RunOptions = {}): Promise<GenerateResult> {
  const normalized = normalizeMarketingCalendarInput(input);
  const calendar = renderMarketingCalendar(normalized);
  const fullLaunchPlan = renderFullLaunchPlan(normalized);
  const reusableLaunchWorkflow = renderReusableLaunchWorkflow();
  const slots = buildMovableMarketingCalendar(normalized);
  const qa = runMarketingQa(calendar);
  const slug = slugify(normalized.campaign);
  const basePath = `content/outputs/marketing/calendar/${slug}`;
  const launchPlanPath = `content/outputs/marketing/launch-plan/${slug}-full-launch-plan.md`;
  const reusableWorkflowPath = "content/workflows/marketing/full-launch-workflow.md";
  const platformTasks = buildPlatformTasks(slots);
  const nextOpenSlot = slots.find((slot) => slot.status !== "locked-complete");
  const nextStep = nextOpenSlot
    ? nextActionForSlot(nextOpenSlot, platformTasks)
    : "All campaign days in this calendar are locked complete; review live URLs and platform blockers.";

  const manifest = {
    campaign: normalized.campaign,
    startDate: normalized.startDate,
    resumeDate: normalized.resumeDate ?? null,
    completedCount: normalized.completedCount,
    ageRange: normalized.ageRange,
    movableRule: "Only fully completed campaign days stay locked; in-progress and unfinished days reschedule from resumeDate or the first open day.",
    slots,
    platformTasks,
    launchPlan: buildLaunchPlan(slots, platformTasks)
  };

  const files = [
    await writeTextFileSafe(`${basePath}.md`, calendar, options),
    await writeTextFileSafe(`${basePath}.json`, `${JSON.stringify(manifest, null, 2)}\n`, options),
    await writeTextFileSafe(launchPlanPath, fullLaunchPlan, options),
    await writeTextFileSafe(reusableWorkflowPath, reusableLaunchWorkflow, options)
  ];

  const result: GenerateResult = {
    ok: qa.passed,
    workflow: "marketing-calendar",
    summary: "Generated movable marketing campaign calendar.",
    files,
    warnings: qa.failures.concat(qa.warnings),
    nextStep
  };

  await updateProductionStatus(result, options.rootDir);
  const sessionFile = await appendSessionLog({
    workflow: "marketing-calendar",
    inputs: normalized,
    assumptions: [
      "Pinterest is the primary discovery channel.",
      "The book is not claimed as purchasable unless production status later confirms it.",
      "Approved promo images can be posted without Lauren adding overlay text.",
      "The reusable workflow must be reloaded with each next book's canon and approved assets."
    ],
    outputsCreated: files,
    warnings: result.warnings,
    qaResult: qa.passed ? "PASS" : "FAIL",
    nextManualStep: result.nextStep
  }, options.rootDir);
  result.files.push(sessionFile, "content/workflows/book-01/production-status.md");
  return result;
}
