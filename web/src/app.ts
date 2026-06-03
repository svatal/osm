type Counts = { nodes: number; ways: number; relations: number };

function getCountsEl(): HTMLParagraphElement {
  const el = document.querySelector<HTMLParagraphElement>("#counts");
  if (!el) throw new Error("#counts not found");
  return el;
}

function setCounts(counts: Counts): void {
  const el = getCountsEl();
  el.textContent = `Nodes: ${counts.nodes.toLocaleString()}  ·  Ways: ${counts.ways.toLocaleString()}  ·  Relations: ${counts.relations.toLocaleString()}`;
  el.dataset.state = "loaded";
}

function setLoading(): void {
  const el = getCountsEl();
  el.textContent = "Parsing…";
  el.dataset.state = "loading";
}

function setError(message: string): void {
  const el = getCountsEl();
  el.textContent = `Error: ${message}`;
  el.dataset.state = "error";
}

function setEmpty(): void {
  const el = getCountsEl();
  el.textContent = "Select a .osm.pbf file to see counts.";
  el.dataset.state = "empty";
}

async function parsePbfAndCount(stream: ReadableStream<Uint8Array>): Promise<Counts> {
  const { osmPbfToJson } = await import("@osmix/json");
  const { toAsyncGenerator } = await import("@osmix/pbf");

  const counts: Counts = { nodes: 0, ways: 0, relations: 0 };
  for await (const item of toAsyncGenerator(osmPbfToJson(stream))) {
    if (!("id" in item)) continue; // header block
    if ("members" in item) counts.relations += 1;
    else if ("refs" in item) counts.ways += 1;
    else counts.nodes += 1;
  }
  return counts;
}

function onFileSelected(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    setEmpty();
    return;
  }
  setLoading();
  parsePbfAndCount(file.stream())
    .then(setCounts)
    .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
}

export function renderApp(root: HTMLDivElement): void {
  root.innerHTML = `
    <div class="app">
      <h1>OSM Explorer</h1>
      <p class="hint">Load a .osm.pbf file (e.g. from <a href="https://download.openstreetmap.fr/extracts/" target="_blank" rel="noopener">download.openstreetmap.fr</a>)</p>
      <label class="file-label">
        <span>Select file</span>
        <input type="file" id="file" accept=".osm.pbf,.pbf" />
      </label>
      <p id="counts" data-state="empty">Select a .osm.pbf file to see counts.</p>
    </div>
  `;

  const fileInput = root.querySelector<HTMLInputElement>("#file");
  fileInput?.addEventListener("change", onFileSelected);
}
