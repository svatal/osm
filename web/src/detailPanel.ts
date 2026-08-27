import type {
  OsmNode,
  OsmRelationMember,
  OsmWay,
} from "@osmix/shared/types";
import type { EntityDetail } from "./counts";
import type { EntityRef } from "./entityRef";
import { entityRefLabel } from "./entityRef";
import { formatTags } from "./tags";

export type DetailPanelHandlers = {
  onBreadcrumbClick: (index: number) => void;
  onMemberClick: (ref: EntityRef) => void;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderBreadcrumb(stack: EntityRef[]): string {
  if (stack.length === 0) return "";

  const items = stack.map((ref, index) => {
    const label = escapeHtml(entityRefLabel(ref));
    const isLast = index === stack.length - 1;
    if (isLast) {
      return `<span class="breadcrumb-current">${label}</span>`;
    }
    return `<button type="button" class="breadcrumb-link" data-breadcrumb-index="${index}">${label}</button>`;
  });

  return `<nav class="breadcrumb" aria-label="Navigation">${items.join('<span class="breadcrumb-sep">›</span>')}</nav>`;
}

function renderMemberRow(
  memberType: string,
  ref: number,
  role: string | undefined
): string {
  const roleText = role ? escapeHtml(role) : "";
  return `<tr class="member-row" data-member-type="${escapeHtml(memberType)}" data-member-id="${ref}">
    <td>${escapeHtml(memberType)}</td>
    <td><button type="button" class="member-link" data-member-type="${escapeHtml(memberType)}" data-member-id="${ref}">${ref}</button></td>
    <td>${roleText}</td>
  </tr>`;
}

function renderDirectMembers(detail: EntityDetail): string {
  const { entity } = detail;
  if (!entity) return "";

  if ("members" in entity) {
    const rows = entity.members
      .map((m: OsmRelationMember) =>
        renderMemberRow(m.type, m.ref, m.role)
      )
      .join("");
    return `
      <section class="detail-section">
        <h3>Direct members (${entity.members.length})</h3>
        <div class="members-scroll">
          <table class="members-table">
            <thead><tr><th>type</th><th>ref</th><th>role</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
  }

  if ("refs" in entity) {
    const way = entity as OsmWay;
    const rows = way.refs
      .map((ref) => renderMemberRow("node", ref, undefined))
      .join("");
    return `
      <section class="detail-section">
        <h3>Direct members (${way.refs.length} nodes)</h3>
        <div class="members-scroll">
          <table class="members-table">
            <thead><tr><th>type</th><th>ref</th><th>role</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
  }

  return "";
}

function renderSummary(detail: EntityDetail): string {
  const { ref, entity, wayCount, nodeCount } = detail;
  const rows: string[] = [
    `<tr><th>type</th><td>${escapeHtml(ref.type)}</td></tr>`,
    `<tr><th>id</th><td>${ref.id}</td></tr>`,
  ];

  if (!entity) {
    rows.push(
      `<tr><th>status</th><td class="detail-missing">Not found in dataset</td></tr>`
    );
    return `<table class="detail-summary">${rows.join("")}</table>`;
  }

  if ("lat" in entity) {
    const node = entity as OsmNode;
    rows.push(
      `<tr><th>lat</th><td>${node.lat}</td></tr>`,
      `<tr><th>lon</th><td>${node.lon}</td></tr>`
    );
  }

  if ("refs" in entity) {
    rows.push(
      `<tr><th>nodes</th><td>${entity.refs.length} (direct)</td></tr>`
    );
  }

  if ("members" in entity) {
    rows.push(
      `<tr><th>ways</th><td>${wayCount ?? "—"} (transitive)</td></tr>`,
      `<tr><th>nodes</th><td>${nodeCount ?? "—"} (transitive)</td></tr>`,
      `<tr><th>members</th><td>${entity.members.length} (direct)</td></tr>`
    );
  }

  const tags = formatTags(entity.tags);
  if (tags) {
    rows.push(
      `<tr><th>tags</th><td class="detail-tags">${escapeHtml(tags)}</td></tr>`
    );
  }

  return `<table class="detail-summary">${rows.join("")}</table>`;
}

export function renderDetailPanel(
  container: HTMLElement,
  stack: EntityRef[],
  detail: EntityDetail | null,
  handlers: DetailPanelHandlers
): void {
  if (stack.length === 0 || !detail) {
    container.innerHTML = "";
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.innerHTML = `
    <div class="detail-panel-inner">
      ${renderBreadcrumb(stack)}
      ${renderSummary(detail)}
      ${renderDirectMembers(detail)}
    </div>
  `;

  container.querySelectorAll<HTMLButtonElement>(".breadcrumb-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.breadcrumbIndex);
      handlers.onBreadcrumbClick(index);
    });
  });

  container.querySelectorAll<HTMLButtonElement>(".member-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.memberType as EntityRef["type"];
      const id = Number(btn.dataset.memberId);
      handlers.onMemberClick({ type, id });
    });
  });
}

export function clearDetailPanel(container: HTMLElement): void {
  container.innerHTML = "";
  container.hidden = true;
}
