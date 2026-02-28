import { join } from "node:path";
import { existsSync } from "node:fs";
import { loadConfig, defaultConfig, type ZodsidianConfig } from "@zodsidian/core";

// Filenames checked in order during auto-discovery
const CONFIG_FILENAMES = [".zodsidian.json", "zodsidian.config.json"];

/**
 * Load Zodsidian config from explicit path or auto-discover from vault root.
 *
 * Resolution order:
 * 1. Explicit --config path (throws if file missing/invalid)
 * 2. Auto-discover .zodsidian.json or zodsidian.config.json in vault root
 * 3. Fall back to default config (no mappings)
 */
export async function loadConfigForVault(
  vaultDir: string,
  configPath?: string,
): Promise<ZodsidianConfig> {
  if (configPath) {
    return loadConfig(configPath);
  }

  for (const filename of CONFIG_FILENAMES) {
    const autoPath = join(vaultDir, filename);
    if (existsSync(autoPath)) {
      return loadConfig(autoPath);
    }
  }

  return defaultConfig;
}
