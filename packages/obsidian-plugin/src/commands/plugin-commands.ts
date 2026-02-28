import { Notice } from "obsidian";
import type ZodsidianPlugin from "../main.js";
import { getRegisteredTypes, type ValidationIssue } from "@zodsidian/core";
import { ZODSIDIAN_VIEW_TYPE, ZodsidianView } from "../ui/zodsidian-view.js";
import type { FileContext } from "../types/file-context.js";

export function registerCommands(plugin: ZodsidianPlugin): void {
  plugin.addCommand({
    id: "validate-current-file",
    name: "Validate current file",
    editorCallback: async (_editor, ctx) => {
      if (!ctx.file) return;
      const result = await plugin.validationService.validateFile(ctx.file);
      const fileCtx = plugin.buildFileContext(ctx.file.path, result);
      updatePanel(plugin, ctx.file.path, result.issues, result.isTyped, fileCtx);

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
      const excludeGlobs = plugin.configService.getConfig().excludeGlobs;
      const files = plugin.vaultAdapter.getMarkdownFiles(excludeGlobs);
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
          const fileCtx = plugin.buildFileContext(activeFile.path, cached);
          updatePanel(plugin, activeFile.path, cached.issues, cached.isTyped, fileCtx);
        }
      }

      new Notice(`Zodsidian: ${totalIssues} issue(s) across ${files.length} files.`);
    },
  });

  plugin.addCommand({
    id: "fix-current-file",
    name: "Fix current file",
    editorCallback: (_editor, ctx) => {
      if (!ctx.file) return;
      plugin.fixFile(ctx.file.path);
    },
  });

  // One command per registered schema type — dynamically driven by registry
  for (const type of getRegisteredTypes()) {
    plugin.addCommand({
      id: `convert-to-${type}`,
      name: `Convert current file to ${type}`,
      editorCallback: (_editor, ctx) => {
        if (!ctx.file) return;
        plugin.convertFile(ctx.file.path, type);
      },
    });
  }

  plugin.addCommand({
    id: "open-panel",
    name: "Open panel",
    callback: async () => {
      await revealPanel(plugin);
    },
  });
}

export async function revealPanel(plugin: ZodsidianPlugin): Promise<void> {
  const existing = plugin.app.workspace.getLeavesOfType(ZODSIDIAN_VIEW_TYPE);
  if (existing.length === 0) {
    const leaf = plugin.app.workspace.getRightLeaf(false);
    if (leaf) await leaf.setViewState({ type: ZODSIDIAN_VIEW_TYPE, active: true });
  } else {
    plugin.app.workspace.revealLeaf(existing[0]);
  }

  // Populate both sections immediately
  const activeFile = plugin.app.workspace.getActiveFile();
  if (activeFile?.path.endsWith(".md")) {
    const result = await plugin.validationService.validateFile(activeFile);
    const fileCtx = plugin.buildFileContext(activeFile.path, result);
    updatePanel(plugin, activeFile.path, result.issues, result.isTyped, fileCtx);
  }
  const report = await plugin.reportService.buildReport();
  setReportInPanel(plugin, report);
}

export function updatePanel(
  plugin: ZodsidianPlugin,
  filePath: string,
  issues: ValidationIssue[],
  isTyped: boolean,
  context?: FileContext | null,
): void {
  const leaf = plugin.app.workspace.getLeavesOfType(ZODSIDIAN_VIEW_TYPE)[0];
  if (!leaf) return;
  const view = leaf.view;
  if (view instanceof ZodsidianView) {
    view.setFileResult(filePath, issues, isTyped, context ?? null);
  }
}

export function setReportInPanel(
  plugin: ZodsidianPlugin,
  report: import("../services/report-service.js").VaultReport,
): void {
  const leaf = plugin.app.workspace.getLeavesOfType(ZODSIDIAN_VIEW_TYPE)[0];
  if (!leaf) return;
  const view = leaf.view;
  if (view instanceof ZodsidianView) {
    view.setReport(report);
  }
}
