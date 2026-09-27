import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { optionReader } from "./args.js";

const rowsPerPage = 100;
const datasetRows = 7065517;
const endpoint = "https://datasets-server.huggingface.co/rows";

const modulus = 2147483647;
const multiplier = 16807;

const randomFrom = (seed: number) => {
  let state = (seed % (modulus - 1)) + 1;
  return () => {
    state = (state * multiplier) % modulus;
    return (state - 1) / (modulus - 1);
  };
};

type Row = { sentence_a?: string; sentence_b?: string };

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const maxAttempts = 8;

const rateLimitError = (response: Response) => {
  const retryAfter = Number(response.headers.get("retry-after") ?? 0);
  return new Error(
    `HTTP 429${retryAfter > 0 ? ` (retry after ${retryAfter}s)` : ""}`,
  );
};

const waitForRetry = async (rateLimited: boolean, attempt: number) => {
  const backoff = rateLimited ? 30000 * 2 ** attempt : 1000 * 2 ** attempt;
  if (rateLimited) {
    console.log(
      `\n  rate limited, waiting ${Math.round(backoff / 1000)}s before retrying`,
    );
  }

  await wait(Math.min(backoff, 300000));
};

const fetchPage = async (offset: number, attempt = 0): Promise<Row[]> => {
  const url =
    `${endpoint}?dataset=redis%2Fllm-paraphrases&config=default&split=train` +
    `&offset=${offset}&length=${rowsPerPage}`;
  let rateLimited = false;
  try {
    const response = await fetch(url);
    if (response.status === 429) {
      rateLimited = true;
      throw rateLimitError(response);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const { rows = [] } = (await response.json()) as { rows?: { row: Row }[] };
    return rows.map(({ row }) => row);
  } catch (error) {
    if (attempt >= maxAttempts) {
      throw error;
    }

    await waitForRetry(rateLimited, attempt);
    return fetchPage(offset, attempt + 1);
  }
};

const isUsable = (sentence: string) => {
  const words = sentence.trim().split(/\s+/);
  return (
    words.length >= 4 && words.length <= 60 && sentence.trim().length <= 500
  );
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const value = optionReader(args);

  return {
    sentences: Number(value("sentences") ?? 100),
    seed: Number(value("seed") ?? 1),
    out: value("out") ?? "../data/corpus/paraphrases.jsonl",
    perPage: Number(value("per-page") ?? 4),
    delay: Number(value("delay") ?? 600),
    restart: args.includes("--restart"),
  };
};

const { sentences: wanted, seed, out, perPage, delay, restart } = parseArgs();
const outputPath = fileURLToPath(new URL(out, import.meta.url));
const progressPath = `${outputPath.replace(/\.jsonl$/, "")}-progress.json`;

type Progress = { seed: number; perPage: number; visited: number[] };

const readProgress = (): Progress | null => {
  if (restart || !existsSync(progressPath)) {
    return null;
  }

  const saved = JSON.parse(readFileSync(progressPath).toString()) as Progress;
  if (saved.seed !== seed || saved.perPage !== perPage) {
    console.error(
      `${progressPath} was written with seed ${saved.seed} and per-page ` +
        `${saved.perPage}, but this run asks for ${seed} and ${perPage}.\n` +
        "Use the original values, or pass --restart to begin a new sample.",
    );
    process.exit(1);
  }

  return saved;
};

const saved = readProgress();
const visited = new Set<number>(saved?.visited ?? []);

const seen = new Set<string>();
if (saved != null && existsSync(outputPath)) {
  readFileSync(outputPath)
    .toString()
    .split("\n")
    .filter(Boolean)
    .forEach((line) => seen.add((JSON.parse(line) as { text: string }).text));
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, "");
}

console.log(
  [
    `Sampling ${wanted} sentences from redis/llm-paraphrases (seed ${seed})`,
    ...(saved == null
      ? []
      : [
          `Resuming: ${seen.size} already collected from ${visited.size} pages`,
        ]),
  ].join("\n"),
);

const random = randomFrom(seed);
const totalPages = Math.ceil(datasetRows / rowsPerPage);

const nextPage = () => {
  let page = Math.floor(random() * totalPages);
  while (visited.has(page)) {
    page = Math.floor(random() * totalPages);
  }

  return page;
};

const saveProgress = () => {
  writeFileSync(
    progressPath,
    JSON.stringify({ seed, perPage, visited: [...visited] }),
  );
};

let interrupted = false;
const onInterrupt = () => {
  interrupted = true;
  console.log("\nStopping; run the same command again to resume.");
};

const signals = ["SIGINT", "SIGTERM"] as const;
signals.forEach((signal) => process.on(signal, onInterrupt));

// eslint-disable-next-line no-unmodified-loop-condition
while (seen.size < wanted && visited.size < totalPages && !interrupted) {
  const page = nextPage();
  visited.add(page);
  // eslint-disable-next-line no-await-in-loop
  const rows = await fetchPage(page * rowsPerPage);
  const batch: string[] = [];
  rows.forEach(({ sentence_a, sentence_b }) => {
    [sentence_a, sentence_b].forEach((sentence) => {
      if (
        sentence == null ||
        seen.size + batch.length >= wanted ||
        batch.length >= perPage ||
        !isUsable(sentence)
      ) {
        return;
      }

      const trimmed = sentence.trim();
      if (seen.has(trimmed) || batch.includes(trimmed)) {
        return;
      }

      batch.push(trimmed);
    });
  });

  if (batch.length > 0) {
    appendFileSync(
      outputPath,
      `${batch.map((text) => JSON.stringify({ text })).join("\n")}\n`,
    );
    batch.forEach((text) => seen.add(text));
  }

  saveProgress();
  // eslint-disable-next-line no-await-in-loop
  await wait(delay);
  if (visited.size % 25 === 0) {
    console.log(`  ${seen.size} sentences from ${visited.size} pages`);
  }
}

saveProgress();
signals.forEach((signal) => process.off(signal, onInterrupt));
console.log(
  `\n${seen.size} sentences from ${visited.size} pages -> ${outputPath}`,
);
