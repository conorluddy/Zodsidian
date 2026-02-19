import { Plugin, Notice, TFile } from "obsidian";
import type { ValidationIssue } from "@zodsidian/core";
import { applyFixes, getRegisteredTypes } from "@zodsidian/core";
import { DEFAULT_SETTINGS, type ZodsidianSettings } from "./settings/settings.js";
import { ZodsidianSettingTab } from "./settings/settings-tab.js";
import { VaultAdapter } from "./services/vault-adapter.js";
import { ConfigService } from "./services/config-service.js";
import { ValidationService } from "./services/validation-service.js";
import { ReportService } from "./services/report-service.js";
import { IngestService } from "./services/ingest-service.js";
import { StatusBarManager } from "./ui/status-bar.js";
import { ZODSIDIAN_VIEW_TYPE, ZodsidianView } from "./ui/zodsidian-view.js";
import { TypeMappingModal } from "./ui/type-mapping-modal.js";
import { registerCommands, revealPanel } from "./commands/plugin-commands.js";

export default class ZodsidianPlugin extends Plugin {
  settings!: ZodsidianSettings;
  vaultAdapter!: VaultAdapter;
  configService!: ConfigService;
  validationService!: ValidationService;
  reportService!: ReportService;
  ingestService!: IngestService;
  private statusBar!: StatusBarManager;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.vaultAdapter = new VaultAdapter(this.app);
    this.configService = new ConfigService(this.app);
    await this.configService.loadConfig(this.settings);
    this.configService.startWatching(this.settings);
    this.validationService = new ValidationService(this.vaultAdapter, this.configService);
    this.reportService = new ReportService(this.vaultAdapter, this.configService);
    this.ingestService = new IngestService(this.vaultAdapter);
    this.statusBar = new StatusBarManager(this);

    this.registerView(
      ZODSIDIAN_VIEW_TYPE,
      (leaf) =>
        new ZodsidianView(
          leaf,
          (filePath, type) => this.convertFile(filePath, type),
          (filePath) => this.fixFile(filePath),
          () => this.fixVault(),
          (unknownType) => {
            new TypeMappingModal(this.app, unknownType, this.configService, () => {
              this.refreshReport();
            }).open();
          },
          () => {
            this.refreshReport();
          },
        ),
    );

    this.addSettingTab(new ZodsidianSettingTab(this.app, this));
    registerCommands(this);

    this.addRibbonIcon("shield-check", "Open Zodsidian panel", () => {
      revealPanel(this);
    });

    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (!this.settings.enabled || !file || !file.path.endsWith(".md")) {
          this.statusBar.clear();
          this.updateView(null);
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
          this.updateView(file.path, result.issues, result.isTyped);
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
          this.updateView(file.path, result.issues, result.isTyped);
        });
      }),
    );

    // File explorer context menu — "Add to Zodsidian as..."
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, abstractFile) => {
        if (!(abstractFile instanceof TFile) || !abstractFile.path.endsWith(".md")) {
          return;
        }
        const types = getRegisteredTypes();
        if (types.length === 0) return;

        menu.addSeparator();
        for (const type of types) {
          menu.addItem((item) =>
            item
              .setTitle(`Add to Zodsidian as ${type}`)
              .setIcon("file-plus")
              .onClick(() => this.convertFile(abstractFile.path, type)),
          );
        }
      }),
    );

    // If panel is already open (persisted by Obsidian), validate active file into it
    this.app.workspace.onLayoutReady(() => {
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile?.path.endsWith(".md") && this.getPanel()) {
        this.validationService.validateFile(activeFile).then((result) => {
          this.updateView(activeFile.path, result.issues, result.isTyped);
        });
      }

      // Background scan for report data
      this.performBackgroundScan();
    });
  }

  onunload(): void {
    this.configService.stopWatching();
    this.statusBar.clear();
    this.validationService.clearCache();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async convertFile(filePath: string, type: string): Promise<void> {
    const file = this.app.vault.getFileByPath(filePath);
    if (!file) return;
    try {
      await this.ingestService.convertFile(file, type);
      new Notice(`Added to graph as ${type}`);
      // Re-validate so the panel updates immediately (validateFile always re-reads)
      const result = await this.validationService.validateFile(file);
      const errors = result.issues.filter((i) => i.severity === "error").length;
      const warnings = result.issues.filter((i) => i.severity === "warning").length;
      this.statusBar.update(errors, warnings);
      this.updateView(filePath, result.issues, result.isTyped);
    } catch (err) {
      new Notice(
        `Conversion failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async fixFile(filePath: string): Promise<void> {
    const file = this.app.vault.getFileByPath(filePath);
    if (!file) return;
    try {
      const content = await this.vaultAdapter.readFile(file);
      const result = applyFixes(content, { config: this.configService.getConfig() });

      if (!result.changed) {
        new Notice("Nothing to fix.");
        return;
      }

      await this.vaultAdapter.writeFile(file, result.content);
      new Notice("Fixed.");

      // Re-validate immediately so the panel and status bar update
      const validation = await this.validationService.validateFile(file);
      const errors = validation.issues.filter((i) => i.severity === "error").length;
      const warnings = validation.issues.filter((i) => i.severity === "warning").length;
      validation.isTyped
        ? this.statusBar.update(errors, warnings)
        : this.statusBar.clear();
      this.updateView(filePath, validation.issues, validation.isTyped);
    } catch (err) {
      new Notice(`Fix failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async fixVault(): Promise<void> {
    const files = this.vaultAdapter.getMarkdownFiles();
    const config = this.configService.getConfig();
    let fixedCount = 0;

    for (const file of files) {
      const content = await this.vaultAdapter.readFile(file);
      const result = applyFixes(content, { config });
      if (result.changed) {
        await this.vaultAdapter.writeFile(file, result.content);
        fixedCount++;
      }
    }

    new Notice(fixedCount > 0 ? `Fixed ${fixedCount} file(s).` : "Nothing to fix.");

    // Re-validate active file so local section + status bar update
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile?.path.endsWith(".md")) {
      const validation = await this.validationService.validateFile(activeFile);
      const errors = validation.issues.filter((i) => i.severity === "error").length;
      const warnings = validation.issues.filter((i) => i.severity === "warning").length;
      validation.isTyped
        ? this.statusBar.update(errors, warnings)
        : this.statusBar.clear();
      this.updateView(activeFile.path, validation.issues, validation.isTyped);
    }
  }

  getPanel(): ZodsidianView | null {
    const leaf = this.app.workspace.getLeavesOfType(ZODSIDIAN_VIEW_TYPE)[0];
    if (!leaf) return null;
    const view = leaf.view;
    return view instanceof ZodsidianView ? view : null;
  }

  updateView(
    filePath: string | null,
    issues?: ValidationIssue[],
    isTyped?: boolean,
  ): void {
    const panel = this.getPanel();
    if (!panel) return;
    if (!filePath) {
      panel.clearFile();
    } else {
      panel.setFileResult(filePath, issues ?? [], isTyped ?? false);
    }
  }

  private async performBackgroundScan(): Promise<void> {
    try {
      const report = await this.reportService.buildReport();

      // Show first-run notice if unknown types detected
      if (report.unknownTypes.length > 0 && !this.settings.hasSeenUnknownTypesNotice) {
        new Notice(
          `Zodsidian found ${report.unknownTypes.length} unknown type(s). Open the panel to configure mappings.`,
          10000,
        );
        this.settings.hasSeenUnknownTypesNotice = true;
        await this.saveSettings();
      }

      // Populate vault section if panel is already open
      const panel = this.getPanel();
      if (panel) panel.setReport(report);
    } catch (err) {
      console.error("Zodsidian background scan failed:", err);
    }
  }

  async refreshReport(): Promise<void> {
    try {
      const report = await this.reportService.buildReport();
      const panel = this.getPanel();
      if (panel) panel.setReport(report);
    } catch (err) {
      console.error("Zodsidian report refresh failed:", err);
    }
  }
}
