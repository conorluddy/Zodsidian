import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import { loadSchemas, applyFixes } from "@zodsidian/core";
import { walkMarkdownFiles } from "../utils/walk.js";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface FixCommandOptions {
  write?: boolean;
  unsafe?: boolean;
  dryRun?: boolean;
}

export async function fixCommand(dir: string, options: FixCommandOptions): Promise<void> {
  try {
    loadSchemas();
    const files = await walkMarkdownFiles(dir);
    let fixedCount = 0;

    for (const { filePath, content } of files) {
      const result = applyFixes(content, { unsafe: options.unsafe });
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
