import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [corpusPath] = process.argv.slice(2);

if (corpusPath == null) {
  console.error("Usage: npm run build-model -- path/to/corpus.txt");
  process.exit(1);
}

const steps: [name: string, script: string, args: string[]][] = [
  [
    "1/4  Reading the corpus with the rules alone",
    "build-corpus-stats.ts",
    [corpusPath],
  ],
  ["2/4  Counting how each word is tagged", "build-likelihoods.ts", []],
  ["3/4  Counting prepositional pairs", "build-preposition-pairs.ts", []],
  ["4/4  Rebuilding the dictionary", "build-dictionary.ts", []],
];

steps.forEach(([name, script, args]) => {
  console.log(`\n=== ${name} ===`);
  const { status } = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx/esm",
      fileURLToPath(new URL(script, import.meta.url)),
      ...args,
    ],
    { stdio: "inherit" },
  );
  if (status !== 0) {
    console.error(`Failed at: ${name}`);
    process.exit(status ?? 1);
  }
});

console.log(
  [
    "",
    "Done. data/dictionary.json has been rebuilt.",
    "Run `npm run test-tagger` to see how the rules alone score.",
    "",
    "To train a model, annotate some of this corpus and train on that:",
    "  npm run annotate-corpus -- --corpus=<corpus> --out=../data/corpus/silver.jsonl",
    "  npm run train-from-annotations -- data/corpus/silver.jsonl --hold-out=400",
  ].join("\n"),
);
