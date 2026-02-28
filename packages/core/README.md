# @zodsidian/core

**The brain of Zodsidian — surface-agnostic parsing, validation, indexing, and autofix.**

Core is designed to return structured data (typed objects, arrays, maps) — never formatted strings. CLI wraps it with Commander + chalk. Obsidian plugin wraps it with UI components. Same contracts everywhere.

## Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Pipeline](#pipeline)
- [Module Guide](#module-guide)
  - [Config](#config)
  - [Schema](#schema)
  - [Parser](#parser)
  - [Validator](#validator)
  - [Autofix](#autofix)
  - [Indexer](#indexer)
  - [Scaffold](#scaffold)
  - [Query](#query)
  - [Reporter](#reporter)
- [Key Files](#key-files)
- [Development](#development)

## Overview

`@zodsidian/core` is the central engine for Zodsidian. It:

- **Parses** markdown files to extract YAML frontmatter
- **Validates** frontmatter against Zod schemas (file-level + vault-level checks)
- **Indexes** the vault into an in-memory data structure (ID map, reference graph, stats)
- **Reports** validation issues with file paths, severity, and actionable suggestions
- **Autofixes** common issues (key sorting, tag normalization, unknown key removal)
- **Scaffolds** new documents directly from schema definitions
- **Queries** the vault as a typed graph (nodes, edges, references)

**Surface-agnostic design:** Core returns structured data. It never uses chalk, console.log, or Obsidian UI. Formatting is the surface's job.

## Architecture

### Registry-Driven Design

The **schema registry** (`schema/registry.ts`) is the shared discovery mechanism. All modules query it to learn:

- What document types exist (`project`, `decision`, `idea`)
- Which schema validates each type
- Which field is the ID field (`id`)
- Which fields hold references to other documents (`projects`)
- What order frontmatter keys should appear in (schema field order)

**No hardcoded type checks.** When you add a new schema, you register it once. The rest of the system adapts automatically.

### Structured Data Only

Core functions return typed data structures:

```typescript
// ✅ Core returns structured data
validate(filePath: string): ValidationResult
index(vaultPath: string): VaultIndex
fix(filePath: string, options: FixOptions): FixResult

// ❌ Core never returns formatted strings
validate(filePath: string): string // NO
```

Consumers (CLI, plugin) format the data for their surface.

### Separation of Concerns

```
schemas/          → Zod definitions (no logic)
        ↓
packages/core     → Logic (no formatting)
        ↓
CLI / Plugin      → Formatting + UI
```

## Pipeline

The core pipeline has 5 stages:

```
Parse → Validate → Index → Report → Autofix
```

### 1. Parse

**Module:** `parser/`

Extract YAML frontmatter from markdown files using `gray-matter`.

```typescript
import { parseFrontmatter } from "@zodsidian/core";

const result = parseFrontmatter(fileContent);
// → { frontmatter: {...}, body: string }
```

### 2. Validate

**Module:** `validator/`

Validate frontmatter against schemas. Two levels:

**File-level validation:**

- Schema conformance (`.strict()` catches unknown keys)
- Required fields present
- Field types correct (string, enum, array, etc.)

**Vault-level validation:**

- Duplicate ID detection
- Broken reference detection (ID doesn't exist)

```typescript
import { validateFrontmatter, validateVault } from "@zodsidian/core";

// Single file
const result = validateFrontmatter(frontmatter);

// Entire vault
const index = buildIndex(vaultPath);
const vaultResult = validateVault(index);
```

### 3. Index

**Module:** `indexer/`

Build an in-memory vault index:

```typescript
interface VaultIndex {
  files: Map<string, MarkdownFile>; // file path → parsed file
  idMap: Map<string, string>; // document ID → file path
  typeIndex: Map<string, Set<string>>; // type → set of IDs
  stats: { total: number; valid: number; errors: number; warnings: number };
}
```

The index powers:

- Duplicate ID detection
- Reference graph construction
- Query operations
- Vault health reporting

### 4. Report

**Module:** `reporter/`

Format validation issues with severity, file paths, and actionable suggestions:

```typescript
import { formatValidationReport } from "@zodsidian/core";

const report = formatValidationReport(validationResults);
// → Structured array of issues with severity, file, message, suggestion
```

Consumers format this further (CLI uses chalk, plugin uses Obsidian notices).

### 5. Autofix

**Module:** `autofix/`

Apply fix strategies to normalize frontmatter:

**Safe fixes (default):**

- Sort keys to match schema field order
- Normalize scalar tags to arrays (`tags: foo` → `tags: ["foo"]`)

**Unsafe fixes (`--unsafe` flag):**

- Remove unknown keys that violate `.strict()`

```typescript
import { applyFixes } from "@zodsidian/core";

const result = applyFixes(filePath, { unsafe: false, write: true });
// → { fixed: true, changes: ["Sorted keys", "Normalized tags"] }
```

## Module Guide

### Config

**Location:** `src/config/`

**Purpose:** Load, parse, and validate `zodsidian.config.json`. Provides type mappings, `excludeGlobs`, and validation settings.

**Key Files:**

- `config.types.ts` — Zod schema + `ZodsidianConfig` type + `defaultConfig`
- `load-config.ts` — Async/sync config file loading with auto-discovery
- `resolve-type.ts` — Resolves user-defined types to canonical schema types
- `exclude-globs.ts` — `shouldExcludeFile(relativePath, excludeGlobs)` helper

**`shouldExcludeFile` API:**

```typescript
import { shouldExcludeFile } from "@zodsidian/core";

// Returns true if the path matches any of the glob patterns
shouldExcludeFile("_templates/note.md", ["_templates/**"]); // → true
shouldExcludeFile("projects/my-project.md", ["_templates/**"]); // → false
shouldExcludeFile("anything.md", []); // → false (empty globs = exclude nothing)
```

**Gotchas:**

- Directory-level patterns (e.g. `_templates/**`) also match the bare directory path (`_templates`) because `**` matches zero or more path segments. This has no practical effect since the walker only passes `.md` file paths, not directory names.
- Config is auto-discovered: `.zodsidian.json` first, then `zodsidian.config.json`.

---

### Schema

**Location:** `src/schema/`

**Purpose:** Schema registry and loader.

**Key Files:**

- `registry.ts` — Schema registry (Map of type → SchemaEntry)
- `loader.ts` — Registers built-in schemas with metadata

**What it does:**

The registry is a global Map that stores schema metadata:

```typescript
interface SchemaEntry {
  type: string; // "project", "decision", etc.
  schema: SchemaDefinition; // The Zod schema
  idField?: string; // "id"
  referenceFields?: string[]; // ["projects"]
  keyOrder?: string[]; // Field order for autofix
}
```

**API:**

```typescript
import { registerSchema, getSchema, getSchemaEntry } from "@zodsidian/core";

// Register a schema
registerSchema("project", projectSchema, {
  idField: "id",
  referenceFields: ["projects"],
});

// Look up a schema
const schema = getSchema("project");

// Get full metadata
const entry = getSchemaEntry("project");
```

**Gotchas:**

- Call `loadSchemas()` once before using any core functionality
- Registry is mutable — tests should call `clearRegistry()` in teardown

---

### Parser

**Location:** `src/parser/`

**Purpose:** Extract and parse YAML frontmatter from markdown files.

**Key Files:**

- `parse-frontmatter.ts` — Uses `gray-matter` to extract frontmatter

**What it does:**

Parses a markdown file into structured parts:

```typescript
interface ParseResult {
  frontmatter: Record<string, unknown>;
  body: string;
}
```

**API:**

```typescript
import { parseFrontmatter } from "@zodsidian/core";

const content = readFileSync("vault/project.md", "utf-8");
const result = parseFrontmatter(content);

console.log(result.frontmatter.type); // "project"
console.log(result.body); // Markdown content
```

**Gotchas:**

- `gray-matter` uses YAML 1.1, which parses unquoted `YYYY-MM-DD` as JavaScript Date objects
- Autofix uses `stringifyFrontmatter()` to force-quote date strings (see `autofix/yaml-util.ts`)

---

### Validator

**Location:** `src/validator/`

**Purpose:** Validate frontmatter against schemas (file-level + vault-level).

**Key Files:**

- `validate-frontmatter.ts` — File-level validation
- `validate-vault.ts` — Vault-level validation (duplicate IDs, broken refs)

**What it does:**

**File-level validation:**

```typescript
import { validateFrontmatter } from "@zodsidian/core";

const result = validateFrontmatter(frontmatter);

if (!result.valid) {
  console.log(result.issues);
  // [{ severity: "error", code: "missing-field", field: "title", message: "..." }]
}
```

**Vault-level validation:**

```typescript
import { validateVault } from "@zodsidian/core";

const index = buildIndex("./vault");
const result = validateVault(index);

result.issues.forEach((issue) => {
  console.log(issue.file, issue.message);
  // "dec-1.md Reference target not found: proj-99"
});
```

**Validation checks:**

- **File-level:** Required fields, field types, unknown keys (`.strict()`)
- **Vault-level:** Duplicate IDs, broken references

**Gotchas:**

- Vault-level validation requires building an index first
- Reference validation only checks fields listed in `referenceFields` metadata

---

### Autofix

**Location:** `src/autofix/`

**Purpose:** Apply fix strategies to normalize frontmatter.

**Key Files:**

- `fix-engine.ts` — Orchestrates fix strategies
- `strategies.ts` — Individual fix strategies (tag normalization, key sorting)
- `key-order.ts` — Schema-driven key sorting
- `yaml-util.ts` — YAML stringify with date quoting

**What it does:**

Applies fixes to frontmatter based on validation issues:

**Safe fixes:**

- Sort keys to match schema field order
- Normalize scalar tags to arrays

**Unsafe fixes:**

- Remove unknown keys

**API:**

```typescript
import { applyFixes } from "@zodsidian/core";

const result = applyFixes("./vault/project.md", {
  unsafe: false,
  write: true,
});

if (result.fixed) {
  console.log(result.changes);
  // ["Sorted keys", "Normalized tags"]
}
```

**Strategies:**

Each strategy implements:

```typescript
interface FixStrategy {
  applies: (issue: ValidationIssue) => boolean;
  fix: (frontmatter: Frontmatter, issue: ValidationIssue) => Frontmatter;
}
```

**Gotchas:**

- **YAML date quoting:** Use `stringifyFrontmatter()` from `yaml-util.ts` to force-quote date-like strings (prevents `gray-matter` from parsing them as Date objects)
- Key order is derived from schema field order (stored in registry metadata)
- Unsafe fixes are destructive — always warn the user

---

### Indexer

**Location:** `src/indexer/`

**Purpose:** Build an in-memory vault index (file map, ID index, reference graph, stats).

**Key Files:**

- `indexer/` — Vault index builder

**What it does:**

Scans a vault directory and builds a comprehensive index:

```typescript
interface VaultIndex {
  files: Map<string, MarkdownFile>; // file path → parsed file
  idMap: Map<string, string>; // document ID → file path
  typeIndex: Map<string, Set<string>>; // type → set of IDs
  referenceGraph: Map<string, string[]>; // document ID → referenced IDs
  stats: { total: number; valid: number; errors: number; warnings: number };
}
```

**API:**

```typescript
import { buildIndex } from "@zodsidian/core";

const index = buildIndex("./vault");

// Look up by ID
const filePath = index.idMap.get("proj-1");

// Get all projects
const projectIds = index.typeIndex.get("project");

// Get references
const refs = index.referenceGraph.get("dec-1");
// → ["proj-1", "proj-2"]
```

**What it tracks:**

- **files** — All markdown files with parsed frontmatter
- **idMap** — Fast ID → file path lookups
- **typeIndex** — Fast type → IDs queries
- **referenceGraph** — Outgoing references from each document
- **stats** — Vault health summary

**Gotchas:**

- Index is built in-memory — not persisted to disk (unless you export it)
- Large vaults (1000s of files) may take a few seconds to index

---

### Scaffold

**Location:** `src/scaffold/`

**Purpose:** Generate new documents directly from schema definitions.

**Key Files:**

- `scaffold.ts` — Schema-driven document generation

**What it does:**

Creates valid frontmatter + markdown from a schema:

```typescript
import { scaffoldDocument } from "@zodsidian/core";

const content = scaffoldDocument("decision", {
  id: "dec-1",
  title: "Use PostgreSQL",
  projects: ["proj-1"],
});

writeFileSync("./vault/dec-1.md", content);
```

**How it works:**

1. Look up schema in registry
2. Extract field definitions and defaults
3. Populate fields (provided values + defaults)
4. Generate YAML frontmatter
5. Add markdown body stub

**No template files** — the schema is the template.

**Gotchas:**

- Required fields without defaults must be provided
- Uses `stringifyFrontmatter()` to avoid YAML date parsing issues

---

### Query

**Location:** `src/query/`

**Purpose:** Query the vault as a typed graph.

**Key Files:**

- `graph.ts` — VaultGraph class with typed query methods

**What it does:**

Wraps the vault index with query methods:

```typescript
import { VaultGraph } from "@zodsidian/core";

const graph = new VaultGraph(index);

// Get all projects
const projects = graph.getNodesByType("project");

// Get a single node
const node = graph.getNode("proj-1");

// Get references
const outgoing = graph.getOutgoingRefs("dec-1"); // → ["proj-1"]
const incoming = graph.getIncomingRefs("proj-1"); // → ["dec-1", "dec-2"]
```

**API:**

```typescript
class VaultGraph {
  getNode(id: string): GraphNode | undefined;
  getNodesByType(type: string): GraphNode[];
  getOutgoingRefs(id: string): string[];
  getIncomingRefs(id: string): string[];
  getStats(): VaultStats;
}
```

**Gotchas:**

- Incoming references are computed on-demand (not stored in index)
- Graph is read-only — doesn't support mutations

---

### Reporter

**Location:** `src/reporter/`

**Purpose:** Format validation results and vault health summaries.

**Key Files:**

- `format.ts` — Structured reporting

**What it does:**

Formats validation results into structured reports:

```typescript
import { formatValidationReport } from "@zodsidian/core";

const report = formatValidationReport(validationResults);

report.forEach((item) => {
  console.log(item.severity, item.file, item.message, item.suggestion);
});
```

**Report format:**

```typescript
interface ReportItem {
  severity: "error" | "warning";
  file: string;
  field?: string;
  code: string;
  message: string;
  suggestion?: string;
}
```

**Gotchas:**

- Returns structured data — CLI/plugin format with chalk/Obsidian UI
- Suggestions are optional (not all issues have actionable fixes)

---

## Key Files

| File                              | Purpose                                             |
| --------------------------------- | --------------------------------------------------- |
| `src/schema/registry.ts`          | Schema registry (Map of type → SchemaEntry)         |
| `src/schema/loader.ts`            | Registers built-in schemas with metadata            |
| `src/autofix/fix-engine.ts`       | Orchestrates fix strategies                         |
| `src/autofix/yaml-util.ts`        | YAML stringify with date quoting (critical!)        |
| `src/scaffold/scaffold.ts`        | Schema-driven document generation                   |
| `src/query/graph.ts`              | VaultGraph — typed in-memory graph                  |
| `src/indexer/`                    | Vault index builder                                 |
| `src/validator/validate-vault.ts` | Vault-level validation (duplicate IDs, broken refs) |

## Development

### Build

```bash
pnpm build
```

Compiles TypeScript to `dist/`.

### Test

```bash
pnpm test
```

Runs Vitest across all test files in `src/__tests__/`.

**Test fixtures:** `tests/fixtures/vault/` contains sample markdown files for integration tests.

### Lint

```bash
pnpm lint    # Check formatting
pnpm format  # Write fixes
```

## Key Gotchas

### YAML Date Quoting

`gray-matter` uses YAML 1.1, which parses unquoted `YYYY-MM-DD` as JavaScript Date objects:

```yaml
created: 2024-01-15   # Parsed as Date object
created: "2024-01-15" # Parsed as string
```

**Solution:** Always use `stringifyFrontmatter()` from `autofix/yaml-util.ts` when writing frontmatter. It force-quotes date-like strings.

### Schema Registry Initialization

Core modules assume schemas are registered. CLI and plugin must call `loadSchemas()` once at startup:

```typescript
import { loadSchemas } from "@zodsidian/core";

loadSchemas(); // ← Required before using any core functionality
```

### Adding a New Schema

When you add a new schema:

1. Define in `schemas/<type>.schema.ts`
2. Register in `packages/core/src/schema/loader.ts`
3. **No core module changes needed** — registry drives indexing, validation, autofix

## Architecture Diagram

```
┌─────────────────┐
│  schemas/       │  Zod definitions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  core/schema/   │  Registry + Loader
└────────┬────────┘
         │
         ├──────────────┬──────────────┬──────────────┐
         ▼              ▼              ▼              ▼
    ┌────────┐     ┌──────────┐   ┌─────────┐   ┌─────────┐
    │ Parser │     │Validator │   │ Indexer │   │ Autofix │
    └────────┘     └──────────┘   └─────────┘   └─────────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                        │
                        ▼
               ┌─────────────────┐
               │  CLI / Plugin   │  Formatting + UI
               └─────────────────┘
```
