import type { OsmRelation } from "@osmix/shared/types";
import type { Data } from "./data";

/**
 * Count unique ways and nodes referenced by a relation, including members of
 * nested relations (transitive). Nodes include direct node members and all
 * node refs of referenced ways that exist in the dataset.
 */
export function countRelationRefs(
  relation: OsmRelation,
  data: Pick<Data, "ways" | "relations">
): { wayCount: number; nodeCount: number } {
  const wayIds = new Set<number>();
  const nodeIds = new Set<number>();
  const visited = new Set<number>();

  const walk = (rel: OsmRelation) => {
    if (visited.has(rel.id)) return;
    visited.add(rel.id);

    for (const member of rel.members) {
      switch (member.type) {
        case "node":
          nodeIds.add(member.ref);
          break;
        case "way": {
          wayIds.add(member.ref);
          const way = data.ways.get(member.ref);
          if (!way) break;
          for (const ref of way.refs) {
            nodeIds.add(ref);
          }
          break;
        }
        case "relation": {
          const child = data.relations.get(member.ref);
          if (child) walk(child);
          break;
        }
      }
    }
  };

  walk(relation);
  return { wayCount: wayIds.size, nodeCount: nodeIds.size };
}
