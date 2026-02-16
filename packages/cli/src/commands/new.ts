import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import { loadSchemas, scaffold } from "@zodsidian/core";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface NewCommandOptions {
  project?: string;
  out?: string;
}

export async function newCommand(
  type: string,
  options: NewCommandOptions,
): Promise<void> {
  try {
    loadSchemas();

    const overrides: Record<string, unknown> = {};
    if (options.project) {
      overrides.projectId = options.project;
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
