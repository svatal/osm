import type {
  Counts,
  EntityDetail,
  ParseWorkerRequest,
  ParseWorkerResponse,
} from "./counts";
import { PREVIEW_LIMIT } from "./counts";
import type { Data } from "./data";
import { countRelationRefs } from "./relationRefs";
import { parsePbfToData } from "./pbfParsePipeline";

/** Parsed dataset kept in the worker for later filtering (no re-read of the PBF). */
let dataset: Data | null = null;

function getEntityDetail(data: Data, ref: EntityDetail["ref"]): EntityDetail {
  switch (ref.type) {
    case "node": {
      const entity = data.nodes.get(ref.id) ?? null;
      return { ref, entity };
    }
    case "way": {
      const entity = data.ways.get(ref.id) ?? null;
      return { ref, entity };
    }
    case "relation": {
      const entity = data.relations.get(ref.id) ?? null;
      if (!entity) return { ref, entity: null };
      const { wayCount, nodeCount } = countRelationRefs(entity, data);
      return { ref, entity, wayCount, nodeCount };
    }
  }
}

self.onmessage = async (event: MessageEvent<ParseWorkerRequest>) => {
  const msg = event.data;

  if (msg.type === "getEntityDetail") {
    if (!dataset) {
      const missing: ParseWorkerResponse = {
        type: "entityDetail",
        detail: { ref: msg.ref, entity: null },
      };
      self.postMessage(missing);
      return;
    }
    const response: ParseWorkerResponse = {
      type: "entityDetail",
      detail: getEntityDetail(dataset, msg.ref),
    };
    self.postMessage(response);
    return;
  }

  if (msg.type !== "parse") return;

  dataset = null;

  const postProgress = (counts: Counts) => {
    const progress: ParseWorkerResponse = { type: "progress", counts };
    self.postMessage(progress);
  };

  try {
    dataset = await parsePbfToData(msg.file, postProgress);
    const done: ParseWorkerResponse = {
      type: "done",
      counts: dataset.counts,
      preview: dataset.previewRelations(PREVIEW_LIMIT),
    };
    self.postMessage(done);
  } catch (err) {
    dataset = null;
    const error: ParseWorkerResponse = {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(error);
  }
};
