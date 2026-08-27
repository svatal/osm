import type { RelationPreviewRow } from "./counts";
import { formatTags } from "./tags";

type Props = {
  rows: RelationPreviewRow[];
  selectedRelationId: number | null;
  onRelationSelect: (relationId: number) => void;
};

export function RelationTable({
  rows,
  selectedRelationId,
  onRelationSelect,
}: Props) {
  if (rows.length === 0) {
    return <p class="table-empty">No relations to show.</p>;
  }

  return (
    <>
      <div class="table-meta">
        Showing first {rows.length.toLocaleString()} relations — click a row for
        details (ways/nodes = transitive counts)
      </div>
      <div class="table-scroll">
        <table class="preview-table">
          <thead>
            <tr>
              <th>id</th>
              <th>ways</th>
              <th>nodes</th>
              <th>tags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ relation, wayCount, nodeCount }) => (
              <tr
                key={relation.id}
                class={
                  selectedRelationId === relation.id ? "row-selected" : undefined
                }
                onClick={() => onRelationSelect(relation.id)}
              >
                <td>{relation.id}</td>
                <td>{wayCount}</td>
                <td>{nodeCount}</td>
                <td class="cell-wrap">{formatTags(relation.tags)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
