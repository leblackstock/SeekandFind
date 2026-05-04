import { readFile } from "node:fs/promises";

export type TemplateVariables = Record<string, string | number | boolean | undefined | null>;

export function collectPlaceholders(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)) {
    found.add(match[1]);
  }
  return [...found];
}

export function renderTemplate(template: string, variables: TemplateVariables): string {
  const missing = collectPlaceholders(template).filter((key) => variables[key] === undefined || variables[key] === null);
  if (missing.length > 0) {
    throw new Error(`Missing template variables: ${missing.join(", ")}`);
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => String(variables[key]));
}

export async function renderTemplateFile(path: string, variables: TemplateVariables): Promise<string> {
  const template = await readFile(path, "utf8");
  return renderTemplate(template, variables);
}
