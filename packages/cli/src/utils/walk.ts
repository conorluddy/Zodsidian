import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

export interface WalkedFile {
  filePath: string;
  content: string;
}

export async function walkMarkdownFiles(dir: string): Promise<WalkedFile[]> {
  const files: WalkedFile[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
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
