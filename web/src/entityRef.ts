import type { OsmEntityType } from "@osmix/shared/types";

export type EntityRef = { type: OsmEntityType; id: number };

export function entityRefKey(ref: EntityRef): string {
  return `${ref.type}/${ref.id}`;
}

export function entityRefLabel(ref: EntityRef): string {
  return `${ref.type} ${ref.id}`;
}
