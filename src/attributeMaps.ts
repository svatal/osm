import { createWriteStream, mkdirSync } from "fs";
import type { Data } from "./collect.js";
import { rangeTracker, type Ranges } from "./rangeTracker.js";
import { closeMap, openMap, transformMapCoordinates } from "./svgHelpers.js";
import { isOpen, type OSMNode } from "./osmTypes.js";
import uniqolor from "uniqolor";
import { getRelationWays, mergeWays } from "./relationHelper.js";

export function exportWayAttributeMapsToFiles(data: Data, fileName: string) {
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
    "output/attrMaps_ways",
    fileName,
    ranges,
    (stream, entry) =>
      stream.write(
        `<path ${entry.isOpen ? `class="o" ` : ""}d="${entry.path}" />`
      )
  );
}

export function exportRelationAttributeMapsToFiles(
  data: Data,
  fileName: string
) {
  const nodes = rangeTracker(data.nodes);
  const relations = data.relations;

  const tags = createTagMap<{ path: string; isOpen: boolean }[]>();
  relations.forEach((rel) => {
    if (!rel.tags) return;
    const ways = getRelationWays(rel, data.relations, data.ways);
    const merged = mergeWays(ways);
    if (merged.length === 0 || merged.every((m) => m.refs.length === 0)) return;
    createTagValues(
      tags,
      rel.tags,
      merged.map((way) => ({ path: getPath(way, nodes), isOpen: isOpen(way) }))
    );
  });

  const ranges = nodes.getRanges();
  if (!ranges) return;

  writeToFiles(
    tags,
    "output/attrMaps_relations",
    fileName,
    ranges,
    (stream, entries) =>
      entries.forEach((entry) =>
        stream.write(
          `<path ${entry.isOpen ? `class="o" ` : ""}d="${entry.path}" />`
        )
      )
  );
}

function getPath(
  way: { refs: number[] },
  nodes: { getNode: (id: number) => OSMNode | null }
) {
  return `M${way.refs
    .map(nodes.getNode)
    .filter((node) => node !== null)
    .map((node) => `${node.lon} ${node.lat}`)
    .join("L")}`;
}

type TagDict = { [key: string]: string };
type TagValueEntry<TPayload> = { payload: TPayload; allTags: TagDict };
type TagMap<TPayload> = Map<string, Map<string, TagValueEntry<TPayload>[]>>;

function createTagMap<TPayload>(): TagMap<TPayload> {
  return new Map<string, Map<string, TagValueEntry<TPayload>[]>>();
}

function createTagValues<TPayload>(
  tagMap: TagMap<TPayload>,
  tags: { [key: string]: string },
  payload: TPayload
) {
  Object.keys(tags).forEach((tagName) => {
    const value = tags![tagName]!;
    var tagEntry = tagMap.get(tagName);
    if (!tagEntry) {
      tagEntry = new Map<string, TagValueEntry<TPayload>[]>();
      tagMap.set(tagName, tagEntry);
    }
    if (!tagEntry.has(value)) {
      tagEntry.set(value, []);
    }
    const valueEntry = tagEntry.get(value)!;
    valueEntry.push({ payload, allTags: tags });
  });
}

function writeToFiles<TPayload>(
  tags: TagMap<TPayload>,
  outDir: string,
  fileName: string,
  ranges: Ranges,
  writeWayEntry: (stream: any, wayEntry: TPayload) => void
) {
  mkdirSync(outDir, { recursive: true });
  tags.forEach((entry, tagName) => {
    const stream = createWriteStream(
      `${outDir}/${fileName}-${tagName.replaceAll(":", "_")}.svg`
    );
    stream.write(openMap(ranges));
    stream.write("<style>");
    const values = [...entry.keys()];
    values.forEach((value, idx) => {
      const color = uniqolor(value).color;
      stream.write(
        `\n.v${idx} path { fill: ${color}; stroke: ${color}; <!-- ${value} --> }`
      );
    });
    // const reverseValues = new Map([...entry.values].map(([k, v]) => [v, k]));
    stream.write(
      "\npath { stroke-width: 0.0001; fill-opacity: 0.4; }\npath.o { fill: none; }\n</style>"
    );
    stream.write(`<g ${transformMapCoordinates(ranges)}>`);
    values.forEach((value, idx) => {
      const valueEntries = entry.get(value)!;
      stream.write(`<g class="v${idx}"> <!-- ${value} -->`);
      valueEntries.forEach((entry) => {
        stream.write(`<g> <!--\n`);
        Object.keys(entry.allTags).forEach((tagName) =>
          stream.write(
            `${tagName}: ${safeInComment(entry.allTags[tagName]!)}\n`
          )
        );
        stream.write("-->");
        writeWayEntry(stream, entry.payload);
        stream.write("</g>");
      });
      stream.write("</g>");
    });

    stream.write("</g>");
    stream.write(closeMap());
    stream.close();
  });
}

function safeInComment(s: string) {
  return s.replaceAll("--", "- -");
}
