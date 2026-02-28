# Zodsidian

**The structural backbone that makes an Obsidian vault trustworthy as a shared data layer between humans and AI.**

Zodsidian turns an Obsidian vault into a typed, schema-enforced knowledge graph. Every document conforms to a Zod schema, the vault is queryable as a graph, and both humans and AI agents can read and write to it with confidence.

## The problem

Obsidian is a powerful knowledge base, but frontmatter is freeform. Fields drift, types vary, required data goes missing, and nothing catches it. This is manageable when you're the only reader — but when AI agents traverse, query, and write to your vault, unstructured frontmatter becomes unreliable data.

Without enforcement:

- Frontmatter drifts silently — typos, missing fields, inconsistent formats
- Queries break because they can't trust field existence or types
- AI writes notes that don't conform to your structure
- The vault decays from a knowledge graph into a pile of files

## What Zodsidian does

### Enforce

Validate and fix frontmatter against Zod schemas. Schemas are the single source of truth — `.strict()` mode catches unknown keys, vault-level checks detect duplicate IDs and broken references. Safe autofix normalizes formatting; unsafe mode removes stale fields.

### Scaffold

Generate valid documents directly from schemas. No separate templates to maintain — if the schema knows the fields, defaults, and types, Zodsidian can stub out a conformant file.

```bash
zodsidian new project                    # stubs a project with valid frontmatter
zodsidian new decision --project proj-1  # decision linked to a project
zodsidian new idea --project proj-1      # idea linked to a project
```

The CLI derives fields, defaults, and references directly from the Zod definition. There are no template files — the schema **is** the template.

### Query

Build an in-memory graph from the vault at runtime. Typed nodes (Project, Decision) connected by references and tags. Queryable via TypeScript API or exported as JSON for jq and external tooling.

## Why a structured graph layer?

The AII and core engine exist because raw markdown parsing doesn't scale. Here's the concrete difference.

### Data quality

**Validated types, not raw strings.** The graph guarantees `status` is one of `active | paused | completed | archived`. Raw YAML gives you whatever's in the file — `"Active"`, `"ACTIVE"`, `"acitve"` are all equally valid to a parser.

**Date normalisation.** YAML 1.1 silently parses `2026-01-15` as a JS `Date` object. The pipeline normalises all dates to `YYYY-MM-DD` strings before they reach you. Raw gray-matter parsing returns `Date` objects that serialise inconsistently.

**Structured errors, not thrown exceptions.** A malformed YAML file in a raw parser aborts your loop. The pipeline returns `{ severity, code, message, path, suggestion }` per issue and continues processing the rest of the vault. One broken file shouldn't stop a 500-file scan.

### Graph and references

**Reference resolution.** `projects: [proj-1, proj-2]` is just strings in raw YAML. The graph resolves those to typed nodes — title, type, filePath — so consumers display `"My Project"` not `"proj-1"`. Dangling references surface explicitly rather than silently returning `undefined`.

**Graph traversal in one call.** `query --id proj-1` returns all incoming and outgoing edges instantly. At 1,000 files, finding everything linked to a project is one command vs. scanning every file for string matches.

**Orphan detection.** The AII surfaces edges with no resolved target. At scale, vault integrity checks — "are there any broken references?" — become a single validate call rather than a custom cross-reference script.

**Duplicate ID detection.** Two files with `id: proj-1` is a silent bug in raw parsing — you get whichever file happened to be processed last. `validateVault` surfaces `VAULT_DUPLICATE_ID` explicitly.

### Scale and consistency

**Single parse, multiple queries.** `buildVaultIndex` reads all files once into an in-memory structure. Raw parsing re-reads disk on every operation. At scale, one scan vs. N scans per workflow is a meaningful difference.

**ID-based identity, not path-based.** Raw parsing ties document identity to file path. The graph indexes by `id` — move a file from `projects/alpha.md` to `archive/2024/alpha.md` and `query --id proj-alpha` still finds it; all incoming references still resolve. Path-based identity breaks the moment you reorganise.

**Key ordering and normalisation.** Tools that write YAML back without respecting schema `keyOrder` gradually corrupt your frontmatter's canonical shape. The autofix layer enforces schema ordering on every write.

**Exclude globs, config-driven filtering.** Raw iteration: you manually skip `_templates/`, `node_modules/`, etc. everywhere. The engine reads `zodsidian.config.json` and applies `excludeGlobs` consistently across every command.

**Type mapping and aliasing.** Your vault may have `type: brief` where the schema expects `type: documentation`. The config `typeMappings` layer handles canonicalisation transparently. You'd have to bake that mapping into every script otherwise.

### AI and tooling

**Schema introspection.** `aii schema project` returns the full field list, types, required/optional, enum values, and descriptions — derived from the Zod schema at runtime. An AI agent can call this to discover what fields exist before constructing a query or generating a document. No separate documentation to maintain.

**Machine-parseable output for pipelines.** Every AII command outputs clean JSON. Pipe `aii query --type project` into `jq`, into a CI step that fails if `validFiles < totalFiles`, into a dashboard script. Raw markdown → custom parser → normalise → filter is fragile glue you'd have to write and maintain.

**The schema is the documentation.** At 50 files you remember what fields every type has. At 500 you don't — and neither does an agent reading your vault for the first time. `aii schema decision` answers that question authoritatively, derived from the same Zod definition that validates your data.

---

## How it works

### 1. Define a schema

Every document type gets a Zod schema. Here's the actual project schema:

```typescript
// schemas/project.schema.ts
import { z } from "zod";

export const projectSchema = z
  .object({
    type: z.literal("project"),
    id: z.string().min(1),
    title: z.string().min(1),
    status: z.enum(["active", "paused", "completed", "archived"]),
    tags: z.array(z.string()).default([]),
    created: z.string().date().optional(),
    updated: z.string().date().optional(),
  })
  .strict();
```

`.strict()` means any key not in the schema is an error — no silent drift.

### 2. Write a note

A valid project note looks like this:

```markdown
---
type: project
id: proj-1
title: My Project
status: active
tags:
  - engineering
---

# My Project

This is a valid project note.
```

The `type` field tells Zodsidian which schema to validate against. The markdown body is never touched or constrained.

### 3. Validate

Run validation against the vault:

```bash
zodsidian validate ./vault
```

**Valid note** — passes silently. **Invalid note** — clear, actionable output:

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

File-level checks catch schema violations. Vault-level checks catch broken references and duplicate IDs.

### 4. Autofix

Safe fixes normalize formatting without changing semantics:

**Key sorting** — reorders frontmatter keys to match schema field order:

```yaml
# Before                    # After
tags:                       type: project
  - test                    id: proj-unsorted
id: proj-unsorted           title: Unsorted Keys
type: project               status: active
title: Unsorted Keys        tags:
status: active                - test
```

**Tag normalization** — coerces scalar tags to arrays:

```yaml
# Before                    # After
tags: single-tag            tags:
                              - single-tag
```

```bash
zodsidian fix ./vault --write          # apply safe fixes
zodsidian fix ./vault --write --unsafe # also remove unknown keys
zodsidian fix ./vault --dry-run        # preview without writing
```

### 5. Type Mapping

Onboard existing vaults with custom type conventions:

**The problem:** You have an existing vault with `type: "project-index"` in 50 files, but Zodsidian expects `type: "project"`.

**The solution:** Map your custom types to canonical schema types:

```bash
# Detect unknown types in your vault
zodsidian detect ./vault
# Output: project-index (50 files), decision-log (12 files)

# Create a mapping configuration
cat > zodsidian.config.json <<EOF
{
  "version": "1.0",
  "typeMappings": {
    "project-index": "project",
    "decision-log": "decision"
  }
}
EOF

# Now validation uses the mappings
zodsidian validate ./vault
# Files with type: "project-index" validate against the project schema

# When ready, migrate to canonical types
zodsidian migrate ./vault --from project-index --to project --write
```

**In the Obsidian plugin:**

- Unknown types show in the vault report view with a badge count
- Click "Map..." to choose the canonical type
- Mappings save to `zodsidian.config.json`
- Report refreshes automatically

Type mapping enables gradual migration — validate immediately, migrate when convenient.

## CLI usage

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

### Scaffolding

```bash
zodsidian new <type> [--project <id>] [--out <dir>]  # stub a new note from its schema
```

Schema-driven: reads the Zod definition to populate fields and defaults. No template files to maintain.

### Query

```bash
zodsidian query <dir> --type <type>       # list all nodes of a type (JSON)
zodsidian query <dir> --id <id>           # look up a single node
zodsidian query <dir> --id <id> --refs    # node with incoming/outgoing refs
```

## Obsidian plugin

The plugin surfaces Zodsidian's core engine directly in Obsidian — no CLI required for day-to-day use.

**Side-panel views:**

- **Validation panel** (shield-check icon) — shows errors and warnings for the active file
- **Vault Report** (bar-chart icon) — vault-wide health summary with per-type stats

**Status bar** — live error/warning count for the active file, updated on every save.

**On-save validation** — configurable `validateOnSave` setting; debounced to avoid thrashing during edits.

**Background scan** — runs on load, populates the ribbon badge with the count of files that have unrecognised types.

**Type mapping UI** — unknown types appear in the Vault Report with a "Map..." button. Clicking opens a fuzzy-match `SuggestModal` to pick the canonical schema type. The mapping is written to `zodsidian.config.json` and the report refreshes automatically.

**First-run notice** — if unknown types are detected on load, a notice guides users to the type mapping UI.

**Commands (command palette):**

- Validate current file
- Validate vault
- Fix current file
- Open Validation panel
- Open Vault Report

## Design principles

**Frontmatter-only, deterministic, no LLM.** Zodsidian validates YAML frontmatter. The markdown body is never touched or constrained. All operations are rule-based — no AI inference, no probabilistic results.

**Schemas as single source of truth.** Zod schemas define the shape of your data. Runtime validation, TypeScript types, document scaffolding, and query types all derive from the same definitions.

**Progressive disclosure.** Minimize tokens and cognitive load. Summaries before details, indexes before full documents, schema types before field definitions. The vault structure is designed so both humans and AI can navigate from high-level to deep context with minimal waste.

**AI-native.** Designed for a world where AI agents are first-class vault participants. They read project context, write tech debt notes, query the backlog, and validate their own output — all against the same schemas humans use. The CLI is the API surface for AI — every command is fully parameterizable via flags/args with no interactive prompts.

**Zod with `.describe()`.** Every schema and every field uses Zod's `.describe()` decorator. Descriptions serve as documentation for humans, help text for CLI, and introspection for AI. The schema is the single source of truth for what a field means, not just what shape it has.

## Documentation map

- **[README.md](./README.md)** (this file) — Project overview, quick start, CLI usage
- **[CLAUDE.md](./CLAUDE.md)** — Architecture principles, project tree, maintenance guide
- **[CODESTYLE.md](./CODESTYLE.md)** — Code style conventions

**Package documentation:**

- **[schemas/README.md](./schemas/README.md)** — Schema conventions, adding new types
- **[packages/core/README.md](./packages/core/README.md)** — Core architecture, module guide
- **[packages/cli/README.md](./packages/cli/README.md)** — CLI commands, flags, examples
- **[packages/obsidian-plugin/README.md](./packages/obsidian-plugin/README.md)** — Plugin architecture, features

## Architecture

```
schemas/                → @zodsidian/schemas    (Zod definitions, no deps)
        ↓
packages/core           → @zodsidian/core       (parsing, validation, indexing)
        ↓
packages/cli            → @zodsidian/cli        (CLI commands)
packages/obsidian-plugin → @zodsidian/obsidian-plugin
```

**Pipeline:** Parse → Validate → Index → Report → Autofix → Scaffold → Query

1. **Parse** — `gray-matter` extracts YAML frontmatter
2. **Validate** — schema registry resolves `type` → Zod schema, runs `.strict()` parse
3. **Index** — builds vault-wide index (file map, ID index, reference edges, stats)
4. **Report** — formats issues with file paths, severity, suggestions
5. **Autofix** — applies fix strategies (normalize tags, sort keys, remove unknown keys)
6. **Scaffold** — generates new documents from schema definitions; no template files
7. **Query** — loads vault into a typed in-memory graph; queryable by type, ID, or refs

## Packages

| Package                      | Description                                                      |
| ---------------------------- | ---------------------------------------------------------------- |
| `@zodsidian/schemas`         | Zod schema definitions (single source of truth)                  |
| `@zodsidian/core`            | Parsing, validation, autofix, indexing, reporting                |
| `@zodsidian/cli`             | CLI: `validate`, `fix`, `index`, `report`, `new`, `query`        |
| `@zodsidian/obsidian-plugin` | Obsidian plugin: validation panel, vault report, type mapping UI |

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm format
```

## Roadmap

**Built:**

- Zod schema definitions with `.strict()` enforcement and `.describe()` on every field (project, decision, idea)
- Full validation pipeline — file-level and vault-level (duplicate IDs, broken references)
- Autofix engine — key sorting (schema-driven), tag normalization, unknown key removal (`--unsafe`)
- Schema-driven scaffolding (`zodsidian new <type>`)
- In-memory typed graph with query API (`zodsidian query`)
- Schema metadata registry — reference fields and key order derived from schema definitions
- CLI commands — `validate`, `fix`, `index`, `report`, `new`, `query`, `detect`, `migrate`
- **Type mapping system** — map custom types to canonical schemas for existing vaults
  - Config file support (`zodsidian.config.json`)
  - Unknown type detection (`zodsidian detect`)
  - Bulk type migration (`zodsidian migrate`)
  - Plugin UI with vault report view and mapping modal
- Obsidian plugin with live validation, vault report, and type mapping UI
- Reporter with formatted output and vault health summaries

**Next:**

- Additional schema types (techdebt, issue)
- Plugin enhancements — inline validation, quick fixes, better status indicators
