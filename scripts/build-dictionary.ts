/* eslint-disable guard-for-in */
import { createWriteStream, readFileSync } from "fs";
import handpickedWords from "./handpicked-words.js";
import lemmatize from "../src/lemmatize/index.js";
import type {
  Dictionary,
  LexicalProps,
  PosTag,
  PosWeights,
} from "../src/types.js";

type AntonymDictionary = Record<string, Record<PosTag, string>>;
type EmojiDictionary = Record<string, string>;
type FrequencyDictionary = Record<string, number>;
type InflectionDictionary = Record<
  string,
  Record<PosTag, string[] | undefined>
>;
type PartOfSpeechDictionary = Record<string, PosWeights>;
type SynonymDictionary = Record<string, Record<PosTag, string[]>>;
type PrepositionalPairDictionary = Record<string, Record<string, PosWeights>>;

const antonyms = JSON.parse(
  readFileSync(new URL("../data/antonyms.json", import.meta.url)).toString(),
) as AntonymDictionary;
const emojis = JSON.parse(
  readFileSync(new URL("../data/emojis.json", import.meta.url)).toString(),
) as EmojiDictionary;
const frequencies = JSON.parse(
  readFileSync(new URL("../data/frequencies.json", import.meta.url)).toString(),
) as FrequencyDictionary;
const inflections = JSON.parse(
  readFileSync(new URL("../data/inflections.json", import.meta.url)).toString(),
) as InflectionDictionary;
const pos = JSON.parse(
  readFileSync(new URL("../data/pos.json", import.meta.url)).toString(),
) as PartOfSpeechDictionary;
const synonyms = JSON.parse(
  readFileSync(new URL("../data/synonyms.json", import.meta.url)).toString(),
) as SynonymDictionary;
const prepositionalPairs = JSON.parse(
  readFileSync(new URL("../data/pairs.json", import.meta.url)).toString(),
) as PrepositionalPairDictionary;

const dictionaryPath = new URL("../data/dictionary.json", import.meta.url);

const resolveFusedFragments = (
  dictionary: Dictionary,
  fields: LexicalProps,
) => {
  const { fused } = fields;
  if (fused == null) {
    return;
  }

  fields.fused = fused.map((fragment) => {
    const { information, fullWord } = fragment;
    fragment.information = { ...dictionary.get(fullWord), ...information };
    return fragment;
  });
};

const keepsTheCurrentLemma = (
  form: string,
  newLemma: string,
  currentPos?: PosWeights,
  newPos?: PosWeights,
) =>
  newLemma === form ||
  Boolean(newPos?.NOUN && currentPos?.VERB && currentPos.NOUN == null);

const mergeFields = (
  currentFields: LexicalProps,
  fields: LexicalProps,
  form: string,
) => {
  const {
    pos: currentPos,
    lemma: currentLemma,
    f: currentFrequency,
    Tense: currentTense,
    VerbForm: currentVerbForm,
  } = currentFields;
  const newLemma = fields.lemma;
  const newFrequency = fields.f;
  Object.assign(currentFields, fields);
  const { pos: newPos, Tense: newTense } = currentFields;
  if (currentVerbForm === "Fin" && newTense === "Past") {
    currentFields.Tense = currentTense;
  }

  if (currentPos && newPos) {
    currentFields.pos = { ...currentPos, ...newPos };
  }

  if (currentLemma != null && newLemma != null) {
    currentFields.lemma = keepsTheCurrentLemma(
      form,
      newLemma,
      currentPos,
      newPos,
    )
      ? currentLemma
      : newLemma;
  }

  if (currentFrequency != null && newFrequency != null) {
    currentFields.f = currentFrequency;
  }
};

const add = (
  dictionary: Dictionary,
  form: string,
  originalFields: LexicalProps,
) => {
  const fields = JSON.parse(JSON.stringify(originalFields)) as LexicalProps;
  const formWithoutHyphens = form.length === 1 ? form : form.replace("-", "");
  const currentFields = dictionary.get(formWithoutHyphens);
  resolveFusedFragments(dictionary, fields);
  if (!currentFields) {
    dictionary.set(formWithoutHyphens, fields);
    return;
  }

  mergeFields(currentFields, fields, form);
};

const addHandpickedWords = (dictionary: Dictionary) => {
  handpickedWords.forEach(
    ({ form, synonyms = [], plurals = [], fields = {} }) => {
      if (!fields.lemma) {
        fields.lemma = form;
      }

      if (plurals.length > 0) {
        fields.Number = "Sing";
      }

      add(dictionary, form, fields);
      plurals.forEach((plural) =>
        add(dictionary, plural, { ...fields, Number: "Plur" }),
      );

      synonyms.forEach((variant) => add(dictionary, variant, fields));
    },
  );
};

const verbFeaturesFromSuffix = (lemma: string, form: string) => {
  if (form.endsWith("ing")) {
    return { pos: { VERB: 1, ADJ: 1 }, VerbForm: "Part", Tense: "Pres", lemma };
  }

  if (form.endsWith("s")) {
    return {
      pos: { VERB: 1 },
      VerbForm: "Fin",
      Tense: "Pres",
      Person: 3,
      lemma,
    };
  }

  return {
    pos: form === lemma ? { VERB: 1 } : { VERB: 1, ADJ: 1 },
    Tense: "Past",
    lemma,
  };
};

const verbFeaturesByPosition: Record<string, object> = {
  "1/4": { pos: { VERB: 1 }, VerbForm: "Fin", Tense: "Past" },
  "2/4": { pos: { VERB: 1, ADJ: 1 }, VerbForm: "Part", Tense: "Past" },
  "2/3": { pos: { VERB: 1, ADJ: 1 }, VerbForm: "Part", Tense: "Pres" },
  "3/4": { pos: { VERB: 1, ADJ: 1 }, VerbForm: "Part", Tense: "Pres" },
  "3/3": { pos: { VERB: 1 }, VerbForm: "Fin", Tense: "Pres", Person: 3 },
  "4/4": { pos: { VERB: 1 }, VerbForm: "Fin", Tense: "Pres", Person: 3 },
};

const verbFeatures = (position: string, lemma: string, form: string) => {
  if (position === "1/3") {
    return {
      pos: form === lemma ? { VERB: 1 } : { VERB: 1, ADJ: 1 },
      Tense: "Past",
      lemma,
    };
  }

  const known = verbFeaturesByPosition[position];
  return known == null
    ? verbFeaturesFromSuffix(lemma, form)
    : { ...known, lemma };
};

type InflectionSlot = {
  xpos: PosTag;
  index: number;
  total: number;
  lemma: string;
  form: string;
  alsoAdverb: boolean;
};

const createFeatures = ({
  xpos,
  index,
  total,
  lemma,
  form,
  alsoAdverb,
}: InflectionSlot) => {
  if (xpos === "VERB") {
    return verbFeatures(`${index + 1}/${total}`, lemma, form);
  }

  if (xpos === "NOUN") {
    return { pos: { NOUN: 1 }, Number: "Plur", lemma };
  }

  if (xpos === "ADJ") {
    return {
      pos: alsoAdverb ? { ADJ: 1, ADV: 1 } : { ADJ: 1 },
      ...(total === 2 ? { Degree: index === 0 ? "Cmp" : "Sup" } : {}),
      lemma,
    };
  }

  return xpos === "ADV" ? { pos: { ADV: 1 }, lemma } : {};
};

const irregularVerbsSamePastAsInfinitive = [
  "beat",
  "bet",
  "bid",
  "broadcast",
  "burst",
  "bust",
  "cast",
  "cost",
  "cut",
  "fit",
  "hit",
  "input",
  "let",
  "preset",
  "put",
  "quit",
  "read",
  "rid",
  "set",
  "shed",
  "shut",
  "slit",
  "split",
  "spread",
  "sublet",
  "thrust",
  "upset",
  "wed",
];

const handpickedForms = new Set(
  handpickedWords.flatMap(({ form, synonyms = [], plurals = [] }) => [
    form,
    ...synonyms,
    ...plurals,
  ]),
);

const inflectionOnlyDictionary = () => {
  const lookup = new Map() as Dictionary;
  lookup.get = (word: string) => {
    const entry = inflections[word];
    if (entry == null) {
      return undefined;
    }

    const pos = Object.keys(entry).reduce<PosWeights>((pos, tag) => {
      pos[tag as PosTag] = 1;
      return pos;
    }, {});
    return { pos };
  };
  return lookup;
};

const dropTagsWordnetDoesNotList = (form: string) => {
  const tags = Object.keys(inflections[form]) as PosTag[];
  if (!synonyms[form] || tags.length <= 1) {
    return;
  }

  tags.forEach((xpos) => {
    if (!synonyms[form][xpos]) {
      delete inflections[form][xpos];
    }
  });
};

const dropTheWeakerModifierReading = (
  form: string,
  tags: { ADJ?: unknown; ADV?: unknown },
) => {
  if (tags.ADJ && !tags.ADV) {
    delete inflections[form].ADV;
  } else if (tags.ADV && !tags.ADJ) {
    delete inflections[form].ADJ;
  }
};

const settleAdjectiveOrAdverb = (form: string, lookup: Dictionary) => {
  if (!inflections[form].ADJ || !inflections[form].ADV) {
    return;
  }

  if (synonyms[form]) {
    dropTheWeakerModifierReading(form, synonyms[form]);
    return;
  }

  if (Number(inflections[form].ADJ?.length) > 0) {
    delete inflections[form].ADV;
    return;
  }

  const { pos } = lemmatize(form, { dictionary: lookup });
  dropTheWeakerModifierReading(form, pos);
};

const addFormsForTag = (
  dictionary: Dictionary,
  form: string,
  xpos: PosTag,
  alsoAdverb: boolean,
) => {
  inflections[form][xpos]?.forEach((inflection, index, forms) => {
    inflection
      .split(", ")
      .filter((entry) => !handpickedForms.has(entry))
      .forEach((entry) =>
        add(
          dictionary,
          entry,
          createFeatures({
            xpos,
            index,
            total: forms.length,
            lemma: form,
            form: entry,
            alsoAdverb,
          }) as LexicalProps,
        ),
      );
  });
};

const addInflectedForms = (
  dictionary: Dictionary,
  form: string,
  alsoAdverb: boolean,
) => {
  const pos = {} as Record<PosTag, number>;
  for (const tag in inflections[form]) {
    const xpos = tag as PosTag;
    if (Object.prototype.hasOwnProperty.call(inflections[form], xpos)) {
      pos[xpos] = 1;
      addFormsForTag(dictionary, form, xpos, alsoAdverb);
    }
  }

  return pos;
};

const lemmaFeatures = (
  form: string,
  pos: Record<PosTag, number>,
): LexicalProps => {
  if (pos.VERB) {
    return {
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Sing",
      ...(irregularVerbsSamePastAsInfinitive.includes(form)
        ? {}
        : { Person: 1 }),
    };
  }

  return pos.NOUN ? { Number: "Sing" } : {};
};

const addInflections = (dictionary: Dictionary) => {
  const lookup = inflectionOnlyDictionary();
  for (const form in inflections) {
    if (
      Object.prototype.hasOwnProperty.call(inflections, form) &&
      !/[A-Z]/.test(form[0])
    ) {
      dropTagsWordnetDoesNotList(form);
      const alsoAdverb = Boolean(
        inflections[form].ADJ && inflections[form].ADV,
      );
      settleAdjectiveOrAdverb(form, lookup);
      const pos = addInflectedForms(dictionary, form, alsoAdverb);
      if (!handpickedForms.has(form)) {
        add(dictionary, form, {
          lemma: form,
          pos,
          ...lemmaFeatures(form, pos),
        });
      }
    }
  }
};

const commonWord = /^'?[a-z]+(['-][a-z])*'?$/;

const addWordnetVocabulary = (dictionary: Dictionary) => {
  for (const form in synonyms) {
    if (Object.prototype.hasOwnProperty.call(synonyms, form)) {
      const { pos: dictionaryTags } = dictionary.get(form) || {};
      if (commonWord.test(form)) {
        const features = {
          lemma: form,
          pos:
            dictionaryTags ||
            Object.keys(synonyms[form]).reduce(
              (o, k) => ({ ...o, [k]: 1 }),
              {},
            ),
          ...(dictionaryTags
            ? {}
            : synonyms[form].VERB
              ? {
                  VerbForm: "Fin",
                  Tense: "Pres",
                  Number: "Sing",
                  Person: 1,
                }
              : synonyms[form].NOUN
                ? { Number: "Sing" }
                : {}),
        } as LexicalProps;

        add(dictionary, form, features);
      }
    }
  }
};

const addAntonymVocabulary = (dictionary: Dictionary) => {
  for (const form in antonyms) {
    if (Object.prototype.hasOwnProperty.call(antonyms, form)) {
      const antonymMap = antonyms[form];
      if (!dictionary.has(form)) {
        add(dictionary, form, {
          pos: Object.keys(antonymMap).reduce((o, k) => ({ ...o, [k]: 1 }), {}),
        });
      }

      Object.entries(antonymMap).forEach(([tag, antonym]) => {
        add(dictionary, antonym, { pos: { [tag]: 1 } });
      });
    }
  }
};

const addEmojis = (dictionary: Dictionary) => {
  for (const emoji in emojis) {
    if (Object.prototype.hasOwnProperty.call(emojis, emoji)) {
      add(dictionary, emoji, { lemma: emoji, pos: { INTJ: 1 } });
    }
  }
};

const validWordRegExp = /^[a-zA-Z]+-?[a-zA-Z]+$/iu;

const addFrequencies = (dictionary: Dictionary) => {
  for (const form in frequencies) {
    if (Object.prototype.hasOwnProperty.call(frequencies, form)) {
      const f = frequencies[form];
      if (validWordRegExp.test(form) && f >= 1e-6) {
        add(dictionary, form.toLowerCase(), { f });
      }
    }
  }
};

const getInflections = (word: string) => {
  const entry = inflections[word];
  if (entry == null) {
    return entry;
  }

  return [...Object.values(entry)].reduce((words, inflections) => {
    if (!inflections) {
      return words;
    }

    return [
      ...(words as string[]),
      ...inflections.reduce(
        (words, inflection) => [...words, ...inflection.split(", ")],
        [] as string[],
      ),
    ];
  }, []);
};

const addPrepositionalPairs = (dictionary: Dictionary) => {
  Object.entries(prepositionalPairs).forEach(([lemma, prepPairs]) => {
    const inflections = getInflections(lemma) || [];
    [...inflections, lemma].forEach((word) => {
      add(dictionary, word, { prepPairs });
    });
  });
};

const redistributedPos = (form: string, tags: PosWeights) => {
  const usedPos = Object.keys(pos[form]).filter(
    (tag) => tags[tag as PosTag],
  ) as PosTag[];
  if (usedPos.length === 0) {
    return null;
  }

  const allPos = Object.keys(tags) as PosTag[];
  const epsilon = 0.01;
  const total = usedPos.reduce(
    (sum, tag) => sum + (pos[form][tag] ? Number(pos[form][tag]) : 0),
    0,
  );
  const diff = 1 - total - epsilon * (allPos.length - usedPos.length);
  return allPos.reduce(
    (weights, tag) => {
      const weight = pos[form][tag] || epsilon;
      weights[tag] = Number((weight + (weight / total) * diff).toFixed(2));
      return weights;
    },
    {} as Record<PosTag, number>,
  );
};

const corpusPosFor = (form: string, { pos: tags, NumType }: LexicalProps) => {
  if (NumType === "Card") {
    return { ADJ: 1, NOUN: 1 };
  }

  return tags ? redistributedPos(form, tags) : pos[form];
};

const addPos = (dictionary: Dictionary) => {
  for (const form in pos) {
    if (Object.prototype.hasOwnProperty.call(pos, form)) {
      const fields = dictionary.get(form);
      const newPos = fields == null ? null : corpusPosFor(form, fields);
      if (newPos != null) {
        add(dictionary, form, { pos: newPos });
      }
    }
  }
};

const dictionary: Dictionary = new Map();
[
  addHandpickedWords,
  addInflections,
  addWordnetVocabulary,
  addAntonymVocabulary,
  addEmojis,
  addFrequencies,
  addPrepositionalPairs,
  addPos,
].forEach((f) => f(dictionary));

console.log(`Count: ${dictionary.size}`);

const out = createWriteStream(dictionaryPath).on("error", console.error);
out.write("[\n");
[...dictionary.entries()]
  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  .forEach((entry, i, { length }) =>
    out.write(`${JSON.stringify(entry)}${i === length - 1 ? "" : ","}\n`),
  );
out.write("]\n");
