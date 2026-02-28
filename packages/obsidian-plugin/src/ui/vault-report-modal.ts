import { App, Modal, setIcon } from "obsidian";
import { basename } from "path";
import type { FileIssueEntry } from "../services/report-service.js";

/**
 * Modal listing every file with validation errors or warnings.
 * Clicking a file row navigates to it and closes the modal.
 */
export class VaultReportModal extends Modal {
  constructor(
    app: App,
    private fileIssues: FileIssueEntry[],
    private onNavigate: (filePath: string) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("zs-report-modal");

    const totalErrors = this.fileIssues.reduce((sum, f) => sum + f.errorCount, 0);
    const totalWarnings = this.fileIssues.reduce((sum, f) => sum + f.warningCount, 0);

    contentEl.createEl("h2", { text: "Vault Report" });
    contentEl.createEl("p", {
      cls: "zs-report-modal-subtitle",
      text: `${totalErrors} errors · ${totalWarnings} warnings across ${this.fileIssues.length} files`,
    });

    const list = contentEl.createEl("ul", { cls: "zs-report-modal-list" });

    for (const entry of this.fileIssues) {
      const item = list.createEl("li", { cls: "zs-report-modal-item" });

      const rowBtn = item.createEl("button", { cls: "zs-report-modal-row" });
      const severityIcon = rowBtn.createSpan({ cls: "zs-report-modal-severity" });
      setIcon(severityIcon, entry.errorCount > 0 ? "x-circle" : "alert-triangle");

      const fileInfo = rowBtn.createDiv({ cls: "zs-report-modal-file-info" });
      fileInfo.createSpan({
        cls: "zs-report-modal-basename",
        text: basename(entry.filePath),
      });
      fileInfo.createSpan({
        cls: "zs-report-modal-path",
        text: entry.filePath,
      });

      rowBtn.addEventListener("click", () => {
        this.onNavigate(entry.filePath);
        this.close();
      });

      const issueList = item.createEl("ul", { cls: "zs-report-modal-issues" });
      for (const issue of entry.issues) {
        const issueItem = issueList.createEl("li", {
          cls: `zs-report-modal-issue zs-issue-${issue.severity}`,
        });
        const icon = issueItem.createSpan({ cls: "zs-report-modal-issue-icon" });
        setIcon(icon, issue.severity === "error" ? "x-circle" : "alert-triangle");
        issueItem.createSpan({
          cls: "zs-report-modal-issue-message",
          text: issue.message,
        });
        issueItem.createSpan({ cls: "zs-report-modal-issue-code", text: issue.code });
      }
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
