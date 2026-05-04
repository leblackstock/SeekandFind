import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { repoRoot } from "../config.js";

const expectedWorkflows = [
  "ember-generate-seek-page.workflow.json",
  "ember-generate-title-page.workflow.json",
  "ember-generate-storyboard.workflow.json",
  "ember-generate-marketing-pack.workflow.json",
  "ember-kdp-qa.workflow.json",
  "ember-discord-command-router.workflow.json"
];

export async function checkN8nSetup(rootDir?: string): Promise<{ ok: boolean; checks: string[]; warnings: string[] }> {
  const root = repoRoot(rootDir);
  const checks: string[] = [];
  const warnings: string[] = [];

  for (const workflow of expectedWorkflows) {
    const relative = `automation/n8n/workflows/${workflow}`;
    const absolute = join(root, relative);
    if (existsSync(absolute)) {
      checks.push(`found ${relative}`);
      const content = await readFile(absolute, "utf8");
      if (content.includes("localhost:3333")) {
        warnings.push(`${relative} uses localhost:3333; Docker n8n must use host.docker.internal:3333`);
      }
      if (content.includes("JSON.stringify($json")) {
        warnings.push(`${relative} stringifies HTTP Request JSON body; pass an object expression instead`);
      }
      const parsed = JSON.parse(content) as { nodes?: Array<{ type?: string; parameters?: Record<string, unknown> }> };
      const httpNodes = parsed.nodes?.filter((node) => node.type === "n8n-nodes-base.httpRequest") ?? [];
      if (httpNodes.length === 0) {
        warnings.push(`${relative} has no HTTP Request node`);
      }
      for (const node of httpNodes) {
        const url = String(node.parameters?.url ?? "");
        const jsonBody = String(node.parameters?.jsonBody ?? "");
        if (!url.includes("http://host.docker.internal:3333")) {
          warnings.push(`${relative} HTTP Request URL is not using host.docker.internal:3333`);
        } else {
          checks.push(`${relative} uses Docker host API URL`);
        }
        if (node.parameters?.specifyBody === "json" && jsonBody.includes("JSON.stringify")) {
          warnings.push(`${relative} HTTP Request jsonBody still uses JSON.stringify`);
        }
        if (node.parameters?.specifyBody === "json" && !jsonBody.includes("$json")) {
          warnings.push(`${relative} HTTP Request jsonBody does not pass n8n item JSON`);
        } else if (node.parameters?.specifyBody === "json") {
          checks.push(`${relative} passes JSON body as object expression`);
        }
      }
    } else {
      warnings.push(`missing ${relative}`);
    }
  }

  const baseUrl = process.env.LOCAL_API_BASE_URL ?? "http://localhost:3333";
  try {
    const response = await fetch(`${baseUrl}/health`);
    if (response.ok) checks.push(`local API healthy at ${baseUrl}`);
    else warnings.push(`local API returned ${response.status} at ${baseUrl}`);
  } catch {
    warnings.push(`local API not reachable at ${baseUrl}; start it with npm run server`);
  }

  return { ok: warnings.length === 0, checks, warnings };
}

if (process.argv[1]?.endsWith("n8n-client.ts")) {
  checkN8nSetup().then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  });
}
