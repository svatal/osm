import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type {
  Counts,
  EntityDetail,
  ParseWorkerResponse,
  RelationPreviewRow,
} from "./counts";
import { DetailPanel } from "./DetailPanel";
import type { EntityRef } from "./entityRef";
import { entityRefKey } from "./entityRef";
import { RelationTable } from "./RelationTable";

type CountsState = "empty" | "loading" | "loaded" | "error";
type TabId = "load" | "relations";

function formatCounts(counts: Counts): string {
  return `Nodes: ${counts.nodes.toLocaleString()}  ·  Ways: ${counts.ways.toLocaleString()}  ·  Relations: ${counts.relations.toLocaleString()}`;
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>("load");
  const [counts, setCounts] = useState<Counts>({
    nodes: 0,
    ways: 0,
    relations: 0,
  });
  const [countsState, setCountsState] = useState<CountsState>("empty");
  const [countsMessage, setCountsMessage] = useState(
    "Select a .osm.pbf file to see counts."
  );
  const [previewRows, setPreviewRows] = useState<RelationPreviewRow[]>([]);
  const [navStack, setNavStack] = useState<EntityRef[]>([]);
  const [detail, setDetail] = useState<EntityDetail | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const detailCacheRef = useRef(new Map<string, EntityDetail>());
  const pendingDetailRef = useRef<string | null>(null);
  const previewRowsRef = useRef(previewRows);
  previewRowsRef.current = previewRows;

  const relationsReady = countsState === "loaded";

  const stopWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopWorker(), [stopWorker]);

  const showDetail = useCallback((ref: EntityRef) => {
    const key = entityRefKey(ref);
    const cached = detailCacheRef.current.get(key);
    if (cached) {
      setDetail(cached);
      return;
    }
    if (!workerRef.current) return;
    pendingDetailRef.current = key;
    workerRef.current.postMessage({ type: "getEntityDetail", ref });
  }, []);

  const resetNavigation = useCallback(() => {
    setNavStack([]);
    setDetail(null);
    detailCacheRef.current.clear();
    pendingDetailRef.current = null;
  }, []);

  const navigateTo = useCallback(
    (ref: EntityRef) => {
      setNavStack([ref]);

      if (ref.type === "relation") {
        const row = previewRowsRef.current.find((r) => r.relation.id === ref.id);
        if (row) {
          const seeded: EntityDetail = {
            ref,
            entity: row.relation,
            wayCount: row.wayCount,
            nodeCount: row.nodeCount,
          };
          detailCacheRef.current.set(entityRefKey(ref), seeded);
          setDetail(seeded);
        }
      }

      showDetail(ref);
    },
    [showDetail]
  );

  const drillInto = useCallback(
    (ref: EntityRef) => {
      setNavStack((stack) => [...stack, ref]);
      showDetail(ref);
    },
    [showDetail]
  );

  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      setNavStack((stack) => {
        const next = stack.slice(0, index + 1);
        const focus = next.at(-1);
        if (focus) showDetail(focus);
        else setDetail(null);
        return next;
      });
    },
    [showDetail]
  );

  const parseFile = useCallback(
    (file: File) => {
      stopWorker();
      setActiveTab("load");
      setCounts({ nodes: 0, ways: 0, relations: 0 });
      setCountsState("loading");
      setCountsMessage(formatCounts({ nodes: 0, ways: 0, relations: 0 }));
      setPreviewRows([]);
      resetNavigation();

      const worker = new Worker(new URL("./parseWorker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent<ParseWorkerResponse>) => {
        const msg = event.data;
        if (msg.type === "progress") {
          setCounts(msg.counts);
          setCountsState("loading");
          setCountsMessage(formatCounts(msg.counts));
        } else if (msg.type === "done") {
          setCounts(msg.counts);
          setCountsState("loaded");
          setCountsMessage(formatCounts(msg.counts));
          setPreviewRows(msg.preview);
          resetNavigation();
          setActiveTab("relations");
        } else if (msg.type === "entityDetail") {
          const key = entityRefKey(msg.detail.ref);
          detailCacheRef.current.set(key, msg.detail);
          if (pendingDetailRef.current === key) {
            pendingDetailRef.current = null;
            setDetail(msg.detail);
          }
        } else if (msg.type === "error") {
          setCountsState("error");
          setCountsMessage(`Error: ${msg.message}`);
          setPreviewRows([]);
          resetNavigation();
          setActiveTab("load");
          stopWorker();
        }
      };

      worker.onerror = () => {
        setCountsState("error");
        setCountsMessage("Error: Worker failed");
        setPreviewRows([]);
        resetNavigation();
        setActiveTab("load");
        stopWorker();
      };

      worker.postMessage({ type: "parse", file });
    },
    [resetNavigation, stopWorker]
  );

  const onFileSelected = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      stopWorker();
      setCountsState("empty");
      setCountsMessage("Select a .osm.pbf file to see counts.");
      setPreviewRows([]);
      resetNavigation();
      setActiveTab("load");
      return;
    }
    parseFile(file);
  };

  const selectedRelationId =
    navStack[0]?.type === "relation" ? navStack[0].id : null;
  const detailOpen =
    activeTab === "relations" && navStack.length > 0 && detail !== null;

  const countsLabel =
    countsState === "loading"
      ? `Parsing… ${formatCounts(counts)}`
      : countsMessage;

  return (
    <div class="app">
      <div class="tabs" role="tablist" aria-label="Main">
        <button
          type="button"
          role="tab"
          id="tab-load"
          class={activeTab === "load" ? "tab tab-active" : "tab"}
          aria-selected={activeTab === "load"}
          aria-controls="panel-load"
          onClick={() => setActiveTab("load")}
        >
          Load file
        </button>
        <button
          type="button"
          role="tab"
          id="tab-relations"
          class={activeTab === "relations" ? "tab tab-active" : "tab"}
          aria-selected={activeTab === "relations"}
          aria-controls="panel-relations"
          disabled={!relationsReady}
          title={
            relationsReady
              ? undefined
              : "Available after a file finishes loading"
          }
          onClick={() => {
            if (relationsReady) setActiveTab("relations");
          }}
        >
          Relations
        </button>
      </div>

      {activeTab === "load" ? (
        <section
          id="panel-load"
          role="tabpanel"
          aria-labelledby="tab-load"
          class="tab-panel tab-panel-load"
        >
          <h1>OSM Explorer</h1>
          <p class="hint">
            Load a .osm.pbf file (e.g. from{" "}
            <a
              href="https://download.openstreetmap.fr/extracts/"
              target="_blank"
              rel="noopener"
            >
              download.openstreetmap.fr
            </a>
            )
          </p>
          <label class="file-label">
            <span>Select file</span>
            <input
              type="file"
              accept=".osm.pbf,.pbf"
              onChange={onFileSelected}
            />
          </label>
          <p id="counts" data-state={countsState}>
            {countsLabel}
          </p>
        </section>
      ) : (
        <section
          id="panel-relations"
          role="tabpanel"
          aria-labelledby="tab-relations"
          class="tab-panel tab-panel-relations"
        >
          <div
            class={
              detailOpen ? "workspace workspace-detail-open" : "workspace"
            }
          >
            <div id="table" class="workspace-main">
              <RelationTable
                rows={previewRows}
                selectedRelationId={selectedRelationId}
                onRelationSelect={(id) =>
                  navigateTo({ type: "relation", id })
                }
              />
            </div>
            {detailOpen ? (
              <DetailPanel
                stack={navStack}
                detail={detail}
                onBreadcrumbClick={navigateToBreadcrumb}
                onMemberClick={drillInto}
              />
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
