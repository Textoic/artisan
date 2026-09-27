import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import parse from "../src/parse/index.js";
import tokenize from "../src/tokenize/index.js";
import { loadAnnotatedDataset, loadDictionary, loadWeights } from "./model.js";
import { chat, listModels, serverVersion } from "./ollama.js";
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
const weights = loadWeights();
const hasModel = Object.keys(weights).length > 0;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const value = optionReader(args);

  return {
    models: (value("models") ?? "").split(",").filter(Boolean),
    source: value("source") ?? "annotated",
    limit: Number(value("limit") ?? 100),
    seed: Number(value("seed") ?? 7),
    repeat: Number(value("repeat") ?? 1),
    explain: args.includes("--explain"),
    think: args.includes("--think"),
    noCache: args.includes("--no-cache"),
    dryRun: args.includes("--dry-run"),
    json: value("json"),
    corpus: value("corpus") ?? "../data/corpus/paraphrases.jsonl",
  };
};

const options = parseArgs();

type Sentence = { text: string; tags?: PosTag[] };

const loadSentences = (): Sentence[] => {
  if (options.source === "annotated") {
    return loadAnnotatedDataset()
      .slice(0, options.limit)
      .map(({ text, tags }) => ({ text, tags }));
  }

  const path = fileURLToPath(new URL(options.corpus, import.meta.url));
  if (!existsSync(path)) {
    console.error(
      `No corpus at ${path}.\nRun: npm run fetch-paraphrases -- --sentences=${options.limit}`,
    );
    process.exit(1);
  }

  return readFileSync(path)
    .toString()
    .split("\n")
    .filter(Boolean)
    .slice(0, options.limit)
    .map((line) => ({ text: (JSON.parse(line) as { text: string }).text }));
};

const rulesOnlyPass = (text: string) => rulesOnlyAmbiguities(text, dictionary);

const pipelinePass = (text: string) =>
  parse(tokenize(text, { dictionary }), { weights });

const cachePath = fileURLToPath(
  new URL("../data/corpus/model-cache.json", import.meta.url),
);

type CacheEntry = { content: string; ms: number };
const cache = new Map<string, CacheEntry>(
  existsSync(cachePath)
    ? (JSON.parse(readFileSync(cachePath).toString()) as [string, CacheEntry][])
    : [],
);

const saveCache = () => {
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, JSON.stringify([...cache.entries()]));
};

const cacheKey = (model: string, prompt: string, seed: number) =>
  createHash("sha256")
    .update([model, seed, systemPrompt, prompt].join("	"))
    .digest("hex");

type Answer = {
  text: string;
  index: number;
  form: string;
  candidates: PosTag[];
  gold?: PosTag;
  answer: PosTag | null;
  reason?: string;
  legal: boolean;
};

type ModelRun = {
  model: string;
  answers: Answer[];
  failures: { text: string; error: string }[];
  ms: number;
  cached: number;
};

const questionsFor = (sentences: Sentence[]) =>
  sentences
    .map(({ text, tags }) => ({ text, tags, ...rulesOnlyPass(text) }))
    .filter(
      ({ tokens, tags, ambiguities }) =>
        ambiguities.length > 0 &&
        (tags == null || tokens.length === tags.length),
    );

const replyFor = async (model: string, prompt: string, seed: number) => {
  const key = cacheKey(model, prompt, seed);
  const hit = options.noCache ? undefined : cache.get(key);
  if (hit != null) {
    return { ...hit, fromCache: true };
  }

  const started = Date.now();
  const { content } = await chat({
    model,
    system: systemPrompt,
    prompt,
    schema: responseSchema(options.explain),
    seed,
    think: options.think,
  });
  const entry = { content, ms: Date.now() - started };
  cache.set(key, entry);
  return { ...entry, fromCache: false };
};

type Question = ReturnType<typeof questionsFor>[number];

const collectAnswers = (
  content: string,
  { text, tags, ambiguities }: Question,
  answers: Answer[],
) => {
  const decisions = parseDecisions(content);
  const byIndex = new Map<number, { tag: PosTag; reason?: string }>(
    decisions.map(({ index, tag, reason }) => [index, { tag, reason }]),
  );
  ambiguities.forEach(({ index, form, candidates }) => {
    const decision = byIndex.get(index);
    answers.push({
      text,
      index,
      form,
      candidates,
      gold: tags?.[index],
      answer: decision?.tag ?? null,
      reason: decision?.reason,
      legal: decision != null && candidates.includes(decision.tag),
    });
  });
};

const reportProgress = (model: string, done: number, total: number) => {
  if (done % 10 === 0) {
    process.stdout.write(`\r  ${model}: ${done}/${total}   `);
    saveCache();
  }
};

const askModel = async (
  model: string,
  sentences: Sentence[],
  seed: number,
): Promise<ModelRun> => {
  const answers: Answer[] = [];
  const failures: { text: string; error: string }[] = [];
  const questions = questionsFor(sentences);
  let ms = 0;
  let cached = 0;
  let done = 0;

  for (const question of questions) {
    const prompt = buildPrompt(question.tokens, question.ambiguities, {
      explain: options.explain,
    });
    done += 1;
    try {
      // eslint-disable-next-line no-await-in-loop
      const reply = await replyFor(model, prompt, seed);
      ms += reply.ms;
      cached += reply.fromCache ? 1 : 0;
      collectAnswers(reply.content, question, answers);
    } catch (error) {
      failures.push({ text: question.text, error: (error as Error).message });
    }

    reportProgress(model, done, questions.length);
  }

  process.stdout.write(`\r${" ".repeat(60)}\r`);
  saveCache();
  return { model, answers, failures, ms, cached };
};

const percent = (value: number, total: number) =>
  total === 0 ? "  n/a " : `${((100 * value) / total).toFixed(2)}%`;

const sentences = loadSentences();
console.log(
  `Source: ${options.source} — ${sentences.length} sentences, seed ${options.seed}`,
);
if (!hasModel) {
  console.log(
    "No weights.json in this checkout, so there is no perceptron row to compare\n" +
      "against. Build one with `npm run build-model` to get it.",
  );
}

console.log("");

if (options.dryRun) {
  let positions = 0;
  let withAmbiguity = 0;
  sentences.forEach(({ text }) => {
    const { ambiguities } = rulesOnlyPass(text);
    positions += ambiguities.length;
    withAmbiguity += ambiguities.length > 0 ? 1 : 0;
  });
  console.log(
    `${positions} ambiguous positions across ${withAmbiguity} of ` +
      `${sentences.length} sentences ` +
      `(${(positions / sentences.length).toFixed(1)} per sentence)\n`,
  );

  const example = sentences.find(
    ({ text }) => rulesOnlyPass(text).ambiguities.length > 1,
  );
  if (example != null) {
    const { tokens, ambiguities } = rulesOnlyPass(example.text);
    console.log("─".repeat(72));
    console.log(systemPrompt);
    console.log("─".repeat(72));
    console.log(buildPrompt(tokens, ambiguities, { explain: options.explain }));
    console.log("─".repeat(72));
  }

  process.exit(0);
}

const version = await serverVersion();
if (version == null) {
  console.error(
    "No Ollama server on this machine. Start it with `ollama serve`, or point\n" +
      "OLLAMA_HOST at one that is running.",
  );
  process.exit(1);
}

const installed = await listModels();
console.log(
  `Ollama ${version}, ${installed.length} model(s) pulled: ` +
    `${installed.map(({ name }) => name).join(", ") || "(none)"}\n`,
);

if (options.models.length === 0) {
  console.error(
    "Nothing to compare. Pass --models=name1,name2 (any model this Ollama can\n" +
      "serve, local or :cloud).",
  );
  process.exit(1);
}

const baseline: Answer[] = [];
const pipeline = new Map<string, PosTag[]>();
sentences.forEach(({ text, tags }) => {
  const { tokens, ambiguities } = rulesOnlyPass(text);
  if (tags != null && tokens.length !== tags.length) {
    return;
  }

  pipeline.set(
    text,
    pipelinePass(text).map(({ xpos }) => xpos),
  );
  ambiguities.forEach(({ index, form, candidates }) => {
    baseline.push({
      text,
      index,
      form,
      candidates,
      gold: tags?.[index],
      answer: tokens[index].xpos,
      legal: true,
    });
  });
});

const runs: ModelRun[] = [];
for (const model of options.models) {
  for (let attempt = 0; attempt < options.repeat; attempt += 1) {
    console.log(
      `Running ${model}${options.repeat > 1 ? ` (run ${attempt + 1}/${options.repeat})` : ""}...`,
    );
    // eslint-disable-next-line no-await-in-loop
    const run = await askModel(model, sentences, options.seed);
    runs.push(run);
  }
}

const scored = baseline.filter(({ gold }) => gold != null).length;
const goldNote =
  options.source === "annotated" ? `, ${scored} with a gold tag` : "";
console.log(`\nAmbiguous positions: ${baseline.length}${goldNote}`);

if (options.source === "annotated") {
  const baselineCorrect = baseline.filter(
    ({ gold, answer }) => gold != null && gold === answer,
  ).length;
  const pipelineCorrect = baseline.filter(
    ({ text, index, gold }) =>
      gold != null && pipeline.get(text)?.[index] === gold,
  ).length;

  console.log("\n  correct   illegal   missing   model");
  console.log(
    `  ${percent(baselineCorrect, scored).padStart(7)}   ${"—".padStart(7)}   ${"—".padStart(7)}   rules + most frequent tag (no model)`,
  );
  if (hasModel) {
    console.log(
      `  ${percent(pipelineCorrect, scored).padStart(7)}   ${"—".padStart(7)}   ${"—".padStart(7)}   rules + perceptron (current pipeline)`,
    );
  }
  runs.forEach(({ model, answers, failures }) => {
    const gradable = answers.filter(({ gold }) => gold != null);
    const correct = gradable.filter(
      ({ gold, answer }) => gold === answer,
    ).length;
    const illegal = answers.filter(
      ({ answer, legal }) => answer != null && !legal,
    ).length;
    const missing = answers.filter(({ answer }) => answer == null).length;
    console.log(
      `  ${percent(correct, gradable.length).padStart(7)}   ` +
        `${String(illegal).padStart(7)}   ${String(missing).padStart(7)}   ${model}` +
        `${failures.length > 0 ? `  (${failures.length} sentences failed)` : ""}`,
    );
  });
}

console.log("\n  seconds   cached   prompt failures   model");
runs.forEach(({ model, ms, cached, failures, answers }) => {
  console.log(
    `  ${(ms / 1000).toFixed(1).padStart(7)}   ${String(cached).padStart(6)}   ` +
      `${String(failures.length).padStart(15)}   ${model} (${answers.length} answers)`,
  );
});

if (runs.length > 1) {
  type Position = { answer: Answer; byModel: Map<string, PosTag | null> };
  const byPosition = new Map<string, Position>();
  runs.forEach(({ model, answers }) => {
    answers.forEach((answer) => {
      const key = [answer.text, answer.index].join("	");
      const position = byPosition.get(key) ?? {
        answer,
        byModel: new Map<string, PosTag | null>(),
      };
      position.byModel.set(model, answer.answer);
      byPosition.set(key, position);
    });
  });

  const split = [...byPosition.values()].filter(
    ({ byModel }) => new Set(byModel.values()).size > 1,
  );
  console.log(
    `
Positions the models split on: ${split.length} of ${byPosition.size}` +
      ` (${percent(split.length, byPosition.size)})`,
  );
  split.slice(0, 25).forEach(({ answer, byModel }) => {
    const { form, index, gold, candidates, text } = answer;
    console.log(
      `
  "${form}" at ${index}${gold == null ? "" : `  gold ${gold}`}` +
        `  of ${candidates.join("/")}`,
    );
    console.log(`    ${text}`);
    [...byModel.entries()].forEach(([model, tag]) =>
      console.log(`    ${String(tag).padEnd(6)} ${model}`),
    );
  });
}

if (options.json != null) {
  const path = fileURLToPath(new URL(options.json, `file://${process.cwd()}/`));
  writeFileSync(
    path,
    JSON.stringify(
      {
        options,
        baseline,
        runs: runs.map(({ model, answers, failures }) => ({
          model,
          answers,
          failures,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`\nFull results -> ${path}`);
}
