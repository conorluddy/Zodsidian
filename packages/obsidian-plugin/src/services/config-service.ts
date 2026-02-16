import type { App, EventRef } from "obsidian";
import { parseConfig, defaultConfig, type ZodsidianConfig } from "@zodsidian/core";
import type { ZodsidianSettings } from "../settings/settings.js";

const CONFIG_FILENAME = "zodsidian.config.json";

/**
 * Loads and watches Zodsidian configuration from the vault root.
 *
 * Resolution order:
 * 1. `<vault-root>/zodsidian.config.json` (if present and valid)
 * 2. Plugin settings (data.json) as fallback
 */
export class ConfigService {
  private config: ZodsidianConfig = defaultConfig;
  private eventRef: EventRef | null = null;

  constructor(private app: App) {}

  /** Current resolved configuration */
  getConfig(): ZodsidianConfig {
    return this.config;
  }

  /** Load config from vault file, falling back to plugin settings */
  async loadConfig(settings: ZodsidianSettings): Promise<void> {
    const file = this.app.vault.getFileByPath(CONFIG_FILENAME);

    if (file) {
      try {
        const content = await this.app.vault.read(file);
        this.config = parseConfig(content);
        return;
      } catch {
        // Fall through to settings-based config
      }
    }

    this.config = this.configFromSettings(settings);
  }

  /** Save current config to the vault config file */
  async saveConfig(config: ZodsidianConfig): Promise<void> {
    this.config = config;
    const json = JSON.stringify(config, null, 2) + "\n";
    const file = this.app.vault.getFileByPath(CONFIG_FILENAME);

    if (file) {
      await this.app.vault.modify(file, json);
    } else {
      await this.app.vault.create(CONFIG_FILENAME, json);
    }
  }

  /** Watch the config file for changes and reload automatically */
  startWatching(settings: ZodsidianSettings): void {
    this.stopWatching();

    this.eventRef = this.app.vault.on("modify", (file) => {
      if (file.path === CONFIG_FILENAME) {
        this.loadConfig(settings);
      }
    });
  }

  /** Stop watching config file changes */
  stopWatching(): void {
    if (this.eventRef) {
      this.app.vault.offref(this.eventRef);
      this.eventRef = null;
    }
  }

  private configFromSettings(settings: ZodsidianSettings): ZodsidianConfig {
    return {
      ...defaultConfig,
      typeMappings: settings.typeMappings,
      validation: {
        ...defaultConfig.validation,
        warnOnMappedTypes: settings.warnOnMappedTypes,
      },
    };
  }
}
