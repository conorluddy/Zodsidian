import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type { VaultReport } from "../services/report-service.js";

export const REPORT_VIEW_TYPE = "zodsidian-report";

/**
 * Vault-wide report view showing health stats, type breakdown, and unknown types
 */
export class ReportView extends ItemView {
  private report: VaultReport | null = null;
  private onMapType?: (unknownType: string) => void;

  constructor(leaf: WorkspaceLeaf, onMapType?: (unknownType: string) => void) {
    super(leaf);
    this.onMapType = onMapType;
  }

  getViewType(): string {
    return REPORT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Zodsidian Report";
  }

  getIcon(): string {
    return "bar-chart";
  }

  setReport(report: VaultReport): void {
    this.report = report;
    this.render();
  }

  private render(): void {
    const container = this.contentEl;
    container.empty();

    if (!this.report) {
      container.createDiv({ cls: "zodsidian-empty", text: "Loading report..." });
      return;
    }

    const panel = container.createDiv({ cls: "zodsidian-report-panel" });

    this.renderVaultHealth(panel);
    this.renderTypeBreakdown(panel);
    this.renderUnknownTypes(panel);
    this.renderActiveMappings(panel);
  }

  private renderVaultHealth(parent: HTMLElement): void {
    const section = parent.createDiv({ cls: "zodsidian-report-section" });
    section.createEl("h3", { text: "Vault Health" });

    const stats = this.report!.stats;
    const validPercent =
      stats.totalFiles > 0 ? Math.round((stats.validFiles / stats.totalFiles) * 100) : 0;

    const list = section.createEl("ul", { cls: "zodsidian-stat-list" });

    const scanItem = list.createEl("li");
    const scanIcon = scanItem.createSpan({ cls: "zodsidian-stat-icon" });
    setIcon(scanIcon, "file-text");
    scanItem.createSpan({ text: ` ${stats.totalFiles} files scanned` });

    const validItem = list.createEl("li");
    const validIcon = validItem.createSpan({ cls: "zodsidian-stat-icon" });
    setIcon(validIcon, "check-circle");
    validItem.createSpan({
      text: ` ${stats.validFiles} valid (${validPercent}%)`,
      cls: stats.validFiles === stats.totalFiles ? "zodsidian-success" : "",
    });

    if (stats.warningCount > 0) {
      const warnItem = list.createEl("li");
      const warnIcon = warnItem.createSpan({ cls: "zodsidian-stat-icon" });
      setIcon(warnIcon, "alert-triangle");
      warnItem.createSpan({
        text: ` ${stats.warningCount} warnings`,
        cls: "zodsidian-warning",
      });
    }

    if (stats.errorCount > 0) {
      const errItem = list.createEl("li");
      const errIcon = errItem.createSpan({ cls: "zodsidian-stat-icon" });
      setIcon(errIcon, "x-circle");
      errItem.createSpan({ text: ` ${stats.errorCount} errors`, cls: "zodsidian-error" });
    }
  }

  private renderTypeBreakdown(parent: HTMLElement): void {
    const section = parent.createDiv({ cls: "zodsidian-report-section" });
    section.createEl("h3", { text: "Types" });

    const breakdown = this.report!.typeBreakdown;
    if (breakdown.length === 0) {
      section.createDiv({ cls: "zodsidian-empty", text: "No typed files found" });
      return;
    }

    const list = section.createEl("ul", { cls: "zodsidian-type-list" });
    for (const { type, count } of breakdown) {
      const item = list.createEl("li");
      item.createSpan({ text: `${type}: `, cls: "zodsidian-type-name" });
      item.createSpan({ text: `${count} files` });
    }
  }

  private renderUnknownTypes(parent: HTMLElement): void {
    const unknownTypes = this.report!.unknownTypes;
    if (unknownTypes.length === 0) {
      return;
    }

    const section = parent.createDiv({ cls: "zodsidian-report-section" });
    const header = section.createDiv({ cls: "zodsidian-section-header" });
    const titleSpan = header.createSpan();
    const icon = titleSpan.createSpan({ cls: "zodsidian-stat-icon" });
    setIcon(icon, "help-circle");
    titleSpan.createEl("h3", { text: " Unknown Types" });

    const list = section.createEl("ul", { cls: "zodsidian-unknown-list" });
    for (const { type, count } of unknownTypes) {
      const item = list.createEl("li");
      item.createSpan({ text: `${type}: `, cls: "zodsidian-type-name" });
      item.createSpan({ text: `${count} files ` });

      if (this.onMapType) {
        const mapBtn = item.createEl("button", {
          text: "Map...",
          cls: "zodsidian-map-btn",
        });
        mapBtn.addEventListener("click", () => {
          this.onMapType!(type);
        });
      }
    }
  }

  private renderActiveMappings(parent: HTMLElement): void {
    const mappings = this.report!.activeMappings;
    const entries = Object.entries(mappings);
    if (entries.length === 0) {
      return;
    }

    const section = parent.createDiv({ cls: "zodsidian-report-section" });
    section.createEl("h3", { text: "Active Mappings" });

    const list = section.createEl("ul", { cls: "zodsidian-mapping-list" });
    for (const [from, to] of entries) {
      const item = list.createEl("li");
      item.createSpan({ text: from, cls: "zodsidian-mapping-from" });
      item.createSpan({ text: " → " });
      item.createSpan({ text: to, cls: "zodsidian-mapping-to" });
    }
  }
}
