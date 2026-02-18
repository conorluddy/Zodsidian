import type { TFile } from "obsidian";
import {
  extractSchemaDefaults,
  getSchemaEntry,
  parseFrontmatter,
  stringifyFrontmatter,
} from "@zodsidian/core";
import type { VaultAdapter } from "./vault-adapter.js";

/**
 * Converts a plain Obsidian note into a Zodsidian-typed document.
 *
 * Merge order (lowest → highest priority):
 *   schema defaults < existing frontmatter fields < stamped type
 *
 * The markdown body is never modified.
 */
export class IngestService {
  constructor(private vaultAdapter: VaultAdapter) {}

  async convertFile(file: TFile, targetType: string): Promise<void> {
    const entry = getSchemaEntry(targetType);
    if (!entry) throw new Error(`Unknown schema type: "${targetType}"`);

    const content = await this.vaultAdapter.readFile(file);
    const parsed = parseFrontmatter(content);

    const defaults = extractSchemaDefaults(entry);
    const existing =
      parsed.isValid && parsed.data ? (parsed.data as Record<string, unknown>) : {};

    const merged = { ...defaults, ...existing, type: targetType };

    // If the file had no frontmatter, preserve all content as the body
    const body = parsed.isValid ? parsed.body : `\n\n${content}`;

    const yaml = stringifyFrontmatter(merged);
    await this.vaultAdapter.writeFile(file, `---\n${yaml}\n---${body}`);
  }
}
