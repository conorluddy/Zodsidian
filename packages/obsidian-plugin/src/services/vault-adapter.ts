import type { App, TFile } from "obsidian";

export class VaultAdapter {
  constructor(private app: App) {}

  async readFile(file: TFile): Promise<string> {
    return this.app.vault.read(file);
  }

  async writeFile(file: TFile, content: string): Promise<void> {
    await this.app.vault.modify(file, content);
  }

  getMarkdownFiles(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }
}
