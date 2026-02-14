import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";
import { fixCommand } from "./commands/fix.js";
import { indexCommand } from "./commands/index-cmd.js";
import { reportCommand } from "./commands/report.js";

const program = new Command();

program
  .name("zodsidian")
  .description("Zod-based YAML frontmatter validation for Obsidian vaults")
  .version("0.1.0");

program
  .command("validate <dir>")
  .description("Validate frontmatter in all markdown files")
  .action(validateCommand);

program
  .command("fix <dir>")
  .description("Auto-fix frontmatter issues")
  .option("--write", "Write fixes to files")
  .option("--unsafe", "Apply unsafe fixes (e.g. remove unknown keys)")
  .option("--dry-run", "Show what would be fixed without changing files")
  .action(fixCommand);

program
  .command("index <dir>")
  .description("Build vault index from markdown files")
  .option("--out <file>", "Write index to file instead of stdout")
  .action(indexCommand);

program
  .command("report <dir>")
  .description("Print a summary report of vault health")
  .action(reportCommand);

program.parse();
