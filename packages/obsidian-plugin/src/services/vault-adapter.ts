import type { App, TFile } from "obsidian";
import { shouldExcludeFile } from "@zodsidian/core";

export class VaultAdapter {
  constructor(private app: App) {}

  async readFile(file: TFile): Promise<string> {
    return this.app.vault.read(file);
  }

  async writeFile(file: TFile, content: string): Promise<void> {
    await this.app.vault.modify(file, content);
  }

  getMarkdownFiles(excludeGlobs?: string[]): TFile[] {
    const all = this.app.vault.getMarkdownFiles();
    if (!excludeGlobs || excludeGlobs.length === 0) return all;
    return all.filter((file) => !shouldExcludeFile(file.path, excludeGlobs));
  }
}
