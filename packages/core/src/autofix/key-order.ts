const CANONICAL_ORDER = [
  "type",
  "id",
  "title",
  "status",
  "outcome",
  "projectId",
  "decisionDate",
  "created",
  "updated",
  "tags",
];

export function sortKeys(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of CANONICAL_ORDER) {
    if (key in data) {
      sorted[key] = data[key];
    }
  }
  for (const key of Object.keys(data)) {
    if (!(key in sorted)) {
      sorted[key] = data[key];
    }
  }
  return sorted;
}
