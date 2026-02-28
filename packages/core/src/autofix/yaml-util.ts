import { Document, Scalar, visit } from "yaml";

export interface StringifyOptions {
  /** Field names whose string values should be wrapped in [[wiki-links]]. */
  referenceFields?: string[];
}

/**
 * Wrap string values of reference fields in [[wiki-links]].
 * Idempotent — already-wrapped values are left untouched.
 */
function wrapReferenceFields(
  data: Record<string, unknown>,
  referenceFields: string[],
): Record<string, unknown> {
  const result = { ...data };
  for (const field of referenceFields) {
    const value = result[field];
    if (Array.isArray(value)) {
      result[field] = value.map((v) =>
        typeof v === "string" && !v.startsWith("[[") ? `[[${v}]]` : v,
      );
    } else if (typeof value === "string" && !value.startsWith("[[")) {
      result[field] = `[[${value}]]`;
    }
  }
  return result;
}

/**
 * Stringify frontmatter data to YAML, quoting date-like strings.
 *
 * gray-matter uses js-yaml (YAML 1.1) which interprets unquoted YYYY-MM-DD
 * as Date objects. The yaml package uses YAML 1.2 which treats them as
 * plain strings. This mismatch means unquoted dates survive a write but
 * break on the next read. Force-quoting date-like strings prevents this.
 *
 * When `referenceFields` is provided, wraps their string values in [[wiki-links]]
 * so Obsidian renders them as clickable links.
 */
export function stringifyFrontmatter(
  data: Record<string, unknown>,
  options?: StringifyOptions,
): string {
  const prepared = options?.referenceFields?.length
    ? wrapReferenceFields(data, options.referenceFields)
    : data;
  const doc = new Document(prepared);
  visit(doc, {
    Scalar(_, node) {
      if (typeof node.value === "string" && /^\d{4}-\d{2}-\d{2}/.test(node.value)) {
        node.type = Scalar.QUOTE_DOUBLE;
      }
    },
  });
  return doc.toString({ lineWidth: 0 }).trim();
}
