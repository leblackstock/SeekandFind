import { Command } from "commander";
import { generateMarketingBatch } from "./generators/marketing-batch.js";
import { generateMarketingPack } from "./generators/marketing-pack.js";
import { runKdpQaGenerator } from "./generators/kdp-qa.js";
import { generateSeekPage } from "./generators/seek-page.js";
import { generateStoryboard } from "./generators/seedance-storyboard.js";
import { generateTitlePage } from "./generators/title-page.js";

function printResult(result: unknown): void {
  console.log(JSON.stringify(result, null, 2));
}

const program = new Command();

program
  .name("ember-content-studio")
  .description("Local automation for Ember seek-and-find workflows")
  .option("--force", "overwrite generated files when they already exist", false);

program
  .command("seek [page] [location] [missionParts...]")
  .description("Generate a seek-page pack. Positional fallback: seek 6 \"Cloud Bakery\" \"tiny frosted bell\"")
  .option("--page <number>", "page number", (value) => Number.parseInt(value, 10))
  .option("--location <location>", "seek page location")
  .option("--place <location>", "seek page location; npm-safe alias for --location")
  .option("--mission <missionItem>", "mission item")
  .option("--book <bookTitle>", "book title")
  .option("--age <ageRange>", "age range")
  .option("--style <style>", "visual style")
  .option("--output-mode <mode>", "output mode, for example manual-test for non-canon experiments")
  .action(async (pageArg, locationArg, missionParts: string[], options) => {
    const globals = program.opts();
    const pageNumber = options.page ?? (pageArg ? Number.parseInt(pageArg, 10) : undefined);
    const location = options.location ?? options.place;
    const missionItem = options.mission ?? missionParts.join(" ");
    if (!pageNumber) throw new Error("Either --page or positional page is required.");
    if (!location && !locationArg) throw new Error("Either --location, --place, or positional location is required.");
    if (!missionItem) throw new Error("Either --mission or positional mission is required.");
    printResult(await generateSeekPage({
      bookTitle: options.book,
      pageNumber,
      location: location ?? locationArg,
      missionItem,
      ageRange: options.age,
      style: options.style,
      outputMode: options.outputMode
    }, { force: globals.force }));
  });

program
  .command("title")
  .option("--book <bookTitle>", "book title")
  .option("--theme <theme>", "title page theme")
  .option("--age <ageRange>", "age range")
  .option("--style <style>", "visual style")
  .action(async (options) => {
    const globals = program.opts();
    printResult(await generateTitlePage({
      bookTitle: options.book,
      theme: options.theme,
      ageRange: options.age,
      style: options.style
    }, { force: globals.force }));
  });

program
  .command("storyboard")
  .option("--seconds <clipLength>", "clip length", "15 seconds")
  .option("--scene <scene>", "storyboard scene")
  .option("--goal <goal>", "marketing goal")
  .option("--age <ageRange>", "age range")
  .action(async (options) => {
    const globals = program.opts();
    printResult(await generateStoryboard({
      clipLength: options.seconds,
      scene: options.scene,
      goal: options.goal,
      ageRange: options.age
    }, { force: globals.force }));
  });

program
  .command("marketing")
  .option("--platforms <platforms>", "comma-separated platforms")
  .option("--asset <asset>", "asset basis")
  .option("--goal <goal>", "marketing goal")
  .option("--age <ageRange>", "age range")
  .action(async (options) => {
    const globals = program.opts();
    printResult(await generateMarketingPack({
      platforms: options.platforms ? String(options.platforms).split(",").map((item) => item.trim()).filter(Boolean) : undefined,
      asset: options.asset,
      goal: options.goal,
      ageRange: options.age
    }, { force: globals.force }));
  });

program
  .command("marketing-batch")
  .option("--campaign <campaign>", "campaign name")
  .option("--asset <asset>", "asset basis")
  .option("--goal <goal>", "marketing goal")
  .option("--count <count>", "number of image prompts, capped at 4", (value) => Number.parseInt(value, 10))
  .option("--age <ageRange>", "age range")
  .action(async (options) => {
    const globals = program.opts();
    printResult(await generateMarketingBatch({
      campaign: options.campaign,
      asset: options.asset,
      goal: options.goal,
      imageCount: options.count,
      ageRange: options.age
    }, { force: globals.force }));
  });

program
  .command("qa")
  .option("--file <file>", "file to QA")
  .option("--text <text>", "inline text to QA")
  .action(async (options) => {
    const globals = program.opts();
    printResult(await runKdpQaGenerator({ file: options.file, text: options.text }, { force: globals.force }));
  });

program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
