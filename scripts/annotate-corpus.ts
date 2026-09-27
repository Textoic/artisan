import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDictionary } from "./model.js";
import { chat } from "./ollama.js";
import { optionReader } from "./args.js";
import { rulesOnlyAmbiguities } from "./open-positions.js";
import {
  buildPrompt,
  parseDecisions,
  responseSchema,
  systemPrompt,
} from "./tagging-prompt.js";
import type { PosTag } from "../src/types.js";

const dictionary = loadDictionary();

const parseArgs = () => {
  const args = process.argv.slice(2);
  const value = optionReader(args);

  return {
    model: value("model") ?? "qwen3.8:27b",
    corpus: value("corpus") ?? "../data/corpus/paraphrases.jsonl",
    out: value("out") ?? "../data/corpus/annotated-llm.jsonl",
    seed: Number(value("seed") ?? 7),
    limit: Number(value("limit") ?? 0),
    restart: args.includes("--restart"),
  };
};

const options = parseArgs();
const corpusPath = fileURLToPath(new URL(options.corpus, import.meta.url));
const outputPath = fileURLToPath(new URL(options.out, import.meta.url));
const progressPath = `${outputPath.replace(/\.jsonl$/, "")}-progress.json`;

if (!existsSync(corpusPath)) {
  console.error(
    `No corpus at ${corpusPath}.\n` +
      "Run: npm run fetch-paraphrases -- --sentences=10000",
  );
  process.exit(1);
}

type AnnotatedRecord = {
  text: string;
  words: string[];
  tags: PosTag[];
  decided: number[];
  model: string;
};

type Progress = { corpus: string; model: string; sentencesRead: number };

const readProgress = (): Progress | null => {
  if (options.restart || !existsSync(progressPath)) {
    return null;
  }

  const saved = JSON.parse(readFileSync(progressPath).toString()) as Progress;
  if (saved.corpus !== options.corpus || saved.model !== options.model) {
    console.error(
      `${progressPath} is a run of ${saved.model} over ${saved.corpus}, but ` +
        `this run asks for ${options.model} over ${options.corpus}.\n` +
        "Point --out at a different file, or pass --restart to start over.",
    );
    process.exit(1);
  }

  return saved;
};

const saved = readProgress();
const startAt = saved?.sentencesRead ?? 0;

mkdirSync(dirname(outputPath), { recursive: true });
if (saved == null) {
  writeFileSync(outputPath, "");
}

const corpus = readFileSync(corpusPath)
  .toString()
  .split("\n")
  .filter(Boolean)
  .map((line) => (JSON.parse(line) as { text: string }).text);

const end =
  options.limit > 0
    ? Math.min(corpus.length, startAt + options.limit)
    : corpus.length;

console.log(
  [
    `${options.model} over ${corpus.length} sentences from ${options.corpus}`,
    ...(startAt > 0 ? [`Resuming at sentence ${startAt}`] : []),
    `This session: ${startAt} to ${end}`,
    "",
  ].join("\n"),
);

const rulesOnlyPass = (text: string) => rulesOnlyAmbiguities(text, dictionary);

let interrupted = false;
const onInterrupt = () => {
  interrupted = true;
  console.log("\nFinishing the sentence in flight, then stopping.");
};

const signals = ["SIGINT", "SIGTERM"] as const;
signals.forEach((signal) => process.on(signal, onInterrupt));

const saveProgress = (sentencesRead: number) => {
  writeFileSync(
    progressPath,
    JSON.stringify({
      corpus: options.corpus,
      model: options.model,
      sentencesRead,
    }),
  );
};

let annotated = 0;
let asked = 0;
let failed = 0;
let position = startAt;
const started = Date.now();

// eslint-disable-next-line no-unmodified-loop-condition
while (position < end && !interrupted) {
  const text = corpus[position];
  const { tokens, ambiguities } = rulesOnlyPass(text);
  const tags = tokens.map(({ xpos }) => xpos);
  const decided: number[] = [];

  try {
    if (ambiguities.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      const { content } = await chat({
        model: options.model,
        system: systemPrompt,
        prompt: buildPrompt(tokens, ambiguities, { explain: false }),
        schema: responseSchema(false),
        seed: options.seed,
      });
      const answers = new Map(
        parseDecisions(content).map(({ index, tag }) => [index, tag]),
      );
      ambiguities.forEach(({ index, candidates }) => {
        const tag = answers.get(index);
        if (tag != null && candidates.includes(tag)) {
          tags[index] = tag;
          decided.push(index);
        }
      });
      asked += 1;
    }

    const record: AnnotatedRecord = {
      text,
      words: tokens.map(({ form }) => form),
      tags,
      decided,
      model: options.model,
    };
    appendFileSync(outputPath, `${JSON.stringify(record)}\n`);
    annotated += 1;
  } catch (error) {
    failed += 1;
    console.error(`\n  ${text.slice(0, 60)}: ${(error as Error).message}`);
  }

  position += 1;
  saveProgress(position);

  if (annotated % 25 === 0 && annotated > 0) {
    const rate = (Date.now() - started) / 1000 / annotated;
    const left = Math.round(((end - position) * rate) / 60);
    process.stdout.write(
      `\r  ${position}/${end}  ${rate.toFixed(2)}s each, ~${left} min left   `,
    );
  }
}

signals.forEach((signal) => process.off(signal, onInterrupt));
process.stdout.write(`\r${" ".repeat(70)}\r`);
console.log(
  [
    `Annotated ${annotated} sentences (${asked} needed the model, ${failed} failed)`,
    `Stopped at ${position} of ${corpus.length} -> ${outputPath}`,
    position < corpus.length
      ? "Run the same command again to continue."
      : "Corpus complete.",
  ].join("\n"),
);
