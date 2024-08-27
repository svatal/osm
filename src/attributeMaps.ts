import { createWriteStream, mkdirSync } from "fs";
import type { Data } from "./collect.js";
import { rangeTracker } from "./mapHelpers.js";
import { closeMap, openMap, transformMapCoordinates } from "./svgHelpers.js";
import { isOpen } from "./osmTypes.js";

export function exportAttributeMapsToFiles(data: Data, fileName: string) {
  const nodes = rangeTracker(data.nodes);
  const ways = data.ways;

  const tags = new Map<
    string,
    {
      values: Map<string, number>;
      ways: { path: string; isOpen: boolean; valueIdx: number }[];
    }
  >();
  mkdirSync("output/attrMaps", { recursive: true });

  ways.forEach((way) => {
    if (!way.tags) return;
    const d = `M${way.refs
      .map(nodes.getNode)
      .filter((node) => node !== null)
      .map((node) => `${node.lon} ${node.lat}`)
      .join("L")}`;
    Object.keys(way.tags).forEach((tagName) => {
      const value = way.tags![tagName]!;
      var entry = tags.get(tagName);
      if (!entry) {
        entry = { values: new Map<string, number>(), ways: [] };
        tags.set(tagName, entry);
      }
      if (!entry.values.has(value)) {
        entry.values.set(value, entry.values.size);
      }
      const idx = entry.values.get(value)!;
      entry.ways.push({ path: d, isOpen: isOpen(way), valueIdx: idx });
    });
  });

  const ranges = nodes.getRanges();
  if (!ranges) return;

  tags.forEach((entry, tagName) => {
    const stream = createWriteStream(
      `output/attrMaps/${fileName}-${tagName.replaceAll(":", "_")}.svg`
    );
    stream.write(openMap(ranges));
    stream.write(
      "<style>path { stroke-width: 0.0001; }\npath.o { fill: none; }"
    );
    [...entry.values].forEach(([value, idx]) => {
      const color = "#000";
      stream.write(`\npath.v${idx} { fill: ${color}; stroke: ${color}; }`);
    });
    stream.write("\n</style>");
    stream.write(`<g ${transformMapCoordinates(ranges)}>`);
    entry.ways.forEach(({ path, isOpen, valueIdx }) => {
      stream.write(
        `<path class="v${valueIdx}${isOpen ? " o" : ""}" d="${path}" />`
      );
    });

    stream.write("</g>");
    stream.write(closeMap());
    stream.close();
  });
}
