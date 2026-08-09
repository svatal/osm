import type {
  OsmEntity,
  OsmNode,
  OsmRelation,
  OsmWay,
} from "@osmix/shared/types";
import type { Counts, RelationPreviewRow } from "./counts";
import { countRelationRefs } from "./relationRefs";

/**
 * In-memory OSM store (nodes / ways / relations). Filled once when a PBF is
 * parsed; kept in the worker so filters can run without re-reading the file.
 */
export class Data {
  nodes = new Map<number, OsmNode>();
  ways = new Map<number, OsmWay>();
  relations = new Map<number, OsmRelation>();

  get counts(): Counts {
    return {
      nodes: this.nodes.size,
      ways: this.ways.size,
      relations: this.relations.size,
    };
  }

  visit(entity: OsmEntity): void {
    if ("members" in entity) {
      this.relations.set(entity.id, entity);
    } else if ("refs" in entity) {
      this.ways.set(entity.id, entity);
    } else {
      this.nodes.set(entity.id, entity);
    }
  }

  /**
   * First `limit` relations, with transitive referenced way/node counts.
   * Filtering will replace this with “first N matching the filter”.
   */
  previewRelations(limit: number): RelationPreviewRow[] {
    const out: RelationPreviewRow[] = [];
    for (const relation of this.relations.values()) {
      if (out.length >= limit) break;
      const { wayCount, nodeCount } = countRelationRefs(relation, this);
      out.push({ relation, wayCount, nodeCount });
    }
    return out;
  }
}
