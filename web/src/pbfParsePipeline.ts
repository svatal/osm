import { OsmBlocksToJsonTransformStream } from "@osmix/json";
import { OsmPbfBytesToBlocksTransformStream } from "@osmix/pbf";
import type { OsmEntity } from "@osmix/shared/types";
import type { Counts } from "./counts";
import { Data } from "./data";

const PROGRESS_EVERY = 5_000;

type OsmItem = OsmEntity | { required_features?: string[] };

/**
 * Collects every OSM entity into {@link Data} while reporting count progress.
 * Does not forward chunks (sink transform).
 */
export class CollectEntitiesTransformStream extends TransformStream<
  OsmItem,
  never
> {
  readonly data: Data;

  constructor(onProgress: (counts: Counts) => void) {
    const data = new Data();
    let entities = 0;

    super({
      transform(item) {
        if (!("id" in item)) return;
        data.visit(item);
        entities += 1;
        if (entities === 1 || entities % PROGRESS_EVERY === 0) {
          onProgress(data.counts);
        }
      },
      flush() {
        onProgress(data.counts);
      },
    });

    this.data = data;
  }
}

/** Discard stream terminus so the pipeline can complete via pipeTo. */
const discardSink = new WritableStream<never>({
  write() {},
});

/**
 * Stream a .osm.pbf file into an in-memory {@link Data} store.
 *
 *   bytes → OsmPbfBytesToBlocksTransformStream → OsmBlocksToJsonTransformStream
 *         → CollectEntitiesTransformStream → (discard)
 */
export async function parsePbfToData(
  file: File,
  onProgress: (counts: Counts) => void
): Promise<Data> {
  const collector = new CollectEntitiesTransformStream(onProgress);

  await file
    .stream()
    .pipeThrough(new OsmPbfBytesToBlocksTransformStream())
    .pipeThrough(new OsmBlocksToJsonTransformStream())
    .pipeThrough(collector)
    .pipeTo(discardSink);

  return collector.data;
}
