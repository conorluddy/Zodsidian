import { Notice } from "obsidian";
import type ZodsidianPlugin from "../main.js";
import { applyFixes } from "@zodsidian/core";
import { VALIDATION_VIEW_TYPE } from "../ui/validation-view.js";

export function registerCommands(plugin: ZodsidianPlugin): void {
  plugin.addCommand({
    id: "validate-current-file",
    name: "Validate current file",
    editorCallback: async (_editor, ctx) => {
      if (!ctx.file) return;
      const issues = await plugin.validationService.validateFile(ctx.file);
      if (issues.length === 0) {
        new Notice("Zodsidian: No issues found.");
      } else {
        new Notice(`Zodsidian: ${issues.length} issue(s) found.`);
      }
    },
  });

  plugin.addCommand({
    id: "validate-vault",
    name: "Validate entire vault",
    callback: async () => {
      const files = plugin.vaultAdapter.getMarkdownFiles();
      let totalIssues = 0;
      const allResults: { filePath: string; issues: typeof issues }[] = [];

      for (const file of files) {
        const issues = await plugin.validationService.validateFile(file);
        if (issues.length > 0) {
          totalIssues += issues.length;
          allResults.push({ filePath: file.path, issues });
        }
      }

      const view = plugin.app.workspace.getLeavesOfType(VALIDATION_VIEW_TYPE)[0]?.view;
      if (view && "setIssues" in view) {
        (view as { setIssues: (issues: typeof allResults) => void }).setIssues(
          allResults,
        );
      }

      new Notice(`Zodsidian: ${totalIssues} issue(s) across ${files.length} files.`);
    },
  });

  plugin.addCommand({
    id: "fix-current-file",
    name: "Fix current file",
    editorCallback: async (editor, ctx) => {
      if (!ctx.file) return;
      const content = await plugin.vaultAdapter.readFile(ctx.file);
      const result = applyFixes(content);

      if (!result.changed) {
        new Notice("Zodsidian: Nothing to fix.");
        return;
      }

      await plugin.vaultAdapter.writeFile(ctx.file, result.content);
      editor.setValue(result.content);
      new Notice("Zodsidian: File fixed.");
    },
  });
}
