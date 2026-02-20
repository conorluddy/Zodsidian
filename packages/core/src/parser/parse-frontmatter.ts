import matter from "gray-matter";
import type { FrontmatterResult } from "../types/index.js";
import { IssueCode } from "../types/index.js";

/**
 * gray-matter uses YAML 1.1, which parses unquoted YYYY-MM-DD values as Date objects.
 * This walks parsed frontmatter data and converts any Date instances to YYYY-MM-DD strings
 * so they pass Zod's z.string().date() validation downstream.
 */
function normalizeDates(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (Array.isArray(value)) {
    return value.map(normalizeDates);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        normalizeDates(v),
      ]),
    );
  }
  return value;
}

/**
 * Obsidian stores reference fields as [[wiki-links]] in YAML.
 * Strip the wrapper so the internal system always works with plain IDs.
 */
function normalizeWikiLinks(value: unknown): unknown {
  if (typeof value === "string") {
    const match = value.match(/^\[\[(.+)\]\]$/);
    return match ? match[1] : value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeWikiLinks);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        normalizeWikiLinks(v),
      ]),
    );
  }
  return value;
}

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
      // gray-matter (YAML 1.1) parses unquoted YYYY-MM-DD as Date objects.
      // Normalize them to ISO date strings so Zod's z.string().date() accepts them.
      data: normalizeWikiLinks(normalizeDates(result.data)) as Record<string, unknown>,
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
