import type { FeatureMap } from "../types.js";

type AnyWeights = {
  [feature: string]: {
    [key: string]: number;
  };
};

export default function (
  weights: AnyWeights,
  features: FeatureMap,
  labels: string[],
) {
  const { length } = labels;
  const scores = new Float64Array(length);
  const keys = Object.keys(features);
  for (let key = 0; key < keys.length; key += 1) {
    const feature = keys[key];
    const value = features[feature];
    const classes = weights[feature] || {};
    for (let label = 0; label < length; label += 1) {
      const weight = classes[labels[label]];
      if (weight) {
        scores[label] += weight * value;
      }
    }
  }

  let prediction = 0;
  for (let label = 1; label < length; label += 1) {
    if (scores[label] > scores[prediction]) {
      prediction = label;
    }
  }

  return labels[prediction];
}
