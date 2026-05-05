# Pinterest Posting Procedure

Use this for Ember campaign posts created through the existing Chromium/Pinterest session.

## Required Checks

1. Confirm Pinterest is signed in to the correct account: `Ember Dragon Books`.
2. Read the active calendar row from:
   `content/outputs/marketing/calendar/book-1-prelaunch-rolling-campaign.json`
3. Verify the approved asset file exists before opening Pin Builder.
4. Use the calendar row for platform, board intent, caption, CTA, and notes.
5. Keep the destination link blank until a real store or landing page URL exists.
6. Use prelaunch wording only. Do not claim the book is published, for sale, on Amazon, or available now unless production status confirms it.
7. After publishing, open the live pin and record the URL.
8. Mark the posted calendar row complete by regenerating the calendar with the updated completed count.
9. Save a post record under `content/outputs/marketing/posts/`.
10. Append session and production-status log entries.

## Browser Automation Notes

- Prefer the existing CDP-enabled Chromium session when available at `http://127.0.0.1:9222`.
- Do not automate login, account recovery, CAPTCHA, payment, or permission prompts.
- Before publishing, verify: board, image, title, description, alt text, link status, and schedule setting.
- If Pinterest shows a non-blocking image-size warning, record it in the post record.

## Known Failures To Avoid

- Do not use TypeScript-only syntax such as `el as HTMLTextAreaElement` inside inline `npx tsx -` browser snippets. The inline runner may treat the snippet as JavaScript and fail before page interaction.
- Do not target the last textarea on Pinterest Pin Builder. Pinterest includes a hidden `g-recaptcha-response` textarea.
- For alt text, target the visible textarea with placeholder `Explain what people can see in the Pin`.
- After clicking `Add alt text`, re-inspect visible textarea fields before filling.
- Do not publish until a live page check confirms the draft contains the intended title, description, image, board, alt text, and blank destination link.

## Day 1 Verified Pattern

- Board used: `Dragon Books for Kids`
- Pin URL: `https://www.pinterest.com/pin/1148417973750217999`
- Non-blocking warning: Pinterest recommended at least 1000 px width; approved asset was 941 px wide and still posted successfully.
