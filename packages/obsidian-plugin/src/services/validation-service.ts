import type { TFile } from "obsidian";
import {
  loadSchemas,
  parseFrontmatter,
  validateFrontmatter,
  resolveType,
  getRegisteredTypes,
  type ValidationIssue,
} from "@zodsidian/core";
import { VaultAdapter } from "./vault-adapter.js";
import type { ConfigService } from "./config-service.js";

export interface ValidationResult {
  issues: ValidationIssue[];
  isTyped: boolean;
  type?: string;
  id?: string;
  title?: string;
  frontmatter?: Record<string, unknown>;
}

export class ValidationService {
  private cache = new Map<string, ValidationResult>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private vault: VaultAdapter,
    private configService?: ConfigService,
  ) {
    loadSchemas();
  }

  async validateFile(file: TFile): Promise<ValidationResult> {
    const config = this.configService?.getConfig();
    const content = await this.vault.readFile(file);
    const parsed = parseFrontmatter(content);
    if (!parsed.data || typeof parsed.data !== "object") {
      const result: ValidationResult = { issues: parsed.issues, isTyped: false };
      this.cache.set(file.path, result);
      return result;
    }

    const data = parsed.data as Record<string, unknown>;
    const typeName = typeof data.type === "string" ? data.type : null;
    const canonicalType = typeName ? resolveType(typeName, config) : null;
    const isTyped =
      canonicalType !== null && getRegisteredTypes().includes(canonicalType);

    const schemaIssues = validateFrontmatter(data, config);
    const allIssues = [...parsed.issues, ...schemaIssues];
    const result: ValidationResult = {
      issues: allIssues,
      isTyped,
      type: canonicalType ?? undefined,
      id: typeof data.id === "string" ? data.id : undefined,
      title: typeof data.title === "string" ? data.title : undefined,
      frontmatter: isTyped ? data : undefined,
    };
    this.cache.set(file.path, result);
    return result;
  }

  validateFileDebounced(
    file: TFile,
    delayMs = 500,
    onComplete?: (result: ValidationResult) => void,
  ): void {
    const existing = this.debounceTimers.get(file.path);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(
      file.path,
      setTimeout(async () => {
        const result = await this.validateFile(file);
        this.debounceTimers.delete(file.path);
        onComplete?.(result);
      }, delayMs),
    );
  }

  getCachedResult(filePath: string): ValidationResult | undefined {
    return this.cache.get(filePath);
  }

  getCachedIssues(filePath: string): ValidationIssue[] {
    return this.cache.get(filePath)?.issues ?? [];
  }

  clearCache(): void {
    this.cache.clear();
  }
}
