# Zodsidian

## Architecture

**Core is the only brain.** `@zodsidian/core` is surface-agnostic — returns structured data (typed objects, arrays, maps), never formatted strings. CLI wraps with Commander + chalk. Plugin wraps with Obsidian UI. Same contracts everywhere.

**CLI is the API for AI.** No MCP tools. AI agents call CLI commands directly. Every command is fully parameterizable via flags/args — zero interactive prompts. Output is JSON where possible.

**Zod everywhere, with `.describe()`.** Every schema and every field uses `.describe()`. Descriptions serve as documentation, CLI help text, and AI introspection. The schema is the single source of truth.

**Schema registry is the shared discovery mechanism.** All consumers use it to learn what types exist, what fields they have, what references they carry.

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
