import { Notice } from "obsidian";
import type ZodsidianPlugin from "../main.js";
import { applyFixes, type ValidationIssue } from "@zodsidian/core";
import { VALIDATION_VIEW_TYPE, ValidationView } from "../ui/validation-view.js";

export function registerCommands(plugin: ZodsidianPlugin): void {
  plugin.addCommand({
    id: "validate-current-file",
    name: "Validate current file",
    editorCallback: async (_editor, ctx) => {
      if (!ctx.file) return;
      const result = await plugin.validationService.validateFile(ctx.file);

      updateValidationView(plugin, ctx.file.path, result.issues, result.isTyped);

      if (result.issues.length === 0) {
        new Notice("Zodsidian: No issues found.");
      } else {
        new Notice(`Zodsidian: ${result.issues.length} issue(s) found.`);
      }
    },
  });

  plugin.addCommand({
    id: "validate-vault",
    name: "Validate entire vault",
    callback: async () => {
      const files = plugin.vaultAdapter.getMarkdownFiles();
      let totalIssues = 0;

      for (const file of files) {
        const result = await plugin.validationService.validateFile(file);
        if (result.issues.length > 0) {
          totalIssues += result.issues.length;
        }
      }

      // Show the active file's results in the panel
      const activeFile = plugin.app.workspace.getActiveFile();
      if (activeFile) {
        const cached = plugin.validationService.getCachedResult(activeFile.path);
        if (cached) {
          updateValidationView(plugin, activeFile.path, cached.issues, cached.isTyped);
        }
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

  plugin.addCommand({
    id: "open-validation-panel",
    name: "Open validation panel",
    callback: async () => {
      await revealValidationPanel(plugin);
    },
  });
}

export async function revealValidationPanel(plugin: ZodsidianPlugin): Promise<void> {
  const existing = plugin.app.workspace.getLeavesOfType(VALIDATION_VIEW_TYPE);
  if (existing.length === 0) {
    const leaf = plugin.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VALIDATION_VIEW_TYPE, active: true });
    }
  } else {
    plugin.app.workspace.revealLeaf(existing[0]);
  }

  // Validate the current file into the panel
  const activeFile = plugin.app.workspace.getActiveFile();
  if (activeFile?.path.endsWith(".md")) {
    const result = await plugin.validationService.validateFile(activeFile);
    updateValidationView(plugin, activeFile.path, result.issues, result.isTyped);
  }
}

function updateValidationView(
  plugin: ZodsidianPlugin,
  filePath: string,
  issues: ValidationIssue[],
  isTyped: boolean,
): void {
  const leaf = plugin.app.workspace.getLeavesOfType(VALIDATION_VIEW_TYPE)[0];
  if (!leaf) return;
  const view = leaf.view;
  if (view instanceof ValidationView) {
    view.setFileResult(filePath, issues, isTyped);
  }
}
