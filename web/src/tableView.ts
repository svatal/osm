import type { RelationPreviewRow } from "./counts";
import { formatTags } from "./tags";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cell(value: string | number | undefined, wrap = false): string {
  if (value === undefined || value === "") return "";
  const escaped = escapeHtml(String(value));
  return wrap ? `<td class="cell-wrap">${escaped}</td>` : `<td>${escaped}</td>`;
}

/** Toggle selected row highlight without re-rendering the table. */
export function updateTableSelection(
  container: HTMLElement,
  selectedRelationId: number | null
): void {
  container.querySelectorAll<HTMLTableRowElement>("tr[data-relation-id]").forEach((row) => {
    const id = Number(row.dataset.relationId);
    row.classList.toggle("row-selected", id === selectedRelationId);
  });
}

/**
 * Renders a table of relations with transitive way/node reference counts
 * and a single tags column. Rows are clickable to open the detail panel.
 */
export function renderTable(
  container: HTMLElement,
  rows: RelationPreviewRow[],
  selectedRelationId: number | null
): void {
  if (rows.length === 0) {
    container.innerHTML = `<p class="table-empty">No relations to show.</p>`;
    return;
  }

  const head = ["id", "ways", "nodes", "tags"];
  const headerHtml = head.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const rowsHtml = rows
    .map(({ relation, wayCount, nodeCount }) => {
      const selected =
        selectedRelationId === relation.id ? ' class="row-selected"' : "";
      return `<tr data-relation-id="${relation.id}"${selected}>${[
        cell(relation.id),
        cell(wayCount),
        cell(nodeCount),
        cell(formatTags(relation.tags), true),
      ].join("")}</tr>`;
    })
    .join("");

  container.innerHTML = `
    <div class="table-meta">Showing first ${rows.length.toLocaleString()} relations — click a row for details (ways/nodes = transitive counts)</div>
    <div class="table-scroll">
      <table class="preview-table">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;

  updateTableSelection(container, selectedRelationId);
}

export function clearTable(container: HTMLElement): void {
  container.innerHTML = "";
}
