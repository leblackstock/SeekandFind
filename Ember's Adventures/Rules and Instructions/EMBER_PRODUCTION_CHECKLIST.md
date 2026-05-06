# Ember Production Checklist

Derivative mirror only. Source of truth is the four consolidated rules files plus CHATGPT_PROJECT_SYSTEM_INSTRUCTIONS.md. If this checklist conflicts with the rules bundle, follow the rules bundle and correct this checklist.

Canonical Ember book plans, story/list source blocks, Page 24 source blocks, and prompt rows live in `seek-and-find-rules-consolidated-4-files/03_TEMPLATES_PROMPTS_AND_LOGS.md`. Ember project canon lives in `seek-and-find-rules-consolidated-4-files/01_RULES_CORE_AUDIENCE_MODE_PROJECTS.md`. This checklist is a working mirror, not a source.

## Template

Production order is seek first, then paired story/list page:

```text
1, 3, 2, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 15, 14, 17, 16, 19, 18, 21, 20, 22-23, 24
```

Use short filenames:

```text
B#P##.png       final image
B#P##.md        story/list source
B#P22-23.png    recap spread
```

You can request pages with compact shorthand: `b1p1`, `b1p01`, `B1 P3`, `b2p20`, `b3p22-23`. Chat should parse these as book/page requests using the canonical rows in the rules bundle.

Hard stop: do not generate final production art if the required character source images named in the project canon are missing. If a supporting character appears, confirm that character's source images too. If sources are missing, stop and ask for them.

## Quick Rules

- SOT = 4 rules files + system instructions only.
- This checklist is derivative.
- Use file 03 canonical rows/source blocks.
- Seek first, then story/list.
- Do not invent text, items, titles, or filenames.
- Text pages use exact approved source text.

## Approval Words

```text
approved  image/page passes QA and can move forward
redo      discard and regenerate
revise    keep the direction but fix listed issues
list      identify 20-30 candidate finds from approved seek art
md        create the story/list .md source after final finds are chosen
final     save/export the approved file with the preferred filename
```

## Shorthand Meanings

```text
b#p[page]             make/review page prompt
b#p[seek] list 20-30  list visible candidate finds after approval
b#p[story] md         create downloadable story/list .md
b#p[story]            generate story/list from exact .md text
b#p22-23              recap/reward spread
b#p24                 closing/teaser page
```

## Shorthand Prompt Matching Contract

Prompt row-match blocks must cite `seek-and-find-rules-consolidated-4-files/03_TEMPLATES_PROMPTS_AND_LOGS.md` and echo source section, shorthand/request, page role, printed pages, paired page, prompt title/location, mission item, and preferred files exactly.

- Seek page prompts use the row mission item and do not borrow from a neighboring row.
- Seek page prompts must not request readable text, labels, arrows, circles, answer marks, page numbers, or watermarks.
- After seek approval, identify 20-30 candidate finds, then select 1 mission item + 10 main finds + 5-15 bonus finds.
- When shorthand includes `md`, provide the story/list source as a downloadable `.md` file attachment using the preferred filename. The `.md` must keep Mission Item, Main Finds (10), and Bonus Finds (5-15) as separate labeled sections.
- Story/list images use exact `.md` text, preserve the three find-list sections, and keep low-clutter composition with open breathing room around title, story, mission line, and find lists. A single flattened checklist is a fail.
- Title pages use exact approved title words plus the source-image names and written character description from the active project canon.
- Recap and Page 24 prompts use the exact source text in the canonical rules bundle.

Do not use this checklist as a fallback source. If the canonical rules-file source is missing, stop and report the missing source instead of inventing content.

Per spread list check:

- [ ] Seek page generated and approved.
- [ ] No readable text, labels, arrows, circles, answer marks, page numbers, or watermark on seek page.
- [ ] Mission item visible and fair.
- [ ] Chat identified **20-30** candidate finds.
- [ ] Human checked candidates against the image.
- [ ] Final list chosen: 1 mission item + 10 main finds + 5-15 bonus finds.
- [ ] Story/list `.md` saved with separate Mission Item, Main Finds (10), and Bonus Finds (5-15) sections.
- [ ] Story/list image generated from exact `.md` text with the three find-list sections preserved.
- [ ] Story/list text, section breaks, spelling, icons, low-clutter composition, and left-to-right direction checked.
- [ ] Final files saved.

Checklist key: `Art` = image approved, `List` = 20-30 candidates checked and final list chosen, `Text` = story/list text/icons checked, `Save` = final files saved.

## Book 1 Checklist

Title: **Ember and the Sparkleflame Festival Search**

| Order | Pages | Shorthand | Page role | Paired page | Prompt title / location | Mission item | Preferred files | Art | List | Text | Save |
|---:|:---:|:---|:---|:---:|:---|:---|:---|:---:|:---:|:---:|:---:|
| 1 | 1 | `b1p1` | title page | n/a | Ember and the Sparkleflame Festival Search / title page | n/a | `B1P01.png` | ? | n/a | ? | ? |
| 2 | 3 then 2 | `b1p3`, `b1p3 list 20-30`, `b1p2 md`, `b1p2` | seek image + paired story/list | 2 | Ember's First Clue / Ember's Little Dragon Cottage | Tiny Sparkleflame Map | `B1P03.png`, `B1P02.md`, `B1P02.png` | ? | ? | ? | ? |
| 3 | 5 then 4 | `b1p5`, `b1p5 list 20-30`, `b1p4 md`, `b1p4` | seek image + paired story/list | 4 | The Worried Village / Dragon Village Square | Golden Welcome Bell | `B1P05.png`, `B1P04.md`, `B1P04.png` | ? | ? | ? | ? |
| 4 | 7 then 6 | `b1p7`, `b1p7 list 20-30`, `b1p6 md`, `b1p6` | seek image + paired story/list | 6 | Sugar-Star Sparkles / Crystal Cupcake Bakery | Glowing Sugar Star | `B1P07.png`, `B1P06.md`, `B1P06.png` | ? | ? | ? | ? |
| 5 | 9 then 8 | `b1p9`, `b1p9 list 20-30`, `b1p8 md`, `b1p8` | seek image + paired story/list | 8 | The Lantern Maker's Secret / Lantern Maker's Workshop | Baby Flame Lantern | `B1P09.png`, `B1P08.md`, `B1P08.png` | ? | ? | ? | ? |
| 6 | 11 then 10 | `b1p11`, `b1p11 list 20-30`, `b1p10 md`, `b1p10` | seek image + paired story/list | 10 | Across the Garden Bridge / Dragon Garden Bridge | Firefly Flower Charm | `B1P11.png`, `B1P10.md`, `B1P10.png` | ? | ? | ? | ? |
| 7 | 13 then 12 | `b1p13`, `b1p13 list 20-30`, `b1p12 md`, `b1p12` | seek image + paired story/list | 12 | Pebbles Up the Mountain / Sparkle Pebble Trail | Shimmer Trail Stone | `B1P13.png`, `B1P12.md`, `B1P12.png` | ? | ? | ? | ? |
| 8 | 15 then 14 | `b1p15`, `b1p15 list 20-30`, `b1p14 md`, `b1p14` | seek image + paired story/list | 14 | Echoes in the Crystal Cave / Crystal Echo Cavern | Echo Glow Gem | `B1P15.png`, `B1P14.md`, `B1P14.png` | ? | ? | ? | ? |
| 9 | 17 then 16 | `b1p17`, `b1p17 list 20-30`, `b1p16 md`, `b1p16` | seek image + paired story/list | 16 | The Ancient Dragon Door / Ancient Dragon Door | Dragon Door Key | `B1P17.png`, `B1P16.md`, `B1P16.png` | ? | ? | ? | ? |
| 10 | 19 then 18 | `b1p19`, `b1p19 list 20-30`, `b1p18 md`, `b1p18` | seek image + paired story/list | 18 | Market Lights Waking Up / Festival Market Stalls | Sparkle Market Token | `B1P19.png`, `B1P18.md`, `B1P18.png` | ? | ? | ? | ? |
| 11 | 21 then 20 | `b1p21`, `b1p21 list 20-30`, `b1p20 md`, `b1p20` | seek image + paired story/list | 20 | The Festival Shines / Sparkleflame Festival Finale | Look-a-head Telescope | `B1P21.png`, `B1P20.md`, `B1P20.png` | ? | ? | ? | ? |
| 12 | 22-23 | `b1p22-23` | recap / reward spread | n/a | Recap / reward spread / all 10 mission items | all 10 mission items | `B1P22-23.png` | ? | ? | ? | ? |
| 13 | 24 | `b1p24` | closing / teaser | n/a | Where Will Ember Search Next? / Book 2 teaser | n/a | `B1P24.png` | ? | n/a | ? | ? |

### Page 24 Source Mirror

- Title: `Where Will Ember Search Next?`
- Closing text: `Thanks to you, the Sparkleflame Festival shines again! But Ember has spotted a new little mystery… a glowing forest leaf peeking from his satchel.`
- Visual source: Ember under warm festival lights with his satchel, smiling at a small glowing forest leaf clue. The page should feel like a gentle celebration and a soft bridge toward the enchanted forest adventure.

## Book 2 Checklist

Title: **Ember and the Enchanted Forest Search**

| Order | Pages | Shorthand | Page role | Paired page | Prompt title / location | Mission item | Preferred files | Art | List | Text | Save |
|---:|:---:|:---|:---|:---:|:---|:---|:---|:---:|:---:|:---:|:---:|
| 1 | 1 | `b2p1` | title page | n/a | Ember and the Enchanted Forest Search / title page | n/a | `B2P01.png` | ? | n/a | ? | ? |
| 2 | 3 then 2 | `b2p3`, `b2p3 list 20-30`, `b2p2 md`, `b2p2` | seek image + paired story/list | 2 | The Leaflight Path / Ember's Forest Leaf Trail | Leaflight Trail Marker | `B2P03.png`, `B2P02.md`, `B2P02.png` | ? | ? | ? | ? |
| 3 | 5 then 4 | `b2p5`, `b2p5 list 20-30`, `b2p4 md`, `b2p4` | seek image + paired story/list | 4 | Lanterns Under the Mushrooms / Mushroom Lantern Meadow | Mushroom Glow Lantern | `B2P05.png`, `B2P04.md`, `B2P04.png` | ? | ? | ? | ? |
| 4 | 7 then 6 | `b2p7`, `b2p7 list 20-30`, `b2p6 md`, `b2p6` | seek image + paired story/list | 6 | The Tiny Acorn Door / Fairy Door Hollow | Tiny Acorn Door Key | `B2P07.png`, `B2P06.md`, `B2P06.png` | ? | ? | ? | ? |
| 5 | 9 then 8 | `b2p9`, `b2p9 list 20-30`, `b2p8 md`, `b2p8` | seek image + paired story/list | 8 | Hootiepuff's Lookout / Hootiepuff's Nest Lookout | Moonfeather Clue | `B2P09.png`, `B2P08.md`, `B2P08.png` | ? | ? | ? | ? |
| 6 | 11 then 10 | `b2p11`, `b2p11 list 20-30`, `b2p10 md`, `b2p10` | seek image + paired story/list | 10 | Tea in the Treetops / Treetop Teacup Village | Leafcup Tea Token | `B2P11.png`, `B2P10.md`, `B2P10.png` | ? | ? | ? | ? |
| 7 | 13 then 12 | `b2p13`, `b2p13 list 20-30`, `b2p12 md`, `b2p12` | seek image + paired story/list | 12 | Fireflies in the Ferns / Firefly Fern Path | Firefly Fern Star | `B2P13.png`, `B2P12.md`, `B2P12.png` | ? | ? | ? | ? |
| 8 | 15 then 14 | `b2p15`, `b2p15 list 20-30`, `b2p14 md`, `b2p14` | seek image + paired story/list | 14 | Ripples at Rainleaf Pond / Rainleaf Pond | Dewdrop Lily Pearl | `B2P15.png`, `B2P14.md`, `B2P14.png` | ? | ? | ? | ? |
| 9 | 17 then 16 | `b2p17`, `b2p17 list 20-30`, `b2p16 md`, `b2p16` | seek image + paired story/list | 16 | The Old Story Tree / Old Story Tree Library | Leaf Scroll Ribbon | `B2P17.png`, `B2P16.md`, `B2P16.png` | ? | ? | ? | ? |
| 10 | 19 then 18 | `b2p19`, `b2p19 list 20-30`, `b2p18 md`, `b2p18` | seek image + paired story/list | 18 | The Heartwood Door / Ancient Heartwood Door | Heartwood Door Gem | `B2P19.png`, `B2P18.md`, `B2P18.png` | ? | ? | ? | ? |
| 11 | 21 then 20 | `b2p21`, `b2p21 list 20-30`, `b2p20 md`, `b2p20` | seek image + paired story/list | 20 | The Forest Glows Again / Great Forest Glow Grove | Enchanted Forest Crown Leaf | `B2P21.png`, `B2P20.md`, `B2P20.png` | ? | ? | ? | ? |
| 12 | 22-23 | `b2p22-23` | recap / reward spread | n/a | Recap / reward spread / all 10 mission items | all 10 mission items | `B2P22-23.png` | ? | ? | ? | ? |
| 13 | 24 | `b2p24` | closing / teaser | n/a | Where Will Ember Search Next? / Book 3 teaser | n/a | `B2P24.png` | ? | n/a | ? | ? |

### Page 24 Source Mirror

- Title: `Where Will Ember Search Next?`
- Closing text: `Thanks to you, the enchanted forest glows again! But Ember has found another tiny clue… a soft castle shimmer glowing beyond the leaves.`
- Visual source: Ember at the edge of the restored forest glow, looking toward a distant friendly castle shimmer or tiny crystal-tower glow beyond the trees. The page should close Book 2 warmly and point gently toward the crystal castle adventure without showing answer locations.

## Book 3 Checklist

Title: **Ember and the Crystal Castle Search**

**Book 3 material rule:** In Crystal Castle prompts, make the castle walls, towers, main architecture, roads, paths, steps, floors, and courtyard surfaces stone, not crystal. Crystal can still appear on roofs, trim, decor, treasures, windows, furniture, tools, and accent objects. Other objects and scene details may be wood, plants/organic materials, metal, fabric, food, or other non-crystal materials.

| Order | Pages | Shorthand | Page role | Paired page | Prompt title / location | Mission item | Preferred files | Art | List | Text | Save |
|---:|:---:|:---|:---|:---:|:---|:---|:---|:---:|:---:|:---:|:---:|
| 1 | 1 | `b3p1` | title page | n/a | Ember and the Crystal Castle Search / title page | n/a | `B3P01.png` | ? | n/a | ? | ? |
| 2 | 3 then 2 | `b3p3`, `b3p3 list 20-30`, `b3p2 md`, `b3p2` | seek image + paired story/list | 2 | The Castle Key Glows / Crystal Castle Gate | Crystal Castle Key | `B3P03.png`, `B3P02.md`, `B3P02.png` | ? | ? | ? | ? |
| 3 | 5 then 4 | `b3p5`, `b3p5 list 20-30`, `b3p4 md`, `b3p4` | seek image + paired story/list | 4 | Colors in the Welcome Hall / Stained Glass Welcome Hall | Rainbow Glass Star | `B3P05.png`, `B3P04.md`, `B3P04.png` | ? | ? | ? | ? |
| 4 | 7 then 6 | `b3p7`, `b3p7 list 20-30`, `b3p6 md`, `b3p6` | seek image + paired story/list | 6 | Pawprints in the Courtyard / Royal Pet Courtyard | Silver Paw Charm | `B3P07.png`, `B3P06.md`, `B3P06.png` | ? | ? | ? | ? |
| 5 | 9 then 8 | `b3p9`, `b3p9 list 20-30`, `b3p8 md`, `b3p8` | seek image + paired story/list | 8 | Gemma's Helpful Nook / Gemma's Guide Nook | Pink Guide Gem | `B3P09.png`, `B3P08.md`, `B3P08.png` | ? | ? | ? | ? |
| 6 | 11 then 10 | `b3p11`, `b3p11 list 20-30`, `b3p10 md`, `b3p10` | seek image + paired story/list | 10 | Maps in the Library / Treasure Map Library | Golden Map Lens | `B3P11.png`, `B3P10.md`, `B3P10.png` | ? | ? | ? | ? |
| 7 | 13 then 12 | `b3p13`, `b3p13 list 20-30`, `b3p12 md`, `b3p12` | seek image + paired story/list | 12 | Moonlight in the Mirrors / Moonlit Mirror Hall | Moon Mirror Charm | `B3P13.png`, `B3P12.md`, `B3P12.png` | ? | ? | ? | ? |
| 8 | 15 then 14 | `b3p15`, `b3p15 list 20-30`, `b3p14 md`, `b3p14` | seek image + paired story/list | 14 | Treats in the Crystal Kitchen / Kitchen of Crystal Treats | Crystal Berry Tart | `B3P15.png`, `B3P14.md`, `B3P14.png` | ? | ? | ? | ? |
| 9 | 17 then 16 | `b3p17`, `b3p17 list 20-30`, `b3p16 md`, `b3p16` | seek image + paired story/list | 16 | The Gallery of Secret Doors / Secret Door Gallery | Hidden Door Button | `B3P17.png`, `B3P16.md`, `B3P16.png` | ? | ? | ? | ? |
| 10 | 19 then 18 | `b3p19`, `b3p19 list 20-30`, `b3p18 md`, `b3p18` | seek image + paired story/list | 18 | The Grand Treasure Glow / Grand Treasure Chamber | Treasure Glow Orb | `B3P19.png`, `B3P18.md`, `B3P18.png` | ? | ? | ? | ? |
| 11 | 21 then 20 | `b3p21`, `b3p21 list 20-30`, `b3p20 md`, `b3p20` | seek image + paired story/list | 20 | The Castle Celebration / Crystal Castle Finale | Crystal Crown Lantern | `B3P21.png`, `B3P20.md`, `B3P20.png` | ? | ? | ? | ? |
| 12 | 22-23 | `b3p22-23` | recap / reward spread | n/a | Recap / reward spread / all 10 mission items | all 10 mission items | `B3P22-23.png` | ? | ? | ? | ? |
| 13 | 24 | `b3p24` | closing / teaser | n/a | Ember's Next Little Mystery / optional future-book teaser | n/a | `B3P24.png` | ? | n/a | ? | ? |

### Page 24 Source Mirror

- Title: `Ember's Next Little Mystery`
- Closing text: `Thanks to you, the crystal castle sparkles with color again! Ember closes his satchel with a happy smile, ready for whatever tiny mystery glows next.`
- Visual source: Ember in a friendly stone-and-crystal castle celebration setting, with soft rainbow light, his satchel closed, and no specific next-book mission item. The page should feel complete while leaving room for future adventures.

## Required Row-Match Block In Generated Prompt

```text
ROW MATCH
Source: seek-and-find-rules-consolidated-4-files/03_TEMPLATES_PROMPTS_AND_LOGS.md > [Ember Book N 10-Spread Plan / source block]
Request: [exact shorthand entered]
Page role: [exact row value]
Printed pages: [exact row value]
Paired page: [exact row value or n/a]
Prompt title/location: [exact row value]
Mission item: [exact row value or n/a]
Preferred files: [exact row value]
```

Hard fail if a generated prompt changes the source row title/location, mission item, paired page, preferred filename, story prose, recap text, or Page 24 source text.
