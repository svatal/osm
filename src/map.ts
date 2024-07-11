import * as fs from "fs";
import type { Data } from "./collect.js";
import type { OSMNode, OSMWay } from "./osmTypes.js";

type Range = { min: number; max: number };

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

  const paths = [...ways.values()].filter(waysFilter).map((way) => {
    const wayNodes = way.refs.map(getNode).filter((node) => node !== null);
    return `<path d="M${wayNodes
      .map((node) => `${node.lon} ${node.lat}`)
      .join("L")}"/>`;
  });

  const content =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${lonRange!.min} ${
      latRange!.min
    } ${lonRange!.max - lonRange!.min} ${latRange!.max - latRange!.min}">` +
    `<style>path { fill: none; stroke: black; stroke-width: 0.0001; }</style>` +
    `<g transform="translate(0, ${
      latRange!.min + latRange!.max
    }) scale(1 -1)">` +
    paths.join("") +
    `</g>` +
    `</svg>`;
  fs.writeFileSync(`output/${fileName}.svg`, content);
}
