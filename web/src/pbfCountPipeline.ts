import { OsmBlocksToJsonTransformStream } from "@osmix/json";
import { OsmPbfBytesToBlocksTransformStream } from "@osmix/pbf";
import type { Counts } from "./counts";

const PROGRESS_EVERY = 5_000;

type OsmItem =
  | { id: number; members?: unknown; refs?: unknown }
  | { required_features?: string[] };

function countEntity(
  counts: Counts,
  item: { id: number; members?: unknown; refs?: unknown }
): void {
  if ("members" in item) counts.relations += 1;
  else if ("refs" in item) counts.ways += 1;
  else counts.nodes += 1;
}

/**
 * Counts OSM entities as they flow through the pipeline. Does not forward chunks
 * (sink transform); backpressure propagates upstream through the chain.
 */
export class CountEntitiesTransformStream extends TransformStream<
  OsmItem,
  never
> {
  readonly counts: Counts;

  constructor(onProgress: (counts: Counts) => void) {
    const counts: Counts = { nodes: 0, ways: 0, relations: 0 };
    let entities = 0;

    super({
      transform(item) {
        if (!("id" in item)) return;
        countEntity(counts, item);
        entities += 1;
        if (entities === 1 || entities % PROGRESS_EVERY === 0) {
          onProgress({ ...counts });
        }
      },
      flush() {
        onProgress({ ...counts });
      },
    });

    this.counts = counts;
  }
}

/** Discard stream terminus so the pipeline can complete via pipeTo. */
const discardSink = new WritableStream<never>({
  write() {},
});

/**
 * Stream a .osm.pbf file through Osmix transforms and count entities.
 *
 *   bytes → OsmPbfBytesToBlocksTransformStream → OsmBlocksToJsonTransformStream
 *         → CountEntitiesTransformStream → (discard)
 */
export async function countEntitiesInPbf(
  file: File,
  onProgress: (counts: Counts) => void
): Promise<Counts> {
  const counter = new CountEntitiesTransformStream(onProgress);

  await file
    .stream()
    .pipeThrough(new OsmPbfBytesToBlocksTransformStream())
    .pipeThrough(new OsmBlocksToJsonTransformStream())
    .pipeThrough(counter)
    .pipeTo(discardSink);

  return counter.counts;
}
