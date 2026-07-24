export interface FsAdapter {
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, text: string): Promise<void>;
  readDir(path: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
}

export function joinPath(...parts: string[]): string {
  return parts
    .map((p, i) => (i === 0 ? p.replace(/[/\\]+$/, "") : p.replace(/^[/\\]+|[/\\]+$/g, "")))
    .join("/");
}

export class InMemoryFs implements FsAdapter {
  constructor(private files: Record<string, string> = {}) {}

  async readTextFile(path: string): Promise<string> {
    if (!(path in this.files)) throw new Error(`ENOENT: ${path}`);
    return this.files[path];
  }
  async writeTextFile(path: string, text: string): Promise<void> {
    this.files[path] = text;
  }
  async readDir(path: string): Promise<string[]> {
    const prefix = path.replace(/[/\\]+$/, "") + "/";
    const names = new Set<string>();
    for (const key of Object.keys(this.files)) {
      if (key.startsWith(prefix)) names.add(key.slice(prefix.length).split("/")[0]);
    }
    return [...names];
  }
  async exists(path: string): Promise<boolean> {
    const prefix = path.replace(/[/\\]+$/, "") + "/";
    return path in this.files || Object.keys(this.files).some((k) => k.startsWith(prefix));
  }
  async mkdir(): Promise<void> {}
  async remove(path: string): Promise<void> {
    delete this.files[path];
  }
}
