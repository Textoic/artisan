import { markerDegreeLabel, tagOrder } from "../grammar/index.js";
import type {
  PosTag,
  TaggedToken,
  Step,
  PartiallyParsedToken,
  ContextualPosTag,
  FeatureMap,
} from "../types.js";

type PathToken = PartiallyParsedToken & {
  xpos: ContextualPosTag;
};

const START_TOKEN: PathToken = {
  id: -1,
  xpos: "START",
  form: "",
  lemma: "",
  feats: {},
  misc: { at: -1, pos: {} },
};

const END_TOKEN: PathToken = {
  id: -1,
  xpos: "END",
  form: "",
  lemma: "",
  feats: {},
  misc: { at: -1, pos: {} },
};

type Feats = NonNullable<PartiallyParsedToken["feats"]>;

const verbTag = ({ Mood, VerbForm, Tense, Person }: Feats) => {
  if (Mood) {
    return "MODAL";
  }

  if (VerbForm === "Part") {
    return "PARTICIPLE";
  }

  if (Tense === "Past") {
    return "VERB/Past";
  }

  return Person ? `VERB/${Person}` : "VERB";
};

const punctuationTag = (PunctType?: string) => {
  if (PunctType === "Dash") {
    return "PUNCT/Dash";
  }

  return ["Quot", "Brck"].includes(PunctType ?? "")
    ? "PUNCT/Brck,Quot"
    : "PUNCT/Comm,Excl,Peri,Ques";
};

const extendTag = (token: PartiallyParsedToken | PathToken) => {
  const { xpos, feats = {} } = token;
  const { PronType, PunctType } = feats;
  switch (xpos) {
    case "NOUN":
      return PronType ? `NOUN/${PronType}` : "NOUN";
    case "VERB":
      return verbTag(feats);
    case "ADJ":
      return PronType ? `ADJ/${PronType}` : "ADJ";
    case "MARK":
      return markerDegreeLabel(token);
    case "PUNCT":
      return punctuationTag(PunctType);
    default:
      return xpos;
  }
};

const verbShapeFeatures = ({
  feats: { Tense, VerbForm, Person } = {},
}: PartiallyParsedToken) => {
  if (Tense) {
    if (Person) {
      return [`${Tense}/${VerbForm}/${Person}`];
    }

    return [`${Tense}/${VerbForm}`];
  }

  return [];
};

const flagFeatures = ({ Mood, Poss, PronType }: Feats) => [
  ...(Poss ? ["POSS"] : []),
  ...(Mood ? ["MODAL"] : []),
  ...(PronType ? ["PRON"] : []),
];

const extractShapeFeatures = (token: PartiallyParsedToken) => {
  const { feats = {}, misc: { pos = {} } = {} } = token;
  const { Number } = feats;
  const shapeFeatures = [
    ...verbShapeFeatures(token),
    ...(Number ? [Number] : []),
    ...(pos.MARK ? [markerDegreeLabel(token)] : []),
    ...flagFeatures(feats),
  ];

  const tags = Object.keys(pos) as PosTag[];
  if (tags.length > 0 && shapeFeatures.length === 0) {
    shapeFeatures.push(...tags.sort(tagOrder));
  }

  return shapeFeatures;
};

const isCapitalized = (string: string) => /^\p{Lu}/u.test(string);

const F_THRESHOLD = 0.0001;

const amplifyF = (f: number) => Math.min(1 / (1 - f), 10);

const letters = /^\p{L}+$/u;

const suffixesOf = (form: string) => {
  const word = form.toLowerCase();
  if (!letters.test(word)) {
    return [];
  }

  return [2, 3, 4]
    .filter((length) => word.length > length)
    .map((length) => `suf${length}=${word.slice(-length)}`);
};

export const FEATURE_SET_VERSION = 2;

const band = (value: number, high: number, middle: number) => {
  if (value >= high) {
    return "h";
  }

  return value >= middle ? "m" : "l";
};

const taggedTokenAt = (
  tokens: PartiallyParsedToken[],
  path: Step[],
  index: number,
  offset: number,
) => {
  const at = index - offset;
  if (at < 0) {
    return START_TOKEN;
  }

  const inPath = path.length - offset;
  return inPath < 0
    ? tokens[at]
    : ({ ...tokens[at], xpos: path[inPath].xpos } as TaggedToken);
};

export type Weighting = {
  path: Step[];
  pathTags: PosTag[];
  likelihoodWeight?: number;
};

const addLikelihoodFeatures = (
  features: FeatureMap,
  pos: PartiallyParsedToken["misc"]["pos"],
  { pathTags, likelihoodWeight = 1 }: Weighting,
) => {
  const keys = Object.keys(pos ?? {}) as PosTag[];
  const sum = keys.reduce((total, xpos) => total + (pos?.[xpos] ?? 0), 0);
  if (sum >= 2) {
    return;
  }

  keys.forEach((xpos) => {
    const weight = pos?.[xpos];
    if (weight && weight >= 0.2 && pathTags.includes(xpos)) {
      features[`${xpos}:${band(weight, 0.7, 0.3)}`] = likelihoodWeight;
    }
  });
};

const addPrepositionPairFeatures = (
  features: FeatureMap,
  token: PartiallyParsedToken,
  next: PartiallyParsedToken | PathToken,
  { pathTags, likelihoodWeight = 1 }: Weighting,
) => {
  const { prepPairs } = token.misc;
  if (!prepPairs) {
    return;
  }

  const { form: n1Form, lemma: n1Lemma } = next;
  const entry = prepPairs[n1Form]
    ? prepPairs[n1Form]
    : prepPairs[n1Lemma ?? ""];
  if (!entry) {
    return;
  }

  Object.entries(entry).forEach(([xpos, weight]) => {
    if (pathTags.includes(xpos as PosTag)) {
      features[`mpair-${xpos}:${band(weight, 0.66, 0.33)}`] =
        amplifyF(weight) * likelihoodWeight;
    }
  });
};

type WordContext = {
  form: string;
  f: number;
  lastTag: string | undefined;
  previous: PartiallyParsedToken | PathToken;
};

const addWordFeatures = (
  features: FeatureMap,
  { form, f, lastTag, previous }: WordContext,
) => {
  if (f <= F_THRESHOLD) {
    suffixesOf(form).forEach((suffix) => {
      features[suffix] = 1;
      features[`${lastTag}>${suffix}`] = 1;
    });
    return;
  }

  const { form: l1Form, misc: { f: fMinus1 = 0 } = {} } = previous;
  features[`w=${form}`] = 1;
  features[`${lastTag}>${form}`] = 1;
  if (fMinus1 > F_THRESHOLD) {
    features[`${l1Form}>${form}`] = 1;
  }
};

const addNextTagFeatures = (
  features: FeatureMap,
  next: PartiallyParsedToken | PathToken,
  lastTag: string | undefined,
) => {
  const candidates = (Object.keys(next.misc.pos ?? {}) as PosTag[])
    .slice()
    .sort();
  if (candidates.length === 0) {
    return;
  }

  const n1Tags = `n1=${candidates.join("|")}`;
  features[n1Tags] = 1;
  features[`${lastTag}>${n1Tags}`] = 1;
};

const addShapePairFeatures = (
  features: FeatureMap,
  shapeFeatures: string[],
  nextShapeFeatures: string[],
  lastTag: string | undefined,
) => {
  shapeFeatures.forEach((feat) => {
    nextShapeFeatures.forEach((featN1) => {
      features[`${lastTag}>${feat}<${featN1}`] = 1;
      features[`${feat}<${featN1}`] = 1;
    });
  });
};

export default function (
  tokens: PartiallyParsedToken[],
  index: number,
  weighting: Weighting,
) {
  const { path } = weighting;
  const features: FeatureMap = {};
  const token = tokens[index];
  const l1 = taggedTokenAt(tokens, path, index, 1);
  const l2 = taggedTokenAt(tokens, path, index, 2);
  const n1 = index < tokens.length - 1 ? tokens[index + 1] : END_TOKEN;

  const shapeFeatures = extractShapeFeatures(token);
  const {
    form,
    misc: { pos = {}, f = 0 },
  } = token;

  addLikelihoodFeatures(features, pos, weighting);

  features.bias = 1;
  if (isCapitalized(form)) {
    features.Cap = 1;
  }

  const lastTag = extendTag(l1);
  const lastTwoTags = `${extendTag(l2)}${lastTag}`;
  shapeFeatures.forEach((feat) => {
    features[`${lastTag}>${feat}`] = 1;
    features[`${lastTwoTags}>${feat}`] = 1;
  });

  addPrepositionPairFeatures(features, token, n1, weighting);
  addWordFeatures(features, { form, f, lastTag, previous: l1 });
  addNextTagFeatures(features, n1, lastTag);
  addShapePairFeatures(
    features,
    shapeFeatures,
    extractShapeFeatures(n1),
    lastTag,
  );

  return features;
}
