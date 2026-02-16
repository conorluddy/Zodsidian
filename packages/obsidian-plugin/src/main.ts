import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type ZodsidianSettings } from "./settings/settings.js";
import { ZodsidianSettingTab } from "./settings/settings-tab.js";
import { VaultAdapter } from "./services/vault-adapter.js";
import { ValidationService } from "./services/validation-service.js";
import { StatusBarManager } from "./ui/status-bar.js";
import { VALIDATION_VIEW_TYPE, ValidationView } from "./ui/validation-view.js";
import { registerCommands } from "./commands/plugin-commands.js";

export default class ZodsidianPlugin extends Plugin {
  settings!: ZodsidianSettings;
  vaultAdapter!: VaultAdapter;
  validationService!: ValidationService;
  private statusBar!: StatusBarManager;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.vaultAdapter = new VaultAdapter(this.app);
    this.validationService = new ValidationService(this.vaultAdapter);
    this.statusBar = new StatusBarManager(this);

    this.registerView(VALIDATION_VIEW_TYPE, (leaf) => new ValidationView(leaf));

    this.addSettingTab(new ZodsidianSettingTab(this.app, this));
    registerCommands(this);

    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (!this.settings.enabled || !file || !file.path.endsWith(".md")) {
          this.statusBar.clear();
          return;
        }
        this.validationService.validateFile(file).then((result) => {
          if (!result.isTyped) {
            this.statusBar.clear();
          } else {
            const errors = result.issues.filter((i) => i.severity === "error").length;
            const warnings = result.issues.filter((i) => i.severity === "warning").length;
            this.statusBar.update(errors, warnings);
          }
        });
      }),
    );

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (
          !this.settings.enabled ||
          !this.settings.validateOnSave ||
          !file.path.endsWith(".md")
        ) {
          return;
        }
        const tFile = this.app.vault.getFileByPath(file.path);
        if (!tFile) return;
        this.validationService.validateFileDebounced(tFile, 500, (result) => {
          const activeFile = this.app.workspace.getActiveFile();
          if (activeFile?.path !== file.path) return;
          if (!result.isTyped) {
            this.statusBar.clear();
          } else {
            const errors = result.issues.filter((i) => i.severity === "error").length;
            const warnings = result.issues.filter((i) => i.severity === "warning").length;
            this.statusBar.update(errors, warnings);
          }
        });
      }),
    );
  }

  onunload(): void {
    this.statusBar.clear();
    this.validationService.clearCache();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
