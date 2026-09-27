import { readFileSync } from "node:fs";
import { FEATURE_SET_VERSION } from "../src/featurize/index.js";
import type {
  Dictionary,
  FeatureWeights,
  LexicalProps,
  PosTag,
} from "../src/types.js";

export type AnnotatedSentence = {
  text: string;
  tags: PosTag[];
  words: string[];
};

const read = (path: string): unknown =>
  JSON.parse(
    readFileSync(new URL(path, import.meta.url)).toString(),
  ) as unknown;

export const dictionaryPath = new URL(
  "../data/dictionary.json",
  import.meta.url,
);

export const weightsPath = new URL("../data/weights.json", import.meta.url);

export const loadDictionary = (): Dictionary =>
  new Map(read("../data/dictionary.json") as [string, LexicalProps][]);

export const loadWeights = (): FeatureWeights => {
  let stored;
  try {
    stored = read("../data/weights.json") as {
      featureSet?: number;
      weights?: FeatureWeights;
    };
  } catch {
    console.warn(
      `No model at ${weightsPath.href}; tagging with the language rules alone.`,
    );
    return {};
  }

  if (stored.featureSet !== FEATURE_SET_VERSION || stored.weights == null) {
    console.warn(
      `The model at ${weightsPath.href} was trained for feature set`,
      `${String(stored.featureSet ?? "(none)")} but this build uses`,
      `${FEATURE_SET_VERSION}, so it is being ignored.`,
      "\nTag with the language rules alone, or retrain:",
      "\n  npm run train-from-annotations -- path/to/annotated.jsonl",
    );
    return {};
  }

  return stored.weights;
};

export const loadAnnotatedDataset = (): AnnotatedSentence[] =>
  read("../data/tagger-data/annotated-dataset.json") as AnnotatedSentence[];

export const loadDatasetAt = (path: string): AnnotatedSentence[] => {
  const contents = readFileSync(path).toString();
  return path.endsWith(".jsonl")
    ? contents
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as AnnotatedSentence)
    : (JSON.parse(contents) as AnnotatedSentence[]);
};
