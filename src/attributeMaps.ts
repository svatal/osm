import { createWriteStream, mkdirSync } from "fs";
import type { Data } from "./collect.js";
import { rangeTracker, type Ranges } from "./rangeTracker.js";
import { closeMap, openMap, transformMapCoordinates } from "./svgHelpers.js";
import { isOpen, type OSMNode, type OSMWay } from "./osmTypes.js";
import uniqolor from "uniqolor";

export function exportAttributeMapsToFiles(data: Data, fileName: string) {
  const nodes = rangeTracker(data.nodes);
  const ways = data.ways;

  const tags = createTagMap<{ path: string; isOpen: boolean }>();
  ways.forEach((way) => {
    if (!way.tags) return;
    const d = getPath(way, nodes);
    createTagValues(tags, way.tags, {
      path: d,
      isOpen: isOpen(way),
    });
  });

  const ranges = nodes.getRanges();
  if (!ranges) return;

  writeToFiles(
    tags,
    "output/attrMaps",
    fileName,
    ranges,
    (stream, entry, valueIdx) =>
      stream.write(
        `<path class="v${valueIdx}${entry.isOpen ? " o" : ""}" d="${
          entry.path
        }" />`
      )
  );
}

function getPath(
  way: OSMWay,
  nodes: { getNode: (id: number) => OSMNode | null }
) {
  return `M${way.refs
    .map(nodes.getNode)
    .filter((node) => node !== null)
    .map((node) => `${node.lon} ${node.lat}`)
    .join("L")}`;
}

interface WayEntry<TPayload> {
  payload: TPayload;
  valueIdx: number;
}

type TagMap<TPayload> = Map<
  string,
  {
    values: Map<string, number>;
    ways: WayEntry<TPayload>[];
  }
>;

function createTagMap<TPayload>(): TagMap<TPayload> {
  return new Map<
    string,
    {
      values: Map<string, number>;
      ways: { payload: TPayload; isOpen: boolean; valueIdx: number }[];
    }
  >();
}

function createTagValues<TPayload>(
  tagMap: TagMap<TPayload>,
  tags: { [key: string]: string },
  payload: TPayload
) {
  Object.keys(tags).forEach((tagName) => {
    const value = tags![tagName]!;
    var entry = tagMap.get(tagName);
    if (!entry) {
      entry = { values: new Map<string, number>(), ways: [] };
      tagMap.set(tagName, entry);
    }
    if (!entry.values.has(value)) {
      entry.values.set(value, entry.values.size);
    }
    const idx = entry.values.get(value)!;
    entry.ways.push({ payload, valueIdx: idx });
  });
}

function writeToFiles<TPayload>(
  tags: TagMap<TPayload>,
  outDir: string,
  fileName: string,
  ranges: Ranges,
  writeWayEntry: (stream: any, wayEntry: TPayload, valueIdx: number) => void
) {
  mkdirSync(outDir, { recursive: true });
  tags.forEach((entry, tagName) => {
    const stream = createWriteStream(
      `${outDir}/${fileName}-${tagName.replaceAll(":", "_")}.svg`
    );
    stream.write(openMap(ranges));
    stream.write("<style>");
    [...entry.values].forEach(([value, idx]) => {
      const color = uniqolor(value).color;
      stream.write(`\npath.v${idx} { fill: ${color}; stroke: ${color}; }`);
    });
    stream.write(
      "\npath { stroke-width: 0.0001; }\npath.o { fill: none; }\n</style>"
    );
    stream.write(`<g ${transformMapCoordinates(ranges)}>`);
    entry.ways.forEach((wayEntry) =>
      writeWayEntry(stream, wayEntry.payload, wayEntry.valueIdx)
    );

    stream.write("</g>");
    stream.write(closeMap());
    stream.close();
  });
}
