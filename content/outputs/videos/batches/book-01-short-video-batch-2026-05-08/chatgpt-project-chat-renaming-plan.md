# ChatGPT Project Chat Renaming Plan

Batch: `book-01-short-video-batch-2026-05-08`

Scope: ChatGPT project chat naming for Broke Mode video-source image runs. This plan is for rename reliability only. It does not generate images, submit prompts, upload files, modify `queue.json`, generate videos, post to social platforms, or touch `Ember's Adventures/`.

## 1. Current Problem

The previous rename flow treated ChatGPT backend API agreement as rename success. That was not reliable. The API could report the requested title while the visible ChatGPT project UI still showed a generic title such as `Ember Video Source Image` or `Video-source Image Request`.

That matters because the visible project list is the operator-facing source of truth during later review. If the browser/project UI does not visibly show the expected title, the workflow must not record the rename as successful.

Current code findings:

- `automation/playwright/scripts/chatgpt-chat-title.ts` can clean titles, attempt the backend PATCH rename, and verify visible row/title text for a known conversation ID. It does not yet perform the Day 7-style project-list row menu rename as an automated primary method.
- `automation/playwright/scripts/chatgpt-broke-mode-generate.ts` currently submits the prompt, calls `renameCurrentChat()`, records API/visible rename metadata, then starts the image watcher. It continues with a warning if visible rename verification fails.
- `automation/social/broke-video-source.ts` creates expected titles in the format `Book 1 Day 07 Video Source Image - Golden Welcome Bell` and states that `queue.json` is never updated by this workflow. Its docs mention visible verification, but not the full project-list row-menu method needed after the Day 7 finding.

Live project inspection on 2026-05-08 found the project tab clean:

- URL: `https://chatgpt.com/g/g-p-69efa9ddfdd08191b8673b0f32dfb621-seek-and-find-books/project`
- Duplicate-file modal: false
- Queued attachments: 0
- Prompt text: empty
- Visible expected rows currently present for Days 7, 8, 9, and 10.

## 2. Known Working Day 7 Method

Known working example:

- Expected visible title: `Book 1 Day 07 Video Source Image - Golden Welcome Bell`
- Conversation ID: `69fd54c5-f1d8-83ea-95d3-9c575e352f19`
- The chat was confirmed from the live chat body because it contained the Golden Welcome Bell prompt text.
- Direct conversation navigation later redirected to the project root.
- Rename succeeded through the project-list row options menu:
  1. Open the project root.
  2. Locate the row whose `href` contains `/c/69fd54c5-f1d8-83ea-95d3-9c575e352f19`.
  3. Open that row's conversation options menu.
  4. Choose `Rename`.
  5. Fill the visible `Chat title` input with the expected title.
  6. Press Enter.
  7. Verify the project-list row text starts with the expected title.

This is the strongest known method because it changes and verifies the exact visible UI surface the operator sees.

## 3. Proposed Primary Rename Method

The primary method should be a visible project-list row-menu rename, keyed by conversation ID and backed by prompt-body confirmation.

Recommended implementation sequence after a Broke Mode prompt is submitted:

1. Keep the original generation page open. Do not navigate it away while the image may be generating.
2. Wait for the active generation page to expose a `/c/{conversation_id}` URL.
3. Record `conversation_id` from the active page URL.
4. Build a prompt fingerprint from the exact prompt submitted:
   - expected chat title
   - day number
   - asset slug or mission/concept phrase, such as `Dragon Door Key`
   - day-specific reference filename phrase when present
   - the first stable prompt sentence after the upload guard
5. Verify the active chat body contains the unique day/concept markers from that prompt fingerprint.
6. Open a second Playwright page in the same browser context to the ChatGPT project root.
7. In that second page, locate exactly one visible project-list row whose link `href` contains the captured `conversation_id`.
8. If multiple rows match, stop and record a failure. If no row matches, do not guess from broad page text.
9. Open the matched row's conversation options menu and choose `Rename`.
10. Fill the visible `input[aria-label="Chat title"]` with the expected title and press Enter.
11. Re-read the row for that same `conversation_id`.
12. Treat the rename as successful only if the visible row text starts with the expected title.

The backend API may still be queried as supplemental evidence, but it must not be the proof of success.

## 4. Verification Method

Visible verification is required.

The workflow should verify against a narrow UI surface:

- Preferred: visible project-list row whose `href` contains the captured `conversation_id`.
- Acceptable: active sidebar/current-chat row for the same `conversation_id`.
- Not acceptable: broad `document.body.innerText` containing the title somewhere else.
- Not acceptable: backend API title alone.

The visible row text may appear as `Expected TitleAttached images...` because ChatGPT sometimes joins the title and preview snippet without a space. That still counts when the row text starts with the expected title.

Verification must record:

- The captured `conversation_id`.
- The expected title.
- The observed row text.
- The project URL used for verification.
- Whether the row was visible.
- Whether the row `href` matched the exact `conversation_id`.
- The result of the active chat body prompt-fingerprint check.

## 5. Fallback Behavior

Direct conversation URLs may redirect to the project root. That should not be treated as a failure by itself.

Fallback handling:

1. If direct `/c/{conversation_id}` navigation redirects to the project root, use the project-list row for that `conversation_id`.
2. If the active chat page has no `/c/` URL after prompt submission, do not rename. Record a warning and continue only if the run is already safely submitted.
3. If the project-list row exists but the Rename menu is unavailable, record a manual rename instruction with the exact conversation ID and expected title.
4. If the backend API returns HTTP 429 or any other failure, do not retry aggressively. The row-menu method should remain primary.
5. If the row-menu rename succeeds visually but API verification fails or is rate-limited, record visible success and API warning separately.

Manual fallback instruction format:

`Manual rename required: in the Seek and Find Books project, set conversation {conversation_id} to "{expected_chat_title}". Confirm the row text starts with that title before generation is considered cleanly labeled.`

## 6. Failure Modes

API title changes but visible title does not:

- Record `chat_rename_api_verified: true`.
- Record `chat_rename_visible_verified: false`.
- Record `chat_rename_method: "api-only-untrusted"`.
- Add `chat_rename_warning` explaining that API-only verification is a false-positive risk.
- Do not call the rename successful.

Visible title cannot be verified:

- Record `chat_rename_visible_verified: false`.
- Record the best observed row candidates.
- Save DOM evidence.
- Save a screenshot if a browser page is available.
- Continue the already-started generation watcher with a warning, but mark the rename state as not verified.

No conversation ID is available:

- Do not use title search, recency, or generic prompt text alone to rename.
- Record `conversation_id: null`.
- Record `chat_rename_method: "not-attempted-no-conversation-id"`.
- Continue only with a warning if the prompt has already been submitted.

Multiple rows match the same ID:

- Stop the rename action.
- Record the duplicate candidates.
- Require manual review.

Multiple generic rows look similar:

- Ignore title-like generic rows unless their `href` matches the captured `conversation_id`.
- Use prompt fingerprint only as confirmation, not as the sole selector for renaming.

Sensitive boundary appears:

- Stop automation at login, payment, CAPTCHA, rate-limit, account-warning, or upgrade boundaries.
- Save a warning and require manual intervention.

## 7. Exact State And Report Fields

The next implementation should record these fields in the attempt metadata and session/report output:

| Field | Meaning |
| --- | --- |
| `chat_rename_requested` | `true` only when the workflow actually attempted a rename action. |
| `chat_rename_api_verified` | `true` only when the backend API title matched; never enough by itself. |
| `chat_rename_visible_verified` | `true` only when a visible row/title for the exact conversation ID starts with the expected title. |
| `chat_rename_method` | One of `project-list-row-menu`, `active-chat-visible-already-correct`, `api-only-untrusted`, `manual-required`, `not-attempted-no-conversation-id`, or `failed`. |
| `chat_rename_warning` | Human-readable warning or manual rename instruction. Empty only when visible verification passes. |
| `conversation_id` | The exact ChatGPT conversation ID captured from the post-submit active chat URL. |
| `expected_chat_title` | The title the workflow intended to set, for example `Book 1 Day 09 Video Source Image - Dragon Door Key`. |
| `observed_visible_chat_title` | The visible row/title text read from the project UI for the exact conversation ID. |

Recommended additional evidence fields:

- `chat_rename_project_url`
- `chat_rename_active_chat_url`
- `chat_rename_prompt_fingerprint`
- `chat_rename_prompt_fingerprint_verified`
- `chat_rename_visible_row_href`
- `chat_rename_visible_row_rect`
- `chat_rename_visible_candidates`
- `chat_rename_dom_evidence_path`
- `chat_rename_screenshot_path`
- `watcher_started_after_chat_rename`

## 8. Screenshot And DOM Evidence To Save

For each generated attempt, save a small rename evidence JSON next to the attempt metadata. It should include:

- active page URL after submission
- captured `conversation_id`
- expected chat title
- prompt fingerprint markers
- active chat body marker pass/fail
- project-list matched row `href`
- project-list matched row text before rename
- menu/input old title value
- project-list matched row text after rename
- final visible verification result
- API title result if queried
- warnings

Save a screenshot when possible:

- after prompt submission, before rename
- after row-menu rename, showing the project-list row with the expected title

The screenshot is supporting evidence. The DOM evidence is the source used for pass/fail.

## 9. Watcher Timing

Image watching should start only after the rename phase records a final state:

- visible verified
- visible verification failed
- API-only/untrusted
- manual-required
- not-attempted-no-conversation-id

The watcher should not wait indefinitely for rename success. Rename failure should not discard an already-started generation, because losing the generated image is worse than carrying a rename warning.

Recommended behavior:

- If visible rename verifies quickly, start the watcher with `watcher_started_after_chat_rename: "visible-title-verified rename"`.
- If visible rename cannot verify within the bounded window, start the watcher with `watcher_started_after_chat_rename: "rename-failed warning"`.
- The watcher should use the original generation page, not the project-list page used for row-menu rename.

## 10. Recommendation Before More Generation

Recommendation: implement the row-menu rename method before running Day 9, Day 10, or any further Broke Mode generation.

Current code is improved enough to avoid calling API-only success a clean pass, but it still does not automate the known reliable Day 7 row-menu method during a live generation run. The next code change should:

1. Add a project-list row-menu rename helper keyed by `conversation_id`.
2. Use a second Playwright page for row-menu rename so the original generation page remains available for watching.
3. Add the required state/report fields listed above.
4. Save DOM evidence and a screenshot path.
5. Keep API title checks as optional evidence only.
6. Continue generation with a warning if rename fails, but never report the rename as successful without visible verification.

Until that is implemented, more Broke Mode generation can produce usable images, but chat labels may drift or require manual row-menu cleanup afterward.
