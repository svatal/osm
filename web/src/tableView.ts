import type { OsmRelation, OsmTags } from "@osmix/shared/types";
import type { RelationPreviewRow } from "./counts";

const TRUNCATE_AT = 80;

function truncate(text: string): string {
  if (text.length <= TRUNCATE_AT) return text;
  return `${text.slice(0, TRUNCATE_AT - 1)}…`;
}

function formatMembers(relation: OsmRelation): string {
  return truncate(
    relation.members
      .map((m) => `${m.type}/${m.ref}${m.role ? `:${m.role}` : ""}`)
      .join(", ")
  );
}

const TAG_VALUE_MAX = 50;

function shouldShowTag(key: string): boolean {
  if (key.includes("name:cs")) return true;
  if (key.includes("name:")) return false;
  return true;
}

function shortenTagValue(value: string | number): string {
  const text = String(value);
  if (text.length <= TAG_VALUE_MAX) return text;
  return `${text.slice(0, TAG_VALUE_MAX - 1)}…`;
}

function formatTags(tags: OsmTags | undefined): string {
  if (!tags) return "";
  return Object.entries(tags)
    .filter(([key]) => shouldShowTag(key))
    .map(([key, value]) => `${key}=${shortenTagValue(value)}`)
    .join("; ");
}

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

/**
 * Renders a table of relations with transitive way/node reference counts
 * and a single tags column (all present key=value pairs).
 */
export function renderTable(
  container: HTMLElement,
  rows: RelationPreviewRow[]
): void {
  if (rows.length === 0) {
    container.innerHTML = `<p class="table-empty">No relations to show.</p>`;
    return;
  }

  const head = ["id", "ways", "nodes", "members", "tags"];
  const headerHtml = head.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const rowsHtml = rows
    .map(({ relation, wayCount, nodeCount }) => {
      return `<tr>${[
        cell(relation.id),
        cell(wayCount),
        cell(nodeCount),
        cell(formatMembers(relation)),
        cell(formatTags(relation.tags), true),
      ].join("")}</tr>`;
    })
    .join("");

  container.innerHTML = `
    <div class="table-meta">Showing first ${rows.length.toLocaleString()} relations (ways/nodes = transitive referenced counts; full dataset kept in memory for filtering)</div>
    <div class="table-scroll">
      <table class="preview-table">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;
}

export function clearTable(container: HTMLElement): void {
  container.innerHTML = "";
}
