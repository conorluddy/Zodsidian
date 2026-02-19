import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import { loadSchemas, scaffold } from "@zodsidian/core";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface NewCommandOptions {
  project?: string;
  out?: string;
  id?: string;
  title?: string;
  field?: string[];
}

export async function newCommand(
  type: string,
  options: NewCommandOptions,
): Promise<void> {
  try {
    loadSchemas();

    const overrides: Record<string, unknown> = {};
    if (options.project) {
      overrides.projects = [options.project];
    }
    if (options.id) {
      overrides.id = options.id;
    }
    if (options.title) {
      overrides.title = options.title;
    }
    for (const pair of options.field ?? []) {
      const eq = pair.indexOf("=");
      if (eq === -1) {
        console.error(`Invalid --field format "${pair}" — expected key=value`);
        process.exit(EXIT_RUNTIME_ERROR);
      }
      overrides[pair.slice(0, eq)] = pair.slice(eq + 1);
    }

    const result = scaffold(type, { overrides });
    if (!result.ok) {
      console.error(result.error.message);
      process.exit(EXIT_RUNTIME_ERROR);
    }

    if (options.out) {
      const filePath = join(options.out, `${type}-new.md`);
      await writeFile(filePath, result.value.content, "utf-8");
      console.log(chalk.green(`Created: ${filePath}`));
    } else {
      process.stdout.write(result.value.content);
    }
  } catch (err) {
    console.error(`Scaffold failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
