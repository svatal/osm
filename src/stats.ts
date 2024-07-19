import * as fs from "fs";
import type { Data } from "./collect.js";
import type { OSMItem } from "./osmTypes.js";

const maskNumberData = true;

type Description = {
  count: number;
  inRelationCount: number;
  inClosedWayCount: number;
  inOpenWayCount: number;
  standaloneCount: number;
  children: null | Map<string, Description>;
};

function createEmptyDescription(): Description {
  return {
    count: 0,
    inRelationCount: 0,
    inClosedWayCount: 0,
    inOpenWayCount: 0,
    standaloneCount: 0,
    children: null,
  };
}

export function exportStatsToFile(input: Data, fileName: string) {
  var ctx = new Ctx(input);
  input.metadata.forEach((meta) => visit(undefined, meta, ctx));
  input.nodes.forEach((node) => visit("node", node, ctx));
  input.ways.forEach((way) => visit("way", way, ctx));
  input.relations.forEach((relation) => visit("relation", relation, ctx));
  exportMapToFile(ctx.data, fileName);
}

class Ctx {
  relationUsedInRelations = new Set<number>();
  wayUsedInRelations = new Set<number>();
  nodeUsedInRelations = new Set<number>();
  nodeUsedInClosedWays = new Set<number>();
  nodeUsedInOpenedWays = new Set<number>();
  data = new Map<string | undefined, Description>();
  constructor(input: Data) {
    const isClosedWay = new Set<number>();
    input.ways.forEach((way) => {
      if (way.refs.length > 1 && way.refs[0] === way.refs[way.refs.length - 1])
        isClosedWay.add(way.id);
    });
    input.relations.forEach((relation) => {
      relation.members.forEach((member) => {
        switch (member.type) {
          case "relation":
            this.relationUsedInRelations.add(member.ref);
            break;
          case "way":
            this.wayUsedInRelations.add(member.ref);
            break;
          case "node":
            this.nodeUsedInRelations.add(member.ref);
            break;
        }
      });
    });
    input.ways.forEach((way) => {
      way.refs.forEach((ref) => {
        if (isClosedWay.has(way.id)) this.nodeUsedInClosedWays.add(ref);
        else this.nodeUsedInOpenedWays.add(ref);
      });
    });
  }
}

function visit(name: string | undefined, item: OSMItem, ctx: Ctx) {
  let stat = ctx.data.get(name);
  if (!stat) {
    stat = createEmptyDescription();
    ctx.data.set(name, stat);
  }
  const visited = new Set<Description>();
  visited.add(stat);
  for (let [path, value] of describe(item)) {
    let desc = stat;
    path = [...path, value];
    while (path.length) {
      let pathFragment = path.shift()!;
      if (desc.children === null) {
        desc.children = new Map<string, Description>();
      }
      let next = desc.children.get(pathFragment);
      if (!next) {
        next = createEmptyDescription();
        desc.children.set(pathFragment, next);
      }
      desc = next;
      visited.add(desc);
    }
  }
  const isInRelation =
    (item.type === "relation" && ctx.relationUsedInRelations.has(item.id)) ||
    (item.type === "way" && ctx.wayUsedInRelations.has(item.id)) ||
    (item.type === "node" && ctx.nodeUsedInRelations.has(item.id));
  const isInClosedWay =
    item.type === "node" && ctx.nodeUsedInClosedWays.has(item.id);
  const isInOpenWay =
    item.type === "node" && ctx.nodeUsedInOpenedWays.has(item.id);
  visited.forEach((d) => {
    d.count++;
    if (isInRelation) d.inRelationCount++;
    if (isInClosedWay) d.inClosedWayCount++;
    if (isInOpenWay) d.inOpenWayCount++;
    if (!isInRelation && !isInClosedWay && !isInOpenWay) d.standaloneCount++;
  });
}

function exportMapToFile(
  data: Map<string | undefined, Description>,
  fileName: string
) {
  const file = fs.createWriteStream(`output/${fileName}-stats.xml`);
  file.write(`<?xml version="1.0" encoding="UTF-8"?>\n`);
  file.write(`<stats>\n`);
  for (let [name, desc] of data) {
    file.write(`<${name} count="${desc.count}">\n`);
    write(desc, file);
    file.write(`</${name}>\n`);
  }
  file.write(`</stats>\n`);
  file.close();
}

function describe(obj: unknown, path: string[] = []): [string[], string][] {
  if (
    typeof obj === "number" ||
    (maskNumberData && typeof obj === "string" && !isNaN(+obj))
  )
    return [[path, "<number>"]];
  if (typeof obj === "string") return [[path, obj]];
  if (obj === null) return [[path, "<null>"]];
  if (obj === undefined) return [];
  if (typeof obj === "object") {
    return Object.entries(obj).flatMap(([key, value]) => {
      const sanitizedKey = isNaN(+key) ? key : "[]";
      return describe(value, [...path, sanitizedKey]);
    });
  } else {
    console.log(
      `Unexpected type at path ${path.join(".")}: ${typeof obj}, ${obj}`
    );
    return [];
  }
}

function write(p: Description, file: fs.WriteStream, indent: number = 0) {
  if (p.children === null) return;
  let indentS = " ".repeat(++indent);
  for (let [key, value] of [...p.children.entries()].sort(
    ([_a, ad], [_b, bd]) => bd.count - ad.count
  )) {
    const sanitizedKey = key
      .replaceAll("\n", "\\n")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("'", "&apos;");
    let tag = `${indentS}<e name="${sanitizedKey}" count="${value.count}"`;
    if (value.inRelationCount)
      tag += ` inRelationCount="${value.inRelationCount}"`;
    if (value.inClosedWayCount)
      tag += ` inClosedWayCount="${value.inClosedWayCount}"`;
    if (value.inOpenWayCount)
      tag += ` inOpenWayCount="${value.inOpenWayCount}"`;
    if (value.standaloneCount)
      tag += ` standaloneCount="${value.standaloneCount}"`;
    if (value.children === null) {
      file.write(`${tag}/>\n`);
    } else {
      file.write(`${tag}>\n`);
      write(value, file, indent);
      file.write(`${indentS}</e>\n`);
    }
  }
}
