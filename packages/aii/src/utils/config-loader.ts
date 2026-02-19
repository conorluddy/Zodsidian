import { join } from "node:path";
import { existsSync } from "node:fs";
import { loadConfig, defaultConfig, type ZodsidianConfig } from "@zodsidian/core";

const CONFIG_FILENAME = ".zodsidian.json";

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
