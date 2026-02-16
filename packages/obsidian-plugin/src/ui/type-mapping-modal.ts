import { SuggestModal, Notice, type App } from "obsidian";
import { getRegisteredTypes, type ZodsidianConfig } from "@zodsidian/core";
import type { ConfigService } from "../services/config-service.js";

/**
 * Modal for mapping an unknown type to a registered canonical type.
 *
 * Uses Obsidian's SuggestModal for built-in fuzzy matching.
 * After selection, saves the mapping to zodsidian.config.json and
 * calls the onMapped callback so the caller can refresh views.
 */
export class TypeMappingModal extends SuggestModal<string> {
  private canonicalTypes: string[];

  constructor(
    app: App,
    private unknownType: string,
    private configService: ConfigService,
    private onMapped: () => void,
  ) {
    super(app);
    this.canonicalTypes = getRegisteredTypes();
    this.setPlaceholder(`Map "${unknownType}" to...`);
    this.setInstructions([
      { command: "Type", purpose: "to filter canonical types" },
      { command: "Enter", purpose: "to confirm mapping" },
      { command: "Esc", purpose: "to cancel" },
    ]);
  }

  getSuggestions(query: string): string[] {
    if (!query) {
      return this.sortByRelevance(this.canonicalTypes);
    }

    const lower = query.toLowerCase();
    const matches = this.canonicalTypes.filter((t) => t.toLowerCase().includes(lower));
    return this.sortByRelevance(matches);
  }

  renderSuggestion(type: string, el: HTMLElement): void {
    el.createDiv({ text: type, cls: "zodsidian-suggest-type" });
    el.createDiv({
      text: `${this.unknownType} → ${type}`,
      cls: "zodsidian-suggest-preview",
    });
  }

  async onChooseSuggestion(canonicalType: string): Promise<void> {
    const config = this.configService.getConfig();
    const updatedConfig: ZodsidianConfig = {
      ...config,
      typeMappings: {
        ...config.typeMappings,
        [this.unknownType]: canonicalType,
      },
    };

    try {
      await this.configService.saveConfig(updatedConfig);
      new Notice(`Mapped "${this.unknownType}" → "${canonicalType}"`);
      this.onMapped();
    } catch (err) {
      new Notice(
        `Failed to save mapping: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Sort types by relevance to the unknown type.
   * Types that share a prefix with the unknown type appear first.
   */
  private sortByRelevance(types: string[]): string[] {
    const unknownLower = this.unknownType.toLowerCase();
    const unknownParts = unknownLower.split(/[-_]/);

    return [...types].sort((a, b) => {
      const scoreA = this.relevanceScore(a.toLowerCase(), unknownLower, unknownParts);
      const scoreB = this.relevanceScore(b.toLowerCase(), unknownLower, unknownParts);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.localeCompare(b);
    });
  }

  private relevanceScore(
    candidate: string,
    unknownLower: string,
    unknownParts: string[],
  ): number {
    // Exact substring of the unknown type
    if (unknownLower.includes(candidate)) return 3;
    // Candidate is a substring of the unknown type
    if (candidate.includes(unknownLower)) return 2;
    // Shares a word part (e.g. "project-index" shares "project" with "project")
    const candidateParts = candidate.split(/[-_]/);
    const sharedParts = unknownParts.filter((p) => candidateParts.includes(p));
    if (sharedParts.length > 0) return 1;
    return 0;
  }
}
