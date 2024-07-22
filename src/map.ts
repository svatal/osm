import * as fs from "fs";
import type { Data } from "./collect.js";
import { isOpen, type OSMNode, type OSMWay } from "./osmTypes.js";

type Range = { min: number; max: number };
const includeUnknownLines = false;

export function exportMapToFile(
  data: Data,
  waysFilter: (way: OSMWay) => boolean,
  fileName: string
) {
  const nodes = data.nodes;
  const ways = data.ways;
  const relations = data.relations;

  let latRange: Range | undefined = undefined;
  let lonRange: Range | undefined = undefined;
  function getNode(id: number): OSMNode | null {
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
  }

  const paths = [...ways.values()]
    .filter(waysFilter)
    .map((way) => {
      const wayNodes = way.refs.map(getNode).filter((node) => node !== null);
      const d = `M${wayNodes
        .map((node) => `${node.lon} ${node.lat}`)
        .join("L")}`;
      let cls = [
        way.tags?.["building"] ? "building" : undefined,
        way.tags?.["landuse"] === "meadow" ||
        way.tags?.["landuse"] === "forest" ||
        way.tags?.["landuse"] === "orchard"
          ? "forest"
          : undefined,
        way.tags?.["landuse"] === "farmland" ||
        way.tags?.["landuse"] === "grass" ||
        way.tags?.["landuse"] === "farmyard"
          ? "field"
          : undefined,
        way.tags?.["waterway"] ||
        way.tags?.["water"] ||
        way.tags?.["natural"] === "water" ||
        way.tags?.["leisure"] === "swimming_pool"
          ? "water"
          : undefined,
        way.tags?.["highway"] ? "highway" : undefined,
        way.tags?.["railway"] ? "railway" : undefined,
        isOpen(way) ? "o" : undefined,
      ].filter((cls) => cls !== undefined);
      return cls.length
        ? `<path class="${cls.join(" ")}" d="${d}"/>`
        : includeUnknownLines
        ? `<path d="${d}"/>`
        : undefined;
    })
    .filter((path) => path !== undefined);

  const content =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${lonRange!.min} ${
      latRange!.min
    } ${lonRange!.max - lonRange!.min} ${latRange!.max - latRange!.min}">` +
    `<style>
    path { fill: none; stroke: black; stroke-width: 0.0001; }
    .building { fill: sandybrown; stroke: brown; }
    .forest { fill: darkgreen; stroke: darkgreen; }
    .field { fill: beige; stroke: beige; }
    .water { fill: lightskyblue; stroke: lightskyblue; }
    .highway { fill: green; stroke: green; }
    .railway { stroke: black; stroke-dasharray: 0.001, 0.001; }
    path.o { fill: none; }
    </style>` +
    `<g transform="translate(0, ${
      latRange!.min + latRange!.max
    }) scale(1 -1)">` +
    paths.join("") +
    `</g>` +
    `</svg>`;
  fs.writeFileSync(`output/${fileName}.svg`, content);
}
