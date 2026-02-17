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
zodsidian validate <dir> [--config <path>]       # validate all markdown files
zodsidian fix <dir> [--write] [--unsafe] [--config <path>]  # auto-fix frontmatter issues
zodsidian fix <dir> --dry-run                    # preview fixes without writing
zodsidian index <dir> [--out <file>] [--config <path>]  # build vault index (JSON)
zodsidian report <dir> [--config <path>]         # print vault health summary
zodsidian new <type> [--project <id>] [--out <dir>]  # scaffold a new document
zodsidian query <dir> [--type <type>] [--id <id>] [--refs]  # query vault graph
zodsidian detect <dir> [--config <path>] [--json]  # detect unknown types
zodsidian migrate <dir> --from <old> --to <new> [--write]  # migrate types
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

**Pipeline:** Parse → Validate → Index → Report → Autofix

1. **Parse** — `gray-matter` extracts YAML frontmatter
2. **Validate** — schema registry resolves `type` → Zod schema, runs `.strict()` parse
3. **Index** — builds vault-wide index (file map, ID index, reference edges, stats)
4. **Report** — formats issues with file paths, severity, suggestions
5. **Autofix** — applies fix strategies (normalize tags, sort keys, remove unknown keys)

## Packages

| Package                      | Description                                               |
| ---------------------------- | --------------------------------------------------------- |
| `@zodsidian/schemas`         | Zod schema definitions (single source of truth)           |
| `@zodsidian/core`            | Parsing, validation, autofix, indexing, reporting         |
| `@zodsidian/cli`             | CLI: `validate`, `fix`, `index`, `report`, `new`, `query` |
| `@zodsidian/obsidian-plugin` | Obsidian plugin with live validation and autofix          |

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
