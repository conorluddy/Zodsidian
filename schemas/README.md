# @zodsidian/schemas

**The single source of truth for document structure in a Zodsidian vault.**

Zod schema definitions that enforce frontmatter structure, generate TypeScript types, drive scaffolding, and power CLI help text. Every schema uses `.describe()` on every field — descriptions serve as documentation for humans, help text for CLI, and introspection for AI.

## Contents

- [Overview](#overview)
- [Schema Conventions](#schema-conventions)
- [Available Schemas](#available-schemas)
- [Adding a New Schema](#adding-a-new-schema)
- [Key Concepts](#key-concepts)

## Overview

Schemas live in this package as pure Zod definitions with no dependencies on core, CLI, or plugin code. They are imported by all consumers:

- **Core** — validates frontmatter, builds index, drives autofix
- **CLI** — generates help text, scaffolds documents, formats output
- **Obsidian Plugin** — live validation, schema-aware UI

Every schema:

- Uses `.strict()` to catch unknown keys
- Includes `.describe()` on every field for introspection
- Exports both the schema and the inferred TypeScript type
- Defines a `type` literal discriminator field

## Schema Conventions

### 1. Use `.strict()` mode

All schemas use `.strict()` to prevent unknown keys from silently entering frontmatter:

```typescript
export const projectSchema = z
  .object({
    type: z.literal("project"),
    // ... fields
  })
  .strict() // ← Catches any key not defined in the schema
  .describe("A project — the top-level organizational unit in the vault");
```

### 2. Describe everything

Every schema and every field uses `.describe()`:

```typescript
export const projectSchema = z
  .object({
    type: z.literal("project").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique project identifier (e.g. proj-1)"),
    title: z.string().min(1).describe("Human-readable project name"),
    status: z
      .enum(["active", "paused", "completed", "archived"])
      .describe("Current lifecycle state"),
    // ...
  })
  .strict()
  .describe("A project — the top-level organizational unit in the vault");
```

Descriptions power:

- CLI help text (`zodsidian new --help` shows field descriptions)
- AI introspection (agents read descriptions to understand field semantics)
- Documentation generation
- Error messages

### 3. Include base fields

All schemas spread `baseFields` from `schemas/base.ts`:

```typescript
import { baseFields } from "./base.js";

export const projectSchema = z
  .object({
    type: z.literal("project"),
    id: z.string().min(1),
    // ... schema-specific fields
    ...baseFields, // ← tags, created, updated
  })
  .strict();
```

**Base fields** (defined in `base.ts`):

- `tags` — array of strings (default: `[]`)
- `created` — ISO date string (optional)
- `updated` — ISO date string (optional)

### 4. Type literal discriminator

Every schema includes a `type` field as a Zod literal that matches the schema name:

```typescript
type: z.literal("project"); // ← Discriminator
```

This field:

- Tells the validator which schema to apply
- Powers runtime type narrowing
- Enables schema registry lookups

### 5. Export schema and type

Every schema file exports both:

```typescript
export const projectSchema = z.object({...}).strict();
export type Project = z.infer<typeof projectSchema>;
```

The inferred type is used throughout core, CLI, and plugin code for type safety.

## Available Schemas

| Type       | ID Field | Reference Fields | Purpose                                   |
| ---------- | -------- | ---------------- | ----------------------------------------- |
| `project`  | `id`     | `projects`       | Top-level organizational unit             |
| `decision` | `id`     | `projects`       | Architecture decision linked to a project |
| `idea`     | `id`     | `projects`       | Raw idea linked to a project              |
| `plan`     | `id`     | `projects`       | Implementation strategy for a task        |

**Reference fields** are array fields that hold IDs of other documents. The indexer and validator use these to build the reference graph and detect broken links.

### Project-specific fields

In addition to base fields, `project` documents support:

| Field       | Type       | Required | Description                           |
| ----------- | ---------- | -------- | ------------------------------------- |
| `platforms` | `string[]` | No       | Target platforms (e.g. ios, web, cli) |
| `ios_repo`  | `string`   | No       | Path or URL to the iOS repository     |
| `web_repo`  | `string`   | No       | Path or URL to the web repository     |

## Adding a New Schema

To add a new document type (e.g., `techdebt`):

### 1. Create the schema file

Create `schemas/techdebt.schema.ts`:

```typescript
import { z } from "zod";
import { baseFields } from "./base.js";

export const techdebtSchema = z
  .object({
    type: z.literal("techdebt").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique techdebt identifier (e.g. debt-1)"),
    title: z.string().min(1).describe("Human-readable title"),
    severity: z.enum(["low", "medium", "high", "critical"]).describe("Impact severity"),
    projects: z
      .array(z.string())
      .default([])
      .describe("Projects affected by this tech debt"),
    ...baseFields,
  })
  .strict()
  .describe("Technical debt item tracked in the vault");

export type TechDebt = z.infer<typeof techdebtSchema>;
```

**Key requirements:**

- Use `.describe()` on every field
- Include `type` literal discriminator
- Spread `...baseFields`
- Use `.strict()` on the schema
- Export both schema and inferred type

### 2. Export from `schemas/index.ts`

Add to `schemas/index.ts`:

```typescript
export * from "./techdebt.schema.js";
```

### 3. Register in core loader

Add to `packages/core/src/schema/loader.ts`:

```typescript
import {
  projectSchema,
  decisionSchema,
  ideaSchema,
  techdebtSchema,
} from "@zodsidian/schemas";

export function loadSchemas(): void {
  registerSchema("project", projectSchema, {
    idField: "id",
    referenceFields: ["projects"],
  });
  // ... existing schemas
  registerSchema("techdebt", techdebtSchema, {
    idField: "id",
    referenceFields: ["projects"],
  });
}
```

**Registration options:**

- `idField` — which field is the unique identifier (usually `"id"`)
- `referenceFields` — array field names that hold IDs of other documents

### 4. That's it

No other changes needed! The registry drives:

- Validation (`zodsidian validate`)
- Autofix (`zodsidian fix`)
- Scaffolding (`zodsidian new techdebt`)
- Indexing (`zodsidian index`)
- Query (`zodsidian query --type techdebt`)

## Key Concepts

### Base Fields

Defined in `schemas/base.ts`, spread into all schemas:

```typescript
export const baseFields = {
  tags: z.array(z.string()).default([]).describe("Tags for categorization"),
  created: z.string().date().optional().describe("Creation date (ISO 8601)"),
  updated: z.string().date().optional().describe("Last update date (ISO 8601)"),
};
```

### Reference Fields

Array fields that hold IDs of other documents. Example:

```typescript
projects: z.array(z.string()).default([]).describe("Projects this decision affects");
```

When you register a schema, specify which fields are reference fields:

```typescript
registerSchema("decision", decisionSchema, {
  idField: "id",
  referenceFields: ["projects"], // ← This field holds project IDs
});
```

The indexer uses `referenceFields` to:

- Build the reference graph (outgoing edges from this document)
- Detect broken references (IDs that don't exist in the vault)

### Schema Metadata

When you register a schema, you provide metadata:

```typescript
registerSchema("project", projectSchema, {
  idField: "id", // ← Which field is the unique identifier
  referenceFields: ["projects"], // ← Which fields hold references to other docs
});
```

This metadata is stored in the schema registry as a `SchemaEntry` and used throughout the system:

- **Validator** — Checks duplicate IDs using `idField`, validates references using `referenceFields`
- **Indexer** — Builds ID index and reference graph
- **Autofix** — Sorts frontmatter keys to match schema field order
- **Scaffold** — Generates documents with correct structure

## File Structure

```
schemas/
├── base.ts              # Shared base fields (tags, created, updated)
├── project.schema.ts    # Project schema definition
├── decision.schema.ts   # Decision schema definition
├── idea.schema.ts       # Idea schema definition
├── plan.schema.ts       # Plan schema definition
└── index.ts             # Package exports
```

## Examples

### Valid project frontmatter

```yaml
---
type: project
id: proj-1
title: My Project
status: active
tags:
  - engineering
created: "2024-01-15"
---
```

### Valid decision frontmatter

```yaml
---
type: decision
id: dec-1
title: Use PostgreSQL for data store
status: accepted
projects:
  - proj-1
tags:
  - architecture
  - database
---
```

### Schema-driven scaffolding

When you run:

```bash
zodsidian new decision --project proj-1
```

The CLI:

1. Looks up `decisionSchema` in the registry
2. Reads field definitions and descriptions
3. Populates defaults (tags: `[]`, projects: `["proj-1"]`)
4. Generates valid frontmatter
5. Writes the file

**No template files** — the schema is the template.
