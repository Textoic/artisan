import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface, type Interface } from "node:readline";

export type CorpusOptions = {
  paginationPath?: URL;
  progressEvery?: number;
  limit?: number;
};

const readStart = (paginationPath?: URL) => {
  if (paginationPath == null) {
    return 0;
  }

  try {
    const { start } = JSON.parse(readFileSync(paginationPath).toString()) as {
      start?: number;
    };
    return start ?? 0;
  } catch {
    return 0;
  }
};

const savePagination = (paginationPath: URL | undefined, offset: number) => {
  if (paginationPath != null) {
    writeFileSync(paginationPath, JSON.stringify({ start: offset }));
  }
};

const textOf = (line: string) => {
  try {
    const { text } = JSON.parse(line) as { text?: string };
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
};

type Progress = { linesRead: number; linesSkipped: number };

const readLines = async (
  lineReader: Interface,
  onText: (text: string) => void,
  progress: Progress,
  { progressEvery, limit }: { progressEvery: number; limit: number },
) => {
  for await (const line of lineReader) {
    const text = textOf(line);
    if (text == null) {
      progress.linesSkipped += 1;
    } else {
      progress.linesRead += 1;
      try {
        onText(text);
      } catch {
        progress.linesSkipped += 1;
      }
    }

    if (progress.linesRead > 0 && progress.linesRead % progressEvery === 0) {
      console.log(`  ${progress.linesRead} texts read`);
    }

    if (limit > 0 && progress.linesRead >= limit) {
      break;
    }
  }
};

export const streamCorpus = async (
  inputPath: string,
  onText: (text: string) => void,
  { paginationPath, progressEvery = 100000, limit = 0 }: CorpusOptions = {},
) => {
  const start = readStart(paginationPath);
  const readStream = createReadStream(inputPath, { start });
  const lineReader = createInterface({ input: readStream });
  const progress: Progress = { linesRead: 0, linesSkipped: 0 };
  const onInterrupt = () => {
    const { bytesRead } = readStream;
    console.log(
      `Interrupted after ${progress.linesRead} texts; resuming at byte ${start + bytesRead}`,
    );
    savePagination(paginationPath, start + bytesRead);
    process.exit();
  };

  const signals = ["SIGINT", "SIGTERM"] as const;
  signals.forEach((signal) => process.on(signal, onInterrupt));
  await readLines(lineReader, onText, progress, { progressEvery, limit });
  lineReader.close();
  readStream.destroy();
  signals.forEach((signal) => process.off(signal, onInterrupt));
  savePagination(paginationPath, 0);
  return progress;
};
