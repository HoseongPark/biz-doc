import { create } from "zustand";
import type { FsAdapter } from "./fs";
import { joinPath } from "./fs";
import { tauriFs } from "./tauriFs";
import {
  Attribute, BusinessLogic, DomainSpec, DomainType, EnumValue, Operation,
  Relationship, nowStamp, validateContext,
} from "./schema";
import {
  addDomain as docAddDomain, deleteDomainValue, removeDomain as docRemoveDomain,
  newContextText, setDomainValue, setRelationships,
} from "./yamlStore";
import {
  ContextFile, LayoutFile, loadWorkspace, saveContextFile, saveLayout,
} from "./workspaceService";

export type Selection =
  | { kind: "domain"; fileName: string; domainKey: string }
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
    fileName: string, domainKey: string,
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
  addDomain(f: string, key: string, type: DomainType, name: string): Promise<void>;
  deleteDomain(f: string, key: string): Promise<void>;
  addRelationship(f: string, rel: Relationship): Promise<void>;
  updateRelationship(f: string, i: number, label: string): Promise<void>;
  removeRelationship(f: string, i: number): Promise<void>;
  addContext(fileName: string, name: string): Promise<void>;
  deleteContext(fileName: string): Promise<void>;
  saveNodePosition(nodeId: string, pos: { x: number; y: number }): Promise<void>;
}

export const useWorkspace = create<WorkspaceState>((set, get) => {
  async function commit(fileName: string, mutate: (file: ContextFile) => void) {
    const { fs, root, contexts } = get();
    if (!root) throw new Error("workspace not open");
    const file = contexts.find((c) => c.fileName === fileName);
    if (!file || file.error) throw new Error(`context not loaded: ${fileName}`);
    mutate(file);
    const r = validateContext(file.doc.toJS());
    if (!r.ok) throw new Error(r.errors.join("\n"));
    file.spec = r.spec;
    await saveContextFile(fs, root, file);
    set({
      contexts: contexts.map((c) => (c === file ? { ...file } : c)),
    });
  }

  function upsertListItem(section: string) {
    return (f: string, d: string, i: number | null, item: unknown) =>
      commit(f, (file) => {
        const list =
          (file.spec.domain![d] as unknown as Record<string, unknown[]>)[section] ?? [];
        const index = i === null ? list.length : i;
        // yaml doesn't auto-create a missing sequence when setIn targets an index
        // into it, so ensure the section exists as an (empty) sequence first.
        if (file.doc.getIn(["domain", d, section]) === undefined) {
          file.doc.setIn(["domain", d, section], file.doc.createNode([]));
        }
        setDomainValue(file.doc, d, [section, index], file.doc.createNode(item));
      });
  }

  function removeListItem(section: string) {
    return (f: string, d: string, i: number) =>
      commit(f, (file) => deleteDomainValue(file.doc, d, [section, i]));
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

    updateDomainMeta(f, d, patch) {
      return commit(f, (file) => {
        if (patch.name !== undefined) setDomainValue(file.doc, d, ["meta", "name"], patch.name);
        if (patch.description !== undefined)
          setDomainValue(file.doc, d, ["meta", "description"], patch.description);
        if (patch.type !== undefined)
          setDomainValue(file.doc, d, ["meta", "identity", "type"], patch.type);
      });
    },

    upsertAttribute: upsertListItem("attributes"),
    removeAttribute: removeListItem("attributes"),
    upsertLogic: upsertListItem("business-logic"),
    removeLogic: removeListItem("business-logic"),
    upsertValue: upsertListItem("values"),
    removeValue: removeListItem("values"),
    upsertOperation: upsertListItem("operations"),
    removeOperation: removeListItem("operations"),

    addDomain(f, key, type, name) {
      return commit(f, (file) => {
        const stamp = nowStamp();
        const domain: DomainSpec = {
          meta: {
            identity: { id: crypto.randomUUID(), type },
            name,
            description: "",
            audit: {
              author: file.spec.info.audit.author,
              "created-at": stamp,
              "updated-at": stamp,
            },
          },
          ...(type === "Stereotype"
            ? { values: [] }
            : type === "Service"
            ? { operations: [] }
            : { attributes: [], "business-logic": [] }),
        };
        docAddDomain(file.doc, key, domain);
      });
    },

    deleteDomain(f, key) {
      return commit(f, (file) => {
        const id = file.spec.domain![key].meta.identity.id;
        docRemoveDomain(file.doc, key);
        const rels = (file.spec.relationships ?? []).filter(
          (r) => r.from["domain-id"] !== id && r.to["domain-id"] !== id
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

    async addContext(fileName, name) {
      const { fs, root } = get();
      if (!root) throw new Error("workspace not open");
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
      const next = { nodes: { ...layout.nodes, [nodeId]: pos } };
      await saveLayout(fs, root, next);
      set({ layout: next });
    },
  };
});
