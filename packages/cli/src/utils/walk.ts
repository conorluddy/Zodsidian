import { readdir, readFile } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import { parseFrontmatter, shouldExcludeFile } from "@zodsidian/core";

export interface WalkedFile {
  filePath: string;
  content: string;
}

export async function walkMarkdownFiles(
  dir: string,
  excludeGlobs?: string[],
): Promise<WalkedFile[]> {
  const files: WalkedFile[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      const relativePath = relative(dir, fullPath);

      if (excludeGlobs && shouldExcludeFile(relativePath, excludeGlobs)) continue;

      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        await walk(fullPath);
      } else if (entry.isFile() && extname(entry.name) === ".md") {
        const content = await readFile(fullPath, "utf-8");
        files.push({ filePath: fullPath, content });
      }
    }
  }

  await walk(dir);
  return files;
}

export function filterByType(files: WalkedFile[], typeName: string): WalkedFile[] {
  return files.filter(({ content }) => {
    const parsed = parseFrontmatter(content);
    if (!parsed.data || typeof parsed.data !== "object") return false;
    const data = parsed.data as Record<string, unknown>;
    return data.type === typeName;
  });
}
