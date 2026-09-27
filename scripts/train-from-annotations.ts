import { writeFileSync } from "node:fs";
import averagedPerceptron, {
  type AveragedPerceptron,
} from "averaged-perceptron";
import featurize, { FEATURE_SET_VERSION } from "../src/featurize/index.js";
import {
  loadDatasetAt,
  loadDictionary,
  weightsPath,
  type AnnotatedSentence,
} from "./model.js";
import { rulesOnlyPass } from "./open-positions.js";
import type { PosTag } from "../src/types.js";

const numericArgument = (name: string, fallback: number) => {
  const argument = process.argv.find((value) => value.startsWith(`--${name}=`));
  return argument == null ? fallback : Number(argument.slice(name.length + 3));
};

const [inputPath] = process.argv
  .slice(2)
  .filter((value) => !value.startsWith("--"));
if (inputPath == null) {
  console.error(
    "Usage: npm run train-from-annotations -- path/to/annotated.jsonl [--hold-out=N] [--epochs=N]",
  );
  process.exit(1);
}

const epochs = numericArgument("epochs", 12);
const holdOut = numericArgument("hold-out", 0);
const dictionary = loadDictionary();
const weightPrecision = 1;

type Example = {
  features: Record<string, number>;
  actual: PosTag;
  floor: PosTag;
};

const buildExamples = (sentences: AnnotatedSentence[]) => {
  const examples: Example[] = [];
  let unlearnable = 0;
  sentences.forEach(({ text, tags }) => {
    const { tokens, candidatesByIndex: candidates } = rulesOnlyPass(
      text,
      dictionary,
    );
    if (tokens.length !== tags.length) {
      return;
    }

    tokens.forEach((_token, index) => {
      const legal = candidates.get(index);
      if (legal == null || legal.length < 2) {
        return;
      }

      const actual = tags[index];
      if (!legal.includes(actual)) {
        unlearnable += 1;
        return;
      }

      examples.push({
        features: featurize(tokens, index, { path: [], pathTags: legal }),
        actual,
        floor: legal[0],
      });
    });
  });

  return { examples, unlearnable };
};

const scoreOf = (examples: Example[], model: AveragedPerceptron) => {
  let correct = 0;
  examples.forEach(({ features, actual }) => {
    if (model.predict(features) === actual) {
      correct += 1;
    }
  });
  return examples.length === 0 ? 0 : correct / examples.length;
};

const floorOf = (examples: Example[]) => {
  const correct = examples.filter(
    ({ actual, floor }) => actual === floor,
  ).length;
  return examples.length === 0 ? 0 : correct / examples.length;
};

const percent = (value: number) => `${(100 * value).toFixed(2)}%`;

const dataset = loadDatasetAt(inputPath);
const trainSentences = holdOut > 0 ? dataset.slice(0, -holdOut) : dataset;
const testSentences = holdOut > 0 ? dataset.slice(-holdOut) : [];

console.log(
  `${dataset.length} annotated sentences from ${inputPath}` +
    `\n  ${trainSentences.length} to train on, ${testSentences.length} held out`,
);

const { examples: trainExamples, unlearnable } = buildExamples(trainSentences);
const { examples: testExamples } = buildExamples(testSentences);
console.log(
  `  ${trainExamples.length} training examples, ${testExamples.length} held out` +
    `\n  ${unlearnable} labels discarded: the rules had already vetoed them\n`,
);

if (trainExamples.length === 0) {
  console.error("No usable examples. Is this an annotated set?");
  process.exit(1);
}

const model: AveragedPerceptron = averagedPerceptron();
let best = {
  epoch: 0,
  score: -1,
  weights: {} as Record<string, Record<string, number>>,
};

for (let epoch = 1; epoch <= epochs; epoch += 1) {
  trainExamples.forEach(({ features, actual }) => {
    model.update(features, actual, model.predict(features));
  });

  const onTrain = scoreOf(trainExamples, model);
  const onTest =
    testExamples.length > 0 ? scoreOf(testExamples, model) : onTrain;
  const marker = onTest > best.score ? " <- best" : "";
  if (onTest > best.score) {
    best = { epoch, score: onTest, weights: model.weights() };
  }

  console.log(
    `  epoch ${String(epoch).padStart(2)}   train ${percent(onTrain)}   ` +
      `${testExamples.length > 0 ? "held out" : "(no hold-out)"} ${percent(onTest)}${marker}`,
  );
}

console.log(
  [
    "",
    `Best epoch: ${best.epoch}`,
    testExamples.length > 0
      ? `  held out    ${percent(best.score)}   (${testExamples.length} examples)`
      : `  training    ${percent(best.score)}`,
    `  no model    ${percent(floorOf(testExamples.length > 0 ? testExamples : trainExamples))}   most frequent tag, same words`,
  ].join("\n"),
);

const rounded = Object.entries(best.weights).reduce<
  Record<string, Record<string, number>>
>((kept, [feature, labels]) => {
  const labelWeights = Object.entries(labels).reduce<Record<string, number>>(
    (weights, [label, weight]) => {
      const value = Number(weight.toFixed(weightPrecision));
      if (value !== 0) {
        weights[label] = value;
      }

      return weights;
    },
    {},
  );
  if (Object.keys(labelWeights).length > 0) {
    kept[feature] = labelWeights;
  }

  return kept;
}, {});

writeFileSync(
  weightsPath,
  JSON.stringify({ featureSet: FEATURE_SET_VERSION, weights: rounded }),
);
console.log(
  `\nFeatures kept: ${Object.keys(rounded).length}\nWritten to ${weightsPath.href}`,
);
