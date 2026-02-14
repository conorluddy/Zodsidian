import { stringify } from "yaml";
import { parseFrontmatter } from "../parser/index.js";
import { normalizeTags, sortKeysStrategy, type FixStrategy } from "./strategies.js";

export interface FixOptions {
  unsafe?: boolean;
  extraStrategies?: FixStrategy[];
}

export interface FixResult {
  content: string;
  changed: boolean;
}

export function applyFixes(fileContent: string, options: FixOptions = {}): FixResult {
  const parsed = parseFrontmatter(fileContent);
  if (!parsed.data || typeof parsed.data !== "object") {
    return { content: fileContent, changed: false };
  }

  let data = parsed.data as Record<string, unknown>;
  const strategies: FixStrategy[] = [
    normalizeTags,
    sortKeysStrategy,
    ...(options.extraStrategies ?? []),
  ];

  for (const strategy of strategies) {
    data = strategy(data);
  }

  const newYaml = stringify(data, { lineWidth: 0 }).trim();
  const newContent = `---\n${newYaml}\n---${parsed.body}`;
  const changed = newContent !== fileContent;

  return { content: newContent, changed };
}
