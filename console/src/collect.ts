import type {
  OSMItem,
  OSMMetadata,
  OSMNode,
  OSMRelation,
  OSMWay,
} from "./osmTypes.js";

export class Data {
  metadata: OSMMetadata[] = [];
  nodes = new Map<number, OSMNode>();
  ways = new Map<number, OSMWay>();
  relations = new Map<number, OSMRelation>();

  visit(item: OSMItem) {
    switch (item.type) {
      case undefined:
        this.metadata.push(item);
        break;
      case "node":
        this.nodes.set(item.id, item);
        break;
      case "way":
        this.ways.set(item.id, item);
        break;
      case "relation":
        this.relations.set(item.id, item);
        break;
    }
  }
}
