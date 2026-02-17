import { parseFrontmatter } from "../parser/index.js";
import { getSchemaEntry } from "../schema/index.js";
import { resolveType } from "../config/index.js";
import type { ZodsidianConfig } from "../config/index.js";
import {
  normalizeTags,
  sortKeysBySchema,
  removeUnknownKeys,
  type FixStrategy,
} from "./strategies.js";
import { stringifyFrontmatter } from "./yaml-util.js";

export interface FixOptions {
  unsafe?: boolean;
  extraStrategies?: FixStrategy[];
  config?: ZodsidianConfig;
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
  const strategies: FixStrategy[] = [normalizeTags, sortKeysBySchema];

  if (options.unsafe) {
    const userType = typeof data.type === "string" ? data.type : undefined;
    const canonicalType = userType ? resolveType(userType, options.config) : undefined;
    const entry = canonicalType ? getSchemaEntry(canonicalType) : undefined;
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
