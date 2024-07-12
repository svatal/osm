import { createOSMStream } from "osm-pbf-parser-node";
import type { OSMItem } from "./osmTypes.js";
import { Stats } from "./stats.js";
import * as fs from "fs";
import { Data } from "./collect.js";
import { exportMapToFile } from "./map.js";

const inputName = "kralovehradecky-latest";
const doDump = false;
const doStats = true;
const doMap = false;

doIt();

async function doIt() {
  const startTime = Date.now();
  const stats = doStats ? new Stats() : null;
  const dump = doDump
    ? fs.createWriteStream(`output/${inputName}-dump.txt`)
    : null;
  const collector = new Data();
  for await (let it of createOSMStream(`input/${inputName}.osm.pbf`)) {
    const item = it as OSMItem;
    stats?.visit(item.type, item);
    dump?.write(JSON.stringify(item) + "\n");
    collector.visit(item);
  }
  dump?.close();

  const loadedTime = Date.now();
  console.log("Loaded in", loadedTime - startTime, "ms");

  if (stats) {
    stats.exportMapToFile(inputName);
  }
  if (doMap) {
    exportMapToFile(collector, () => true, inputName);
  }

  console.log("Done in", Date.now() - loadedTime, "ms");
}
