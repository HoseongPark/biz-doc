import type { Document } from "yaml";
import type { FsAdapter } from "./fs";
import { joinPath } from "./fs";
import type { ContextSpec } from "./schema";
import { parseContext, serializeContext } from "./yamlStore";

export interface ContextFile {
  fileName: string;
  doc: Document;
  spec: ContextSpec;
  error?: string;
}

export interface LayoutFile {
  nodes: Record<string, { x: number; y: number }>;
  sizes?: Record<string, { width: number; height: number }>;
}

export async function loadWorkspace(
  fs: FsAdapter, root: string
): Promise<{ contexts: ContextFile[]; layout: LayoutFile }> {
  const contextDir = joinPath(root, "context");
  const names = (await fs.exists(contextDir)) ? await fs.readDir(contextDir) : [];
  const contexts: ContextFile[] = [];
  for (const name of names.filter((n) => n.endsWith(".yml")).sort()) {
    const text = await fs.readTextFile(joinPath(contextDir, name));
    try {
      const { doc, spec } = parseContext(text);
      contexts.push({ fileName: name, doc, spec });
    } catch (e) {
      contexts.push({
        fileName: name,
        doc: undefined as unknown as Document,
        spec: undefined as unknown as ContextSpec,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  let layout: LayoutFile = { nodes: {} };
  const layoutPath = joinPath(root, ".config", "layout.json");
  if (await fs.exists(layoutPath)) {
    try {
      layout = JSON.parse(await fs.readTextFile(layoutPath));
      layout.nodes ??= {};
      layout.sizes ??= {};
    } catch {
      layout = { nodes: {} };
    }
  }
  return { contexts, layout };
}

export async function saveContextFile(
  fs: FsAdapter, root: string, file: ContextFile
): Promise<void> {
  await fs.writeTextFile(
    joinPath(root, "context", file.fileName),
    serializeContext(file.doc)
  );
}

export async function saveLayout(
  fs: FsAdapter, root: string, layout: LayoutFile
): Promise<void> {
  await fs.mkdir(joinPath(root, ".config"));
  await fs.writeTextFile(
    joinPath(root, ".config", "layout.json"),
    JSON.stringify(layout, null, 2)
  );
}

export async function loadRecent(fs: FsAdapter, configDir: string): Promise<string[]> {
  const p = joinPath(configDir, "recent.json");
  if (!(await fs.exists(p))) return [];
  try {
    const arr = JSON.parse(await fs.readTextFile(p));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveRecent(
  fs: FsAdapter, configDir: string, paths: string[]
): Promise<void> {
  const deduped = [...new Set(paths)].slice(0, 5);
  await fs.mkdir(configDir);
  await fs.writeTextFile(joinPath(configDir, "recent.json"), JSON.stringify(deduped));
}
