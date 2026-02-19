import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type { ValidationIssue } from "@zodsidian/core";
import { getRegisteredTypes } from "@zodsidian/core";
import type { VaultReport } from "../services/report-service.js";

export const ZODSIDIAN_VIEW_TYPE = "zodsidian-main";

interface FileState {
  filePath: string | null;
  issues: ValidationIssue[];
  isTyped: boolean;
}

export class ZodsidianView extends ItemView {
  private fileState: FileState = { filePath: null, issues: [], isTyped: false };
  private report: VaultReport | null = null;
  private fileSectionEl!: HTMLElement;
  private vaultSectionEl!: HTMLElement;

  constructor(
    leaf: WorkspaceLeaf,
    private onConvert: (filePath: string, type: string) => void,
    private onFix: (filePath: string) => void,
    private onFixVault: () => Promise<void>,
    private onMapType: (unknownType: string) => void,
    private onOpened: () => void,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return ZODSIDIAN_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Zodsidian";
  }

  getIcon(): string {
    return "shield-check";
  }

  setFileResult(filePath: string, issues: ValidationIssue[], isTyped: boolean): void {
    this.fileState = { filePath, issues, isTyped };
    this.renderFileSection();
  }

  clearFile(): void {
    this.fileState = { filePath: null, issues: [], isTyped: false };
    this.renderFileSection();
  }

  setReport(report: VaultReport): void {
    this.report = report;
    this.renderVaultSection();
  }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass("zodsidian-view");

    this.fileSectionEl = container.createDiv({ cls: "zs-section" });
    this.vaultSectionEl = container.createDiv({ cls: "zs-section" });

    this.renderFileSection();
    this.renderVaultSection();

    // Request report from plugin — handles both fresh open and persisted panel on load
    this.onOpened();
  }

  private renderFileSection(): void {
    const el = this.fileSectionEl;
    if (!el) return;
    el.empty();

    const header = el.createDiv({ cls: "zs-section-header" });
    header.createSpan({ text: "CURRENT FILE" });

    const body = el.createDiv({ cls: "zs-section-body" });
    const panel = body.createDiv({ cls: "zodsidian-panel" });

    if (!this.fileState.filePath) {
      panel.createDiv({ cls: "zodsidian-empty", text: "No file open." });
      return;
    }

    panel.createDiv({ cls: "zodsidian-file-header", text: this.fileState.filePath });

    if (!this.fileState.isTyped) {
      panel.createDiv({
        cls: "zodsidian-untyped-label",
        text: "Not in the Zodsidian graph.",
      });

      const filePath = this.fileState.filePath;
      const types = getRegisteredTypes();
      const convertBar = panel.createDiv({ cls: "zodsidian-convert" });
      convertBar.createDiv({ cls: "zodsidian-convert-label", text: "Add to graph as:" });
      const btns = convertBar.createDiv({ cls: "zodsidian-convert-buttons" });
      for (const type of types) {
        const btn = btns.createEl("button", { text: type, cls: "zodsidian-convert-btn" });
        btn.addEventListener("click", () => this.onConvert(filePath, type));
      }
      return;
    }

    if (this.fileState.issues.length === 0) {
      const empty = panel.createDiv({ cls: "zodsidian-empty" });
      const icon = empty.createSpan({ cls: "zodsidian-severity-icon" });
      setIcon(icon, "check-circle");
      empty.createSpan({ text: " No issues found" });
      return;
    }

    const errors = this.fileState.issues.filter((i) => i.severity === "error");
    const warnings = this.fileState.issues.filter((i) => i.severity === "warning");

    const filePath = this.fileState.filePath;
    const actionBar = panel.createDiv({ cls: "zodsidian-action-bar" });
    const fixBtn = actionBar.createEl("button", {
      text: "Fix",
      cls: "zodsidian-fix-btn",
    });
    fixBtn.addEventListener("click", () => this.onFix(filePath));

    for (const issue of [...errors, ...warnings]) {
      this.renderIssue(panel, issue);
    }
  }

  private renderIssue(parent: HTMLElement, issue: ValidationIssue): void {
    const row = parent.createDiv({ cls: `zodsidian-issue zodsidian-${issue.severity}` });

    const icon = row.createSpan({ cls: "zodsidian-severity-icon" });
    setIcon(icon, issue.severity === "error" ? "x-circle" : "alert-triangle");

    const body = row.createDiv({ cls: "zodsidian-issue-body" });
    const header = body.createDiv({ cls: "zodsidian-issue-header" });
    header.createSpan({ cls: "zodsidian-issue-code", text: issue.code });
    if (issue.path?.length) {
      header.createSpan({ cls: "zodsidian-issue-path", text: issue.path.join(".") });
    }

    body.createDiv({ cls: "zodsidian-issue-message", text: issue.message });

    if (issue.suggestion) {
      body.createDiv({ cls: "zodsidian-issue-suggestion", text: issue.suggestion });
    }
  }

  private renderVaultSection(): void {
    const el = this.vaultSectionEl;
    if (!el) return;
    el.empty();

    const header = el.createDiv({ cls: "zs-section-header" });
    header.createSpan({ text: "VAULT" });

    const fixAllBtn = header.createEl("button", {
      text: "Fix All",
      cls: "zodsidian-fix-btn",
    });
    fixAllBtn.addEventListener("click", () => this.onFixVault());

    const body = el.createDiv({ cls: "zs-section-body" });

    if (!this.report) {
      const loader = body.createDiv({ cls: "zs-cube-loader" });
      const count = 8;
      for (let i = 0; i < count; i++) {
        const distFromCentre = Math.abs(i - (count - 1) / 2);
        const cube = loader.createSpan({ cls: "zs-cube" });
        cube.style.animationDelay = `${(distFromCentre * 0.12).toFixed(2)}s`;
        setIcon(cube, "box");
      }
      return;
    }

    const panel = body.createDiv({ cls: "zodsidian-report-panel" });
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
    if (unknownTypes.length === 0) return;

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
      const mapBtn = item.createEl("button", {
        text: "Map...",
        cls: "zodsidian-map-btn",
      });
      mapBtn.addEventListener("click", () => this.onMapType(type));
    }
  }

  private renderActiveMappings(parent: HTMLElement): void {
    const mappings = this.report!.activeMappings;
    const entries = Object.entries(mappings);
    if (entries.length === 0) return;

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
