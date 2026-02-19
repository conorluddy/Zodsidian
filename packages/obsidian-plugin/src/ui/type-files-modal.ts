import { App, Modal, TFile } from "obsidian";

/**
 * Modal listing all files for a given type — clicking any file opens it in the editor.
 */
export class TypeFilesModal extends Modal {
  constructor(
    app: App,
    private typeName: string,
    private files: string[],
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: `${this.typeName} files` });

    if (this.files.length === 0) {
      contentEl.createDiv({ cls: "zodsidian-empty", text: "No files found." });
      return;
    }

    const list = contentEl.createEl("ul", { cls: "zs-files-modal-list" });
    for (const filePath of this.files) {
      const item = list.createEl("li", { cls: "zs-files-modal-item" });
      const btn = item.createEl("button", { text: filePath, cls: "zs-files-modal-link" });
      btn.addEventListener("click", async () => {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
          await this.app.workspace.getLeaf().openFile(file);
        }
        this.close();
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
