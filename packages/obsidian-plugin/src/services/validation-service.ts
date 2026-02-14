import type { TFile } from "obsidian";
import {
  loadSchemas,
  parseFrontmatter,
  validateFrontmatter,
  type ValidationIssue,
} from "@zodsidian/core";
import { VaultAdapter } from "./vault-adapter.js";

export class ValidationService {
  private cache = new Map<string, ValidationIssue[]>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private vault: VaultAdapter) {
    loadSchemas();
  }

  async validateFile(file: TFile): Promise<ValidationIssue[]> {
    const content = await this.vault.readFile(file);
    const parsed = parseFrontmatter(content);
    if (!parsed.data || typeof parsed.data !== "object") {
      this.cache.set(file.path, parsed.issues);
      return parsed.issues;
    }

    const schemaIssues = validateFrontmatter(
      parsed.data as Record<string, unknown>,
    );
    const allIssues = [...parsed.issues, ...schemaIssues];
    this.cache.set(file.path, allIssues);
    return allIssues;
  }

  validateFileDebounced(file: TFile, delayMs = 500): void {
    const existing = this.debounceTimers.get(file.path);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(
      file.path,
      setTimeout(() => {
        this.validateFile(file);
        this.debounceTimers.delete(file.path);
      }, delayMs),
    );
  }

  getCachedIssues(filePath: string): ValidationIssue[] {
    return this.cache.get(filePath) ?? [];
  }

  clearCache(): void {
    this.cache.clear();
  }
}
