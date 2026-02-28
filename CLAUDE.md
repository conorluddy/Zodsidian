# Zodsidian

## Architecture

**Core is the only brain.** `@zodsidian/core` is surface-agnostic — returns structured data (typed objects, arrays, maps), never formatted strings. CLI wraps with Commander + chalk. Plugin wraps with Obsidian UI. Same contracts everywhere.

**CLI is the API for AI.** No MCP tools. AI agents call CLI commands directly. Every command is fully parameterizable via flags/args — zero interactive prompts. Output is JSON where possible.

**Zod everywhere, with `.describe()`.** Every schema and every field uses `.describe()`. Descriptions serve as documentation, CLI help text, and AI introspection. The schema is the single source of truth.

**Schema registry is the shared discovery mechanism.** All consumers use it to learn what types exist, what fields they have, what references they carry.

## Why the graph layer beats raw parsing

These are the concrete reasons we build this instead of parsing markdown directly:

- **Validated types** — `status` is guaranteed `active | paused | completed | archived`. Raw YAML returns whatever's in the file.
- **Date normalisation** — YAML 1.1 parses `2026-01-15` as a `Date` object. The pipeline normalises to `YYYY-MM-DD` strings before anything touches the data.
- **Structured errors** — malformed files return `{ severity, code, message, path }` and processing continues. Raw parsers throw and abort.
- **Reference resolution** — `projects: [proj-1]` resolves to a typed node with title, type, filePath. Raw YAML is just a string.
- **Graph traversal** — incoming + outgoing edges in one call. At 1k files, "everything linked to proj-1" is one query not a grep.
- **Orphan detection** — dangling references (edge exists, no target node) surface explicitly instead of silently returning `undefined`.
- **Duplicate ID detection** — `VAULT_DUPLICATE_ID` surfaces before it silently corrupts queries.
- **Single parse** — `buildVaultIndex` reads all files once. Raw parsing re-reads disk per operation.
- **ID-based identity** — move a file anywhere and `query --id proj-1` still resolves. Path-based identity breaks on reorganisation.
- **Type mapping** — `brief → documentation` handled in config. No per-script aliasing.
- **Schema introspection** — `aii schema <type>` returns fields, types, required/optional, enum values at runtime. AI agents discover structure without reading source.
- **Machine-parseable pipelines** — every AII command outputs JSON. Pipe into `jq`, CI checks, dashboards. No custom glue scripts.
- **Key order enforcement** — autofix keeps frontmatter in schema-canonical order on every write. Raw writers gradually corrupt shape.
- **Exclude globs** — `zodsidian.config.json` applies consistently everywhere. No per-script filtering logic.

## Key paths

```
schemas/*.schema.ts          — Zod schema definitions (SSOT)
packages/core/src/schema/    — registry + loader
packages/core/src/types/     — shared TypeScript types
packages/core/src/autofix/   — fix engine + strategies
packages/core/src/indexer/   — vault index builder
packages/core/src/validator/ — frontmatter + vault validation
packages/core/src/scaffold/  — schema-driven document generation
packages/core/src/query/     — in-memory typed graph
packages/cli/src/commands/   — CLI command handlers
packages/obsidian-plugin/    — Obsidian plugin (skeleton)
tests/fixtures/vault/        — test markdown files
```

## Pipeline

Parse → Validate → Index → Report → Autofix

## Build & test

```bash
pnpm install
pnpm build        # builds all packages
pnpm test         # runs vitest across workspace
pnpm lint         # prettier check
pnpm format       # prettier write
```

## Branch workflow

Never push to main directly. Work in feature branches, open PRs.

## Adding a new schema type

1. Create `schemas/<type>.schema.ts` — define Zod schema with `.describe()` on every field, export schema + inferred type
2. Export from `schemas/index.ts`
3. Register in `packages/core/src/schema/loader.ts` with `referenceFields` and `keyOrder`
4. No core module changes should be needed — the registry drives indexing, autofix, and validation dynamically

## Project tree

```
Zodsidian/
├── schemas/                            # @zodsidian/schemas — Zod schema definitions
│   ├── base.ts                         # Shared base fields (tags, created, updated)
│   ├── project.schema.ts               # Project schema definition
│   ├── decision.schema.ts              # Decision schema definition
│   ├── idea.schema.ts                  # Idea schema definition
│   ├── plan.schema.ts                  # Plan schema definition
│   ├── documentation.schema.ts         # Documentation schema definition
│   ├── index.ts                        # Package exports
│   └── README.md                       # Schema conventions, adding types
│
├── packages/
│   ├── core/                           # @zodsidian/core — Surface-agnostic logic
│   │   ├── src/
│   │   │   ├── schema/                 # Schema registry + loader
│   │   │   │   ├── registry.ts         # Map: type → SchemaEntry
│   │   │   │   ├── loader.ts           # Registers built-in schemas
│   │   │   │   └── index.ts
│   │   │   ├── parser/                 # Frontmatter extraction (gray-matter)
│   │   │   │   ├── parse-frontmatter.ts
│   │   │   │   └── index.ts
│   │   │   ├── validator/              # File + vault validation
│   │   │   │   ├── validate-frontmatter.ts
│   │   │   │   ├── validate-vault.ts
│   │   │   │   └── index.ts
│   │   │   ├── autofix/                # Fix engine + strategies
│   │   │   │   ├── fix-engine.ts       # Orchestrates fix strategies
│   │   │   │   ├── strategies.ts       # Tag normalization, key sorting
│   │   │   │   ├── key-order.ts        # Schema-driven key sorting
│   │   │   │   ├── yaml-util.ts        # YAML stringify with date quoting (!)
│   │   │   │   └── index.ts
│   │   │   ├── indexer/                # Vault index builder
│   │   │   │   └── index.ts
│   │   │   ├── scaffold/               # Schema-driven document generation
│   │   │   │   ├── scaffold.ts
│   │   │   │   └── index.ts
│   │   │   ├── query/                  # Typed graph queries
│   │   │   │   ├── graph.ts            # VaultGraph class
│   │   │   │   └── index.ts
│   │   │   ├── reporter/               # Structured reporting
│   │   │   │   ├── format.ts
│   │   │   │   └── index.ts
│   │   │   ├── types/                  # Shared TypeScript types
│   │   │   │   ├── schema.types.ts
│   │   │   │   ├── validation.types.ts
│   │   │   │   ├── vault.types.ts
│   │   │   │   ├── frontmatter.types.ts
│   │   │   │   ├── result.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── __tests__/              # Vitest test suites
│   │   │   └── index.ts                # Package exports
│   │   ├── package.json
│   │   └── README.md                   # Core architecture, module guide
│   │
│   ├── cli/                            # @zodsidian/cli — Commander + chalk wrapper
│   │   ├── src/
│   │   │   ├── commands/               # Command handlers
│   │   │   │   ├── validate.ts
│   │   │   │   ├── fix.ts
│   │   │   │   ├── index-cmd.ts
│   │   │   │   ├── report.ts
│   │   │   │   ├── new.ts
│   │   │   │   └── query.ts
│   │   │   ├── output/                 # Formatting utilities
│   │   │   │   └── console-formatter.ts  # Chalk-based output
│   │   │   ├── utils/                  # CLI utilities
│   │   │   │   ├── exit-codes.ts       # Standard exit codes
│   │   │   │   └── walk.ts             # File system walking
│   │   │   └── cli.ts                  # Commander entry point
│   │   ├── package.json
│   │   └── README.md                   # CLI commands, flags, examples
│   │
│   └── obsidian-plugin/                # @zodsidian/obsidian-plugin — Obsidian UI
│       ├── src/
│       │   ├── services/               # Background services
│       │   │   └── ingest-service.ts   # Converts plain notes to typed graph documents
│       │   ├── ui/                     # Obsidian UI components
│       │   ├── settings/               # Settings tab
│       │   ├── commands/               # Command palette commands
│       │   └── main.ts                 # Plugin entry point
│       ├── package.json
│       └── README.md                   # Plugin architecture, features
│
├── tests/
│   └── fixtures/
│       └── vault/                      # Test markdown files for integration tests
│
├── README.md                           # Project overview, quick start
├── CLAUDE.md                           # Architecture principles (this file)
├── CODESTYLE.md                        # Code style guide
├── package.json                        # Workspace root
├── pnpm-workspace.yaml                 # pnpm workspace config
└── tsconfig.json                       # TypeScript config
```

## Documentation maintenance

To keep documentation aligned with code:

### When to update package READMEs

**Schemas (`schemas/README.md`):**

- ✏️ When adding a new schema type — update "Available Schemas" table
- ✏️ When changing base fields — update "Base Fields" section

**Core (`packages/core/README.md`):**

- ✏️ When adding a new module — add to "Module Guide"
- ✏️ When changing pipeline stages — update "Pipeline" section
- ✏️ When discovering new gotchas — add to module "Gotchas" or "Key Gotchas"

**CLI (`packages/cli/README.md`):**

- ✏️ When adding a command — add full section to "Commands"
- ✏️ When changing flags — update command options
- ✏️ When changing exit codes — update "Exit Codes" section

**Plugin (`packages/obsidian-plugin/README.md`):**

- ✏️ When adding features — move from "Planned" to "Built"
- ✏️ When adding commands — update commands table
- ✏️ When adding UI components — add to "Module Guide"

### When to update project tree

**This file (`CLAUDE.md`):**

- ✏️ When adding a new package — add to tree
- ✏️ When adding a core module (new directory in `packages/core/src/`) — add to tree
- ✏️ When adding a critical file (new schema, new command) — add to tree with annotation

**What NOT to add to tree:**

- Individual test files (just show `__tests__/` directory)
- Generated files (`dist/`, `node_modules/`)
- Implementation details (helpers, utilities unless critical)

### Verification checklist

Before committing documentation changes:

- [ ] All package READMEs have a table of contents
- [ ] All TOC links resolve to headers (test by clicking)
- [ ] Project tree in CLAUDE.md matches actual directory structure
- [ ] File path references are accurate (test with `ls` or `find`)
- [ ] Cross-references between docs resolve (README → package READMEs)

### Future automation

Consider automating documentation maintenance with:

- `markdown-toc` — Auto-generate TOCs from headers
- `tree` command — Generate directory tree structure
- Pre-commit hooks — Verify no broken links, TOCs present
- CI check — Fail build if docs are stale (compare file lists vs. tree)
