import type { OSMNode } from "./osmTypes.js";

export type Range = { min: number; max: number };
export type Ranges = { lat: Range; lon: Range };

export function rangeTracker(nodes: Map<number, OSMNode>) {
  let latRange: Range | undefined = undefined;
  let lonRange: Range | undefined = undefined;
  return {
    getNode: (id: number): OSMNode | null => {
      const node = nodes.get(id);
      if (!node) {
        // console.log("Node not found: " + id);
        return null;
      }
      if (latRange) {
        latRange.min = Math.min(latRange.min, node.lat);
        latRange.max = Math.max(latRange.max, node.lat);
      } else {
        latRange = { min: node.lat, max: node.lat };
      }
      if (lonRange) {
        lonRange.min = Math.min(lonRange.min, node.lon);
        lonRange.max = Math.max(lonRange.max, node.lon);
      } else {
        lonRange = { min: node.lon, max: node.lon };
      }
      return node;
    },
    getRanges: () =>
      latRange && lonRange ? { lat: latRange, lon: lonRange } : undefined,
  };
}
