import matter from "gray-matter";
import type { FrontmatterResult } from "../types/index.js";
import { IssueCode } from "../types/index.js";

export function parseFrontmatter(content: string): FrontmatterResult {
  const fmRegex = /^---\r?\n/;
  if (!fmRegex.test(content)) {
    return {
      data: null,
      span: { startLine: 0, endLine: 0, rawText: "" },
      body: content,
      issues: [
        {
          severity: "error",
          code: IssueCode.FM_MISSING,
          message: "No frontmatter found",
        },
      ],
      isValid: false,
    };
  }

  try {
    const result = matter(content);
    const fmLines = content.split("\n");
    const closingIdx = fmLines.indexOf("---", 1);
    const endLine = closingIdx >= 0 ? closingIdx : 0;
    const spanText = fmLines.slice(0, endLine + 1).join("\n");

    // Extract body directly from raw content to preserve exact formatting
    const body = content.slice(spanText.length);

    return {
      data: result.data as Record<string, unknown>,
      span: {
        startLine: 0,
        endLine,
        rawText: spanText,
      },
      body,
      issues: [],
      isValid: true,
    };
  } catch (err) {
    return {
      data: null,
      span: { startLine: 0, endLine: 0, rawText: "" },
      body: content,
      issues: [
        {
          severity: "error",
          code: IssueCode.FM_PARSE_ERROR,
          message: `Failed to parse frontmatter: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      isValid: false,
    };
  }
}
