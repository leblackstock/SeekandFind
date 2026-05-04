# Canva Layout Helper Recipe

## Purpose

Use Playwright to open Canva and capture layout progress screenshots. Canva remains a manual layout/review tool.

## Prerequisites

- Canva account access handled outside the repo
- Approved art and copy
- Editable typography used for marketing text and title text

## Manual-Only Steps

- Login
- Payment/subscription decisions
- Template licensing choices
- Final export approval

## Allowed Automation Steps

- Open Canva.
- Check login state.
- Capture screenshots for progress records.
- Stop at sensitive account or platform boundaries.

## Stop Conditions

Stop at login, CAPTCHA, payment/subscription, account verification, rate limits, or unreliable UI changes.

## Screenshot and Logging

Save screenshots under `content/outputs/session-logs/screenshots/`.

## Failure Handling

If the target design is not visible or selectors are unreliable, stop and ask for manual review.
