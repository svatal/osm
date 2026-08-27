import type { OsmNode, OsmWay } from "@osmix/shared/types";
import type { EntityDetail } from "./counts";
import type { EntityRef } from "./entityRef";
import { entityRefLabel } from "./entityRef";
import { formatTags } from "./tags";

type Props = {
  stack: EntityRef[];
  detail: EntityDetail | null;
  onBreadcrumbClick: (index: number) => void;
  onMemberClick: (ref: EntityRef) => void;
};

function Breadcrumb({
  stack,
  onBreadcrumbClick,
}: {
  stack: EntityRef[];
  onBreadcrumbClick: (index: number) => void;
}) {
  if (stack.length === 0) return null;

  return (
    <nav class="breadcrumb" aria-label="Navigation">
      {stack.flatMap((ref, index) => {
        const isLast = index === stack.length - 1;
        const parts = [];
        if (index > 0) {
          parts.push(
            <span key={`sep-${index}`} class="breadcrumb-sep">
              ›
            </span>
          );
        }
        parts.push(
          isLast ? (
            <span key={`cur-${index}`} class="breadcrumb-current">
              {entityRefLabel(ref)}
            </span>
          ) : (
            <button
              key={`link-${index}`}
              type="button"
              class="breadcrumb-link"
              onClick={() => onBreadcrumbClick(index)}
            >
              {entityRefLabel(ref)}
            </button>
          )
        );
        return parts;
      })}
    </nav>
  );
}

function Summary({ detail }: { detail: EntityDetail }) {
  const { ref, entity, wayCount, nodeCount } = detail;
  const rows: { label: string; value: string | number; className?: string }[] = [
    { label: "type", value: ref.type },
    { label: "id", value: ref.id },
  ];

  if (!entity) {
    rows.push({
      label: "status",
      value: "Not found in dataset",
      className: "detail-missing",
    });
  } else {
    if ("lat" in entity) {
      const node = entity as OsmNode;
      rows.push(
        { label: "lat", value: node.lat },
        { label: "lon", value: node.lon }
      );
    }
    if ("refs" in entity) {
      rows.push({
        label: "nodes",
        value: `${entity.refs.length} (direct)`,
      });
    }
    if ("members" in entity) {
      rows.push(
        { label: "ways", value: `${wayCount ?? "—"} (transitive)` },
        { label: "nodes", value: `${nodeCount ?? "—"} (transitive)` },
        { label: "members", value: `${entity.members.length} (direct)` }
      );
    }
    const tags = formatTags(entity.tags);
    if (tags) {
      rows.push({ label: "tags", value: tags, className: "detail-tags" });
    }
  }

  return (
    <table class="detail-summary">
      <tbody>
        {rows.map(({ label, value, className }) => (
          <tr key={label}>
            <th>{label}</th>
            <td class={className}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DirectMembers({
  detail,
  onMemberClick,
}: {
  detail: EntityDetail;
  onMemberClick: (ref: EntityRef) => void;
}) {
  const { entity } = detail;
  if (!entity) return null;

  type MemberRow = { type: EntityRef["type"]; id: number; role?: string };
  let members: MemberRow[] = [];
  let heading = "";

  if ("members" in entity) {
    members = entity.members.map((m) => ({
      type: m.type,
      id: m.ref,
      role: m.role,
    }));
    heading = `Direct members (${entity.members.length})`;
  } else if ("refs" in entity) {
    const way = entity as OsmWay;
    members = way.refs.map((id) => ({ type: "node" as const, id }));
    heading = `Direct members (${way.refs.length} nodes)`;
  } else {
    return null;
  }

  return (
    <section class="detail-section">
      <h3>{heading}</h3>
      <div class="members-scroll">
        <table class="members-table">
          <thead>
            <tr>
              <th>type</th>
              <th>ref</th>
              <th>role</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={`${m.type}-${m.id}-${i}`} class="member-row">
                <td>{m.type}</td>
                <td>
                  <button
                    type="button"
                    class="member-link"
                    onClick={() => onMemberClick({ type: m.type, id: m.id })}
                  >
                    {m.id}
                  </button>
                </td>
                <td>{m.role ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DetailPanel({
  stack,
  detail,
  onBreadcrumbClick,
  onMemberClick,
}: Props) {
  if (stack.length === 0 || !detail) return null;

  return (
    <aside class="workspace-detail">
      <div class="detail-panel-inner">
        <Breadcrumb stack={stack} onBreadcrumbClick={onBreadcrumbClick} />
        <Summary detail={detail} />
        <DirectMembers detail={detail} onMemberClick={onMemberClick} />
      </div>
    </aside>
  );
}
