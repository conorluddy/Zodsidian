import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";
import { fixCommand } from "./commands/fix.js";
import { queryCommand } from "./commands/query.js";
import { schemaCommand } from "./commands/schema.js";

const collect = (val: string, prev: string[]) => [...prev, val];

const program = new Command();

program
  .name("aii")
  .description("AI Interface — JSON-first CLI for AI agents")
  .version("0.1.0");

program
  .command("validate <dir>")
  .description("Validate frontmatter; output structured JSON")
  .option("--type <type>", "Filter to a specific document type")
  .option("--config <path>", "Path to .zodsidian.json config file")
  .action(validateCommand);

program
  .command("fix <dir>")
  .description("Auto-fix frontmatter issues; output structured JSON")
  .option("--type <type>", "Filter to a specific document type")
  .option("--write", "Write fixes to files")
  .option("--unsafe", "Apply unsafe fixes (e.g. remove unknown keys)")
  .option("--dry-run", "Compute changes without writing")
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
  .command("query <dir>")
  .description("Query the vault graph; nodes always include frontmatter")
  .option("--type <type>", "Filter nodes by schema type")
  .option("--id <id>", "Look up a single node by id (returns node + refs)")
  .action(queryCommand);

program
  .command("schema [type]")
  .description("Inspect the schema registry")
  .action(schemaCommand);

program.parse();
