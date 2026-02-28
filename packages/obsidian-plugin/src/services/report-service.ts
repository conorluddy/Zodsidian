import type { VaultIndex, VaultStats } from "@zodsidian/core";
import { buildVaultIndex, getRegisteredTypes, VaultGraph } from "@zodsidian/core";
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
  typeFiles: Record<string, string[]>;
}

/**
 * Builds vault-wide reports by scanning all markdown files
 */
export class ReportService {
  private graph: VaultGraph | null = null;
  private index: VaultIndex | null = null;

  constructor(
    private vaultAdapter: VaultAdapter,
    private configService: ConfigService,
  ) {}

  getGraph(): VaultGraph | null {
    return this.graph;
  }

  getIndex(): VaultIndex | null {
    return this.index;
  }

  /**
   * Build a full vault report including stats, type breakdown, and unknown types
   */
  async buildReport(): Promise<VaultReport> {
    const tFiles = this.vaultAdapter.getMarkdownFiles();
    const config = this.configService.getConfig();
    const files = await Promise.all(
      tFiles.map(async (file) => ({
        filePath: file.path,
        content: await this.vaultAdapter.readFile(file),
      })),
    );
    const index = buildVaultIndex(files, config);
    this.index = index;
    this.graph = new VaultGraph(index);

    const { breakdown, unknownTypes, typeFiles } = this.getTypeData(index);
    const activeMappings = config.typeMappings ?? {};

    return {
      stats: index.stats,
      typeBreakdown: breakdown,
      unknownTypes,
      activeMappings,
      typeFiles,
    };
  }

  /**
   * Single-pass scan: returns type counts, unknown types, and file paths per type
   */
  private getTypeData(index: VaultIndex): {
    breakdown: TypeBreakdown[];
    unknownTypes: UnknownType[];
    typeFiles: Record<string, string[]>;
  } {
    const knownTypes = new Set(getRegisteredTypes());
    const counts = new Map<string, number>();
    const typeFiles: Record<string, string[]> = {};

    for (const [filePath, node] of index.files) {
      if (node.type) {
        counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
        (typeFiles[node.type] ??= []).push(filePath);
      }
    }

    const sorted = Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      breakdown: sorted.filter(({ type }) => knownTypes.has(type)),
      unknownTypes: sorted.filter(({ type }) => !knownTypes.has(type)),
      typeFiles,
    };
  }
}
