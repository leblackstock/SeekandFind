import "dotenv/config";
import express from "express";
import { verifyDiscordSignature } from "./security/verify-discord-signature.js";

const app = express();
app.use(express.raw({ type: "application/json" }));

app.post("/discord/interactions", async (request, response) => {
  const body = request.body.toString("utf8");
  const verified = await verifyDiscordSignature({
    publicKey: process.env.DISCORD_PUBLIC_KEY,
    signature: request.header("x-signature-ed25519"),
    timestamp: request.header("x-signature-timestamp"),
    body
  });

  if (!verified) {
    response.status(401).send("invalid request signature");
    return;
  }

  const payload = JSON.parse(body);
  if (payload.type === 1) {
    response.json({ type: 1 });
    return;
  }

  response.json({
    type: 4,
    data: {
      content: "Discord Phase 9 bridge is scaffolded but signature validation and n8n routing must be completed before live use.",
      flags: 64
    }
  });
});

const port = Number.parseInt(process.env.DISCORD_BRIDGE_PORT ?? "3334", 10);
app.listen(port, () => {
  console.log(`Discord Phase 9 bridge scaffold listening on http://localhost:${port}`);
});
