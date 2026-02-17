import { join } from "node:path";
import { existsSync } from "node:fs";
import { loadConfig, defaultConfig, type ZodsidianConfig } from "@zodsidian/core";

const CONFIG_FILENAME = ".zodsidian.json";

/**
 * Load Zodsidian config from explicit path or auto-discover from vault root.
 *
 * Resolution order:
 * 1. Explicit --config path (throws if file missing/invalid)
 * 2. Auto-discover .zodsidian.json in vault root dir
 * 3. Fall back to default config (no mappings)
 */
export async function loadConfigForVault(
  vaultDir: string,
  configPath?: string,
): Promise<ZodsidianConfig> {
  if (configPath) {
    return loadConfig(configPath);
  }

  const autoPath = join(vaultDir, CONFIG_FILENAME);
  if (existsSync(autoPath)) {
    return loadConfig(autoPath);
  }

  return defaultConfig;
}
