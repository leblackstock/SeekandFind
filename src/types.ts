export type WorkflowName =
  | "seek-page"
  | "title-page"
  | "storyboard"
  | "marketing-pack"
  | "marketing-batch"
  | "marketing-calendar"
  | "kdp-qa"
  | "image-broke-mode"
  | "image-marketing-batch"
  | "chatgpt-project-chat-archive"
  | "start-end-frame-prep";

export interface GenerateResult {
  ok: boolean;
  workflow: WorkflowName;
  summary: string;
  files: string[];
  warnings: string[];
  nextStep: string;
}

export interface RunOptions {
  rootDir?: string;
  force?: boolean;
}

export interface SeekPageInput {
  bookTitle: string;
  pageNumber: number;
  location: string;
  missionItem: string;
  ageRange: string;
  style: string;
  outputMode: string;
}

export interface TitlePageInput {
  bookTitle: string;
  theme: string;
  ageRange: string;
  style: string;
}

export interface StoryboardInput {
  clipLength: string;
  goal: string;
  scene: string;
  ageRange: string;
}

export interface MarketingPackInput {
  platforms: string[];
  asset: string;
  goal: string;
  ageRange: string;
}

export interface KdpQaInput {
  file?: string;
  text?: string;
}

export interface QaResult {
  passed: boolean;
  failures: string[];
  warnings: string[];
}
