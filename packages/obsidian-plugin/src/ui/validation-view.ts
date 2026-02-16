import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type { ValidationIssue } from "@zodsidian/core";

export const VALIDATION_VIEW_TYPE = "zodsidian-validation";

interface ViewState {
  filePath: string | null;
  issues: ValidationIssue[];
  isTyped: boolean;
}

export class ValidationView extends ItemView {
  private state: ViewState = { filePath: null, issues: [], isTyped: false };

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VALIDATION_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Zodsidian Validation";
  }

  getIcon(): string {
    return "shield-check";
  }

  setFileResult(filePath: string, issues: ValidationIssue[], isTyped: boolean): void {
    this.state = { filePath, issues, isTyped };
    this.render();
  }

  clearFile(): void {
    this.state = { filePath: null, issues: [], isTyped: false };
    this.render();
  }

  private render(): void {
    const container = this.contentEl;
    container.empty();

    const panel = container.createDiv({ cls: "zodsidian-panel" });

    if (!this.state.filePath) {
      panel.createDiv({ cls: "zodsidian-empty", text: "No file open." });
      return;
    }

    panel.createDiv({
      cls: "zodsidian-file-header",
      text: this.state.filePath,
    });

    if (!this.state.isTyped) {
      panel.createDiv({
        cls: "zodsidian-empty",
        text: "No schema registered for this file type.",
      });
      return;
    }

    if (this.state.issues.length === 0) {
      const empty = panel.createDiv({ cls: "zodsidian-empty" });
      const icon = empty.createSpan({ cls: "zodsidian-severity-icon" });
      setIcon(icon, "check-circle");
      empty.createSpan({ text: " No issues found" });
      return;
    }

    const errors = this.state.issues.filter((i) => i.severity === "error");
    const warnings = this.state.issues.filter((i) => i.severity === "warning");

    for (const issue of [...errors, ...warnings]) {
      this.renderIssue(panel, issue);
    }
  }

  private renderIssue(parent: HTMLElement, issue: ValidationIssue): void {
    const row = parent.createDiv({
      cls: `zodsidian-issue zodsidian-${issue.severity}`,
    });

    const icon = row.createSpan({ cls: "zodsidian-severity-icon" });
    setIcon(icon, issue.severity === "error" ? "x-circle" : "alert-triangle");

    const body = row.createDiv({ cls: "zodsidian-issue-body" });

    const header = body.createDiv({ cls: "zodsidian-issue-header" });
    header.createSpan({ cls: "zodsidian-issue-code", text: issue.code });
    if (issue.path?.length) {
      header.createSpan({
        cls: "zodsidian-issue-path",
        text: issue.path.join("."),
      });
    }

    body.createDiv({ cls: "zodsidian-issue-message", text: issue.message });

    if (issue.suggestion) {
      body.createDiv({
        cls: "zodsidian-issue-suggestion",
        text: issue.suggestion,
      });
    }
  }

  async onOpen(): Promise<void> {
    this.render();
  }
}
