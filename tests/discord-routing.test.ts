import { describe, expect, it } from "vitest";
import { emberCommands } from "../discord/commands/ember.js";
import { verifyDiscordSignature } from "../discord/security/verify-discord-signature.js";

describe("discord phase 9 stubs", () => {
  it("declares expected commands", () => {
    expect(emberCommands.map((command) => command.name)).toEqual([
      "ember-seek",
      "ember-title",
      "ember-storyboard",
      "ember-marketing",
      "ember-qa",
      "ember-status"
    ]);
  });

  it("keeps bridge closed without real signature material", async () => {
    await expect(verifyDiscordSignature({ body: "{}" })).resolves.toBe(false);
  });
});
