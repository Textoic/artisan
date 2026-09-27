import tokenize from "../src/tokenize/index.js";
import parse from "../src/parse/index.js";
import {
  loadAnnotatedDataset,
  loadDatasetAt,
  loadDictionary,
  loadWeights,
} from "./model.js";
import type { ConfusionMatrix, ParsedToken, PosTag } from "../src/types.js";

type TagError = {
  actual: PosTag;
  prediction: PosTag;
  index: number;
  text: string;
};

const dictionary = loadDictionary();
const weights = loadWeights();
const datasetArgument = process.argv
  .slice(2)
  .find((value) => value.startsWith("--dataset="));
const datasetPath = datasetArgument?.slice("--dataset=".length);
const dataset =
  datasetPath == null ? loadAnnotatedDataset() : loadDatasetAt(datasetPath);
console.log(
  `Dataset entries: ${dataset.length}${datasetPath == null ? "" : ` from ${datasetPath}`}`,
);

const calculateF1Measure = (precision: number, recall: number) => {
  const denominator = precision + recall;
  return denominator === 0 ? 0 : (2 * precision * recall) / denominator;
};

const perLabelPrecisionAndRecall = (confusionMatrix: ConfusionMatrix) =>
  [...Object.entries(confusionMatrix)].reduce(
    (metrics, [trueTag, actualMap]) => {
      const actualTag = trueTag as PosTag;
      const correct = actualMap[actualTag] || 0;
      const total = [...Object.entries(actualMap)].reduce(
        (sum, [, count]) => sum + count,
        0,
      );
      const recall = total === 0 ? 0 : correct / total;
      const predictedItemsWithClass = [
        ...Object.entries(confusionMatrix),
      ].reduce((accumulated, [, actualMap]) => {
        const currentEntryPredictions = actualMap[actualTag] || 0;
        return accumulated + currentEntryPredictions;
      }, 0);
      const precision =
        predictedItemsWithClass === 0 ? 0 : correct / predictedItemsWithClass;
      console.log(`"${actualTag}": ${correct} / ${total} = ${correct / total}`);
      metrics.precision[actualTag] = precision;
      metrics.recall[actualTag] = recall;
      metrics.f1Measure[actualTag] = calculateF1Measure(precision, recall);
      return metrics;
    },
    { precision: {}, recall: {}, f1Measure: {} } as {
      precision: Record<PosTag, number>;
      recall: Record<PosTag, number>;
      f1Measure: Record<PosTag, number>;
    },
  );

const overallAccuracy = (confusionMatrix: ConfusionMatrix) => {
  const correct = [...Object.entries(confusionMatrix)].reduce(
    (correct, [actualTag, actualMap]) =>
      correct + (actualMap[actualTag as PosTag] || 0),
    0,
  );
  const total = [...Object.entries(confusionMatrix)].reduce(
    (total, [, actualMap]) =>
      total +
      [...Object.entries(actualMap)].reduce((sum, [, count]) => sum + count, 0),
    0,
  );
  return correct / total;
};

const confusionMatrix: ConfusionMatrix = {};
const errors: TagError[] = [];

const addToConfusionMatrix = (
  text: string,
  confusionMatrix: ConfusionMatrix,
  tokens: ParsedToken[],
  trueTags: PosTag[],
) => {
  tokens.forEach((token, index) => {
    const { isDisambiguated, xpos: prediction } = token;
    if (isDisambiguated) {
      const actual = trueTags[index];
      const actualMap = confusionMatrix[actual] || {};
      const current = actualMap[prediction] || 0;
      actualMap[prediction] = current + 1;
      confusionMatrix[actual] = actualMap;

      if (actual !== prediction) {
        errors.push({ actual, prediction, index, text });
      }
    }
  });
};

let skipped = 0;
let baselineCorrect = 0;
let ambiguous = 0;

dataset.forEach(({ text, tags: trueTags }) => {
  const tokens = parse(tokenize(text, { dictionary }), { weights });
  if (tokens.length !== trueTags.length) {
    skipped += 1;
    return;
  }

  tokens.forEach((token, index) => {
    if (!token.isDisambiguated) {
      return;
    }

    ambiguous += 1;
    const [mostFrequent] = (Object.keys(token.misc.pos) as PosTag[]).sort(
      (tag1, tag2) => (token.misc.pos[tag2] ?? 0) - (token.misc.pos[tag1] ?? 0),
    );
    if (mostFrequent === trueTags[index]) {
      baselineCorrect += 1;
    }
  });

  addToConfusionMatrix(text, confusionMatrix, tokens, trueTags);
});

const percent = (value: number) => `${(100 * value).toFixed(2)}%`;

console.log("\nErrors:");
console.log(JSON.stringify(errors, null, 2));
console.log(
  [
    "",
    `Sentences: ${dataset.length - skipped} scored, ${skipped} skipped for a token count mismatch`,
    `Ambiguous words: ${ambiguous}`,
    `Most frequent tag, ignoring the rules: ${percent(baselineCorrect / ambiguous)}`,
    `This pipeline: ${percent(overallAccuracy(confusionMatrix))}`,
    "",
    "Per tag:",
  ].join("\n"),
);
console.log(
  JSON.stringify(perLabelPrecisionAndRecall(confusionMatrix), null, 2),
);
