import type { Plugin } from "obsidian";

export class StatusBarManager {
  private statusBarEl: HTMLElement;

  constructor(plugin: Plugin) {
    this.statusBarEl = plugin.addStatusBarItem();
  }

  update(errorCount: number, warningCount: number): void {
    if (errorCount === 0 && warningCount === 0) {
      this.statusBarEl.setText("Zodsidian: OK");
    } else {
      const parts: string[] = [];
      if (errorCount > 0) parts.push(`${errorCount} error(s)`);
      if (warningCount > 0) parts.push(`${warningCount} warning(s)`);
      this.statusBarEl.setText(`Zodsidian: ${parts.join(", ")}`);
    }
  }

  clear(): void {
    this.statusBarEl.setText("");
  }
}
