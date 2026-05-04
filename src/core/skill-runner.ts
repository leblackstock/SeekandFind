import { GenerateResult, KdpQaInput, MarketingPackInput, SeekPageInput, StoryboardInput, TitlePageInput, WorkflowName } from "../types.js";
import { RunOptions } from "../types.js";
import { generateMarketingPack } from "../generators/marketing-pack.js";
import { runKdpQaGenerator } from "../generators/kdp-qa.js";
import { generateSeekPage } from "../generators/seek-page.js";
import { generateStoryboard } from "../generators/seedance-storyboard.js";
import { generateTitlePage } from "../generators/title-page.js";

export async function runWorkflow(workflow: WorkflowName, input: unknown, options: RunOptions = {}): Promise<GenerateResult> {
  switch (workflow) {
    case "seek-page":
      return generateSeekPage(input as Partial<SeekPageInput>, options);
    case "title-page":
      return generateTitlePage(input as Partial<TitlePageInput>, options);
    case "storyboard":
      return generateStoryboard(input as Partial<StoryboardInput>, options);
    case "marketing-pack":
      return generateMarketingPack(input as Partial<MarketingPackInput>, options);
    case "kdp-qa":
      return runKdpQaGenerator(input as KdpQaInput, options);
    default:
      throw new Error(`Unknown workflow: ${workflow}`);
  }
}
