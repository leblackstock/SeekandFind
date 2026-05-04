# Seedance Storyboard Upload Recipe

## Purpose

Use Playwright as a reviewable helper for opening Seedance, checking login state, and preparing a manually approved storyboard prompt.

## Prerequisites

- `npm install`
- `npx playwright install chromium`
- Seedance account already logged in through the browser profile if required
- Approved storyboard file in `content/outputs/storyboards/`

## Manual-Only Steps

- Selecting paid render options
- Accepting terms, payments, subscriptions, or credit use
- Solving CAPTCHA
- Uploading identity or account verification
- Final render approval

## Allowed Automation Steps

- Open Seedance.
- Capture a screenshot for the session log.
- Stop if login or sensitive account boundaries appear.
- Place an approved prompt into a visible textbox only after human review.

## Stop Conditions

Stop at login, CAPTCHA, payment/subscription prompts, account verification, rate limits, platform restrictions, or UI changes that make selectors unreliable.

## Screenshot and Logging

Save screenshots under `content/outputs/session-logs/screenshots/` and note the storyboard file used in the session log.

## Failure Handling

If the page does not match the expected UI, stop and record the issue. Do not guess selectors or click through account prompts.
