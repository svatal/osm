import type {
  Counts,
  EntityDetail,
  ParseWorkerResponse,
  RelationPreviewRow,
} from "./counts";
import {
  clearDetailPanel,
  renderDetailPanel,
} from "./detailPanel";
import type { EntityRef } from "./entityRef";
import { entityRefKey } from "./entityRef";
import { clearTable, renderTable, updateTableSelection } from "./tableView";

let parseWorker: Worker | null = null;
let previewRows: RelationPreviewRow[] = [];
let navStack: EntityRef[] = [];
let detailCache = new Map<string, EntityDetail>();
let pendingDetailRef: string | null = null;

function getCountsEl(): HTMLParagraphElement {
  const el = document.querySelector<HTMLParagraphElement>("#counts");
  if (!el) throw new Error("#counts not found");
  return el;
}

function getTableEl(): HTMLElement {
  const el = document.querySelector<HTMLElement>("#table");
  if (!el) throw new Error("#table not found");
  return el;
}

function getDetailEl(): HTMLElement {
  const el = document.querySelector<HTMLElement>("#detail");
  if (!el) throw new Error("#detail not found");
  return el;
}

function getWorkspaceEl(): HTMLElement {
  const el = document.querySelector<HTMLElement>(".workspace");
  if (!el) throw new Error(".workspace not found");
  return el;
}

function setDetailPanelVisible(visible: boolean): void {
  getDetailEl().hidden = !visible;
  getWorkspaceEl().classList.toggle("workspace-detail-open", visible);
}

function selectedRelationId(): number | null {
  const root = navStack[0];
  return root?.type === "relation" ? root.id : null;
}

function formatCounts(counts: Counts): string {
  return `Nodes: ${counts.nodes.toLocaleString()}  ·  Ways: ${counts.ways.toLocaleString()}  ·  Relations: ${counts.relations.toLocaleString()}`;
}

function setCounts(counts: Counts, state: "loading" | "loaded" = "loaded"): void {
  const el = getCountsEl();
  const prefix = state === "loading" ? "Parsing… " : "";
  el.textContent = prefix + formatCounts(counts);
  el.dataset.state = state;
}

function refreshTable(): void {
  renderTable(getTableEl(), previewRows, selectedRelationId());
}

function refreshDetail(): void {
  const focus = navStack.at(-1);
  if (!focus) {
    setDetailPanelVisible(false);
    clearDetailPanel(getDetailEl());
    return;
  }
  setDetailPanelVisible(true);
  const cached = detailCache.get(entityRefKey(focus));
  renderDetailPanel(getDetailEl(), navStack, cached ?? null, detailHandlers);
}

function resetNavigation(): void {
  navStack = [];
  detailCache.clear();
  pendingDetailRef = null;
  setDetailPanelVisible(false);
  clearDetailPanel(getDetailEl());
  updateTableSelection(getTableEl(), null);
}

function requestEntityDetail(ref: EntityRef): void {
  const key = entityRefKey(ref);
  if (detailCache.has(key)) {
    refreshDetail();
    return;
  }
  if (!parseWorker) return;

  pendingDetailRef = key;
  parseWorker.postMessage({ type: "getEntityDetail", ref });
}

function navigateTo(ref: EntityRef): void {
  navStack = [ref];

  if (ref.type === "relation") {
    const row = previewRows.find((r) => r.relation.id === ref.id);
    if (row) {
      detailCache.set(entityRefKey(ref), {
        ref,
        entity: row.relation,
        wayCount: row.wayCount,
        nodeCount: row.nodeCount,
      });
    }
  }

  updateTableSelection(getTableEl(), ref.type === "relation" ? ref.id : selectedRelationId());
  requestEntityDetail(ref);
}

function drillInto(ref: EntityRef): void {
  navStack.push(ref);
  requestEntityDetail(ref);
}

function navigateToBreadcrumb(index: number): void {
  navStack = navStack.slice(0, index + 1);
  const focus = navStack.at(-1);
  if (focus) requestEntityDetail(focus);
  else refreshDetail();
}

function onTableClick(e: Event): void {
  const row = (e.target as HTMLElement).closest<HTMLTableRowElement>(
    "tr[data-relation-id]"
  );
  if (!row) return;
  navigateTo({ type: "relation", id: Number(row.dataset.relationId) });
}

const detailHandlers = {
  onBreadcrumbClick(index: number): void {
    navigateToBreadcrumb(index);
  },
  onMemberClick(ref: EntityRef): void {
    drillInto(ref);
  },
};

function setLoading(): void {
  setCounts({ nodes: 0, ways: 0, relations: 0 }, "loading");
  previewRows = [];
  resetNavigation();
  clearTable(getTableEl());
}

function setError(message: string): void {
  const el = getCountsEl();
  el.textContent = `Error: ${message}`;
  el.dataset.state = "error";
  previewRows = [];
  resetNavigation();
  clearTable(getTableEl());
}

function setEmpty(): void {
  const el = getCountsEl();
  el.textContent = "Select a .osm.pbf file to see counts.";
  el.dataset.state = "empty";
  previewRows = [];
  resetNavigation();
  clearTable(getTableEl());
}

function stopParseWorker(): void {
  if (parseWorker) {
    parseWorker.terminate();
    parseWorker = null;
  }
}

function parsePbfInWorker(file: File): void {
  stopParseWorker();
  setLoading();

  const worker = new Worker(new URL("./parseWorker.ts", import.meta.url), {
    type: "module",
  });
  parseWorker = worker;

  worker.onmessage = (event: MessageEvent<ParseWorkerResponse>) => {
    const msg = event.data;
    if (msg.type === "progress") {
      setCounts(msg.counts, "loading");
    } else if (msg.type === "done") {
      setCounts(msg.counts, "loaded");
      previewRows = msg.preview;
      resetNavigation();
      refreshTable();
    } else if (msg.type === "entityDetail") {
      const key = entityRefKey(msg.detail.ref);
      detailCache.set(key, msg.detail);
      if (pendingDetailRef === key) {
        pendingDetailRef = null;
        refreshDetail();
      }
    } else if (msg.type === "error") {
      setError(msg.message);
      stopParseWorker();
    }
  };

  worker.onerror = () => {
    setError("Worker failed");
    stopParseWorker();
  };

  worker.postMessage({ type: "parse", file });
}

function onFileSelected(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    stopParseWorker();
    setEmpty();
    return;
  }
  parsePbfInWorker(file);
}

export function renderApp(root: HTMLDivElement): void {
  root.innerHTML = `
    <div class="app">
      <header class="app-header">
        <h1>OSM Explorer</h1>
        <p class="hint">Load a .osm.pbf file (e.g. from <a href="https://download.openstreetmap.fr/extracts/" target="_blank" rel="noopener">download.openstreetmap.fr</a>)</p>
        <label class="file-label">
          <span>Select file</span>
          <input type="file" id="file" accept=".osm.pbf,.pbf" />
        </label>
        <p id="counts" data-state="empty">Select a .osm.pbf file to see counts.</p>
      </header>
      <div class="workspace">
        <div id="table" class="workspace-main"></div>
        <aside id="detail" class="workspace-detail" hidden></aside>
      </div>
    </div>
  `;

  getTableEl().addEventListener("click", onTableClick);
  setDetailPanelVisible(false);

  const fileInput = root.querySelector<HTMLInputElement>("#file");
  fileInput?.addEventListener("change", onFileSelected);
}
