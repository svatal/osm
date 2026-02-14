export interface OSMMetadata {
  type: undefined;
  // some other props
}

export interface OSMNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags?: { [key: string]: string };
}

export interface OSMWay {
  type: "way";
  id: number;
  refs: number[];
  tags?: { [key: string]: string };
}

export function isOpen(way: { refs: number[] }): boolean {
  return way.refs.length < 2 || way.refs[0] !== way.refs[way.refs.length - 1];
}

export interface OSMRelation {
  type: "relation";
  id: number;
  members: { type: string; ref: number; role: string }[];
  tags: { [key: string]: string };
}

export type OSMItem = OSMMetadata | OSMNode | OSMWay | OSMRelation;
