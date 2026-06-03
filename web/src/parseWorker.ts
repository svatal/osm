import type { Counts, ParseWorkerRequest, ParseWorkerResponse } from "./counts";
import { countEntitiesInPbf } from "./pbfCountPipeline";

self.onmessage = async (event: MessageEvent<ParseWorkerRequest>) => {
  if (event.data.type !== "parse") return;

  const postProgress = (counts: Counts) => {
    const msg: ParseWorkerResponse = { type: "progress", counts };
    self.postMessage(msg);
  };

  try {
    const counts = await countEntitiesInPbf(event.data.file, postProgress);
    const done: ParseWorkerResponse = { type: "done", counts };
    self.postMessage(done);
  } catch (err) {
    const error: ParseWorkerResponse = {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(error);
  }
};
