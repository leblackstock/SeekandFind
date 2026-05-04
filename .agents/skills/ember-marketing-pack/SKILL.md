---
name: ember-marketing-pack
description: Generate Ember marketing packs with Pinterest, Facebook, Instagram, short-video captions, CTA variants, hashtags, and promo image prompts. Use for social content and launch planning; do not use for interior page prompts, Amazon listing previews, or claims that require publication status.
---

# Ember Marketing Pack

## Required Behavior

Create platform-specific marketing copy and safe promo-image prompts for Ember seek-and-find books.

Read first:

- `content/canon/ember-character-canon.md`
- `content/canon/book-01-sparkleflame-canon.md`
- `content/canon/visual-style-guide.md`
- `content/canon/no-readable-text-policy.md`
- `content/workflows/book-01/production-status.md`
- `Ember's Adventures/Marketing/MARKETING_IMAGE_PROMPT_PACK.md` when working from current marketing assets

## Output

- Pinterest title and description
- Facebook post
- Instagram caption
- short video caption
- CTA variants
- hashtags
- marketing image prompt
- publication-claim guardrail

## Hard Rules

- Do not claim the book is published, available now, or for sale unless production status confirms it.
- Do not represent fresh promo art as a real cover, real interior sample, Amazon listing preview, or inside-the-book image.
- For generated marketing images, either give exact approved text or say `No text.`
- Keep audience clear: children ages 5-8 and adult gift-buyers.

## Save Behavior

Use:

```powershell
npm run generate:marketing -- --asset "<asset>" --goal "<goal>"
```

Save outputs under `content/outputs/marketing/` and append session/progress logs.

## Failure Conditions

Fail if copy is generic, lacks platform formatting, lacks CTA, lacks target audience, misrepresents product status, or weakens the no-fake-listing/no-fake-sample rule.
