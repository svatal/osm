import type { OSMItem, OSMNode, OSMRelation, OSMWay } from "./osmTypes.js";

export class Data {
  nodes = new Map<number, OSMNode>();
  ways = new Map<number, OSMWay>();
  relations = new Map<number, OSMRelation>();

  visit(item: OSMItem) {
    switch (item.type) {
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
