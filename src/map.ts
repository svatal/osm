import * as fs from "fs";
import type { Data } from "./collect.js";
import { isOpen, type OSMWay } from "./osmTypes.js";
import { rangeTracker } from "./rangeTracker.js";
import { closeMap, openMap, transformMapCoordinates } from "./svgHelpers.js";

const includeUnknownLines = false;

export function exportMapToFile(
  data: Data,
  waysFilter: (way: OSMWay) => boolean,
  fileName: string
) {
  const nodes = rangeTracker(data.nodes);
  const ways = data.ways;
  // const relations = data.relations;

  const paths = [...ways.values()]
    .filter(waysFilter)
    .map((way) => {
      const wayNodes = way.refs
        .map(nodes.getNode)
        .filter((node) => node !== null);
      const d = `M${wayNodes
        .map((node) => `${node.lon} ${node.lat}`)
        .join("L")}`;
      const cls = [
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

  const ranges = nodes.getRanges();
  if (!ranges) return;
  const content =
    `${openMap(ranges)}` +
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
    `<g ${transformMapCoordinates(ranges)}>` +
    paths.join("") +
    `</g>` +
    closeMap();
  fs.writeFileSync(`output/${fileName}.svg`, content);
}
