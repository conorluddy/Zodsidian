import type { VaultIndex, VaultStats } from "@zodsidian/core";
import { buildVaultIndex, getRegisteredTypes } from "@zodsidian/core";
import type { VaultAdapter } from "./vault-adapter.js";
import type { ConfigService } from "./config-service.js";

export interface UnknownType {
  type: string;
  count: number;
}

export interface TypeBreakdown {
  type: string;
  count: number;
}

export interface VaultReport {
  stats: VaultStats;
  typeBreakdown: TypeBreakdown[];
  unknownTypes: UnknownType[];
  activeMappings: Record<string, string>;
}

/**
 * Builds vault-wide reports by scanning all markdown files
 */
export class ReportService {
  constructor(
    private vaultAdapter: VaultAdapter,
    private configService: ConfigService,
  ) {}

  /**
   * Build a full vault report including stats, type breakdown, and unknown types
   */
  async buildReport(): Promise<VaultReport> {
    const files = await this.vaultAdapter.getAllMarkdownFiles();
    const config = this.configService.getConfig();
    const index = buildVaultIndex(files, config);

    const typeBreakdown = this.getTypeBreakdown(index);
    const unknownTypes = this.detectUnknownTypes(index);
    const activeMappings = config.typeMappings ?? {};

    return {
      stats: index.stats,
      typeBreakdown,
      unknownTypes,
      activeMappings,
    };
  }

  /**
   * Get count of files per type
   */
  private getTypeBreakdown(index: VaultIndex): TypeBreakdown[] {
    const counts = new Map<string, number>();

    for (const [_, node] of index.files) {
      if (node.type) {
        counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Detect types that aren't registered in the schema registry
   */
  private detectUnknownTypes(index: VaultIndex): UnknownType[] {
    const knownTypes = new Set(getRegisteredTypes());
    const unknownCounts = new Map<string, number>();

    for (const [_, node] of index.files) {
      if (node.type && !knownTypes.has(node.type)) {
        unknownCounts.set(node.type, (unknownCounts.get(node.type) ?? 0) + 1);
      }
    }

    return Array.from(unknownCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }
}
