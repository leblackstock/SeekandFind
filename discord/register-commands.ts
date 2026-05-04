import "dotenv/config";
import { emberCommands } from "./commands/ember.js";

const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!applicationId || !botToken || !guildId) {
  console.log("Discord registration skipped. Set DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN, and DISCORD_GUILD_ID in .env.");
  process.exit(0);
}

const url = `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`;
const response = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(emberCommands)
});

console.log(JSON.stringify({ ok: response.ok, status: response.status, body: await response.text() }, null, 2));
