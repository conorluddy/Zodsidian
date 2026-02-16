import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
  defaultConfig,
  zodsidianConfigSchema,
  type ZodsidianConfig,
} from "./config.types.js";

/**
 * Parse and validate config from JSON string
 * @throws {Error} If JSON is invalid or schema validation fails
 */
export function parseConfig(json: string): ZodsidianConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(
      `Failed to parse config JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const result = zodsidianConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Invalid config schema: ${issues}`);
  }

  // Merge with defaults to ensure all optional fields are present
  return {
    ...defaultConfig,
    ...result.data,
    validation: {
      ...defaultConfig.validation,
      ...result.data.validation,
    },
  };
}

/**
 * Load config from file path (synchronous)
 * @throws {Error} If file cannot be read or config is invalid
 */
export function loadConfigSync(filePath: string): ZodsidianConfig {
  const content = readFileSync(filePath, "utf-8");
  return parseConfig(content);
}

/**
 * Load config from file path (asynchronous)
 * @throws {Error} If file cannot be read or config is invalid
 */
export async function loadConfig(filePath: string): Promise<ZodsidianConfig> {
  const content = await readFile(filePath, "utf-8");
  return parseConfig(content);
}
