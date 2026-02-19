import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";
import { fixCommand } from "./commands/fix.js";
import { indexCommand } from "./commands/index-cmd.js";
import { reportCommand } from "./commands/report.js";
import { newCommand } from "./commands/new.js";
import { queryCommand } from "./commands/query.js";
import { detectCommand } from "./commands/detect.js";
import { migrateCommand } from "./commands/migrate.js";

const collect = (val: string, prev: string[]) => [...prev, val];

const program = new Command();

program
  .name("zodsidian")
  .description("Zod-based YAML frontmatter validation for Obsidian vaults")
  .version("0.1.0");

program
  .command("validate <dir>")
  .description("Validate frontmatter in all markdown files")
  .option("--type <type>", "Filter to a specific document type")
  .option("--config <path>", "Path to .zodsidian.json config file")
  .action(validateCommand);

program
  .command("fix <dir>")
  .description("Auto-fix frontmatter issues")
  .option("--type <type>", "Filter to a specific document type")
  .option("--write", "Write fixes to files")
  .option("--unsafe", "Apply unsafe fixes (e.g. remove unknown keys)")
  .option("--dry-run", "Show what would be fixed without changing files")
  .option("--populate", "Fill missing required fields with schema defaults")
  .option(
    "--rename-field <old=new>",
    "Rename a frontmatter key (repeatable)",
    collect,
    [],
  )
  .option("--config <path>", "Path to .zodsidian.json config file")
  .action(fixCommand);

program
  .command("index <dir>")
  .description("Build vault index from markdown files")
  .option("--type <type>", "Filter to a specific document type")
  .option("--out <file>", "Write index to file instead of stdout")
  .option("--config <path>", "Path to .zodsidian.json config file")
  .action(indexCommand);

program
  .command("report <dir>")
  .description("Print a summary report of vault health")
  .option("--type <type>", "Filter to a specific document type")
  .option("--config <path>", "Path to .zodsidian.json config file")
  .action(reportCommand);

program
  .command("detect <dir>")
  .description("List unknown frontmatter types with file counts")
  .option("--config <path>", "Path to .zodsidian.json config file")
  .option("--json", "Output as JSON")
  .action(detectCommand);

program
  .command("migrate <dir>")
  .description("Bulk rename a frontmatter type across all files")
  .requiredOption("--from <type>", "Source type to rename")
  .requiredOption("--to <type>", "Target type to rename to")
  .option("--write", "Write changes to files (dry-run by default)")
  .action(migrateCommand);

program
  .command("new <type>")
  .description("Scaffold a new document from its schema")
  .option("--project <id>", "Set project on the scaffolded document")
  .option("--id <id>", "Set the id field on the scaffolded document")
  .option("--title <title>", "Set the title field on the scaffolded document")
  .option(
    "--field <key=value>",
    "Set any field (repeatable: --field status=done)",
    collect,
    [],
  )
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
