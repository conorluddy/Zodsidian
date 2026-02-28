# Zodsidian

**The structural backbone that makes an Obsidian vault trustworthy as a shared data layer between humans and AI.**

Zodsidian turns an Obsidian vault into a typed, schema-enforced knowledge graph. Every document conforms to a Zod schema, the vault is queryable as a graph, and both humans and AI agents can read and write to it with confidence.

## The problem

Without enforcement, frontmatter drifts silently — typos, missing fields, inconsistent formats. Queries break because they can't trust field existence or types. AI writes notes that don't conform to your structure. The vault decays from a knowledge graph into a pile of files.

## What Zodsidian does

**Enforce** — Validate and fix frontmatter against Zod schemas. `.strict()` mode catches unknown keys. Vault-level checks detect duplicate IDs and broken references. Safe autofix normalizes formatting; unsafe mode removes stale fields.

**Scaffold** — Generate valid documents directly from schemas. No separate templates to maintain — if the schema knows the fields, defaults, and types, Zodsidian can stub out a conformant file.

**Query** — Build an in-memory graph from the vault at runtime. Typed nodes connected by references and tags. Queryable via CLI or exported as JSON for jq and external tooling.

## Architecture

```
schemas/                → @zodsidian/schemas    (Zod definitions, no deps)
        ↓
packages/core           → @zodsidian/core       (parsing, validation, indexing)
        ↓
packages/cli            → @zodsidian/cli        (human-facing CLI: zodsidian)
packages/aii            → @zodsidian/aii        (AI-facing CLI: aii)
packages/obsidian-plugin → @zodsidian/obsidian-plugin
```

**Pipeline:** Parse → Validate → Index → Report → Autofix → Scaffold → Query | Search → Summary

## Packages

| Package                      | Description                                                              |
| ---------------------------- | ------------------------------------------------------------------------ |
| `@zodsidian/schemas`         | Zod schema definitions (single source of truth)                          |
| `@zodsidian/core`            | Parsing, validation, autofix, indexing, reporting                        |
| `@zodsidian/cli`             | Human-facing CLI: `validate`, `fix`, `index`, `report`, `new`, `query`   |
| `@zodsidian/aii`             | AI-facing CLI: `search`, `summary`, `query`, `schema`, `validate`, `fix` |
| `@zodsidian/obsidian-plugin` | Obsidian plugin: validation panel, vault report, type mapping UI         |

## Schema types

| Type            | Description                          |
| --------------- | ------------------------------------ |
| `project`       | Active project with status and tags  |
| `decision`      | Architecture Decision Record (ADR)   |
| `idea`          | Raw-to-specced idea lifecycle        |
| `plan`          | Claude Code plan mode output         |
| `documentation` | Reference doc linked to a project    |
| `session`       | AI session log with context          |
| `backlog`       | Backlog item linked to a project     |
| `hub`           | Navigation hub linking related notes |

## CLI usage

### `zodsidian` — human-facing

```bash
# Validation & fixing
zodsidian validate <dir> [--type <t>] [--config <path>]
zodsidian fix <dir> [--write] [--unsafe] [--populate] [--type <t>] [--dry-run] [--config <path>]

# Indexing & reporting
zodsidian index <dir> [--out <file>] [--type <t>] [--config <path>]
zodsidian report <dir> [--type <t>] [--config <path>]

# Scaffolding & querying
zodsidian new <type> [--project <id>] [--out <dir>]
zodsidian query <dir> [--type <type>] [--id <id>] [--refs]

# Type mapping
zodsidian detect <dir> [--config <path>] [--json]
zodsidian migrate <dir> --from <old> --to <new> [--write]
```

### `aii` — AI-facing

Optimized for agent use: clean JSON output, no interactive prompts.

```bash
aii search <dir> --query <text> [--type <t>] [--limit <n>]    # full-text search, JSON results
aii summary <dir> [--type <t>]                                 # vault health summary as JSON
aii query <dir> [--type <t>] [--id <id>] [--refs]             # graph query, JSON output
aii schema <type>                                              # field definitions for a type
aii validate <dir> [--type <t>]                               # validate, JSON error list
aii fix <dir> [--write] [--unsafe] [--dry-run]                # autofix, JSON change report
```

## Obsidian plugin

The plugin surfaces Zodsidian's core engine directly in Obsidian — no CLI required for day-to-day use.

- **Validation panel** — errors and warnings for the active file
- **Vault Report** — vault-wide health summary with per-type stats
- **Status bar** — live error/warning count, updated on every save
- **Type mapping UI** — unknown types appear with a "Map..." button; writes to `zodsidian.config.json`
- **Commands** — Validate current file, Validate vault, Fix current file, Open panels

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm format
```
