import { Plugin, Notice, TFile } from "obsidian";
import type { ValidationIssue } from "@zodsidian/core";
import {
  applyFixes,
  getRegisteredTypes,
  getSchemaEntry,
  inferIdFromTitle,
  inferIdFromPath,
  inferTitleFromPath,
  populateMissingFields,
  type FixStrategy,
} from "@zodsidian/core";
import type { FileContext } from "./types/file-context.js";
import type { ValidationResult } from "./services/validation-service.js";
import { DEFAULT_SETTINGS, type ZodsidianSettings } from "./settings/settings.js";
import { ZodsidianSettingTab } from "./settings/settings-tab.js";
import { VaultAdapter } from "./services/vault-adapter.js";
import { ConfigService } from "./services/config-service.js";
import { ValidationService } from "./services/validation-service.js";
import { ReportService } from "./services/report-service.js";
import { IngestService } from "./services/ingest-service.js";
import { StatusBarManager } from "./ui/status-bar.js";
import { ZODSIDIAN_VIEW_TYPE, ZodsidianView } from "./ui/zodsidian-view.js";
import { TypeMappingModal } from "./ui/type-mapping-modal.js";
import { VaultReportModal } from "./ui/vault-report-modal.js";
import { registerCommands, revealPanel } from "./commands/plugin-commands.js";
import { FrontmatterSuggest } from "./ui/frontmatter-suggest.js";

export default class ZodsidianPlugin extends Plugin {
  settings!: ZodsidianSettings;
  vaultAdapter!: VaultAdapter;
  configService!: ConfigService;
  validationService!: ValidationService;
  reportService!: ReportService;
  ingestService!: IngestService;
  private statusBar!: StatusBarManager;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.vaultAdapter = new VaultAdapter(this.app);
    this.configService = new ConfigService(this.app);
    await this.configService.loadConfig(this.settings);
    this.configService.startWatching(this.settings);
    this.validationService = new ValidationService(this.vaultAdapter, this.configService);
    this.reportService = new ReportService(this.vaultAdapter, this.configService);
    this.ingestService = new IngestService(this.vaultAdapter);
    this.statusBar = new StatusBarManager(this);

    this.registerView(
      ZODSIDIAN_VIEW_TYPE,
      (leaf) =>
        new ZodsidianView(
          leaf,
          (filePath, type) => this.convertFile(filePath, type),
          (filePath, opts) => this.fixFile(filePath, opts),
          () => this.fixVault(),
          (unknownType) => {
            new TypeMappingModal(this.app, unknownType, this.configService, () => {
              this.refreshReport();
            }).open();
          },
          () => {
            this.refreshReport();
          },
          async (filePath) => {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (file instanceof TFile) {
              await this.app.workspace.getLeaf().openFile(file);
            }
          },
          () => {
            const report = this.reportService.getReport();
            if (!report?.fileIssues.length) return;
            new VaultReportModal(this.app, report.fileIssues, async (path) => {
              const file = this.app.vault.getAbstractFileByPath(path);
              if (file instanceof TFile) {
                await this.app.workspace.getLeaf().openFile(file);
              }
            }).open();
          },
        ),
    );

    this.registerEditorSuggest(new FrontmatterSuggest(this.app));
    this.addSettingTab(new ZodsidianSettingTab(this.app, this));
    registerCommands(this);

    this.addRibbonIcon("shield-check", "Open Zodsidian panel", () => {
      revealPanel(this);
    });

    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (!this.settings.enabled || !file || !file.path.endsWith(".md")) {
          this.statusBar.clear();
          this.updateView(null);
          return;
        }
        this.validationService.validateFile(file).then((result) => {
          if (!result.isTyped) {
            this.statusBar.clear();
          } else {
            const errors = result.issues.filter((i) => i.severity === "error").length;
            const warnings = result.issues.filter((i) => i.severity === "warning").length;
            this.statusBar.update(errors, warnings);
          }
          const ctx = this.buildFileContext(file.path, result);
          this.updateView(file.path, result.issues, result.isTyped, ctx);
        });
      }),
    );

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (
          !this.settings.enabled ||
          !this.settings.validateOnSave ||
          !file.path.endsWith(".md")
        ) {
          return;
        }
        const tFile = this.app.vault.getFileByPath(file.path);
        if (!tFile) return;
        this.validationService.validateFileDebounced(tFile, 500, (result) => {
          const activeFile = this.app.workspace.getActiveFile();
          if (activeFile?.path !== file.path) return;
          if (!result.isTyped) {
            this.statusBar.clear();
          } else {
            const errors = result.issues.filter((i) => i.severity === "error").length;
            const warnings = result.issues.filter((i) => i.severity === "warning").length;
            this.statusBar.update(errors, warnings);
          }
          const ctx = this.buildFileContext(file.path, result);
          this.updateView(file.path, result.issues, result.isTyped, ctx);
        });
      }),
    );

    // File explorer context menu — "Add to Zodsidian as..."
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, abstractFile) => {
        if (!(abstractFile instanceof TFile) || !abstractFile.path.endsWith(".md")) {
          return;
        }
        const types = getRegisteredTypes();
        if (types.length === 0) return;

        menu.addSeparator();
        for (const type of types) {
          menu.addItem((item) =>
            item
              .setTitle(`Add to Zodsidian as ${type}`)
              .setIcon("file-plus")
              .onClick(() => this.convertFile(abstractFile.path, type)),
          );
        }
      }),
    );

    // If panel is already open (persisted by Obsidian), validate active file into it
    this.app.workspace.onLayoutReady(() => {
      this.registerReferenceFieldTypes();

      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile?.path.endsWith(".md") && this.getPanel()) {
        this.validationService.validateFile(activeFile).then((result) => {
          const ctx = this.buildFileContext(activeFile.path, result);
          this.updateView(activeFile.path, result.issues, result.isTyped, ctx);
        });
      }

      // Background scan for report data
      this.performBackgroundScan();
    });
  }

  onunload(): void {
    this.configService.stopWatching();
    this.statusBar.clear();
    this.validationService.clearCache();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async convertFile(filePath: string, type: string): Promise<void> {
    const file = this.app.vault.getFileByPath(filePath);
    if (!file) return;
    try {
      await this.ingestService.convertFile(file, type);
      // Auto-fix: infer id/title from filename, populate remaining required fields
      await this.fixFile(filePath, { populate: true, silent: true });
      new Notice(`Added to graph as ${type}`);
      // Re-validate so the panel updates immediately (validateFile always re-reads)
      const result = await this.validationService.validateFile(file);
      const errors = result.issues.filter((i) => i.severity === "error").length;
      const warnings = result.issues.filter((i) => i.severity === "warning").length;
      this.statusBar.update(errors, warnings);
      const ctx = this.buildFileContext(filePath, result);
      this.updateView(filePath, result.issues, result.isTyped, ctx);
    } catch (err) {
      new Notice(
        `Conversion failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async fixFile(
    filePath: string,
    opts?: { unsafe?: boolean; populate?: boolean; silent?: boolean },
  ): Promise<void> {
    const file = this.app.vault.getFileByPath(filePath);
    if (!file) return;
    try {
      const content = await this.vaultAdapter.readFile(file);
      const extraStrategies: FixStrategy[] = opts?.populate
        ? [
            inferIdFromTitle,
            inferIdFromPath(filePath),
            inferTitleFromPath(filePath),
            populateMissingFields,
          ]
        : [];
      const result = applyFixes(content, {
        config: this.configService.getConfig(),
        unsafe: opts?.unsafe,
        extraStrategies: extraStrategies.length > 0 ? extraStrategies : undefined,
      });

      if (!result.changed) {
        if (!opts?.silent) new Notice("Nothing to fix.");
        return;
      }

      await this.vaultAdapter.writeFile(file, result.content);
      if (!opts?.silent) new Notice("Fixed.");

      // Re-validate immediately so the panel and status bar update
      const validation = await this.validationService.validateFile(file);
      const errors = validation.issues.filter((i) => i.severity === "error").length;
      const warnings = validation.issues.filter((i) => i.severity === "warning").length;
      validation.isTyped
        ? this.statusBar.update(errors, warnings)
        : this.statusBar.clear();
      const ctx = this.buildFileContext(filePath, validation);
      this.updateView(filePath, validation.issues, validation.isTyped, ctx);
    } catch (err) {
      new Notice(`Fix failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async fixVault(): Promise<void> {
    const config = this.configService.getConfig();
    const files = this.vaultAdapter.getMarkdownFiles(config.excludeGlobs);
    let fixedCount = 0;

    for (const file of files) {
      const content = await this.vaultAdapter.readFile(file);
      const result = applyFixes(content, { config });
      if (result.changed) {
        await this.vaultAdapter.writeFile(file, result.content);
        fixedCount++;
      }
    }

    new Notice(fixedCount > 0 ? `Fixed ${fixedCount} file(s).` : "Nothing to fix.");

    // Re-validate active file so local section + status bar update
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile?.path.endsWith(".md")) {
      const validation = await this.validationService.validateFile(activeFile);
      const errors = validation.issues.filter((i) => i.severity === "error").length;
      const warnings = validation.issues.filter((i) => i.severity === "warning").length;
      validation.isTyped
        ? this.statusBar.update(errors, warnings)
        : this.statusBar.clear();
      const ctx = this.buildFileContext(activeFile.path, validation);
      this.updateView(activeFile.path, validation.issues, validation.isTyped, ctx);
    }
  }

  getPanel(): ZodsidianView | null {
    const leaf = this.app.workspace.getLeavesOfType(ZODSIDIAN_VIEW_TYPE)[0];
    if (!leaf) return null;
    const view = leaf.view;
    return view instanceof ZodsidianView ? view : null;
  }

  updateView(
    filePath: string | null,
    issues?: ValidationIssue[],
    isTyped?: boolean,
    context?: FileContext | null,
  ): void {
    const panel = this.getPanel();
    if (!panel) return;
    if (!filePath) {
      panel.clearFile();
    } else {
      panel.setFileResult(filePath, issues ?? [], isTyped ?? false, context ?? null);
    }
  }

  buildFileContext(filePath: string, result: ValidationResult): FileContext | null {
    if (!result.isTyped || !result.type) return null;

    const graph = this.reportService.getGraph();
    const index = this.reportService.getIndex();
    const graphReady = graph !== null && index !== null;

    // Collect outgoing references grouped by field
    const outgoing: FileContext["outgoing"] = [];
    if (graphReady) {
      const edges = graph.referencesFrom(filePath);
      const grouped = new Map<string, typeof edges>();
      for (const edge of edges) {
        const group = grouped.get(edge.field) ?? [];
        group.push(edge);
        grouped.set(edge.field, group);
      }
      for (const [fieldName, fieldEdges] of grouped) {
        outgoing.push({
          fieldName,
          targets: fieldEdges.map((e) => {
            const target = graph.nodeById(e.targetId);
            return {
              id: e.targetId,
              title: target?.title ?? null,
              type: target?.type ?? null,
              filePath: target?.filePath ?? null,
            };
          }),
        });
      }
    }

    // Collect incoming references
    const incoming: FileContext["incoming"] = [];
    if (graphReady && result.id) {
      for (const edge of graph.referencesTo(result.id)) {
        const sourceNode = index.files.get(edge.sourceFile);
        incoming.push({
          sourceFilePath: edge.sourceFile,
          sourceTitle: sourceNode?.title ?? null,
          sourceType: sourceNode?.type ?? null,
          field: edge.field,
        });
      }
    }

    // Extract key frontmatter fields (exclude structural fields and reference fields)
    const fields: FileContext["fields"] = [];
    if (result.frontmatter) {
      const entry = getSchemaEntry(result.type);
      const refFields = new Set(entry?.referenceFields ?? []);
      const skipKeys = new Set(["type", "id", "title", "tags", ...refFields]);
      for (const [key, value] of Object.entries(result.frontmatter)) {
        if (!skipKeys.has(key)) {
          fields.push({ key, value });
        }
      }
    }

    return {
      type: result.type,
      id: result.id ?? null,
      title: result.title ?? null,
      outgoing,
      incoming,
      fields,
      graphReady,
    };
  }

  /** Tell Obsidian to render reference fields as multitext (clickable links). */
  private registerReferenceFieldTypes(): void {
    const mgr = (this.app as Record<string, unknown>).metadataTypeManager as
      | { setType(name: string, type: string): void }
      | undefined;
    if (!mgr) return;

    const fields = new Set<string>();
    for (const type of getRegisteredTypes()) {
      const entry = getSchemaEntry(type);
      if (entry?.referenceFields) {
        for (const f of entry.referenceFields) fields.add(f);
      }
    }

    for (const field of fields) {
      mgr.setType(field, "multitext");
    }
  }

  private async performBackgroundScan(): Promise<void> {
    try {
      const report = await this.reportService.buildReport();

      // Show first-run notice if unknown types detected
      if (report.unknownTypes.length > 0 && !this.settings.hasSeenUnknownTypesNotice) {
        new Notice(
          `Zodsidian found ${report.unknownTypes.length} unknown type(s). Open the panel to configure mappings.`,
          10000,
        );
        this.settings.hasSeenUnknownTypesNotice = true;
        await this.saveSettings();
      }

      // Populate vault section if panel is already open
      const panel = this.getPanel();
      if (panel) panel.setReport(report);

      // Re-push file context now that graph is available
      this.refreshActiveFileContext();
    } catch (err) {
      console.error("Zodsidian background scan failed:", err);
    }
  }

  async refreshReport(): Promise<void> {
    try {
      const report = await this.reportService.buildReport();
      const panel = this.getPanel();
      if (panel) panel.setReport(report);

      // Re-push file context with updated graph
      this.refreshActiveFileContext();
    } catch (err) {
      console.error("Zodsidian report refresh failed:", err);
    }
  }

  private refreshActiveFileContext(): void {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile?.path.endsWith(".md")) return;
    const cached = this.validationService.getCachedResult(activeFile.path);
    if (!cached) return;
    const ctx = this.buildFileContext(activeFile.path, cached);
    this.updateView(activeFile.path, cached.issues, cached.isTyped, ctx);
  }
}
