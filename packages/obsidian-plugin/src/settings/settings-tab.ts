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

    containerEl.createEl("h3", { text: "Type Mappings" });

    const mappings = Object.entries(
      this.plugin.configService.getConfig().typeMappings ?? {},
    );

    if (mappings.length === 0) {
      containerEl.createEl("p", {
        text: "No mappings configured. Use the Convert button on unknown types in the Vault panel to create one.",
        cls: "setting-item-description",
      });
    } else {
      for (const [from, to] of mappings) {
        new Setting(containerEl)
          .setName(`${from} → ${to}`)
          .setDesc(`Files with type "${from}" are treated as "${to}"`)
          .addExtraButton((btn) =>
            btn
              .setIcon("trash")
              .setTooltip("Remove mapping")
              .onClick(async () => {
                const config = this.plugin.configService.getConfig();
                const { [from]: _, ...remaining } = config.typeMappings ?? {};
                await this.plugin.configService.saveConfig({
                  ...config,
                  typeMappings: remaining,
                });
                await this.plugin.refreshReport();
                this.display();
              }),
          );
      }
    }
  }
}
