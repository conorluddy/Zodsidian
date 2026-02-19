import { writeFile } from "node:fs/promises";
import {
  loadSchemas,
  applyFixes,
  populateMissingFields,
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
      extraStrategies.push(populateMissingFields);
    }
    if (options.renameField && options.renameField.length > 0) {
      const renames: Record<string, string> = {};
      for (const pair of options.renameField) {
        const eq = pair.indexOf("=");
        if (eq === -1) {
          console.error(
            JSON.stringify({
              error: `Invalid --rename-field format "${pair}" — expected old=new`,
            }),
          );
          process.exit(EXIT_RUNTIME_ERROR);
        }
        renames[pair.slice(0, eq)] = pair.slice(eq + 1);
      }
      preStrategies.push(renameFields(renames));
    }

    const changed: Array<{ filePath: string }> = [];
    const unchanged: Array<{ filePath: string }> = [];

    for (const { filePath, content } of files) {
      const result = applyFixes(content, {
        unsafe: options.unsafe,
        preStrategies: preStrategies.length > 0 ? preStrategies : undefined,
        extraStrategies: extraStrategies.length > 0 ? extraStrategies : undefined,
        config,
      });

      if (result.changed) {
        changed.push({ filePath });
        if (options.write && !options.dryRun) {
          await writeFile(filePath, result.content, "utf-8");
        }
      } else {
        unchanged.push({ filePath });
      }
    }

    console.log(
      JSON.stringify({
        changed,
        unchanged,
        totalChanged: changed.length,
        totalUnchanged: unchanged.length,
        written: options.write === true && !options.dryRun,
        dryRun: options.dryRun === true,
      }),
    );
  } catch (err) {
    console.error(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    );
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
