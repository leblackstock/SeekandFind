import { QaResult } from "../types.js";

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function result(failures: string[], warnings: string[] = []): QaResult {
  return { passed: failures.length === 0, failures, warnings };
}

export function runImagePromptQa(prompt: string, missionItem?: string): QaResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (!has(prompt, /Ember appears exactly once/i)) failures.push("Missing rule: Ember appears exactly once.");
  if (!has(prompt, /Ember is visible|visible as the guide/i)) failures.push("Missing rule: Ember is visible, not hidden.");
  if (!has(prompt, /use (the )?(project\/source )?reference images|Ember-001/i)) failures.push("Missing reference-image guidance.");
  if (!has(prompt, /no readable (generated )?text|No readable text/i)) failures.push("Missing no-readable-text instruction.");
  if (!has(prompt, /ages? 5-8|age range: 5-8|5-8/i)) failures.push("Missing children ages 5-8 guidance.");
  if (!has(prompt, /8\.5x11|8\.5 x 11|vertical KDP/i)) failures.push("Missing vertical KDP page format.");
  if (has(prompt, /Ember (is|should be) hidden/i)) failures.push("Prompt says Ember is hidden.");
  const forbidsAnswerMarks = has(prompt, /No labels|No .*arrows|Do not.*circle|Avoid:.*answer/i);
  if (!forbidsAnswerMarks && has(prompt, /circle|outline|arrow|box|highlight/i) && has(prompt, /mission item|hidden object/i)) {
    failures.push("Prompt risks marking hidden objects with answer overlays.");
  }
  if (missionItem && !prompt.toLowerCase().includes(missionItem.toLowerCase())) {
    failures.push(`Missing mission item: ${missionItem}.`);
  }
  const positivePromptText = prompt
    .replace(/## Negative Prompt \/ Avoid[\s\S]*/i, "")
    .replace(/\bNo [^.]+[.]/gi, "")
    .replace(/\bDo not [^.]+[.]/gi, "")
    .replace(/^\s*-\s*no\b.+$/gim, "");
  if (has(positivePromptText, /\b(weapon|blood|horror|scary|creepy)\b/i)) warnings.push("Check child-safe tone; risky word detected.");

  return result(failures, warnings);
}

export function runStoryboardQa(text: string): QaResult {
  const failures: string[] = [];
  if (!has(text, /15[- ]?second|15 seconds/i)) failures.push("Missing default 15-second structure.");
  if (!has(text, /Beat 1|0:00|0-3/i)) failures.push("Missing scene-by-scene timing.");
  if (!has(text, /reference/i)) failures.push("Missing image/video reference guidance.");
  if (!has(text, /camera/i)) failures.push("Missing camera movement notes.");
  if (!has(text, /CapCut/i)) failures.push("Missing CapCut edit notes.");
  return result(failures);
}

export function runMarketingQa(text: string, productionStatus = ""): QaResult {
  const failures: string[] = [];
  if (!has(text, /Pinterest/i)) failures.push("Missing Pinterest-specific copy.");
  if (!has(text, /Facebook/i)) failures.push("Missing Facebook-specific copy.");
  if (!has(text, /Instagram/i)) failures.push("Missing Instagram-specific copy.");
  if (!has(text, /CTA|call to action/i)) failures.push("Missing CTA.");
  if (!has(text, /children ages 5-8|ages 5-8/i)) failures.push("Missing target audience.");
  const statusConfirmsPublished = /published|available now/i.test(productionStatus);
  const claimText = text
    .replace(/\bDo not [^.]+[.]/gi, "")
    .replace(/\bwithout claiming [^.]+(?:published|available now|buy now)[^.]*[.]?/gi, "")
    .replace(/\bnot claiming [^.]+(?:published|available now|buy now)[^.]*[.]?/gi, "")
    .replace(/## Publication Claim Guardrail[\s\S]*/i, "");
  if (!statusConfirmsPublished && /available now|buy now|published/i.test(claimText)) {
    failures.push("Marketing copy claims publication/availability before production status confirms it.");
  }
  return result(failures);
}

export function runKdpQa(text: string): QaResult {
  const failures: string[] = [];
  if (!has(text, /8\.5x11|8\.5 x 11|KDP/i)) failures.push("Missing KDP page-size/aspect intent.");
  if (!has(text, /safe area|bleed|trim|gutter/i)) failures.push("Missing bleed/safe-area reminder.");
  if (!has(text, /no readable (generated )?text|No readable text/i)) failures.push("Missing no-readable-text check.");
  if (!has(text, /Ember/i)) failures.push("Missing Ember consistency check.");
  if (!has(text, /density|readable|not overstuffed/i)) failures.push("Missing scene-density/readability check.");
  return result(failures);
}
