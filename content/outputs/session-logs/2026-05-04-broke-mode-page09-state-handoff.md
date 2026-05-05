# Broke Mode Page 9 State Handoff - 2026-05-04

## Current State

Tonight's canonical Page 9 prompt is source-locked to Book 1 spread 4:

- Seek page: 9
- Paired story/list page: 8
- Location: Lantern Maker's Workshop
- Mission item: Baby Flame Lantern
- Prompt: `content/outputs/prompts/book01-page009-lantern-maker-s-workshop-image-prompt.md`
- QA report: `content/outputs/qa-reports/book01-page009-lantern-maker-s-workshop-qa.md`

The Vision-led prompt changes are in place. The generated prompt now uses a visual budget, unique searchable motif guidance, small guide/helper scale for Ember, concrete Lantern Maker's Workshop zones, and direct Ember reference names.

New 50-item rule added after the later successful Page 19 prompt test:

- Future final seek-image prompts should request exactly 50 hidden objects total.
- Name only the mission item in the image prompt.
- The other 49 hidden objects should not be listed by exact item name.
- Describe the other 49 by uniqueness traits instead: one-of-a-kind silhouettes, varied materials, varied scale, distinct edge/handle/closure/detail patterns, clear print-size readability, natural scene placement, and no near-duplicate/copy-paste repeats.
- After art approval, identify visible candidates from the finished image and then choose the printed Main Finds and Bonus Finds from what actually appears.

The fixed broke-mode compact prompt was saved here:

- `content/outputs/images/pending-review/book01-page009-lantern-maker-s-workshop-fixed-direct-prompt-test-v2-2026-05-04T05-14-27-986Z-prompt.md`

That dry-run prompt starts with `Create one image now.`, uses `Ember-001`, `Ember-002`, and `Ember-003` directly, and removes the previous stall-prone wording such as `when available`, `If references are unavailable`, `project/source context`, and `Do not rewrite`.

The generator now also writes a sectioned split-test ladder here:

- `content/outputs/prompts/book01-page009-lantern-maker-s-workshop-split-test-prompts.md`

Use the split-test ladder for the next live troubleshooting pass. It contains six paste-one-at-a-time prompts that build from a minimal render test through references, seek-play controls, scene zones, the 50-object visual-budget rule, and the full avoid/format block.

Known-good structure pivot saved after comparing against the earlier successful Page 19 Market Stalls prompt:

- `content/outputs/prompts/book01-page009-lantern-maker-s-workshop-known-good-structure-prompt.md`

This is the preferred next Page 9 live prompt candidate. It keeps the older four-rules prompt shape that worked for Page 19: Product type, Book, Page, Format, Target audience, Source row, Character reference, Ember requirements, Scene, Scene life, Ember placement, Mission item, searchable-object guidance, composition, hiding, art style, print requirements, and negative constraints. It also preserves the new 50-object rule: exactly 50 hidden objects total, with only the Baby Flame Lantern named and the other 49 described by uniqueness/readability traits rather than listed by exact item name.

## What Worked

- The prompt generator passes QA for the canonical Page 9 row.
- The canonical generated Page 9 prompt now includes the 50-object rule: 1 exact named mission item plus 49 unnamed unique hidden objects described by traits.
- The generated Page 9 QA checklist now checks the 50-object rule and the no-extra-named-items rule.
- The prompt generator now saves a split-test ladder alongside the normal prompt and QA report.
- Broke-mode prompt preparation now produces a compact image-facing prompt instead of a source packet.
- Regression tests now reject assistant-routing or uncertain reference language.
- Full test suite and build passed after the prompt-generation fixes.

## Failures Recorded

### Split Test 1 - Minimal Render

- Attempt: `book01-page009-split-test-01-minimal-render`
- Prompt source: `content/outputs/prompts/book01-page009-lantern-maker-s-workshop-split-test-01-minimal-render.md`
- Archive: `content/outputs/images/failed/book01-page009-split-test-01-minimal-render-2026-05-05T01-00-38-744Z/`
- Result: failed after timeout.
- Prompt mode: raw prompt mode; Broke Mode pasted the extracted Test 1 prompt without compacting or appending missing production requirements.
- Observed behavior: ChatGPT displayed `Thinking`, then wrote planning/tool-routing text about creating the Lantern Maker's Workshop scene and checking whether a path existed.
- Diagnosis: this happened before reference names, seek-play controls, scene zones, the 50-object rule, or the avoid/format block were introduced. The failure is likely project-level file/path/source routing inside the ChatGPT project, not a failure caused by the later prompt sections.

### Split Test 1 Rerun After Project-Instruction Update

- Attempt: `book01-page009-split-test-01-minimal-render-rerun`
- Prompt source: `content/outputs/prompts/book01-page009-lantern-maker-s-workshop-split-test-01-minimal-render.md`
- Initial archive: `content/outputs/images/failed/book01-page009-split-test-01-minimal-render-rerun-2026-05-05T01-11-13-741Z/`
- Recovered image: `content/outputs/images/pending-review/book01-page009-split-test-01-minimal-render-rerun-2026-05-05T01-11-13-741Z.png`
- QA report: `content/outputs/image-qa-reports/book01-page009-split-test-01-minimal-render-rerun-2026-05-05t01-11-13-741z-2026-05-05T01-18-19-356Z-qa.md`
- Result: generation succeeded, but the helper timed out because ChatGPT still displayed `Thinking`. The visible image was recovered from the current ChatGPT tab and passed local file/dimension QA.
- Manual visual note: Test 1 proves the minimal prompt can generate after the project-instruction update, but the art is not production-ready. Ember is too dominant, the page is not yet structured for 50-object seek play, and the Baby Flame Lantern candidate is likely too obvious/ambiguous among many similar lanterns.

### Split Test 2 - Reference Names

- Attempt: `book01-page009-split-test-02-reference-names`
- Prompt source: `content/outputs/prompts/book01-page009-lantern-maker-s-workshop-split-test-02-reference-names.md`
- Archive: `content/outputs/images/failed/book01-page009-split-test-02-reference-names-2026-05-05T01-28-29-889Z/`
- Result: failed after timeout.
- Observed behavior: ChatGPT reasoned that no user-uploaded images were provided in this turn and said it would proceed with the developer's referenced images.
- Diagnosis: plain `Use Ember-001, Ember-002, and Ember-003 as visual references` is too ambiguous in the project. It makes ChatGPT think about current-turn uploads instead of the project Sources.

### Split Test 2b - Project Sources Reference Wording

- Attempt: `book01-page009-split-test-02b-project-sources`
- Prompt source: `content/outputs/prompts/book01-page009-lantern-maker-s-workshop-split-test-02b-project-sources.md`
- Archive: `content/outputs/images/failed/book01-page009-split-test-02b-project-sources-2026-05-05T01-34-45-798Z/`
- Result: failed after timeout.
- Observed behavior: the wording `already saved in this ChatGPT project's Sources` avoided the current-turn upload hesitation and reached the image-generation placeholder, but no recoverable image appeared during the wait or short late-recovery check.
- Diagnosis: project-Sources wording is better than plain reference names, but reference use may still slow or stall the project. Use a 3-minute timeout for future split tests.

### Earlier Page 9 Live Test

- Attempt: `book01-page009-lantern-maker-s-workshop-vision-live-test`
- Archive: `content/outputs/images/failed/book01-page009-lantern-maker-s-workshop-vision-live-test-2026-05-04T05-04-17-364Z/`
- Result: failed after timeout.
- Observed behavior: ChatGPT shifted into assistant/tool-routing language about reference handling instead of directly generating.
- Likely cause: the prompt still contained meta-instructions such as `when available`, fallback reference language, and direct "do not rewrite" style assistant instructions.

### Fixed Prompt Live Test

- Attempt: `book01-page009-lantern-maker-s-workshop-fixed-live-test`
- Archive: `content/outputs/images/failed/book01-page009-lantern-maker-s-workshop-fixed-live-test-2026-05-04T05-15-57-166Z/`
- Result: failed after timeout.
- Observed behavior: the prompt pasted and submitted successfully, then ChatGPT stayed in the image generation placeholder state until the automation timeout.
- Screenshot evidence shows the project chat displaying: `Thinking` and `Generating a more detailed image - hang tight.`
- User observed that it initially stalled with blank `Thinking`, before any useful visible response appeared.

This is a better failure than the earlier one because ChatGPT appears to have entered image generation instead of writing a planning response. It still did not complete within the 5-minute automation window.

## Likely Diagnosis

The fixed prompt removed the obvious assistant-planning triggers, so the remaining blocker is probably one of these:

- The ChatGPT project itself is routing direct image prompts into file/path/source behavior before image generation.
- The ChatGPT project itself is still heavy enough that direct image generation can hang or run very slowly.
- The prompt is still too detailed for broke mode, even at roughly 3.3k characters.
- The automation timeout may be too short for this project when it shows the detailed-image placeholder.
- The project may be trying to reconcile the named Ember reference files with project instructions before rendering.

## Possible Solution For Tomorrow

Use split-prompt testing as the primary method. Do several tiny controlled tests instead of one full prompt, adding one instruction group at a time until the failure point appears.

Suggested test ladder:

1. Minimal render test.
   - Create one vertical children's seek-and-find image in Lantern Maker's Workshop.
   - Include only Ember's short written appearance, the Baby Flame Lantern, no text, and vertical 17:22 format.

2. Add reference names only.
   - Add `Use Ember-001, Ember-002, and Ember-003 as visual references for Ember.`
   - This checks whether named project references are the stall trigger.

3. Add seek-play controls.
   - Ember appears once as guide/helper.
   - Baby Flame Lantern appears once and is hidden fairly.
   - No duplicate/lookalike mission items.

4. Add scene zones.
   - Workbench, wall hooks, ribbon-and-wick shelf, finished lantern display, side basket/bench corner.
   - Keep paths open.

5. Add visual-budget guidance.
   - Reduce repeated decorative filler.
   - Let unique lanterns/flowers/tools double as searchable objects.

6. Add full avoid/format block last.
   - No readable text, labels, arrows, circles, boxes, halos, answer marks.
   - KDP 8.5 x 11 / 17:22 / bleed / trim / safe-area wording.

At each step, record whether ChatGPT immediately enters image generation, writes a planning response, stays blank on Thinking, or reaches the image placeholder but times out. The goal is to find the smallest instruction group that changes behavior.

After the split tests, turn the highest-passing version into a `broke-mode-lite` prompt variant for live image generation.

Updated recommendation after the Page 19 known-good comparison:

- Do not spend another run on the reference-only Test 2 wording unless the goal is purely diagnostic.
- Prefer the saved known-good-structure Page 9 prompt for the next supervised Broke Mode attempt.
- Keep the Broke Mode wait capped at 3 minutes per attempt.
- If it reaches the image placeholder but does not complete, archive it and move on; do not let the helper wait 5-12 minutes by default.
- If reference names still cause hesitation, run the same known-good-structure prompt once without the `Character reference:` section and rely on the written Ember description.

Additional automation improvements:

1. Add a `broke-mode-lite` prompt variant.
   - Target about 1,500-2,000 characters.
   - Keep only: create one image now, Ember references, Ember appearance, location, mission item, 50 hidden objects total, 49 unnamed unique hidden objects, 4-5 concrete zones, no text/answer marks, format.
   - Remove most governance language from the live paste.
   - Keep the fuller source prompt and QA report as the auditable record, but do not paste all of it into ChatGPT.

2. Add a longer live wait/recovery option.
   - Let the automation wait 10-12 minutes when ChatGPT shows an image placeholder.
   - After timeout, check whether the browser later produced an image before marking the attempt as final failed.
   - Consider a "recover latest image from current ChatGPT tab" helper so a late completion can still be saved.

3. If the project chat still stalls, test the same lite prompt manually in a fresh ChatGPT image chat.
   - Do not bypass account limits, payment, login, CAPTCHA, or platform protections.
   - This would tell us whether the blocker is the prompt itself or the project-level instruction/source context.

## Do Not Treat As Canon

Tonight's Glowing Lantern Garden success remains a broke-mode test artifact, not Book 1 canon.

The Page 9 Lantern Maker's Workshop prompt is canonical as a prompt fixture, but no Page 9 image has been approved yet.

## Next Manual Step

Do not continue the in-project split ladder until the project-level path/source routing is addressed. First update the ChatGPT project instructions from `Ember's Adventures/Rules and Instructions/CHATGPT_PROJECT_SYSTEM_INSTRUCTIONS.md`, or test the same raw Test 1 prompt in a fresh non-project ChatGPT image chat. Then rerun `content/outputs/prompts/book01-page009-lantern-maker-s-workshop-split-test-prompts.md` one section at a time.

## New Automation Status

Broke Mode now has a reference-upload lane so it can attach real local image files before pasting the prompt instead of relying on ChatGPT Project Sources alone.

Current reference-upload rules:

- Default `--reference-images=auto` resolves images from `Ember's Adventures/EtD Images`
- Ember seek pages upload `Ember-001`, `Ember-002`, and `Ember-003`
- If the page includes another named canon character, Broke Mode also uploads that character's `-001`, `-002`, and `-003` images
- If any non-Ember canon character is involved, Broke Mode also uploads `Ember_Cast_Lineup-001` and `Ember_Cast_Lineup-002`
- Explicit overrides remain available with `--reference-images=<path1,path2,...>` and `--reference-images=none`

This should become the default next Page 9 live test path before spending more time debugging project-Source reference behavior.

First uploaded-reference Page 9 result:

- Image saved: `content/outputs/images/pending-review/book01-page009-known-good-structure-uploaded-refs-2026-05-05T02-50-06-833Z.png`
- QA report: `content/outputs/image-qa-reports/book01-page009-known-good-structure-uploaded-refs-2026-05-05t02-50-06-833z-2026-05-05T02-50-20-975Z-qa.md`
- Result: generation completed quickly with uploaded references, proving file upload works.
- Automated QA warning: image is landscape, not vertical.
- Follow-up automation change: Broke Mode now prepends a reference-upload guard so attached images are treated only as character appearance/proportion references and not as a request for a character sheet, collage, lineup, turnaround, model sheet, or isolated character study.

Correction after user review:

- The auto-saved file above was not the correct artifact to review.
- Correct user-downloaded Page 9 workshop image: `content/outputs/images/pending-review/book01-page009-lantern-maker-workshop-user-downloaded-2026-05-04T23-02-47.png`
- Correct QA report: `content/outputs/image-qa-reports/book01-page009-lantern-maker-workshop-user-downloaded-2026-05-04t23-02-47-2026-05-05T03-06-26-495Z-qa.md`
- Correct imported image dimensions: 1103 x 1426.
- Automated QA result: PASS.
- Next step: use the corrected user-downloaded workshop image for manual visual QA, not the auto-saved landscape/reference-sheet file.

Owner approval:

- Approved image: `content/outputs/images/approved/book01-page009-lantern-maker-workshop-user-downloaded-2026-05-04T23-02-47.png`
- Owner approval timestamp: 2026-05-05T03:22:36.945Z.
- Page 9 image-generation testing is considered complete for this approved asset.
- Do not continue Page 9 split-test or Broke Mode generation debugging unless a later visual/object-list QA issue requires a replacement image.
- Next production step: identify the Baby Flame Lantern location and choose printed Main Finds/Bonus Finds from objects actually visible in the approved art.

Find-list draft:

- Find-list file: `content/outputs/find-lists/book01-page009-lantern-maker-workshop-find-list.md`
- Mission item candidate location: upper-right wall shelf above the orange lantern maker dragon, just left of the hanging green garment.
- Printed list draft includes 10 Main Finds and 15 Bonus Finds selected from visible art.
- Broader visible-object inventory contains 50 candidate objects for density and answer-key planning.
- Next step: confirm the exact Baby Flame Lantern location during answer-key QA, then build the paired story/list page layout.
