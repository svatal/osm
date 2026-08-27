import type { OsmEntity, OsmRelation } from "@osmix/shared/types";
import type { EntityRef } from "./entityRef";

export type Counts = { nodes: number; ways: number; relations: number };

/** One table row: a relation plus transitive way/node reference counts. */
export type RelationPreviewRow = {
  relation: OsmRelation;
  wayCount: number;
  nodeCount: number;
};

export type EntityDetail = {
  ref: EntityRef;
  entity: OsmEntity | null;
  /** Transitive counts; relations only. */
  wayCount?: number;
  nodeCount?: number;
};

export type ParseWorkerRequest =
  | { type: "parse"; file: File }
  | { type: "getEntityDetail"; ref: EntityRef };

export type ParseWorkerResponse =
  | { type: "progress"; counts: Counts }
  | { type: "done"; counts: Counts; preview: RelationPreviewRow[] }
  | { type: "entityDetail"; detail: EntityDetail }
  | { type: "error"; message: string };

export const PREVIEW_LIMIT = 500;
