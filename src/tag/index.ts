import featurize from "../featurize/index.js";
import { trace } from "../trace.js";
import predict from "./predict.js";
import { isAuditing, recordTagEvent, type TagVerdict } from "./audit.js";
import {
  canStillBe,
  hasAppositivePunctuation,
  hasChildWithMatcher,
  hasVerbLaterInClause,
  isCapitalizedWord,
  isGerund,
  isNegator,
  isSubjectPronoun,
  isSubstantiveNoun,
  isTimeModifier,
  negatesVerbGroup,
  tagOrder,
  takesObjectComplement,
  verbsAreCompatible,
} from "../grammar/index.js";
import {
  canBeSubjectOfWhenTagging,
  isPhraseBoundaryType,
} from "../grammar/divergent.js";
import type {
  FeatureWeights,
  ParseState,
  PosTag,
  PartiallyParsedToken,
  Token,
  LexicalFeatures,
  NominalNumber,
  Step,
} from "../types.js";

type RuleArgs = {
  flexibleMode: boolean;
  hasAlternativePath: boolean;
  sortedPosTags: PosTag[];
  tokens: PartiallyParsedToken[];
  index: number;
  taggedWindow: PartiallyParsedToken[];
  token: PartiallyParsedToken;
  foreToken: PartiallyParsedToken;
  foreToken2: PartiallyParsedToken;
  aftToken: PartiallyParsedToken;
  stack: number[];
  heads: number[];
  steps: Step[];
};

type RuleCondition = (args: RuleArgs) => boolean | undefined | null | number;

type RuleFeatures = {
  parentDirection?: "L" | "R";
};

type TaggingState = ParseState & { weights: FeatureWeights };

type Rule = {
  id: string;
  when: RuleCondition;
  features: RuleFeatures | null;
};

const END_TOKEN = {
  xpos: "END",
  feats: {},
  misc: {},
} as PartiallyParsedToken;

const START_TOKEN = {
  xpos: "START",
  feats: {},
  misc: {},
} as PartiallyParsedToken;

const isCompoundNoun = ({
  token: {
    feats: { PronType, NumType },
  },
  aftToken: {
    xpos: aftTag,
    feats: { PronType: aftPronType, NumType: aftNumType },
  },
}: RuleArgs) =>
  aftTag === "NOUN" &&
  !PronType &&
  !aftPronType &&
  !(NumType === "Card" && aftNumType !== "Card");

const nounHasRightVerbParent = ({
  token: {
    feats: { Case },
  },
  foreToken: { xpos: foreTag },
  aftToken: { xpos: aftTag },
}: RuleArgs) => (Case !== "Acc" || foreTag !== "VERB") && aftTag === "VERB";

const headsPhraseOnItsRight = (
  marker: PartiallyParsedToken,
  afterMarker: PartiallyParsedToken,
) => {
  const {
    xpos,
    feats: { AdpType, ConjType },
  } = marker;
  const {
    xpos: afterMarkerTag,
    feats: { PunctType: afterMarkerPunctType },
  } = afterMarker;
  const closesTheClause =
    AdpType != null &&
    ConjType != null &&
    ["END", "MARK"].includes(String(afterMarkerTag));
  return (
    xpos === "MARK" &&
    (AdpType === "Post" ||
      closesTheClause ||
      isPhraseBoundaryType(afterMarkerPunctType))
  );
};

const nounHasRightMarkerParent = ({
  tokens,
  index,
  foreToken: { xpos: foreTag },
  token: {
    feats: { Case },
  },
}: RuleArgs) => {
  const aftToken = index + 1 < tokens.length ? tokens[index + 1] : END_TOKEN;
  const aftToken2 = index + 2 < tokens.length ? tokens[index + 2] : END_TOKEN;
  return (
    (Case !== "Acc" || foreTag !== "VERB") &&
    headsPhraseOnItsRight(aftToken, aftToken2)
  );
};

const hasGerundVerbHeadInStack = (
  stack: number[],
  tokens: PartiallyParsedToken[],
  taggedWindow: PartiallyParsedToken[],
) => {
  let indexInStack = stack.length - 1;
  while (indexInStack >= 0) {
    const id = stack[indexInStack];
    const { xpos: stackTag, lemma: stackLemma } = tokens[id];
    const isVerbInTaggedWindow = taggedWindow.some(
      ({ id: taggedIndex, xpos: tagInWindow }) =>
        id === taggedIndex && tagInWindow === "VERB",
    );
    if (stackTag === "VERB" || isVerbInTaggedWindow) {
      return stackLemma === "be";
    }

    if (stackTag === "MARK") {
      return false;
    }

    indexInStack -= 1;
  }

  return false;
};

const UNKNOWN_TOKEN = {
  xpos: "X",
  feats: {},
  misc: {},
} as PartiallyParsedToken;

const stackHeadOr = (
  stack: number[],
  tokens: PartiallyParsedToken[],
  fallback: PartiallyParsedToken,
  minimumStackDepth: number,
) =>
  stack.length < minimumStackDepth ? fallback : tokens[stack[stack.length - 2]];

const gerundFollowsVerbalContext = ({
  stack,
  tokens,
  foreToken: {
    xpos: foreTag,
    feats: { VerbForm: foreVerbForm },
  },
}: RuleArgs) => {
  const {
    xpos: stackHeadTag,
    feats: { ConjType: stackHeadConjType },
  } = stackHeadOr(stack, tokens, START_TOKEN, 2);
  return (
    (stackHeadTag === "MARK" && Boolean(stackHeadConjType)) ||
    (foreTag === "VERB" && foreVerbForm === "Fin")
  );
};

const gerundTakesAnObject = ({
  aftToken: {
    xpos: aftTag,
    feats: { PronType: aftPronType },
  },
}: RuleArgs) =>
  ["ADJ", "NOUN"].includes(String(aftTag)) || Boolean(aftPronType);

const gerundHeadsReducedRelative = ({
  stack,
  tokens,
  taggedWindow,
  foreToken: { xpos: foreTag },
  aftToken: {
    misc: { pos: aftPos = {} },
  },
}: RuleArgs) =>
  foreTag === "NOUN" &&
  !hasGerundVerbHeadInStack(stack, tokens, taggedWindow) &&
  Boolean(aftPos.MARK);

const isInvalidGerundNoun = (args: RuleArgs) =>
  isGerund(args.token) &&
  (gerundFollowsVerbalContext(args) ||
    gerundTakesAnObject(args) ||
    gerundHeadsReducedRelative(args));

const isRightHeadedAdverb = ({
  aftToken: { xpos: aftTag },
  foreToken2: { xpos: foreTag2 },
  token: {
    feats: { PronType },
  },
}: RuleArgs) => Boolean(PronType) && aftTag === "ADV" && foreTag2 === "NOUN";

const isInvalidCompoundNoun = ({
  foreToken: {
    xpos: foreTag,
    feats: { PronType: forePronType, Tense: foreTense },
    misc: { parentDirection: foreDirection },
  },
  token: {
    lemma,
    feats: { VerbForm, Tense },
  },
}: RuleArgs) =>
  foreTag === "NOUN" &&
  !forePronType &&
  ((VerbForm === "Part" && Tense === "Past") ||
    isTimeModifier({ lemma }) ||
    foreDirection === "L" ||
    foreTense === "Past");

const isInvalidNounAfterPronoun = ({
  token: {
    feats: { PronType },
  },
  foreToken: {
    xpos: foreTag,
    feats: { Case, PronType: forePronType, NumType: foreNumType },
  },
}: RuleArgs) =>
  foreTag === "NOUN" &&
  !PronType &&
  Boolean(forePronType) &&
  !foreNumType &&
  Case !== "Acc";

const canOmitMarker = ({ feats: { Poss, PronType }, misc: { pos } }: Token) =>
  pos.NOUN &&
  (["Ind", "Neg", "Tot"].includes(String(PronType)) ||
    (PronType === "Prs" && Poss));

const isRelativeClauseMarkerPronoun = ({
  foreToken: { xpos: foreTag },
  token,
}: {
  foreToken: PartiallyParsedToken;
  token: PartiallyParsedToken;
}) => foreTag === "NOUN" && canOmitMarker(token);

const closesVerbSearch = (
  taggedWindow: PartiallyParsedToken[],
  indexInWindow: number,
) => {
  const token = taggedWindow[indexInWindow];
  const foreToken =
    indexInWindow > 0
      ? taggedWindow[indexInWindow - 1]
      : ({ xpos: "START" } as PartiallyParsedToken);
  return (
    ["PUNCT", "MARK"].includes(token.xpos ?? "") ||
    isRelativeClauseMarkerPronoun({ foreToken, token })
  );
};

const findLeftVerbHead = (taggedWindow: PartiallyParsedToken[]) => {
  let indexInWindow = taggedWindow.length - 1;
  let crossedObject = false;
  while (indexInWindow >= 0) {
    const {
      xpos,
      lemma,
      feats: { VerbForm },
      id,
    } = taggedWindow[indexInWindow];

    if (xpos === "VERB" && VerbForm !== "Part") {
      return !crossedObject || takesObjectComplement(lemma) ? id : null;
    }

    if (closesVerbSearch(taggedWindow, indexInWindow)) {
      return null;
    }

    if (xpos === "NOUN") {
      if (crossedObject) {
        return null;
      }

      crossedObject = true;
    }

    indexInWindow -= 1;
  }

  return null;
};

const isMarkerObject = (taggedWindow: PartiallyParsedToken[]) => {
  let indexInWindow = taggedWindow.length - 1;
  while (indexInWindow >= 0) {
    const {
      xpos,
      feats: { ConjType },
    } = taggedWindow[indexInWindow];
    if (xpos === "MARK" && !ConjType) {
      return true;
    }

    if (["PUNCT", "VERB", "NOUN"].includes(String(xpos))) {
      return false;
    }

    indexInWindow -= 1;
  }

  return false;
};

const isPerfectOrPassiveComplement = (
  { feats: { Tense, VerbForm } }: PartiallyParsedToken,
  { lemma: headLemma }: PartiallyParsedToken,
) =>
  Tense === "Past" &&
  (VerbForm === "Part" || headLemma === "have" || headLemma === "be");

const isBareInfinitiveComplement = (
  { form, lemma, feats: { Tense, VerbForm } }: PartiallyParsedToken,
  {
    lemma: headLemma,
    feats: { Mood: headMood, VerbForm: headVerbForm },
  }: PartiallyParsedToken,
) => {
  const isDoSupported = headLemma === "do" && headVerbForm === "Fin";
  const isModalComplement =
    headLemma !== "be" && Boolean(headMood) && lemma === form.toLowerCase();
  return (
    Tense === "Pres" &&
    VerbForm === "Fin" &&
    (isDoSupported || isModalComplement)
  );
};

const isModalVerbComplement = ({ token, foreToken }: RuleArgs) =>
  foreToken.xpos === "VERB" &&
  Boolean(foreToken.feats.Mood) &&
  isBareInfinitiveComplement(token, foreToken);

const isDoSupport = ({
  xpos,
  lemma,
  feats: { VerbForm },
}: PartiallyParsedToken) =>
  xpos === "VERB" && lemma === "do" && VerbForm === "Fin";

const questionWords = new Set(["why", "how", "when", "where", "what", "who"]);

const opensAQuestion = (before: PartiallyParsedToken[], at: number) =>
  at === 0 ||
  before[at - 1].xpos === "START" ||
  questionWords.has(String(before[at - 1].form).toLowerCase());

const supportsAVerbAt = (before: PartiallyParsedToken[], at: number) => {
  const next = before[at + 1] as PartiallyParsedToken | undefined;
  return (
    isDoSupport(before[at]) &&
    (opensAQuestion(before, at) || (next != null && isNegator(next)))
  );
};

const isBareInfinitive = ({
  form = "",
  lemma,
  misc: { pos = {} },
  feats: { Tense, VerbForm },
}: PartiallyParsedToken) =>
  Boolean(pos.VERB) &&
  Tense === "Pres" &&
  VerbForm === "Fin" &&
  lemma === form.toLowerCase();

const endsTheClause = (token: PartiallyParsedToken) =>
  token.xpos === "PUNCT" ||
  Boolean(token.misc.pos?.PUNCT) ||
  token.feats.ConjType != null;

const isTheVerbDoSupports = ({
  tokens,
  index,
  token,
  taggedWindow,
}: RuleArgs) => {
  if (!isBareInfinitive(token)) {
    return false;
  }

  const before = [
    ...tokens.slice(0, Math.max(0, index - taggedWindow.length)),
    ...taggedWindow,
  ];
  const support = before
    .map((_, at) => supportsAVerbAt(before, at))
    .lastIndexOf(true);
  const rest = tokens.slice(index + 1);
  const clauseEnd = rest.findIndex(endsTheClause);
  return (
    support !== -1 &&
    !before.slice(support + 1).some(({ xpos }) => xpos === "VERB") &&
    !(clauseEnd === -1 ? rest : rest.slice(0, clauseEnd)).some(isBareInfinitive)
  );
};

const isCompatibleVerb = ({
  taggedWindow,
  token,
  foreToken: { lemma: foreLemma },
}: {
  taggedWindow: PartiallyParsedToken[];
  token: PartiallyParsedToken;
  foreToken: PartiallyParsedToken;
}) => {
  const {
    feats: { Tense, VerbForm },
  } = token;
  if (foreLemma === "be" && (Tense === "Past" || VerbForm === "Part")) {
    return true;
  }

  let indexInWindow = taggedWindow.length - 1;
  while (indexInWindow >= 0) {
    const head = taggedWindow[indexInWindow];
    if (head.xpos === "VERB") {
      return (
        isPerfectOrPassiveComplement(token, head) ||
        isBareInfinitiveComplement(token, head)
      );
    }

    if (head.xpos !== "ADV") {
      return false;
    }

    indexInWindow -= 1;
  }

  return false;
};

const isImmediatelyPrecededByDeterminer = (
  taggedWindow: PartiallyParsedToken[],
) => {
  let indexInWindow = taggedWindow.length - 1;
  while (indexInWindow >= 0) {
    const {
      xpos,
      feats: { PronType },
    } = taggedWindow[indexInWindow];
    if (xpos === "ADV") {
      indexInWindow -= 1;
    } else if (xpos === "ADJ") {
      if (PronType) {
        return true;
      }

      indexInWindow -= 1;
    } else {
      return false;
    }
  }

  return false;
};

const headVerbLicensesAdjObject = (headLemma: string, aftTag?: string) =>
  !["be", "have"].includes(headLemma) ||
  ["PUNCT", "END"].includes(String(aftTag));

const adjObjectIsRightDelimited = ({
  aftToken: {
    xpos: aftTag,
    feats: { PronType: aftPronType },
    misc: { pos: aftTags = {} },
  },
}: RuleArgs) =>
  Boolean(aftTags.ADJ && aftPronType) ||
  ["MARK", "PUNCT", "END"].includes(String(aftTag));

const isVerbsAdjObject = (args: RuleArgs) => {
  const {
    steps,
    tokens,
    taggedWindow,
    token: {
      feats: { PronType },
      misc: { pos },
    },
    aftToken: { xpos: aftTag },
  } = args;
  const leftVerbHead = findLeftVerbHead(taggedWindow);
  if (leftVerbHead == null || PronType) {
    return false;
  }

  const { lemma: headLemma = "" } = tokens[leftVerbHead];
  const isVerbItself =
    steps.some(({ xpos }) => xpos === "VERB") && isCompatibleVerb(args);
  return (
    (pos.NOUN == null || !isImmediatelyPrecededByDeterminer(taggedWindow)) &&
    headVerbLicensesAdjObject(headLemma, aftTag) &&
    !isVerbItself &&
    adjObjectIsRightDelimited(args)
  );
};

const hasLaterAgreeingNoun = (
  tokens: PartiallyParsedToken[],
  index: number,
  parentNumber?: NominalNumber,
) =>
  tokens
    .slice(index + 1)
    .some(
      ({ misc: { pos }, feats: { Number } }) =>
        pos.NOUN &&
        (parentNumber == null || Number == null || parentNumber === Number),
    );

const isAccusativeDeterminerOfPlural = ({
  foreToken: { xpos: foreTag },
  token: {
    feats: { Case },
  },
  aftToken: {
    feats: { Number: aftNumber },
    misc: { pos: aftPos = {} },
  },
}: RuleArgs) =>
  Case === "Acc" &&
  foreTag === "VERB" &&
  aftNumber === "Plur" &&
  Object.keys(aftPos).some((xpos) => ["NOUN", "ADJ"].includes(xpos));

const determinesNominalThatCannotBeSubject = ({
  tokens,
  index,
  aftToken: {
    feats: { PronType: aftPronType },
    misc: { pos: aftPos = {} },
  },
}: RuleArgs) =>
  !["Art", "Prs"].includes(String(aftPronType)) &&
  Object.keys(aftPos).every((xpos) => ["NOUN", "ADJ"].includes(xpos)) &&
  !canBeSubjectOfWhenTagging(tokens[index], tokens[index + 1]);

const determinesFollowingWord = (args: RuleArgs) => {
  const {
    token: {
      feats: { PronType, Poss },
    },
    aftToken: {
      xpos: aftTag,
      feats: { PronType: aftPronType },
    },
  } = args;
  return (
    isAccusativeDeterminerOfPlural(args) ||
    (["Tot", "Neg"].includes(String(PronType)) && Boolean(aftPronType)) ||
    (Boolean(Poss) && ["NOUN", "ADJ"].includes(String(aftTag))) ||
    determinesNominalThatCannotBeSubject(args)
  );
};

const nounIsDeterminer = (args: RuleArgs) => {
  const {
    tokens,
    index,
    token: {
      feats: { PronType, Number, NumType },
      misc: { pos },
    },
  } = args;
  return (
    PronType != null &&
    Boolean(pos.ADJ) &&
    !NumType &&
    index < tokens.length - 1 &&
    hasLaterAgreeingNoun(tokens, index, Number) &&
    determinesFollowingWord(args)
  );
};

const isAdjectiveBetweenDeterminerAndNoun = ({
  foreToken: {
    xpos: foreTag,
    feats: { PronType: forePronType },
  },
  token: {
    feats: { NumType },
  },
  aftToken: {
    xpos: aftTag,
    feats: { PronType: aftPronType },
    misc: { pos: aftTags = {} },
  },
}: RuleArgs) =>
  NumType !== "Card" &&
  foreTag === "ADJ" &&
  Boolean(forePronType) &&
  aftTag === "NOUN" &&
  !aftPronType &&
  !aftTags.MARK;

const isAdverbModifiedPredicate = ({
  foreToken: { xpos: foreTag },
  token: {
    feats: { NumType, PronType },
    misc: { isOpaque },
  },
  aftToken: { xpos: aftTag },
}: RuleArgs) =>
  foreTag === "ADV" &&
  ["MARK", "END"].includes(String(aftTag)) &&
  !NumType &&
  !PronType &&
  !isOpaque;

const nounIsAdjective = (args: RuleArgs) => {
  const {
    token: {
      feats: { NumType },
      misc: { pos },
    },
  } = args;
  return (
    Boolean(pos.ADJ) &&
    ((NumType == null && isVerbsAdjObject(args)) ||
      isAdjectiveBetweenDeterminerAndNoun(args) ||
      isAdverbModifiedPredicate(args))
  );
};

const isAdverbNotMarker = ({
  token: {
    misc: { pos },
  },
  aftToken: {
    xpos: aftTag,
    feats: { Tense: aftTense },
    misc: { pos: aftTags = {} },
  },
}: RuleArgs) =>
  pos.ADV &&
  (aftTense === "Past" ||
    ["ADJ", "ADV"].includes(String(aftTag)) ||
    Object.keys(aftTags).every((xpos) => ["ADJ", "ADV"].includes(xpos)));

const hasVerbHeadInStack = (
  stack: number[],
  tokens: PartiallyParsedToken[],
  heads: number[],
) => {
  const verbIndex = stack[stack.length - 1];
  let indexInStack = stack.length - 2;
  while (indexInStack >= 0) {
    const { xpos } = tokens[stack[indexInStack]];
    if (xpos === "VERB") {
      return verbsAreCompatible(tokens, heads, stack[indexInStack], verbIndex);
    }

    indexInStack -= 1;
  }

  return false;
};

const isNumberWithUnit = ({
  foreToken: {
    feats: { NumType: foreNumType },
  },
  token: {
    feats: { NumType },
  },
  aftToken: {
    lemma: aftLemma,
    feats: { NumType: aftNumType },
    misc: { isUnit: aftIsUnit },
  },
}: RuleArgs) =>
  NumType === "Card" &&
  (Boolean(aftNumType) ||
    ["antemeridiem", "postmeridiem"].includes(aftLemma ?? "") ||
    foreNumType === "Card" ||
    Boolean(aftIsUnit));

const shareCapitalization = (form?: string, otherForm?: string) => {
  const capitalized = form != null && isCapitalizedWord(form);
  const otherCapitalized = otherForm != null && isCapitalizedWord(otherForm);
  return capitalized === otherCapitalized;
};

const nextTokenHeadsUnmarkedRelative = ({
  tokens,
  index,
  aftToken: {
    misc: { pos: aftPos = {} },
    feats: { Tense: aftTense, VerbForm: aftVerbForm },
  },
}: RuleArgs) => {
  const {
    misc: { pos: aft2Pos = {} },
  } = index + 2 < tokens.length ? tokens[index + 2] : END_TOKEN;
  return Boolean(
    aftPos.VERB &&
      (aftTense === "Past" || aftVerbForm === "Part") &&
      aft2Pos.MARK,
  );
};

const compoundNounHasNoHeadOfItsOwn = (args: RuleArgs) => {
  const {
    steps,
    stack,
    heads,
    tokens,
    token: {
      misc: { pos },
    },
    aftToken: { xpos: aftTag },
  } = args;
  return (
    aftTag === "NOUN" ||
    (["END", "PUNCT"].includes(String(aftTag)) &&
      !steps.some(({ xpos }) => xpos === "VERB")) ||
    (!hasVerbHeadInStack(stack, tokens, heads) && Boolean(pos.NOUN)) ||
    nextTokenHeadsUnmarkedRelative(args)
  );
};

const isCompoundNounModifier = (args: RuleArgs) => {
  const {
    foreToken: {
      form: foreForm,
      xpos: foreTag,
      feats: { NumType: foreNumType },
    },
    token: {
      form,
      feats: { PronType },
    },
  } = args;
  return (
    PronType == null &&
    foreTag === "NOUN" &&
    shareCapitalization(form, foreForm) &&
    foreNumType == null &&
    !isVerbsAdjObject(args) &&
    compoundNounHasNoHeadOfItsOwn(args)
  );
};

const isCompoundNounAdj = (args: RuleArgs) => {
  const { foreToken, token, aftToken } = args;
  const isGerundBeforeBoundary =
    isGerund(token) &&
    ["MARK", "END", "PUNCT", "VERB"].includes(String(aftToken.xpos));
  return (
    isGerundBeforeBoundary ||
    isCompoundNounModifier(args) ||
    isNumberWithUnit({ foreToken, token, aftToken } as RuleArgs)
  );
};

const nounIsNonRelMarker = (args: RuleArgs) => {
  const {
    token: {
      feats: { PronType },
      misc: { pos },
    },
    taggedWindow,
  } = args;
  if (
    !pos.MARK ||
    PronType === "Rel" ||
    isAdverbNotMarker(args) ||
    isNumberWithUnit(args)
  ) {
    return false;
  }

  let indexInWindow = taggedWindow.length - 1;
  while (indexInWindow >= 0) {
    const { xpos } = taggedWindow[indexInWindow];
    if (["VERB", "MARK", "PUNCT"].includes(String(xpos))) {
      return true;
    }

    if (xpos === "ADJ") {
      return false;
    }

    indexInWindow -= 1;
  }

  return false;
};

const isNonFiniteVerb = ({
  xpos,
  feats: { Tense, VerbForm },
}: PartiallyParsedToken) =>
  xpos === "VERB" && (Tense === "Past" || VerbForm === "Part");

const isFiniteVerb = (token: PartiallyParsedToken) =>
  token.xpos === "VERB" && !isNonFiniteVerb(token);

const isPrepositionOfItsOwnPhrase = (
  { xpos, feats: { AdpType, ConjType } }: PartiallyParsedToken,
  head: PartiallyParsedToken,
) =>
  xpos === "MARK" &&
  Boolean(AdpType) &&
  AdpType !== "Post" &&
  !ConjType &&
  !isNonFiniteVerb(head);

const nounHasLeftParent = ({
  tokens,
  heads,
  taggedWindow,
  aftToken: { xpos: aftTag },
}: RuleArgs) => {
  if (!["ADJ", "MARK", "PUNCT", "END"].includes(String(aftTag))) {
    return false;
  }

  let indexInWindow = taggedWindow.length - 1;
  while (indexInWindow >= 0) {
    const windowToken = taggedWindow[indexInWindow];
    const { xpos, id } = windowToken;
    const head = id == null ? -2 : heads[id];
    const headToken = head === -2 ? START_TOKEN : tokens[head];
    if (
      isFiniteVerb(windowToken) ||
      isPrepositionOfItsOwnPhrase(windowToken, headToken)
    ) {
      return true;
    }

    if (["START", "PUNCT"].includes(String(xpos))) {
      return false;
    }

    indexInWindow -= 1;
  }

  return false;
};

const isInvalidPronounAfterNoun = ({
  token,
  foreToken: { xpos: foreTag },
  aftToken: {
    misc: { pos: aftTags = {} },
  },
}: RuleArgs) =>
  foreTag === "NOUN" &&
  Boolean(token.feats.PronType) &&
  !(canOmitMarker(token) || aftTags.VERB);

const isAtStart = ({
  foreToken: { xpos: foreTag },
}: {
  foreToken: PartiallyParsedToken;
}) => foreTag === "START";

const nounIsRightDelimited = ({
  foreToken: { xpos: foreTag },
  aftToken: {
    xpos: aftTag,
    feats: { PunctType: aftPunctType },
  },
}: RuleArgs) =>
  foreTag !== "NOUN" &&
  (["MARK", "END"].includes(String(aftTag)) ||
    isPhraseBoundaryType(aftPunctType));

const isCompoundTense = (taggedWindow: PartiallyParsedToken[]) => {
  let indexInWindow = taggedWindow.length - 1;
  while (indexInWindow >= 0) {
    const {
      lemma,
      xpos,
      feats: { Mood, Tense },
    } = taggedWindow[indexInWindow];
    if (xpos === "VERB" && (Mood || (lemma === "do" && Tense === "Past"))) {
      return true;
    }

    if (["PUNCT", "MARK"].includes(String(xpos))) {
      return false;
    }

    indexInWindow -= 1;
  }

  return false;
};

const isFollowedByOwnArgument = ({
  aftToken: {
    misc: { pos: aftPos = {} },
    feats: { PronType: aftPronType, PunctType: aftPunctType },
  },
}: RuleArgs) =>
  Boolean(
    (aftPronType && aftPronType !== "Rel") || aftPunctType || aftPos.MARK,
  );

const isGovernedByDeterminerOrPreposition = ({
  tokens,
  stack,
  foreToken: {
    xpos: foreTag,
    feats: { PronType: forePronType },
  },
}: RuleArgs) => {
  const {
    feats: { AdpType: stackHeadAdpType },
  } = stackHeadOr(stack, tokens, START_TOKEN, 2);
  return Boolean((forePronType && foreTag === "ADJ") || stackHeadAdpType);
};

const hasPluralOrAuxiliarySubject = ({
  tokens,
  stack,
  taggedWindow,
  foreToken: {
    lemma: foreLemma,
    feats: { Number: foreNumber },
  },
}: RuleArgs) => {
  const {
    feats: { Number: stackHeadNumber },
  } = stackHeadOr(stack, tokens, START_TOKEN, 2);
  return (
    ["to", "not"].includes(foreLemma ?? "") ||
    isCompoundTense(taggedWindow) ||
    stackHeadNumber === "Plur" ||
    foreNumber === "Plur"
  );
};

const isInfinitiveVerb = (args: RuleArgs) => {
  const {
    steps,
    token: {
      feats: { Person, Tense, VerbForm },
    },
  } = args;
  return (
    steps.some(({ xpos }) => xpos === "VERB") &&
    VerbForm === "Fin" &&
    Tense === "Pres" &&
    Person === 1 &&
    isFollowedByOwnArgument(args) &&
    !isGovernedByDeterminerOrPreposition(args) &&
    hasPluralOrAuxiliarySubject(args)
  );
};

const isModalOrPseudoAuxiliaryBeforeVerb = ({
  token: {
    form,
    lemma = form.toLowerCase(),
    feats: { Mood },
  },
  aftToken: {
    feats: { Tense: aftTense, VerbForm: aftVerbForm },
  },
}: RuleArgs) =>
  (Boolean(Mood) || lemma === "do") &&
  aftTense === "Pres" &&
  aftVerbForm === "Fin";

const isImperative = ({
  steps,
  token: { form, lemma },
  foreToken: { xpos: foreTag },
  aftToken: {
    feats: { Tense: aftTense },
  },
}: RuleArgs) =>
  steps.some(({ xpos }) => xpos === "VERB") &&
  form.toLowerCase() === lemma &&
  !aftTense &&
  ["START", "PUNCT"].includes(String(foreTag));

const isVerbAfterNominative = ({
  steps,
  foreToken: {
    feats: { Case },
  },
}: RuleArgs) => steps.some(({ xpos }) => xpos === "VERB") && Case === "Nom";

const closesDeterminerSearch = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  windowToken: PartiallyParsedToken,
) => {
  const {
    xpos,
    id,
    feats: { PronType },
  } = windowToken;
  if (["VERB", "MARK"].includes(String(xpos))) {
    return true;
  }

  if (xpos === "NOUN") {
    return Boolean(PronType);
  }

  if (xpos !== "PUNCT") {
    return false;
  }

  const head = heads[id];
  const isSentenceEnd =
    id === tokens.length - 1 ||
    (id === tokens.length - 2 && tokens[id + 1].xpos === "PUNCT");
  return (
    head === -2 || !hasAppositivePunctuation(heads, tokens, head, isSentenceEnd)
  );
};

const findPrecedingDeterminer = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  taggedWindow: PartiallyParsedToken[],
  parentNumber?: NominalNumber,
) => {
  let currentIndex = taggedWindow.length - 1;
  while (currentIndex >= 0) {
    const windowToken = taggedWindow[currentIndex];
    const {
      xpos,
      id,
      feats: { PronType, Number },
    } = windowToken;
    if (closesDeterminerSearch(heads, tokens, windowToken)) {
      return -1;
    }

    if (xpos === "ADJ" && PronType && (!Number || Number === parentNumber)) {
      return id;
    }

    currentIndex -= 1;
  }

  return -1;
};

const isObjectComplementInfinitive = ({
  heads,
  steps,
  stack,
  taggedWindow,
  tokens,
  token: {
    form,
    lemma,
    feats: { Number, Tense, VerbForm },
  },
}: RuleArgs) => {
  if (
    stack.length < 3 ||
    !steps.some(({ xpos }) => xpos === "VERB") ||
    Tense !== "Pres" ||
    VerbForm !== "Fin" ||
    lemma !== form.toLowerCase() ||
    findPrecedingDeterminer(heads, tokens, taggedWindow, Number) !== -1
  ) {
    return false;
  }

  const [verb, object] = stack.slice(stack.length - 3);
  return (
    tokens[verb].xpos === "VERB" &&
    takesObjectComplement(tokens[verb].lemma) &&
    tokens[object].xpos === "NOUN"
  );
};

const isInvalidPastNoun = ({ token, taggedWindow }: RuleArgs) => {
  const {
    misc: { pos },
    feats: { Tense },
  } = token;
  if (Tense !== "Past" || !pos.VERB) {
    return false;
  }

  let indexInWindow = taggedWindow.length - 1;
  while (indexInWindow >= 0) {
    const { xpos, lemma } = taggedWindow[indexInWindow];
    if (xpos === "VERB") {
      if (["be", "have"].includes(lemma ?? "")) {
        return true;
      }

      return false;
    }

    if (["PUNCT", "MARK"].includes(String(xpos))) {
      return false;
    }

    if (
      xpos === "NOUN" &&
      canBeSubjectOfWhenTagging(taggedWindow[indexInWindow], token)
    ) {
      return true;
    }

    indexInWindow -= 1;
  }

  return false;
};

const takesTheFollowingObject = ({
  heads,
  tokens,
  taggedWindow,
  token: {
    feats: { VerbForm, Number },
  },
  aftToken: {
    feats: {
      AdpType: aftAdpType,
      ConjType: aftConjType,
      PronType: aftPronType,
      NumType: aftNumType,
    },
  },
}: RuleArgs) => {
  const isFollowedByDetOrPronoun = Boolean(
    aftPronType && aftPronType !== "Rel",
  );
  const isUndeterminedFiniteVerb =
    findPrecedingDeterminer(heads, tokens, taggedWindow, Number) === -1 &&
    VerbForm === "Fin" &&
    !aftNumType;
  return (
    isFollowedByDetOrPronoun &&
    (Boolean(aftConjType && !aftAdpType) || isUndeterminedFiniteVerb)
  );
};

const previousWordIsNumberWithUnit = ({
  tokens,
  index,
  foreToken,
  token,
}: RuleArgs) =>
  isNumberWithUnit({
    foreToken: index >= 2 ? tokens[index - 2] : START_TOKEN,
    token: foreToken,
    aftToken: token,
  } as RuleArgs);

const isVerbWithObject = (args: RuleArgs) => {
  const {
    taggedWindow,
    token: {
      misc: { pos },
    },
  } = args;
  return (
    findLeftVerbHead(taggedWindow) == null &&
    !isMarkerObject(taggedWindow) &&
    Boolean(pos.VERB) &&
    !previousWordIsNumberWithUnit(args) &&
    takesTheFollowingObject(args)
  );
};

const findSubjectNounInStack = (
  stack: number[],
  tokens: PartiallyParsedToken[],
  token: PartiallyParsedToken,
) => {
  let indexInStack = stack.length - 2;
  while (indexInStack >= 0) {
    const candidate = tokens[stack[indexInStack]];
    if (
      candidate.xpos === "NOUN" &&
      canBeSubjectOfWhenTagging(candidate, token)
    ) {
      return indexInStack;
    }

    if (!["ADV", "ADJ", "INTJ"].includes(String(candidate.xpos))) {
      return -1;
    }

    indexInStack -= 1;
  }

  return -1;
};

const isRelativizedNoun = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  stack: number[],
  nounIndexInStack: number,
) => {
  const {
    xpos: nounHeadTag,
    feats: { PronType: nounHeadPronType },
  } = tokens[stack[nounIndexInStack - 1]];
  const nounIndex = stack[nounIndexInStack];
  const {
    feats: { PronType },
  } = tokens[nounIndex];
  const hasRelativeDeterminer = hasChildWithMatcher(
    heads,
    tokens,
    nounIndex,
    ({ xpos, feats: { PronType } }) => xpos === "ADJ" && Boolean(PronType),
  );
  return (
    (nounHeadTag === "MARK" && Boolean(nounHeadPronType)) ||
    (nounHeadTag === "NOUN" && (PronType === "Rel" || hasRelativeDeterminer))
  );
};

const isVerbRelativeRoot = ({
  heads,
  stack,
  tokens,
  taggedWindow,
  token,
}: RuleArgs) => {
  if (stack.length < 2) {
    return false;
  }

  const stackHead = stack[stack.length - 2];
  const hasNominalAfterStackHead = taggedWindow
    .filter(({ id }) => id > stackHead)
    .some(({ xpos }) => ["ADJ", "NOUN"].includes(String(xpos)));
  if (hasNominalAfterStackHead) {
    return false;
  }

  const nounIndexInStack = findSubjectNounInStack(stack, tokens, token);
  return (
    nounIndexInStack > 0 &&
    isRelativizedNoun(heads, tokens, stack, nounIndexInStack)
  );
};

const isImmediatelyAfterDegree2Marker = (
  taggedWindow: PartiallyParsedToken[],
) => {
  let currentIndex = taggedWindow.length - 1;
  while (currentIndex >= 0) {
    const {
      xpos,
      feats: { AdpType, ConjType },
    } = taggedWindow[currentIndex];
    if (["VERB", "PUNCT"].includes(String(xpos))) {
      return false;
    }

    if (xpos === "MARK") {
      return !AdpType && ConjType === "Sub";
    }

    currentIndex -= 1;
  }

  return false;
};

const isLastPossibleVerbAfterDegree2Marker = ({
  taggedWindow,
  tokens,
  index,
}: RuleArgs) => {
  if (!isImmediatelyAfterDegree2Marker(taggedWindow)) {
    return false;
  }

  let currentIndex = index + 1;
  while (currentIndex < tokens.length) {
    const {
      misc: { pos },
      feats: { PunctType },
    } = tokens[currentIndex];
    if (pos.VERB) {
      return false;
    }

    if (isPhraseBoundaryType(PunctType)) {
      return true;
    }

    currentIndex += 1;
  }

  return true;
};

const coordinatesTwoVerbs = (
  tokens: PartiallyParsedToken[],
  heads: number[],
  index: number,
  coordinator: number,
) => {
  const { xpos: headTag = "" } = tokens[heads[coordinator]] || {};
  const beforeCoordinator = tokens[coordinator - 1];
  const coordinatesANoun =
    beforeCoordinator != null && canStillBe(beforeCoordinator, ["NOUN"]);
  return (
    headTag === "VERB" &&
    !coordinatesANoun &&
    !hasVerbLaterInClause(tokens, index)
  );
};

const isVerbConjunct = ({ steps, tokens, stack, heads, index }: RuleArgs) => {
  if (!steps.some(({ xpos }) => xpos === "VERB")) {
    return false;
  }

  let indexInStack = stack.length - 2;
  while (indexInStack >= 0) {
    const stackItem = stack[indexInStack];
    const {
      xpos,
      feats: { ConjType, PunctType },
    } = tokens[stackItem];
    if (xpos === "MARK" && ConjType === "Coor") {
      return coordinatesTwoVerbs(tokens, heads, index, stackItem);
    }

    if (xpos === "MARK" && ConjType) {
      return false;
    }

    if (xpos === "VERB" || isPhraseBoundaryType(PunctType)) {
      return false;
    }

    indexInStack -= 1;
  }

  return false;
};

const isComparativeAdjective = ({
  foreToken: {
    feats: { Degree: foreDegree },
  },
  token: {
    misc: { pos },
  },
  aftToken: { lemma: aftLemma },
}: RuleArgs) =>
  pos.ADJ && !foreDegree && ["then", "than"].includes(String(aftLemma));

const verbIsPrecededByNounOrAdj = (taggedWindow: PartiallyParsedToken[]) => {
  let indexInWindow = taggedWindow.length - 1;
  while (indexInWindow >= 0) {
    const { xpos } = taggedWindow[indexInWindow];
    if (xpos === "ADV") {
      indexInWindow -= 1;
    } else if (["NOUN", "ADJ"].includes(String(xpos))) {
      return true;
    } else {
      return false;
    }
  }

  return false;
};

const opensANounPhrase = ({
  xpos,
  feats: { PronType },
}: PartiallyParsedToken) => xpos === "ADJ" && PronType != null;

const followsADeterminerPhrase = ({ foreToken, foreToken2 }: RuleArgs) =>
  opensANounPhrase(foreToken) ||
  (foreToken.xpos === "ADJ" && opensANounPhrase(foreToken2));

const isNominalGerundBeforeOf = (args: RuleArgs) =>
  args.aftToken.lemma === "of" && followsADeterminerPhrase(args);

const gerundIsVerbal = (args: RuleArgs) => {
  const {
    taggedWindow,
    foreToken: {
      feats: { Tense: foreTense },
    },
    aftToken: {
      misc: { pos: aftPos = {} },
      feats: { PronType: aftPronType },
    },
  } = args;
  return (
    !isNominalGerundBeforeOf(args) &&
    ((verbIsPrecededByNounOrAdj(taggedWindow) && foreTense === "Past") ||
      Boolean(aftPronType) ||
      Boolean(aftPos.MARK))
  );
};

const isSentenceInitialAfterAdverbs = (
  tokens: PartiallyParsedToken[],
  index: number,
) => index === 0 || tokens.slice(0, index).every(({ xpos }) => xpos === "ADV");

const finitePastIsVerbal = ({
  stack,
  tokens,
  index,
  taggedWindow,
  foreToken: {
    feats: { PronType: forePronType },
  },
  aftToken: {
    misc: { pos: aftPos = {} },
    feats: { PronType: aftPronType, VerbForm: aftVerbForm, Tense: aftTense },
  },
}: RuleArgs) => {
  const { xpos: stackHeadTag } = stackHeadOr(stack, tokens, START_TOKEN, 2);
  return (
    isSentenceInitialAfterAdverbs(tokens, index) ||
    ["NOUN", "VERB"].includes(String(stackHeadTag)) ||
    (stackHeadTag === "MARK" && Boolean(aftPos.MARK)) ||
    Boolean(aftPronType) ||
    aftVerbForm === "Part" ||
    aftTense === "Past" ||
    (verbIsPrecededByNounOrAdj(taggedWindow) && forePronType !== "Art")
  );
};

const isGerundOrPastVerb = (args: RuleArgs) => {
  const {
    token,
    token: {
      misc: { pos },
      feats: { Tense, VerbForm },
    },
  } = args;
  if (!pos.VERB) {
    return false;
  }

  const isFinitePast = Tense === "Past" && VerbForm !== "Part";
  return (
    (isGerund(token) && gerundIsVerbal(args)) ||
    (isFinitePast && finitePastIsVerbal(args))
  );
};

const nounIsAdverb = ({
  token: { lemma },
  aftToken: { xpos: aftTag },
}: RuleArgs) => aftTag === "NOUN" && isTimeModifier({ lemma });

const isNegatedDeterminer = ({
  tokens,
  index,
  foreToken,
  token: {
    feats: { PronType },
    misc: { pos },
  },
  aftToken,
}: RuleArgs) =>
  Boolean(pos.ADJ) &&
  PronType != null &&
  ["Ind", "Tot", "Neg"].includes(PronType) &&
  isNegator(foreToken) &&
  !negatesVerbGroup(tokens, index - 1) &&
  canStillBe(aftToken, ["NOUN"]);

const isPostposedDegree = ({ token, foreToken }: RuleArgs) =>
  token.lemma === "enough" &&
  foreToken.xpos === "ADJ" &&
  !foreToken.feats.PronType;

const objectControlVerbs = new Set([
  "need",
  "want",
  "expect",
  "ask",
  "tell",
  "urge",
  "require",
  "allow",
]);

const followsObjectControl = ({
  taggedWindow,
  foreToken,
  foreToken2,
}: RuleArgs) => {
  const governor = taggedWindow.at(-3);
  return (
    foreToken.xpos === "MARK" &&
    foreToken.lemma === "to" &&
    foreToken2.xpos === "NOUN" &&
    foreToken2.feats.Case === "Acc" &&
    governor?.xpos === "VERB" &&
    objectControlVerbs.has(governor.lemma ?? "")
  );
};

const isObjectControlInfinitive = (args: RuleArgs) => {
  const { token, steps } = args;
  return (
    token.feats.Tense === "Pres" &&
    token.feats.VerbForm === "Fin" &&
    token.form.toLowerCase() === token.lemma &&
    followsObjectControl(args) &&
    steps.some(({ xpos }) => xpos === "VERB")
  );
};

const isWorthGerund = ({ token, aftToken, tokens, index }: RuleArgs) => {
  const following = tokens[index + 2];
  const isNominalContinuation =
    following?.misc.pos.NOUN && !following.misc.pos.VERB;
  return (
    token.lemma === "worth" && isGerund(aftToken) && !isNominalContinuation
  );
};

const isQuotationMark = ({ feats: { PunctType } }: PartiallyParsedToken) =>
  PunctType === "Quot";

const hypothesisBefore = ({ tokens, index, taggedWindow }: RuleArgs) =>
  [
    ...tokens.slice(0, Math.max(0, index - taggedWindow.length)),
    ...taggedWindow.filter(({ xpos }) => xpos !== "START"),
  ].filter((token) => !isQuotationMark(token));

const closesARelativeClause = ({
  xpos,
  feats: { Mood, Tense, VerbForm },
}: PartiallyParsedToken) =>
  xpos === "VERB" &&
  !Mood &&
  (VerbForm === "Fin" || (Tense === "Past" && VerbForm == null));

const isDeterminerWord = ({
  xpos,
  feats: { PronType },
}: PartiallyParsedToken) => xpos === "ADJ" && PronType != null;

const longestSubjectPhrase = 5;

const determinedPhraseStart = (before: PartiallyParsedToken[], end: number) => {
  let start = end;
  while (
    start >= 0 &&
    end - start < longestSubjectPhrase &&
    ["NOUN", "ADJ"].includes(String(before[start].xpos))
  ) {
    if (isDeterminerWord(before[start])) {
      return start;
    }

    start -= 1;
  }

  return -1;
};

const subjectPhraseStart = (before: PartiallyParsedToken[], end: number) => {
  if (end < 0 || before[end].xpos !== "NOUN") {
    return -1;
  }

  return isSubjectPronoun(before[end])
    ? end
    : determinedPhraseStart(before, end);
};

const timeNouns = new Set([
  "time",
  "moment",
  "second",
  "minute",
  "hour",
  "day",
  "night",
  "morning",
  "afternoon",
  "evening",
  "week",
  "weekend",
  "month",
  "quarter",
  "season",
  "spring",
  "summer",
  "autumn",
  "fall",
  "winter",
  "year",
  "decade",
  "today",
  "tonight",
  "tomorrow",
  "yesterday",
]);

const clauseOpeners = new Set([
  "that",
  "why",
  "how",
  "because",
  "and",
  "but",
  "so",
  "or",
  "yet",
  "if",
  "when",
  "while",
  "although",
  "though",
  "whether",
  "unless",
]);

const isArticle = ({ feats: { PronType } }: PartiallyParsedToken) =>
  PronType === "Art";

const phraseOpening = (before: PartiallyParsedToken[], head: number) => {
  let start = head;
  while (start > 0 && before[start - 1].xpos === "ADJ") {
    start -= 1;
  }

  return start;
};

const isAFrontedTimePhrase = (before: PartiallyParsedToken[], head: number) =>
  timeNouns.has(String(before[head].lemma)) &&
  !(head > 0 && isArticle(before[head - 1]));

const opensItsClause = (before: PartiallyParsedToken[], head: number) => {
  const opening = phraseOpening(before, head);
  const governor = before[opening - 1] as PartiallyParsedToken | undefined;
  return (
    governor == null ||
    (governor.xpos === "MARK" &&
      clauseOpeners.has(String(governor.form).toLowerCase()))
  );
};

const canAnchorARelativeClause = (
  before: PartiallyParsedToken[],
  head: number,
) =>
  isSubstantiveNoun(before[head]) &&
  !isAFrontedTimePhrase(before, head) &&
  opensItsClause(before, head);

const unmarkedRelativeAntecedent = (args: RuleArgs) => {
  const before = hypothesisBefore(args);
  const relativeVerb = before[before.length - 1] as
    | PartiallyParsedToken
    | undefined;
  if (relativeVerb == null || !closesARelativeClause(relativeVerb)) {
    return undefined;
  }

  const head = subjectPhraseStart(before, before.length - 2) - 1;
  return head >= 0 && canAnchorARelativeClause(before, head)
    ? before[head]
    : undefined;
};

const opensAnotherClause = (token: PartiallyParsedToken) =>
  token.xpos === "PUNCT" ||
  Boolean(token.misc.pos?.PUNCT) ||
  token.feats.ConjType != null;

const isMostlyAVerb = ({ xpos, misc: { pos = {} } }: PartiallyParsedToken) =>
  xpos === "VERB" ||
  (xpos == null &&
    Object.values(pos).every((weight) => weight <= Number(pos.VERB)));

const isLikelyAFiniteVerb = (token: PartiallyParsedToken) => {
  const {
    feats: { Mood, Tense, VerbForm },
  } = token;
  return (
    isMostlyAVerb(token) &&
    (Boolean(Mood) || VerbForm === "Fin" || Tense === "Past")
  );
};

const laterVerbTakesTheSubject = (
  { tokens, index }: RuleArgs,
  subject: PartiallyParsedToken,
) => {
  const rest = tokens.slice(index + 1);
  const clauseEnd = rest.findIndex(opensAnotherClause);
  return (clauseEnd === -1 ? rest : rest.slice(0, clauseEnd)).some(
    (token) =>
      isLikelyAFiniteVerb(token) &&
      (token.feats.Tense === "Past" ||
        canBeSubjectOfWhenTagging(subject, token)),
  );
};

const pronounsAfterAnAntecedent = new Set(["who", "that", "which"]);

const followsAnAntecedent = ({
  form,
  feats: { PronType },
}: PartiallyParsedToken) =>
  PronType === "Rel" && pronounsAfterAnAntecedent.has(form.toLowerCase());

const isAVerbTagged = (token: PartiallyParsedToken | undefined) =>
  token?.xpos === "VERB";

const passiveRelativeOpening = (before: PartiallyParsedToken[]) => {
  const participle = before.length - 1;
  const helper =
    before[participle - 1]?.xpos === "ADV" ? participle - 2 : participle - 1;
  const isPassive =
    isAVerbTagged(before[participle]) &&
    before[participle].feats.Tense === "Past" &&
    isAVerbTagged(before[helper]) &&
    before[helper].lemma === "be";
  return isPassive && helper > 0 && followsAnAntecedent(before[helper - 1])
    ? helper - 1
    : -1;
};

const passiveRelativeAntecedent = (args: RuleArgs) => {
  const before = hypothesisBefore(args);
  const head = passiveRelativeOpening(before) - 1;
  return head >= 0 && canAnchorARelativeClause(before, head)
    ? before[head]
    : undefined;
};

const takesTheAntecedentAsSubject = (
  args: RuleArgs,
  antecedent: PartiallyParsedToken | undefined,
) =>
  antecedent != null &&
  canBeSubjectOfWhenTagging(antecedent, args.token) &&
  !laterVerbTakesTheSubject(args, antecedent);

const isPresentFiniteVerbForm = ({
  misc: { pos },
  feats: { Tense, VerbForm },
}: PartiallyParsedToken) =>
  Boolean(pos.VERB) && Tense === "Pres" && VerbForm === "Fin";

const isMainVerbAfterUnmarkedRelative = (args: RuleArgs) =>
  isPresentFiniteVerbForm(args.token) &&
  takesTheAntecedentAsSubject(args, unmarkedRelativeAntecedent(args));

const isMainVerbAfterPassiveRelative = (args: RuleArgs) =>
  isPresentFiniteVerbForm(args.token) &&
  takesTheAntecedentAsSubject(args, passiveRelativeAntecedent(args));

const hasAPastVerbReading = ({
  misc: { pos = {} },
  feats: { Tense },
}: PartiallyParsedToken) => Boolean(pos.VERB) && Tense === "Past";

const canBeAFiniteVerb = (token: PartiallyParsedToken) => {
  const {
    feats: { Mood, Tense, VerbForm },
  } = token;
  return (
    hasAPastVerbReading(token) ||
    (canStillBe(token, ["VERB"]) &&
      (Boolean(Mood) || VerbForm === "Fin" || (Tense === "Past" && !VerbForm)))
  );
};

const isMostlyANoun = ({ misc: { pos = {} } }: PartiallyParsedToken) =>
  Number(pos.NOUN) > 0 &&
  Object.values(pos).every((weight) => weight <= Number(pos.NOUN));

const canHeadASubject = (before: PartiallyParsedToken[]) => {
  const head = before[before.length - 1];
  const isDetermined = before.slice(0, -1).some(isDeterminerWord);
  return (
    head.feats.PronType === "Tot" ||
    (!isDeterminerWord(head) &&
      (isMostlyANoun(head) || (isDetermined && Boolean(head.misc.pos?.NOUN))))
  );
};

const opensWithOneNounPhrase = (before: PartiallyParsedToken[]) =>
  before.every(({ xpos }) => ["NOUN", "ADJ", "ADV"].includes(String(xpos)));

const hasASubjectBefore = (before: PartiallyParsedToken[]) =>
  before.length > 0 &&
  canHeadASubject(before) &&
  opensWithOneNounPhrase(before);

const agreesWithTheWordBefore = (
  before: PartiallyParsedToken[],
  token: PartiallyParsedToken,
) => {
  const previous = before[before.length - 1];
  return (
    !previous.misc.pos?.NOUN ||
    previous.feats.Number == null ||
    canBeSubjectOfWhenTagging(previous, token)
  );
};

const isTheOnlyFiniteVerb = (args: RuleArgs) => {
  const {
    tokens,
    index,
    token,
    token: {
      misc: { pos },
      feats: { Tense, VerbForm },
    },
  } = args;
  if (!pos.NOUN || Tense !== "Pres" || VerbForm !== "Fin") {
    return false;
  }

  const before = hypothesisBefore(args);
  return (
    Number(pos.VERB) > pos.NOUN &&
    ![...before, ...tokens.slice(index + 1)].some(canBeAFiniteVerb) &&
    hasASubjectBefore(before) &&
    agreesWithTheWordBefore(before, token)
  );
};

const nounRules: Rule[] = [
  { id: "n-is-do-supported-verb", when: isTheVerbDoSupports, features: null },
  { id: "n-is-only-finite-verb", when: isTheOnlyFiniteVerb, features: null },
  {
    id: "n-is-main-verb-after-relative",
    when: isMainVerbAfterUnmarkedRelative,
    features: null,
  },
  {
    id: "n-is-main-verb-after-passive-relative",
    when: isMainVerbAfterPassiveRelative,
    features: null,
  },
  { id: "n-is-worth-gerund", when: isWorthGerund, features: null },
  {
    id: "n-is-object-control-infinitive",
    when: isObjectControlInfinitive,
    features: null,
  },
  { id: "n-is-modal-complement", when: isModalVerbComplement, features: null },
  { id: "n-is-postposed-degree", when: isPostposedDegree, features: null },
  { id: "n-is-verb-conj", when: isVerbConjunct, features: null },
  {
    id: "n-is-last-possible-v-after-mark",
    when: isLastPossibleVerbAfterDegree2Marker,
    features: null,
  },
  { id: "n-is-adv", when: nounIsAdverb, features: null },
  { id: "n-is-gerund-or-past-v", when: isGerundOrPastVerb, features: null },
  { id: "n-is-verb-with-object", when: isVerbWithObject, features: null },
  { id: "n-is-forced-relative-root", when: isVerbRelativeRoot, features: null },
  { id: "n-is-invalid-gerund", when: isInvalidGerundNoun, features: null },
  { id: "invalid-past-n", when: isInvalidPastNoun, features: null },
  {
    id: "n-is-v-after-nominative",
    when: isVerbAfterNominative,
    features: null,
  },
  {
    id: "n-is-object-complement-v",
    when: isObjectComplementInfinitive,
    features: null,
  },
  {
    id: "n-mod-before-v",
    when: isModalOrPseudoAuxiliaryBeforeVerb,
    features: null,
  },
  { id: "n-is-infinitive", when: isInfinitiveVerb, features: null },
  { id: "n-right-headed-adv", when: isRightHeadedAdverb, features: null },
  {
    id: "invalid-n-after-pro",
    when: isInvalidNounAfterPronoun,
    features: null,
  },
  { id: "n-is-negated-det", when: isNegatedDeterminer, features: null },
  { id: "n-is-det", when: nounIsDeterminer, features: null },
  { id: "n-is-adj", when: nounIsAdjective, features: null },
  { id: "n-is-marker", when: nounIsNonRelMarker, features: null },
  {
    id: "n-invalid-pro-after-n",
    when: isInvalidPronounAfterNoun,
    features: null,
  },
  { id: "n-is-comp-adj", when: isComparativeAdjective, features: null },
  {
    id: "n-compound",
    when: isCompoundNoun,
    features: { parentDirection: "R" },
  },
  { id: "n-invalid-compound", when: isInvalidCompoundNoun, features: null },
  {
    id: "n-right-v-parent",
    when: nounHasRightVerbParent,
    features: { parentDirection: "R" },
  },
  {
    id: "n-right-mark-parent",
    when: nounHasRightMarkerParent,
    features: { parentDirection: "R" },
  },
  { id: "n-is-imperative-v", when: isImperative, features: null },
  { id: "n-at-start", when: isAtStart, features: { parentDirection: "R" } },
  {
    id: "n-left-parent",
    when: nounHasLeftParent,
    features: { parentDirection: "L" },
  },
  {
    id: "n-right-delimited",
    when: nounIsRightDelimited,
    features: { parentDirection: "L" },
  },
  {
    id: "n-rel-clause-mark-pronoun",
    when: isRelativeClauseMarkerPronoun,
    features: { parentDirection: "R" },
  },
];

const isIrregularPastAdjective = ({
  foreToken: { xpos: foreTag },
  token: {
    feats: { Tense, VerbForm },
  },
}: RuleArgs) =>
  VerbForm === "Part" &&
  Tense === "Past" &&
  ["START", "ADJ"].includes(String(foreTag));

const isPrecededByHeadVerb = (taggedWindow: PartiallyParsedToken[]) => {
  let indexInWindow = taggedWindow.length - 1;
  while (indexInWindow >= 0) {
    const { xpos, lemma } = taggedWindow[indexInWindow];
    if (xpos === "ADV") {
      indexInWindow -= 1;
    } else if (xpos === "VERB") {
      return ["be", "have"].includes(String(lemma));
    } else {
      return false;
    }
  }

  return false;
};

const isUnmarkedRelativeRoot = ({
  foreToken: { xpos: foreTag },
  token,
  aftToken: {
    misc: { pos: aftPos = {} },
  },
}: RuleArgs) => {
  const {
    misc: { pos },
    feats: { Tense, VerbForm },
  } = token;
  return (
    foreTag === "NOUN" &&
    Boolean(pos.VERB) &&
    (Tense === "Past" || VerbForm === "Part") &&
    Boolean(aftPos.MARK)
  );
};

const isPastAdjective = (args: RuleArgs) => {
  const {
    taggedWindow,
    foreToken: {
      feats: {
        NumType: foreNumType,
        AdpType: foreAdpType,
        ConjType: foreConjType,
      },
    },
    token: {
      feats: { Tense },
      misc: { pos },
    },
    aftToken: {
      misc: { isUnit: aftIsUnit },
    },
  } = args;
  return (
    Tense === "Past" &&
    pos.ADJ &&
    !(isPrecededByHeadVerb(taggedWindow) || isUnmarkedRelativeRoot(args)) &&
    ((foreAdpType != null && foreConjType == null) ||
      isVerbsAdjObject(args) ||
      (foreNumType === "Card" && Boolean(aftIsUnit)))
  );
};

const isAssignedVerbArgument = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  const head = heads[index];
  const { xpos } = tokens[index];
  return (
    ["ADJ", "ADV", "NOUN"].includes(String(xpos)) &&
    head >= 0 &&
    tokens[head].xpos === "VERB"
  );
};

const determinerHeadIsItsOwnSubject = (
  args: RuleArgs,
  determinerHead: number,
) => {
  const {
    stack,
    tokens,
    heads,
    token,
    token: {
      misc: { pos },
      feats: { VerbForm, Mood },
    },
  } = args;
  return (
    Boolean(pos.VERB) &&
    tokens[determinerHead].xpos === "NOUN" &&
    (canBeSubjectOfWhenTagging(tokens[determinerHead], token) ||
      hasVerbHeadInStack(stack, tokens, heads) ||
      Boolean(Mood) ||
      VerbForm === "Part")
  );
};

const isDeterminedNoun = (args: RuleArgs) => {
  const {
    taggedWindow,
    heads,
    tokens,
    token: {
      misc: { pos },
      feats: { Number },
    },
  } = args;
  const precedingDeterminer = findPrecedingDeterminer(
    heads,
    tokens,
    taggedWindow,
    Number,
  );
  if (!pos.NOUN || precedingDeterminer < 0) {
    return false;
  }

  const determinerHead = heads[precedingDeterminer];
  return (
    determinerHead !== -2 &&
    !determinerHeadIsItsOwnSubject(args, determinerHead)
  );
};

const adjectiveOpensItsPhrase = (
  taggedWindow: PartiallyParsedToken[],
  indexInWindow: number,
) =>
  indexInWindow > 0 &&
  ["START", "PUNCT", "MARK"].includes(
    String(taggedWindow[indexInWindow - 1].xpos),
  );

const isAfterRightADJ = (args: RuleArgs) => {
  const { taggedWindow, heads, tokens, index } = args;
  if (isDeterminedNoun(args)) {
    return true;
  }

  let currentIndex = index - 1;
  let indexInWindow = taggedWindow.length - 1;
  while (indexInWindow >= 0) {
    const {
      xpos,
      feats: { PronType },
    } = taggedWindow[indexInWindow];
    if (
      xpos === "ADJ" &&
      (Boolean(PronType) ||
        adjectiveOpensItsPhrase(taggedWindow, indexInWindow) ||
        (indexInWindow > 0 &&
          isAssignedVerbArgument(heads, tokens, currentIndex - 1)))
    ) {
      return true;
    }

    if (!["ADJ", "ADV"].includes(String(xpos))) {
      return false;
    }

    currentIndex -= 1;
    indexInWindow -= 1;
  }

  return false;
};

const followsAVerbWithNoBareComplement = ({
  foreToken: {
    lemma: foreLemma,
    xpos: foreTag,
    feats: { Mood: foreMood, VerbForm: foreVerbForm },
  },
  token: {
    form,
    lemma,
    feats: { Tense, VerbForm, Person },
  },
}: RuleArgs) =>
  Tense === "Pres" &&
  VerbForm === "Fin" &&
  foreTag === "VERB" &&
  !(
    (["go", "do"].includes(String(foreLemma)) && foreVerbForm === "Fin") ||
    (foreMood && lemma === form.toLowerCase()) ||
    (Person === 1 && lemma !== form.toLowerCase())
  );

const isNonVerbObject = (args: RuleArgs) =>
  followsAVerbWithNoBareComplement(args) &&
  !isMainVerbAfterUnmarkedRelative(args) &&
  !isMainVerbAfterPassiveRelative(args);

const isMarkedRelative = (stack: number[], tokens: PartiallyParsedToken[]) => {
  let indexInStack = stack.length - 2;
  while (indexInStack > 0) {
    const index = stack[indexInStack];
    const previousIndex = stack[indexInStack - 1];
    const {
      xpos: previousTag,
      feats: { PronType: previousPronType },
    } = tokens[previousIndex];
    const { xpos } = tokens[index];
    if (
      previousTag === "MARK" &&
      previousPronType === "Rel" &&
      xpos === "NOUN"
    ) {
      return true;
    }

    if (xpos === "VERB") {
      return false;
    }

    indexInStack -= 1;
  }

  return false;
};

const isUnmarkedRelative = (
  stack: number[],
  tokens: PartiallyParsedToken[],
) => {
  if (stack.length < 3) {
    return false;
  }

  const { xpos: secondLastTag } = tokens[stack[stack.length - 3]];
  const {
    xpos: lastTag,
    feats: { PronType: lastPronType },
  } = tokens[stack[stack.length - 2]];
  return (
    canBeSubjectOfWhenTagging(
      tokens[stack[stack.length - 2]],
      tokens[stack[stack.length - 1]],
    ) &&
    secondLastTag === "NOUN" &&
    lastTag === "NOUN" &&
    lastPronType
  );
};

const isVerbOfAFreeRelative = ({ taggedWindow, token, aftToken }: RuleArgs) => {
  const subject = [...taggedWindow]
    .reverse()
    .find(({ xpos }) => xpos !== "ADV");
  return (
    subject?.xpos === "NOUN" &&
    subject.feats.PronType === "Rel" &&
    token.feats.Person === 3 &&
    aftToken.feats.Person === 3
  );
};

const isInsideARelativeClause = (args: RuleArgs) =>
  isMarkedRelative(args.stack, args.tokens) ||
  isUnmarkedRelative(args.stack, args.tokens) ||
  isVerbOfAFreeRelative(args);

const hasNonVerbObject = (args: RuleArgs) => {
  const {
    token: {
      feats: { Mood, Tense },
    },
    aftToken: {
      form: aftWord = "",
      lemma: aftLemma = "",
      xpos: aftTag,
      feats: { Tense: aftTense, VerbForm: aftVerbForm },
    },
  } = args;
  return (
    aftTag === "VERB" &&
    aftTense === "Pres" &&
    aftVerbForm === "Fin" &&
    !(
      (Mood && aftLemma === aftWord.toLowerCase()) ||
      Tense === "Past" ||
      isInsideARelativeClause(args)
    )
  );
};

const isAfterIncompatibleMarker = ({
  token: {
    feats: { Tense, VerbForm },
  },
  foreToken: {
    xpos,
    feats: { AdpType, ConjType },
  },
}: RuleArgs) =>
  xpos === "MARK" &&
  AdpType &&
  !ConjType &&
  Tense === "Pres" &&
  VerbForm === "Fin";

const closesSingularNounSearch = (
  windowToken: PartiallyParsedToken,
  token: PartiallyParsedToken,
) => {
  const {
    xpos,
    feats: { PronType },
  } = windowToken;
  if (["PUNCT", "VERB", "MARK"].includes(String(xpos))) {
    return true;
  }

  return (
    xpos === "NOUN" &&
    (Boolean(PronType) || canBeSubjectOfWhenTagging(windowToken, token))
  );
};

const isSingularDeterminer = (
  { xpos, feats: { PronType, Number } }: PartiallyParsedToken,
  {
    feats: { AdpType: aftAdpType, PronType: aftPronType },
  }: { feats: LexicalFeatures },
) =>
  xpos === "ADJ" &&
  Boolean(PronType) &&
  (Number === "Sing" || Boolean(aftAdpType) || aftPronType === "Rel");

const isSingularNoun = (
  taggedWindow: PartiallyParsedToken[],
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  const token = tokens[index];
  const aftToken = index < tokens.length - 1 ? tokens[index + 1] : END_TOKEN;
  let indexInWindow = taggedWindow.length - 1;
  while (indexInWindow >= 0) {
    const windowToken = taggedWindow[indexInWindow];
    if (closesSingularNounSearch(windowToken, token)) {
      return false;
    }

    if (isSingularDeterminer(windowToken, aftToken)) {
      return true;
    }

    indexInWindow -= 1;
  }

  return false;
};

const isValidStandaloneGerundVerb = (taggedWindow: PartiallyParsedToken[]) => {
  let currentIndex = taggedWindow.length - 1;
  while (currentIndex >= 0 && taggedWindow[currentIndex].xpos !== "START") {
    const { xpos } = taggedWindow[currentIndex];
    if (xpos === "ADV") {
      currentIndex -= 1;
    } else if (xpos === "MARK" || xpos === "PUNCT") {
      return true;
    } else {
      return false;
    }
  }

  return true;
};

const isImmediatelyPrecededByParticipleADJ = (
  taggedWindow: PartiallyParsedToken[],
) => {
  let currentIndex = taggedWindow.length - 1;
  while (currentIndex >= 0 && taggedWindow[currentIndex].xpos !== "START") {
    const {
      xpos,
      feats: { VerbForm },
    } = taggedWindow[currentIndex];
    if (xpos === "ADV") {
      currentIndex -= 1;
    } else if (xpos === "ADJ") {
      if (VerbForm === "Part") {
        return true;
      }

      currentIndex -= 1;
    } else {
      return false;
    }
  }

  return false;
};

const isBlockedByObjectComplementVerb = ({
  stack,
  tokens,
  token,
}: RuleArgs) => {
  if (stack.length < 3) {
    return false;
  }

  const {
    form,
    lemma,
    feats: { Tense, VerbForm },
  } = token;
  const isBareForm =
    Tense === "Pres" && VerbForm === "Fin" && lemma === form.toLowerCase();
  const [modalVerb, modalArgument] = stack.slice(stack.length - 3);
  const {
    lemma: modalLemma,
    feats: { Mood: modalMood },
  } = tokens[modalVerb];
  return (
    Boolean(modalMood || (isBareForm && takesObjectComplement(modalLemma))) &&
    tokens[modalArgument].xpos === "NOUN"
  );
};

const isGerundWithoutVerbalSupport = ({
  stack,
  tokens,
  taggedWindow,
  token,
  aftToken: {
    misc: { pos: aftPos = {} },
    feats: { PronType: aftPronType },
  },
}: RuleArgs) =>
  isGerund(token) &&
  !hasGerundVerbHeadInStack(stack, tokens, taggedWindow) &&
  !isValidStandaloneGerundVerb(taggedWindow) &&
  !aftPos.MARK &&
  !aftPronType;

const disagreesWithStackSubject = ({
  stack,
  tokens,
  taggedWindow,
  token: {
    feats: { Person, VerbForm, Tense },
  },
}: RuleArgs) => {
  const {
    xpos: stackHeadTag,
    feats: { Number: stackHeadNumber, PronType: stackHeadPronType },
  } = stackHeadOr(stack, tokens, UNKNOWN_TOKEN, 3);
  const isFirstPersonAfterSingularNoun =
    VerbForm !== "Part" &&
    Tense !== "Past" &&
    stackHeadTag === "NOUN" &&
    Person === 1 &&
    stackHeadNumber === "Sing" &&
    !stackHeadPronType;
  return (
    isImmediatelyPrecededByParticipleADJ(taggedWindow) ||
    isFirstPersonAfterSingularNoun ||
    (Person === 3 && stackHeadNumber === "Plur")
  );
};

const closesPrepositionalPhrase = ({
  stack,
  tokens,
  aftToken: { xpos: aftTag },
}: RuleArgs) => {
  const {
    xpos: stackHeadTag,
    feats: { AdpType: stackHeadAdpType, ConjType: stackHeadConjType },
  } = stackHeadOr(stack, tokens, UNKNOWN_TOKEN, 3);
  return (
    stackHeadTag === "MARK" &&
    Boolean(stackHeadAdpType) &&
    !stackHeadConjType &&
    ["END", "PUNCT"].includes(String(aftTag))
  );
};

const opensClauseBeforeVerb = ({
  foreToken: { xpos: foreTag },
  aftToken: {
    lemma: aftLemma,
    form: aftForm,
    misc: { pos: aftPos = {} },
    feats: { Tense: aftTense, VerbForm: aftVerbForm, PronType: aftPronType },
  },
}: RuleArgs) =>
  ["START", "MARK", "PUNCT"].includes(String(foreTag)) &&
  Boolean(
    (aftPos.VERB && aftLemma === aftForm.toLowerCase()) ||
      aftPronType === "Rel" ||
      aftTense === "Past" ||
      aftVerbForm === "Part",
  );

const verbIsNoun = (args: RuleArgs) => {
  const {
    taggedWindow,
    stack,
    tokens,
    index,
    token: {
      feats: { Number },
      misc: { pos },
    },
  } = args;
  if (
    !pos.NOUN ||
    isBlockedByObjectComplementVerb(args) ||
    isUnmarkedRelativeRoot(args) ||
    isModalVerbComplement(args)
  ) {
    return false;
  }

  if (isGerundWithoutVerbalSupport(args)) {
    trace(
      () =>
        `Verb at ${index} is gerund noun: has gerund verb in stack? ${hasGerundVerbHeadInStack(
          stack,
          tokens,
          taggedWindow,
        )}; is valid standalone gerund verb? ${isValidStandaloneGerundVerb(
          taggedWindow,
        )}`,
    );
    return true;
  }

  if (disagreesWithStackSubject(args)) {
    return true;
  }

  if (Number === "Plur") {
    return closesPrepositionalPhrase(args) || opensClauseBeforeVerb(args);
  }

  return isSingularNoun(taggedWindow, tokens, index);
};

const followsADeterminer = (tokens: PartiallyParsedToken[], index: number) => {
  const {
    xpos: foreTag,
    feats: { PronType: forePronType },
  } = tokens[index - 1];
  return foreTag === "ADJ" && Boolean(forePronType);
};

const isPluralSubjectOfPersonalVerb = (
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  const {
    feats: { Number },
  } = tokens[index];
  const {
    xpos: nextTag,
    feats: { Person: nextPerson },
    misc: { pos: nextPos = {} },
  } = index + 1 === tokens.length ? END_TOKEN : tokens[index + 1];
  return (
    (nextTag === "VERB" || Boolean(nextPos.VERB)) &&
    [1, 2].includes(nextPerson ?? -1) &&
    Number === "Plur"
  );
};

const hasModifiableNounAfter = (
  tokens: PartiallyParsedToken[],
  from: number,
) => {
  let currentIndex = from;
  while (currentIndex < tokens.length) {
    const {
      xpos,
      misc: { pos },
    } = tokens[currentIndex];
    if (["MARK", "END", "PUNCT"].includes(String(xpos))) {
      return false;
    }

    if (
      (xpos === "NOUN" || pos.NOUN) &&
      (followsADeterminer(tokens, currentIndex) ||
        isPluralSubjectOfPersonalVerb(tokens, currentIndex))
    ) {
      return true;
    }

    currentIndex += 1;
  }

  return false;
};

const isGerundAdjective = ({ tokens, index }: RuleArgs) => {
  const token = tokens[index];
  const {
    misc: { pos },
  } = token;
  const {
    feats: { PronType: aftPronType },
  } = index < tokens.length - 1 ? tokens[index + 1] : END_TOKEN;
  if (!pos.ADJ || aftPronType || !isGerund(token)) {
    return false;
  }

  return hasModifiableNounAfter(tokens, index + 1);
};

const findLastDegree1Marker = (
  tokens: PartiallyParsedToken[],
  stack: number[],
) => {
  let indexInStack = stack.length - 1;
  while (indexInStack >= 0) {
    const index = stack[indexInStack];
    const {
      xpos,
      feats: { AdpType, ConjType },
    } = tokens[index];
    if (xpos === "MARK" && AdpType && !ConjType) {
      return index;
    }

    if (["PUNCT", "VERB", "MARK"].includes(String(xpos))) {
      return -1;
    }

    indexInStack -= 1;
  }

  return -1;
};

const hasConjunction = (taggedWindow: PartiallyParsedToken[]) =>
  taggedWindow.some(
    ({ xpos, feats: { ConjType } }) => xpos === "MARK" && ConjType,
  );

const markerHeadHasItsOwnSubject = (
  tokens: PartiallyParsedToken[],
  stack: number[],
  index: number,
  markerHead: number,
) => {
  const {
    xpos: markerHeadTag,
    feats: { Tense, VerbForm },
  } = tokens[markerHead];
  const hasSubjectBeforeTheHead = stack
    .filter((member) => member < markerHead)
    .some(
      (member) =>
        tokens[member].xpos === "NOUN" &&
        canBeSubjectOfWhenTagging(tokens[member], tokens[index]),
    );
  return (
    canBeSubjectOfWhenTagging(tokens[markerHead], tokens[index]) ||
    (markerHeadTag === "VERB" &&
      (Tense === "Past" || VerbForm === "Part") &&
      hasSubjectBeforeTheHead)
  );
};

const hasOnlyClosedTagsAhead = (
  tokens: PartiallyParsedToken[],
  from: number,
) => {
  let currentIndex = from;
  while (currentIndex < tokens.length) {
    const pos = Object.keys(tokens[currentIndex].misc.pos);
    if (pos.includes("NOUN")) {
      return false;
    }

    if (pos.every((xpos) => ["PUNCT", "MARK", "VERB"].includes(xpos))) {
      return true;
    }

    currentIndex += 1;
  }

  return false;
};

const isInvalidVerbAfterDegree1Marker = ({
  stack,
  heads,
  tokens,
  index,
  taggedWindow,
  token,
  foreToken,
}: RuleArgs) => {
  const {
    feats: { Tense, VerbForm },
  } = tokens[index];
  const degree1Marker = findLastDegree1Marker(tokens, stack);
  const markerAlreadyHasANoun =
    degree1Marker !== -1 &&
    hasChildWithMatcher(
      heads,
      tokens,
      degree1Marker,
      ({ xpos }) => xpos === "NOUN",
    );
  if (
    (foreToken.xpos === "VERB" &&
      isBareInfinitiveComplement(token, foreToken)) ||
    degree1Marker === -1 ||
    markerAlreadyHasANoun ||
    hasConjunction(taggedWindow) ||
    Tense === "Past" ||
    VerbForm === "Part"
  ) {
    return false;
  }

  const markerHead = heads[degree1Marker];
  return markerHead === -2
    ? hasOnlyClosedTagsAhead(tokens, index + 1)
    : !markerHeadHasItsOwnSubject(tokens, stack, index, markerHead);
};

const hasIncompatibleVerbOnTheLeft = (
  tokens: PartiallyParsedToken[],
  heads: number[],
  beVerbIndex: number,
) => {
  let currentIndex = beVerbIndex - 2;
  while (currentIndex >= 0) {
    const {
      xpos,
      feats: { AdpType, ConjType, Mood },
    } = tokens[currentIndex];
    if (xpos === "MARK" && AdpType) {
      return true;
    }

    if (xpos === "VERB") {
      return (
        Boolean(Mood) ||
        !verbsAreCompatible(tokens, heads, currentIndex, beVerbIndex)
      );
    }

    if ((xpos === "MARK" && ConjType) || xpos === "PUNCT") {
      return false;
    }

    currentIndex -= 1;
  }

  return false;
};

const followingClauseRejectsBeVerb = (
  tokens: PartiallyParsedToken[],
  heads: number[],
  beVerbIndex: number,
) => {
  let currentIndex = beVerbIndex + 1;
  while (currentIndex < tokens.length) {
    const {
      xpos,
      feats: { PronType, PunctType },
    } = tokens[currentIndex];
    if (xpos === "VERB") {
      return !verbsAreCompatible(tokens, heads, beVerbIndex, currentIndex);
    }

    if (
      xpos === "MARK" ||
      ["Art", "Rel"].includes(String(PronType)) ||
      isPhraseBoundaryType(PunctType)
    ) {
      return false;
    }

    currentIndex += 1;
  }

  return false;
};

const pronounsThatTakeElse = [
  "somebody",
  "someone",
  "anybody",
  "anyone",
  "everybody",
  "everyone",
  "nobody",
  "one",
];

const canBeAPossessedNoun = ({
  misc: { pos = {} },
  feats: { VerbForm },
}: PartiallyParsedToken) => Boolean(pos.NOUN) && VerbForm !== "Part";

const isElseAfterAPronoun = ({ foreToken, foreToken2, aftToken }: RuleArgs) =>
  foreToken.lemma === "else" &&
  pronounsThatTakeElse.includes(String(foreToken2.lemma)) &&
  canBeAPossessedNoun(aftToken);

const isPossessiveMarker = (args: RuleArgs) => {
  const {
    tokens,
    heads,
    index: beVerbIndex,
    foreToken: {
      lemma: foreLemma,
      xpos: foreTag,
      feats: { PronType: forePronType },
    },
    token: {
      lemma,
      feats: { AdpType },
    },
  } = args;
  const followsAPossessor =
    isElseAfterAPronoun(args) ||
    (foreTag === "NOUN" &&
      !["he", "she", "it"].includes(String(foreLemma)) &&
      !["Prs", "Dem", "Rel"].includes(String(forePronType)));
  return (
    AdpType === "Post" &&
    lemma === "be" &&
    beVerbIndex !== tokens.length - 1 &&
    followsAPossessor &&
    (hasIncompatibleVerbOnTheLeft(tokens, heads, beVerbIndex) ||
      followingClauseRejectsBeVerb(tokens, heads, beVerbIndex))
  );
};

const hasComplexVerbHead = (
  stack: number[],
  tokens: PartiallyParsedToken[],
) => {
  let indexInStack = stack.length - 2;
  while (indexInStack >= 0) {
    const index = stack[indexInStack];
    const {
      xpos,
      lemma,
      feats: { Tense, VerbForm, Mood },
    } = tokens[index];
    if (xpos === "VERB") {
      return Mood || lemma === "do" || (Tense === "Pres" && VerbForm === "Fin");
    }

    indexInStack -= 1;
  }

  return false;
};

const stackHeadIsHeadlessNoun = (
  stack: number[],
  tokens: PartiallyParsedToken[],
  heads: number[],
) => {
  if (stack.length <= 2) {
    return false;
  }

  const stackHead = stack[stack.length - 2];
  return tokens[stackHead].xpos === "NOUN" && heads[stackHead] === -2;
};

const modifierRunEndsWithoutANoun = (
  tokens: PartiallyParsedToken[],
  from: number,
) => {
  let currentIndex = from;
  while (currentIndex < tokens.length - 1) {
    const tags = Object.keys(tokens[currentIndex].misc.pos);
    if (tags.includes("NOUN")) {
      return false;
    }

    if (!tags.some((tag) => ["ADJ", "ADV"].includes(tag))) {
      return true;
    }

    currentIndex += 1;
  }

  return false;
};

const isPastTenseSubject = ({
  tokens,
  index,
  stack,
  heads,
  token: {
    misc: { pos },
  },
  aftToken: {
    feats: { Tense: aftTense, VerbForm: aftVerbForm },
  },
}: RuleArgs) => {
  if (
    stackHeadIsHeadlessNoun(stack, tokens, heads) ||
    hasComplexVerbHead(stack, tokens) ||
    !pos.NOUN ||
    aftTense !== "Past" ||
    aftVerbForm === "Part"
  ) {
    return false;
  }

  return modifierRunEndsWithoutANoun(tokens, index + 2);
};

const verbRules: Rule[] = [
  { id: "v-is-do-supported", when: isTheVerbDoSupports, features: {} },
  { id: "v-is-only-finite-verb", when: isTheOnlyFiniteVerb, features: {} },
  { id: "v-is-pos-mark", when: isPossessiveMarker, features: null },
  {
    id: "v-is-invalid-after-mark-1",
    when: isInvalidVerbAfterDegree1Marker,
    features: null,
  },
  { id: "v-is-noun", when: verbIsNoun, features: null },
  { id: "v-is-gerund-adj", when: isGerundAdjective, features: null },
  {
    id: "v-after-incompatible-marker",
    when: isAfterIncompatibleMarker,
    features: null,
  },
  {
    id: "v-irregular-past-adj",
    when: isIrregularPastAdjective,
    features: null,
  },
  { id: "v-is-past-adj", when: isPastAdjective, features: null },
  { id: "v-after-right-adj", when: isAfterRightADJ, features: null },
  { id: "v-has-non-verb-object", when: hasNonVerbObject, features: null },
  { id: "v-non-verb-object", when: isNonVerbObject, features: null },
  { id: "v-is-comp-adj", when: isComparativeAdjective, features: null },
  { id: "v-is-past-subj", when: isPastTenseSubject, features: null },
  {
    id: "v-object",
    when: isCompatibleVerb,
    features: { parentDirection: "L" },
  },
];

const isAdjChainAfterDeterminer = (taggedWindow: PartiallyParsedToken[]) => {
  const lastDeterminerOffset = taggedWindow
    .slice()
    .reverse()
    .findIndex(({ xpos, feats: { PronType } }) => PronType && xpos === "ADJ");
  if (lastDeterminerOffset === -1) {
    return false;
  }

  const indexInWindow = taggedWindow.length - 1 - lastDeterminerOffset;
  const tokensAfterDeterminer = taggedWindow.slice(indexInWindow + 1);
  return tokensAfterDeterminer.every(({ xpos }) =>
    ["ADJ", "ADV"].includes(String(xpos)),
  );
};

const isCoordinatedDeterminer = ({ tokens, index }: RuleArgs) => {
  const conjunction = index + 1 < tokens.length ? tokens[index + 1] : null;
  const conjunct = index + 2 < tokens.length ? tokens[index + 2] : null;
  return (
    conjunction?.feats.ConjType === "Coor" &&
    conjunct != null &&
    Boolean(conjunct.feats.PronType) &&
    canStillBe(conjunct, ["ADJ"]) &&
    tokens
      .slice(index + 3)
      .some(({ xpos, misc: { pos } }) => xpos === "NOUN" || Boolean(pos.NOUN))
  );
};

const isHeadlessAdjective = ({
  steps,
  taggedWindow,
  foreToken: { xpos: foreTag },
  aftToken: { xpos: aftTag },
}: RuleArgs) =>
  ["VERB", "MARK", "END", "PUNCT"].includes(String(aftTag)) &&
  ((steps.some(({ xpos }) => xpos === "NOUN") &&
    (["MARK", "START"].includes(String(foreTag)) || foreTag === "PUNCT")) ||
    isAdjChainAfterDeterminer(taggedWindow));

const isDeterminer = ({
  token: {
    feats: { PronType },
  },
}: RuleArgs) => Boolean(PronType);

const postAdjectives = ["all", "both", "each", "else"];

const isPostADJ = ({
  foreToken: {
    xpos: foreTag,
    feats: { PronType: forePronType },
    misc: { pos: forePosTags = {} },
  },
  token: {
    form,
    lemma = form.toLowerCase(),
    misc: { pos },
  },
}: RuleArgs) =>
  pos.ADJ &&
  ((foreTag === "NOUN" &&
    ((["Ind", "Tot", "Neg"].includes(String(forePronType)) &&
      !forePosTags.ADJ) ||
      postAdjectives.includes(lemma))) ||
    (foreTag === "VERB" && !pos.ADV && !pos.NOUN));

const unmodifiableAfterTags = ["END", "MARK", "VERB", "ADV"];

const isFollowedByUnmodifiableTag = ({
  aftToken: { xpos: aftTag },
}: RuleArgs) => unmodifiableAfterTags.includes(String(aftTag));

const nounPhraseIsAlreadyDetermined = ({
  heads,
  steps,
  taggedWindow,
  tokens,
  token: {
    feats: { Number },
  },
  aftToken: {
    misc: { pos: aftPos = {} },
  },
}: RuleArgs) =>
  steps.some(({ xpos }) => xpos === "NOUN") &&
  Boolean(aftPos.MARK || aftPos.PUNCT) &&
  findPrecedingDeterminer(heads, tokens, taggedWindow, Number) >= 0;

const isDeterminedByPreviousWord = ({
  foreToken: {
    xpos: foreTag,
    feats: { PronType: forePronType },
    misc: { pos: forePosTags },
  },
}: RuleArgs) =>
  Boolean(forePronType) ||
  Boolean(foreTag === "ADJ" && forePosTags && forePosTags.ADV);

const nextWordIsUnmodifiable = (args: RuleArgs) => {
  const {
    token: {
      feats: { NumType, PronType },
    },
    aftToken: {
      feats: { PronType: aftPronType, PunctType: aftPunctType },
    },
  } = args;
  const modifiesANumber =
    Boolean(NumType) &&
    (aftPunctType === "Dash" || isFollowedByUnmodifiableTag(args));
  return (
    (!PronType && Boolean(aftPronType)) ||
    nounPhraseIsAlreadyDetermined(args) ||
    modifiesANumber ||
    (isDeterminedByPreviousWord(args) && isFollowedByUnmodifiableTag(args))
  );
};

const isForcedPronoun = (args: RuleArgs) => {
  const {
    token: {
      feats: { PronType },
      misc: { pos },
    },
    aftToken: {
      xpos: aftTag,
      feats: { PunctType: aftPunctType },
    },
  } = args;
  return (
    (["MARK", "VERB", "END"].includes(String(aftTag)) ||
      isPhraseBoundaryType(aftPunctType)) &&
    pos.NOUN &&
    Boolean(PronType) &&
    !isCoordinatedDeterminer(args)
  );
};

const isPossessiveParticleArgument = ({
  token: {
    misc: { pos },
  },
  aftToken: {
    lemma: aftLemma,
    feats: { AdpType: aftAdpType },
  },
}: RuleArgs) => aftAdpType === "Post" && aftLemma === "be" && pos.NOUN;

const skipAdjectivesToNoun = (taggedWindow: PartiallyParsedToken[]) => {
  let indexInWindow = taggedWindow.length - 1;
  while (indexInWindow >= 0 && taggedWindow[indexInWindow].xpos === "ADJ") {
    indexInWindow -= 1;
  }

  return indexInWindow >= 0 && taggedWindow[indexInWindow].xpos === "NOUN"
    ? indexInWindow
    : -1;
};

const nounPhraseIsHeadedOnTheLeft = (
  taggedWindow: PartiallyParsedToken[],
  from: number,
) => {
  let indexInWindow = from;
  while (indexInWindow >= 0) {
    const {
      xpos,
      feats: { NumType },
    } = taggedWindow[indexInWindow];
    if (xpos === "MARK") {
      return true;
    }

    if (xpos === "VERB") {
      return false;
    }

    if (!(xpos === "ADJ" || (xpos === "NOUN" && NumType !== "Card"))) {
      return true;
    }

    indexInWindow -= 1;
  }

  return false;
};

const isInvalidADJAfterNoun = ({
  taggedWindow,
  aftToken: { xpos: aftTag },
}: RuleArgs) => {
  if (!["VERB", "END"].includes(String(aftTag))) {
    return false;
  }

  const nounInWindow = skipAdjectivesToNoun(taggedWindow);
  return (
    nounInWindow >= 0 && nounPhraseIsHeadedOnTheLeft(taggedWindow, nounInWindow)
  );
};

const isIncompatibleInNumber = ({
  token: {
    feats: { Number, PronType },
  },
  index,
  tokens,
}: RuleArgs) => {
  if (!Number || !PronType) {
    return false;
  }

  let currentIndex = index + 1;
  let seenDifferentNumber = false;
  while (currentIndex < tokens.length) {
    const {
      feats: { Number: otherNumber, PronType },
      misc: { pos },
    } = tokens[currentIndex];
    if (otherNumber) {
      if (otherNumber === Number) {
        return false;
      }

      seenDifferentNumber = true;
    }

    if (pos.VERB || pos.MARK || PronType) {
      return seenDifferentNumber;
    }

    currentIndex += 1;
  }

  return false;
};

const lastIsADJ = ({ foreToken: { xpos: foreTag } }: RuleArgs) =>
  foreTag === "ADJ";

const isAdverb = ({
  token: {
    misc: { pos },
  },
  aftToken: {
    xpos: aftTag,
    feats: { PronType: aftPronType },
    misc: { pos: aftTokenPossiblePosTags = {} },
  },
}: RuleArgs) => {
  const aftTags = Object.keys(aftTokenPossiblePosTags);
  return (
    Boolean(pos.ADV) &&
    !aftPronType &&
    (["ADJ", "ADV"].includes(String(aftTag)) ||
      (aftTags.length > 0 &&
        aftTags.every((xpos) => ["ADJ", "ADV"].includes(xpos))))
  );
};

const adjIsForcedVerb = (args: RuleArgs) => {
  if (!args.token.misc.pos.VERB) {
    return false;
  }

  return (
    isGerundOrPastVerb(args) ||
    isUnmarkedRelativeRoot(args) ||
    (isCompatibleVerb(args) &&
      !isAfterRightADJ(args) &&
      !args.steps.some(({ xpos }) => xpos === "NOUN"))
  );
};

const adjectiveRules: Rule[] = [
  {
    id: "adj-worth-gerund",
    when: isWorthGerund,
    features: { parentDirection: "L" },
  },
  { id: "adj-is-postposed-degree", when: isPostposedDegree, features: null },
  { id: "adj-is-adv", when: isAdverb, features: null },
  { id: "inv-adj-after-n", when: isInvalidADJAfterNoun, features: null },
  {
    id: "adj-incompatible-Number",
    when: isIncompatibleInNumber,
    features: null,
  },
  { id: "adj-is-compound-noun", when: isCompoundNounAdj, features: null },
  {
    id: "adj-poss-particle-argument",
    when: isPossessiveParticleArgument,
    features: null,
  },
  { id: "adj-is-forced-verb", when: adjIsForcedVerb, features: null },
  {
    id: "adj-is-verb-object",
    when: isVerbsAdjObject,
    features: { parentDirection: "L" },
  },
  { id: "adj-post-adj", when: isPostADJ, features: { parentDirection: "L" } },
  { id: "adj-is-forced-pro", when: isForcedPronoun, features: null },
  { id: "adj-headless", when: isHeadlessAdjective, features: null },
  {
    id: "adj-next-form-unmodifiable",
    when: nextWordIsUnmodifiable,
    features: null,
  },
  { id: "adj-after-adj", when: lastIsADJ, features: {} },
  { id: "adj-det", when: isDeterminer, features: { parentDirection: "R" } },
];

const isRepurposedADVAfterRightADJ = (args: RuleArgs) => {
  const {
    aftToken: {
      misc: { pos = {} },
    },
  } = args;
  return isAfterRightADJ(args) && !pos.ADV && !pos.ADJ;
};

const advIsMarker = ({
  steps,
  token: {
    feats: { AdpType, ConjType },
  },
  aftToken,
}: RuleArgs) => {
  const {
    xpos: aftTag,
    feats: { PronType: aftPronType, PunctType: aftPunctType },
  } = aftToken;
  return (
    steps.some(({ xpos }) => xpos === "MARK") &&
    (["NOUN", "ADJ"].includes(String(aftTag)) ||
      (AdpType && ConjType && !canStillBe(aftToken, ["VERB", "ADV"])) ||
      isPhraseBoundaryType(aftPunctType) ||
      Boolean(aftPronType))
  );
};

const advIsNoun = ({
  steps,
  aftToken: {
    xpos: aftTag,
    feats: {
      PronType: aftPronType,
      PunctType: aftPunctType,
      AdpType: aftAdpType,
    },
  },
}: RuleArgs) =>
  steps.some(({ xpos }) => xpos === "NOUN") &&
  ((aftTag === "MARK" && Boolean(aftAdpType)) ||
    isPhraseBoundaryType(aftPunctType) ||
    Boolean(aftPronType));

const adverbIsRightDelimited = ({ aftToken: { xpos: aftTag } }: RuleArgs) =>
  ["PUNCT", "END"].includes(String(aftTag));

const adverbIsLeftDelimited = ({ foreToken: { xpos: foreTag } }: RuleArgs) =>
  ["PUNCT", "START"].includes(String(foreTag));

const advIsSubject = ({
  foreToken: { xpos: foreTag },
  token: {
    misc: { pos },
  },
  aftToken: { xpos: aftTag },
}: RuleArgs) =>
  aftTag === "VERB" &&
  ["START", "PUNCT", "MARK"].includes(String(foreTag)) &&
  pos.NOUN;

const isAdjective = ({
  steps,
  token: {
    feats: { PronType },
  },
  foreToken: { xpos: foreTag },
  aftToken: {
    xpos: aftTag,
    misc: { pos: aftPos = {} },
  },
}: RuleArgs) =>
  steps.some(({ xpos }) => xpos === "ADJ") &&
  (aftTag === "NOUN" ||
    (foreTag === "NOUN" && PronType && aftPos.NOUN && !aftPos.ADJ));

const isDirectObject = ({
  stack,
  steps,
  tokens,
  aftToken: {
    misc: { pos = {} },
  },
}: RuleArgs) => {
  if (stack.length < 2) {
    return false;
  }

  const lastStackItem = stack[stack.length - 2];
  const { xpos: lastStackTag } = tokens[lastStackItem];
  return (
    steps.some(({ xpos }) => xpos === "NOUN") &&
    lastStackTag === "VERB" &&
    !pos.ADJ &&
    !pos.ADV
  );
};

const adverbRules: Rule[] = [
  { id: "adv-is-subj", when: advIsSubject, features: null },
  { id: "adv-is-adj", when: isAdjective, features: null },
  { id: "adv-is-verb-object", when: isDirectObject, features: null },
  {
    id: "adv-after-right-adj",
    when: isRepurposedADVAfterRightADJ,
    features: null,
  },
  { id: "adv-is-mark", when: advIsMarker, features: null },
  { id: "adv-is-noun", when: advIsNoun, features: null },
  { id: "adv-post-adj", when: isPostADJ, features: null },
  {
    id: "adv-is-right-delimited",
    when: adverbIsRightDelimited,
    features: { parentDirection: "L" },
  },
  {
    id: "adv-left-delimited",
    when: adverbIsLeftDelimited,
    features: { parentDirection: "R" },
  },
];

const isPostpositionAfterVerb = ({
  token: {
    feats: { AdpType },
  },
  foreToken: { xpos: foreTag },
}: RuleArgs) => AdpType === "Post" && foreTag === "VERB";

const isPossParticleWithoutArguments = (args: RuleArgs) => {
  const {
    token: {
      lemma,
      feats: { AdpType },
    },
    foreToken: {
      xpos: foreTag,
      feats: { PronType: forePronType },
    },
  } = args;
  return (
    AdpType === "Post" &&
    lemma === "be" &&
    !isElseAfterAPronoun(args) &&
    (foreTag !== "NOUN" || ["Prs", "Dem", "Rel"].includes(String(forePronType)))
  );
};

const isRelativePronoun = ({
  steps,
  foreToken: { xpos: foreTag },
  token: {
    feats: { PronType },
    misc: { pos },
  },
  aftToken: {
    feats: { PronType: aftPronType, PunctType: aftPunctType },
    misc: { pos: aftTags },
  },
}: RuleArgs) =>
  (steps.some(({ xpos }) => xpos === "NOUN") || pos.ADJ) &&
  PronType === "Rel" &&
  !aftPronType &&
  (foreTag === "MARK" ||
    isPhraseBoundaryType(aftPunctType) ||
    !aftTags ||
    !["NOUN", "VERB"].includes(String(foreTag)));

const isVerbNotMarker = ({
  foreToken: { xpos: foreTag },
  token: {
    lemma,
    misc: { pos },
  },
  aftToken,
  taggedWindow,
}: RuleArgs) => {
  if (!pos.VERB) {
    return false;
  }

  if (lemma === "like") {
    const {
      misc: { pos: aftPos = {} },
    } = aftToken;
    return Boolean(aftPos.MARK) || foreTag === "ADV";
  }

  const precedingDoVerbOffset = taggedWindow
    .slice()
    .reverse()
    .findIndex(({ xpos, lemma }) => xpos === "VERB" && lemma === "do");
  if (precedingDoVerbOffset === -1) {
    return false;
  }

  const indexInWindow = taggedWindow.length - 1 - precedingDoVerbOffset;
  const tokensAfterDo = taggedWindow.slice(indexInWindow + 1);
  return tokensAfterDo.every(({ xpos }) => ["ADV"].includes(String(xpos)));
};

const isAmount = ({
  token: {
    feats: { NumType },
  },
  aftToken: {
    misc: { isUnit: aftIsUnit },
  },
}: RuleArgs) => NumType != null && Boolean(aftIsUnit);

const followingClauseNeedsABeVerb = (
  tokens: PartiallyParsedToken[],
  heads: number[],
  beVerbIndex: number,
) => {
  let currentIndex = beVerbIndex + 1;
  while (currentIndex < tokens.length) {
    const {
      xpos,
      feats: { PronType },
    } = tokens[currentIndex];

    if (canStillBe(tokens[currentIndex], ["NOUN"])) {
      return false;
    }

    if (xpos === "VERB") {
      return verbsAreCompatible(tokens, heads, beVerbIndex, currentIndex);
    }

    if (xpos === "MARK" || ["Art", "Rel"].includes(String(PronType))) {
      return true;
    }

    currentIndex += 1;
  }

  return false;
};

const isBeVerbContraction = ({
  tokens,
  heads,
  index: beVerbIndex,
  foreToken: {
    lemma: foreLemma,
    xpos: foreTag,
    feats: { Number: foreNumber },
  },
  token: {
    lemma,
    feats: { AdpType },
  },
}: RuleArgs) => {
  const contractsABeVerb =
    AdpType === "Post" &&
    lemma === "be" &&
    beVerbIndex !== tokens.length - 1 &&
    !(foreNumber === "Plur" && foreTag === "NOUN");
  return (
    contractsABeVerb &&
    (["he", "she", "it"].includes(String(foreLemma)) ||
      followingClauseNeedsABeVerb(tokens, heads, beVerbIndex))
  );
};

const isPrecededByDeterminedNoun = (taggedWindow: PartiallyParsedToken[]) => {
  let indexInWindow = taggedWindow.length - 1;
  while (indexInWindow >= 0) {
    const {
      xpos,
      feats: { PronType },
    } = taggedWindow[indexInWindow];
    if (["ADV", "NOUN"].includes(String(xpos))) {
      indexInWindow -= 1;
    } else if (xpos === "ADJ") {
      if (PronType) {
        return true;
      }

      indexInWindow -= 1;
    } else {
      return false;
    }
  }

  return false;
};

const isNounNotMarker = ({
  token: {
    misc: { pos },
  },
  aftToken: {
    feats: { Tense: aftTense, VerbForm: aftVerbForm },
  },
  taggedWindow,
}: RuleArgs) => {
  if (!pos.NOUN) {
    return false;
  }

  return (
    isPrecededByDeterminedNoun(taggedWindow) &&
    (aftVerbForm === "Part" || (aftTense === "Past" && aftVerbForm !== "Fin"))
  );
};

const markerRules: Rule[] = [
  { id: "mark-is-amount", when: isAmount, features: null },
  {
    id: "mark-is-modal-complement",
    when: isModalVerbComplement,
    features: null,
  },
  { id: "mark-is-be-verb", when: isBeVerbContraction, features: null },
  { id: "mark-is-verb", when: isVerbNotMarker, features: null },
  { id: "mark-is-noun", when: isNounNotMarker, features: null },
  { id: "mark-relative-pro", when: isRelativePronoun, features: null },
  { id: "is-adverb-not-marker", when: isAdverbNotMarker, features: null },
  { id: "mark-post-after-v", when: isPostpositionAfterVerb, features: null },
  {
    id: "mark-poss-particle-no-args",
    when: isPossParticleWithoutArguments,
    features: null,
  },
];

const isIsolatedIntj = ({
  foreToken: {
    xpos: foreTag,
    misc: { pos: forePosTags },
  },
  token: {
    misc: { isOpaque },
  },
  aftToken: {
    misc: { pos: aftPosTags },
  },
}: RuleArgs) =>
  !isOpaque &&
  ((["START", "INTJ"].includes(String(foreTag)) &&
    (!aftPosTags || aftPosTags.PUNCT || aftPosTags.INTJ)) ||
    !forePosTags ||
    forePosTags.INTJ);

const endOfRules: Rule = { id: "end-of-rules", when: () => true, features: {} };

const forcedTag: Rule = {
  id: "forced-no-legal-tag",
  when: () => true,
  features: {},
};

const matchingRules = (rules: Rule[], args: RuleArgs) => {
  if (!isAuditing()) {
    return [];
  }

  return rules.reduce((matched: string[], { id, when }) => {
    try {
      if (when(args)) {
        matched.push(id);
      }
    } catch {
      matched.push(`${id} (threw)`);
    }

    return matched;
  }, []);
};

const applyRules = (rules: Rule[], xpos: PosTag, args: RuleArgs) => {
  const { sortedPosTags, steps, hasAlternativePath, flexibleMode } = args;
  if (
    flexibleMode &&
    !hasAlternativePath &&
    steps.length === 0 &&
    sortedPosTags.indexOf(xpos) > 0 &&
    sortedPosTags.indexOf(xpos) === sortedPosTags.length - 1
  ) {
    trace(() => `Tag ${xpos} forced for ${args.tokens[args.index].form}`);
    return {
      features: forcedTag.features,
      id: forcedTag.id,
      forced: true,
      matched: matchingRules(rules, args),
    };
  }

  const { id, features } = rules.find(({ when }) => when(args)) ?? endOfRules;
  trace(() => id);

  return { features, id, forced: false, matched: matchingRules(rules, args) };
};

const intjRules: Rule[] = [
  { id: "isolated-intj", when: isIsolatedIntj, features: {} },
  { id: "no-ambiguous-intjs", when: () => true, features: null },
];

const toStepFeatures = (xpos: PosTag, args: RuleArgs) => {
  switch (xpos) {
    case "VERB":
      return applyRules(verbRules, xpos, args);
    case "NOUN":
      return applyRules(nounRules, xpos, args);
    case "MARK":
      return applyRules(markerRules, xpos, args);
    case "ADJ":
      return applyRules(adjectiveRules, xpos, args);
    case "ADV":
      return applyRules(adverbRules, xpos, args);
    case "PUNCT":
      return {
        features: null,
        id: "punct-never-in-a-chain",
        forced: false,
        matched: [],
      };
    default:
      return applyRules(intjRules, xpos, args);
  }
};

const buildTaggedWindow = (
  tokens: PartiallyParsedToken[],
  id: number,
  path: Step[],
  windowLength = 4,
) => {
  const window = [];
  for (let i = id - windowLength, start = id - path.length; i < id; i += 1) {
    window.push(
      i < 0
        ? { xpos: "START", misc: {}, feats: {} }
        : i < start
          ? tokens[i]
          : { ...tokens[i], ...path[i - start] },
    );
  }

  return window;
};

const traceStepVerdict = (
  token: PartiallyParsedToken,
  xpos: PosTag,
  path: Step[],
  features: RuleFeatures | null,
) =>
  trace(() => {
    const pathTags = path.map(({ xpos }) => xpos).join("-");
    const verdict = features == null ? "can't act as" : "can act as";
    const detail =
      features == null ? "" : ` (features: ${JSON.stringify(features)})`;
    return `Word "${token.form}" ${verdict} "${xpos}" in "${pathTags}"${detail}`;
  });

type StepSearch = {
  state: TaggingState;
  index: number;
  path: Step[];
  hasAlternativePath: boolean;
  flexibleMode: boolean;
};

const validSteps = ({
  state: { tokens, stack, heads },
  index,
  path,
  hasAlternativePath,
  flexibleMode,
}: StepSearch) => {
  trace(
    () =>
      `Find valid steps for "${tokens[index].form}" (${JSON.stringify(
        tokens[index],
      )}); flexible mode? ${flexibleMode}`,
  );
  const taggedWindow = buildTaggedWindow(tokens, index, path);
  const sortedPosTags = Object.keys(tokens[index].misc.pos).sort(
    tagOrder,
  ) as PosTag[];
  const verdicts: TagVerdict[] = [];
  const steps = sortedPosTags.reduce((steps, xpos) => {
    const { features, id, forced, matched } = toStepFeatures(xpos, {
      flexibleMode,
      hasAlternativePath,
      sortedPosTags,
      tokens,
      index,
      taggedWindow,
      token: tokens[index],
      foreToken: taggedWindow[taggedWindow.length - 1],
      foreToken2: taggedWindow[taggedWindow.length - 2],
      aftToken: tokens[index + 1] || END_TOKEN,
      stack,
      heads,
      steps,
    } as RuleArgs);
    verdicts.push({
      xpos,
      rule: id,
      accepted: features != null,
      forced,
      matched,
    });
    traceStepVerdict(tokens[index], xpos, path, features);
    return features == null
      ? steps
      : ([...steps, { index, xpos, ...features }] as Step[]);
  }, [] as Step[]);

  recordTagEvent(() => ({
    type: "judged",
    index,
    candidates: sortedPosTags,
    verdicts,
    flexibleMode,
  }));

  return steps;
};

const extendSubpaths = ({
  state,
  chain,
  chainIndex,
  path,
  subpaths,
  flexibleMode = false,
}: {
  state: TaggingState;
  chain: number[];
  chainIndex: number;
  path: Step[];
  subpaths: Step[][];
  flexibleMode?: boolean;
}) => {
  const { subpaths: extendedSubpaths } = subpaths.reduce(
    ({ subpaths, steps }, subpath) => {
      const newSteps = validSteps({
        state,
        index: chain[chainIndex],
        path: [...path, ...subpath],
        hasAlternativePath: steps.length > 0,
        flexibleMode,
      });
      return {
        subpaths: [...subpaths, ...newSteps.map((step) => [...subpath, step])],
        steps: [...steps, ...newSteps],
      };
    },
    { subpaths: [] as Step[][], steps: [] as Step[] },
  );

  return extendedSubpaths;
};

const filterSubpaths = (
  { weights, tokens }: TaggingState,
  path: Step[],
  subpaths: Step[][],
  chainIndex: number,
) => {
  const [firstSubpath] = subpaths;
  const { index } = firstSubpath[chainIndex];
  const { pos } = tokens[index].misc;
  const tags = subpaths
    .reduce((tags, subpath) => {
      const { xpos: tagAtChainIndex } = subpath[chainIndex];
      return tags.includes(tagAtChainIndex) ? tags : [...tags, tagAtChainIndex];
    }, [] as PosTag[])
    .sort((tag1, tag2) => (pos[tag2] ?? 0) - (pos[tag1] ?? 0));
  if (tags.length < 2) {
    return subpaths;
  }

  const extendedPath = [...path, ...firstSubpath.slice(0, chainIndex)];
  const features = featurize(tokens, index, {
    path: extendedPath,
    pathTags: tags,
  });
  const predictedTag = predict(weights, features, tags) as PosTag;
  recordTagEvent(() => ({
    type: "chose",
    index,
    tags,
    predicted: predictedTag,
  }));
  tokens[index].isDisambiguated = true;
  trace(
    () =>
      `Prediction for token ${JSON.stringify(tokens[index])}: possible pos ${JSON.stringify(
        tags,
      )}; extended path ${JSON.stringify(
        extendedPath,
      )}; index ${index}; chain index ${chainIndex}; subpaths ${JSON.stringify(
        subpaths,
      )}; features ${JSON.stringify(features)}; prediction ${predictedTag}`,
  );
  return subpaths.filter(
    (subpath) => subpath[chainIndex].xpos === predictedTag,
  );
};

const prune = (state: TaggingState, path: Step[], subpaths: Step[][]) => {
  if (subpaths.length === 1) {
    return subpaths[0];
  }

  const [{ length: chainLength }] = subpaths;
  let filteredSubpaths = subpaths;
  let chainIndex = 0;

  trace(() => `Initial subpaths: ${JSON.stringify(filteredSubpaths)}`);
  while (filteredSubpaths.length > 1 && chainIndex < chainLength) {
    filteredSubpaths = filterSubpaths(
      state,
      path,
      filteredSubpaths,
      chainIndex,
    );
    chainIndex += 1;
  }

  trace(() => `Filtered subpaths: ${JSON.stringify(filteredSubpaths)}`);
  const [bestSubpath] = filteredSubpaths;
  return bestSubpath;
};

const pruningLength = 3;

const greedyPath = (run: TaggingState, chain: number[]) => {
  const state = { ...run, tokens: run.tokens.slice() };
  let chainIndex = 0;
  let path: Step[] = [];
  let subpaths: Step[][] = [[]];
  while (chainIndex < chain.length) {
    let extendedSubpaths = extendSubpaths({
      state,
      chain,
      chainIndex,
      path,
      subpaths,
    });
    if (extendedSubpaths.length === 0) {
      extendedSubpaths = extendSubpaths({
        state,
        chain,
        chainIndex,
        path,
        subpaths,
        flexibleMode: true,
      });
    }

    subpaths = extendedSubpaths;
    chainIndex += 1;
    if (chainIndex % pruningLength === 0 || chainIndex === chain.length) {
      path = [...path, ...prune(state, path, subpaths)];
      if (chainIndex !== chain.length) {
        subpaths = [[]];
      }
    }
  }

  return path;
};

const apply = (path: Step[], tokens: PartiallyParsedToken[]) => {
  path.forEach(({ index, xpos, parentDirection }) => {
    tokens[index].xpos = xpos;
    if (parentDirection) {
      tokens[index].misc.parentDirection = parentDirection;
    }
  });
};

export default function (
  weights: FeatureWeights,
  chain: number[],
  { tokens, stack, heads }: ParseState,
) {
  const path = greedyPath({ weights, tokens, stack, heads }, chain);
  trace(() => `Best path: ${JSON.stringify(path)}`);
  apply(path, tokens);
}

export const ruleRegistry: {
  id: string;
  tag: PosTag;
  vetoes: boolean;
  features: string;
}[] = (
  [
    ["NOUN", nounRules],
    ["VERB", verbRules],
    ["ADJ", adjectiveRules],
    ["ADV", adverbRules],
    ["MARK", markerRules],
    ["INTJ", intjRules],
  ] as [PosTag, Rule[]][]
).flatMap(([tag, rules]) =>
  rules.map(({ id, features }) => ({
    id,
    tag,
    vetoes: features == null,
    features: JSON.stringify(features),
  })),
);
