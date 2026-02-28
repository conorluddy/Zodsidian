import { z } from "zod";

/**
 * Zodsidian configuration schema
 */
export const zodsidianConfigSchema = z
  .object({
    version: z.string().describe("Configuration schema version"),

    typeMappings: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        "Map user-defined types to canonical schema types (e.g., 'project-index' → 'project')",
      ),

    excludeGlobs: z
      .array(z.string())
      .optional()
      .describe(
        "Glob patterns for files to skip, relative to vault root (e.g., '_templates/**'). Note: `**` matches zero or more path segments, so a pattern like '_templates/**' also matches the bare directory path — but the walker only passes .md file paths here, not directory names.",
      ),

    validation: z
      .object({
        warnOnMappedTypes: z
          .boolean()
          .optional()
          .describe("Emit FM_MAPPED_TYPE warnings when a mapped type is encountered"),
      })
      .optional()
      .describe("Validation behavior configuration"),
  })
  .describe("Zodsidian configuration for type mappings and validation settings");

export type ZodsidianConfig = z.infer<typeof zodsidianConfigSchema>;

/**
 * Default configuration with no mappings
 */
export const defaultConfig: ZodsidianConfig = {
  version: "1.0",
  typeMappings: {},
  validation: {
    warnOnMappedTypes: false,
  },
};
