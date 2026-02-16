import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import { loadSchemas, parseFrontmatter, stringifyFrontmatter } from "@zodsidian/core";
import { walkMarkdownFiles } from "../utils/walk.js";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface MigrateCommandOptions {
  from: string;
  to: string;
  write?: boolean;
}

export async function migrateCommand(
  dir: string,
  options: MigrateCommandOptions,
): Promise<void> {
  try {
    if (!options.from || !options.to) {
      console.error("Both --from and --to are required.");
      process.exit(EXIT_RUNTIME_ERROR);
    }

    loadSchemas();
    const files = await walkMarkdownFiles(dir);
    let matchCount = 0;

    for (const { filePath, content } of files) {
      const parsed = parseFrontmatter(content);
      if (!parsed.data || typeof parsed.data !== "object") continue;

      const data = parsed.data as Record<string, unknown>;
      if (data.type !== options.from) continue;

      matchCount++;
      const updated = { ...data, type: options.to };
      const newYaml = stringifyFrontmatter(updated);
      const newContent = `---\n${newYaml}\n---${parsed.body}`;

      if (options.write) {
        await writeFile(filePath, newContent, "utf-8");
        console.log(chalk.green(`Migrated: ${filePath}`));
      } else {
        console.log(chalk.cyan(`[dry-run] Would migrate: ${filePath}`));
      }
    }

    const verb = options.write ? "migrated" : "would migrate";
    console.log(
      `\n${matchCount} file(s) ${verb} from "${options.from}" to "${options.to}".`,
    );
  } catch (err) {
    console.error(`Migrate failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
