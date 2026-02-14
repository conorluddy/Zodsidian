import { App, PluginSettingTab, Setting } from "obsidian";
import type ZodsidianPlugin from "../main.js";

export class ZodsidianSettingTab extends PluginSettingTab {
  plugin: ZodsidianPlugin;

  constructor(app: App, plugin: ZodsidianPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Enable validation")
      .setDesc("Toggle frontmatter validation on/off")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
          this.plugin.settings.enabled = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Validate on save")
      .setDesc("Automatically validate frontmatter when saving a file")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.validateOnSave).onChange(async (value) => {
          this.plugin.settings.validateOnSave = value;
          await this.plugin.saveSettings();
        }),
      );
  }
}
