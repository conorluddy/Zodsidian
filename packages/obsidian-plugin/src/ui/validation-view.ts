import { ItemView, WorkspaceLeaf } from "obsidian";
import type { ValidationIssue } from "@zodsidian/core";

export const VALIDATION_VIEW_TYPE = "zodsidian-validation";

export class ValidationView extends ItemView {
  private issues: { filePath: string; issues: ValidationIssue[] }[] = [];

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
    return "check-circle";
  }

  setIssues(issues: { filePath: string; issues: ValidationIssue[] }[]): void {
    this.issues = issues;
    this.render();
  }

  private render(): void {
    const container = this.contentEl;
    container.empty();

    if (this.issues.length === 0) {
      container.createEl("p", { text: "No validation issues found." });
      return;
    }

    for (const { filePath, issues } of this.issues) {
      const fileEl = container.createEl("div", { cls: "zodsidian-file" });
      fileEl.createEl("h4", { text: filePath });

      for (const issue of issues) {
        const issueEl = fileEl.createEl("div", {
          cls: `zodsidian-issue zodsidian-${issue.severity}`,
        });
        const prefix = issue.severity === "error" ? "ERROR" : "WARN";
        const path = issue.path ? ` (${issue.path.join(".")})` : "";
        issueEl.createEl("span", { text: `[${prefix}]${path} ${issue.message}` });
      }
    }
  }

  async onOpen(): Promise<void> {
    this.render();
  }
}
