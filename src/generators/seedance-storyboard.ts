import { DEFAULT_AGE_RANGE } from "../config.js";
import { canonAsPromptBlock, loadCanonBundle } from "../core/canon-loader.js";
import { writeTextFileSafe } from "../core/file-writer.js";
import { slugify } from "../core/naming.js";
import { runStoryboardQa } from "../core/qa-engine.js";
import { appendSessionLog, updateProductionStatus } from "../core/progress-tracker.js";
import { renderTemplate } from "../core/template-renderer.js";
import { GenerateResult, RunOptions, StoryboardInput } from "../types.js";

const storyboardTemplate = `# Seedance Storyboard Pack

Goal: {{goal}}
Scene: {{scene}}
Clip length: {{clipLength}}
Audience: children ages {{ageRange}}

{{canonBlock}}

## 15-Second Structure

Beat 1, 0:00-0:03: Establish a warm Ember world moment tied to {{goal}}.
Beat 2, 0:03-0:07: Ember moves gently through the scene: {{scene}}.
Beat 3, 0:07-0:11: A glowing clue or search moment gives the clip visual payoff.
Beat 4, 0:11-0:15: Ember smiles toward the viewer with a cozy invitation to search.

## Storyboard Type Warning

This file is a motion-only image-to-video storyboard unless it explicitly says otherwise.

Do not paste the timed beat text into CapCut storyboard/script blocks for a motion-only video. CapCut renders those block words across the bottom of the image, which turns the result into a captioned narration short. That is useful for narrator/descriptive marketing clips, but it is a different marketing type from a clean no-text character animation.

The captioned narration short lane may also become an AI-animation workflow later, but that path has not been worked through yet.

## Image-To-Video Prompt

Use Ember reference images Ember-001, Ember-002, and Ember-003 for character consistency. Keep Ember's scarf, satchel, horns, eyes, and reddish-orange baby-dragon proportions on-model.

Animate a soft 2.25D children's storybook scene. Use gentle camera motion: slow push-in, slight parallax, and tiny sparkle movement. Keep motion readable and calm for children ages {{ageRange}}.

## Camera Movement

- Slow push-in toward Ember.
- Gentle parallax between foreground decorations and background festival/world details.
- No frantic cuts, scary lighting, or dizzying motion.

## CapCut Edit Notes

- Add real editable text outside the video model if captions are needed.
- Use CapCut storyboard/script blocks only when intentionally making a captioned narration short with bottom text.
- Do not treat CapCut AI animation from captioned narration blocks as the default until that workflow has been tested and logged.
- Keep music soft, magical, and upbeat.
- Export a short vertical and square crop only after reviewing composition.

## Manual Upload Checklist

- Confirm reference image selected manually.
- Confirm no payment, CAPTCHA, subscription, or account-verification prompt is present.
- Paste prompt only after reviewing it.
- Save screenshots and output file path in the session log.
`;

export function normalizeStoryboardInput(input: Partial<StoryboardInput>): StoryboardInput {
  return {
    clipLength: input.clipLength ?? "15 seconds",
    goal: input.goal ?? "promote Ember seek-and-find book",
    scene: input.scene ?? "Ember waves, finds a glowing festival clue, and smiles at the viewer",
    ageRange: input.ageRange ?? DEFAULT_AGE_RANGE
  };
}

export async function generateStoryboard(input: Partial<StoryboardInput>, options: RunOptions = {}): Promise<GenerateResult> {
  const normalized = normalizeStoryboardInput(input);
  const canon = await loadCanonBundle(options.rootDir);
  const baseName = `seedance-${slugify(normalized.goal)}-storyboard`;
  const storyboard = renderTemplate(storyboardTemplate, {
    ...normalized,
    canonBlock: canonAsPromptBlock(canon)
  });
  const qa = runStoryboardQa(storyboard);
  const files = [
    await writeTextFileSafe(`content/outputs/storyboards/${baseName}.md`, storyboard, options)
  ];
  const result: GenerateResult = {
    ok: qa.passed,
    workflow: "storyboard",
    summary: "Generated Seedance storyboard pack.",
    files,
    warnings: qa.failures.concat(qa.warnings),
    nextStep: "Review the storyboard, then manually upload approved references to Seedance."
  };
  await updateProductionStatus(result, options.rootDir);
  const sessionFile = await appendSessionLog({
    workflow: "storyboard",
    inputs: normalized,
    assumptions: ["15 seconds is the default unless the user requests another length."],
    outputsCreated: files,
    warnings: result.warnings,
    qaResult: qa.passed ? "PASS" : "FAIL",
    nextManualStep: result.nextStep
  }, options.rootDir);
  result.files.push(sessionFile, "content/workflows/book-01/production-status.md");
  return result;
}
