import type { OsmRelation } from "@osmix/shared/types";

export type Counts = { nodes: number; ways: number; relations: number };

/** One table row: a relation plus transitive way/node reference counts. */
export type RelationPreviewRow = {
  relation: OsmRelation;
  wayCount: number;
  nodeCount: number;
};

export type ParseWorkerRequest = { type: "parse"; file: File };

export type ParseWorkerResponse =
  | { type: "progress"; counts: Counts }
  | { type: "done"; counts: Counts; preview: RelationPreviewRow[] }
  | { type: "error"; message: string };

export const PREVIEW_LIMIT = 500;
