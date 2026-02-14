import type { ValidationIssue } from "./validation.types.js";

export interface FrontmatterSpan {
  startLine: number;
  endLine: number;
  rawText: string;
}

export interface FrontmatterResult<T = unknown> {
  data: T | null;
  span: FrontmatterSpan;
  body: string;
  issues: ValidationIssue[];
  isValid: boolean;
}
