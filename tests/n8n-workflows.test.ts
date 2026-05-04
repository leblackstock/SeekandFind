import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const workflows = [
  "ember-generate-seek-page.workflow.json",
  "ember-generate-title-page.workflow.json",
  "ember-generate-storyboard.workflow.json",
  "ember-generate-marketing-pack.workflow.json",
  "ember-kdp-qa.workflow.json",
  "ember-discord-command-router.workflow.json"
];

describe("n8n workflows", () => {
  it.each(workflows)("has importable workflow shape for %s", async (file) => {
    const workflow = JSON.parse(await readFile(`automation/n8n/workflows/${file}`, "utf8"));
    expect(workflow.id).toBeTruthy();
    const nodeTypes = workflow.nodes.map((node: { type: string }) => node.type);
    expect(nodeTypes).toContain("n8n-nodes-base.webhook");
    expect(nodeTypes).toContain("n8n-nodes-base.httpRequest");
    expect(nodeTypes).toContain("n8n-nodes-base.respondToWebhook");
    const workflowText = JSON.stringify(workflow);
    expect(workflowText).toContain("http://host.docker.internal:3333");
    expect(workflowText).not.toContain("localhost:3333");
    expect(workflowText).not.toContain("JSON.stringify($json");
    const httpNodes = workflow.nodes.filter((node: { type: string }) => node.type === "n8n-nodes-base.httpRequest");
    const webhookNodes = workflow.nodes.filter((node: { type: string }) => node.type === "n8n-nodes-base.webhook");
    for (const node of webhookNodes) {
      expect(node.webhookId).toBeTruthy();
    }
    for (const node of httpNodes) {
      expect(node.parameters.jsonBody).toBe("={{ $json.body ?? $json }}");
    }
  });
});
