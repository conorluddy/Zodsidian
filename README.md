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

### Query

Build an in-memory graph from the vault at runtime. Typed nodes (Project, Idea, TechDebt, Issue) connected by references and tags. Queryable via TypeScript API or exported as JSON for jq and external tooling.

## Design principles

**Frontmatter-only, deterministic, no LLM.** Zodsidian validates YAML frontmatter. The markdown body is never touched or constrained. All operations are rule-based — no AI inference, no probabilistic results.

**Schemas as single source of truth.** Zod schemas define the shape of your data. Runtime validation, TypeScript types, document scaffolding, and query types all derive from the same definitions.

**Progressive disclosure.** Minimize tokens and cognitive load. Summaries before details, indexes before full documents, schema types before field definitions. The vault structure is designed so both humans and AI can navigate from high-level to deep context with minimal waste.

**AI-native.** Designed for a world where AI agents are first-class vault participants. They read project context, write tech debt notes, query the backlog, and validate their own output — all against the same schemas humans use.

## Packages

| Package | Description |
|---------|-------------|
| `@zodsidian/schemas` | Zod schema definitions (single source of truth) |
| `@zodsidian/core` | Parsing, validation, autofix, indexing, reporting |
| `@zodsidian/cli` | CLI: `validate`, `fix`, `index`, `report` |
| `@zodsidian/obsidian-plugin` | Obsidian plugin with live validation and autofix |

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm format
```

## Status

Early development. Core validation pipeline works, CLI and plugin skeleton are functional. Scaffold and query layers are planned.
