# Templates, Prompts, and Logs

This file contains reusable working material: briefs, hidden-object list templates, prompt templates, prompt block library, skeleton prompts, project overlay templates, and starter decision/change logs.

Source-of-truth note: only this four-file rules bundle plus `CHATGPT_PROJECT_SYSTEM_INSTRUCTIONS.md` is authoritative. Archive files, split files, checklists, and Word documents are derivative/reference material only.

Generated from the split v2 source files. Upload only the four consolidated files for active production. The old folder-style paths below are provenance labels only, not separate files to locate or upload.

## Included Sources

- `60_templates\60_series_brief_template.md`
- `60_templates\61_book_brief_template.md`
- `60_templates\62_page_brief_template.md`
- `60_templates\63_hidden_object_list_template.md`
- `60_templates\64_prompt_template.md`
- `60_templates\65_qa_report_template.md`
- `60_templates\66_project_overlay_template.md`
- `80_prompt_blocks\80_prompt_block_library.md`
- `80_prompt_blocks\81_standard_page_prompt_skeleton.md`
- `80_prompt_blocks\82_coloring_page_prompt_skeleton.md`
- `80_prompt_blocks\83_revision_prompt_skeleton.md`
- `90_logs\change_log.md`
- `90_logs\decision_log.md`

---

# Canonical Ember Book Plans and Story Source Blocks

The following Ember book plans are source-of-truth content inside this four-file rules bundle. Production checklists and Word files are derivative working copies only; if they conflict with these rows, story blocks, mission lines, or material rules, correct the derivative copy.

Character reference rule: Every Ember image prompt generated from these plans must directly name `Ember-001`, `Ember-002`, and `Ember-003` for Ember. When a page includes a named supporting character, add that character's exact reference image files directly: Hootiepuff uses `HootiePuff-001`, `HootiePuff-002`, and `HootiePuff-003`; Luma Leafwhisk uses `Luma_Leafwhisk-001`, `Luma_Leafwhisk-002`, and `Luma_Leafwhisk-003`; Gemma Glint uses `Gemma_Glint-001`, `Gemma_Glint-002`, and `Gemma_Glint-003`; Pebblekins uses `Pebblekins-001`, `Pebblekins-002`, and `Pebblekins-003`; Elder Glowkeeper uses `Elder_Glowkeeper-001`, `Elder_Glowkeeper-002`, and `Elder_Glowkeeper-003`.

Direct-generation request line for pasted prompts:

```text
This is a direct image-generation request, not a prompt-writing, QA, planning, or source-matching task. Generate the image now.
```

When that line or equivalent wording appears with a complete prompt, use the prompt as supplied and run it through the user's selected generation path. For Ember production in this repo, default to supervised ChatGPT broke mode unless the user explicitly asks for a different renderer. Do not rewrite, validate, summarize, source-match, QA, or ask follow-up questions unless safety policy is implicated, a browser/account/payment/rate-limit boundary appears, or the prompt lacks an actual visual subject.

## Ember Book 1 10-Spread Plan

Title: **Ember and the Sparkleflame Festival Search**.

Book 1 seek-image placement rule: Book 1 Sparkleflame Festival seek-image prompts should be rich but slightly less cluttered than an overpacked hidden-object spread. Each final seek-image prompt should request exactly 50 hidden objects total: the exact named mission item plus 49 additional unique hidden objects. Use intentional clusters and believable surfaces for the mission item and the 49 unnamed additional hidden objects. Keep walkways, paths, bridge surfaces, mountain trails, doorway thresholds, market aisles, and the main eye path mostly clear, with only a few small edge details. Do not scatter items randomly across floors or routes.

Book 1 scene-life and object-variety rule: Sparkleflame Festival seek-image prompts should include friendly original dragon villagers, festival-goers, helpers, customers, or small background activity when the location is a village square, market, bakery, workshop, bridge, or festival finale. These figures should make the scene feel alive but stay secondary, not become hidden targets, not block the mission item, and not crowd the walkways. Searchable objects should be varied and child-nameable, with distinct silhouettes. In final seek-image prompts, do not name exact hidden items except for the mission item. Translate page-specific source vocabulary into broad scene-fit, material, silhouette, scale, and placement guidance so the image generator creates 49 unique additional hidden objects without a literal checklist. Festival lanterns are an important Book 1 motif and may appear generously as environmental lighting, strings, stands, garlands, workshop pieces, and celebration lights, but additional hidden items should still be unnamed and one-of-a-kind.

### Production Order

Printed order is story/list left page then seek image right page. Production order is seek image first, then story/list page after the find list is approved:

```text
1, 3, 2, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 15, 14, 17, 16, 19, 18, 21, 20, 22-23, 24
```

### Page Map

| Spread | Story/List Page | Seek Page | Zone | Seek Location | Mission Item | Layout Variant |
|---:|---:|---:|:---|:---|:---|:---|
| 1 | 2 | 3 | Cozy Dragon Village | Ember's Little Dragon Cottage | Tiny Sparkleflame Map | Ember left vignette pointing right; rounded checklist panel |
| 2 | 4 | 5 | Cozy Dragon Village | Dragon Village Square | Golden Welcome Bell | Festival banner heading; checklist ribbon at bottom |
| 3 | 6 | 7 | Cozy Dragon Village | Crystal Cupcake Bakery | Glowing Sugar Star | Bakery parchment card; icon bubbles |
| 4 | 8 | 9 | Cozy Dragon Village | Lantern Maker's Workshop | Baby Flame Lantern | Lantern-border page; checklist shelf |
| 5 | 10 | 11 | Cozy Dragon Village | Dragon Garden Bridge | Firefly Flower Charm | Garden vine frame; right-flowing checklist trail |
| 6 | 12 | 13 | Magical Dragon Mountain | Sparkle Pebble Trail | Shimmer Trail Stone | Mountain path motif; pebble icon row |
| 7 | 14 | 15 | Magical Dragon Mountain | Crystal Echo Cavern | Echo Glow Gem | Crystal frame; glowing checklist pockets |
| 8 | 16 | 17 | Magical Dragon Mountain | Ancient Dragon Door | Dragon Door Key | Ancient-door parchment; keyhole icon markers |
| 9 | 18 | 19 | Sparkleflame Festival Valley | Festival Market Stalls | Sparkle Market Token | Market stall label card; token-themed icons |
| 10 | 20 | 21 | Sparkleflame Festival Valley | Sparkleflame Festival Finale | Look-a-head Telescope | Celebration arch; lookout-telescope checklist cue |

### Broad Searchable Categories

Use these as curated prop zones, not as permission to fill every open space. Category items should be grouped where they belong naturally, leaving walkways, trails, bridge surfaces, door thresholds, market aisles, and main eye paths mostly open. These rows are source/planning guidance only; do not copy non-mission item names from them into final seek-image prompts.

| Seek Page | Broad Searchable Categories |
|---:|:---|
| 3 | Cozy cottage objects, tiny dragon belongings, scrolls, satchel items, scarf details, soft blankets, little stools, rounded shelves, warm rugs, wooden toys, tiny cups, buttons, small festival keepsakes, and a few warm festival lanterns by the window or doorway. |
| 5 | Friendly dragon villagers and festival-goers, village objects, festival decorations, dragon-town props, baskets, flags, festival lantern strings, decorated lantern stands, treat trays, ribbon spools, small instruments, wrapped parcels, wooden toys, pouches, buttons, painted path stones, and friendly dragon-world details. |
| 7 | Cupcakes, cookies, baking tools, mixing bowls, berries, tiny spoons, frosting swirls, warm oven details, little dragon treats, trays, recipe cards with no readable text, cooling racks, and bakery cloths. |
| 9 | Lantern frames, festival lantern strings, safe rounded tools, wick holders, folded paper shades, tiny gears, workbench clamps, hanging hooks, workshop shelves, bulb shapes, paper decorations, finished festival lanterns, and partially assembled lantern-making pieces. |
| 11 | Leaves, mushrooms, fireflies, garden stones, tiny bridge details, vine curls, water ripples, dragon footprints, lily-pad shapes, moss patches, path-edge nature treasures, and small flower clusters near the Firefly Flower Charm. |
| 13 | Trail markers, dragon footprints, mossy rocks, switchback path stones, small cave-mouth hints, ribbon scraps, weathered signposts with no readable text, ridge plants, and mountain path details. |
| 15 | Cave pools, reflections, carved stones, glowing cracks, hidden dragon symbols, echo marks, ledges, smooth rock shelves, cave shadows, small festival keepsakes, and the Echo Glow Gem as the only required gem focus. |
| 17 | Keys, carved stones, vines, old symbols, glowing cracks, moss patches, door hinges, keyholes, handles, dragon-scale patterns, side stones, tiny festival lanterns along the approach, and hidden clue objects around the ancient door. |
| 19 | Market goods, baskets, tiny trinkets, treats, fabric pouches, painted tokens, souvenir boxes, small dragon-made objects, counter displays, stall shelves, hand-carried parcels, and festival lantern strings over the stalls. |
| 21 | Festival lantern strings, lantern garlands, glowing lantern stands, musical objects, friendly dragon details, treat tables, celebration arches, pennants, drums, tiny horns, side stalls, dance-path details, and one Look-a-head Telescope as the main lookout focus. |

### Story/List Source Blocks

#### Page 2 / Facing Page 3

Title: `Ember's First Clue`

Story: `Ember woke to a strange quiet glow. The Sparkleflame Festival lights should have been twinkling, but his little cottage felt dim and sleepy. Near his satchel, a curl of sparkle pointed toward a hidden map.`

Mission line: `Can you help Ember find the Tiny Sparkleflame Map?`

Checklist rule: Tiny Sparkleflame Map first, then 10 main printed finds and 5-15 bonus finds from approved page 3 art.

Icon plan: warm cottage and sparkle-map mini icons.

Layout: Ember vignette on the left, looking and pointing right toward page 3; story at top; checklist in a rounded panel flowing toward the right edge.

Seek image placement note: Place cottage objects on shelves, tables, hooks, rugs, satchel-side surfaces, and decoration clusters. Keep any floor route from Ember to the clue readable.

#### Page 4 / Facing Page 5

Title: `The Worried Village`

Story: `Ember hurried into Dragon Village Square, where ribbons drooped and lanterns blinked sleepily. The little dragons whispered that the festival welcome bell had lost its bright ring. Ember lifted his chin and listened for a tiny golden shimmer.`

Mission line: `Can you help Ember find the Golden Welcome Bell?`

Checklist rule: Golden Welcome Bell first, then 10 main printed finds and 5-15 bonus finds from approved page 5 art.

Icon plan: bells, ribbons, village stones, and festival-trim icons.

Layout: festival banner heading, story box upper left, checklist ribbon along the lower half leading right.

Seek image placement note: Include friendly original dragon villagers and festival-goers doing simple secondary actions, such as carrying a basket, browsing a stall, setting out treats, or waving near Ember. Cluster baskets, flags, festival lantern strings, decorated lantern stands, treat trays, ribbon spools, small instruments, wrapped parcels, wooden toys, pouches, buttons, painted path stones, and village props on stalls, posts, walls, hooks, shelves, and side tables. Hide the single Golden Welcome Bell as the special mission item; avoid adding other similar bells that could make the answer ambiguous. Keep the village-square walking area mostly open. Use cozy festival lantern shapes, not modern street-lamp or street-lantern shapes.

#### Page 6 / Facing Page 7

Title: `Sugar-Star Sparkles`

Story: `The bakery smelled like warm cupcakes, but the frosting stars were dull and quiet. Ember peeked between jars, trays, and sugar crystals while a soft glow twinkled near the treats. One special sugar star could help brighten the festival again.`

Mission line: `Can you help Ember find the Glowing Sugar Star?`

Checklist rule: Glowing Sugar Star first, then 10 main printed finds and 5-15 bonus finds from approved page 7 art.

Icon plan: cupcake, spoon, berry, jar, and sugar-star icons.

Layout: bakery parchment card, small Ember/helper cue on the left pointing right, checklist bubbles below the story.

Seek image placement note: Put cupcakes, cookies, spoons, mixing bowls, berries, frosting, trays, recipe cards with no readable text, cooling racks, and bakery cloths on bakery counters, shelves, and treat stands. Keep floor and customer path areas lightly detailed.

#### Page 8 / Facing Page 9

Title: `The Lantern Maker's Secret`

Story: `Ember followed a warm flicker into the lantern maker's workshop. Paper lanterns, ribbons, and tiny gears covered every table. Somewhere inside the cozy clutter, a baby flame lantern waited to wake the lights.`

Mission line: `Can you help Ember find the Baby Flame Lantern?`

Checklist rule: Baby Flame Lantern first, then 10 main printed finds and 5-15 bonus finds from approved page 9 art.

Icon plan: lantern, gear, ribbon, spark jar, and flame icons.

Layout: lantern-border underlay, checklist shelf on the lower right, Ember on the lower-left gesturing right.

Seek image placement note: Place lantern frames, festival lantern strings, safe tools, wick holders, folded paper shades, tiny gears, workbench clamps, hooks, shelves, bulb shapes, paper decorations, finished festival lanterns, and partially assembled lantern-making pieces on worktables and hanging lines. Hide the Baby Flame Lantern as the special mission item within a lively lantern-making scene. Keep the workshop walkway and Ember's movement path mostly clear.

#### Page 10 / Facing Page 11

Title: `Across the Garden Bridge`

Story: `A trail of fireflies led Ember over the little garden bridge. Flowers nodded in the glow, and the path to Dragon Mountain shimmered beyond the leaves. Ember spotted a tiny charm hiding among the petals.`

Mission line: `Can you help Ember find the Firefly Flower Charm?`

Checklist rule: Firefly Flower Charm first, then 10 main printed finds and 5-15 bonus finds from approved page 11 art.

Icon plan: flower, leaf, mushroom, pebble, bridge, and firefly icons.

Layout: garden vine frame; checklist follows a soft trail from left to right.

Seek image placement note: Keep the bridge and path readable. Place leaves, mushrooms, fireflies, garden stones, bridge details, water edges, vine curls, lily-pad shapes, moss patches, and path-edge nature treasures around the scene. Keep small flower clusters near the Firefly Flower Charm rather than across the whole page.

#### Page 12 / Facing Page 13

Title: `Pebbles Up the Mountain`

Story: `Ember climbed the sparkling mountain path, stepping carefully between glowing stones. The trail twisted and twinkled as if it wanted to tell him where to go next. One shimmer stone looked more magical than all the rest.`

Mission line: `Can you help Ember find the Shimmer Trail Stone?`

Checklist rule: Shimmer Trail Stone first, then 10 main printed finds and 5-15 bonus finds from approved page 13 art.

Icon plan: pebble, trail marker, flower, crystal, and ribbon scrap icons.

Layout: mountain path motif; pebble icon row arcs toward the right edge.

Seek image placement note: Keep the mountain path readable but allow fair hiding in the midground and background along rock clusters, trail edges, switchbacks, and moss patches. Use trail markers, dragon footprints, ridge plants, ribbon scraps, weathered signposts with no readable text, and mountain path details around the scene. Hide the Shimmer Trail Stone as the special mission item without surrounding it with many similar glowing stones.

#### Page 14 / Facing Page 15

Title: `Echoes in the Crystal Cave`

Story: `Inside the cavern, Ember heard little echoes bounce from crystal to crystal. Blue, pink, and golden lights danced over the cave walls. A bright echo gem flashed once, then tucked itself into the sparkle.`

Mission line: `Can you help Ember find the Echo Glow Gem?`

Checklist rule: Echo Glow Gem first, then 10 main printed finds and 5-15 bonus finds from approved page 15 art.

Icon plan: crystal, gem, cave pool, bell, carved stone, and sparkle icons.

Layout: crystal frame; story box upper-left, checklist pockets stepping right.

Seek image placement note: Cluster cave pools, reflections, carved stones, echo marks, ledges, smooth rock shelves, cave shadows, hidden dragon symbols, and small festival keepsakes along cave walls, ledges, poolsides, and glowing cracks. Hide the Echo Glow Gem as the special mission item without surrounding it with many similar gems.

#### Page 16 / Facing Page 17

Title: `The Ancient Dragon Door`

Story: `At the end of the mountain path, Ember found an old dragon door wrapped in vines. The door hummed softly, but it would not open without the right key. Ember's satchel glowed as if the next clue was close.`

Mission line: `Can you help Ember find the Dragon Door Key?`

Checklist rule: Dragon Door Key first, then 10 main printed finds and 5-15 bonus finds from approved page 17 art.

Icon plan: key, vine, carved stone, lantern, crystal shard, and dragon-scale icons.

Layout: ancient-door parchment; Ember lower-left pointing right, checklist in keyhole-shaped markers.

Seek image placement note: Keep the doorway threshold and approach readable while allowing fair hiding around the midground door frame, wall, side stones, vines, hinges, keyholes, handles, carvings, moss patches, dragon-scale patterns, and tiny festival lanterns along the side stones. Hide the Dragon Door Key as the special mission item without adding many similar keys nearby.

#### Page 18 / Facing Page 19

Title: `Market Lights Waking Up`

Story: `The festival market was almost ready, but the stalls still needed a little Sparkleflame magic. Ember checked baskets, jars, ribbons, and tiny treasures while the crowd began to smile again. A small market token could help wake the lights.`

Mission line: `Can you help Ember find the Sparkle Market Token?`

Checklist rule: Sparkle Market Token first, then 10 main printed finds and 5-15 bonus finds from approved page 19 art.

Icon plan: basket, jar, bell, ribbon, gem, treat, and token icons.

Layout: market stall label card; checklist tokens run toward the right side.

Seek image placement note: Keep the market aisle/walkway readable while allowing fair hiding in foreground, midground, and background stall areas. Cluster baskets, tiny trinkets, treats, fabric pouches, painted tokens, souvenir boxes, small dragon-made objects, counter displays, stall shelves, hand-carried parcels, and festival lantern strings on stalls, hooks, baskets, and counter edges.

#### Page 20 / Facing Page 21

Title: `The Festival Shines`

Story: `Ember reached the bright festival finale just as the last lanterns began to glow. Music, treats, and friendly dragon cheers filled the valley. The festival was shining again, and the Look-a-head Telescope waited to show Ember where his next adventure would begin.`

Mission line: `Can you help Ember find the Look-a-head Telescope?`

Checklist rule: Look-a-head Telescope first, then 10 main printed finds and 5-15 bonus finds from approved page 21 art.

Icon plan: telescope, sparkle, bell, banner, treat, gem, and music icons.

Layout: celebration arch; checklist follows a lookout ribbon flowing right.

Seek image placement note: Keep the central celebration path readable while allowing fair hiding around the arch, stalls, side tables, hanging decorations, midground celebration details, and background festival structures. Place festival lantern strings, lantern garlands, glowing lantern stands, musical objects, friendly dragon details, treat tables, pennants, drums, tiny horns, side stalls, and dance-path details around the scene. Hide the Look-a-head Telescope as the special mission item; other festival lanterns may appear, but no other telescope or telescope-like finder should appear.

### Pages 22-23 Recap / Reward Spread

Show Ember proudly celebrating the 10 recovered mission items:

Tiny Sparkleflame Map; Golden Welcome Bell; Glowing Sugar Star; Baby Flame Lantern; Firefly Flower Charm; Shimmer Trail Stone; Echo Glow Gem; Dragon Door Key; Sparkle Market Token; Look-a-head Telescope.

Display the 10 recovered mission items on separate small Sparkleflame Festival pedestals, like a cheerful reward exhibit. Use warm wood or smooth stone stands, ribbon wraps, lantern glow, cloth toppers, and tiny festival accents. Split the display into five pedestals on the left page and five pedestals on the right page. Keep every pedestal and mission item fully outside the center gutter/crease safety lane. Ember may celebrate from one page, but keep Ember's face, eyes, horns, scarf knot, satchel, tail, and main body entirely on one printed page and away from the crease.

Do not show answer locations. This is a reward spread, not an answer key.

### Page 24 Closing / Teaser Source

Title: `Where Will Ember Search Next?`

Closing text: `Thanks to you, the Sparkleflame Festival shines again! But Ember has spotted a new little mystery… a glowing forest leaf peeking from his satchel.`

Visual source: Ember under warm festival lights with his satchel, smiling at a small glowing forest leaf clue. The page should feel like a gentle celebration and a soft bridge toward the enchanted forest adventure.

Text rule: Render the title and closing text exactly. Do not add extra teaser words, fake text, page numbers, labels, or answer marks. If exact generated text fails, use no-text art and add the text in layout.

## Ember Book 2 10-Spread Plan

Title: **Ember and the Enchanted Forest Search**.

### Production Order

Printed order is story/list left page then seek image right page. Production order is seek image first, then story/list page after the find list is approved:

```text
1, 3, 2, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 15, 14, 17, 16, 19, 18, 21, 20, 22-23, 24
```

### Page Map

| Spread | Story/List Page | Seek Page | Zone | Seek Location | Mission Item | Layout Variant |
|---:|---:|---:|:---|:---|:---|:---|
| 1 | 2 | 3 | Forest Edge and Mushroom Glen | Ember's Forest Leaf Trail | Leaflight Trail Marker | Leaf path underlay; Ember points right |
| 2 | 4 | 5 | Forest Edge and Mushroom Glen | Mushroom Lantern Meadow | Mushroom Glow Lantern | Mushroom cap heading; lantern checklist |
| 3 | 6 | 7 | Forest Edge and Mushroom Glen | Fairy Door Hollow | Tiny Acorn Door Key | Fairy-door parchment; acorn icon row |
| 4 | 8 | 9 | Forest Edge and Mushroom Glen | Hootiepuff's Nest Lookout | Moonfeather Clue | Nest vignette; feather checklist panel |
| 5 | 10 | 11 | Treetop Village and Woodland Paths | Treetop Teacup Village | Leafcup Tea Token | Treetop rail motif; teacup icons |
| 6 | 12 | 13 | Treetop Village and Woodland Paths | Firefly Fern Path | Firefly Fern Star | Fern trail layout; glow icons |
| 7 | 14 | 15 | Treetop Village and Woodland Paths | Rainleaf Pond | Dewdrop Lily Pearl | Pond ripple border; pearl bubbles |
| 8 | 16 | 17 | Starlit Deep Forest and Ancient Grove | Old Story Tree Library | Leaf Scroll Ribbon | Story-tree parchment; scroll icons |
| 9 | 18 | 19 | Starlit Deep Forest and Ancient Grove | Ancient Heartwood Door | Heartwood Door Gem | Heartwood frame; gem markers |
| 10 | 20 | 21 | Starlit Deep Forest and Ancient Grove | Great Forest Glow Grove | Enchanted Forest Crown Leaf | Glow-grove arch; leaf lantern checklist |

### Broad Searchable Categories

These rows are source/planning guidance only. Do not copy non-mission item names from these rows into final seek-image prompts. Final seek-image prompts must name only the mission item and request 49 additional unique hidden objects by traits.

| Seek Page | Broad Searchable Categories |
|---:|:---|
| 3 | Leafy trail markers, glowing leaves, acorns, mushrooms, berries, twig signs, mossy stones, tiny forest clue objects, soft sparkle details. |
| 5 | Glowing mushrooms, lanterns, fern curls, berry clusters, snails, moss, tiny doors, dew drops, leaf decorations, warm forest lights. |
| 7 | Fairy doors, acorn keys, roots, leaf hinges, tiny bells, mushrooms, moss patches, seed pods, blank tiny signs, curled vines. |
| 9 | Nest materials, feathers, moon shapes, twigs, berries, tiny lookout objects, soft blankets, leaf lanterns, starry forest details. |
| 11 | Teacups, leaf tables, acorn stools, ladders, tiny windows, treehouse details, berry treats, hanging lanterns, little woodland props. |
| 13 | Fireflies, fern leaves, glow stars, moss stones, flowers, twig arches, path markers, dew beads, tiny hidden forest symbols. |
| 15 | Lily pads, pearls, raindrop leaves, pond ripples, smooth stones, tiny boats, dragonfly-like fantasy details, flowers, water sparkles. |
| 17 | Leaf scrolls, ribbons, books with no readable text, root shelves, seed jars, lanterns, old story objects, bark patterns, cozy library details. |
| 19 | Heartwood carvings, door gems, vines, bark patterns, lanterns, leaf locks, mossy stones, ancient symbols, glowing cracks, forest keys. |
| 21 | Glowing trees, crown leaves, lanterns, mushrooms, berries, flowers, leaf charms, forest friends, sparkle paths, celebration nature details. |

### Story/List Source Blocks

#### Page 2 / Facing Page 3

Title: `The Leaflight Path`

Story: `The glowing forest leaf led Ember to a quiet trail at the edge of the enchanted woods. The path should have sparkled, but many of its little markers had gone dim. Ember stepped closer and saw one marker still blinking softly.`

Mission line: `Can you help Ember find the Leaflight Trail Marker?`

Checklist rule: Leaflight Trail Marker first, then 10 main printed finds and 5-15 bonus finds from approved page 3 art.

Icon plan: leaf, trail marker, mushroom, berry, twig, and sparkle icons.

Layout: leaf path underlay; Ember lower-left pointing right along the trail.

#### Page 4 / Facing Page 5

Title: `Lanterns Under the Mushrooms`

Story: `Ember wandered into a meadow of giant cozy mushrooms. Tiny lanterns should have lit the path, but only a few glowed through the mist. A mushroom lantern shimmered somewhere among the caps and stems.`

Mission line: `Can you help Ember find the Mushroom Glow Lantern?`

Checklist rule: Mushroom Glow Lantern first, then 10 main printed finds and 5-15 bonus finds from approved page 5 art.

Icon plan: mushroom, lantern, fern, berry, snail, and glow icons.

Layout: mushroom cap heading; checklist lanterns hang toward the right edge.

#### Page 6 / Facing Page 7

Title: `The Tiny Acorn Door`

Story: `A row of fairy doors peeked from the roots of an old tree. Ember heard a tiny knock, but the smallest door would not open. Somewhere nearby, an acorn key waited in the leaves.`

Mission line: `Can you help Ember find the Tiny Acorn Door Key?`

Checklist rule: Tiny Acorn Door Key first, then 10 main printed finds and 5-15 bonus finds from approved page 7 art.

Icon plan: acorn, key, tiny door, leaf, root, and bell icons.

Layout: fairy-door parchment; Luma or Ember may look right toward the seek page.

Character reference line: If Luma appears, use Luma Leafwhisk reference images `Luma_Leafwhisk-001`, `Luma_Leafwhisk-002`, and `Luma_Leafwhisk-003`; always use Ember reference images `Ember-001`, `Ember-002`, and `Ember-003` for Ember.

#### Page 8 / Facing Page 9

Title: `Hootiepuff's Lookout`

Story: `High in a cozy nest lookout, Hootiepuff blinked at the dim forest below. Ember climbed up beside him and followed a moonlit feather trail. One clue feather shone brighter than the rest.`

Mission line: `Can you help Ember find the Moonfeather Clue?`

Checklist rule: Moonfeather Clue first, then 10 main printed finds and 5-15 bonus finds from approved page 9 art.

Icon plan: feather, nest, moon, twig, berry, and owl-like puff icons.

Layout: nest vignette on the left; Hootiepuff and Ember look right; feather checklist panel.

Character reference line: Use HootiePuff reference images `HootiePuff-001`, `HootiePuff-002`, and `HootiePuff-003` for Hootiepuff; use Ember reference images `Ember-001`, `Ember-002`, and `Ember-003` for Ember.

#### Page 10 / Facing Page 11

Title: `Tea in the Treetops`

Story: `The treetop village welcomed Ember with tiny cups, leafy tables, and warm windows. The villagers whispered that a leafcup tea token could wake the next path. Ember searched the branches for a little cup-shaped shine.`

Mission line: `Can you help Ember find the Leafcup Tea Token?`

Checklist rule: Leafcup Tea Token first, then 10 main printed finds and 5-15 bonus finds from approved page 11 art.

Icon plan: teacup, leaf, ladder, acorn, window, and token icons.

Layout: treetop rail motif; checklist climbs gently toward the right.

#### Page 12 / Facing Page 13

Title: `Fireflies in the Ferns`

Story: `A fern path twinkled with tiny fireflies as Ember followed the leaflight deeper into the woods. The lights blinked in patterns like little stars. One fern star seemed to be waiting for him to find it.`

Mission line: `Can you help Ember find the Firefly Fern Star?`

Checklist rule: Firefly Fern Star first, then 10 main printed finds and 5-15 bonus finds from approved page 13 art.

Icon plan: fern, firefly, star, moss stone, flower, and glow icons.

Layout: fern trail layout; icons dot the page from left to right.

#### Page 14 / Facing Page 15

Title: `Ripples at Rainleaf Pond`

Story: `Ember reached a pond where raindrop leaves floated like tiny boats. The water shimmered with soft green light. Near the lily pads, a dewdrop pearl waited for a careful finder.`

Mission line: `Can you help Ember find the Dewdrop Lily Pearl?`

Checklist rule: Dewdrop Lily Pearl first, then 10 main printed finds and 5-15 bonus finds from approved page 15 art.

Icon plan: lily, pearl, raindrop, frog-like fantasy friend, leaf, and ripple icons.

Layout: pond ripple border; pearl bubbles hold checklist items.

#### Page 16 / Facing Page 17

Title: `The Old Story Tree`

Story: `Deep in the forest, Ember found a story tree with shelves tucked between its roots. Old leaf scrolls rustled even without wind. A ribbon from one special scroll could guide the forest glow home.`

Mission line: `Can you help Ember find the Leaf Scroll Ribbon?`

Checklist rule: Leaf Scroll Ribbon first, then 10 main printed finds and 5-15 bonus finds from approved page 17 art.

Icon plan: scroll, ribbon, leaf, book, root, lantern, and seed icons.

Layout: story-tree parchment; checklist sits like small scroll tabs leading right.

#### Page 18 / Facing Page 19

Title: `The Heartwood Door`

Story: `The ancient heartwood door stood quiet beneath the oldest branches. Ember placed a paw on the bark and felt a gentle heartbeat of magic. A small gem was the key to opening the grove.`

Mission line: `Can you help Ember find the Heartwood Door Gem?`

Checklist rule: Heartwood Door Gem first, then 10 main printed finds and 5-15 bonus finds from approved page 19 art.

Icon plan: heartwood, gem, vine, carved leaf, lantern, and bark icons.

Layout: heartwood frame; Ember left-side gesture points right toward the door scene.

#### Page 20 / Facing Page 21

Title: `The Forest Glows Again`

Story: `Ember stepped into the Great Forest Glow Grove as the trees began to shine. Leaves, lanterns, and tiny woodland cheers filled the air. One crown leaf held the last bit of enchanted forest light.`

Mission line: `Can you help Ember find the Enchanted Forest Crown Leaf?`

Checklist rule: Enchanted Forest Crown Leaf first, then 10 main printed finds and 5-15 bonus finds from approved page 21 art.

Icon plan: crown leaf, lantern, mushroom, berry, star, flower, and sparkle icons.

Layout: glow-grove arch; leaf lantern checklist flows right.

### Pages 22-23 Recap / Reward Spread

Show Ember proudly celebrating the 10 recovered mission items:

Leaflight Trail Marker; Mushroom Glow Lantern; Tiny Acorn Door Key; Moonfeather Clue; Leafcup Tea Token; Firefly Fern Star; Dewdrop Lily Pearl; Leaf Scroll Ribbon; Heartwood Door Gem; Enchanted Forest Crown Leaf.

Display the 10 recovered mission items on separate small Enchanted Forest pedestals, like a cheerful reward exhibit. Use mossy stones, carved roots, leaves, tiny mushroom accents, soft green glow, and rounded forest details. Split the display into five pedestals on the left page and five pedestals on the right page. Keep every pedestal and mission item fully outside the center gutter/crease safety lane. Ember may celebrate from one page, but keep Ember's face, eyes, horns, scarf knot, satchel, tail, and main body entirely on one printed page and away from the crease.

Do not show answer locations. This is a reward spread, not an answer key.

### Page 24 Closing / Teaser Source

Title: `Where Will Ember Search Next?`

Closing text: `Thanks to you, the enchanted forest glows again! But Ember has found another tiny clue… a soft castle shimmer glowing beyond the leaves.`

Visual source: Ember at the edge of the restored forest glow, looking toward a distant friendly castle shimmer or tiny crystal-tower glow beyond the trees. The page should close Book 2 warmly and point gently toward the crystal castle adventure without showing answer locations.

Text rule: Render the title and closing text exactly. Do not add extra teaser words, fake text, page numbers, labels, or answer marks. If exact generated text fails, use no-text art and add the text in layout.

## Ember Book 3 10-Spread Plan

Title: **Ember and the Crystal Castle Search**.

Book 3 material rule: In Crystal Castle prompts, make the castle walls, towers, main architecture, roads, paths, steps, floors, and courtyard surfaces stone, not crystal. Castle roofs and windows should be crystal. Crystal accents are allowed as architecture, decor, and page flavor, but final seek-image prompts must not list exact extra crystal objects as hidden targets beyond the mission item. Avoid gem-heavy clutter: no loose gem/crystal scatter, piles, or path-filler sparkles as default scene filler. The 49 unnamed additional hidden objects should lean majority non-crystal by material cue: wood, plant/organic, metal, fabric, paper, glass, food, and stone should outnumber crystal/gem cues on each seek page.

Book 3 non-crystal search rule: Every Book 3 seek-image prompt should request a rich majority of non-crystal material cues among the 49 unnamed additional hidden objects without naming those objects individually. Use broad material, shape, surface, and placement guidance instead of exact non-mission item names. Do not include signs as searchable props. Crystal should feel like accent material and architecture, not the whole search vocabulary.

Book 3 helper rule: Every Book 3 seek-image prompt should show Ember exactly once as the child's visible guide/helper, never as a hidden target, and should directly name Ember reference images `Ember-001`, `Ember-002`, and `Ember-003`. Gemma Glint is the approved pink crystal castle guide, but she is page-specific: use Gemma only for Gemma's Guide Nook, Book 3 seek page 9 / paired story-list page 8, and directly name Gemma reference images `Gemma_Glint-001`, `Gemma_Glint-002`, and `Gemma_Glint-003`, unless the user explicitly requests otherwise. Other Book 3 seek scenes may include friendly castle helpers and tiny original fantasy creatures in the earlier gate-prompt style: preparing the castle for Ember's arrival, polishing crystal trim, carrying little baskets of gems, arranging glowing flowers, hanging jewel lanterns, sweeping stone steps, and adding small magical visual jokes such as a tiny helper polishing the same gem twice, a lantern glowing in rainbow colors, a shy creature peeking from behind a stone planter, or a basket of gems gently wobbling. Keep helpers secondary and organized so they add life without covering hidden objects.

### Production Order

Printed order is story/list left page then seek image right page. Production order is seek image first, then story/list page after the find list is approved:

```text
1, 3, 2, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 15, 14, 17, 16, 19, 18, 21, 20, 22-23, 24
```

### Page Map

| Spread | Story/List Page | Seek Page | Zone | Seek Location | Mission Item | Layout Variant |
|---:|---:|---:|:---|:---|:---|:---|
| 1 | 2 | 3 | Crystal Gate and Courtyard | Crystal Castle Gate | Crystal Castle Key | Crystal gate underlay; Ember points right |
| 2 | 4 | 5 | Castle Gate and Courtyard | Stained Glass Welcome Hall | Rainbow Glass Star | Stained-glass border; star icons |
| 3 | 6 | 7 | Castle Gate and Courtyard | Royal Pet Courtyard | Silver Paw Charm | Paw-print frame; charm bubbles |
| 4 | 8 | 9 | Crystal Gate and Courtyard | Gemma's Guide Nook | Pink Guide Gem | Gem guide card; Gemma/Ember cue right |
| 5 | 10 | 11 | Castle Rooms and Secret Halls | Treasure Map Library | Golden Map Lens | Library parchment; lens icons |
| 6 | 12 | 13 | Castle Rooms and Secret Halls | Moonlit Mirror Hall | Moon Mirror Charm | Mirror frame; moon icons |
| 7 | 14 | 15 | Castle Rooms and Secret Halls | Kitchen of Crystal Treats | Crystal Berry Tart | Kitchen card; treat icons |
| 8 | 16 | 17 | Castle Rooms and Secret Halls | Secret Door Gallery | Hidden Door Button | Door-panel layout; button markers |
| 9 | 18 | 19 | Rainbow Towers and Treasure Chambers | Grand Treasure Chamber | Treasure Glow Orb | Treasure arch; orb icons |
| 10 | 20 | 21 | Rainbow Towers and Treasure Chambers | Crystal Castle Finale | Crystal Crown Lantern | Crystal celebration arch; lantern icons |

### Broad Searchable Categories

These rows are source/planning guidance only. Do not copy non-mission item names from these rows into final seek-image prompts. Final seek-image prompts must name only the mission item and request 49 additional unique hidden objects by traits.

| Seek Page | Broad Searchable Categories |
|---:|:---|
| 3 | Crystal gate details, keys, cloth banners, fabric ribbons, brass bells, paper guide cards, rounded stones, stone planters, flower pots, tiny tools, baskets, flags, crystal lanterns, crystal vines, welcoming courtyard objects. |
| 5 | Crystal window shapes, rainbow light patches, cloth banners, fabric ribbons, brass bells, flower pots, glass tiles, crystal rose decor, small castle props, warm welcome objects. |
| 7 | Paw charms, pet cushions, tiny toys, bowls, collars, pawprints, flowers, silver details, soft blankets, baskets, ribbons, friendly courtyard props. |
| 9 | Pink Guide Gem, paper guide cards, folded maps with no readable text, shelves, ribbons, tiny keys, books, baskets, brass bells, crystal lantern, cozy nook objects, castle clue details. |
| 11 | Treasure maps with no readable text, lenses, books, scrolls, compasses, bookmarks, shelf objects, brass lamps, tiny tools, ribbon tabs, crystal bookmark, crystal desk light, lanterns, library clue pieces. |
| 13 | Mirrors, moon shapes, fabric ribbons, cloth curtains, brass hooks, polished handles, small charms, crescent decorations, reflection highlights, crystal mirror frames, polished floors, castle details. |
| 15 | Berries, bowls, spoons, plates, jars, kitchen cloths, warm ovens, shiny counters, mixing tools, baskets, recipe cards with no readable text, crystal jars, crystal sugar bowl, tiny dessert decorations. |
| 17 | Door buttons, knobs, hinges, keyholes, ribbons, secret marks, small panels, handles, brass plates, tiny tools, castle gallery objects, crystal knobs. |
| 19 | Orbs, treasure chests, coins, crowns, ribbons, cloth pouches, keys, locks, scales, safe rounded treasure props, glow beads, crystal lanterns, shiny castle details. |
| 21 | Crown lanterns, cloth ribbons, bells, stars, celebration banners, flags, flower garlands, drums, tiny instruments, magical path objects, crystal roof and window highlights, crystal wind chimes, castle glow details. |

### Story/List Source Blocks

#### Page 2 / Facing Page 3

Title: `The Castle Key Glows`

Story: `The crystal castle rose ahead of Ember, with stone towers, crystal roof caps, and windows catching soft rainbow light. A few friendly castle helpers swept the steps and tended flowers near the welcoming gate. Ember's satchel gave a tiny hopeful glow.`

Mission line: `Can you help Ember find the Crystal Castle Key?`

Checklist rule: Crystal Castle Key first, then 10 main printed finds and 5-15 bonus finds from approved page 3 art.

Icon plan: crystal key, brass bell, flower planter, cloth banner, basket, path stone, crystal lantern, and light icons.

Layout: crystal gate underlay; Ember left-side pose points right; a few small castle helpers prepare the gate scene.

#### Page 4 / Facing Page 5

Title: `Colors in the Welcome Hall`

Story: `Inside the castle, the crystal windows sent stained-glass colors dancing across the floor. Ember watched rainbow light move over banners, a crystal rose, and tiny welcome decorations. A glass star flickered somewhere in the glow.`

Mission line: `Can you help Ember find the Rainbow Glass Star?`

Checklist rule: Rainbow Glass Star first, then 10 main printed finds and 5-15 bonus finds from approved page 5 art.

Icon plan: glass star, cloth banner, crystal rose, window, ribbon, brass bell, and light icons.

Layout: stained-glass border; checklist stars lead toward the right page.

#### Page 6 / Facing Page 7

Title: `Pawprints in the Courtyard`

Story: `The royal pet courtyard was full of tiny tracks, soft cushions, and playful castle pets. Ember giggled as a silver glint moved between the pawprints. A charm shaped like a paw was hiding close by.`

Mission line: `Can you help Ember find the Silver Paw Charm?`

Checklist rule: Silver Paw Charm first, then 10 main printed finds and 5-15 bonus finds from approved page 7 art.

Icon plan: paw, cushion, collar charm, silver bowl, toy, flower, and blanket icons.

Layout: paw-print frame; checklist bubbles step right.

#### Page 8 / Facing Page 9

Title: `Gemma's Helpful Nook`

Story: `Gemma Glint waved Ember into a cozy guide nook filled with maps, a crystal lantern, and castle clues. She pointed to a pink sparkle that bounced from shelf to shelf. Ember knew the next guide gem would show the way.`

Mission line: `Can you help Ember find the Pink Guide Gem?`

Checklist rule: Pink Guide Gem first, then 10 main printed finds and 5-15 bonus finds from approved page 9 art.

Icon plan: pink gem, small map, shelf, ribbon, brass bell, crystal lantern, and guide-card icons.

Layout: Gemma/Ember cue on the left, both looking right; gem guide card checklist.

Character reference line: Use Gemma Glint reference images `Gemma_Glint-001`, `Gemma_Glint-002`, and `Gemma_Glint-003` for Gemma; use Ember reference images `Ember-001`, `Ember-002`, and `Ember-003` for Ember.

#### Page 10 / Facing Page 11

Title: `Maps in the Library`

Story: `The castle library smelled like paper, polish, and old magic. Treasure maps curled across the tables near a little crystal desk light, but one golden lens could reveal the hidden route. Ember followed the warm light between the shelves.`

Mission line: `Can you help Ember find the Golden Map Lens?`

Checklist rule: Golden Map Lens first, then 10 main printed finds and 5-15 bonus finds from approved page 11 art.

Icon plan: lens, map, book, scroll, compass, brass lamp, crystal bookmark, and crystal desk-light icons.

Layout: library parchment; checklist items sit in small lens circles.

#### Page 12 / Facing Page 13

Title: `Moonlight in the Mirrors`

Story: `In the mirror hall, Ember saw moonlit reflections in every direction. Some reflections were silly, and some seemed to hide tiny clues. A moon mirror charm glowed just enough to be found.`

Mission line: `Can you help Ember find the Moon Mirror Charm?`

Checklist rule: Moon Mirror Charm first, then 10 main printed finds and 5-15 bonus finds from approved page 13 art.

Icon plan: moon, mirror, ribbon, brass hook, crystal frame, star, and reflection icons.

Layout: mirror frame; checklist curves right like reflected moonlight.

#### Page 14 / Facing Page 15

Title: `Treats in the Crystal Kitchen`

Story: `The castle kitchen was busy with bright bowls, spoons, crystal jars, and a crystal sugar bowl beside berry-bright desserts. Ember sniffed the sweet air and spotted tiny lights near the treat trays. One crystal berry tart was part of the castle's secret celebration.`

Mission line: `Can you help Ember find the Crystal Berry Tart?`

Checklist rule: Crystal Berry Tart first, then 10 main printed finds and 5-15 bonus finds from approved page 15 art.

Icon plan: tart, spoon, bowl, berry, basket, crystal jar, crystal sugar bowl, and plate icons.

Layout: kitchen recipe-card style; checklist tiles flow toward the seek page.

#### Page 16 / Facing Page 17

Title: `The Gallery of Secret Doors`

Story: `Ember padded into a hallway where every door looked a little different. Some had curls, some had crystal knobs, and some had tiny mystery marks. One hidden button could open the next part of the castle.`

Mission line: `Can you help Ember find the Hidden Door Button?`

Checklist rule: Hidden Door Button first, then 10 main printed finds and 5-15 bonus finds from approved page 17 art.

Icon plan: button, door, brass plate, crystal knob, hinge, keyhole, and ribbon icons.

Layout: door-panel underlay; checklist markers point right.

#### Page 18 / Facing Page 19

Title: `The Grand Treasure Glow`

Story: `The grand treasure chamber glowed with friendly castle magic. Ember did not need the biggest crown or coin; he needed the one orb glowing with the right kind of light. It pulsed softly somewhere among the treasure.`

Mission line: `Can you help Ember find the Treasure Glow Orb?`

Checklist rule: Treasure Glow Orb first, then 10 main printed finds and 5-15 bonus finds from approved page 19 art.

Icon plan: orb, coin, crown, cloth pouch, crystal lantern, chest, ribbon, and light icons.

Layout: treasure arch; orb icons lead the eye right.

#### Page 20 / Facing Page 21

Title: `The Castle Celebration`

Story: `At last, Ember reached the crystal castle finale. Rainbow towers, crystal roofs, crystal windows, and crystal wind chimes gleamed, and the whole castle seemed ready to sing. A crystal crown lantern held the final glow of the adventure.`

Mission line: `Can you help Ember find the Crystal Crown Lantern?`

Checklist rule: Crystal Crown Lantern first, then 10 main printed finds and 5-15 bonus finds from approved page 21 art.

Icon plan: crown lantern, window, tower roof, ribbon, bell, flag, crystal wind chime, and star icons.

Layout: crystal celebration arch; Ember celebrates on the left while lantern icons string toward the right page.

### Pages 22-23 Recap / Reward Spread

Show Ember proudly celebrating the 10 recovered mission items:

Crystal Castle Key; Rainbow Glass Star; Silver Paw Charm; Pink Guide Gem; Golden Map Lens; Moon Mirror Charm; Crystal Berry Tart; Hidden Door Button; Treasure Glow Orb; Crystal Crown Lantern.

Display the 10 recovered mission items on separate small Crystal Castle pedestals, like a cheerful reward exhibit. Use smooth stone bases with crystal accents, polished edges, jewel glow, and a balanced mix of castle-stone structure plus magical crystal details. Split the display into five pedestals on the left page and five pedestals on the right page. Keep every pedestal and mission item fully outside the center gutter/crease safety lane. Ember may celebrate from one page, but keep Ember's face, eyes, horns, scarf knot, satchel, tail, and main body entirely on one printed page and away from the crease.

Do not show answer locations. This is a reward spread, not an answer key.

### Page 24 Closing Source

Title: `Ember's Next Little Mystery`

Closing text: `Thanks to you, the castle glows with color again! Ember closes his satchel with a happy smile, ready for whatever tiny mystery waits next.`

Visual source: Ember in a friendly stone castle celebration setting, with crystal roofs/windows, soft rainbow light, his satchel closed, and no specific next-book mission item. The page should feel complete while leaving room for future adventures.

Text rule: Render the title and closing text exactly. Do not add extra teaser words, fake text, page numbers, labels, or answer marks. If exact generated text fails, use no-text art and add the text in layout.

## Ember Book 4 10-Spread Plan

Title: **Ember and the Moonlit Seaside Search**.

Book 4 character rule: Every Book 4 seek-image prompt should show Ember exactly once as the child's visible guide/helper, never as a hidden target, and should directly name Ember reference images `Ember-001`, `Ember-002`, and `Ember-003`. Named supporting characters must come from canon only: Pebblekins, Hootiepuff, Luma Leafwhisk, and Elder Glowkeeper. Do not introduce new named seaside characters. Generic background seaside helpers or tiny non-recurring fantasy creatures may appear only as secondary scene life when the location calls for it.

### Production Order

Printed order is story/list left page then seek image right page. Production order is seek image first, then story/list page after the find list is approved:

```text
1, 3, 2, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 15, 14, 17, 16, 19, 18, 21, 20, 22-23, 24
```

### Shorthand And Preferred Files

| Shorthand / Request | Page Role | Printed Pages | Paired Page | Prompt Title / Location | Mission Item | Preferred Files |
|:---|:---|:---|:---|:---|:---|:---|
| `b4p1` / `Book 4 page 1` | title page | 1 | n/a | Ember and the Moonlit Seaside Search | title page | `B4P01.png` |
| `b4p3` / `b4p3 list 20-30` / `b4p2 md` / `b4p2` / `Book 4 page 3` | seek image + paired story/list | 3 then 2 | 2 story/list | The Moon Shell Map / Shellspark Beach | Moon Shell Map | `B4P03.png`, `B4P02.md`, `B4P02.png` |
| `b4p5` / `b4p5 list 20-30` / `b4p4 md` / `b4p4` / `Book 4 page 5` | seek image + paired story/list | 5 then 4 | 4 story/list | Lanterns in the Tide Pools / Tide Pool Lantern Cove | Pearl Glow Lantern | `B4P05.png`, `B4P04.md`, `B4P04.png` |
| `b4p7` / `b4p7 list 20-30` / `b4p6 md` / `b4p6` / `Book 4 page 7` | seek image + paired story/list | 7 then 6 | 6 story/list | Stars on the Sandbar / Starfish Sandbar | Tiny Starfish Compass | `B4P07.png`, `B4P06.md`, `B4P06.png` |
| `b4p9` / `b4p9 list 20-30` / `b4p8 md` / `b4p8` / `Book 4 page 9` | seek image + paired story/list | 9 then 8 | 8 story/list | The Driftwood Treasure Hut / Driftwood Treasure Hut | Driftwood Door Charm | `B4P09.png`, `B4P08.md`, `B4P08.png` |
| `b4p11` / `b4p11 list 20-30` / `b4p10 md` / `b4p10` / `Book 4 page 11` | seek image + paired story/list | 11 then 10 | 10 story/list | Treats by the Coral / Coral Cupcake Stand | Coral Berry Cupcake | `B4P11.png`, `B4P10.md`, `B4P10.png` |
| `b4p13` / `b4p13 list 20-30` / `b4p12 md` / `b4p12` / `Book 4 page 13` | seek image + paired story/list | 13 then 12 | 12 story/list | The Kelp Ribbon Trail / Kelp Ribbon Trail | Kelp Ribbon Clue | `B4P13.png`, `B4P12.md`, `B4P12.png` |
| `b4p15` / `b4p15 list 20-30` / `b4p14 md` / `b4p14` / `Book 4 page 15` | seek image + paired story/list | 15 then 14 | 14 story/list | The Seahorse Garden Bridge / Seahorse Garden Bridge | Seahorse Garden Key | `B4P15.png`, `B4P14.md`, `B4P14.png` |
| `b4p17` / `b4p17 list 20-30` / `b4p16 md` / `b4p16` / `Book 4 page 17` | seek image + paired story/list | 17 then 16 | 16 story/list | Stories in the Glow Reef / Glow Reef Library | Shimmer Scroll Shell | `B4P17.png`, `B4P16.md`, `B4P16.png` |
| `b4p19` / `b4p19 list 20-30` / `b4p18 md` / `b4p18` / `Book 4 page 19` | seek image + paired story/list | 19 then 18 | 18 story/list | Steps to the Moonbeam Light / Moonbeam Lighthouse Steps | Moonbeam Lens | `B4P19.png`, `B4P18.md`, `B4P18.png` |
| `b4p21` / `b4p21 list 20-30` / `b4p20 md` / `b4p20` / `Book 4 page 21` | seek image + paired story/list | 21 then 20 | 20 story/list | The Seaside Glows / Seaside Glow Finale | Seaside Crown Lantern | `B4P21.png`, `B4P20.md`, `B4P20.png` |
| `b4p22-23` / `Book 4 pages 22-23` | recap / reward spread | 22-23 | n/a | Recap / reward spread | all 10 mission items | `B4P22-23.png` |
| `b4p24` / `Book 4 page 24` | closing / teaser | 24 | n/a | Where Will Ember Search Next? | n/a | `B4P24.png` |

### Page Map

| Spread | Story/List Page | Seek Page | Zone | Seek Location | Mission Item | Layout Variant |
|---:|---:|---:|:---|:---|:---|:---|
| 1 | 2 | 3 | Moonlit Shore and Tide Pools | Shellspark Beach | Moon Shell Map | sandy path underlay; Ember points right |
| 2 | 4 | 5 | Moonlit Shore and Tide Pools | Tide Pool Lantern Cove | Pearl Glow Lantern | Pebblekins stone cue; pearl checklist bubbles |
| 3 | 6 | 7 | Moonlit Shore and Tide Pools | Starfish Sandbar | Tiny Starfish Compass | Hootiepuff moon cue; star icons |
| 4 | 8 | 9 | Moonlit Shore and Tide Pools | Driftwood Treasure Hut | Driftwood Door Charm | Pebblekins driftwood cue; charm checklist tags |
| 5 | 10 | 11 | Coral Village and Kelp Paths | Coral Cupcake Stand | Coral Berry Cupcake | coral-card layout; treat icons |
| 6 | 12 | 13 | Coral Village and Kelp Paths | Kelp Ribbon Trail | Kelp Ribbon Clue | Luma kelp cue; leaflike kelp icons |
| 7 | 14 | 15 | Coral Village and Kelp Paths | Seahorse Garden Bridge | Seahorse Garden Key | Luma garden cue; key bubbles |
| 8 | 16 | 17 | Glow Reef and Lighthouse Point | Glow Reef Library | Shimmer Scroll Shell | Luma reef cue; scroll-shell icons |
| 9 | 18 | 19 | Glow Reef and Lighthouse Point | Moonbeam Lighthouse Steps | Moonbeam Lens | Elder Glowkeeper lighthouse cue; lens markers |
| 10 | 20 | 21 | Glow Reef and Lighthouse Point | Seaside Glow Finale | Seaside Crown Lantern | Elder Glowkeeper finale cue; lantern checklist string |

### Broad Searchable Categories

These rows are source/planning guidance only. Do not copy non-mission item names from these rows into final seek-image prompts. Final seek-image prompts must name only the mission item and request 49 additional unique hidden objects by traits.

| Seek Page | Broad Searchable Categories |
|---:|:---|
| 3 | Shells, smooth stones, beach pails, tiny flags, star shapes, moon glows, sand swirls, driftwood pieces, small seaside clue objects. |
| 5 | Tide pools, pearls, lanterns, shells, sea glass, rounded rocks, tiny crabs, coral bits, water sparkles, cozy cove decorations. |
| 7 | Starfish, sand dollars, compass shapes, beach ribbons, little bottles with no readable text, shells, tiny anchors, soft wave patterns. |
| 9 | Driftwood planks, charms, rope loops, shells, jars, safe rounded tools, tiny treasure boxes, woven baskets, beach hut details. |
| 11 | Coral shapes, berry treats, bowls, spoons, cupcake trays, napkins, shells, tiny signs with no readable text, seaside bakery props. |
| 13 | Kelp ribbons, sea leaves, bubbles, shells, path stones, glow beads, tiny fish shapes, ribbon knots, soft underwater-garden details. |
| 15 | Seahorse shapes, garden keys, flowers, bridge stones, coral rails, shells, water plants, soft lanterns, tiny garden treasures. |
| 17 | Scroll shells, books with no readable text, reef shelves, bookmarks, coral lamps, pearls, small jars, clue cards, cozy library objects. |
| 19 | Lighthouse steps, lenses, lanterns, moon shapes, shells, rope, glass pieces, wave tiles, tiny windows, glowing guide details. |
| 21 | Crown lanterns, moon shells, pearls, ribbons, bells, beach flowers, sea glass, celebration flags, glowing waves, friendly seaside props. |

### Story/List Source Blocks

#### Page 2 / Facing Page 3

Title: `The Moon Shell Map`

Story: `A silvery shell rolled to Ember's feet at the edge of the moonlit shore. The waves sparkled softly, but the beach path was missing its brightest clue. Ember opened his satchel and saw a tiny map glow in the sand.`

Mission line: `Can you help Ember find the Moon Shell Map?`

Checklist rule: Moon Shell Map first, then 10 main printed finds and 5-15 bonus finds from approved page 3 art.

Icon plan: shell, moon, map, wave, pebble, and sparkle icons.

Layout: sandy path underlay; Ember lower-left pointing right along the beach.

#### Page 4 / Facing Page 5

Title: `Lanterns in the Tide Pools`

Story: `Pebblekins sat very still beside the round tide pools while Ember watched tiny lights blink under the water. The cove should have glowed like a necklace of pearls, but one lantern was still asleep. A pearl-bright shimmer waited near the rocks.`

Mission line: `Can you help Ember find the Pearl Glow Lantern?`

Checklist rule: Pearl Glow Lantern first, then 10 main printed finds and 5-15 bonus finds from approved page 5 art.

Icon plan: pearl, lantern, shell, tide pool, rock, and bubble icons.

Layout: tide-pool border; small Pebblekins and Ember cue on the left; checklist bubbles drift gently toward the right edge.

Character reference line: Use Pebblekins reference images `Pebblekins-001`, `Pebblekins-002`, and `Pebblekins-003` for Pebblekins; use Ember reference images `Ember-001`, `Ember-002`, and `Ember-003` for Ember.

#### Page 6 / Facing Page 7

Title: `Stars on the Sandbar`

Story: `The sandbar glittered with starfish shapes and soft moonlight. Hootiepuff blinked at the star marks while Ember followed them across the sand. One little compass was hiding among the bright seaside clues.`

Mission line: `Can you help Ember find the Tiny Starfish Compass?`

Checklist rule: Tiny Starfish Compass first, then 10 main printed finds and 5-15 bonus finds from approved page 7 art.

Icon plan: starfish, compass, shell, ribbon, wave, and sand-dollar icons.

Layout: sandbar parchment; Hootiepuff and Ember look right; star icons lead the eye toward the seek page.

Character reference line: Use HootiePuff reference images `HootiePuff-001`, `HootiePuff-002`, and `HootiePuff-003` for Hootiepuff; use Ember reference images `Ember-001`, `Ember-002`, and `Ember-003` for Ember.

#### Page 8 / Facing Page 9

Title: `The Driftwood Treasure Hut`

Story: `A cozy hut made of smooth driftwood leaned beside the shore. Pebblekins helped Ember peek at ropes, shells, baskets, and tiny beach treasures while moonlight slipped between the planks. A little door charm glowed somewhere inside.`

Mission line: `Can you help Ember find the Driftwood Door Charm?`

Checklist rule: Driftwood Door Charm first, then 10 main printed finds and 5-15 bonus finds from approved page 9 art.

Icon plan: driftwood, charm, rope, basket, shell, and treasure-box icons.

Layout: driftwood frame; Pebblekins and Ember gesture right while charm tags hold the checklist.

Character reference line: Use Pebblekins reference images `Pebblekins-001`, `Pebblekins-002`, and `Pebblekins-003` for Pebblekins; use Ember reference images `Ember-001`, `Ember-002`, and `Ember-003` for Ember.

#### Page 10 / Facing Page 11

Title: `Treats by the Coral`

Story: `Near the coral village, a tiny cupcake stand smelled sweet and berry-bright. The treats sparkled with seafoam colors, but one special cupcake was missing from the tray. Ember followed a crumbly glow.`

Mission line: `Can you help Ember find the Coral Berry Cupcake?`

Checklist rule: Coral Berry Cupcake first, then 10 main printed finds and 5-15 bonus finds from approved page 11 art.

Icon plan: cupcake, berry, coral, spoon, bowl, shell, and napkin icons.

Layout: coral-card layout; treat icons step from left to right.

#### Page 12 / Facing Page 13

Title: `The Kelp Ribbon Trail`

Story: `A path of soft green kelp ribbons waved beneath the moonlit water. Luma Leafwhisk showed Ember how the ribbons curled and uncurled like they were pointing the way. One clue ribbon shone brighter than the rest.`

Mission line: `Can you help Ember find the Kelp Ribbon Clue?`

Checklist rule: Kelp Ribbon Clue first, then 10 main printed finds and 5-15 bonus finds from approved page 13 art.

Icon plan: kelp, ribbon, bubble, shell, path stone, and glow bead icons.

Layout: ribbon trail layout; Luma and Ember cue on the left; checklist follows the kelp curve toward the right edge.

Character reference line: Use Luma Leafwhisk reference images `Luma_Leafwhisk-001`, `Luma_Leafwhisk-002`, and `Luma_Leafwhisk-003` for Luma; use Ember reference images `Ember-001`, `Ember-002`, and `Ember-003` for Ember.

#### Page 14 / Facing Page 15

Title: `The Seahorse Garden Bridge`

Story: `The garden bridge curved over a quiet pool full of flowers, shells, and seahorse shapes. Luma Leafwhisk listened with Ember when a tiny click sounded near the railing. A garden key was tucked somewhere in the soft seaside sparkle.`

Mission line: `Can you help Ember find the Seahorse Garden Key?`

Checklist rule: Seahorse Garden Key first, then 10 main printed finds and 5-15 bonus finds from approved page 15 art.

Icon plan: seahorse, key, bridge, flower, coral rail, and shell icons.

Layout: garden bridge motif; Luma and Ember look right; key bubbles carry the checklist toward the seek page.

Character reference line: Use Luma Leafwhisk reference images `Luma_Leafwhisk-001`, `Luma_Leafwhisk-002`, and `Luma_Leafwhisk-003` for Luma; use Ember reference images `Ember-001`, `Ember-002`, and `Ember-003` for Ember.

#### Page 16 / Facing Page 17

Title: `Stories in the Glow Reef`

Story: `The glow reef held little shelves of shells, scrolls, and shiny clue cards. Luma Leafwhisk helped Ember look carefully without reading any words, because the pictures told the story. A shimmer scroll shell waited among the reef treasures.`

Mission line: `Can you help Ember find the Shimmer Scroll Shell?`

Checklist rule: Shimmer Scroll Shell first, then 10 main printed finds and 5-15 bonus finds from approved page 17 art.

Icon plan: scroll shell, coral shelf, pearl, bookmark, reef lamp, and jar icons.

Layout: reef parchment; Luma and Ember cue on the left; scroll-shell icons sit in a gentle row leading right.

Character reference line: Use Luma Leafwhisk reference images `Luma_Leafwhisk-001`, `Luma_Leafwhisk-002`, and `Luma_Leafwhisk-003` for Luma; use Ember reference images `Ember-001`, `Ember-002`, and `Ember-003` for Ember.

#### Page 18 / Facing Page 19

Title: `Steps to the Moonbeam Light`

Story: `At Lighthouse Point, Elder Glowkeeper waited beside the rounded steps while moonbeams slid down like ribbons of silver. Ember climbed carefully and watched the glass glow above him. One moonbeam lens could wake the seaside light.`

Mission line: `Can you help Ember find the Moonbeam Lens?`

Checklist rule: Moonbeam Lens first, then 10 main printed finds and 5-15 bonus finds from approved page 19 art.

Icon plan: lens, lighthouse, moon, rope, lantern, shell, and glass icons.

Layout: lighthouse stair layout; Elder Glowkeeper and Ember cue on the left; lens markers climb toward the right side.

Character reference line: Use Elder Glowkeeper reference images `Elder_Glowkeeper-001`, `Elder_Glowkeeper-002`, and `Elder_Glowkeeper-003` for Elder Glowkeeper; use Ember reference images `Ember-001`, `Ember-002`, and `Ember-003` for Ember.

#### Page 20 / Facing Page 21

Title: `The Seaside Glows`

Story: `Ember reached the seaside finale as Elder Glowkeeper watched the waves, lanterns, and moon shells shine together. The whole shore shimmered with happy light. One crown lantern held the final glow of the moonlit search.`

Mission line: `Can you help Ember find the Seaside Crown Lantern?`

Checklist rule: Seaside Crown Lantern first, then 10 main printed finds and 5-15 bonus finds from approved page 21 art.

Icon plan: crown lantern, moon shell, pearl, ribbon, bell, wave, and sea-glass icons.

Layout: moonlit celebration arch; Elder Glowkeeper and Ember celebrate on the left; lantern checklist string flows toward the right page.

Character reference line: Use Elder Glowkeeper reference images `Elder_Glowkeeper-001`, `Elder_Glowkeeper-002`, and `Elder_Glowkeeper-003` for Elder Glowkeeper; use Ember reference images `Ember-001`, `Ember-002`, and `Ember-003` for Ember.

### Pages 22-23 Recap / Reward Spread

Show Ember proudly celebrating the 10 recovered mission items:

Moon Shell Map; Pearl Glow Lantern; Tiny Starfish Compass; Driftwood Door Charm; Coral Berry Cupcake; Kelp Ribbon Clue; Seahorse Garden Key; Shimmer Scroll Shell; Moonbeam Lens; Seaside Crown Lantern.

Display the 10 recovered mission items on separate small Moonlit Seaside pedestals, like a cheerful reward exhibit. Use driftwood stands, shell trim, rope details, smooth beach stones, kelp ribbons, and soft moonlit blue glow. Split the display into five pedestals on the left page and five pedestals on the right page. Keep every pedestal and mission item fully outside the center gutter/crease safety lane. Ember may celebrate from one page, but keep Ember's face, eyes, horns, scarf knot, satchel, tail, and main body entirely on one printed page and away from the crease.

Do not show answer locations. This is a reward spread, not an answer key.

### Page 24 Closing Source

Title: `Where Will Ember Search Next?`

Closing text: `Thanks to you, the moonlit seaside glows again! Ember closes his satchel with a happy smile, ready for the next tiny mystery.`

Visual source: Ember in the restored seaside glow with moon shells, lanterns, gentle waves, and no specific next-book mission item. The page should feel complete while leaving room for future adventures.

Text rule: Render the title and closing text exactly. Do not add extra teaser words, fake text, page numbers, labels, or answer marks. If exact generated text fails, use no-text art and add the text in layout.

## Ember Covers, KDP, Marketing, and Upload Preflight

This section replaces the archived `07_EMBER_COVERS_KDP_MARKETING.md` and `EMBER_KDP_PREFLIGHT.md` files for active production. Use it for cover prompts, back-cover copy, listings, KDP checks, pricing decisions, and final upload review.

### Active Cover Badge

Use this wording on active covers/listings when a badge is needed:

```text
10 Story + Search Spreads
```

Do not use old 18-scene or bonus-challenge wording for the active books.

### Book 1 Cover Motifs

Active mission-item motifs:

- Tiny Sparkleflame Map
- Golden Welcome Bell
- Glowing Sugar Star
- Baby Flame Lantern
- Firefly Flower Charm
- Shimmer Trail Stone
- Echo Glow Gem
- Dragon Door Key
- Sparkle Market Token
- Look-a-head Telescope

Cover/back-cover art may hint at these items without showing answer locations. Do not feature mission items from the superseded 18-scene plan.

Suggested front-cover direction: Ember at the glowing entrance to the Sparkleflame Festival, with rounded dragon cottages, lanterns, ribbons, gems, cupcake treats, and a clear sense that children will search for small treasures.

### Book 2 Cover Motifs

Active mission-item motifs:

- Leaflight Trail Marker
- Mushroom Glow Lantern
- Tiny Acorn Door Key
- Moonfeather Clue
- Leafcup Tea Token
- Firefly Fern Star
- Dewdrop Lily Pearl
- Leaf Scroll Ribbon
- Heartwood Door Gem
- Enchanted Forest Crown Leaf

Suggested front-cover direction: Ember at the leafy entrance to a glowing enchanted forest, with mushrooms, fairy doors, treehouse lights, fireflies, curled vines, and a warm leaflight path.

### Book 3 Cover Motifs

Active mission-item motifs:

- Crystal Castle Key
- Rainbow Glass Star
- Silver Paw Charm
- Pink Guide Gem
- Golden Map Lens
- Moon Mirror Charm
- Crystal Berry Tart
- Hidden Door Button
- Treasure Glow Orb
- Crystal Crown Lantern

Suggested front-cover direction: Ember before a friendly pink-lavender stone castle with rounded towers, crystal roofs, crystal windows, a few named crystal objects such as a crystal lantern, crystal rose, or crystal wind chime, golden doors, stained-glass color, and soft rainbow light. Avoid loose gems, loose crystals, crystal piles, and random crystal scatter.

### Book 4 Cover Motifs

Active mission-item motifs:

- Moon Shell Map
- Pearl Glow Lantern
- Tiny Starfish Compass
- Driftwood Door Charm
- Coral Berry Cupcake
- Kelp Ribbon Clue
- Seahorse Garden Key
- Shimmer Scroll Shell
- Moonbeam Lens
- Seaside Crown Lantern

Suggested front-cover direction: Ember at a moonlit magical seaside with shells, tide pools, soft lanterns, coral details, and a clear search-adventure feel.

### Back-Cover / Listing Positioning

Use the active structure:

- 10 story-led seek-and-find spreads
- 10 special mission items
- a two-page reward recap spread
- short story/list pages facing full-color seek-and-find scenes
- 5-15 bonus finds selected from approved artwork

Sample copy:

```text
Join Ember, a tiny baby dragon with a big heart, on a warm storybook seek-and-find adventure. Each spread pairs a short story moment with a full-color search scene, giving children 10 special mission items to find plus extra bonus treasures along the way.
```

### KDP Working Assumptions

- Interior target: 24 pages.
- Trim target: 8.5 x 11 inches unless the user changes it.
- Color: full-color children's interior.
- Pages 2-21 are 10 story/list + seek-image spreads.
- Pages 22-23 are the reward recap spread.
- Page 24 is closing/teaser.
- Front and back cover are separate cover assets, not counted as interior pages.
- Working format assumption: premium color paperback.
- Full-wrap cover PDF required for upload.
- No spine text for current 24-page plan unless page count or KDP spine rules change.

### KDP Preflight

Before upload, check:

- [ ] Title matches cover + KDP metadata exactly.
- [ ] Subtitle matches cover + KDP metadata exactly.
- [ ] Series name + book number are consistent everywhere, e.g. *Ember Seek-and-Find Adventures*, Book 1.
- [ ] Cover is one full-wrap PDF: back + spine + front.
- [ ] Cover dimensions come from the live KDP cover calculator/template, not estimates only.
- [ ] Cover has bleed; front/back text sits inside safe areas; barcode area is clear.
- [ ] Interior PDF page count is correct and even.
- [ ] Interior art is 300 DPI or better at final trim size.
- [ ] All seek pages have no readable text, arrows, circles, squares, boxes, outlines, halos, highlights, answer marks, watermarks, or accidental labels.
- [ ] Hard fail: mission items and hidden objects are not highlighted, boxed, circled, squared, outlined, haloed, arrow-pointed, labeled, marked, or covered by any answer-mark/shape overlay.
- [ ] All story/list, title, recap, and closing text is spelled exactly as approved.
- [ ] Story/list pages have three separate visible sections: Mission Item, Main Finds, and Bonus Finds. Mission Item has 1 item, Main Finds has 10 items, and Bonus Finds has 5-15 items.
- [ ] Child-facing story/list checklists match the approved facing seek artwork; objects are actually visible/printed.
- [ ] Pages 22-23 mission-item recap/reward spread matches the 10 mission items for that book.
- [ ] Answer keys are not required for upload; pages 22-23 are the mission recap. If adding a QR or URL for optional hints, verify link, destination, and privacy note before printing.
- [ ] No stale 18-scene, 18-search, 2-bonus, or old mission-list copy remains in active customer-facing material.
- [ ] Important art and text are inside trim, bleed, and gutter safety margins.
- [ ] Cover badge, back cover, and listing agree with the active 10-spread structure.
- [ ] Pricing checked against current KDP print cost and royalty for chosen trim/ink/paper choices.
- [ ] AI-generated content disclosure completed per current KDP rules.
- [ ] Proof copy ordered and reviewed before wide launch.

### Metadata And Listing

- [ ] Description, keywords, and categories align with the active cover/KDP positioning above.
- [ ] Author, publisher, and ISBN placeholders are resolved before upload.
- [ ] Cover/listing copy avoids similarity claims vs Waldo, Disney, Harry Potter, or other protected brands.
- [ ] Preview on Amazon looks correct after upload: title, subtitle, and Look Inside if enabled.
- [ ] Track ASIN, publication date, and price in the production tracker or spreadsheet.

### Pricing Notes

Use live KDP calculator values before publishing. Prior working assumption: for 8.5 x 11 premium color paperbacks, 24-40 pages can sit in the same rough print-cost band, while doubling production pages increases labor and QA more than it helps the first release.

The recommended starting product is the 24-page, 10-spread structure unless the user explicitly chooses a longer edition.

---

# Source: `60_templates\60_series_brief_template.md`

# Series Brief Template

## Series Name

`[Name]`

## Series Promise

`[What this series promises readers/buyers]`

## Audience

- Primary age range:
- Secondary audience:
- Difficulty range:
- Tone:

## Mode

- [ ] Standard seek-and-find
- [ ] Seek-and-find coloring book
- [ ] Mascot series
- [ ] Non-mascot hidden-object book
- [ ] Other:

## Mascot

- Name:
- Species/type:
- Core design:
- Signature colors:
- Signature accessory:
- Personality:
- Must never change:
- May vary by page:

## Art Direction

- Style:
- Color palette:
- Detail density:
- Line style:
- Mood:
- Commercial appeal notes:

## Puzzle Rules

- Primary target:
- Secondary object count:
- Difficulty range:
- Answer key style:
- Bonus challenges:

## Legal Safety Notes

- Similar properties to avoid:
- Forbidden visual motifs:
- Title risks:

## Expansion Ideas

- Book 1:
- Book 2:
- Book 3: Use the material rule in `## Ember Book 3 10-Spread Plan`.
- Holiday/special editions:

---

# Source: `60_templates\61_book_brief_template.md`

# Book Brief Template

## Book Title

`[Title]`

## Subtitle

`[Subtitle]`

## Series

`[Series name, if applicable]`

## Audience

- Primary age range:
- Difficulty target:
- Buyer:
- Tone:

## Mode

- [ ] Standard full-color seek-and-find
- [ ] Seek-and-find coloring book
- [ ] Mascot series
- [ ] Non-mascot hidden-object
- [ ] Other:

## Production Specs

- Trim size:
- Bleed:
- Interior color:
- Estimated page count:
- Puzzle page count:
- Answer key:
- File dimensions:
- Export format:

## Theme

- Main theme:
- Subthemes:
- Visual motifs:
- Forbidden motifs:

## Page Plan

| Page # | Page Theme | Difficulty | Primary Target | Object Count | Notes |
|---|---|---:|---|---:|---|
| 1 |  |  |  |  |  |

## Hidden Object Strategy

- Object count range:
- Object categories:
- Recurring objects:
- Bonus challenges:

## Cover Direction

- Main visual hook:
- Mascot visibility:
- Title area:
- Thumbnail strategy:

## QA Status

- [ ] Concept approved
- [ ] Page list approved
- [ ] Prompts approved
- [ ] Art generated
- [ ] Page QA complete
- [ ] Book QA complete
- [ ] Ready for layout

---

# Source: `60_templates\62_page_brief_template.md`

# Page Brief Template

## Page ID

`[book_code_page_###]`

## Page Theme

`[Theme]`

## Audience

`[Age range / audience overlay]`

## Mode

`[Standard / coloring / mascot / non-mascot]`

## Difficulty

`[Level 1–5]`

## Scene Description

`[Describe the setting, main activity, mood, and visual zones.]`

## Primary Target

- Name:
- Description:
- Required visible features:
- Approximate hiding strategy:
- Must avoid:

## Hidden Object List

| Object | Difficulty | Placement Notes | Avoid Confusion With |
|---|---:|---|---|
|  |  |  |  |

## Composition Notes

- Foreground:
- Midground:
- Background:
- High-detail zones:
- Rest areas:
- Safe area/gutter notes:

## Style Notes

- Color/line style:
- Lighting:
- Mood:
- Detail density:

## Negative Constraints

- No:
- Avoid:
- Legal safety notes:

## QA Notes

- Risks:
- Review focus:
- Status:

---

# Source: `60_templates\63_hidden_object_list_template.md`

# Hidden Object List Template

## Page ID

`[page id]`

## Target Count

- Primary targets:
- Secondary targets:
- Bonus targets:

## Object List

| # | Object | Required Appearance | Difficulty Level | Zone | Notes |
|---:|---|---|---:|---|---|
| 1 |  |  |  |  |  |

## Distribution Check

- Foreground count:
- Midground count:
- Background count:
- Edge/gutter risk count:
- Similar-object risk:

## Verification

- [ ] Every object exists.
- [ ] Every object is identifiable.
- [ ] No accidental confusing duplicates.
- [ ] Difficulty matches page brief.
- [ ] Placement is fair.

---

# Source: `60_templates\64_prompt_template.md`

# Image Prompt Template

Copy and fill this structure.

```text
Create a commercial-quality seek-and-find puzzle book illustration.

Product type:
[standard full-color / coloring book / mascot series / non-mascot hidden-object]

Audience:
[age range and difficulty]

Page theme:
[theme]

Scene:
[main scene description with foreground, midground, background]

Primary target:
[mascot or main hidden target description]
[include consistency details if mascot series]

Hidden objects:
[for seek-image pages: exactly 50 hidden objects total; name only the mission item and ask for 49 additional unique hidden objects without exact item names]

Composition requirements:
- [vertical full-page / two-page spread / cover]
- organized visual complexity
- intentional object placement by scene surface and natural hiding zone
- 49 additional hidden objects that are unique, child-nameable, and distinct in silhouette, material, scale, and detail pattern, without being named individually
- secondary scene life when the location calls for villagers, helpers, customers, or festival-goers
- layered foreground, midground, and background
- no empty dead zones
- hidden targets distributed across the full scene
- walkways, paths, aisles, bridge surfaces, and door thresholds mostly open when present
- important objects may sit in foreground, midground, or background, but should not be clipped by trim or lost in the gutter

Hiding requirements:
- fair but challenging
- primary target may be in the foreground, midground, or background as long as it stays recognizable at final print size and is not clipped by trim or lost in the gutter
- this depth rule applies to all findable objects: mission item, main finds, bonus finds, and candidate finds should be allowed across foreground, midground, and background
- primary target placed in a believable hiding spot, not random floor scatter or the middle of a walkway/threshold
- hidden targets identifiable once found
- no exact hidden-object names beyond the mission item in final seek-image prompts
- use partial cover, playful pose, similar colors, or busy surroundings without making objects invisible

Art style:
[style notes]

Print requirements:
- print-ready
- crisp details
- clear silhouettes
- strong readability at final page size

Page text behavior:
- seek-image pages: no readable text, labels, speech bubbles, page numbers, watermarks, arrows, answer marks, circles, squares, boxes, outlines, halos, highlights, or any shape overlay on mission items or hidden objects; the mission item must be hidden as natural scene art only
- non-seek text pages: generate the exact approved text supplied for the page; no extra words, misspellings, fake text, gibberish, unapproved labels, or watermarks

Other negative constraints:
- no copyrighted character resemblance
- no famous seek-and-find character imitation
- no red-and-white striped focal outfit
- no muddy clutter
- no random floor litter or heavy walkway/path clutter
- avoid muddy clutter, random scatter, and overly repeated same-shape props that make the search unreadable
```

---

# Source: `60_templates\65_qa_report_template.md`

# QA Report Template

## Page / Book / Cover ID

`[ID]`

## Review Date

`[YYYY-MM-DD]`

## Reviewer

`[Name/model/tool]`

## Selected Rules

- Audience overlay:
- Mode overlay:
- Project overlay:

## Summary Decision

- [ ] Approved
- [ ] Approved with minor fixes
- [ ] Revise
- [ ] Regenerate
- [ ] Reject

## What Works

- 

## Issues Found

| Severity | Issue | Location | Rule/File | Fix |
|---|---|---|---|---|
| High |  |  |  |  |

## Hidden Object Verification

- [ ] Primary target found.
- [ ] All secondary targets found.
- [ ] No unfair hiding.
- [ ] No confusing duplicates.

## Print Risk

- 

## Legal/Safety Risk

- 

## Required Revisions

1. 

## Final Notes

-

---

# Source: `60_templates\66_project_overlay_template.md`

# Project Overlay Template

## Project / Theme Name

`[Name]`

## Applies To

- Series:
- Book:
- Audience:
- Mode:

## Commercial Angle

`[Why this theme should sell / who it appeals to]`

## Theme Rules

Use:
- 

Avoid:
- 

## Visual Motifs

- 

## Color / Style Notes

- 

## Mascot Rules

If applicable:
- Name:
- Design:
- Required features:
- Allowed variations:
- Forbidden variations:

## Hidden Object Categories

- 

## Page Theme Ideas

1. 
2. 
3. 

## Difficulty Notes

- 

## Legal/Safety Notes

- 

## Prompt Additions

Add this to prompts:
```text
[theme-specific prompt block]
```

---

# Source: `80_prompt_blocks\80_prompt_block_library.md`

# Prompt Block Library

Reusable language for prompt building.

## Commercial Quality Block

```text
Create a commercial-quality seek-and-find puzzle book illustration with strong Amazon buyer appeal, polished detail, clear visual hierarchy, and a giftable professional look.
```

## Organized Complexity Block

```text
The scene should be dense and highly detailed, but organized and readable, with clear silhouettes, strong object separation, and distinct foreground, midground, and background zones.
```

## Intentional Placement Block

```text
Make the seek scene rich but not overstuffed. Arrange the exact named mission item and the 49 unnamed additional hidden objects in intentional clusters where they naturally belong in the environment. Keep walkways, paths, aisles, bridge surfaces, door thresholds, and the main eye path mostly open and readable, with only a few small edge details. Do not use random floor scatter or drop important hidden objects in the middle of walking routes.
```

## Scene Life and Object Variety Block

```text
Include appropriate secondary scene life for the location, such as friendly original villagers, helpers, customers, festival-goers, or small non-recurring fantasy creatures doing simple actions. They should make the world feel alive without becoming hidden targets, crowding walkways, or covering required objects. Use 49 additional hidden objects that are varied, identifiable, child-nameable, and clearly different in silhouette, material, scale, edge shape, and detail rhythm. Do not name those additional hidden objects individually in the final seek-image prompt; strengthen uniqueness and scene-fit instructions instead.
```

## 50 Unique Hidden Objects Block

```text
Include exactly 50 hidden objects total in the seek image: 1 exact named mission item plus 49 additional hidden objects. Name only the mission item. Do not list exact names for the other 49 hidden objects. Make all 49 additional hidden objects one-of-a-kind, with no duplicate designs, no near-duplicate silhouettes, and no simple color-swap repeats. Vary outline shape, size, material cues, edge style, handle/closure/detail pattern, color grouping, and placement. Keep every hidden object readable at final print size and naturally placed on scene-appropriate surfaces.
```

## Fair Hiding Block

```text
Hide the primary target in a fair but moderately challenging way. It may be in the foreground, midground, or background, including near a scene edge, as long as it is not clipped by trim, lost in the gutter, or unreadable at final print size. Blend it using partial cover, similar colors, playful pose, or surrounding activity, while keeping its required identifying features visible once noticed.
```

## Hidden Object Distribution Block

```text
Distribute hidden objects across foreground, midground, and background. This applies to all findable objects, including the mission item, main finds, bonus finds, and candidate finds. Background hiding is allowed and encouraged when the object remains recognizable at final print size, has enough contrast, and is not clipped by trim or lost in the gutter. Keep foreground finds to a minority unless the approved page layout specifically calls for a foreground-heavy scene. Do not cluster all hidden objects in the foreground or in one corner.
```

## Seek Image No Text Block

```text
Hard rule: do not mark the mission item or any hidden object. No text, no labels, no readable signs, no speech bubbles, no page numbers, no watermark, no border, no arrows, no answer marks, no circles, no squares, no boxes, no outlines, no halos, no highlights, and no shape overlays on mission items or hidden objects. Hide the mission item as natural scene art only.
```

Use this block only for seek images and other puzzle-art pages that are not supposed to contain generated words. Do not use it for title, story/list, recap, closing, instruction, or other non-seek text pages.

## Non-Seek Exact Text Block

```text
Generate the exact approved text supplied for this non-seek page. Preserve spelling, capitalization, punctuation, line order, and object names exactly. Do not add extra words, fake text, gibberish, unapproved labels, watermarks, page numbers, or speech bubbles.
```

## Two-Page Recap Pedestal Display Block

```text
For a pages 22-23 reward recap spread, display the 10 recovered mission items on separate small pedestals or stands that match the book's theme, materials, colors, and world. Use five pedestals on the left page and five pedestals on the right page. Each pedestal holds exactly one mission item. Leave a clear vertical center gutter safety lane from top to bottom of the full spread; no pedestal, mission item, item edge, Ember face, Ember body silhouette, readable detail, or important silhouette may touch, cross, or sit inside the center crease lane. The gutter lane may contain only nonessential decorative background such as glow, path texture, sky, mist, confetti, ribbon curves, distant lights, or soft environmental texture. If Ember appears, place Ember entirely on one printed page and away from the crease. Do not split Ember's face, eyes, horns, scarf knot, satchel, tail, or main body across the gutter. Do not add readable labels, plaques, captions, page numbers, answer marks, arrows, circles, boxes, outlines, halos, highlights, or typography.
```

## Story/List Markdown Source Structure

When producing a story/list `.md` source file, use this structure and keep the three checklist groups separate:

```markdown
# [Story/List Page Title]

Source section:
[canonical source section]

Printed page:
[story/list page number]

Facing seek page:
[seek page number]

Title:
[exact title]

Story:
[exact story prose]

Mission line:
[exact mission line]

## Mission Item
- [exact mission item]

## Main Finds
1. [main find 1]
2. [main find 2]
3. [main find 3]
4. [main find 4]
5. [main find 5]
6. [main find 6]
7. [main find 7]
8. [main find 8]
9. [main find 9]
10. [main find 10]

## Bonus Finds
- [bonus find 1]
- [bonus find 2]
- [bonus find 3]
- [bonus find 4]
- [bonus find 5]
```

Do not replace the three section headings with one combined checklist. Add more bonus bullets only when approved, up to 15 total bonus finds.

## Title Page Exact Text and Source Images Block

```text
For this title page, use the character images saved in ChatGPT Sources as required visual references. For Ember title pages, directly name `Ember-001`, `Ember-002`, and `Ember-003`, and include the written mascot description from the active project canon. Render the exact approved title words exactly as supplied. Do not paraphrase, shorten, expand, redesign the wording, substitute a different title, add extra words, create fake text or gibberish, misspell anything, add a watermark, or add a page number. Never use unresolved placeholder text or a generic book label as title text. If the exact approved title, direct source-image names, or written mascot description is missing, stop and ask before generating.
```

## Story/List Low-Clutter Block

```text
For this story/list page, keep the supporting illustration calm and less cluttered than the facing seek image. Preserve open breathing room around the title, story prose, mission line, and find-list areas. Include exact generated text from the approved source for the title, story prose, mission line, section headings, mission item, main finds, and bonus finds required by the active project workflow.

The find list must remain visibly separated into three checklist sections in this order:
1. Mission Item - exactly 1 item.
2. Main Finds - exactly 10 items.
3. Bonus Finds - 5-15 items.

Do not merge, flatten, rename, reorder, or combine these sections into one continuous list. Decorative details should support the theme without competing with the text or item lists.
```

## Legal Safety Block

```text
Do not imitate Where's Waldo, Where's Wally, or any copyrighted character, mascot, outfit, world, logo, or trade dress. Avoid red-and-white striped focal outfits.
```

## Coloring Book Block

```text
Create clean black-and-white coloring book line art with crisp outlines, no grayscale shading, no filled black areas that dominate the page, and enough open spaces for enjoyable coloring. Hidden objects must remain identifiable by outline alone.
```

## Thumbnail Appeal Block

```text
Make the image instantly eye-catching in thumbnail previews while still rewarding close inspection at full page size.
```

---

# Source: `80_prompt_blocks\81_standard_page_prompt_skeleton.md`

# Standard Page Prompt Skeleton

```text
Create a commercial-quality children's/adult seek-and-find puzzle book illustration.

Audience:
[age/audience]

Page theme:
[theme]

Scene:
[scene description]

Source:
- [rules-file section, canonical row, or approved source block used]
- [exact approved text source for text-bearing pages]

Primary target:
[target description]

Hidden objects:
[for seek-image pages: exactly 50 hidden objects total; name only the mission item and ask for 49 additional unique hidden objects without exact item names]

Composition:
- [vertical full-page / spread]
- dense but organized scene
- clear foreground, midground, and background
- no empty areas
- hidden objects distributed across the full image
- exact named mission item plus 49 unnamed additional hidden objects placed intentionally where they naturally belong
- walkways, paths, aisles, bridge surfaces, and door thresholds mostly open when present
- important objects may appear in foreground, midground, or background, but should not be clipped by trim or lost in the gutter

Hiding:
- fair but challenging
- primary target can be in the foreground, midground, or background if it remains recognizable and is not clipped by trim or lost in the gutter
- all findable objects, including mission item, main finds, bonus finds, and candidate finds, may be hidden across foreground, midground, and background
- primary target hidden in a believable scene location, not random floor scatter or the middle of a walkway/threshold
- objects identifiable once found
- no exact hidden-object names beyond the mission item in final seek-image prompts
- no unfair invisibility or tiny blob hiding

Style:
[style direction]

Requirements:
- print-ready
- strong visual hierarchy
- clear silhouettes
- high replay value
- expressive characters and small visual stories
- for seek-image pages only: no text, labels, speech bubbles, page numbers, watermarks, or borders
- for non-seek text pages: generate exact approved text; no extra words, misspellings, fake text, gibberish, unapproved labels, or watermarks
- for story/list pages: calm low-clutter supporting art with exact text preserved as three separate checklist sections: Mission Item (1), Main Finds (10), and Bonus Finds (5-15); never flatten these into one list
- no copyrighted character or famous seek-and-find imitation
```

---

# Source: `80_prompt_blocks\82_coloring_page_prompt_skeleton.md`

# Coloring Page Prompt Skeleton

```text
Create a commercial-quality seek-and-find coloring book page.

Audience:
[age/audience]

Page theme:
[theme]

Scene:
[scene description]

Primary target:
[target description, if applicable]

Hidden objects:
[for seek-image pages: exactly 50 hidden objects total; name only the mission item and ask for 49 additional unique hidden objects without exact item names]

Art style:
- clean black-and-white line art
- crisp outlines
- no grayscale shading
- no heavy filled black areas
- colorable open spaces
- readable silhouettes
- detailed but not cramped

Composition:
- [vertical full-page / spread]
- organized visual complexity
- hidden objects distributed across the page
- important objects inside the safe area

Hiding:
- hidden objects readable by outline alone
- fair but challenging
- no tiny blob hiding
- no reliance on color clues

Negative constraints:
- no generated text unless this is a non-seek text page with exact approved wording
- no labels
- no watermark
- no page number
- no copyrighted character resemblance
```

---

# Source: `80_prompt_blocks\83_revision_prompt_skeleton.md`

# Revision Prompt Skeleton

```text
Revise the existing seek-and-find illustration with these specific fixes:

Required fixes:
1. [fix]
2. [fix]
3. [fix]

Preserve:
- [what should stay the same]
- [mascot design, if applicable]
- [overall theme/style]

Hiding requirements:
- keep the primary target fair but challenging
- keep required identifying features visible once found
- distribute hidden objects across the full scene
- avoid placing important targets near the page edge, trim, or gutter

Do not add:
- text
- labels
- speech bubbles
- watermarks
- copyrighted character resemblance
```

---

# Source: `90_logs\change_log.md`

# Change Log

Record rule, template, and workflow changes here.

| Date | File | Change | Reason |
|---|---|---|---|
| 2026-05-06 | `01_RULES_CORE_AUDIENCE_MODE_PROJECTS.md`, `03_TEMPLATES_PROMPTS_AND_LOGS.md`, Series spread plans, Book 1 recap prompt output | Made pages 22-23 recap/reward prompts use theme-matched pedestal displays, five items per page, a clear center gutter safety lane, and Ember entirely on one printed page. | Prevent mission items, pedestals, and Ember details from landing in the center crease while keeping each book's recap display visually themed. |
| 2026-05-04 | Four-file rules bundle | Required seek-image prompts to use exactly 50 hidden objects, naming only the mission item and describing 49 additional unique hidden objects by traits instead of exact item names. | Prevent prompt stalls and repeated literal item lists while preserving rich, unique seek-page content. |
| 2026-05-04 | Four-file rules bundle, system instructions | Routed direct supplied-prompt generation through the user's selected renderer, defaulting Ember production to supervised ChatGPT broke mode. | Keep explicit generate-now requests budget-aware instead of defaulting to the built-in image tool. |
| 2026-05-04 | Four-file rules bundle, system instructions | Added direct image-generation override for complete supplied prompts. | Prevent prompt/source/QA workflows from blocking explicit generate-now requests. |
| 2026-05-02 | `03_TEMPLATES_PROMPTS_AND_LOGS.md`, `03_EMBER_BOOK1_10_SPREAD_PLAN.md` | Restored festival lanterns as a positive Book 1 motif across cottage, village, workshop, door, market, and finale prompt vocabulary. | Keep the Sparkleflame Festival visually lantern-rich while still using page-specific objects. |
| 2026-05-02 | `01_RULES_CORE_AUDIENCE_MODE_PROJECTS.md`, `02_WORKFLOWS_AND_QA.md`, `03_TEMPLATES_PROMPTS_AND_LOGS.md` | Added foreground-bias guard while preserving foreground/midground/background hiding for all findable objects. | Prevent image generation from defaulting most hidden objects to the foreground. |
| 2026-05-02 | `03_TEMPLATES_PROMPTS_AND_LOGS.md` | Replaced strict Book 1 filler-restraint language with page-specific object vocabulary and ambiguity controls inside the actual Book 1 prompt rows. | Fix overused filler by removing generic object mentions from production prompts instead of adding another strict rule. |
| 2026-05-02 | `03_TEMPLATES_PROMPTS_AND_LOGS.md` | Reworded hiding and print-safety prompt blocks to allow foreground, midground, and background hiding when objects remain recognizable and not clipped by trim/gutter. | Prevent prompts from pushing all hidden objects into the foreground. |
| 2026-05-02 | `03_TEMPLATES_PROMPTS_AND_LOGS.md` | Promoted Book 4, *Ember and the Moonlit Seaside Search*, into the canonical four-rule bundle with shorthand rows, story/source blocks, Page 24 closing source, cover motifs, and canon character references. | Make Book 4 usable as rules-file source truth for shorthand/page-plan prompting. |
| 2026-05-01 | Four-file rules bundle, system instructions | Promoted active Ember rules, character canon, Book 1-3 story/source plans, cover/KDP notes, and preflight rules from archive into the four-file bundle; marked checklists, Word docs, split files, archives, and all-in-one exports as derivative only. | Make the four consolidated files plus system instructions the only active source of truth. |
| 2026-05-01 | Character reference rules | Required Ember and supporting-character prompts to directly name exact reference image files, including page-specific lines for Luma, Hootiepuff, and Gemma. | Prevent prompts from referencing side characters without attaching the correct image-file refs. |
| 2026-05-01 | Story/list source and prompt rules | Required story/list `.md` sources and image prompts to keep Mission Item, Main Finds, and Bonus Finds as three separate visible sections; added prompt QA hard-fail checks for flattened lists. | Prevent story/list image prompts from merging mission, main, and bonus finds into one undifferentiated checklist. |
| 2026-05-02 | Book 1 seek-image placement rules | Added Book 1 clutter control, category placement, walkway/path clearance notes, and reusable prompt-template wording for intentional object placement. | Keep Book 1 prompts rich but less cluttered, with named/category items placed deliberately and fewer objects in walkways. |
| 2026-05-02 | Scene life and object variety rules | Required appropriate secondary villagers/helpers/festival-goers and varied child-nameable props; limited repeated bottles, jars, gems, crystals, beads, and sparkle blobs. | Prevent seek prompts from producing empty-feeling scenes or pages dominated by same-style small props. |
| 2026-05-02 | Mission-item answer-mark hard rule | Hardened the four-rule bundle against circles, squares, boxes, outlines, halos, highlights, arrows, labels, answer marks, and shape overlays on mission items or hidden objects. | Prevent generated seek art from marking the answer instead of hiding it naturally. |
| 2026-05-01 | Book 3 Crystal Castle prompt balance | Applied the page 3 crystal/non-crystal/helper balance across the other Book 3 seek-page categories and icon plans. | Keep all Crystal Castle prompts consistent: crystal accents plus majority non-crystal searchable objects and organized helper life. |
| 2026-05-01 | Seek-image prompt and QA rules | Added explicit bans on squares, circles, boxes, outlines, and shape overlays on mission items or hidden objects. | Prevent generated art from marking answers instead of hiding them fairly. |
| 2026-05-01 | Book 3 Crystal Castle searchable items | Removed signs from the non-crystal searchable item rule, page 3 category row, and icon plan. | Prevent generated Crystal Castle prompts from requesting signs. |
| 2026-05-01 | Book 3 Gemma placement | Restricted Gemma Glint to Gemma's Guide Nook, Book 3 seek page 9 / paired story-list page 8, unless explicitly requested otherwise. | Match archive and checklist evidence that Gemma is page-specific, not a general Book 3 helper. |
| 2026-05-01 | Book 3 Crystal Castle searchable item balance | Added a non-crystal search rule and expanded page 3 with wood, metal, fabric, paper, plant, and stone finds. | Ensure Crystal Castle pages have enough non-crystal searchable items around the crystal accents. |
| 2026-05-01 | Book 3 Crystal Castle helper rule | Restored the richer helper behavior from the earlier gate prompt: castle helpers and tiny creatures preparing the castle, polishing trim, carrying gem baskets, hanging jewel lanterns, sweeping steps, and adding small magical visual jokes. | Keep helper activity exactly like the preferred old prompt while controlling overall crystal/gem density elsewhere. |
| 2026-05-01 | Book 3 Crystal Castle prompt balance | Tuned the gate/helper/crystal rules between the overfilled old prompt and the sparse newer prompt; removed default gem baskets, gem flowers, path gems, jewel lanterns, and busy helper subplots. | Preserve crystal-castle magic without clutter overload. |
| 2026-05-01 | Book 3 Crystal Castle helper/activity prompt rules | Restored previous-prompt helper activity language for castle helpers, tiny fantasy creatures, gate preparation, jewel lanterns, gem flowers, crystal vines, and contained gem baskets. | Match the earlier successful Crystal Castle Gate prompt while keeping gems/crystals intentional instead of random scatter. |
| 2026-05-01 | Book 3 Crystal Castle helper and crystal-object rules | Restored explicit helper guidance for Ember and Gemma Glint, restored archive wording for Crystal Castle Gate, Pink Guide Gem, Kitchen of Crystal Treats, and Crystal Castle Finale, and added a slight crystal-object increase. | Keep helpers present and make the castle a touch more crystalline without loose scatter. |
| 2026-05-01 | Book 3 Crystal Castle prompt rules and source blocks | Restored a moderate amount of named crystal-object language and changed Castle Gate Key back to Crystal Castle Key. | Keep the castle magical while still avoiding loose gem/crystal scatter. |
| 2026-05-01 | Book 3 Crystal Castle mission items | Replaced Crystal Castle Key with Castle Gate Key. | Remove another avoidable crystal label while preserving the gate-key mission. |
| 2026-05-01 | Book 3 Crystal Castle mission items | Replaced Pink Guide Gem with Pink Guide Card across the Book 3 source block and cover motifs. | Remove an avoidable gem item from the Crystal Castle plan. |
| 2026-05-01 | Book 3 Crystal Castle prompt rules and source blocks | Further reduced gem/crystal language so crystal is limited to roofs/windows and mission items that require it. | Prevent Crystal Castle prompts from overfilling scenes with crystal or gem details. |
| 2026-05-01 | Book 3 Crystal Castle prompt rules and source blocks | Reduced loose gem/crystal scatter, required crystal to appear mostly as named objects, and made crystal roofs/windows explicit. | Keep the castle readable and magical without filling every scene with small gems and crystals. |
| 2026-05-01 | Book 3 Crystal Castle prompt rules, production checklists, system instructions | Required castle architecture and walking surfaces to be stone while allowing crystal roofs/decor/objects plus wood, plants, metal, fabric, food, and other material variety. | Prevent prompts from rendering the whole castle/roads/floors as crystal. |
| 2026-05-01 | System instructions, active Ember rules, workflow docs, Word production checklists | Added row-match block requirement for shorthand-generated prompts and regenerated Word checklists from canonical rows. | Keep automatically generated prompts aligned with production checklist rows. |
| 2026-05-01 | System instructions, active Ember rules, production checklists, workflow docs | Required shorthand `md` outputs to be delivered as downloadable `.md` file attachments using the preferred filename. | Prevent story/list source markdown from being trapped as chat-only text. |
| 2026-05-01 | System instructions, active Ember rules, production checklists, workflow docs | Replaced derivative-checklist routing with canonical Ember book-plan rows inside this rules bundle. | Prevent false blockers while keeping source truth in the four-file bundle. |
| 2026-05-01 | Title-page prompt rules, Ember active rules, character canon | Required title prompts to include a written Ember baby-dragon description in addition to source-image refs; corrected an old kitten reference in canon. | Prevent title pages from drifting into fox/cat/human-wizard designs. |
| 2026-05-01 | Title-page rules and production checklists | Added hard stops for unresolved title placeholders, generic labels such as `Ember Book 3`, missing source refs, and off-reference Ember identity. | Prevent failed title pages like generic fantasy art with invented title text or wrong mascot design. |
| 2026-05-01 | `CHATGPT_PROJECT_SYSTEM_INSTRUCTIONS.md`, `SEEK_AND_FIND_BOOK_PRODUCTION_CHECKLIST.md`, consolidated rules/templates | Strengthened title-page prompting: title pages must reference saved ChatGPT Sources character images and render exact approved title words only. | Prevent flexible title wording and off-model character generation on title pages. |
| 2026-04-30 | `02_WORKFLOWS_AND_QA.md`, `03_TEMPLATES_PROMPTS_AND_LOGS.md`, Ember rules/checklists | Required low-clutter story/list page images and fixed story/list source counts to 1 mission item, 10 main search items, and 5-15 bonus items. | Keep story pages readable while ensuring every source and prompt carries the full item structure. |
| 2026-04-30 | `01_RULES_CORE_AUDIENCE_MODE_PROJECTS.md`, `02_WORKFLOWS_AND_QA.md`, `03_TEMPLATES_PROMPTS_AND_LOGS.md`, project checklists | Split seek-image no-text constraints from non-seek exact-text page prompts. | Prevent title, story/list, recap, closing, and instruction prompts from inheriting "do not generate text" language. |
| YYYY-MM-DD |  |  |  |

---

# Source: `90_logs\decision_log.md`

# Decision Log

Record major project decisions here.

| Date | Project | Decision | Reason | Status |
|---|---|---|---|---|
| YYYY-MM-DD |  |  |  |  |
