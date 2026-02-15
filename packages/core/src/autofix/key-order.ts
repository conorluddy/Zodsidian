export function sortKeys(
  data: Record<string, unknown>,
  keyOrder?: string[],
): Record<string, unknown> {
  const order = keyOrder ?? Object.keys(data).sort();
  const sorted: Record<string, unknown> = {};
  for (const key of order) {
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
