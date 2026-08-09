import type { Counts, ParseWorkerRequest, ParseWorkerResponse } from "./counts";
import { PREVIEW_LIMIT } from "./counts";
import type { Data } from "./data";
import { parsePbfToData } from "./pbfParsePipeline";

/** Parsed dataset kept in the worker for later filtering (no re-read of the PBF). */
let dataset: Data | null = null;

self.onmessage = async (event: MessageEvent<ParseWorkerRequest>) => {
  if (event.data.type !== "parse") return;

  dataset = null;

  const postProgress = (counts: Counts) => {
    const msg: ParseWorkerResponse = { type: "progress", counts };
    self.postMessage(msg);
  };

  try {
    dataset = await parsePbfToData(event.data.file, postProgress);
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
