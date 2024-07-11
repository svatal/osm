type Description = Map<string, Set<string> | Description>;

export class Stats {
  private data = new Map<
    string | undefined,
    { count: number; description: Description }
  >();

  visit(name: string | undefined, item: unknown) {
    let stat = this.data.get(name);
    if (!stat) {
      stat = {
        count: 0,
        description: new Map<string, Set<string> | Description>(),
      };
      this.data.set(name, stat);
    }
    stat.count++;
    for (let [path, value] of describe(item)) {
      let desc: Set<string> | Description = stat.description;
      while (path.length) {
        let pathFragment = path.shift()!;
        if (desc instanceof Set) {
          throw new Error("Unexpected set in description tree");
        }
        let next = desc.get(pathFragment);
        if (!next) {
          next = path.length
            ? new Map<string, Set<string> | Description>()
            : new Set<string>();
          desc.set(pathFragment, next);
        }
        desc = next;
      }
      if (desc instanceof Map) {
        throw new Error("Unexpected map in description tree");
      }
      desc.add(value);
    }
  }

  print(name: string) {
    print(this.data, name);
  }
}

function describe(obj: unknown, path: string[] = []): [string[], string][] {
  if (typeof obj === "number") return [[path, "<number>"]];
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

function print(
  stats: Map<string | undefined, { count: number; description: Description }>,
  name: string
) {
  const stat = stats.get(name)!;
  console.log(name, stat.count);
  print2(stat.description);
}

function print2(p: Set<string> | Description, indent: number = 0) {
  let indentS = " ".repeat(++indent);
  if (p instanceof Set) {
    console.log(indentS, `(${p.size})`, [...p.values()].slice(0, 5).join(","));
  } else {
    const entries = [...p.entries()];
    for (let [key, value] of entries.slice(0, 5)) {
      console.log(indentS, key);
      print2(value, indent);
    }
    if (entries.length > 5)
      console.log(indentS, `... ${entries.length - 5} more`);
  }
}
