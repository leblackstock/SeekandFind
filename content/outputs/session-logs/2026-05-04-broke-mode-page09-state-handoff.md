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

The fixed broke-mode compact prompt was saved here:

- `content/outputs/images/pending-review/book01-page009-lantern-maker-s-workshop-fixed-direct-prompt-test-v2-2026-05-04T05-14-27-986Z-prompt.md`

That dry-run prompt starts with `Create one image now.`, uses `Ember-001`, `Ember-002`, and `Ember-003` directly, and removes the previous stall-prone wording such as `when available`, `If references are unavailable`, `project/source context`, and `Do not rewrite`.

## What Worked

- The prompt generator passes QA for the canonical Page 9 row.
- Broke-mode prompt preparation now produces a compact image-facing prompt instead of a source packet.
- Regression tests now reject assistant-routing or uncertain reference language.
- Full test suite and build passed after the prompt-generation fixes.

## Failures Recorded

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

Additional automation improvements:

1. Add a `broke-mode-lite` prompt variant.
   - Target about 1,500-2,000 characters.
   - Keep only: create one image now, Ember references, Ember appearance, location, mission item, 4-5 concrete zones, no text/answer marks, format.
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

 Tomorrow, run split-prompt tests first, then create and dry-run the `broke-mode-lite` Page 9 prompt from the strongest passing test. Manually inspect the paste-ready text before another full live image attempt.
