import { createOSMStream } from "osm-pbf-parser-node";
import type { OSMItem } from "./osmTypes.js";
import { exportStatsToFile } from "./stats.js";
import * as fs from "fs";
import { Data } from "./collect.js";
import { exportMapToFile } from "./map.js";
import { exportRelationAttributeMapsToFiles, exportWayAttributeMapsToFiles } from "./attributeMaps.js";

const inputName = "kralovehradecky-latest";
const doDump = false;
const doStats = false;
const doMap = false;
const doWayAttributeMaps = false;
const doRelationAttributeMaps = true;

void doIt();

async function doIt() {
  const startTime = Date.now();
  const dump = doDump ? fs.createWriteStream(`output/${inputName}-dump.txt`) : null;
  const collector = new Data();
  for await (const it of createOSMStream(`../input/${inputName}.osm.pbf`)) {
    const item = it as OSMItem;
    dump?.write(JSON.stringify(item) + "\n");
    collector.visit(item);
  }
  dump?.close();

  const loadedTime = Date.now();
  console.log("Loaded in", loadedTime - startTime, "ms");

  if (doStats) {
    exportStatsToFile(collector, inputName);
  }
  if (doMap) {
    exportMapToFile(collector, () => true, inputName);
  }
  if (doWayAttributeMaps) {
    await exportWayAttributeMapsToFiles(collector, inputName);
  }
  if (doRelationAttributeMaps) {
    await exportRelationAttributeMapsToFiles(collector, inputName);
  }

  console.log("Done in", Date.now() - loadedTime, "ms, at", new Date());
}
