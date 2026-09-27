import irregularDictionary from "./irregular-dictionary.js";
import type {
  LexicalFeatures,
  NominalNumber,
  PosTag,
  VerbPerson,
  Tense as VerbTense,
  VerbForm as VerbalForm,
} from "../types.js";
import { trace } from "../trace.js";

export enum InflectionKeys {
  PRESENT_THIRD_PERSON = 1,
  PAST_SIMPLE = 2,
  PRESENT_PART = 3,
  PAST_PART = 4,
  PLURAL = 5,
}

const { PRESENT_THIRD_PERSON, PAST_SIMPLE, PRESENT_PART, PAST_PART, PLURAL } =
  InflectionKeys;

const endsInSibilantOrO = /(?:[sxz]|[^o]o|sh|ch)$/iu;
const endsInConsonantPlusY = /[^aeiou]y$/iu;
const endsInIs = /is$/iu;
const endsInIe = /ie$/iu;
const endsInE = /e$/iu;
const endsInC = /c$/iu;
const endsInConsonantBeforeY = /[^aeiou]y$/iu;
const endsInDoublingR = /(?:b[au]|ch?[au]|f[eu]|ja|lu|m[au]|p[au]|wh?[ai])r$/iu;
const endsInDoublingConsonant = /[^aeiou][aeiou][bdfgmp]$/iu;

const inflectNoun = ({
  lemma = "",
  feats: { Number = undefined } = {},
}: {
  lemma?: string;
  feats?: { Number?: NominalNumber };
}) => {
  if (Number === "Sing") {
    return lemma;
  }

  if (endsInIs.test(lemma)) {
    return `${lemma.slice(0, lemma.length - 2)}es`;
  }

  if (endsInSibilantOrO.test(lemma)) {
    return `${lemma}es`;
  }

  if (endsInConsonantPlusY.test(lemma)) {
    return `${lemma.slice(0, lemma.length - 1)}ies`;
  }

  return `${lemma}s`;
};

const inflectPast = (lemma: string) => {
  if (endsInE.test(lemma)) {
    return `${lemma}d`;
  }

  if (endsInC.test(lemma)) {
    return `${lemma}ked`;
  }

  if (endsInConsonantBeforeY.test(lemma)) {
    return `${lemma.slice(0, lemma.length - 1)}ied`;
  }

  if (endsInDoublingR.test(lemma)) {
    return `${lemma}red`;
  }

  if (endsInDoublingConsonant.test(lemma)) {
    return `${lemma}${lemma[lemma.length - 1]}ed`;
  }

  return `${lemma}ed`;
};

const inflectPresentParticiple = (lemma: string) => {
  if (endsInIe.test(lemma)) {
    return `${lemma.slice(0, lemma.length - 2)}ying`;
  }

  if (endsInE.test(lemma)) {
    return `${lemma.slice(0, lemma.length - 1)}ing`;
  }

  if (endsInC.test(lemma)) {
    return `${lemma}king`;
  }

  if (endsInDoublingR.test(lemma)) {
    return `${lemma}ring`;
  }

  if (endsInDoublingConsonant.test(lemma)) {
    return `${lemma}${lemma[lemma.length - 1]}ing`;
  }

  return `${lemma}ing`;
};

const inflectThirdPersonSingular = (lemma: string) => {
  if (endsInSibilantOrO.test(lemma)) {
    return `${lemma}es`;
  }

  if (endsInConsonantPlusY.test(lemma)) {
    return `${lemma.slice(0, lemma.length - 1)}ies`;
  }

  return `${lemma}s`;
};

const inflectVerb = ({
  lemma = "",
  feats = {},
}: {
  lemma?: string;
  feats?: {
    Person?: VerbPerson;
    Number?: NominalNumber;
    VerbForm?: VerbalForm;
    Tense?: VerbTense;
  };
}) => {
  const { Person, Number = "Sing", VerbForm, Tense } = feats;
  if (Tense === "Past") {
    return inflectPast(lemma);
  }

  if (VerbForm === "Part") {
    return inflectPresentParticiple(lemma);
  }

  if (Person === 3 && Number === "Sing") {
    return inflectThirdPersonSingular(lemma);
  }

  return lemma;
};

const inflectRegular = ({
  xpos,
  lemma,
  feats,
}: {
  xpos?: PosTag;
  lemma?: string;
  feats?: LexicalFeatures;
}) => {
  switch (xpos) {
    case "NOUN":
      return inflectNoun({ lemma, feats });
    case "VERB":
      return inflectVerb({ lemma, feats });
    default:
      return lemma;
  }
};

const pastBe = (Person?: VerbPerson, Number?: NominalNumber) =>
  Person && Person !== 2 && Number === "Sing" ? "was" : "were";

const presentBe = (Person?: VerbPerson, Number?: NominalNumber) => {
  if (Number === "Plur") {
    return "are";
  }

  if (Person === 1) {
    return "am";
  }

  return Person === 3 ? "is" : "are";
};

const inflectBe = ({ feats }: { feats?: LexicalFeatures }) => {
  const { Person, VerbForm, Tense, Number } = feats ?? {};
  if (VerbForm === "Part") {
    return Tense === "Past" ? "been" : "being";
  }

  return Tense === "Past" ? pastBe(Person, Number) : presentBe(Person, Number);
};

const irregularVerbForm = (
  entry: Record<number, string>,
  lemma: string | undefined,
  { Person, Number, VerbForm, Tense }: LexicalFeatures,
) => {
  if (Tense === "Past") {
    return VerbForm === "Part" && entry[PAST_PART] != null
      ? entry[PAST_PART]
      : entry[PAST_SIMPLE];
  }

  if (VerbForm === "Part") {
    return entry[PRESENT_PART];
  }

  return Person === 3 && Number === "Sing"
    ? entry[PRESENT_THIRD_PERSON]
    : lemma;
};

const inflectIrregular = (
  dictionary: Record<string, Record<number, string>>,
  {
    lemma,
    xpos,
    feats: { Number, Person, VerbForm, Tense } = {},
  }: {
    lemma?: string;
    xpos?: PosTag;
    feats?: LexicalFeatures;
  },
) => {
  const entry = lemma ? dictionary[lemma] : null;
  trace(
    () =>
      `Inflect ${lemma} with feats ${JSON.stringify({
        lemma,
        xpos,
        Number,
        Person,
        VerbForm,
        Tense,
      })} and entry ${JSON.stringify(entry)}`,
  );

  if (entry == null) {
    return null;
  }

  if (xpos === "NOUN") {
    return Number === "Plur" ? entry[PLURAL] : lemma;
  }

  return xpos === "VERB"
    ? irregularVerbForm(entry, lemma, { Number, Person, VerbForm, Tense })
    : null;
};

export default ({
  lemma,
  xpos,
  feats,
}: {
  lemma?: string;
  xpos?: PosTag;
  feats?: LexicalFeatures;
}) => {
  if (lemma === "be") {
    return inflectBe({ feats });
  }

  const irregularInflection = inflectIrregular(irregularDictionary, {
    lemma,
    xpos,
    feats,
  });
  if (irregularInflection != null) {
    return irregularInflection;
  }

  return inflectRegular({ lemma, xpos, feats });
};
