import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { repoRoot } from "../config.js";
import { writeTextFileSafe } from "../core/file-writer.js";
import { slugify } from "../core/naming.js";
import { runKdpQa } from "../core/qa-engine.js";
import { appendSessionLog, updateProductionStatus } from "../core/progress-tracker.js";
import { GenerateResult, KdpQaInput, RunOptions } from "../types.js";

export async function runKdpQaGenerator(input: KdpQaInput, options: RunOptions = {}): Promise<GenerateResult> {
  const root = repoRoot(options.rootDir);
  const sourceText = input.text ?? (input.file ? await readFile(join(root, input.file), "utf8") : "");
  if (!sourceText) throw new Error("Provide either file or text for KDP QA.");

  const qa = runKdpQa(sourceText);
  const sourceName = input.file ? slugify(input.file.replace(/\.[^.]+$/, "")) : `inline-${Date.now()}`;
  const report = [
    `# KDP QA Report`,
    "",
    `Source: ${input.file ?? "inline text"}`,
    `QA result: ${qa.passed ? "PASS" : "FAIL"}`,
    "",
    "## Failures",
    qa.failures.length ? qa.failures.map((item) => `- ${item}`).join("\n") : "- None",
    "",
    "## Warnings",
    qa.warnings.length ? qa.warnings.map((item) => `- ${item}`).join("\n") : "- None",
    "",
    "## Manual Checks",
    "- Confirm important art is inside trim and gutter safety.",
    "- Confirm final image has no accidental readable text.",
    "- Confirm mission item is not circled, boxed, highlighted, or answered.",
    "- Confirm exported page count and layout match the current KDP plan."
  ].join("\n");
  const files = [
    await writeTextFileSafe(`content/outputs/qa-reports/${sourceName}-kdp-qa.md`, report, options)
  ];
  const result: GenerateResult = {
    ok: qa.passed,
    workflow: "kdp-qa",
    summary: "Generated KDP QA report.",
    files,
    warnings: qa.failures.concat(qa.warnings),
    nextStep: "Fix any QA failures before using the asset in KDP layout."
  };
  await updateProductionStatus(result, options.rootDir);
  const sessionFile = await appendSessionLog({
    workflow: "kdp-qa",
    inputs: input.file ?? "inline text",
    assumptions: [],
    outputsCreated: files,
    warnings: result.warnings,
    qaResult: qa.passed ? "PASS" : "FAIL",
    nextManualStep: result.nextStep
  }, options.rootDir);
  result.files.push(sessionFile, "content/workflows/book-01/production-status.md");
  return result;
}
