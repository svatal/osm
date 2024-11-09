import * as fs from "fs";

export interface IAsyncStream {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export function createWriteStream(path: string): IAsyncStream {
  const stream = fs.createWriteStream(path);
  return {
    write: (data: string) =>
      new Promise<void>((resolve) => {
        const bufferNotFull = stream.write(data);
        if (bufferNotFull) {
          resolve();
        } else {
          stream.once("drain", resolve);
        }
      }),
    close: () => new Promise<void>((resolve) => stream.close(() => resolve())),
  };
}
