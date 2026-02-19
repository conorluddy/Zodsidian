import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  TFile,
} from "obsidian";
import { introspectSchema } from "@zodsidian/core";

/**
 * Provides schema-aware autocomplete for frontmatter enum fields.
 *
 * When the cursor is inside the YAML frontmatter of a Zodsidian-typed file
 * and on a line whose field maps to a ZodEnum in the schema, this suggest
 * offers the valid enum values as completions.
 */
export class FrontmatterSuggest extends EditorSuggest<string> {
  constructor(app: App) {
    super(app);
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    file: TFile | null,
  ): EditorSuggestTriggerInfo | null {
    if (!file) return null;
    if (!isInFrontmatter(cursor, editor)) return null;

    const line = editor.getLine(cursor.line);
    // Match "fieldName: " — only trigger after the colon+space
    const colonMatch = line.match(/^([\w-]+)\s*:\s*/);
    if (!colonMatch) return null;

    const valueStart = colonMatch[0].length;
    if (cursor.ch < valueStart) return null;

    const docType = this.app.metadataCache.getFileCache(file)?.frontmatter?.type;
    if (!docType || typeof docType !== "string") return null;

    const schema = introspectSchema(docType);
    if (!schema) return null;

    const fieldName = colonMatch[1];
    const field = schema.fields.find((f) => f.name === fieldName);
    if (!field || field.zodType !== "ZodEnum" || !field.values?.length) return null;

    return {
      start: { line: cursor.line, ch: valueStart },
      end: cursor,
      query: line.slice(valueStart, cursor.ch),
    };
  }

  getSuggestions(context: EditorSuggestContext): string[] {
    const { query, file, editor } = context;

    const docType = this.app.metadataCache.getFileCache(file)?.frontmatter?.type;
    if (!docType || typeof docType !== "string") return [];

    const schema = introspectSchema(docType);
    if (!schema) return [];

    const line = editor.getLine(context.start.line);
    const colonMatch = line.match(/^([\w-]+)\s*:/);
    if (!colonMatch) return [];

    const field = schema.fields.find((f) => f.name === colonMatch[1]);
    if (!field?.values) return [];

    return query ? field.values.filter((v) => v.startsWith(query)) : field.values;
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.createEl("span", { text: value });
  }

  selectSuggestion(value: string, _evt: MouseEvent | KeyboardEvent): void {
    const { context } = this;
    if (!context) return;
    context.editor.replaceRange(value, context.start, context.end);
  }
}

/** Returns true when the cursor is inside the opening `---` frontmatter block. */
function isInFrontmatter(cursor: EditorPosition, editor: Editor): boolean {
  if (editor.getLine(0).trim() !== "---") return false;
  if (cursor.line === 0) return false;
  // If a closing --- appears on any line before (or at) the cursor, we're past it
  for (let i = 1; i <= cursor.line; i++) {
    if (editor.getLine(i).trim() === "---") return false;
  }
  return true;
}
