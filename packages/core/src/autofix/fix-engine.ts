import { parseFrontmatter } from "../parser/index.js";
import { getSchemaEntry } from "../schema/index.js";
import {
  normalizeTags,
  sortKeysStrategy,
  removeUnknownKeys,
  type FixStrategy,
} from "./strategies.js";
import { stringifyFrontmatter } from "./yaml-util.js";

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
  const strategies: FixStrategy[] = [normalizeTags, sortKeysStrategy];

  if (options.unsafe) {
    const typeName = typeof data.type === "string" ? data.type : undefined;
    const entry = typeName ? getSchemaEntry(typeName) : undefined;
    if (entry) {
      strategies.push(removeUnknownKeys(new Set(Object.keys(entry.schema.shape))));
    }
  }

  strategies.push(...(options.extraStrategies ?? []));

  for (const strategy of strategies) {
    data = strategy(data);
  }

  const newYaml = stringifyFrontmatter(data);
  const newContent = `---\n${newYaml}\n---${parsed.body}`;
  const changed = newContent !== fileContent;

  return { content: newContent, changed };
}
