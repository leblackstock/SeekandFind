# Seedance / CapCut Prompt Anecdotes

Last updated: 2026-05-06

Purpose: working notes for Day 1 launch-schedule short videos and future Ember short-video prompts.

## Current Takeaways

- Use the uploaded Ember image as the strict source/reference first, then describe motion. Official CapCut/Dreamina pages emphasize text plus image input, reference-based control, character consistency, and duration/aspect/resolution settings.
- Keep the prompt compact and focused. Dreamina prompt guidance recommends a short clear prompt, leading with the subject, describing only the details that matter, and using negative instructions carefully.
- For 15-second shorts, a timed structure is worth testing. Forum examples repeatedly frame stronger results as timeline/beat prompts, with pacing written as `0:00-0:15` instead of a vague paragraph.
- Treat the prompt like editing direction, not just a story idea. Forum users describe better results when prompts specify shot rhythm, camera behavior, subject action, and what changes between moments.
- For our no-caption lane, keep voice/narrator off and explicitly block captions/readable text.
- Failed test: CapCut's `Full video` lane is not the right default for clean Ember image-to-video. The Day 1 test converted a 15-second brief into a 48-second storyboard made of four 12-second clips, included visible generated text, and introduced off-model/non-Ember media.
- Use `Video clip` for the next clean motion-only test because its own UI describes it as a single-scene clip.
- New forum-supported adjustment: start shorter than the failed 15-second/full-video attempt. A 5-second look-lock is safest. The 10-second mini tests were useful but exposed late-clip drift, including a weird-eye failure at the end of the visible paw-wave retry.
- For `Video clip`, do not use a multi-beat timeline prompt. Use a compact role-locked image-to-video prompt: source image as first frame, one subject, one action cluster, one camera move, one style, and a short avoid list.

## Prompt Shape To Test

```text
FORMAT: 15-second vertical 9:16 image-to-video, one continuous gentle storybook shot.
SOURCE: Use the attached Ember image as the strict visual source. Preserve Ember's exact baby-dragon design, blue-teal scarf, brown satchel, warm colors, and soft 2.25D illustration style.
TIMELINE: 0:00-0:03 slow push-in, warm lantern-like glow begins. 0:03-0:07 Ember gives one tiny friendly wave and blinks. 0:07-0:11 very mild parallax and two or three slow sparkles. 0:11-0:15 Ember smiles warmly toward the viewer.
MOTION: calm, readable, cute, non-scary.
AVOID: captions, readable text, logos, watermarks, extra characters, crowds, new props, scene changes, fast cuts, or realistic redesign.
```

## Sources Checked

- Official CapCut Dreamina Seedance 2.0 guide: text prompt plus optional image references, then set duration/aspect/resolution before generating.
  Source: https://www.capcut.com/tools/dreamina-seedance-2-0-pad
- Official CapCut Seedance 2.0 page: image-to-video/text-to-video, duration and aspect controls, improved motion stability and visual consistency.
  Source: https://www.capcut.com/tools/dreamina-seedance-2-0
- Official Dreamina prompt tips page: keep prompts short and clear, lead with the subject, describe only what matters, and use negative prompts carefully.
  Source: https://dreamina.capcut.com/resource/seedance-2-0-prompt
- Official Dreamina tutorial: write a clear descriptive prompt; multimodal prompts can reference uploaded files; review/regenerate before download.
  Source: https://dreamina.capcut.com/resource/how-to-use-seedance-2-0
- CapCut newsroom: Seedance 2.0 supports high prompt adherence, uploaded words/images/reference videos, and clips up to 15 seconds in multiple aspect ratios.
  Source: https://www.capcut.com/newsroom/dreamina-seedance-2
- Official CapCut Pad guide: Seedance supports text/image inputs, reference-based creative control, and short-form social video clips; multi-shot narrative generation is a separate strength that can become risky for clean single-scene motion-only output.
  Source: https://www.capcut.com/tools/dreamina-seedance-2-0-pad
- Reddit prompt-engineering anecdote: use explicit file roles, keep the structured prompt under about 80 words, use subject/action/scene/camera/style, start with 4-5 seconds, one camera move per shot, and no fast hand gestures.
  Source: https://www.reddit.com/r/PromptEngineering/comments/1rjqm5v/seedance_20_prompt_engineering/
- Reddit anecdote: a Seedance 2.0 example credited timed `0:00-0:15` writing, tight 15-second pacing, and each beat having a small payoff.
  Source: https://www.reddit.com/r/seedance2pro/comments/1rxmkm5/how_to_make_viral_ai_videos_with_seedance_20/
- Reddit anecdote: one user argued Seedance 2.0 should be treated more like an editor/workflow than a generic prompt-to-video box.
  Source: https://www.reddit.com/r/Seedance_AI/comments/1skcq6v/stop_prompting_seedance_20_like_this_youre/
- Reddit anecdote: a single starting image plus a simple action/camera prompt can produce story progression, but action-heavy examples are not our calm Ember lane.
  Source: https://www.reddit.com/r/seedance2pro/comments/1ruwc4f/seedance_20_video_starting_from_a_single_image/

## Day 1 Application

For the next Day 1 Meet Ember launch-schedule retry, use this as the motion-only test:

- CapCut mode: `Video`
- Subtype: `Video clip`
- Ratio: `9:16`
- Duration: default to `5s` for the next clean look-lock retry; use `10s` only after a 5-second clip preserves Ember's eyes and model cleanly through the ending
- Voice: `None`
- Current chosen music: `Rua do Lazer` (CapCut music card; visible card also shows `DJ Reverb & ...`, duration `03:08`)
- Prompt: compact `SOURCE / MOTION / CAMERA / STYLE / AVOID`; do not use timed beat captions for this lane
- Do not use CapCut caption/narration story blocks for this no-caption video.

## Hugging Face Wan2.2 Fallback Candidate

Candidate Space: https://huggingface.co/spaces/zerogpu-aoti/wan2-2-fp8da-aoti-faster

Why it fits this problem:

- It is an image-to-video Gradio Space, so it can use the Ember still as the visual source instead of asking for a fresh generated character.
- It runs Wan2.2 I2V 14B with Lightning LoRA / FP8 / AoT acceleration on Hugging Face ZeroGPU.
- Its app code uses 16 fps with an 8-to-80 frame clamp, so the practical duration range is about 0.5s to 5.0s. That naturally prevents the 10-second late-clip eye drift seen in CapCut.
- It exposes duration, inference steps, guidance, seed, randomize seed, and negative prompt controls.

Recommended first test:

- Input image: `content/outputs/images/pending-review/day-1-meet-ember-seedance-source-image-recovered-2026-05-05T22-47-49-446Z.png`
- Duration: `4.0s` first; try `5.0s` only if the 4-second result stays on-model through the final frame.
- Steps: start with `6` because the Space default uses 6.
- Seed: use fixed seed first for repeatability; randomize only after a clean baseline.
- Main prompt: `content/outputs/prompts/day-1-meet-ember-huggingface-wan2-2-tomorrow-main-prompt.md`
- Negative prompt prefix: `content/outputs/prompts/day-1-meet-ember-huggingface-wan2-2-tomorrow-negative-prompt-prefix.md`
- QA target: eyes stay normal at final frame, Ember remains the only character, scarf/satchel stay visible, no text/logos, no realistic redesign.

## Video Clip Prompt Shape

```text
Use attached Ember image as first frame and strict source. Ember is the only character: tiny pumpkin-orange baby dragon, blue-teal scarf, brown satchel. Gentle 10-second vertical 9:16 storybook clip: Ember softly breathes, blinks, gives one tiny slow wave; camera makes a very slow push-in; warm lantern glow and two soft sparkles. Preserve soft 2.25D illustration. No text, captions, logos, watermarks, extra characters, new props, scene changes, fast motion, or realistic redesign.
```

## Failed Test Log

### 2026-05-06 - Day 1 Meet Ember `Video clip`

- Result: Blocked before generation.
- Visible output: CapCut showed the uploaded Ember image, `Dreamina Seedance 2.0 Fast`, `9:16`, `10s`, `720p`, then displayed `Upgrade to generate with advanced video models.`
- Failure/blocker type: platform/paywall gate for Seedance 2.0 Fast, not a prompt failure and not a visual QA failure.
- Screenshot: `content/outputs/videos/pending-review/capcut-video-clip-after-user-generate-seedance-unavailable-check.png`
- Decision: Do not click Upgrade unless Lauren chooses to pay. Next free/local path should test a non-Seedance/free video model if one exists in CapCut, or move this Ember source image/prompt to another image-to-video tool.

### 2026-05-06 - Day 1 Meet Ember `Video clip` retry with `Dreamina Seedance 1.0 mini`

- Result: Generated; pending owner review.
- Fresh draft: `20260505232619`.
- Generated draft/card: `Video 1`, generated into draft URL with `draftId=2D02CB63-855D-4E57-8FFD-17957440FE89`.
- Visible setup: `Video clip`, `Dreamina Seedance 1.0 mini`, `720p`, `9:16`, `10s`.
- Reason for model change: `Dreamina Seedance 2.0 Fast` hit an upgrade gate; `Dreamina Seedance 1.0 mini` appeared in the model dropdown without the upgrade diamond shown beside the 2.0 models.
- Prompt: `content/outputs/prompts/day-1-meet-ember-capcut-video-clip-look-lock-prompt.md`.
- Screenshot: `content/outputs/videos/pending-review/capcut-video-clip-retry2-final-mini-settings-not-generated.png`.
- Generated screenshots: `content/outputs/videos/pending-review/capcut-video-clip-retry2-after-send-current.png`, `content/outputs/videos/pending-review/capcut-video-clip-retry2-preview-start.png`, `content/outputs/videos/pending-review/capcut-video-clip-retry2-preview-mid.png`, `content/outputs/videos/pending-review/capcut-video-clip-retry2-preview-late.png`.
- Cost observed: 10 credits consumed; account display changed from 360 to 350.
- Preliminary QA from visible frames: vertical 9:16, no visible captions/text/logos/watermarks, Ember remains the only character, blue scarf and satchel are present. The video simplifies/rounds the source Ember design slightly, so owner visual review is required before export/use.
- Owner motion review: long slow blink with slight movement; slow push-in worked; requested wave did not happen.
- Export status: Exported by Lauren and saved locally as `content/outputs/videos/pending-review/day-1-meet-ember-capcut-mini-useful-not-perfect-no-wave-2026-05-06.mp4`.
- Decision: Clean but action-light CapCut free-path candidate. Mark as not perfect but still useful; do not treat as final-approved hero video unless Lauren later approves it for posting.
- Retry note: If regenerating for the wave, do not rely on `wave` alone. Use a more explicit low-motion action such as `one front paw visibly lifts a few inches and gently wiggles once, then returns to rest; keep the rest of the body stable`.

## Next Retry Prompt

```text
Use attached Ember image as first frame and strict source. Ember is the only character: tiny pumpkin-orange baby dragon, blue-teal scarf, brown satchel. Gentle 10-second vertical 9:16 storybook clip: camera makes a very slow push-in while Ember keeps his body stable. One front paw visibly lifts a few inches, gently wiggles once, then returns to rest. Add one quick soft blink only, not a long blink. Warm lantern glow and two slow sparkles. Preserve soft 2.25D illustration. No text, captions, logos, watermarks, extra characters, new props, scene changes, fast motion, or realistic redesign.
```

### 2026-05-06 - Visible paw-wave retry staged

- Result: Staged; not generated.
- Fresh draft: `20260505233814`.
- Visible setup: `Video clip`, `Dreamina Seedance 1.0 mini`, `720p`, `9:16`, `10s`.
- Source image: `content/outputs/images/pending-review/day-1-meet-ember-seedance-source-image-recovered-2026-05-05T22-47-49-446Z.png`.
- Prompt: `content/outputs/prompts/day-1-meet-ember-capcut-video-clip-visible-paw-wave-retry-prompt.md`.
- Screenshot: `content/outputs/videos/pending-review/capcut-visible-paw-wave-retry-final-settings-not-generated.png`.
- Decision: Ready for Lauren to click Generate if she wants to spend another 10 credits trying for the visible paw-lift wave.

### 2026-05-06 - Visible paw-wave retry generated

- Result: Generated; failed final-frame quality check.
- Fresh draft: `20260505233814`.
- Visible setup: `Video clip`, `Dreamina Seedance 1.0 mini`, `720p`, `9:16`, `10s`.
- Prompt: `content/outputs/prompts/day-1-meet-ember-capcut-video-clip-visible-paw-wave-retry-prompt.md`.
- Owner motion/visual review: Ember's eyes are weird at the end.
- Decision: Do not treat this as approved. Shorten the next retry to 5 seconds so the clip ends before late-frame eye drift has room to appear.
- Next prompt: `content/outputs/prompts/day-1-meet-ember-capcut-video-clip-short-5s-eye-lock-retry-prompt.md`.

## Short 5-Second Retry Prompt

```text
Use attached Ember image as first frame and strict source. Ember is the only character: tiny pumpkin-orange baby dragon, blue-teal scarf, brown satchel. Gentle 5-second vertical 9:16 storybook clip: camera makes one very slow push-in while Ember keeps his body stable. One front paw lifts slightly, gives one tiny friendly wiggle, then rests. Add one quick soft blink in the first half only; eyes return to the original open friendly shape and stay normal through the final second. Warm lantern glow and one slow sparkle. Preserve soft 2.25D illustration. No text, captions, logos, watermarks, extra characters, new props, scene changes, fast motion, long blink, eye warping, stretched pupils, or realistic redesign.
```

### 2026-05-06 - Hugging Face Wan2.2 short test

- Result: Partial pass; looks pretty good, but Ember appears to be talking because the mouth moves.
- Candidate Space: `https://huggingface.co/spaces/zerogpu-aoti/wan2-2-fp8da-aoti-faster`.
- Prompt used: `content/outputs/prompts/day-1-meet-ember-huggingface-wan2-2-short-eye-lock-prompt.md`.
- Failure mode: mouth/lip movement implies speech, which does not fit the no-caption/no-talking Day 1 intro lane.
- Decision: Keep Hugging Face Wan2.2 as promising, but retry with explicit closed-mouth/no-lip-sync/no-jaw-movement constraints.
- Next prompt: `content/outputs/prompts/day-1-meet-ember-huggingface-wan2-2-short-closed-mouth-retry-prompt.md`.

## Hugging Face Closed-Mouth Retry Prompt

```text
Use uploaded Ember image as the strict first frame and visual source. Ember is the only character: tiny pumpkin-orange baby dragon, blue-teal scarf, brown satchel, soft storybook 2.25D illustration. Short gentle vertical character-intro clip: one very slow push-in, Ember's body stays stable, mouth stays closed and relaxed the entire time, no talking or lip movement, one front paw lifts slightly and gives one tiny friendly wiggle, one quick soft blink early, eyes stay open friendly and normal at the end, warm lantern glow, one slow sparkle. No text, captions, logos, watermarks, extra characters, new props, scene changes, fast motion, speech, lip sync, jaw movement, open mouth, long blink, eye warping, stretched pupils, face distortion, or realistic redesign.
```

### 2026-05-06 - Hugging Face free credits exhausted

- Result: Paused until tomorrow because free credits ran out.
- Keep for tomorrow: the Hugging Face Wan2.2 lane is still promising; the last test looked pretty good but had talking-mouth movement.
- Tomorrow setup: upload the same Ember source image, duration `4.0s`, steps `6`, fixed seed first, guidance `1 / 1`.
- Main prompt: `content/outputs/prompts/day-1-meet-ember-huggingface-wan2-2-tomorrow-main-prompt.md`.
- Negative prompt prefix: `content/outputs/prompts/day-1-meet-ember-huggingface-wan2-2-tomorrow-negative-prompt-prefix.md`.
- Important: paste the negative prompt prefix at the start of the Hugging Face Negative Prompt box, before the existing Chinese default negative prompt. Do not duplicate those negative terms in the main prompt.
- QA target: closed relaxed mouth with no lip/jaw movement, normal eyes at final frame, scarf/satchel preserved, no text/logos.

### 2026-05-06 - PixVerse fallback staged

- Result: Owner moved to PixVerse after Hugging Face free credits ran out.
- Decision: Test PixVerse as another image-to-video fallback with the same short, closed-mouth, no-talking goal.
- Main prompt: `content/outputs/prompts/day-1-meet-ember-pixverse-short-closed-mouth-main-prompt.md`.
- Negative prompt: `content/outputs/prompts/day-1-meet-ember-pixverse-short-closed-mouth-negative-prompt.md`.
- Recommended setup: image-to-video with the same Ember source image; use the shortest available vertical clip, preferably `5s` or less; avoid 8s+ until a short result passes final-frame QA.
- If PixVerse exposes a negative prompt box, paste the saved negative prompt there. If it does not, keep the main prompt as-is and do not stuff all the negative terms into the positive box unless a first run fails.
- QA target: closed relaxed mouth with no lip/jaw movement, normal eyes at final frame, scarf/satchel preserved, no text/logos, no extra characters.

### 2026-05-06 - PixVerse first owner review

- Result: Best so far.
- Prompt used: `content/outputs/prompts/day-1-meet-ember-pixverse-short-closed-mouth-main-prompt.md`.
- Negative prompt used if the UI allowed it: `content/outputs/prompts/day-1-meet-ember-pixverse-short-closed-mouth-negative-prompt.md`.
- Owner review: PixVerse output is the best Day 1 Meet Ember short-video result so far.
- Approval status: not final-approved yet; export/save status not recorded yet.
- Decision: Treat PixVerse as the leading fallback path unless later QA finds a blocker.
- Next step: export/save the clip if useful, then record the exact filename and run owner visual QA for mouth movement, final-frame eyes, scarf/satchel, no text/logos, and overall Ember model consistency.

### 2026-05-06 - Day 1 Meet Ember `Full video`

- Result: Failed.
- Owner decision: next attempt should use CapCut `Video clip` mode.
- Cost observed: 20 credits consumed; account display changed from 380 to 360.
- Visible output: `Storyboard 1`, `9:16`, total timeline `00:00:48`, four separate `0:12` clips.
- Failure modes: not a single 15-second motion-only clip; visible text appeared over the video; one or more thumbnails did not preserve Ember as the only character; CapCut treated the brief like a generated storyboard/video assembly rather than strict source-image animation.
- Screenshot: `content/outputs/videos/pending-review/capcut-day1-generation-after-sad-check.png`
- Decision: Do not use `Full video` for clean no-caption Ember motion-only tests unless a later controlled test proves a safe setup. Retry in `Video clip` / single-scene image-to-video.
