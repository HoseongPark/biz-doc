import {
  readTextFile, writeTextFile, readDir, exists, mkdir, remove,
} from "@tauri-apps/plugin-fs";
import type { FsAdapter } from "./fs";

export const tauriFs: FsAdapter = {
  readTextFile: (p) => readTextFile(p),
  writeTextFile: (p, t) => writeTextFile(p, t),
  readDir: async (p) => (await readDir(p)).map((e) => e.name),
  exists: (p) => exists(p),
  mkdir: (p) => mkdir(p, { recursive: true }),
  remove: (p) => remove(p),
};
