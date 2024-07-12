import * as fs from "fs";

type Description = { count: number; children: null | Map<string, Description> };
const maskNumberData = true;

export class Stats {
  private data = new Map<string | undefined, Description>();

  visit(name: string | undefined, item: unknown) {
    let stat = this.data.get(name);
    if (!stat) {
      stat = {
        count: 0,
        children: null,
      };
      this.data.set(name, stat);
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
          next = {
            count: 0,
            children: null,
          };
          desc.children.set(pathFragment, next);
        }
        desc = next;
        visited.add(desc);
      }
    }
    visited.forEach((d) => d.count++);
  }

  exportMapToFile(fileName: string) {
    const file = fs.createWriteStream(`output/${fileName}-stats.txt`);
    for (let [name, desc] of this.data) {
      file.write(`${name}: ${desc.count}\n`);
      write(desc, file);
    }
    file.close();
  }
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
    file.write(`${indentS}(${value.count}) ${key.replaceAll("\n", "\\n")}\n`);
    write(value, file, indent);
  }
}
