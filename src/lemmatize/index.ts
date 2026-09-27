import type {
  Dictionary,
  LexicalFeatures,
  PosTag,
  PosWeights,
  SurfaceLexicalFeatures,
} from "../types.js";

const adjectiveSuffixes = /(?:ine|ous|bound|most|like|ical)$/iu;

const irregularSingularsSuffixes = /(?:asis|ness|(?:it|nc|log)y)$/iu;

const irregularPluralSuffixIes = /(?:log|it|nc)ies$/iu;

const simpleNounSuffixes =
  /(?:ation|ment|[st]ion|ence|ship|ism|ium|ifier)s?$/iu;

const verbLemmaSuffixes = /(?:ise|ify|ate)$/iu;

const adjectiveNounSuffixes = /(?:ist|ful|ian|oid)s?$/iu;

const findPluralLemma = (lemma: string, dictionary: Dictionary) => {
  const { pos: lemmaPos = {} } = dictionary.get(lemma) || {};
  const pos: PosWeights = {};
  const feats: LexicalFeatures = {};
  if (lemmaPos.NOUN) {
    pos.NOUN = 1;
    feats.Number = "Plur";
  }

  if (lemmaPos.VERB) {
    pos.VERB = 1;
    feats.VerbForm = "Fin";
    feats.Tense = "Pres";
    feats.Person = 3;
  }

  if (lemmaPos.NOUN || lemmaPos.VERB) {
    return { lemma, pos, feats };
  }

  return null;
};

type Reading = SurfaceLexicalFeatures | null;

type Analyzer = (word: string, dictionary: Dictionary) => Reading;

const knows = (dictionary: Dictionary, related: string, tag: PosTag) => {
  const { pos = {} } = dictionary.get(related) || {};
  return Boolean(pos[tag]);
};

const firstKnownVerb = (dictionary: Dictionary, stems: string[]) =>
  stems.find((stem) => knows(dictionary, stem, "VERB"));

const firstPlural = (dictionary: Dictionary, candidates: string[]) => {
  for (const candidate of candidates) {
    const found = findPluralLemma(candidate, dictionary);
    if (found != null) {
      return found;
    }
  }

  return null;
};

const numberOf = (word: string) => {
  const plural = word.endsWith("s");
  return { plural, stem: plural ? word.slice(0, -1) : word };
};

type RelatedReading = {
  related: string;
  tag: PosTag;
  whenKnown: PosWeights;
  otherwise: PosWeights;
};

const byRelatedWord = (
  word: string,
  dictionary: Dictionary,
  { related, tag, whenKnown, otherwise }: RelatedReading,
): SurfaceLexicalFeatures => ({
  lemma: word,
  pos: knows(dictionary, related, tag) ? whenKnown : otherwise,
});

const ADVERB_UNLESS_ADJECTIVE = {
  tag: "ADJ" as PosTag,
  whenKnown: { ADV: 1 },
  otherwise: { ADJ: 1, ADV: 1 },
};

const ADJECTIVE_IF_ADVERB_EXISTS = {
  tag: "ADV" as PosTag,
  whenKnown: { ADJ: 1 },
  otherwise: { ADJ: 1, ADV: 1 },
};

const asIngly: Analyzer = (word) =>
  word.endsWith("ingly") ? { lemma: word, pos: { ADV: 1 } } : null;

const asAdjectiveSuffix: Analyzer = (word) =>
  adjectiveSuffixes.test(word) ? { lemma: word, pos: { ADJ: 1 } } : null;

const asProof: Analyzer = (word) =>
  word.endsWith("proof")
    ? {
        lemma: word,
        pos: { ADJ: 1, VERB: 1 },
        feats: { VerbForm: "Fin", Tense: "Pres", Person: 1 },
      }
    : null;

const asIrregularSingular: Analyzer = (word) =>
  irregularSingularsSuffixes.test(word)
    ? { lemma: word, pos: { NOUN: 1 }, feats: { Number: "Sing" } }
    : null;

const asIrregularPlural: Analyzer = (word) =>
  irregularPluralSuffixIes.test(word)
    ? {
        lemma: `${word.slice(0, -3)}y`,
        pos: { NOUN: 1 },
        feats: { Number: "Plur" },
      }
    : null;

const asSimpleNoun: Analyzer = (word) => {
  if (!simpleNounSuffixes.test(word)) {
    return null;
  }

  const { plural, stem } = numberOf(word);
  return {
    lemma: stem,
    pos: { NOUN: 1 },
    feats: { Number: plural ? "Plur" : "Sing" },
  };
};

const asAdjectiveNoun: Analyzer = (word) => {
  if (!adjectiveNounSuffixes.test(word)) {
    return null;
  }

  const { plural, stem } = numberOf(word);
  return {
    lemma: stem,
    feats: { Number: plural ? "Plur" : "Sing" },
    pos: plural ? { NOUN: 1 } : { NOUN: 1, ADJ: 1 },
  };
};

const asWise: Analyzer = (word) =>
  word.endsWith("wise") ? { lemma: word, pos: { ADJ: 1, ADV: 1 } } : null;

const asVerbLemma: Analyzer = (word) =>
  verbLemmaSuffixes.test(word)
    ? {
        lemma: word,
        pos: { VERB: 1 },
        feats: { VerbForm: "Fin", Tense: "Pres", Person: 1 },
      }
    : null;

const asAge: Analyzer = (word) => {
  if (!word.endsWith("age") && !word.endsWith("ages")) {
    return null;
  }

  const { plural, stem } = numberOf(word);
  return {
    lemma: stem,
    feats: {
      Number: plural ? "Plur" : "Sing",
      VerbForm: "Fin",
      Tense: "Pres",
      Person: plural ? 3 : 1,
    },
    pos: { NOUN: 1, VERB: 1 },
  };
};

const asIly: Analyzer = (word, dictionary) =>
  word.endsWith("ily")
    ? byRelatedWord(word, dictionary, {
        related: `${word.slice(0, -3)}y`,
        ...ADVERB_UNLESS_ADJECTIVE,
      })
    : null;

const asBly: Analyzer = (word, dictionary) =>
  word.endsWith("bly")
    ? byRelatedWord(word, dictionary, {
        related: `${word.slice(0, -1)}e`,
        ...ADVERB_UNLESS_ADJECTIVE,
      })
    : null;

const asIcally: Analyzer = (word, dictionary) =>
  word.endsWith("ically")
    ? byRelatedWord(word, dictionary, {
        related: word.slice(0, -4),
        ...ADVERB_UNLESS_ADJECTIVE,
      })
    : null;

const asLe: Analyzer = (word, dictionary) =>
  word.endsWith("le")
    ? byRelatedWord(word, dictionary, {
        related: `${word.slice(0, -1)}y`,
        ...ADJECTIVE_IF_ADVERB_EXISTS,
      })
    : null;

const NOMINALIZING_SUFFIXES = ["ancy", "ency", "ance", "ence", "ation"];

const asEntOrAnt: Analyzer = (word, dictionary) => {
  if (!word.endsWith("ent") && !word.endsWith("ant")) {
    return null;
  }

  const nouns = NOMINALIZING_SUFFIXES.map(
    (suffix) => `${word.slice(0, -3)}${suffix}`,
  );
  return nouns.some((noun) => knows(dictionary, noun, "NOUN"))
    ? { lemma: word, pos: { ADJ: 1 } }
    : null;
};

const asIc: Analyzer = (word, dictionary) =>
  word.endsWith("ic")
    ? byRelatedWord(word, dictionary, {
        related: `${word}ally`,
        ...ADJECTIVE_IF_ADVERB_EXISTS,
      })
    : null;

const asIal: Analyzer = (word, dictionary) =>
  word.endsWith("ial")
    ? byRelatedWord(word, dictionary, {
        related: word.slice(0, -3),
        tag: "NOUN",
        whenKnown: { ADJ: 1 },
        otherwise: { ADJ: 1, ADV: 1 },
      })
    : null;

const asPastParticiple = (dictionary: Dictionary, stems: string[]): Reading => {
  const lemma = firstKnownVerb(dictionary, stems);
  return lemma == null
    ? null
    : { lemma, pos: { VERB: 1, ADJ: 1 }, feats: { Tense: "Past" } };
};

const asIed: Analyzer = (word, dictionary) =>
  word.endsWith("ied")
    ? asPastParticiple(dictionary, [`${word.slice(0, -3)}y`])
    : null;

const asEd: Analyzer = (word, dictionary) =>
  word.endsWith("ed")
    ? asPastParticiple(dictionary, [word.slice(0, -1), word.slice(0, -2)])
    : null;

const asIng: Analyzer = (word, dictionary) => {
  if (!word.endsWith("ing")) {
    return null;
  }

  const lemma = firstKnownVerb(dictionary, [
    word.slice(0, -3),
    `${word.slice(0, -3)}e`,
  ]);
  return lemma == null
    ? null
    : {
        lemma,
        pos: { NOUN: 1, VERB: 1, ADJ: 1 },
        feats: { VerbForm: "Part", Tense: "Pres", Number: "Sing" },
      };
};

const asIes: Analyzer = (word, dictionary) =>
  word.endsWith("ies")
    ? firstPlural(dictionary, [`${word.slice(0, -3)}y`, word.slice(0, -1)])
    : null;

const asEs: Analyzer = (word, dictionary) =>
  word.endsWith("es")
    ? firstPlural(dictionary, [word.slice(0, -1), word.slice(0, -2)])
    : null;

const asS: Analyzer = (word, dictionary) =>
  word.endsWith("s") ? firstPlural(dictionary, [word.slice(0, -1)]) : null;

const asY: Analyzer = (word, dictionary) => {
  if (!word.endsWith("y")) {
    return null;
  }

  const noun = word.slice(0, -1);
  const derivedFromNoun =
    knows(dictionary, noun, "NOUN") || knows(dictionary, `${noun}ily`, "ADV");
  return {
    lemma: word,
    pos: derivedFromNoun ? { ADJ: 1 } : { ADJ: 1, ADV: 1, NOUN: 1 },
  };
};

const analyzers: Analyzer[] = [
  asIngly,
  asAdjectiveSuffix,
  asProof,
  asIrregularSingular,
  asIrregularPlural,
  asSimpleNoun,
  asAdjectiveNoun,
  asWise,
  asVerbLemma,
  asAge,
  asIly,
  asBly,
  asIcally,
  asLe,
  asEntOrAnt,
  asIc,
  asIal,
  asIed,
  asEd,
  asIng,
  asIes,
  asEs,
  asS,
  asY,
];

export default (
  word: string,
  { dictionary }: { dictionary: Dictionary },
): SurfaceLexicalFeatures => {
  for (const analyze of analyzers) {
    const reading = analyze(word, dictionary);
    if (reading != null) {
      return reading;
    }
  }

  return { lemma: word, pos: { NOUN: 1 } };
};
