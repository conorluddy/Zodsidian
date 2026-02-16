import { Plugin, Notice } from "obsidian";
import type { ValidationIssue } from "@zodsidian/core";
import { DEFAULT_SETTINGS, type ZodsidianSettings } from "./settings/settings.js";
import { ZodsidianSettingTab } from "./settings/settings-tab.js";
import { VaultAdapter } from "./services/vault-adapter.js";
import { ConfigService } from "./services/config-service.js";
import { ValidationService } from "./services/validation-service.js";
import { ReportService } from "./services/report-service.js";
import { StatusBarManager } from "./ui/status-bar.js";
import { VALIDATION_VIEW_TYPE, ValidationView } from "./ui/validation-view.js";
import { REPORT_VIEW_TYPE, ReportView } from "./ui/report-view.js";
import {
  registerCommands,
  revealValidationPanel,
  revealReportView,
} from "./commands/plugin-commands.js";

export default class ZodsidianPlugin extends Plugin {
  settings!: ZodsidianSettings;
  vaultAdapter!: VaultAdapter;
  configService!: ConfigService;
  validationService!: ValidationService;
  reportService!: ReportService;
  private statusBar!: StatusBarManager;
  private reportRibbonEl?: HTMLElement;
  private unknownTypeCount = 0;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.vaultAdapter = new VaultAdapter(this.app);
    this.configService = new ConfigService(this.app);
    await this.configService.loadConfig(this.settings);
    this.configService.startWatching(this.settings);
    this.validationService = new ValidationService(this.vaultAdapter, this.configService);
    this.reportService = new ReportService(this.vaultAdapter, this.configService);
    this.statusBar = new StatusBarManager(this);

    this.registerView(VALIDATION_VIEW_TYPE, (leaf) => new ValidationView(leaf));
    this.registerView(REPORT_VIEW_TYPE, (leaf) => {
      return new ReportView(leaf, (unknownType) => {
        // TODO: Phase 5 - Open type mapping modal
        new Notice(`Type mapping UI coming in Phase 5. Type: ${unknownType}`);
      });
    });

    this.addSettingTab(new ZodsidianSettingTab(this.app, this));
    registerCommands(this);

    this.addRibbonIcon("shield-check", "Open Zodsidian validation panel", () => {
      revealValidationPanel(this);
    });

    this.reportRibbonEl = this.addRibbonIcon(
      "bar-chart",
      "Open Zodsidian vault report",
      () => {
        revealReportView(this);
      },
    );

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

    // If panel is already open (persisted by Obsidian), validate active file into it
    this.app.workspace.onLayoutReady(() => {
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile?.path.endsWith(".md") && this.getValidationView()) {
        this.validationService.validateFile(activeFile).then((result) => {
          this.updateView(activeFile.path, result.issues, result.isTyped);
        });
      }

      // Background scan for unknown types
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

  private getValidationView(): ValidationView | null {
    const leaf = this.app.workspace.getLeavesOfType(VALIDATION_VIEW_TYPE)[0];
    if (!leaf) return null;
    const view = leaf.view;
    return view instanceof ValidationView ? view : null;
  }

  private updateView(
    filePath: string | null,
    issues?: ValidationIssue[],
    isTyped?: boolean,
  ): void {
    const view = this.getValidationView();
    if (!view) return;
    if (!filePath) {
      view.clearFile();
    } else {
      view.setFileResult(filePath, issues ?? [], isTyped ?? false);
    }
  }

  private async performBackgroundScan(): Promise<void> {
    try {
      const report = await this.reportService.buildReport();
      this.unknownTypeCount = report.unknownTypes.length;
      this.updateRibbonBadge();

      // Show first-run notice if unknown types detected
      if (this.unknownTypeCount > 0 && !this.settings.hasSeenUnknownTypesNotice) {
        new Notice(
          `Zodsidian found ${this.unknownTypeCount} unknown type(s). Click the report icon to configure mappings.`,
          10000,
        );
        this.settings.hasSeenUnknownTypesNotice = true;
        await this.saveSettings();
      }
    } catch (err) {
      console.error("Zodsidian background scan failed:", err);
    }
  }

  private updateRibbonBadge(): void {
    if (!this.reportRibbonEl) return;

    // Remove existing badge
    const existing = this.reportRibbonEl.querySelector(".zodsidian-badge");
    if (existing) {
      existing.remove();
    }

    // Add badge if unknown types exist
    if (this.unknownTypeCount > 0) {
      const badge = this.reportRibbonEl.createSpan({
        cls: "zodsidian-badge",
        text: String(this.unknownTypeCount),
      });
      this.reportRibbonEl.appendChild(badge);
    }
  }
}
