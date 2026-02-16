import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";
import { fixCommand } from "./commands/fix.js";
import { indexCommand } from "./commands/index-cmd.js";
import { reportCommand } from "./commands/report.js";
import { newCommand } from "./commands/new.js";
import { queryCommand } from "./commands/query.js";

const program = new Command();

program
  .name("zodsidian")
  .description("Zod-based YAML frontmatter validation for Obsidian vaults")
  .version("0.1.0");

program
  .command("validate <dir>")
  .description("Validate frontmatter in all markdown files")
  .option("--type <type>", "Filter to a specific document type")
  .action(validateCommand);

program
  .command("fix <dir>")
  .description("Auto-fix frontmatter issues")
  .option("--type <type>", "Filter to a specific document type")
  .option("--write", "Write fixes to files")
  .option("--unsafe", "Apply unsafe fixes (e.g. remove unknown keys)")
  .option("--dry-run", "Show what would be fixed without changing files")
  .option("--populate", "Fill missing required fields with schema defaults")
  .action(fixCommand);

program
  .command("index <dir>")
  .description("Build vault index from markdown files")
  .option("--type <type>", "Filter to a specific document type")
  .option("--out <file>", "Write index to file instead of stdout")
  .action(indexCommand);

program
  .command("report <dir>")
  .description("Print a summary report of vault health")
  .option("--type <type>", "Filter to a specific document type")
  .action(reportCommand);

program
  .command("new <type>")
  .description("Scaffold a new document from its schema")
  .option("--project <id>", "Set project on the scaffolded document")
  .option("--out <dir>", "Write to directory instead of stdout")
  .action(newCommand);

program
  .command("query <dir>")
  .description("Query the vault as a typed graph")
  .option("--type <type>", "Filter nodes by schema type")
  .option("--id <id>", "Look up a single node by id")
  .option("--refs", "Include incoming and outgoing references (requires --id)")
  .action(queryCommand);

program.parse();
