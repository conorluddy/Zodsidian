# @zodsidian/cli

**Command-line interface for Zodsidian — validate, fix, scaffold, and query Obsidian vaults.**

CLI wraps `@zodsidian/core` with Commander + chalk. Core does the logic, CLI handles formatting, flags, and user interaction. Every command is fully parameterizable via flags/args — no interactive prompts. AI agents can call CLI commands directly.

## Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [Commands](#commands)
  - [validate](#validate)
  - [fix](#fix)
  - [index](#index)
  - [report](#report)
  - [new](#new)
  - [query](#query)
- [Output Formatting](#output-formatting)
- [Exit Codes](#exit-codes)
- [Key Files](#key-files)
- [Adding a Command](#adding-a-command)

## Overview

`@zodsidian/cli` provides 6 commands for working with Zodsidian vaults:

```bash
zodsidian validate <dir>    # Validate frontmatter against schemas
zodsidian fix <dir>         # Auto-fix frontmatter issues
zodsidian index <dir>       # Build vault index (JSON output)
zodsidian report <dir>      # Print vault health summary
zodsidian new <type>        # Scaffold a new document from schema
zodsidian query <dir>       # Query vault as a typed graph
```

All commands:

- Are fully parameterizable (no interactive prompts)
- Support `--type` filtering where applicable
- Return structured data (JSON for `index`, `query`)
- Use consistent exit codes for scripting

## Design Principles

### 1. Core does logic, CLI formats

Core returns structured data. CLI formats it for the terminal:

```typescript
// Core (structured data)
const result = validateFrontmatter(frontmatter);

// CLI (formatted output with chalk)
if (result.valid) {
  console.log(chalk.green("✓ Valid"));
} else {
  console.log(chalk.red("✗ Invalid"));
}
```

This separation allows the same logic to be used by the Obsidian plugin with different formatting.

### 2. Fully parameterizable

Every command accepts all inputs via flags/args. No interactive prompts:

```bash
# ✅ Good — fully parameterized
zodsidian new decision --project proj-1 --out ./vault

# ❌ Bad — interactive prompt
zodsidian new decision
# → "Which project? [prompt]"
```

This design makes commands callable by AI agents and scriptable.

### 3. JSON output for machine consumption

Commands that output data support JSON:

```bash
zodsidian index ./vault --out vault-index.json
zodsidian query ./vault --type project  # JSON to stdout
```

AI agents and scripts can parse this output with `jq` or JSON.parse().

### 4. Consistent exit codes

Commands use standard exit codes for scripting:

- `0` — Success
- `1` — Validation errors
- `2` — Runtime errors (file not found, invalid args)

## Commands

### validate

**Validate frontmatter in all markdown files.**

```bash
zodsidian validate <dir> [--type <type>]
```

**Arguments:**

- `<dir>` — Path to vault directory

**Options:**

- `--type <type>` — Filter to a specific document type (e.g., `project`, `decision`)

**What it does:**

1. Scans all markdown files in `<dir>`
2. Parses frontmatter with `gray-matter`
3. Validates each file against its schema (based on `type` field)
4. Runs vault-level checks (duplicate IDs, broken references)
5. Prints issues with file paths and suggestions

**Exit codes:**

- `0` — All files valid
- `1` — Validation errors found
- `2` — Runtime error (directory not found, permission denied)

**Example output:**

```
[ERROR] invalid-missing-title.md: Required field missing
  → Add a "title" field to frontmatter

[ERROR] test.md (extraField): Unknown key(s): extraField
  → Remove unknown keys: extraField

[WARN] dec-orphan.md (projectId): Reference target not found: nonexistent-project

Files scanned: 12
Valid: 9
Errors: 2
Warnings: 1
```

**Examples:**

```bash
# Validate entire vault
zodsidian validate ./vault

# Validate only projects
zodsidian validate ./vault --type project

# Use in CI
zodsidian validate ./vault && echo "Vault is valid"
```

---

### fix

**Auto-fix frontmatter issues.**

```bash
zodsidian fix <dir> [--type <type>] [--write] [--unsafe] [--dry-run] [--populate] [--rename-field old=new]
```

**Arguments:**

- `<dir>` — Path to vault directory

**Options:**

- `--type <type>` — Filter to a specific document type
- `--write` — Write fixes to files (default: dry-run)
- `--unsafe` — Apply unsafe fixes (e.g., remove unknown keys)
- `--dry-run` — Preview fixes without changing files
- `--populate` — Fill missing required fields with schema defaults
- `--rename-field <old=new>` — Rename a frontmatter key (repeatable)

**What it does:**

**Safe fixes (default):**

- Sort keys to match schema field order
- Normalize scalar tags to arrays (`tags: foo` → `tags: ["foo"]`)

**Unsafe fixes (`--unsafe`):**

- Remove unknown keys that violate `.strict()`

**Populate (`--populate`):**

- Fill missing required fields with schema defaults (e.g., `tags: []`)

**Rename fields (`--rename-field`):**

- Renames a frontmatter key. Only renames if the old key exists and the new key does not — never overwrites. Runs before array normalization so renamed fields (e.g. `projects`) are correctly coerced to arrays in the same pass. Repeatable for multiple renames.

**Exit codes:**

- `0` — Fixes applied successfully (or dry-run completed)
- `2` — Runtime error

**Examples:**

```bash
# Preview fixes (dry-run)
zodsidian fix ./vault --dry-run

# Apply safe fixes
zodsidian fix ./vault --write

# Apply all fixes including unsafe
zodsidian fix ./vault --write --unsafe

# Fix only projects
zodsidian fix ./vault --type project --write

# Fill missing fields
zodsidian fix ./vault --write --populate

# Migrate legacy plan fields to canonical names
zodsidian fix ./vault --type plan --rename-field project=projects --rename-field date=created --write
```

**Example output:**

```
[FIX] project.md
  ✓ Sorted keys to match schema
  ✓ Normalized tags to array

[FIX] decision.md (--unsafe required)
  ⚠ Unknown key: extraField

Files scanned: 12
Files fixed: 2
Unsafe fixes available: 1
```

---

### index

**Build vault index from markdown files.**

```bash
zodsidian index <dir> [--type <type>] [--out <file>]
```

**Arguments:**

- `<dir>` — Path to vault directory

**Options:**

- `--type <type>` — Filter to a specific document type
- `--out <file>` — Write index to file (default: stdout)

**What it does:**

1. Scans all markdown files in `<dir>`
2. Builds in-memory vault index (file map, ID index, reference graph, stats)
3. Outputs index as JSON

**Output format:**

```json
{
  "files": {
    "vault/project.md": {
      "frontmatter": { "type": "project", "id": "proj-1", "title": "My Project" },
      "isValid": true
    }
  },
  "idMap": {
    "proj-1": "vault/project.md"
  },
  "typeIndex": {
    "project": ["proj-1"]
  },
  "stats": {
    "totalFiles": 12,
    "validFiles": 10,
    "errorCount": 2,
    "warningCount": 1
  }
}
```

**Exit codes:**

- `0` — Index built successfully
- `2` — Runtime error

**Examples:**

```bash
# Print index to stdout
zodsidian index ./vault

# Write to file
zodsidian index ./vault --out vault-index.json

# Index only projects
zodsidian index ./vault --type project --out projects.json

# Use with jq
zodsidian index ./vault | jq '.stats'
```

---

### report

**Print a summary report of vault health.**

```bash
zodsidian report <dir> [--type <type>]
```

**Arguments:**

- `<dir>` — Path to vault directory

**Options:**

- `--type <type>` — Filter to a specific document type

**What it does:**

1. Builds vault index
2. Prints summary stats (total files, valid files, errors, warnings)
3. Lists document types and counts

**Example output:**

```
Vault Health Report
===================

Total files: 12
Valid files: 10
Errors: 2
Warnings: 1

Document Types:
  project: 3
  decision: 5
  idea: 4
```

**Exit codes:**

- `0` — Report generated
- `2` — Runtime error

**Examples:**

```bash
# Full vault report
zodsidian report ./vault

# Report for projects only
zodsidian report ./vault --type project
```

---

### new

**Scaffold a new document from its schema.**

```bash
zodsidian new <type> [--project <id>] [--id <id>] [--title <title>] [--field key=value] [--out <dir>]
```

**Arguments:**

- `<type>` — Document type (e.g., `project`, `decision`, `idea`)

**Options:**

- `--project <id>` — Link to a project (sets `projects: [<id>]`)
- `--id <id>` — Set the `id` field on the scaffolded document
- `--title <title>` — Set the `title` field on the scaffolded document
- `--field <key=value>` — Set any frontmatter field (repeatable)
- `--out <dir>` — Write to directory (default: stdout)

**What it does:**

1. Looks up schema for `<type>` in registry
2. Generates valid frontmatter with defaults
3. Applies any provided field overrides (`--id`, `--title`, `--field`)
4. Creates markdown file with title header
5. Writes to `<out>/<type>-new.md` or stdout

**Schema-driven:** No template files. The Zod schema defines structure and defaults.

**Exit codes:**

- `0` — Document scaffolded
- `2` — Runtime error (unknown type, invalid args)

**Examples:**

```bash
# Print to stdout
zodsidian new project

# Scaffold with known fields pre-filled
zodsidian new plan --id zodsidian-my-feature --title "My Feature Plan"

# Write to vault
zodsidian new project --out ./vault

# Link decision to project
zodsidian new decision --project proj-1 --out ./vault

# Set arbitrary fields
zodsidian new decision --field status=accepted --field title="Use TypeScript"
```

**Example output (stdout):**

```markdown
---
type: project
id: proj-1708123456
title: New Project
status: active
tags: []
created: "2024-02-16"
---

# New Project

<!-- Add your content here -->
```

---

### query

**Query the vault as a typed graph.**

```bash
zodsidian query <dir> [--type <type>] [--id <id>] [--refs]
```

**Arguments:**

- `<dir>` — Path to vault directory

**Options:**

- `--type <type>` — Filter nodes by schema type
- `--id <id>` — Look up a single node by ID
- `--refs` — Include incoming and outgoing references (requires `--id`)

**What it does:**

1. Builds vault index
2. Queries graph based on filters
3. Outputs JSON to stdout

**Output format:**

```json
// --type project
[
  { "id": "proj-1", "type": "project", "title": "My Project", "status": "active" }
]

// --id proj-1 --refs
{
  "node": { "id": "proj-1", "type": "project", "title": "My Project" },
  "outgoing": [],
  "incoming": ["dec-1", "dec-2", "idea-1"]
}
```

**Exit codes:**

- `0` — Query successful
- `2` — Runtime error (node not found, invalid args)

**Examples:**

```bash
# List all projects
zodsidian query ./vault --type project

# Look up a node
zodsidian query ./vault --id proj-1

# Get node with references
zodsidian query ./vault --id proj-1 --refs

# Use with jq
zodsidian query ./vault --type project | jq '.[].title'
```

---

## Output Formatting

### Console Formatter

**Location:** `src/output/console-formatter.ts`

Formats validation issues and summaries using chalk:

```typescript
import { printIssue, printSummary } from "./output/console-formatter.js";

printIssue("vault/project.md", {
  severity: "error",
  code: "missing-field",
  field: "title",
  message: "Required field missing",
  suggestion: 'Add a "title" field to frontmatter',
});

printSummary({
  totalFiles: 12,
  validFiles: 10,
  errorCount: 2,
  warningCount: 1,
});
```

**Chalk conventions:**

- **Red** — Errors
- **Yellow** — Warnings
- **Green** — Success
- **Cyan** — File paths
- **Gray** — Suggestions

### JSON Output

Commands that return data (`index`, `query`) output JSON to stdout:

```bash
zodsidian index ./vault > vault-index.json
zodsidian query ./vault --type project | jq '.[].title'
```

This allows AI agents and scripts to parse output programmatically.

## Exit Codes

**Location:** `src/utils/exit-codes.ts`

```typescript
export const EXIT_SUCCESS = 0; // All good
export const EXIT_VALIDATION_ERROR = 1; // Validation errors found
export const EXIT_RUNTIME_ERROR = 2; // Runtime error (file not found, etc.)
```

**Usage in scripts:**

```bash
# CI validation
zodsidian validate ./vault
if [ $? -ne 0 ]; then
  echo "Validation failed"
  exit 1
fi

# Conditional fix
zodsidian validate ./vault || zodsidian fix ./vault --write
```

## Key Files

| File                              | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| `src/cli.ts`                      | Commander CLI entry point, command registration |
| `src/commands/validate.ts`        | Validate command handler                        |
| `src/commands/fix.ts`             | Fix command handler                             |
| `src/commands/index-cmd.ts`       | Index command handler                           |
| `src/commands/report.ts`          | Report command handler                          |
| `src/commands/new.ts`             | New/scaffold command handler                    |
| `src/commands/query.ts`           | Query command handler                           |
| `src/output/console-formatter.ts` | Chalk-based formatting for terminal output      |
| `src/utils/exit-codes.ts`         | Standard exit codes                             |
| `src/utils/walk.ts`               | File system utilities (walk markdown files)     |

## Adding a Command

To add a new command (e.g., `export`):

### 1. Create command handler

Create `src/commands/export.ts`:

```typescript
import { loadSchemas, buildVaultIndex } from "@zodsidian/core";
import { EXIT_SUCCESS, EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface ExportCommandOptions {
  format?: string;
}

export async function exportCommand(
  dir: string,
  options: ExportCommandOptions,
): Promise<void> {
  try {
    loadSchemas();
    const index = buildVaultIndex(dir);

    // Export logic here
    const output = exportToFormat(index, options.format ?? "json");
    console.log(output);

    process.exit(EXIT_SUCCESS);
  } catch (err) {
    console.error(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
```

### 2. Register command in CLI

Add to `src/cli.ts`:

```typescript
import { exportCommand } from "./commands/export.js";

program
  .command("export <dir>")
  .description("Export vault to various formats")
  .option("--format <format>", "Output format (json, csv, graphml)")
  .action(exportCommand);
```

### 3. That's it

Commander handles flag parsing, help text, and error handling.

## Development

### Build

```bash
pnpm build
```

Compiles TypeScript to `dist/` and updates package bin.

### Test

```bash
pnpm test
```

Runs integration tests against the CLI.

### Run locally

```bash
pnpm dev validate ./tests/fixtures/vault
```

Or link globally:

```bash
pnpm link --global
zodsidian validate ./vault
```

### Lint

```bash
pnpm lint    # Check formatting
pnpm format  # Write fixes
```

## Design Notes

### Why Commander?

Commander provides:

- Automatic help text generation
- Flag parsing with type coercion
- Subcommand routing
- Error handling

### Why Chalk?

Chalk makes terminal output readable:

- Color-coded severity (red = error, yellow = warning)
- Syntax highlighting for file paths
- Cross-platform ANSI support

### Why no interactive prompts?

AI agents can't respond to interactive prompts. By making all commands fully parameterizable, we enable:

- AI agents calling CLI directly
- Scriptable workflows
- CI/CD integration
- Batch operations

**Example AI agent usage:**

```bash
# AI agent validates, then fixes
zodsidian validate ./vault
if [ $? -ne 0 ]; then
  zodsidian fix ./vault --write --unsafe
fi

# AI agent scaffolds new document
zodsidian new decision --project proj-1 --out ./vault
```

## Architecture Diagram

```
┌─────────────────────┐
│  @zodsidian/core    │  Logic + structured data
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  @zodsidian/cli     │
├─────────────────────┤
│  Commander          │  Flag parsing, routing
│  Chalk              │  Terminal formatting
│  Exit codes         │  Scripting support
│  JSON output        │  Machine-readable
└─────────────────────┘
           │
           ▼
      Terminal / AI
```
