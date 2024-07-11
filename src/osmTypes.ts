export interface OSMMetadata {
  type: undefined;
  // some other props
}

export interface OSMNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags: { [key: string]: string };
}

export interface OSMWay {
  type: "way";
  id: number;
  refs: number[];
  tags: { [key: string]: string };
}

export interface OSMRelation {
  type: "relation";
  id: number;
  members: { type: string; ref: number; role: string }[];
  tags: { [key: string]: string };
}

export type OSMItem = OSMMetadata | OSMNode | OSMWay | OSMRelation;
