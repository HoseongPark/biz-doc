import { create } from "zustand";
import type { FsAdapter } from "./fs";
import { joinPath } from "./fs";
import { tauriFs } from "./tauriFs";
import {
  Attribute, BusinessLogic, DomainSpec, DomainType, EnumValue, Operation,
  Relationship, nowStamp, validateContext,
} from "./schema";
import {
  addDomain as docAddDomain, deleteDomainValue, parseContext, removeDomain as docRemoveDomain,
  newContextText, serializeContext, setDomainValue, setRelationships,
} from "./yamlStore";
import {
  ContextFile, LayoutFile, loadWorkspace, saveContextFile, saveLayout,
} from "./workspaceService";

export type Selection =
  | { kind: "domain"; fileName: string; domainId: string }
  | { kind: "context"; fileName: string }
  | { kind: "relationship"; fileName: string; index: number }
  | null;

interface WorkspaceState {
  fs: FsAdapter;
  root: string | null;
  contexts: ContextFile[];
  layout: LayoutFile;
  selection: Selection;
  openWorkspace(root: string): Promise<void>;
  refresh(): Promise<void>;
  select(sel: Selection): void;
  updateDomainMeta(
    fileName: string, domainId: string,
    patch: { name?: string; description?: string; type?: DomainType }
  ): Promise<void>;
  upsertAttribute(f: string, d: string, i: number | null, a: Attribute): Promise<void>;
  removeAttribute(f: string, d: string, i: number): Promise<void>;
  upsertLogic(f: string, d: string, i: number | null, x: BusinessLogic): Promise<void>;
  removeLogic(f: string, d: string, i: number): Promise<void>;
  upsertValue(f: string, d: string, i: number | null, x: EnumValue): Promise<void>;
  removeValue(f: string, d: string, i: number): Promise<void>;
  upsertOperation(f: string, d: string, i: number | null, x: Operation): Promise<void>;
  removeOperation(f: string, d: string, i: number): Promise<void>;
  addDomain(f: string, type: DomainType, name: string): Promise<string>;
  deleteDomain(f: string, domainId: string): Promise<void>;
  addRelationship(f: string, rel: Relationship): Promise<void>;
  updateRelationship(f: string, i: number, label: string): Promise<void>;
  removeRelationship(f: string, i: number): Promise<void>;
  addContext(fileName: string, name: string): Promise<void>;
  updateContextName(fileName: string, name: string): Promise<void>;
  deleteContext(fileName: string): Promise<void>;
  saveNodePosition(nodeId: string, pos: { x: number; y: number }): Promise<void>;
  saveNodeBox(
    nodeId: string,
    box: { x: number; y: number; width: number; height: number }
  ): Promise<void>;
}

function domainIndex(file: ContextFile, domainId: string): number {
  const i = (file.spec.domains ?? []).findIndex((d) => d.id === domainId);
  if (i < 0) throw new Error(`도메인을 찾을 수 없음: ${domainId}`);
  return i;
}

export const useWorkspace = create<WorkspaceState>((set, get) => {
  async function commit(fileName: string, mutate: (file: ContextFile) => void) {
    const { fs, root, contexts } = get();
    if (!root) throw new Error("workspace not open");
    const file = contexts.find((c) => c.fileName === fileName);
    if (!file || file.error) throw new Error(`context not loaded: ${fileName}`);
    const before = serializeContext(file.doc);
    mutate(file);
    const r = validateContext(file.doc.toJS());
    if (!r.ok) {
      const restored = parseContext(before);
      file.doc = restored.doc;
      if (typeof window !== "undefined" && typeof window.alert === "function") {
        window.alert(r.errors.join("\n"));
      }
      throw new Error(r.errors.join("\n"));
    }
    file.spec = r.spec;
    await saveContextFile(fs, root, file);
    set({
      contexts: contexts.map((c) => (c === file ? { ...file } : c)),
    });
  }

  function upsertListItem(section: string) {
    return (f: string, domainId: string, i: number | null, item: unknown) =>
      commit(f, (file) => {
        const di = domainIndex(file, domainId);
        const list =
          (file.spec.domains![di] as unknown as Record<string, unknown[]>)[section] ?? [];
        const index = i === null ? list.length : i;
        // yaml doesn't auto-create a missing sequence when setIn targets an index
        // into it, so ensure the section exists as an (empty) sequence first.
        if (file.doc.getIn(["domains", di, section]) === undefined) {
          file.doc.setIn(["domains", di, section], file.doc.createNode([]));
        }
        setDomainValue(file.doc, di, [section, index], file.doc.createNode(item));
      });
  }

  function removeListItem(section: string) {
    return (f: string, domainId: string, i: number) =>
      commit(f, (file) =>
        deleteDomainValue(file.doc, domainIndex(file, domainId), [section, i])
      );
  }

  return {
    fs: tauriFs,
    root: null,
    contexts: [],
    layout: { nodes: {} },
    selection: null,

    async openWorkspace(root) {
      const { contexts, layout } = await loadWorkspace(get().fs, root);
      set({ root, contexts, layout, selection: null });
    },

    async refresh() {
      const { root } = get();
      if (root) await get().openWorkspace(root);
    },

    select(selection) {
      set({ selection });
    },

    updateDomainMeta(f, domainId, patch) {
      return commit(f, (file) => {
        const di = domainIndex(file, domainId);
        if (patch.name !== undefined) setDomainValue(file.doc, di, ["meta", "name"], patch.name);
        if (patch.description !== undefined)
          setDomainValue(file.doc, di, ["meta", "description"], patch.description);
        if (patch.type !== undefined)
          setDomainValue(file.doc, di, ["type"], patch.type);
      });
    },

    upsertAttribute: upsertListItem("attributes"),
    removeAttribute: removeListItem("attributes"),
    upsertLogic: upsertListItem("business-logic"),
    removeLogic: removeListItem("business-logic"),
    upsertValue: upsertListItem("values"),
    removeValue: removeListItem("values"),
    upsertOperation(f, domainId, i, x) {
      return commit(f, (file) => {
        const di = domainIndex(file, domainId);
        const list = (file.spec.domains![di].operations as unknown[]) ?? [];
        const index = i === null ? list.length : i;
        if (file.doc.getIn(["domains", di, "operations"]) === undefined) {
          file.doc.setIn(["domains", di, "operations"], file.doc.createNode([]));
        }
        const node = file.doc.createNode(x);
        const rd = node.get?.("related-domains", true) as
          | { items?: unknown[]; flow?: boolean }
          | undefined;
        if (rd && Array.isArray(rd.items)) rd.flow = true;
        setDomainValue(file.doc, di, ["operations", index], node);
      });
    },
    removeOperation: removeListItem("operations"),

    async addDomain(f, type, name) {
      const id = crypto.randomUUID();
      await commit(f, (file) => {
        const stamp = nowStamp();
        const domain: DomainSpec = {
          id,
          type,
          meta: {
            name,
            description: "",
            audit: {
              author: file.spec.info.audit.author,
              "created-at": stamp,
              "updated-at": stamp,
            },
          },
          ...(type === "STEREO"
            ? { values: [] }
            : type === "SERVICE"
            ? { operations: [] }
            : { attributes: [], "business-logic": [] }),
        };
        docAddDomain(file.doc, domain);
      });
      return id;
    },

    deleteDomain(f, domainId) {
      return commit(f, (file) => {
        docRemoveDomain(file.doc, domainIndex(file, domainId));
        const rels = (file.spec.relationships ?? []).filter(
          (r) => r.from["domain-id"] !== domainId && r.to["domain-id"] !== domainId
        );
        setRelationships(file.doc, rels);
      });
    },

    addRelationship(f, rel) {
      return commit(f, (file) => {
        setRelationships(file.doc, [...(file.spec.relationships ?? []), rel]);
      });
    },

    updateRelationship(f, i, label) {
      return commit(f, (file) => {
        file.doc.setIn(["relationships", i, "relationship"], label);
      });
    },

    removeRelationship(f, i) {
      return commit(f, (file) => {
        const rels = [...(file.spec.relationships ?? [])];
        rels.splice(i, 1);
        setRelationships(file.doc, rels);
      });
    },

    updateContextName(f, name) {
      return commit(f, (file) => {
        file.doc.setIn(["info", "context", "name"], name);
        file.doc.setIn(["info", "audit", "updated-at"], nowStamp());
      });
    },

    async addContext(fileName, name) {
      const { fs, root } = get();
      if (!root) throw new Error("workspace not open");
      if (get().contexts.some((c) => c.fileName === fileName)) {
        throw new Error(`이미 존재하는 파일: ${fileName}`);
      }
      const author =
        get().contexts.find((c) => !c.error)?.spec.info.audit.author ?? "unknown";
      await fs.writeTextFile(
        joinPath(root, "context", fileName),
        newContextText(name, author)
      );
      await get().refresh();
    },

    async deleteContext(fileName) {
      const { fs, root } = get();
      if (!root) throw new Error("workspace not open");
      await fs.remove(joinPath(root, "context", fileName));
      await get().refresh();
    },

    async saveNodePosition(nodeId, pos) {
      const { fs, root, layout } = get();
      if (!root) return;
      const next = { ...layout, nodes: { ...layout.nodes, [nodeId]: pos } };
      await saveLayout(fs, root, next);
      set({ layout: next });
    },

    async saveNodeBox(nodeId, box) {
      const { fs, root, layout } = get();
      if (!root) return;
      const next = {
        nodes: { ...layout.nodes, [nodeId]: { x: box.x, y: box.y } },
        sizes: {
          ...(layout.sizes ?? {}),
          [nodeId]: { width: box.width, height: box.height },
        },
      };
      await saveLayout(fs, root, next);
      set({ layout: next });
    },
  };
});
