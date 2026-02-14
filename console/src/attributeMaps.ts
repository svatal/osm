import { mkdirSync } from "fs";
import type { Data } from "./collect.js";
import { rangeTracker, type Ranges } from "./rangeTracker.js";
import { closeMap, openMap, transformMapCoordinates } from "./svgHelpers.js";
import { isOpen, type OSMNode } from "./osmTypes.js";
import uniqolor from "uniqolor";
import { getRelationWays, mergeWays } from "./relationHelper.js";
import { createWriteStream, type IAsyncStream } from "./asyncStream.js";

export async function exportWayAttributeMapsToFiles(
  data: Data,
  fileName: string
) {
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

  await writeToFiles(
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

export async function exportRelationAttributeMapsToFiles(
  data: Data,
  fileName: string
) {
  const nodes = rangeTracker(data.nodes);
  const relations = data.relations;

  const tags = createTagMap<{ path: string; isOpen: boolean }[]>();
  relations.forEach((rel) => {
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

  await writeToFiles(
    tags,
    "output/attrMaps_relations",
    fileName,
    ranges,
    async (stream, entries) => {
      for (const entry of entries) {
        await stream.write(
          `<path ${entry.isOpen ? `class="o" ` : ""}d="${entry.path}" />`
        );
      }
    }
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
    const value = tags[tagName]!;
    let tagEntry = tagMap.get(tagName);
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

async function writeToFiles<TPayload>(
  tags: TagMap<TPayload>,
  outDir: string,
  fileName: string,
  ranges: Ranges,
  writeWayEntry: (stream: IAsyncStream, wayEntry: TPayload) => Promise<void>
) {
  mkdirSync(outDir, { recursive: true });
  for (const [tagName, entry] of tags) {
    const stream = createWriteStream(
      `${outDir}/${fileName}-${tagName.replaceAll(":", "_")}.svg`
    );
    await stream.write(openMap(ranges));
    await stream.write("<style>");
    const values = [...entry.keys()];
    for (const [idx, value] of values.entries()) {
      const color = uniqolor(value).color;
      await stream.write(
        `\n.v${idx} path { fill: ${color}; stroke: ${color}; <!-- ${value} --> }`
      );
    }
    await stream.write(
      "\npath { stroke-width: 0.0001; fill-opacity: 0.4; }\npath.o { fill: none; }\n</style>"
    );
    await stream.write(`<g ${transformMapCoordinates(ranges)}>`);
    for (const [idx, value] of values.entries()) {
      const valueEntries = entry.get(value)!;
      await stream.write(`<g class="v${idx}"> <!-- ${value} -->`);
      for (const entry of valueEntries) {
        await stream.write(`<g> <!--\n`);
        for (const tagName in entry.allTags) {
          await stream.write(
            `${tagName}: ${safeInComment(entry.allTags[tagName]!)}\n`
          );
        }
        await stream.write("-->");
        await writeWayEntry(stream, entry.payload);
        await stream.write("</g>");
      }
      await stream.write("</g>");
    }

    await stream.write("</g>");
    await stream.write(closeMap());
    await stream.close();
  }
}

function safeInComment(s: string) {
  return s.replaceAll("--", "- -");
}
