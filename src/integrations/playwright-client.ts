export interface ToolTarget {
  name: string;
  url: string;
}

export const toolTargets: Record<string, ToolTarget> = {
  seedance: { name: "Seedance", url: "https://www.seedance.com/" },
  capcut: { name: "CapCut", url: "https://www.capcut.com/" },
  canva: { name: "Canva", url: "https://www.canva.com/" }
};

export function resolveToolTarget(tool: string): ToolTarget {
  const target = toolTargets[tool.toLowerCase()];
  if (!target) {
    throw new Error(`Unknown tool "${tool}". Expected one of: ${Object.keys(toolTargets).join(", ")}`);
  }
  return target;
}

export function isSensitiveBoundary(text: string): boolean {
  return /captcha|payment|subscribe|subscription|verify your account|identity verification|rate limit/i.test(text);
}
