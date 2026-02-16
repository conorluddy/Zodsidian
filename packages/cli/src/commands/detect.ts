import chalk from "chalk";
import {
  loadSchemas,
  parseFrontmatter,
  getRegisteredTypes,
  resolveType,
} from "@zodsidian/core";
import { walkMarkdownFiles } from "../utils/walk.js";
import { loadConfigForVault } from "../utils/config-loader.js";
import { printJson } from "../output/console-formatter.js";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface DetectCommandOptions {
  config?: string;
  json?: boolean;
}

interface TypeCount {
  type: string;
  count: number;
  files: string[];
}

export async function detectCommand(
  dir: string,
  options: DetectCommandOptions,
): Promise<void> {
  try {
    loadSchemas();
    const config = await loadConfigForVault(dir, options.config);
    const files = await walkMarkdownFiles(dir);
    const registeredTypes = new Set(getRegisteredTypes());
    const unknownTypes = new Map<string, string[]>();

    for (const { filePath, content } of files) {
      const parsed = parseFrontmatter(content);
      if (!parsed.data || typeof parsed.data !== "object") continue;

      const data = parsed.data as Record<string, unknown>;
      const userType = data.type;
      if (typeof userType !== "string") continue;

      const canonical = resolveType(userType, config);
      if (!registeredTypes.has(canonical)) {
        const existing = unknownTypes.get(userType) ?? [];
        existing.push(filePath);
        unknownTypes.set(userType, existing);
      }
    }

    if (unknownTypes.size === 0) {
      if (options.json) {
        printJson([]);
      } else {
        console.log(chalk.green("No unknown types detected."));
      }
      return;
    }

    const results: TypeCount[] = [...unknownTypes.entries()]
      .map(([type, files]) => ({ type, count: files.length, files }))
      .sort((a, b) => b.count - a.count);

    if (options.json) {
      printJson(results);
    } else {
      console.log(chalk.bold("Unknown types:\n"));
      for (const { type, count, files } of results) {
        console.log(`  ${chalk.yellow(type)} (${count} file${count !== 1 ? "s" : ""})`);
        for (const file of files) {
          console.log(chalk.dim(`    ${file}`));
        }
      }
      console.log(`\n${results.length} unknown type(s) found.`);
    }
  } catch (err) {
    console.error(`Detect failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
