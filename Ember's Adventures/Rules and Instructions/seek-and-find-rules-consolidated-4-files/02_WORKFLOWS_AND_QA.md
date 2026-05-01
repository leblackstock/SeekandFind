# Workflows and QA

This file contains the process layer: planning, page creation, prompt building, revision, export, answer-key workflows, and pass/fail QA checklists.

Source-of-truth note: only this four-file rules bundle plus `CHATGPT_PROJECT_SYSTEM_INSTRUCTIONS.md` is authoritative. Archive files, split files, checklists, and Word documents are derivative/reference material only.

Generated from the split v2 source files. Upload only the four consolidated files for active production. The old folder-style paths below are provenance labels only, not separate files to locate or upload.

## Included Sources

- `40_workflows\40_series_planning_workflow.md`
- `40_workflows\41_book_planning_workflow.md`
- `40_workflows\42_page_creation_workflow.md`
- `40_workflows\43_prompt_building_workflow.md`
- `40_workflows\44_review_revision_workflow.md`
- `40_workflows\45_final_export_preflight_workflow.md`
- `40_workflows\46_answer_key_workflow.md`
- `50_qa\50_page_qa_checklist.md`
- `50_qa\51_book_qa_checklist.md`
- `50_qa\52_series_consistency_checklist.md`
- `50_qa\53_coloring_mode_qa_checklist.md`
- `50_qa\54_cover_qa_checklist.md`
- `50_qa\55_prompt_qa_checklist.md`

---

# Source: `40_workflows\40_series_planning_workflow.md`

# Series Planning Workflow

Use this workflow before creating multiple books under one brand or mascot.

## Step 1 — Define the Series Promise

Answer:
- What is the recurring hook?
- Who is the audience?
- What makes this different?
- Is there a mascot?
- What is the difficulty promise?
- Is this full-color, coloring, or both?

## Step 2 — Define Brand Elements

Document:
- series name
- mascot/name if any
- visual style
- color palette
- tone
- target reader
- cover style
- recurring object types

## Step 3 — Define Repeatable Page System

Decide:
- hidden object count range
- mascot hiding standard
- page density
- target list style
- answer key style
- difficulty curve

## Step 4 — Define Book Expansion Plan

List possible future books:
- theme variations
- holiday editions
- age variants
- coloring editions
- harder adult editions

## Step 5 — Legal/Similarity Check

Before production, check:
- title
- mascot
- outfit/accessories
- cover concept
- visual identity

Reject anything too close to an existing property.

## Step 6 — Create Series Brief

Use:
- `60_templates/60_series_brief_template.md`

Save the completed brief in the project folder.

---

# Source: `40_workflows\41_book_planning_workflow.md`

# Book Planning Workflow

Use this workflow for each individual book.

## Step 1 — Select Rule Overlays

Choose:
- audience overlay
- mode overlay
- project/theme overlay

## Step 2 — Define Book Specs

Document:
- title
- subtitle
- trim size
- interior type
- page count
- target age
- difficulty range
- object count per page
- answer key plan

## Step 3 — Plan Page List

For each page, define:
- page theme
- setting
- primary target
- hidden object list
- intended difficulty
- special notes

For Ember shorthand or page-plan requests, use the canonical Ember book plans and story/list source blocks in `03_TEMPLATES_PROMPTS_AND_LOGS.md` as the page-plan source. Production checklists and Word files are derivative working copies, not source of truth; if they conflict with the four rules files or `CHATGPT_PROJECT_SYSTEM_INSTRUCTIONS.md`, correct the checklist/Word copy.

Every shorthand-generated prompt must begin with a row-match block that echoes the exact source row fields used: source section, shorthand/request, page role, printed pages, paired page, prompt title/location, mission item, and preferred files. The prompt must use those same row values without substitution or inference. If sources conflict, stop and report the conflict.

When a shorthand command includes `md` and produces a story/list markdown source, the output must be a downloadable `.md` file attachment using the preferred filename from the page row. Inline markdown alone is not sufficient; it may only serve as a preview.

All shorthand prompts and generated `.md` sources must reference the canonical rules-file source section used. Do not invent story prose, source text, mission items, titles, recap text, closing text, prompt title/location values, or filenames when the canonical row/source block is missing. Stop and ask or report the missing source.

## Step 4 — Check Variety

The page list should vary:
- location
- color mood
- activity
- object types
- hiding method
- composition

Avoid ten versions of the same market square wearing different hats.

## Step 5 — Define Production Standard

Decide:
- image dimensions
- file naming
- review naming
- final export format
- answer key format
- backup/version process

## Step 6 — Create Book Brief

Use:
- `60_templates/61_book_brief_template.md`

---

# Source: `40_workflows\42_page_creation_workflow.md`

# Page Creation Workflow

Use this workflow for each puzzle page.

## Step 1 — Create Page Brief

Use:
- `60_templates/62_page_brief_template.md`

Define:
- page theme
- audience
- mode
- scene description
- primary target
- hidden object list
- intended difficulty
- print/layout notes

## Step 2 — Design the Scene Logic

Before prompting, decide:
- what the main activity is
- what the foreground contains
- what the midground contains
- what the background contains
- where visual density should be highest
- where the primary target should be roughly hidden

## Step 3 — Build Target List

Use:
- `63_hidden_object_list_template.md`

Verify:
- objects fit the theme
- objects vary in shape and size
- objects are not too similar
- object count matches audience/mode

## Step 4 — Build Image Prompt

Use:
- `43_prompt_building_workflow.md`
- `64_prompt_template.md`
- `80_prompt_blocks/`

## Step 5 — Generate Draft Image

Generate one or more draft images.

Do not approve based on prettiness alone.

## Step 6 — Page QA

Run:
- `50_page_qa_checklist.md`
- mode-specific QA if needed
- audience-specific review
- project consistency review

## Step 7 — Revision Notes

Write concrete revision notes:
- what failed
- where it failed
- how to fix it

## Step 8 — Approve or Reject

A page is approved only when:
- all required targets exist
- primary target is fair
- page is print-safe
- audience fit is correct
- style matches the book

---

# Source: `40_workflows\43_prompt_building_workflow.md`

# Prompt Building Workflow

Use this workflow to build image-generation prompts from rules and briefs.

## Prompt Inputs

A complete prompt should draw from:
- book brief
- page brief
- audience overlay
- mode overlay
- project/theme overlay
- universal hiding rules
- universal art rules
- legal/safety rules
- print/KDP rules

## Prompt Sections

Recommended prompt order:

1. Product format
2. Audience
3. Page theme
4. Main scene
5. Mascot or target system
6. Hidden object list
7. Composition requirements
8. Art style
9. Difficulty/hiding instructions
10. Print requirements
11. Negative constraints

## Required Universal Prompt Concepts

Include as applicable:
- commercial-quality
- seek-and-find puzzle book page
- target audience
- print-ready
- vertical/full-page or spread format
- organized visual complexity
- clear silhouettes
- fair hiding
- no copyrighted resemblance
- page-type text policy: seek images use no-text constraints; non-seek text pages request exact approved generated text and forbid extra/unapproved words

## Title Page Prompt Rule

For title page images, reference the mascot/character images saved in ChatGPT Sources by exact uploaded name and include the written mascot description from the active project canon. The prompt must request the exact approved title words only. Do not allow flexible title wording, alternate title concepts, substitutions, extra words, fake text, gibberish, misspellings, watermarks, or page numbers. Never send unresolved placeholders or generic book labels. If the exact approved title, required source images, or written mascot description are missing, stop and ask.

## Story/List Prompt Rule

For story/list page images, prompt for a calmer, less cluttered supporting illustration than the facing seek image. Keep open breathing room around the title, story prose, mission line, and find-list areas. The page source must include the required item counts from the active project workflow, and the prompt must request exact generated text from the approved source for all title, story, mission-line, and list text. If the source block or approved list is missing, stop instead of inventing it.

## Mascot Prompt Rule

For mascot series, every prompt must include:
- mascot name
- species/type
- colors
- signature accessory
- personality
- visibility requirement
- hiding difficulty

## Coloring Prompt Rule

For seek-and-color, every prompt must include:
- black-and-white line art
- clean outlines
- no grayscale shading
- colorable open spaces
- hidden objects readable by outline

## Negative Prompt Concepts

Use negative constraints that match the page type.

For seek images and other puzzle-art pages without planned text:
- no readable text
- no labels
- no speech bubbles
- no watermark
- no page number
- no border unless required
- no copyrighted characters
- no Where's Waldo resemblance
- no red-and-white striped focal outfit
- no muddy clutter
- no blurred details

For non-seek pages that must generate exact text, do not use "no text" or "do not generate readable text." Use:
- no extra words
- no misspellings
- no fake text or gibberish
- no unapproved labels
- no watermark

## Revision Prompt Rule

Revision prompts should name specific fixes, not vague improvements.

Bad:
> Make it more fun.

Good:
> Add more visual mini-stories in the midground, improve contrast around the hidden lantern, and move the primary mascot away from the bottom page edge.

---

# Source: `40_workflows\44_review_revision_workflow.md`

# Review and Revision Workflow

Use this workflow after each generated page.

## Step 1 — Quick Rejection Scan

Reject immediately if:
- primary target missing
- major legal similarity issue
- image is too broken to salvage
- content is age-inappropriate
- page is not usable for the selected mode

## Step 2 — Target Verification

Check:
- every listed object exists
- each object is identifiable
- objects are distributed across the page
- no accidental duplicates create confusion

## Step 3 — Hiding Fairness Review

Check:
- primary target is not edge-hidden
- target is not too tiny
- target is identifiable once found
- camouflage is fair
- solve difficulty matches audience

## Step 4 — Art Quality Review

Check:
- composition
- visual hierarchy
- color/contrast
- character quality
- print risk
- AI artifacts

## Step 5 — Audience Review

Check against selected audience overlay.

Ask:
- Is this too hard?
- Is this too easy?
- Is this age-appropriate?
- Would the buyer be satisfied?

## Step 6 — Revision Decision

Choose:
- approve
- revise with targeted fixes
- regenerate from stronger prompt
- reject concept and re-plan page

## Step 7 — Record Notes

Use:
- `65_qa_report_template.md`

For significant changes, update:
- `90_logs/change_log.md`

---

# Source: `40_workflows\45_final_export_preflight_workflow.md`

# Final Export Preflight Workflow

Use this workflow before assembling or uploading a finished book.

## Book-Level Checks

Confirm:
- correct trim size
- correct page count
- correct interior type
- all pages approved
- answer key complete if used
- no missing target lists
- no duplicate or skipped page numbers if page numbers are used
- no accidental text artifacts in art

## Print Checks

Confirm:
- resolution suitable for print
- safe margins respected
- bleed handled correctly
- gutter risk checked
- contrast acceptable
- no important objects near trim

## Consistency Checks

Confirm:
- art style consistent
- mascot consistent
- difficulty curve acceptable
- target count pattern consistent
- page themes varied
- cover matches interior

## Legal/Safety Checks

Confirm:
- no protected character resemblance
- no brand logos
- no misleading product claims
- no age-inappropriate content
- platform AI disclosure rules checked

## Final Approval

A book is ready only after:
- all pages pass QA
- cover passes cover QA
- book-level QA passes
- export specs match publishing platform requirements

---

# Source: `40_workflows\46_answer_key_workflow.md`

# Answer Key Workflow

Use this workflow when the book includes answer keys.

## Answer Key Decision

Include an answer key if:
- the book is Level 3 or harder
- the audience is older children, teens, or adults
- hidden-object count is high
- buyer expectations require it

## Answer Key Styles

Options:
1. thumbnail page with circled targets
2. numbered coordinates
3. object-by-object location descriptions
4. simplified map overlay
5. separate digital answer companion

## Best Default

For print books, use reduced page thumbnails with clear circles or markers.

## Requirements

Answer keys must:
- match the final approved art
- identify every listed target
- be easy to read
- not spoil pages before the puzzle section
- use consistent formatting

## Warning

Do not create answer keys before final art is approved. Regenerated art changes target locations.

---

# Source: `50_qa\50_page_qa_checklist.md`

# Page QA Checklist

Use this checklist for every puzzle page.

## Basic Page Check

- [ ] Page has a clear theme.
- [ ] Page matches the selected audience.
- [ ] Page matches the selected mode.
- [ ] Page has strong visual appeal.
- [ ] Page has no obvious broken AI artifacts in important areas.
- [ ] Page has no unwanted text, labels, watermarks, or page numbers.

## Composition Check

- [ ] Foreground, midground, and background are distinct.
- [ ] Detail is distributed across the page.
- [ ] No major dead empty zones.
- [ ] No single area carries all interesting content.
- [ ] Page is dense but not muddy.

## Hidden Object Check

- [ ] Primary target exists.
- [ ] Primary target is not at the extreme edge.
- [ ] Primary target is identifiable once found.
- [ ] All listed secondary targets exist.
- [ ] Hidden objects are distributed across the page.
- [ ] No more than the allowed number of hidden objects are in the foreground.
- [ ] No target is hidden only by being tiny or invisible.
- [ ] No accidental duplicate makes the answer ambiguous.

## Print Check

- [ ] Important targets are inside the safe area.
- [ ] Details should survive print.
- [ ] Contrast is adequate.
- [ ] Nothing important is in the gutter risk zone.

## Legal/Safety Check

- [ ] No copyrighted character resemblance.
- [ ] No protected logos or brands.
- [ ] Content is age-appropriate.
- [ ] No disturbing hidden imagery.

## Decision

- [ ] Approved
- [ ] Revise
- [ ] Regenerate
- [ ] Reject

---

# Source: `50_qa\51_book_qa_checklist.md`

# Book QA Checklist

Use this checklist before final assembly.

## Concept

- [ ] Book has a clear title and theme.
- [ ] Target audience is defined.
- [ ] Mode is defined.
- [ ] Difficulty promise is clear.
- [ ] Book concept is commercially understandable.

## Page Set

- [ ] All pages are approved.
- [ ] Page themes are varied.
- [ ] Difficulty curve is intentional.
- [ ] No page feels like filler.
- [ ] Target counts are consistent or intentionally varied.
- [ ] Hidden-object rules are consistent.

## Mascot/Series

- [ ] Mascot design is consistent if used.
- [ ] Mascot appears according to project rules.
- [ ] Signature features remain recognizable.
- [ ] Series branding is consistent.

## Production

- [ ] Trim size is defined.
- [ ] Resolution is sufficient.
- [ ] Bleed/safe area handled.
- [ ] Answer key complete if used.
- [ ] Cover matches interior promise.

## Legal/Safety

- [ ] No protected character imitation.
- [ ] No misleading age positioning.
- [ ] No unsafe content.
- [ ] Platform disclosure requirements checked.

## Final Decision

- [ ] Ready for layout
- [ ] Needs revision
- [ ] Needs concept rework

---

# Source: `50_qa\52_series_consistency_checklist.md`

# Series Consistency Checklist

Use this checklist when making books under one brand or mascot.

## Brand

- [ ] Series name format is consistent.
- [ ] Cover style is consistent.
- [ ] Subtitle style is consistent.
- [ ] Audience target is consistent or clearly varied by edition.
- [ ] Product promise is consistent.

## Mascot

- [ ] Mascot name is consistent.
- [ ] Mascot colors are consistent.
- [ ] Mascot accessories are consistent.
- [ ] Mascot personality is consistent.
- [ ] Mascot does not drift into a new design.

## Art

- [ ] Art style is consistent.
- [ ] Detail density is consistent with audience.
- [ ] Color approach is consistent unless intentionally varied.
- [ ] Page complexity fits the series promise.

## Puzzle Rules

- [ ] Object count pattern is consistent.
- [ ] Difficulty range is consistent.
- [ ] Hiding rules are consistent.
- [ ] Answer key format is consistent.

## Expansion

- [ ] New book concept fits the series.
- [ ] New theme does not break core identity.
- [ ] New theme is commercially understandable.

---

# Source: `50_qa\53_coloring_mode_qa_checklist.md`

# Coloring Mode QA Checklist

Use this checklist for seek-and-find coloring books.

## Line Art

- [ ] Black-and-white line art is clean.
- [ ] No muddy grayscale shading.
- [ ] Lines are strong enough for print.
- [ ] Line weight supports visual hierarchy.
- [ ] There are enough open spaces to color.

## Puzzle Function

- [ ] Hidden objects are readable by outline.
- [ ] Hidden objects do not depend on color.
- [ ] Object count is appropriate.
- [ ] Page is not too cramped.
- [ ] Target list items remain recognizable.

## Coloring Experience

- [ ] Page has satisfying areas to color.
- [ ] Tiny textures do not overwhelm the page.
- [ ] Major objects have clear boundaries.
- [ ] Page will not feel like coloring static.

## Print

- [ ] Page prints cleanly in black and white.
- [ ] No important details are too faint.
- [ ] No important details are too close to trim/gutter.

---

# Source: `50_qa\54_cover_qa_checklist.md`

# Cover QA Checklist

Use this checklist for covers and marketing images.

## Thumbnail Appeal

- [ ] Theme is clear at small size.
- [ ] Main character or visual hook is clear.
- [ ] Composition is not too cluttered.
- [ ] Title area is readable.
- [ ] Color is attractive and marketable.

## Product Accuracy

- [ ] Cover matches the interior style.
- [ ] Cover matches the audience.
- [ ] Cover accurately represents difficulty/type.
- [ ] Coloring book status is clear if applicable.

## Legal

- [ ] No protected character resemblance.
- [ ] No trademarked logos.
- [ ] No misleading imitation of famous seek-and-find brands.

## Sales Appeal

- [ ] Looks giftable.
- [ ] Looks professional.
- [ ] Communicates the activity quickly.
- [ ] Has a memorable hook.

---

# Source: `50_qa\55_prompt_qa_checklist.md`

# Prompt QA Checklist

Use this before sending an image prompt.

## Required Prompt Elements

- [ ] Product type stated.
- [ ] Audience stated.
- [ ] Page theme stated.
- [ ] Scene description included.
- [ ] Mode stated.
- [ ] Primary target/mascot defined if used.
- [ ] Hidden-object list included.
- [ ] Difficulty target included.
- [ ] Composition requirements included.
- [ ] Print requirements included.
- [ ] Negative constraints included.
- [ ] For title pages: saved ChatGPT Sources character image names included and exact approved title words supplied.
- [ ] For title pages: written mascot description included; for Ember, explicitly baby dragon and not fox/cat/human wizard.
- [ ] For title pages: no unresolved title placeholders, generic book labels, or off-reference mascot redesigns.

## Mascot Prompt Check

- [ ] Mascot name included.
- [ ] Species/type included.
- [ ] Colors included.
- [ ] Signature accessories included.
- [ ] Consistency requirement included.
- [ ] Hiding instruction included.

## Coloring Prompt Check

- [ ] Black-and-white line art specified.
- [ ] No grayscale shading specified.
- [ ] Clean outlines specified.
- [ ] Colorable spaces specified.

## Risk Check

- [ ] No copyrighted character request.
- [ ] No vague "make it good" dependency.
- [ ] No contradictory instructions.
- [ ] Object count is realistic for the audience/mode.
