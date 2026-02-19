import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import {
  loadSchemas,
  applyFixes,
  populateMissingFields,
  inferIdFromTitle,
  renameFields,
  type FixStrategy,
} from "@zodsidian/core";
import { walkMarkdownFiles, filterByType } from "../utils/walk.js";
import { loadConfigForVault } from "../utils/config-loader.js";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface FixCommandOptions {
  type?: string;
  write?: boolean;
  unsafe?: boolean;
  dryRun?: boolean;
  populate?: boolean;
  renameField?: string[];
  config?: string;
}

export async function fixCommand(dir: string, options: FixCommandOptions): Promise<void> {
  try {
    loadSchemas();
    const config = await loadConfigForVault(dir, options.config);
    let files = await walkMarkdownFiles(dir);
    if (options.type) {
      files = filterByType(files, options.type);
    }

    const preStrategies: FixStrategy[] = [];
    const extraStrategies: FixStrategy[] = [];
    if (options.populate) {
      extraStrategies.push(inferIdFromTitle);
      extraStrategies.push(populateMissingFields);
    }
    if (options.renameField && options.renameField.length > 0) {
      const renames: Record<string, string> = {};
      for (const pair of options.renameField) {
        const eq = pair.indexOf("=");
        if (eq === -1) {
          console.error(`Invalid --rename-field format "${pair}" — expected old=new`);
          process.exit(EXIT_RUNTIME_ERROR);
        }
        renames[pair.slice(0, eq)] = pair.slice(eq + 1);
      }
      // renameFields runs before normalizeArrayFields so the renamed field
      // (e.g. project→projects) is coerced to an array in the same pass
      preStrategies.push(renameFields(renames));
    }

    let fixedCount = 0;

    for (const { filePath, content } of files) {
      const result = applyFixes(content, {
        unsafe: options.unsafe,
        preStrategies: preStrategies.length > 0 ? preStrategies : undefined,
        extraStrategies: extraStrategies.length > 0 ? extraStrategies : undefined,
        config,
      });
      if (!result.changed) continue;

      fixedCount++;
      if (options.dryRun) {
        console.log(chalk.cyan(`[dry-run] Would fix: ${filePath}`));
        continue;
      }

      if (options.write) {
        await writeFile(filePath, result.content, "utf-8");
        console.log(chalk.green(`Fixed: ${filePath}`));
      } else {
        console.log(chalk.yellow(`Fixable: ${filePath}`));
      }
    }

    console.log(`\n${fixedCount} file(s) ${options.write ? "fixed" : "fixable"}.`);
  } catch (err) {
    console.error(`Fix failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
