import { Document, Scalar, visit } from "yaml";

/**
 * Stringify frontmatter data to YAML, quoting date-like strings.
 *
 * gray-matter uses js-yaml (YAML 1.1) which interprets unquoted YYYY-MM-DD
 * as Date objects. The yaml package uses YAML 1.2 which treats them as
 * plain strings. This mismatch means unquoted dates survive a write but
 * break on the next read. Force-quoting date-like strings prevents this.
 */
export function stringifyFrontmatter(data: Record<string, unknown>): string {
  const doc = new Document(data);
  visit(doc, {
    Scalar(_, node) {
      if (typeof node.value === "string" && /^\d{4}-\d{2}-\d{2}/.test(node.value)) {
        node.type = Scalar.QUOTE_DOUBLE;
      }
    },
  });
  return doc.toString({ lineWidth: 0 }).trim();
}
