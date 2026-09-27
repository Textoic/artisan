import type {
  LexicalFeatures,
  PartiallyParsedToken,
  PosTag,
  PosWeights,
  TokenMatcher,
} from "../types.js";

const tagIndexMap: { [tag: string]: number } = {
  VERB: 0,
  NOUN: 1,
  MARK: 2,
  ADJ: 3,
  ADV: 4,
  PUNCT: 5,
  INTJ: 6,
};

export const tagOrder = (tag1: string, tag2: string) =>
  tagIndexMap[tag1] - tagIndexMap[tag2];

export const translativeDegree = ({
  feats: { AdpType, ConjType } = {},
}: {
  feats?: LexicalFeatures;
}) => (!AdpType && ConjType === "Sub" ? 2 : AdpType && !ConjType ? 1 : 0);

export const markerDegreeLabel = (token: { feats?: LexicalFeatures }) => {
  const degree = translativeDegree(token);
  return degree === 0 ? "MARK" : `MARK/${degree}`;
};

const terminatorTypes = ["Peri", "Qest", "Excl", "Comm", "Colo", "Semi"];

export const isTerminatorType = (type?: string) =>
  type != null && terminatorTypes.includes(type);

export const isTerminator = ({
  feats: { PunctType },
}: {
  feats: LexicalFeatures;
}) => isTerminatorType(PunctType);

const delimiterTypes = ["Quot", "Brck", "Comm"];

export const isDelimiter = ({
  feats: { PunctType },
}: {
  feats: LexicalFeatures;
}) => PunctType != null && delimiterTypes.includes(PunctType);

const pairedDelimiterTypes = ["Quot", "Brck"];

export const isGerund = ({
  feats: { Tense, VerbForm },
}: {
  feats: LexicalFeatures;
}) => Tense === "Pres" && VerbForm === "Part";

const timeModifiers = ["now", "yesterday", "tomorrow"];

export const isTimeModifier = ({ lemma }: { lemma?: string }) =>
  timeModifiers.includes(lemma ?? "");

const objectComplementVerbs = [
  "call",
  "consider",
  "declare",
  "deem",
  "feel",
  "find",
  "get",
  "have",
  "hear",
  "help",
  "keep",
  "leave",
  "let",
  "make",
  "name",
  "paint",
  "prove",
  "render",
  "see",
  "turn",
  "watch",
];

export const takesObjectComplement = (lemma?: string) =>
  objectComplementVerbs.includes(lemma ?? "");

export const canStillBe = (
  token: { xpos?: string; misc?: { pos?: PosWeights } },
  tags: PosTag[],
) => {
  const { xpos, misc: { pos = {} } = {} } = token;
  return xpos == null
    ? tags.some((tag) => Boolean(pos[tag]))
    : tags.includes(xpos as PosTag);
};

export const isNegator = ({ lemma }: { lemma?: string }) => lemma === "not";

const auxiliaryLemmas = ["be", "do", "have"];

const isAuxiliaryOrModal = (token: PartiallyParsedToken) => {
  const {
    lemma,
    feats: { Mood },
  } = token;
  return (
    canStillBe(token, ["VERB"]) &&
    (Mood != null || auxiliaryLemmas.includes(lemma ?? ""))
  );
};

const isSettledAdverb = (token: PartiallyParsedToken) => {
  const {
    xpos,
    misc: { pos },
  } = token;
  const tags = Object.keys(pos);
  return (
    xpos === "ADV" || (xpos == null && tags.length === 1 && tags[0] === "ADV")
  );
};

export const negatesVerbGroup = (
  tokens: PartiallyParsedToken[],
  index: number,
) =>
  index > 0 &&
  isNegator(tokens[index]) &&
  isAuxiliaryOrModal(tokens[index - 1]);

export const findNegatedVerb = (
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  if (!negatesVerbGroup(tokens, index)) {
    return -1;
  }

  let candidate = index + 1;
  while (candidate < tokens.length && isSettledAdverb(tokens[candidate])) {
    candidate += 1;
  }

  return candidate < tokens.length && canStillBe(tokens[candidate], ["VERB"])
    ? candidate
    : -1;
};

const isNonFiniteRelativeRoot = (
  tokens: PartiallyParsedToken[],
  heads: number[],
  headVerb: number,
) => {
  const {
    feats: { Tense, VerbForm },
  } = tokens[headVerb];
  const grandparent = heads[headVerb];
  return (
    Tense === "Past" &&
    VerbForm !== "Fin" &&
    grandparent !== -2 &&
    tokens[grandparent].xpos === "NOUN"
  );
};

const isPastOrParticiple = ({
  feats: { Tense, VerbForm },
}: PartiallyParsedToken) => VerbForm === "Part" || Tense === "Past";

const tensedHeadAcceptsChild = (
  head: PartiallyParsedToken,
  child: PartiallyParsedToken,
) => {
  const {
    lemma: headLemma,
    feats: { Mood: headMood, Tense: headTense },
  } = head;
  const {
    lemma,
    feats: { Tense, VerbForm, Person },
  } = child;
  const isDoSupport =
    headLemma === "do" && (Person === 1 || headTense === "Past");
  return (
    Boolean(headMood) ||
    isDoSupport ||
    VerbForm === "Part" ||
    (Tense === "Past" && lemma !== "be")
  );
};

export const verbsAreCompatible = (
  tokens: PartiallyParsedToken[],
  heads: number[],
  headVerb: number,
  childVerb: number,
) => {
  if (isNonFiniteRelativeRoot(tokens, heads, headVerb)) {
    return false;
  }

  const head = tokens[headVerb];
  const {
    feats: { Tense: headTense, VerbForm: headVerbForm },
  } = head;
  return headVerbForm === "Fin" || headTense === "Past"
    ? tensedHeadAcceptsChild(head, tokens[childVerb])
    : isPastOrParticiple(tokens[childVerb]);
};

export const hasVerbLaterInClause = (
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  let currentIndex = index + 1;
  while (currentIndex < tokens.length) {
    const {
      xpos,
      feats: { ConjType },
      misc: { pos },
    } = tokens[currentIndex];
    if (xpos === "MARK" && ConjType) {
      return false;
    }

    if (xpos === "VERB" || pos.VERB) {
      return true;
    }

    currentIndex += 1;
  }

  return false;
};

export const isFollowedByClause = (
  tokens: PartiallyParsedToken[],
  currentIndex: number,
) => {
  if (currentIndex >= tokens.length - 1) {
    return false;
  }

  let index = currentIndex + 1;
  while (index < tokens.length) {
    const {
      xpos = "X",
      misc: { pos },
    } = tokens[index];
    if (xpos === "VERB" || pos.VERB) {
      return true;
    }

    if (
      ["ADV", "ADJ", "NOUN"].includes(xpos) ||
      Object.keys(pos).every((xpos) => ["ADV", "ADJ", "NOUN"].includes(xpos))
    ) {
      index += 1;
    } else {
      return false;
    }
  }

  return false;
};

const capitalizedRegExp = /\p{Lu}/u;

export const isCapitalizedWord = (form: string) => {
  const firstCharacter = form.charAt(0);
  if (["#", "@"].includes(firstCharacter) && form.length > 1) {
    return capitalizedRegExp.test(form.charAt(1));
  }

  return capitalizedRegExp.test(firstCharacter);
};

export const hasChildWithMatcher = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  index: number,
  matches: TokenMatcher,
) =>
  heads.some(
    (head, child) => head === index && matches(tokens[child], child, tokens),
  );

export const hasAppositivePunctuation = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  appositiveRoot: number,
  isSentenceEnd = false,
) => {
  let terminators = 0;
  let delimiters = 0;
  heads.forEach((head, child) => {
    if (head !== appositiveRoot) {
      return;
    }

    const token = tokens[child];
    const {
      feats: { PunctType },
    } = token;
    if (PunctType == null) {
      return;
    }

    if (pairedDelimiterTypes.includes(PunctType)) {
      delimiters += 1;
    }

    if (isTerminator(token)) {
      terminators += 1;
    }
  });

  return (
    (terminators === 1 && isSentenceEnd) ||
    terminators === 2 ||
    delimiters === 2
  );
};
