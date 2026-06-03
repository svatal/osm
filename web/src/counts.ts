export type Counts = { nodes: number; ways: number; relations: number };

export type ParseWorkerRequest = { type: "parse"; file: File };

export type ParseWorkerResponse =
  | { type: "progress"; counts: Counts }
  | { type: "done"; counts: Counts }
  | { type: "error"; message: string };
