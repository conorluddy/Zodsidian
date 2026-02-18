# @zodsidian/obsidian-plugin

**Obsidian plugin for real-time frontmatter validation and schema enforcement.**

Wraps `@zodsidian/core` with Obsidian UI — status bar indicators, validation views, settings, and autofix buttons. Same validation logic as CLI, different surface.

## Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
  - [Built](#built)
  - [Planned](#planned)
- [Module Guide](#module-guide)
  - [Services](#services)
  - [UI](#ui)
  - [Settings](#settings)
  - [Commands](#commands)
- [Development](#development)
- [Design Notes](#design-notes)

## Overview

The Obsidian plugin provides:

- **Real-time validation** — Validates frontmatter on file save/modify
- **Status bar indicator** — Shows vault health (errors, warnings)
- **Settings UI** — Configure validation behavior, autofix options
- **Command palette** — Run validation, autofix, scaffold from within Obsidian
- **Validation view** — Lists all validation issues with clickable file links

**Core wrapping principle:** Plugin calls `@zodsidian/core` functions and formats results with Obsidian UI components (Notice, Modal, StatusBar, etc.).

## Architecture

### Event Flow

```
Obsidian Event (file save, modify, etc.)
         ↓
ValidationService (calls core)
         ↓
Core returns structured data
         ↓
UI components format + display
```

### Core Wrapping

Plugin never reimplements validation logic — it calls core:

```typescript
// ✅ Plugin wraps core
import { validateFrontmatter } from "@zodsidian/core";

const result = validateFrontmatter(frontmatter);
if (!result.valid) {
  new Notice("Frontmatter validation failed");
}

// ❌ Plugin reimplements validation
function myValidate(frontmatter) { ... } // NO
```

This ensures:

- CLI and plugin use identical validation logic
- Schema changes automatically flow to plugin
- Plugin tests validate formatting, not logic

## Features

### Built

✅ **Live validation service**

- Validates files on save/modify
- Caches results to avoid re-validating unchanged files
- Debounces rapid edits

✅ **Settings tab**

- Enable/disable auto-validation
- Configure autofix behavior (safe vs unsafe)
- Choose which document types to validate

✅ **Status bar**

- Shows vault health summary (errors, warnings)
- Clickable to open validation view

✅ **Basic commands**

- "Validate vault" — Manual validation trigger
- "Validate current file" — Validate active file only

✅ **Ingestion — add existing notes to the graph**

- Validation panel shows type buttons when a file isn't in the graph
- Right-click any `.md` file → "Add to Zodsidian as project / decision / idea"
- Command palette: "Convert current file to project / decision / idea"
- Merge strategy: schema defaults fill gaps, existing frontmatter fields are preserved, `type` is stamped
- Markdown body is never modified

### Planned

🚧 **Autofix buttons**

- Ribbon button to run autofix on vault
- Context menu to fix current file
- Modal to preview fixes before applying

🚧 **Scaffold integration**

- Command palette: "New project", "New decision", etc.
- Modal to fill required fields
- Writes to current folder or daily note folder

🚧 **Query integration**

- Command to show reference graph for current file
- View to browse vault by type (all projects, all decisions)
- Clickable references to navigate vault

🚧 **Validation view polish**

- Grouped by severity (errors, then warnings)
- Grouped by file
- Click to open file + jump to frontmatter

🚧 **Performance optimizations**

- Incremental validation (only changed files)
- Background indexing (don't block UI)
- Lazy loading for large vaults

## Module Guide

### Services

**Location:** `src/services/`

**Purpose:** Background services that run throughout plugin lifecycle.

#### ValidationService

Handles real-time validation:

```typescript
class ValidationService {
  validateFile(file: TFile): ValidationResult;
  validateVault(): VaultValidationResult;
  clearCache(): void;
}
```

**What it does:**

- Registers event handlers for file save/modify
- Debounces rapid edits (wait 500ms after last change)
- Caches validation results (invalidates on file change)
- Emits events for UI to listen to

**Key methods:**

- `validateFile(file)` — Validate a single file (uses cache)
- `validateVault()` — Validate entire vault (clears cache)
- `clearCache()` — Force re-validation

---

### UI

**Location:** `src/ui/`

**Purpose:** Obsidian UI components (modals, views, status bar).

#### StatusBarItem

Shows vault health in status bar:

```typescript
class VaultHealthStatusBar {
  update(stats: VaultStats): void;
  hide(): void;
}
```

**What it shows:**

- Error count (red)
- Warning count (yellow)
- Clickable to open validation view

#### ValidationView (planned)

Lists all validation issues:

```typescript
class ValidationView extends ItemView {
  displayIssues(issues: ValidationIssue[]): void;
  openFile(file: string, line?: number): void;
}
```

**Features:**

- Grouped by severity
- Clickable file paths (opens file + jumps to frontmatter)
- Refresh button

#### AutofixModal (planned)

Preview autofix changes before applying:

```typescript
class AutofixModal extends Modal {
  showChanges(before: string, after: string): void;
  onApply(callback: () => void): void;
}
```

---

### Settings

**Location:** `src/settings/`

**Purpose:** Plugin settings UI and persistence.

#### SettingsTab

Obsidian settings tab for plugin configuration:

```typescript
interface ZodsidianSettings {
  autoValidate: boolean; // Enable live validation
  autofixOnSave: boolean; // Run autofix on save
  unsafeFixes: boolean; // Allow unsafe fixes
  enabledTypes: string[]; // Which types to validate
}
```

**Settings UI:**

- Toggle auto-validation
- Toggle autofix-on-save
- Checkbox for unsafe fixes
- Dropdown to select enabled types

**Persistence:**

- Saves to `.obsidian/plugins/zodsidian/data.json`
- Loads on plugin load

---

### Commands

**Location:** `src/commands/`

**Purpose:** Command palette commands for manual actions.

#### Built commands

| Command                 | Description                         |
| ----------------------- | ----------------------------------- |
| `validate-vault`        | Validate all files in vault         |
| `validate-current-file` | Validate active file only           |
| `fix-current-file`      | Apply safe autofixes to active file |
| `convert-to-project`    | Convert current file to a project   |
| `convert-to-decision`   | Convert current file to a decision  |
| `convert-to-idea`       | Convert current file to an idea     |

#### Planned commands

| Command           | Description                           |
| ----------------- | ------------------------------------- |
| `autofix-vault`   | Run autofix on all files              |
| `new-project`     | Scaffold a brand-new project          |
| `new-decision`    | Scaffold a brand-new decision         |
| `new-idea`        | Scaffold a brand-new idea             |
| `show-references` | Show reference graph for current file |

---

## Development

### Build

```bash
pnpm build
```

Compiles TypeScript to `main.js` (Obsidian plugin entry point).

### Test in Obsidian

1. Build the plugin
2. Copy to Obsidian vault:
   ```bash
   cp -r packages/obsidian-plugin/.obsidian/plugins/zodsidian /path/to/vault/.obsidian/plugins/
   ```
3. Reload Obsidian
4. Enable plugin in settings

### Development workflow

**Hot reload:**

Use [Hot Reload](https://github.com/pjeby/hot-reload) plugin:

```bash
# Terminal 1: Watch build
pnpm --filter @zodsidian/obsidian-plugin dev

# Terminal 2: Obsidian with hot reload enabled
# Edit code → plugin auto-reloads
```

### Lint

```bash
pnpm lint    # Check formatting
pnpm format  # Write fixes
```

### Test

```bash
pnpm test
```

(Currently skeleton — needs test setup for Obsidian API mocking)

---

## Design Notes

### Why wrap core?

**Separation of concerns:**

- Core implements validation logic (pure TypeScript, no Obsidian deps)
- Plugin implements UI (Obsidian API, modals, notices, status bar)

**Benefits:**

- Core logic is testable without Obsidian
- CLI and plugin guaranteed to use identical validation
- Plugin can evolve UI without touching validation logic

### Event-driven architecture

Plugin listens to Obsidian events:

```typescript
// File events
this.registerEvent(this.app.vault.on("modify", this.onFileModify));
this.registerEvent(this.app.vault.on("delete", this.onFileDelete));

// Editor events
this.registerEvent(this.app.workspace.on("active-leaf-change", this.onActiveFileChange));
```

When an event fires:

1. ValidationService calls core validation
2. Core returns structured data
3. Service emits custom event
4. UI components listen and update

### Caching strategy

Validation is expensive for large vaults. Plugin caches results:

```typescript
class ValidationService {
  private cache = new Map<string, ValidationResult>();

  validateFile(file: TFile): ValidationResult {
    const cached = this.cache.get(file.path);
    if (cached && cached.mtime === file.stat.mtime) {
      return cached; // ← Use cache if file unchanged
    }

    const result = validateFrontmatter(parseFrontmatter(content));
    this.cache.set(file.path, { ...result, mtime: file.stat.mtime });
    return result;
  }
}
```

**Cache invalidation:**

- On file modify (delete cache entry)
- On vault validation (clear all)
- On settings change (clear all)

### Performance considerations

**Large vaults (1000+ files):**

- Validate on demand (not on plugin load)
- Debounce rapid edits (wait 500ms after last keystroke)
- Use background workers for indexing (planned)
- Lazy-load validation view (only visible files)

**Current limitations:**

- Vault validation blocks UI (needs background worker)
- No incremental validation (re-validates all files)

### Obsidian API integration

**Key APIs used:**

- `Vault.on("modify")` — File change events
- `Workspace.getActiveFile()` — Current file
- `StatusBarItem` — Vault health indicator
- `Notice` — Validation error toasts
- `Modal` — Autofix preview
- `PluginSettingTab` — Settings UI
- `addCommand()` — Command palette integration

## Architecture Diagram

```
┌─────────────────────────┐
│  @zodsidian/core        │  Validation logic
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  @zodsidian/obsidian-   │
│  plugin                 │
├─────────────────────────┤
│  ValidationService      │  Event handling
│  StatusBar              │  UI components
│  Settings               │  Configuration
│  Commands               │  Palette integration
└───────────┬─────────────┘
            │
            ▼
     Obsidian Vault
```

## Roadmap

**v0.1:**

- ✅ Live validation service
- ✅ Status bar indicator
- ✅ Settings tab
- ✅ Basic commands

**v0.2 (current):**

- ✅ Ingestion UI — convert existing notes into typed graph documents
  - Validation panel type buttons for untyped files
  - File explorer context menu ("Add to Zodsidian as...")
  - Command palette convert commands

**v0.3 (next):**

- Autofix buttons (ribbon + context menu)
- Autofix preview modal
- Validation view polish (clickable issue list, grouped by severity)

**v0.3:**

- Scaffold integration (command palette)
- Query integration (reference graph view)

**v0.4:**

- Performance optimizations (background indexing)
- Incremental validation
- Large vault support (1000+ files)

**v1.0:**

- Full feature parity with CLI
- Stable API
- Published to Obsidian community plugins
