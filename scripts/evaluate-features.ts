import averagedPerceptron from "averaged-perceptron";
import featurize from "../src/featurize/index.js";
import parse from "../src/parse/index.js";
import tokenize from "../src/tokenize/index.js";
import { loadAnnotatedDataset, loadDictionary } from "./model.js";
import type { FeatureMap, PosTag } from "../src/types.js";

const folds = 5;
const dictionary = loadDictionary();

type Example = {
  features: FeatureMap;
  actual: PosTag;
  candidates: PosTag[];
  mostFrequent: PosTag;
};

const examplesOf = (text: string, tags: PosTag[]): Example[] => {
  const tokens = parse(tokenize(text, { dictionary }));
  if (tokens.length !== tags.length) {
    return [];
  }

  tokens.forEach((token, index) => {
    token.xpos = tags[index];
  });

  return tokens.flatMap((token, index) => {
    const candidates = Object.keys(token.misc.pos) as PosTag[];
    if (candidates.length < 2) {
      return [];
    }

    const [mostFrequent] = candidates
      .slice()
      .sort(
        (tag1, tag2) =>
          (token.misc.pos[tag2] ?? 0) - (token.misc.pos[tag1] ?? 0),
      );
    return [
      {
        features: featurize(tokens, index, { path: [], pathTags: candidates }),
        actual: tags[index],
        candidates,
        mostFrequent,
      },
    ];
  });
};

const dataset = loadAnnotatedDataset();
const sentences = dataset.map(({ text, tags }) => examplesOf(text, tags));
const usable = sentences.filter((examples) => examples.length > 0);
const total = usable.reduce((sum, examples) => sum + examples.length, 0);

const bestAllowed = (
  scores: Record<string, number>,
  { candidates, mostFrequent }: Example,
) =>
  candidates.reduce(
    (best, tag) => ((scores[tag] ?? 0) > (scores[best] ?? 0) ? tag : best),
    mostFrequent,
  );

const scoreFold = (
  training: Example[][],
  held: Example[][],
): { baseline: number; model: number } => {
  let baseline = 0;
  let correct = 0;
  const model = averagedPerceptron();
  training.flat().forEach(({ features, actual }) => {
    model.update(features, actual);
  });

  const weights = model.weights() as Record<string, Record<string, number>>;
  held.flat().forEach((example) => {
    const { features, actual, mostFrequent } = example;
    if (mostFrequent === actual) {
      baseline += 1;
    }

    const totals: Record<string, number> = {};
    Object.entries(features).forEach(([feature, value]) => {
      Object.entries(weights[feature] ?? {}).forEach(([tag, weight]) => {
        totals[tag] = (totals[tag] ?? 0) + weight * value;
      });
    });
    if (bestAllowed(totals, example) === actual) {
      correct += 1;
    }
  });

  return { baseline, model: correct };
};

const { baselineCorrect, modelCorrect } = Array.from(
  { length: folds },
  (_value, fold) =>
    scoreFold(
      usable.filter((_examples, index) => index % folds !== fold),
      usable.filter((_examples, index) => index % folds === fold),
    ),
).reduce(
  (totals, { baseline, model }) => ({
    baselineCorrect: totals.baselineCorrect + baseline,
    modelCorrect: totals.modelCorrect + model,
  }),
  { baselineCorrect: 0, modelCorrect: 0 },
);

const percent = (correct: number) => `${((100 * correct) / total).toFixed(2)}%`;

console.log(
  `Sentences: ${usable.length} of ${dataset.length}`,
  `\nAmbiguous words: ${total}`,
  `\n`,
  `\nmost frequent tag (no model): ${percent(baselineCorrect)}`,
  `\nperceptron (${folds}-fold cross-validation): ${percent(modelCorrect)}`,
  `\ndifference: ${((100 * (modelCorrect - baselineCorrect)) / total).toFixed(2)} points`,
);
