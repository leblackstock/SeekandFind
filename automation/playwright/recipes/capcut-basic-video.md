# CapCut Basic Video Recipe

## Purpose

Use Playwright to open CapCut and capture progress screenshots while the human performs review-sensitive editing steps.

## Prerequisites

- CapCut account access handled outside the repo
- Approved storyboard or generated clips
- No passwords stored in the repo

## Manual-Only Steps

- Login
- Subscription or payment choices
- Final timeline edits
- Publishing/export decisions

## Allowed Automation Steps

- Open CapCut.
- Check whether login is required.
- Capture screenshots for progress records.
- Stop at sensitive account or payment boundaries.

## Stop Conditions

Stop at login, CAPTCHA, payment/subscription, account verification, rate limits, or unreliable UI changes.

## Screenshot and Logging

Save screenshots under `content/outputs/session-logs/screenshots/`.

## Failure Handling

If CapCut changes the UI, stop and update this recipe before automating more steps.
