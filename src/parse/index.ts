import type {
  FeatureWeights,
  ParsedToken,
  ParseState,
  PosTag,
  PartiallyParsedToken,
  Token,
  PosWeights,
  TaggedToken,
} from "../types.js";
import { trace } from "../trace.js";
import tagChain from "../tag/index.js";
import {
  findNegatedVerb,
  hasAppositivePunctuation,
  hasChildWithMatcher,
  isCapitalizedWord,
  isDelimiter,
  isFollowedByClause,
  isGerund,
  isNegator,
  isSubjectPronoun,
  isSubstantiveNoun,
  isTerminator,
  isTimeModifier,
  negatesVerbGroup,
  takesObjectComplement,
  translativeDegree,
  verbsAreCompatible,
} from "../grammar/index.js";
import { cannotBeSubjectWhenParsing } from "../grammar/divergent.js";

const maxConjunctParentDistance = 16;
const rootTagsOrdered = ["VERB", "NOUN", "ADJ", "ADV"];
const punctSideFinRegExp = /^[\p{Pf}\p{Pe}]$/u;
const pairs = {
  '"': '"',
  "'": "'",
  "«": "»",
  "»": "«",
  "‘": "’",
  "’": "‘",
  "‚": "’",
  "‛": "’",
  "“": "”",
  "”": "“",
  "„": "”",
  "‟": "”",
  "‹": "›",
  "›": "‹",
  "⹂": "”",
  "〝": "〞",
  "〞": "〝",
  "〟": "〝",
  "﹁": "﹂",
  "﹂": "﹁",
  "﹃": "﹄",
  "﹄": "﹃",
  "＂": "＂",
  "＇": "＇",

  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "༺": "༻",
  "༻": "༺",
  "༼": "༽",
  "༽": "༼",
  "᚛": "᚜",
  "᚜": "᚛",
  "⁅": "⁆",
  "⁆": "⁅",
  "⁽": "⁾",
  "⁾": "⁽",
  "₍": "₎",
  "₎": "₍",
  "⌈": "⌉",
  "⌉": "⌈",
  "⌊": "⌋",
  "⌋": "⌊",
  "〈": "〉",
  "〉": "〈",
  "❨": "❩",
  "❩": "❨",
  "❪": "❫",
  "❫": "❪",
  "❬": "❭",
  "❭": "❬",
  "❮": "❯",
  "❯": "❮",
  "❰": "❱",
  "❱": "❰",
  "❲": "❳",
  "❳": "❲",
  "❴": "❵",
  "❵": "❴",
  "⟅": "⟆",
  "⟆": "⟅",
  "⟦": "⟧",
  "⟧": "⟦",
  "⟨": "⟩",
  "⟩": "⟨",
  "⟪": "⟫",
  "⟫": "⟪",
  "⟬": "⟭",
  "⟭": "⟬",
  "⟮": "⟯",
  "⟯": "⟮",
  "⦃": "⦄",
  "⦄": "⦃",
  "⦅": "⦆",
  "⦆": "⦅",
  "⦇": "⦈",
  "⦈": "⦇",
  "⦉": "⦊",
  "⦊": "⦉",
  "⦋": "⦌",
  "⦌": "⦋",
  "⦍": "⦐",
  "⦎": "⦏",
  "⦏": "⦎",
  "⦐": "⦍",
  "⦑": "⦒",
  "⦒": "⦑",
  "⦓": "⦔",
  "⦔": "⦓",
  "⦕": "⦖",
  "⦖": "⦕",
  "⦗": "⦘",
  "⦘": "⦗",
  "⧘": "⧙",
  "⧙": "⧘",
  "⧚": "⧛",
  "⧛": "⧚",
  "⧼": "⧽",
  "⧽": "⧼",
  "⸢": "⸣",
  "⸣": "⸢",
  "⸤": "⸥",
  "⸥": "⸤",
  "⸦": "⸧",
  "⸧": "⸦",
  "⸨": "⸩",
  "⸩": "⸨",
  "〈": "〉",
  "〉": "〈",
  "《": "》",
  "》": "《",
  "「": "」",
  "」": "「",
  "『": "』",
  "』": "『",
  "【": "】",
  "】": "【",
  "〔": "〕",
  "〕": "〔",
  "〖": "〗",
  "〗": "〖",
  "〘": "〙",
  "〙": "〘",
  "〚": "〛",
  "〛": "〚",
  "﹙": "﹚",
  "﹚": "﹙",
  "﹛": "﹜",
  "﹜": "﹛",
  "﹝": "﹞",
  "﹞": "﹝",
  "（": "）",
  "）": "（",
  "［": "］",
  "］": "［",
  "｛": "｝",
  "｝": "｛",
  "｟": "｠",
  "｠": "｟",
  "｢": "｣",
  "｣": "｢",
} as {
  [leftPair: string]: string;
};

type OracleArgs = {
  heads: number[];
  stack: number[];
  tokens: PartiallyParsedToken[];
  index: number;
};

const endToken = {
  xpos: "END",
  feats: {},
  misc: {},
} as PartiallyParsedToken;

const startToken = {
  xpos: "START",
  feats: {},
  misc: {},
} as PartiallyParsedToken;

const tokenAfter = (tokens: PartiallyParsedToken[], index: number) =>
  index + 1 < tokens.length ? tokens[index + 1] : endToken;

type Inheritance = {
  heads: number[];
  tokens: PartiallyParsedToken[];
  head: number;
  child: number;
  grandchild: number;
};

const isUnbrokenNounPhrase = (
  tokens: PartiallyParsedToken[],
  child: number,
  head: number,
) =>
  child < head &&
  tokens
    .slice(child, head)
    .every(({ xpos = "" }) => ["ADJ", "NOUN"].includes(xpos));

const grandchildCanJoinTheNounPhrase = (
  {
    xpos: grandchildTag,
    feats: { AdpType: grandchildAdpType },
  }: PartiallyParsedToken,
  childTag: string,
) =>
  grandchildTag === "NOUN" ||
  grandchildTag === "PUNCT" ||
  ((grandchildTag === "ADJ" || grandchildTag === "ADV") &&
    childTag === "NOUN") ||
  (grandchildTag === "MARK" && grandchildAdpType === "Post");

const isNounArgument = ({ tokens, head, child, grandchild }: Inheritance) => {
  const { xpos: headTag } = tokens[head];
  const { xpos: childTag = "" } = tokens[child];
  const {
    feats: { NumType: grandchildNumType },
  } = tokens[grandchild];
  return (
    isUnbrokenNounPhrase(tokens, child, head) &&
    headTag === "NOUN" &&
    ["NOUN", "ADJ"].includes(childTag) &&
    grandchildCanJoinTheNounPhrase(tokens[grandchild], childTag) &&
    !(childTag === "NOUN" && grandchildNumType)
  );
};

const isAdverb = ({ tokens, head, child, grandchild }: Inheritance) => {
  const { xpos: headTag } = tokens[head];
  const { xpos: childTag } = tokens[child];
  const { xpos: grandchildTag } = tokens[grandchild];
  return (
    (headTag === "ADJ" || headTag === "ADV") &&
    childTag === "ADV" &&
    grandchildTag === "PUNCT"
  );
};

const hasMatchingDelimiter = ({
  heads,
  tokens,
  child,
  grandchild,
}: Inheritance) =>
  heads.some(
    (otherHead, otherGrandchild) =>
      otherGrandchild > grandchild &&
      otherHead === child &&
      ((tokens[grandchild].feats.PunctType === "Comm" &&
        tokens[otherGrandchild].feats.PunctType === "Comm") ||
        pairs[tokens[grandchild].form] === tokens[otherGrandchild].form),
  );

const isStartingDelimiter = (inheritance: Inheritance) => {
  const { tokens, head, child, grandchild } = inheritance;
  return (
    isDelimiter(tokens[grandchild]) &&
    !punctSideFinRegExp.test(tokens[grandchild].form) &&
    grandchild < head &&
    grandchild < child &&
    !hasMatchingDelimiter(inheritance)
  );
};

const canInherit = (inheritance: Inheritance) =>
  isNounArgument(inheritance) ||
  isAdverb(inheritance) ||
  isStartingDelimiter(inheritance);

const isAncestor = (heads: number[], child: number, ancestor: number) => {
  let currentAncestor = heads[child];
  while (currentAncestor >= 0 && currentAncestor !== ancestor) {
    currentAncestor = heads[currentAncestor];
  }

  return currentAncestor === ancestor;
};

const addToParse = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  head: number,
  child: number,
) => {
  const currentHead = heads[child];
  heads.forEach((index, grandchild) => {
    if (
      index === child &&
      canInherit({ heads, tokens, head, child, grandchild })
    ) {
      heads[grandchild] = head;
    }
  });

  if (currentHead !== -2) {
    heads[head] = currentHead;
  }

  if (head !== child && !isAncestor(heads, head, child)) {
    heads[child] = head;
  }
};

type Transition = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  stack: number[],
) => void;

const leftArc =
  (childOffset: number) =>
  (heads: number[], tokens: PartiallyParsedToken[], stack: number[]) => {
    const head = stack[stack.length - 1];
    const childIndex = stack.length - childOffset - 1;
    trace(() => `L-arc from ${head} to ${stack[childIndex]}`);
    stack.splice(childIndex, childOffset).forEach((index, i) => {
      if (heads[index] === -2 || i === 0) {
        addToParse(heads, tokens, head, index);
      }
    });
  };

const rightArc =
  (headOffset: number, { pop = false }) =>
  (heads: number[], tokens: PartiallyParsedToken[], stack: number[]) => {
    const headIndex = stack.length - headOffset - 1;
    const head = stack[headIndex];
    trace(() => `R-arc from ${head} to ${stack[stack.length - 1]}`);
    stack
      .splice(headIndex + 1, headOffset - 1 + (pop ? 1 : 0))
      .forEach((index) => {
        if (heads[index] === -2) {
          trace(() => `Adding long-right-arc child ${index} to ${head}`);
          addToParse(heads, tokens, head, index);
        }
      });
    if (!pop) {
      addToParse(heads, tokens, head, stack[stack.length - 1]);
    }
  };

const assignHead =
  (head: number) =>
  (heads: number[], tokens: PartiallyParsedToken[], stack: number[]) => {
    trace(() => `Assign head ${head} to ${stack[stack.length - 1]}`);
    addToParse(heads, tokens, head, stack[stack.length - 1]);
  };

const reduce = (
  _heads: number[],
  _tokens: PartiallyParsedToken[],
  stack: number[],
) => {
  trace(() => `Reduce ${stack[stack.length - 1]}`);
  stack.pop();
};

const canBeRelativePronoun = ({
  xpos,
  feats: { Case, Poss, PronType },
}: PartiallyParsedToken) =>
  xpos === "NOUN" &&
  ((PronType && ["Ind", "Tot", "Neg"].includes(PronType)) ||
    (PronType === "Prs" && (Poss || Case === "Nom")));

const childrenOf =
  (id: number) => (heads: number[], head: number, index: number) => {
    if (head === id) {
      heads.push(index);
    }

    return heads;
  };

const hasCommaBetween = (
  tokens: PartiallyParsedToken[],
  first: number,
  second: number,
) => {
  const [start, end] = first < second ? [first, second] : [second, first];
  for (let index = start + 1; index < end; index += 1) {
    if (tokens[index].feats.PunctType === "Comm") {
      return true;
    }
  }

  return false;
};

const isMatchingDelimiterRoot = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  candidateRoot: number,
  closingMarker: number,
) => {
  if (tokens[closingMarker] == null) {
    return false;
  }

  const { form: closingMarkerWord } = tokens[closingMarker];
  const closingMarkerIsTerminator = isTerminator(tokens[closingMarker]);
  const children = heads.reduce(childrenOf(candidateRoot), []);
  if (children.includes(closingMarker)) {
    return false;
  }

  return children.some((openingMarker) => {
    const {
      form,
      feats: { PunctType },
    } = tokens[openingMarker];
    return (
      openingMarker < closingMarker &&
      ((PunctType === "Comm" && closingMarkerIsTerminator) ||
        (PunctType != null &&
          ["Quot", "Brck"].includes(PunctType) &&
          pairs[form] === closingMarkerWord))
    );
  });
};

const findDelimitedClauseRootOffset = ({
  heads,
  tokens,
  stack,
}: OracleArgs) => {
  const currentItem = stack[stack.length - 1];
  const {
    feats: { PunctType },
  } = tokens[currentItem];
  return stack
    .slice()
    .reverse()
    .findIndex((index, offset) => {
      if (offset === 0) {
        return false;
      }

      if (PunctType === "Peri") {
        return heads[index] === -2;
      }

      return (
        !(PunctType === "Comm" && tokens[index].feats.ConjType === "Coor") &&
        isMatchingDelimiterRoot(heads, tokens, index, stack[stack.length - 1])
      );
    });
};

const hasNonDashPunctuationChild = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  index: number,
) =>
  hasChildWithMatcher(
    heads,
    tokens,
    index,
    ({ feats: { PunctType } }) => PunctType != null && PunctType !== "Dash",
  );

const findClauseLimit = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  reverseStack: number[],
  isSentenceEnd: boolean,
) =>
  reverseStack.findIndex((index, offset) => {
    if (offset === 0) {
      return false;
    }

    const {
      xpos,
      feats: { ConjType },
    } = tokens[index];
    const head = heads[index];
    return (
      (xpos === "MARK" && ConjType && head === -2) ||
      (xpos === "VERB" && head === -2) ||
      (hasNonDashPunctuationChild(heads, tokens, index) &&
        !hasAppositivePunctuation(heads, tokens, index, isSentenceEnd))
    );
  });

const isDelimitedClause = (
  tokens: PartiallyParsedToken[],
  reverseStack: number[],
  searchLimit: number,
) =>
  searchLimit !== -1 &&
  ["VERB", "MARK"].includes(tokens[reverseStack[searchLimit]].xpos ?? "X");

const isNonDelimitedPastVerb = (
  tokens: PartiallyParsedToken[],
  verb: number,
  index: number,
  isSentenceEnd: boolean,
) => {
  const {
    feats: { Tense, VerbForm },
  } = tokens[verb];
  return (
    Tense === "Past" &&
    VerbForm !== "Fin" &&
    !isSentenceEnd &&
    !["PUNCT", "VERB", "NOUN"].includes(tokens[index + 1].xpos ?? "X")
  );
};

type SubjectSearch = {
  heads: number[];
  tokens: PartiallyParsedToken[];
  reverseStack: number[];
  verb: number;
  isDelimited: boolean;
  verbIsNonDelimitedPast: boolean;
};

const isNominalCandidate = (
  tokens: PartiallyParsedToken[],
  subject: number,
  offset: number,
) => {
  const { xpos } = tokens[subject];
  return (
    xpos === "NOUN" ||
    (xpos === "VERB" && isGerund(tokens[subject]) && offset > 0)
  );
};

const isObjectOfALaterVerb = (
  { tokens, reverseStack }: SubjectSearch,
  subject: number,
  offset: number,
) =>
  tokens[subject].feats.Case === "Acc" &&
  reverseStack.slice(offset).some((index) => tokens[index].xpos === "VERB");

const isEligibleSubject = (
  search: SubjectSearch,
  subject: number,
  offset: number,
) => {
  const { heads, tokens, verb, verbIsNonDelimitedPast } = search;
  const {
    xpos: subjectTag,
    feats: { PronType },
  } = tokens[subject];
  const isBareNounUnderAPastParticiple =
    verbIsNonDelimitedPast && subjectTag === "NOUN" && !PronType;
  return (
    isNominalCandidate(tokens, subject, offset) &&
    !isAncestor(heads, verb, subject) &&
    !cannotBeSubjectWhenParsing(tokens, subject, verb) &&
    !isBareNounUnderAPastParticiple &&
    !isObjectOfALaterVerb(search, subject, offset)
  );
};

const subjectHeadAllowsAttachment = (
  { heads, tokens, isDelimited }: SubjectSearch,
  subject: number,
) => {
  const head = heads[subject];
  if (head === -2) {
    return true;
  }

  const {
    xpos: subjectHeadTag,
    feats: { AdpType: subjectAdpType, ConjType: subjectConjType },
  } = tokens[head];
  const headIsASubordinator =
    subjectHeadTag !== "MARK" ||
    (!subjectAdpType && subjectConjType === "Sub") ||
    Boolean(
      subjectConjType &&
        heads[head] !== -2 &&
        tokens[heads[head]].xpos === "VERB",
    );
  return !isGerund(tokens[head]) && isDelimited && headIsASubordinator;
};

const findSubjectOffset = ({ heads, tokens, stack, index }: OracleArgs) => {
  const verb = stack[stack.length - 1];
  if (heads[verb] !== -2 || hasNonDashPunctuationChild(heads, tokens, verb)) {
    return -1;
  }

  const isSentenceEnd = index === tokens.length - 1;
  const reverseStack = stack.slice().reverse();
  const searchLimit = findClauseLimit(
    heads,
    tokens,
    reverseStack,
    isSentenceEnd,
  );
  const search: SubjectSearch = {
    heads,
    tokens,
    reverseStack,
    verb,
    isDelimited: isDelimitedClause(tokens, reverseStack, searchLimit),
    verbIsNonDelimitedPast: isNonDelimitedPastVerb(
      tokens,
      verb,
      index,
      isSentenceEnd,
    ),
  };
  const searchEnd = searchLimit === -1 ? reverseStack.length : searchLimit + 1;
  return reverseStack
    .slice(0, searchEnd)
    .findIndex(
      (subject, offset) =>
        isEligibleSubject(search, subject, offset) &&
        subjectHeadAllowsAttachment(search, subject),
    );
};

const punctuationStep = (args: OracleArgs) => {
  const delimitedClauseRootOffset = findDelimitedClauseRootOffset(args);
  if (delimitedClauseRootOffset !== -1) {
    return rightArc(delimitedClauseRootOffset, { pop: true });
  }

  return null;
};

const findLeftModifierHead = (
  tokens: PartiallyParsedToken[],
  stack: number[],
) => {
  const reverseStack = stack.slice().reverse();
  const verbIndex = reverseStack.findIndex(
    (index, offset) => offset !== 0 && tokens[index].xpos === "VERB",
  );
  if (verbIndex !== -1) {
    return verbIndex;
  }

  return reverseStack.findIndex(
    (index, offset) =>
      offset !== 0 &&
      ["NOUN", "ADJ", "ADV"].includes(tokens[index].xpos ?? "X"),
  );
};

const negatorModifiesTheMarkerAhead = (
  { tokens, stack }: OracleArgs,
  nextTag?: string,
) => {
  const currentIndex = stack[stack.length - 1];
  return (
    nextTag === "MARK" &&
    isNegator(tokens[currentIndex]) &&
    !negatesVerbGroup(tokens, currentIndex)
  );
};

const adverbIsPartOfWhatFollows = (
  args: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const { heads, tokens, stack } = args;
  const currentIndex = stack[stack.length - 1];
  const {
    xpos: nextTag,
    feats: { PronType: nextPronType },
  } = nextToken;
  return (
    nextTag === "ADV" ||
    (nextTag === "ADJ" && !nextPronType) ||
    isMatchingDelimiterRoot(heads, tokens, currentIndex, currentIndex + 1) ||
    negatorModifiesTheMarkerAhead(args, nextTag)
  );
};

const adverbModifiesTheVerbBefore = (
  { tokens, stack }: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const currentIndex = stack[stack.length - 1];
  const {
    xpos: nextTag,
    misc: { pos: nextPosTags = {} },
  } = nextToken;
  const negatorAwaitsPredicate =
    isNegator(tokens[currentIndex]) &&
    negatesVerbGroup(tokens, currentIndex) &&
    nextTag != null &&
    ["ADJ", "NOUN"].includes(nextTag);
  const nothingOnTheRightCanHeadIt =
    Boolean(nextTag && nextTag !== "VERB") ||
    !Object.keys(nextPosTags).some((tag) =>
      ["VERB", "ADJ", "ADV"].includes(tag),
    );
  return !negatorAwaitsPredicate && nothingOnTheRightCanHeadIt;
};

const adverbModifiesTheModifierBefore = ({
  heads,
  tokens,
  stack,
}: OracleArgs) => {
  const lastIndex = stack[stack.length - 2];
  const {
    xpos: lastTag = "START",
    feats: { PronType: lastPronType },
  } = tokens[lastIndex];
  const lastIsLeftHeaded = heads[lastIndex - 1] < lastIndex - 1;
  return ["ADJ", "ADV"].includes(lastTag) && lastIsLeftHeaded && !lastPronType;
};

const adverbCompletesTheMarkerBefore = (
  { heads, tokens, stack }: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const lastIndex = stack[stack.length - 2];
  const {
    feats: { ConjType: lastConjType },
  } = tokens[lastIndex];
  const { xpos: nextTag } = nextToken;
  const markerAlreadyHasObject = hasChildWithMatcher(
    heads,
    tokens,
    lastIndex,
    ({ xpos }) => xpos === "NOUN",
  );
  const { xpos: markerHeadTag } =
    heads[lastIndex] < 0 ? startToken : tokens[heads[lastIndex]];
  return (
    !markerAlreadyHasObject &&
    ((nextTag != null && ["PUNCT", "END", "MARK"].includes(nextTag)) ||
      Boolean(lastConjType && markerHeadTag === "ADV"))
  );
};

const adverbAttachesToTheLeft = (
  args: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const { tokens, stack } = args;
  const { xpos: lastTag = "START" } = tokens[stack[stack.length - 2]];
  return (
    (lastTag === "VERB" && adverbModifiesTheVerbBefore(args, nextToken)) ||
    adverbModifiesTheModifierBefore(args) ||
    (lastTag === "MARK" && adverbCompletesTheMarkerBefore(args, nextToken))
  );
};

const adverbEndsItsPhrase = (
  { heads, tokens, stack }: OracleArgs,
  nextTag?: string,
) => {
  const currentIndex = stack[stack.length - 1];
  return (
    (nextTag != null && ["END", "MARK"].includes(nextTag)) ||
    (nextTag === "PUNCT" &&
      !hasAppositivePunctuation(heads, tokens, currentIndex))
  );
};

const advStep = (args: OracleArgs) => {
  const { tokens, stack } = args;
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const { xpos: lastTag = "START" } = tokens[lastIndex];
  const nextToken = tokenAfter(tokens, currentIndex);
  if (lastTag === "ADV") {
    return findNegatedVerb(tokens, lastIndex) === -1 ? leftArc(1) : null;
  }

  if (adverbIsPartOfWhatFollows(args, nextToken)) {
    return null;
  }

  if (adverbAttachesToTheLeft(args, nextToken)) {
    return rightArc(1, { pop: true });
  }

  if (!adverbEndsItsPhrase(args, nextToken.xpos)) {
    return null;
  }

  const headIndex = findLeftModifierHead(tokens, stack);
  return headIndex === -1 ? null : rightArc(headIndex, { pop: true });
};

const isModifiablePronoun = ({ feats: { PronType } }: PartiallyParsedToken) =>
  PronType != null && ["Ind", "Tot", "Neg"].includes(PronType);

const isNegatedQuantifier = (
  tokens: PartiallyParsedToken[],
  stack: number[],
) => {
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  return (
    lastIndex === currentIndex - 1 &&
    isModifiablePronoun(tokens[currentIndex]) &&
    isNegator(tokens[lastIndex]) &&
    !negatesVerbGroup(tokens, lastIndex)
  );
};

const findObjectComplementVerbOffset = (
  tokens: PartiallyParsedToken[],
  stack: number[],
) => {
  const reverseStack = stack.slice().reverse();
  const offset = reverseStack.findIndex(
    (index, indexInStack) => indexInStack > 0 && tokens[index].xpos === "VERB",
  );
  if (
    offset < 2 ||
    !takesObjectComplement(tokens[reverseStack[offset]].lemma) ||
    !reverseStack
      .slice(1, offset)
      .every((index) => ["NOUN", "ADJ"].includes(tokens[index].xpos ?? "X"))
  ) {
    return -1;
  }

  return offset;
};

const isCoordinatedModifier = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  markerIndex: number,
) => {
  const {
    xpos,
    feats: { ConjType },
  } = tokens[markerIndex];
  const head = heads[markerIndex];
  return (
    xpos === "MARK" &&
    ConjType === "Coor" &&
    head >= 0 &&
    tokens[head].xpos === "ADJ"
  );
};

const adjectiveJoinsACoordination = ({ heads, tokens, stack }: OracleArgs) => {
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  return (
    heads[currentIndex] === -2 &&
    isCoordinatedModifier(heads, tokens, lastIndex)
  );
};

const adjectiveModifiesWhatFollows = (
  { heads, tokens, stack }: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const currentIndex = stack[stack.length - 1];
  const lastStackToken = tokens[stack[stack.length - 2]];
  const {
    xpos: nextTag,
    feats: { PronType: nextPronType },
    misc: { pos: nextPosTags = {} },
  } = nextToken;
  const modifiesAnUntaggedNoun =
    !nextTag &&
    Boolean(nextPosTags.NOUN) &&
    !nextPronType &&
    !isModifiablePronoun(lastStackToken);
  return (
    heads[currentIndex] !== -2 ||
    nextTag === "NOUN" ||
    modifiesAnUntaggedNoun ||
    isMatchingDelimiterRoot(heads, tokens, currentIndex, currentIndex + 1)
  );
};

const findAdjectiveComplementVerbOffset = (
  { tokens, stack }: OracleArgs,
  isBeforeABoundary: boolean,
) => {
  const { xpos: lastTag } = tokens[stack[stack.length - 2]];
  return lastTag === "NOUN" && isBeforeABoundary
    ? findObjectComplementVerbOffset(tokens, stack)
    : -1;
};

const adjectiveIsPredicateOfNounBefore = (
  { heads, tokens, stack, index }: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const currentIndex = stack[stack.length - 1];
  const lastStackToken = tokens[stack[stack.length - 2]];
  const { xpos: nextTag } = nextToken;
  return (
    isModifiablePronoun(lastStackToken) ||
    (nextTag != null && ["PUNCT", "END"].includes(nextTag)) ||
    hasAppositivePunctuation(
      heads,
      tokens,
      currentIndex,
      index === tokens.length - 1,
    )
  );
};

const adjectiveIsPredicateOfVerbBefore = ({
  xpos: nextTag,
  feats: { PronType: nextPronType },
}: PartiallyParsedToken) =>
  (nextTag != null &&
    ["VERB", "ADV", "MARK", "PUNCT", "END"].includes(nextTag)) ||
  (nextTag === "ADJ" && Boolean(nextPronType)) ||
  nextPronType === "Rel";

const adjectiveIsObjectOfMarkerBefore = (nextToken: PartiallyParsedToken) => {
  const { xpos: nextTag } = nextToken;
  return (
    (nextTag != null && ["MARK", "END"].includes(nextTag)) ||
    isTerminator(nextToken)
  );
};

const adjectiveAttachesToTheLeft = (
  args: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const { tokens, stack } = args;
  const { xpos: lastTag } = tokens[stack[stack.length - 2]];
  return (
    (lastTag === "NOUN" && adjectiveIsPredicateOfNounBefore(args, nextToken)) ||
    (lastTag === "VERB" && adjectiveIsPredicateOfVerbBefore(nextToken)) ||
    (lastTag === "MARK" && adjectiveIsObjectOfMarkerBefore(nextToken))
  );
};

const popsAfterAttaching = ({
  xpos: nextTag,
  misc: { pos: nextPosTags = {} },
}: PartiallyParsedToken) => nextTag !== "MARK" && !nextPosTags.ADV;

const adjectiveStep = (args: OracleArgs) => {
  const { tokens, stack, index } = args;
  const { xpos: lastTag } = tokens[stack[stack.length - 2]];
  const nextToken = tokenAfter(tokens, index);
  const { xpos: nextTag } = nextToken;
  if (lastTag === "ADV") {
    return leftArc(1);
  }

  if (adjectiveJoinsACoordination(args)) {
    return rightArc(1, { pop: true });
  }

  if (adjectiveModifiesWhatFollows(args, nextToken)) {
    return null;
  }

  const isBeforeABoundary =
    nextTag != null && ["PUNCT", "END"].includes(nextTag);
  const complementVerbOffset = findAdjectiveComplementVerbOffset(
    args,
    isBeforeABoundary,
  );
  if (complementVerbOffset !== -1) {
    return rightArc(complementVerbOffset, { pop: true });
  }

  if (adjectiveAttachesToTheLeft(args, nextToken)) {
    return rightArc(1, { pop: popsAfterAttaching(nextToken) });
  }

  if (!isBeforeABoundary) {
    return null;
  }

  const headIndex = findLeftModifierHead(tokens, stack);
  return headIndex === -1 ? null : rightArc(headIndex, { pop: true });
};

const findLeftVerbModifierOffset = (
  heads: number[],
  stack: number[],
  tokens: PartiallyParsedToken[],
  currentIndex: number,
) => {
  const head = heads[currentIndex];
  const reverseStack = stack.slice().reverse();
  const searchLimit = reverseStack.findIndex(
    (index, offset) =>
      offset !== 0 &&
      ((head >= 0 && index <= head) ||
        (tokens[index].xpos === "VERB" &&
          !hasAppositivePunctuation(heads, tokens, index))),
  );
  const searchEnd = searchLimit === -1 ? reverseStack.length : searchLimit;
  return reverseStack.slice(0, searchEnd).findIndex((index, offset) => {
    if (
      offset === 0 ||
      heads[index] !== -2 ||
      isAncestor(heads, currentIndex, index)
    ) {
      return false;
    }

    const { xpos } = tokens[index];
    return (
      ["MARK", "ADV"].includes(xpos ?? "X") ||
      (hasAppositivePunctuation(heads, tokens, index) && xpos === "ADJ")
    );
  });
};

const belongToTheSameClause = (
  tokens: PartiallyParsedToken[],
  heads: number[],
  start: number,
  end: number,
) => {
  const separatingTokens = tokens.slice(start + 1, end);
  const delimiters = separatingTokens.reduce(
    (delimiters, token) =>
      isDelimiter(token) ? [...delimiters, token] : delimiters,
    [] as PartiallyParsedToken[],
  );
  if (delimiters.length % 2 === 0) {
    return true;
  }

  if (delimiters.length === 1) {
    const [{ form: endingDelimiterWord }] = delimiters;
    return hasChildWithMatcher(
      heads,
      tokens,
      start,
      (token, index) =>
        isDelimiter(token) &&
        index < start &&
        pairs[token.form] === endingDelimiterWord,
    );
  }

  return false;
};

const findIndexAfterPreposition = (
  tokens: PartiallyParsedToken[],
  from: number,
) => {
  let currentIndex = from;
  while (currentIndex < tokens.length) {
    const {
      xpos,
      feats: { AdpType },
      misc: { pos = {} },
    } = tokens[currentIndex];
    if ((xpos === "MARK" || pos.MARK) && AdpType) {
      return currentIndex + 1;
    }

    if (xpos !== "ADV") {
      return -1;
    }

    currentIndex += 1;
  }

  return -1;
};

const hasVerbFrom = (tokens: PartiallyParsedToken[], from: number) => {
  let currentIndex = from;
  while (currentIndex < tokens.length) {
    const {
      xpos,
      misc: { pos = {} },
    } = tokens[currentIndex];
    if (xpos === "VERB" || pos.VERB) {
      return true;
    }

    currentIndex += 1;
  }

  return false;
};

const canBeUnmarkedPastRelative = (
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  if (tokens[index].feats.Tense !== "Past") {
    return false;
  }

  const afterPreposition = findIndexAfterPreposition(tokens, index + 1);
  return afterPreposition !== -1 && hasVerbFrom(tokens, afterPreposition);
};

const findVerbAfterUnmarkedRelative = (
  stack: number[],
  tokens: PartiallyParsedToken[],
  heads: number[],
) => {
  if (stack.length < 3) {
    return { subject: -2, relativeVerb: -2 };
  }

  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const secondLastIndex = stack[stack.length - 3];
  const head = heads[currentIndex];
  const lastHead = heads[lastIndex];
  const secondLastHead = heads[secondLastIndex];
  const {
    xpos: lastTag,
    feats: { Tense: lastTense, VerbForm: lastVerbForm },
  } = tokens[lastIndex];
  const { xpos: secondLastTag } = tokens[secondLastIndex];
  const lastWordHasMarkedObject = heads
    .reduce(childrenOf(lastIndex), [])
    .some((child) => tokens[child].xpos === "MARK");
  if (
    secondLastHead === -2 &&
    lastHead === -2 &&
    head === -2 &&
    secondLastTag === "NOUN" &&
    lastTag === "VERB" &&
    (lastTense === "Past" || lastVerbForm === "Part") &&
    lastWordHasMarkedObject
  ) {
    return { subject: secondLastIndex, relativeVerb: lastIndex };
  }

  return { subject: -2, relativeVerb: -2 };
};

const lastNounIsAlreadyRelative = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  stack: number[],
) => {
  if (stack.length < 3) {
    return false;
  }

  const lastStackItem = stack[stack.length - 2];
  const {
    feats: { PronType: lastStackItemPronType },
  } = tokens[lastStackItem];
  const secondLastStackItem = stack[stack.length - 3];
  const {
    xpos: secondLastTag,
    feats: { PronType: secondLastPronType },
  } = tokens[secondLastStackItem];
  return (
    (secondLastTag === "MARK" && secondLastPronType) ||
    (secondLastTag === "NOUN" &&
      (hasChildWithMatcher(
        heads,
        tokens,
        lastStackItem,
        ({ xpos, feats: { PronType } }) => xpos === "ADJ" && PronType != null,
      ) ||
        lastStackItemPronType))
  );
};

const lastVerbIsForcedHead = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  stack: number[],
) => {
  if (stack.length < 3) {
    return false;
  }

  let indexInStack = stack.length - 3;
  while (indexInStack >= 0) {
    const index = stack[indexInStack];
    const { xpos } = tokens[index];
    const head = heads[index];
    if (xpos === "VERB" && head === -2) {
      return true;
    }

    indexInStack -= 1;
  }

  return false;
};

const isNonFinitePastForm = ({
  feats: { Tense, VerbForm },
}: PartiallyParsedToken) =>
  (Tense === "Past" && VerbForm !== "Fin") || VerbForm === "Part";

const isReducedRelativeVerb = (
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  const token = tokens[index];
  const {
    xpos,
    misc: { pos = {} },
  } = token;
  const {
    xpos: aftTag,
    misc: { pos: aftPos = {} },
  } = tokenAfter(tokens, index);
  const isFollowedByAMarker =
    ["MARK", "PUNCT", "END"].includes(aftTag ?? "X") || Boolean(aftPos.MARK);
  return (
    (xpos === "VERB" || Boolean(pos.VERB)) &&
    isNonFinitePastForm(token) &&
    isFollowedByAMarker
  );
};

const isUnmarkedRelativeSubject = (
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  let currentIndex = index + 1;
  while (currentIndex < tokens.length) {
    if (tokens[currentIndex].xpos !== "ADV") {
      return isReducedRelativeVerb(tokens, currentIndex);
    }

    currentIndex += 1;
  }

  return false;
};

const verbIsFollowedByChildVerb = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  let currentIndex = index + 1;
  while (currentIndex < tokens.length) {
    const {
      xpos,
      misc: { pos = {} },
    } = tokens[currentIndex];
    if (xpos === "ADV") {
      currentIndex += 1;
    } else if (xpos === "MARK") {
      return false;
    } else if (
      (xpos === "VERB" || pos.VERB) &&
      verbsAreCompatible(tokens, heads, index, currentIndex)
    ) {
      return true;
    } else {
      return false;
    }
  }

  return false;
};

const isPartOfAComplexTense = (
  tokens: PartiallyParsedToken[],
  auxiliary: number,
  rootIndex: number,
) => {
  const {
    lemma: auxiliaryLemma,
    feats: { Tense: auxiliaryTense, VerbForm: auxiliaryVerbForm },
  } = tokens[auxiliary];
  const {
    feats: { Tense, VerbForm },
  } = tokens[rootIndex];
  const isPerfect = auxiliaryTense === "Past" && Tense === "Past";
  const isProgressive =
    auxiliaryTense === "Pres" &&
    auxiliaryVerbForm === "Fin" &&
    Tense === "Pres" &&
    VerbForm === "Part";
  return (
    ["be", "have"].includes(auxiliaryLemma ?? "") &&
    (isPerfect || isProgressive)
  );
};

const closesTheRelativeClause = ({
  xpos,
  feats: { PronType },
  misc: { pos },
}: PartiallyParsedToken) =>
  ["PUNCT", "NOUN"].includes(xpos ?? "X") ||
  Boolean(PronType) ||
  (xpos == null && Boolean(pos.NOUN) && !pos.MARK);

const opensTheRelativeClause = ({
  xpos,
  misc: { pos },
}: PartiallyParsedToken) =>
  ["VERB", "MARK"].includes(xpos ?? "X") || (xpos == null && Boolean(pos.MARK));

const relativeClauseContinues = (
  tokens: PartiallyParsedToken[],
  from: number,
) => {
  let currentIndex = from;
  while (currentIndex < tokens.length) {
    const token = tokens[currentIndex];
    if (closesTheRelativeClause(token)) {
      return false;
    }

    if (opensTheRelativeClause(token)) {
      return true;
    }

    currentIndex += 1;
  }

  return false;
};

const relativeVerbNeedsItsOwnSubject = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  stack: number[],
  rootIndex: number,
) => {
  const hasMarkerArgument = hasChildWithMatcher(
    heads,
    tokens,
    rootIndex,
    (token, index) => token.xpos === "MARK" && index > rootIndex,
  );
  if (hasMarkerArgument) {
    return false;
  }

  const stackWithoutNounHead = stack.filter(
    (_item, index) => index !== stack.length - 2,
  );
  const subjectOffset = findSubjectOffset({
    heads,
    stack: stackWithoutNounHead,
    tokens,
    index: rootIndex,
  });
  return (
    subjectOffset !== -1 || verbIsFollowedByChildVerb(heads, tokens, rootIndex)
  );
};

const isUnmarkedRelativeRoot = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  stack: number[],
  rootIndex: number,
) => {
  const rootToken = tokens[rootIndex];
  if (stack.length < 3 || !isNonFinitePastForm(rootToken)) {
    return false;
  }

  const lastStackItem = stack[stack.length - 2];
  const {
    xpos: lastStackTag,
    feats: { PronType: lastStackPronType },
  } = tokens[lastStackItem];
  if (lastStackTag !== "NOUN" || lastStackPronType != null) {
    return false;
  }

  if (
    isPartOfAComplexTense(tokens, stack[stack.length - 3], rootIndex) ||
    !belongToTheSameClause(tokens, heads, lastStackItem, rootIndex) ||
    relativeVerbNeedsItsOwnSubject(heads, tokens, stack, rootIndex)
  ) {
    return false;
  }

  return (
    rootToken.feats.VerbForm === "Part" ||
    relativeClauseContinues(tokens, rootIndex + 1)
  );
};

const isObjectOfAPrecedingPreposition = ({
  heads,
  tokens,
  stack,
}: OracleArgs) => {
  if (stack.length <= 2) {
    return false;
  }

  const lastIndex = stack[stack.length - 2];
  const secondLastIndex = stack[stack.length - 3];
  const lastHead = heads[lastIndex];
  if (
    tokens[lastIndex].xpos !== "NOUN" ||
    lastHead === -2 ||
    lastHead !== secondLastIndex
  ) {
    return false;
  }

  const {
    xpos: markerTag,
    feats: { AdpType, ConjType },
  } = tokens[lastHead];
  return (
    heads[lastHead] === -2 &&
    markerTag === "MARK" &&
    Boolean(AdpType) &&
    !ConjType
  );
};

const isNotPartiallyDelimited = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  currentIndex: number,
) =>
  !hasChildWithMatcher(
    heads,
    tokens,
    currentIndex,
    (token, index) => isDelimiter(token) && index < currentIndex,
  ) ||
  hasChildWithMatcher(
    heads,
    tokens,
    currentIndex,
    (token, index) => isDelimiter(token) && index > currentIndex,
  );

const findSubjectChild = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  currentIndex: number,
) =>
  heads
    .reduce(childrenOf(currentIndex), [])
    .find((child) => tokens[child].xpos === "NOUN" && child < currentIndex);

const isRelativeGerund = ({ tokens, stack }: OracleArgs) => {
  const {
    feats: { Tense, VerbForm },
  } = tokens[stack[stack.length - 1]];
  return (
    stack.length === 2 &&
    tokens.length > 2 &&
    VerbForm === "Part" &&
    Tense === "Pres"
  );
};

const cannotBeABareInfinitive = ({
  feats: { Mood, Person, Tense },
}: PartiallyParsedToken) => Boolean(Mood) || Person === 3 || Tense === "Past";

const prepositionsThatAlsoSubordinate = ["for", "to"];

const canStrand = ({
  lemma,
  feats: { AdpType, ConjType },
}: PartiallyParsedToken) =>
  AdpType === "Prep" &&
  (ConjType == null || prepositionsThatAlsoSubordinate.includes(String(lemma)));

const canBeAStrandedPreposition = (token: PartiallyParsedToken) =>
  (token.xpos === "MARK" ||
    (token.xpos == null && Boolean(token.misc.pos?.MARK))) &&
  canStrand(token);

const canBeAVerb = ({ xpos, misc: { pos = {} } }: PartiallyParsedToken) =>
  xpos === "VERB" || (xpos == null && Boolean(pos.VERB));

const endOfDoSupport = (tokens: PartiallyParsedToken[], index: number) => {
  if (tokens[index].lemma !== "do") {
    return index;
  }

  const negated = tokens[index + 1]?.lemma === "not" ? index + 1 : index;
  const supported = tokens[negated + 1] as PartiallyParsedToken | undefined;
  return supported != null &&
    canBeAVerb(supported) &&
    !cannotBeABareInfinitive(supported)
    ? negated + 1
    : index;
};

const isFiniteVerb = (token: PartiallyParsedToken | undefined) =>
  token?.xpos === "VERB" &&
  (Boolean(token.feats.Mood) || token.feats.VerbForm === "Fin");

const isFollowedByAFiniteVerb = (
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  const end = endOfDoSupport(tokens, index);
  const after = tokens[end + 1] as PartiallyParsedToken | undefined;
  const next =
    after != null && canBeAStrandedPreposition(after) ? tokens[end + 2] : after;
  return (
    isFiniteVerb(next) &&
    (end === index || (next != null && cannotBeABareInfinitive(next)))
  );
};

const isPronounRelativeBeforeTheMainVerb = (
  { tokens, stack }: OracleArgs,
  subject?: number,
) => {
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  return (
    subject === lastIndex + 1 &&
    subject === currentIndex - 1 &&
    isSubjectPronoun(tokens[subject]) &&
    isSubstantiveNoun(tokens[lastIndex]) &&
    !tokens[currentIndex].feats.Mood &&
    isFollowedByAFiniteVerb(tokens, currentIndex)
  );
};

const isUnmarkedRelativeVerb = (args: OracleArgs, subject?: number) => {
  const { heads, tokens, stack } = args;
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const hasRelativeSubjectChild = hasChildWithMatcher(
    heads,
    tokens,
    currentIndex,
    (token, otherIndex) =>
      otherIndex < currentIndex && canBeRelativePronoun(token),
  );
  const subjectHasADeterminer =
    subject != null &&
    hasChildWithMatcher(
      heads,
      tokens,
      subject,
      ({ xpos, feats: { PronType } }) => xpos === "ADJ" && PronType != null,
    );
  return (
    (hasRelativeSubjectChild ||
      isUnmarkedRelativeRoot(heads, tokens, stack, currentIndex) ||
      subjectHasADeterminer ||
      isPronounRelativeBeforeTheMainVerb(args, subject)) &&
    !tokens.slice(lastIndex, currentIndex - 1).some(isTerminator)
  );
};

const isExplicitRelativeVerb = (
  { heads, tokens, stack }: OracleArgs,
  isAppositiveOrNotPartiallyDelimited: boolean,
) =>
  hasChildWithMatcher(
    heads,
    tokens,
    stack[stack.length - 1],
    ({ xpos, feats: { PronType } }) => xpos === "NOUN" && PronType === "Rel",
  ) && isAppositiveOrNotPartiallyDelimited;

const headsAPrecedingNoun = (
  args: OracleArgs,
  subject: number | undefined,
  isAppositiveOrNotPartiallyDelimited: boolean,
) => {
  const { heads, tokens, stack } = args;
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  return (
    tokens[lastIndex].xpos === "NOUN" &&
    heads[currentIndex] === -2 &&
    !isAncestor(heads, currentIndex, lastIndex) &&
    (isRelativeGerund(args) ||
      isUnmarkedRelativeVerb(args, subject) ||
      isExplicitRelativeVerb(args, isAppositiveOrNotPartiallyDelimited))
  );
};

const relativeClausePops = ({ heads, tokens, stack, index }: OracleArgs) => {
  const currentIndex = stack[stack.length - 1];
  const nextToken = tokenAfter(tokens, currentIndex);
  return (
    hasAppositivePunctuation(
      heads,
      tokens,
      currentIndex,
      index === tokens.length - 1,
    ) ||
    nextToken.xpos === "END" ||
    isTerminator(nextToken)
  );
};

const isUnmarkedPastRelativeOfPrecedingNoun = ({
  heads,
  tokens,
  stack,
}: OracleArgs) => {
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  return (
    tokens[lastIndex].xpos === "NOUN" &&
    belongToTheSameClause(tokens, heads, lastIndex, currentIndex) &&
    !lastNounIsAlreadyRelative(heads, tokens, stack) &&
    heads[currentIndex] === -2 &&
    !isAncestor(heads, currentIndex, lastIndex) &&
    canBeUnmarkedPastRelative(tokens, currentIndex)
  );
};

const verbAttachesToTheVerbBefore = (
  { heads, tokens, stack, index }: OracleArgs,
  subject?: number,
) => {
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const hasSubjectOrCanFindOne =
    subject != null ||
    findSubjectOffset({ heads, stack, tokens, index }) !== -1;
  const opensANewClause =
    hasSubjectOrCanFindOne && hasCommaBetween(tokens, lastIndex, currentIndex);
  const continuesTheVerbGroup =
    !opensANewClause &&
    verbsAreCompatible(tokens, heads, lastIndex, currentIndex);
  const isForcedConjunct =
    belongToTheSameClause(tokens, heads, lastIndex, currentIndex) &&
    subject != null &&
    lastVerbIsForcedHead(heads, tokens, stack);
  return continuesTheVerbGroup || isForcedConjunct;
};

const headBeyondDoSupport = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  verb: number,
) => {
  const head = heads[verb];
  return head >= 0 && head < verb && tokens[head].lemma === "do"
    ? heads[head]
    : head;
};

const closesARelativeClause = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  marker: number,
) => {
  const verb = heads[marker];
  const antecedent = verb >= 0 ? headBeyondDoSupport(heads, tokens, verb) : -2;
  return (
    verb >= 0 &&
    antecedent >= 0 &&
    antecedent < verb &&
    tokens[verb].xpos === "VERB" &&
    tokens[antecedent].xpos === "NOUN"
  );
};

const isStrandedBeforeTheMainVerb = ({ heads, tokens, stack }: OracleArgs) => {
  const currentIndex = stack[stack.length - 1];
  const marker = stack[stack.length - 2];
  return (
    marker === currentIndex - 1 &&
    canStrand(tokens[marker]) &&
    cannotBeABareInfinitive(tokens[currentIndex]) &&
    closesARelativeClause(heads, tokens, marker)
  );
};

const verbAttachesToTheMarkerBefore = (args: OracleArgs) => {
  const { tokens, stack } = args;
  const currentIndex = stack[stack.length - 1];
  const {
    feats: { AdpType: lastAdpType, ConjType: lastConjType },
  } = tokens[stack[stack.length - 2]];
  return (
    !isStrandedBeforeTheMainVerb(args) &&
    Boolean(lastConjType || (lastAdpType && isGerund(tokens[currentIndex])))
  );
};

const verbAttachesToTheLeft = (
  args: OracleArgs,
  subject: number | undefined,
  isAppositiveOrNotPartiallyDelimited: boolean,
) => {
  const { heads, tokens, stack } = args;
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const { xpos: lastTag } = tokens[lastIndex];
  return (
    !isAncestor(heads, currentIndex, lastIndex) &&
    heads[currentIndex] === -2 &&
    isAppositiveOrNotPartiallyDelimited &&
    ((lastTag === "VERB" && verbAttachesToTheVerbBefore(args, subject)) ||
      (lastTag === "MARK" && verbAttachesToTheMarkerBefore(args)))
  );
};

const findMissingSubjectOffset = (
  { heads, stack, tokens, index }: OracleArgs,
  subject?: number,
) => {
  const {
    feats: { VerbForm },
  } = tokens[stack[stack.length - 1]];
  return subject == null && VerbForm !== "Part"
    ? findSubjectOffset({ heads, stack, tokens, index })
    : -1;
};

const attachUnmarkedRelativeVerb = ({ heads, stack, tokens }: OracleArgs) => {
  const { subject: relativeHead, relativeVerb } = findVerbAfterUnmarkedRelative(
    stack,
    tokens,
    heads,
  );
  if (relativeHead < 0 || relativeVerb < 0) {
    return null;
  }

  addToParse(heads, tokens, relativeHead, relativeVerb);
  return leftArc(2);
};

const verbFallbackStep = (
  args: OracleArgs,
  subject: number | undefined,
  isAppositiveOrNotPartiallyDelimited: boolean,
) => {
  const { heads, stack, tokens, index } = args;
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const subjectOffset = findMissingSubjectOffset(args, subject);
  if (subjectOffset !== -1) {
    return leftArc(subjectOffset);
  }

  const leftModifierOffset = findLeftVerbModifierOffset(
    heads,
    stack,
    tokens,
    currentIndex,
  );
  if (
    leftModifierOffset !== -1 &&
    isAppositiveOrNotPartiallyDelimited &&
    !isAncestor(heads, currentIndex, lastIndex)
  ) {
    return leftArc(leftModifierOffset);
  }

  const relativeTransition = attachUnmarkedRelativeVerb(args);
  if (relativeTransition != null) {
    return relativeTransition;
  }

  return index === tokens.length - 1 && heads[currentIndex] !== -2
    ? reduce
    : null;
};

const verbStep = (args: OracleArgs) => {
  const { heads, stack, tokens, index } = args;
  const currentIndex = stack[stack.length - 1];
  const { xpos: lastTag } = tokens[stack[stack.length - 2]];
  if (lastTag === "ADV") {
    return leftArc(1);
  }

  if (isMatchingDelimiterRoot(heads, tokens, currentIndex, currentIndex + 1)) {
    return null;
  }

  if (isObjectOfAPrecedingPreposition(args)) {
    return leftArc(2);
  }

  const isAppositiveOrNotPartiallyDelimited =
    isNotPartiallyDelimited(heads, tokens, currentIndex) ||
    hasAppositivePunctuation(
      heads,
      tokens,
      currentIndex,
      index === tokens.length - 1,
    );
  const subject = findSubjectChild(heads, tokens, currentIndex);
  if (headsAPrecedingNoun(args, subject, isAppositiveOrNotPartiallyDelimited)) {
    return rightArc(1, { pop: relativeClausePops(args) });
  }

  if (isUnmarkedPastRelativeOfPrecedingNoun(args)) {
    return null;
  }

  if (
    verbAttachesToTheLeft(args, subject, isAppositiveOrNotPartiallyDelimited)
  ) {
    return rightArc(1, { pop: false });
  }

  return verbFallbackStep(args, subject, isAppositiveOrNotPartiallyDelimited);
};

const isNounConjunct = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  stack: number[],
  index: number,
) => {
  const marker = stack[stack.length - 2];
  const {
    xpos: markerTag,
    feats: { ConjType },
  } = tokens[marker];
  const markerParent = heads[marker];
  if (markerParent === -2 || markerTag !== "MARK" || ConjType !== "Coor") {
    return false;
  }

  const { xpos: markerParentTag } = tokens[markerParent];
  const { feats: { ConjType: nextConjType } = { ConjType: undefined } } =
    index + 1 < tokens.length ? tokens[index + 1] : { feats: {} };
  return markerParentTag === "NOUN" && nextConjType !== "Coor";
};

const isPostpositionObject = (
  tokens: PartiallyParsedToken[],
  currentIndex: number,
) => {
  const {
    feats: { AdpType, ConjType } = { AdpType: undefined, ConjType: undefined },
  } =
    currentIndex + 1 < tokens.length ? tokens[currentIndex + 1] : { feats: {} };
  if (currentIndex >= tokens.length || !AdpType || ConjType) {
    return false;
  }

  let index = currentIndex + 2;
  while (index < tokens.length) {
    const { xpos } = tokens[index];
    if (xpos === "PUNCT") {
      return true;
    }

    if (xpos === "ADV") {
      index += 1;
    } else {
      return false;
    }
  }

  return true;
};

const arePartOfTheSameNoun = (
  tokens: PartiallyParsedToken[],
  start: number,
  end: number,
) => {
  const {
    feats: { NumType: childNumType },
  } = tokens[start];
  return !tokens
    .slice(start + 1, end)
    .some(
      ({ xpos = "X" }) =>
        (xpos === "ADJ" && !childNumType) || ["MARK", "VERB"].includes(xpos),
    );
};

const missingToken = {
  feats: {},
  misc: {},
} as PartiallyParsedToken;

const tokenTwoAfter = (tokens: PartiallyParsedToken[], index: number) =>
  index + 2 < tokens.length ? tokens[index + 2] : missingToken;

const nounClosesAnAppositive = ({
  heads,
  tokens,
  stack,
  index,
}: OracleArgs) => {
  const currentIndex = stack[stack.length - 1];
  const lastToken = tokens[stack[stack.length - 2]];
  const {
    lemma,
    feats: { Reflex },
  } = tokens[currentIndex];
  return (
    lastToken.xpos === "NOUN" &&
    (Boolean(Reflex) ||
      Boolean(lemma === "all" && lastToken.feats.PronType) ||
      hasAppositivePunctuation(
        heads,
        tokens,
        currentIndex,
        index === tokens.length - 1,
      ))
  );
};

const closesACoordinatedModifier = ({ heads, tokens, stack }: OracleArgs) => {
  if (stack.length < 3) {
    return false;
  }

  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const secondLastIndex = stack[stack.length - 3];
  const coordinationHasARightConjunct = hasChildWithMatcher(
    heads,
    tokens,
    lastIndex,
    ({ xpos }, otherIndex) => xpos === "ADJ" && otherIndex > lastIndex,
  );
  return (
    heads[currentIndex] === -2 &&
    heads[secondLastIndex] === -2 &&
    isCoordinatedModifier(heads, tokens, lastIndex) &&
    heads[lastIndex] === secondLastIndex &&
    coordinationHasARightConjunct &&
    !isAncestor(heads, currentIndex, secondLastIndex)
  );
};

const nounCanBeModified = ({ tokens, stack }: OracleArgs) => {
  const {
    lemma,
    feats: { PronType },
  } = tokens[stack[stack.length - 1]];
  const {
    feats: { PronType: lastPronType },
  } = tokens[stack[stack.length - 2]];
  const isModifiableQuantifier =
    ["Ind", "Tot", "Neg"].includes(String(PronType)) &&
    !["here", "there"].includes(lemma ?? "");
  return !PronType || isModifiableQuantifier || Boolean(lastPronType);
};

const adverbClosesTheNounPhrase = (
  { tokens, stack }: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const lastIndex = stack[stack.length - 2];
  const {
    feats: { Tense },
  } = tokens[stack[stack.length - 1]];
  const {
    xpos: nextTag = "X",
    feats: { ConjType: nextConjType },
  } = nextToken;
  const secondLastToken =
    stack.length >= 3 ? tokens[stack[stack.length - 3]] : startToken;
  const negatorModifiesNoun =
    isNegator(tokens[lastIndex]) && !negatesVerbGroup(tokens, lastIndex);
  return (
    negatorModifiesNoun ||
    Tense === "Past" ||
    nextConjType === "Coor" ||
    ["END", "PUNCT"].includes(nextTag) ||
    isTerminator(secondLastToken)
  );
};

const isNumberWithItsUnit = (
  { feats: { NumType } }: PartiallyParsedToken,
  { misc: { isUnit } }: PartiallyParsedToken,
) => Boolean(NumType && isUnit);

const nounJoinsTheNounBefore = (
  { heads, tokens, stack, index }: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const currentToken = tokens[currentIndex];
  const lastToken = tokens[lastIndex];
  const {
    feats: { PronType },
    misc: { isOpaque },
  } = currentToken;
  const isFollowedByAPostposition =
    nextToken.xpos === "MARK" && nextToken.feats.AdpType === "Post";
  return (
    !isFollowedByAPostposition &&
    !PronType &&
    belongToTheSameClause(tokens, heads, lastIndex, currentIndex) &&
    arePartOfTheSameNoun(tokens, lastIndex, currentIndex) &&
    !isTimeModifier(tokens[index]) &&
    !isTimeModifier(lastToken) &&
    !isOpaque &&
    !isNumberWithItsUnit(currentToken, lastToken)
  );
};

const nounAttachesLeftward = (
  args: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const { heads, tokens, stack } = args;
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const lastToken = tokens[lastIndex];
  const { xpos: lastTag } = lastToken;
  const headIsPostposition =
    lastTag === "MARK" && lastToken.feats.AdpType === "Post";
  return (
    !isAncestor(heads, currentIndex, lastIndex) &&
    nounCanBeModified(args) &&
    (lastTag === "ADJ" ||
      (lastTag === "ADV" && adverbClosesTheNounPhrase(args, nextToken)) ||
      headIsPostposition ||
      (lastTag === "NOUN" && nounJoinsTheNounBefore(args, nextToken)))
  );
};

const modifiesTheNounAfter = (
  { tokens, stack }: OracleArgs,
  nextToken: PartiallyParsedToken,
  secondNextToken: PartiallyParsedToken,
) => {
  const {
    feats: { PronType },
  } = tokens[stack[stack.length - 1]];
  const {
    xpos: nextTag,
    feats: { NumType: nextNumType, PronType: nextPronType },
  } = nextToken;
  const secondNextIsAPostposition =
    secondNextToken.xpos === "MARK" && secondNextToken.feats.AdpType === "Post";
  return (
    nextTag === "NOUN" &&
    !nextNumType &&
    !PronType &&
    !nextPronType &&
    !secondNextIsAPostposition
  );
};

const countsTheUnitAfter = (
  { tokens, stack }: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const {
    feats: { NumType },
  } = tokens[stack[stack.length - 1]];
  const {
    feats: { NumType: nextNumType },
    misc: { pos: nextPosTags = {}, isUnit: nextIsUnit },
  } = nextToken;
  return Boolean(
    nextPosTags.NOUN && NumType && (nextIsUnit || nextNumType != null),
  );
};

const nounModifiesWhatFollows = (
  args: OracleArgs,
  nextToken: PartiallyParsedToken,
  secondNextToken: PartiallyParsedToken,
) => {
  const { heads, stack } = args;
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  return (
    modifiesTheNounAfter(args, nextToken, secondNextToken) ||
    countsTheUnitAfter(args, nextToken) ||
    isAncestor(heads, currentIndex, lastIndex) ||
    heads[currentIndex] !== -2
  );
};

const nounEndsACommaList = (
  { heads, tokens, stack }: OracleArgs,
  nextToken: PartiallyParsedToken,
  secondNextToken: PartiallyParsedToken,
) => {
  const currentIndex = stack[stack.length - 1];
  const {
    feats: { ConjType: nextConjType, PunctType: nextPunctType },
  } = nextToken;
  const { xpos: secondNextTag } = secondNextToken;
  const hasACommaChild = hasChildWithMatcher(
    heads,
    tokens,
    currentIndex,
    ({ feats: { PunctType } }) => PunctType === "Comm",
  );
  return (
    tokens[stack[stack.length - 2]].xpos === "NOUN" &&
    hasACommaChild &&
    (nextConjType === "Coor" || nextPunctType === "Comm") &&
    secondNextTag != null &&
    !["VERB", "ADV"].includes(secondNextTag)
  );
};

const isAtSentenceEnd = (
  { tokens, index }: OracleArgs,
  { feats: { PunctType: nextPunctType } }: PartiallyParsedToken,
) =>
  index === tokens.length - 1 ||
  Boolean(
    index === tokens.length - 2 && nextPunctType && nextPunctType !== "Dash",
  );

const isLeafPronoun = (
  { tokens, stack }: OracleArgs,
  { misc: { pos: nextPosTags = {} } }: PartiallyParsedToken,
) => {
  const {
    feats: { Case, PronType },
  } = tokens[stack[stack.length - 1]];
  const aftTags = Object.keys(nextPosTags);
  return (
    Case === "Acc" ||
    (PronType === "Prs" &&
      !(
        aftTags.length > 0 &&
        aftTags.some((xpos) => ["MARK", "VERB"].includes(xpos))
      ))
  );
};

const objectPops = (args: OracleArgs, nextToken: PartiallyParsedToken) =>
  isAtSentenceEnd(args, nextToken) || isLeafPronoun(args, nextToken);

const conjunctionTakesTheNoun = (
  { heads, tokens, stack }: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const currentIndex = stack[stack.length - 1];
  const {
    misc: { parentDirection },
  } = tokens[currentIndex];
  const {
    xpos: nextTag = "X",
    feats: { PronType: nextPronType, PunctType: nextPunctType },
  } = nextToken;
  return (
    parentDirection === "L" ||
    isNounConjunct(heads, tokens, stack, currentIndex) ||
    ["MARK", "PUNCT", "END"].includes(nextTag) ||
    nextPronType === "Rel" ||
    Boolean(nextPunctType && ["Peri", "Qest", "Excl"].includes(nextPunctType))
  );
};

const nounIsMarkerObject = (
  args: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const { heads, tokens, stack, index } = args;
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const {
    xpos: lastTag,
    feats: { AdpType: lastAdpType, ConjType: lastConjType },
  } = tokens[lastIndex];
  if (lastTag !== "MARK") {
    return false;
  }

  const markerAlreadyHasObject = hasChildWithMatcher(
    heads,
    tokens,
    lastIndex,
    ({ xpos }) => xpos === "NOUN",
  );
  const isInTheSameClause =
    hasAppositivePunctuation(
      heads,
      tokens,
      currentIndex,
      index === tokens.length - 1,
    ) || belongToTheSameClause(tokens, heads, lastIndex, currentIndex);
  const licensedByTheMarker =
    (lastAdpType && !lastConjType) ||
    (lastConjType && conjunctionTakesTheNoun(args, nextToken));
  return Boolean(
    !markerAlreadyHasObject && isInTheSameClause && licensedByTheMarker,
  );
};

const closesTheConjunct = (
  { heads, tokens, stack }: OracleArgs,
  { misc: { pos: nextPosTags = {} } }: PartiallyParsedToken,
) => {
  const currentIndex = stack[stack.length - 1];
  return (
    isNounConjunct(heads, tokens, stack, currentIndex) &&
    !Object.keys(nextPosTags).some((xpos) => ["MARK", "NOUN"].includes(xpos)) &&
    !isUnmarkedRelativeSubject(tokens, currentIndex)
  );
};

const isBeforeAPostposition = (
  nextTag: string,
  secondNextToken: PartiallyParsedToken,
) =>
  nextTag === "NOUN" &&
  secondNextToken.xpos === "MARK" &&
  secondNextToken.feats.AdpType === "Post";

const isBeforeAnAttachedVerb = (
  { heads, tokens, stack }: OracleArgs,
  nextTag: string,
) => {
  const currentIndex = stack[stack.length - 1];
  const lastHead = heads[stack[stack.length - 2]];
  return (
    nextTag === "VERB" &&
    lastHead >= 0 &&
    !isUnmarkedRelativeSubject(tokens, currentIndex)
  );
};

const markerObjectPops = (
  args: OracleArgs,
  nextToken: PartiallyParsedToken,
  secondNextToken: PartiallyParsedToken,
) => {
  const { xpos: nextTag = "X" } = nextToken;
  return (
    objectPops(args, nextToken) ||
    closesTheConjunct(args, nextToken) ||
    isBeforeAPostposition(nextTag, secondNextToken) ||
    nextTag === "ADV" ||
    isBeforeAnAttachedVerb(args, nextTag)
  );
};

const verbCanTakeTheObject = (
  { heads, tokens, stack }: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const lastHead = heads[lastIndex];
  const {
    feats: { VerbForm: lastVerbForm, Tense: lastTense },
  } = tokens[lastIndex];
  const {
    feats: { Case },
  } = tokens[currentIndex];
  const {
    xpos: nextTag = "X",
    misc: { pos: nextPosTags = {} },
  } = nextToken;
  const isGerundArgument = lastVerbForm === "Part" && lastTense === "Pres";
  return (
    (lastHead >= 0 && tokens[lastHead].xpos === "NOUN") ||
    Case === "Acc" ||
    nextTag !== "VERB" ||
    !nextPosTags.VERB ||
    isGerundArgument
  );
};

const nounIsVerbObject = (
  args: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const { heads, tokens, stack } = args;
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const {
    feats: { Case },
  } = tokens[currentIndex];
  return (
    tokens[lastIndex].xpos === "VERB" &&
    Case !== "Nom" &&
    belongToTheSameClause(tokens, heads, lastIndex, currentIndex) &&
    !isPostpositionObject(tokens, currentIndex) &&
    verbCanTakeTheObject(args, nextToken)
  );
};

const nextIsANoun = ({
  xpos: nextTag = "X",
  misc: { pos: nextPosTags = {} },
}: PartiallyParsedToken) => nextTag === "NOUN" || Boolean(nextPosTags.NOUN);

const nounIsSecondObjectOfVerb = (
  { heads, tokens, stack }: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  if (stack.length < 3) {
    return false;
  }

  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const secondLastIndex = stack[stack.length - 3];
  const lastWordHasDeterminer = hasChildWithMatcher(
    heads,
    tokens,
    lastIndex,
    ({ xpos, feats: { PronType } }, otherIndex) =>
      otherIndex < lastIndex && xpos === "ADJ" && PronType != null,
  );
  return (
    tokens[secondLastIndex].xpos === "VERB" &&
    tokens[lastIndex].xpos === "NOUN" &&
    belongToTheSameClause(tokens, heads, secondLastIndex, currentIndex) &&
    !nextIsANoun(nextToken) &&
    !lastWordHasDeterminer
  );
};

const headTagOf = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  const head = heads[index] || -2;
  return head === -2 ? "START" : tokens[head].xpos;
};

const nounIsObjectOfMarkedVerb = (
  { heads, tokens, stack }: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  if (stack.length < 4) {
    return false;
  }

  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const secondLastIndex = stack[stack.length - 3];
  const thirdLastIndex = stack[stack.length - 4];
  return (
    tokens[thirdLastIndex].xpos === "VERB" &&
    headTagOf(heads, tokens, thirdLastIndex) !== "VERB" &&
    tokens[secondLastIndex].xpos === "MARK" &&
    tokens[lastIndex].xpos === "NOUN" &&
    belongToTheSameClause(tokens, heads, thirdLastIndex, currentIndex) &&
    !hasNonDashPunctuationChild(heads, tokens, currentIndex) &&
    !nextIsANoun(nextToken)
  );
};

const nounAttachesRightward = (
  args: OracleArgs,
  nextToken: PartiallyParsedToken,
  secondNextToken: PartiallyParsedToken,
) => {
  if (nounEndsACommaList(args, nextToken, secondNextToken)) {
    return rightArc(1, { pop: true });
  }

  if (nounIsMarkerObject(args, nextToken)) {
    return rightArc(1, {
      pop: markerObjectPops(args, nextToken, secondNextToken),
    });
  }

  const pop = objectPops(args, nextToken);
  if (nounIsVerbObject(args, nextToken)) {
    return rightArc(1, { pop });
  }

  if (nounIsSecondObjectOfVerb(args, nextToken)) {
    return rightArc(2, { pop });
  }

  if (nounIsObjectOfMarkedVerb(args, nextToken)) {
    return rightArc(3, { pop });
  }

  return null;
};

const nounStep = (args: OracleArgs) => {
  const { tokens, stack } = args;
  const currentIndex = stack[stack.length - 1];
  const nextToken = tokenAfter(tokens, currentIndex);
  const secondNextToken = tokenTwoAfter(tokens, currentIndex);
  if (nounClosesAnAppositive(args)) {
    return rightArc(1, { pop: true });
  }

  if (closesACoordinatedModifier(args)) {
    return leftArc(2);
  }

  if (nounAttachesLeftward(args, nextToken)) {
    return leftArc(1);
  }

  if (nounModifiesWhatFollows(args, nextToken, secondNextToken)) {
    return null;
  }

  return nounAttachesRightward(args, nextToken, secondNextToken);
};

const findVerbConjunct = (
  tokens: PartiallyParsedToken[],
  object: number,
  candidateParents: number[],
) => {
  const {
    feats: { Tense, VerbForm },
  } = tokens[object];
  const exactTenseMatch = candidateParents.findIndex(
    (candidate) =>
      tokens[candidate].xpos === "VERB" &&
      ((tokens[candidate].feats.Tense === "Past" && Tense === "Past") ||
        (tokens[candidate].feats.Tense === Tense &&
          tokens[candidate].feats.VerbForm === VerbForm)),
  );

  if (exactTenseMatch !== -1) {
    return exactTenseMatch + 1;
  }

  const partialTenseMatch = candidateParents.findIndex(
    (candidate) =>
      tokens[candidate].xpos === "VERB" &&
      tokens[candidate].feats.VerbForm === VerbForm,
  );
  return partialTenseMatch === -1 ? -1 : partialTenseMatch + 1;
};

const conjunctTagsOf = (pos: PosWeights, index: number) =>
  Object.keys(pos)
    .filter((tag) => ["VERB", "NOUN", "ADJ", "ADV"].includes(tag))
    .map((xpos) => ({ index, xpos }));

const toCandidates = (tokens: PartiallyParsedToken[], currentIndex: number) => {
  let index = currentIndex + 1;
  const candidates = [];
  while (index < tokens.length) {
    const {
      xpos,
      feats: { ConjType },
      misc: { pos },
    } = tokens[index];
    if (xpos === "PUNCT" || ConjType) {
      return candidates;
    }

    if (xpos === "VERB") {
      candidates.push({ index, xpos: "VERB" });
      return candidates;
    }

    if (pos.VERB) {
      candidates.push({ index, xpos: "VERB" });
    }

    if (!candidates.some(({ xpos: otherTag }) => otherTag === xpos)) {
      candidates.push(...conjunctTagsOf(pos, index));
    }

    index += 1;
  }

  return candidates;
};

type Coordination = {
  heads: number[];
  tokens: PartiallyParsedToken[];
  currentIndex: number;
  candidates: { index: number; xpos: string }[];
  candidateParents: number[];
};

const nextWordAgreesWithTheFirstParent = ({
  heads,
  tokens,
  currentIndex,
  candidates,
  candidateParents,
}: Coordination) => {
  const [firstParent] = candidateParents;
  const {
    xpos: parentTag,
    feats: { Number: parentNumber },
  } = tokens[firstParent];
  const parentHead = heads[firstParent];
  const parentIsBeVerbArgument =
    parentTag === "ADJ" &&
    parentHead !== -2 &&
    tokens[parentHead].lemma === "be";
  return candidates.some(
    ({ index, xpos }) =>
      index === currentIndex + 1 &&
      xpos === "NOUN" &&
      (parentTag === "NOUN" || parentIsBeVerbArgument) &&
      tokens[index].feats.Number === parentNumber,
  );
};

const nextWordModifiesTheFirstParent = ({
  tokens,
  currentIndex,
  candidates,
  candidateParents,
}: Coordination) => {
  const [firstParent] = candidateParents;
  const { xpos: parentTag } = tokens[firstParent];
  const nextCandidate = candidates.find(
    ({ index }) => index === currentIndex + 1,
  );
  const nextIsUnrecognisedNoun =
    nextCandidate?.xpos === "NOUN" &&
    Object.keys(tokens[currentIndex + 1].misc.pos ?? {}).length === 1;
  return (
    parentTag === "ADJ" &&
    (nextCandidate?.xpos === "ADJ" || nextIsUnrecognisedNoun)
  );
};

const findFirstParentOffset = (coordination: Coordination) => {
  if (coordination.candidateParents.length === 0) {
    return -1;
  }

  return nextWordAgreesWithTheFirstParent(coordination) ||
    nextWordModifiesTheFirstParent(coordination)
    ? 1
    : -1;
};

const findVerbConjunctOffset = ({
  tokens,
  candidates,
  candidateParents,
}: Coordination) => {
  const verbCandidates = candidates.filter(({ xpos }) => xpos === "VERB");
  let indexInVerbCandidates = 0;
  while (indexInVerbCandidates < verbCandidates.length) {
    const verbConjunct = findVerbConjunct(
      tokens,
      verbCandidates[indexInVerbCandidates].index,
      candidateParents,
    );
    if (verbConjunct !== -1) {
      return verbConjunct;
    }

    indexInVerbCandidates += 1;
  }

  return -1;
};

const findNounConjunctOffset = ({
  tokens,
  candidates,
  candidateParents,
}: Coordination) => {
  if (!candidates.some(({ xpos }) => xpos === "NOUN")) {
    return -1;
  }

  const nounParent = candidateParents.findIndex(
    (candidate) => tokens[candidate].xpos === "NOUN",
  );
  if (nounParent !== -1) {
    return nounParent + 1;
  }

  const verbParent = candidateParents.findIndex(
    (candidate) => tokens[candidate].xpos === "VERB",
  );
  return verbParent === -1 ? 1 : verbParent + 1;
};

const findModifierConjunctOffset = ({
  tokens,
  candidates,
  candidateParents,
}: Coordination) => {
  if (!candidates.some(({ xpos }) => ["ADJ", "ADV"].includes(xpos))) {
    return -1;
  }

  const modifierParent = candidateParents.findIndex((candidate) =>
    ["ADJ", "ADV"].includes(tokens[candidate].xpos ?? "X"),
  );
  return modifierParent === -1 ? 1 : modifierParent + 1;
};

const conjunctStages = [
  findFirstParentOffset,
  findVerbConjunctOffset,
  findNounConjunctOffset,
  findModifierConjunctOffset,
];

const getConjunct = (
  heads: number[],
  stack: number[],
  tokens: PartiallyParsedToken[],
  currentIndex: number,
) => {
  const candidates = toCandidates(tokens, currentIndex);
  if (candidates.length === 0) {
    const { xpos: nextTag } = tokens[currentIndex + 1] || {};
    return nextTag === "PUNCT" && currentIndex < tokens.length - 2 ? -1 : 1;
  }

  const candidateParents = stack
    .slice(0, stack.length - 1)
    .reverse()
    .filter((parent) => currentIndex - parent < maxConjunctParentDistance);
  const coordination = {
    heads,
    tokens,
    currentIndex,
    candidates,
    candidateParents,
  };
  const offset = conjunctStages.reduce(
    (found, stage) => (found === -1 ? stage(coordination) : found),
    -1,
  );
  return offset === -1 ? 1 : offset;
};

const findDegree2Parent = (stack: number[], tokens: PartiallyParsedToken[]) => {
  const {
    feats: { PronType },
  } = tokens[stack[stack.length - 1]];
  const candidates = stack.slice(0, stack.length - 1).reverse();
  if (PronType === "Rel") {
    const candidateHeadOffset = candidates.findIndex((candidate) =>
      ["VERB", "NOUN"].includes(tokens[candidate].xpos ?? "X"),
    );
    return candidateHeadOffset === -1 ? -1 : candidateHeadOffset + 1;
  }

  const verbOffset = candidates.findIndex(
    (candidate) => tokens[candidate].xpos === "VERB",
  );

  return verbOffset === -1 ? -1 : verbOffset + 1;
};

const findDegree0Parent = (
  heads: number[],
  stack: number[],
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  const {
    lemma,
    feats: { ConjType },
  } = tokens[index];
  if (ConjType === "Coor") {
    return getConjunct(heads, stack, tokens, index);
  }

  const isSentenceEnd = index === tokens.length - 1;
  const lastWordIsLeftDelimited =
    stack.length >= 2 &&
    hasChildWithMatcher(
      heads,
      tokens,
      stack[stack.length - 2],
      (token, otherIndex) => isDelimiter(token) && otherIndex < index,
    ) &&
    !hasAppositivePunctuation(
      heads,
      tokens,
      stack[stack.length - 2],
      isSentenceEnd,
    );
  if (lemma === "to" || lastWordIsLeftDelimited) {
    return 1;
  }

  if (
    hasChildWithMatcher(
      heads,
      tokens,
      index,
      ({ feats: { PunctType } }) => PunctType !== "Dash",
    ) ||
    isFollowedByClause(tokens, index)
  ) {
    const verbOffset = stack
      .slice(0, stack.length - 1)
      .reverse()
      .findIndex((candidate) => tokens[candidate].xpos === "VERB");

    if (verbOffset !== -1) {
      return verbOffset + 1;
    }

    const nonVerbHead = stack
      .slice(0, stack.length - 1)
      .reverse()
      .findIndex((candidate) =>
        ["NOUN", "ADJ", "ADV"].includes(tokens[candidate].xpos ?? "X"),
      );
    return nonVerbHead === -1 ? -1 : nonVerbHead + 1;
  }

  return 1;
};

const findDegree1Parent = (
  heads: number[],
  stack: number[],
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  const [parent, marker] = stack.slice(stack.length - 2);
  const { xpos: parentTag } = tokens[parent];
  const markerHasLeftDelimiter = heads.some((head, child) => {
    const {
      feats: { PunctType },
    } = tokens[child];
    return head === marker && PunctType != null && PunctType !== "Dash";
  });
  const { xpos: nextTag = "" } = tokens[index + 1] || { xpos: "END" };
  return (parentTag === "VERB" &&
    !(markerHasLeftDelimiter && ["END", "PUNCT"].includes(nextTag))) ||
    (parentTag === "NOUN" && !markerHasLeftDelimiter) ||
    (parentTag === "ADJ" && !markerHasLeftDelimiter)
    ? 1
    : -1;
};

const degreeQuantifiers = ["more", "most", "less", "least", "fewer", "fewest"];

const isComparativeCorrelate = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  if (index < 0) {
    return false;
  }

  const { form, xpos } = tokens[index];
  if (!["ADJ", "ADV", "NOUN"].includes(xpos ?? "X")) {
    return false;
  }

  if (degreeQuantifiers.includes(form.toLowerCase())) {
    return true;
  }

  const head = heads[index];
  if (head < 0) {
    return false;
  }

  const {
    lemma: headLemma,
    xpos: headTag,
    feats: { ConjType: headConjType },
  } = tokens[head];
  return headTag === "MARK" && headConjType === "Comp" && headLemma === "as";
};

const findMarkerParentOffset = (
  heads: number[],
  stack: number[],
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  const tDeg = translativeDegree(tokens[index]);
  return tDeg === 2
    ? findDegree2Parent(stack, tokens)
    : tDeg === 1
      ? findDegree1Parent(heads, stack, tokens, index)
      : findDegree0Parent(heads, stack, tokens, index);
};

const isRightDelimitedMarker = (
  { tokens, stack }: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const {
    feats: { AdpType, ConjType },
  } = tokens[stack[stack.length - 1]];
  const {
    xpos: nextTag,
    feats: { AdpType: nextAdpType, ConjType: nextConjType },
  } = nextToken;
  return Boolean(
    nextTag === "END" ||
      isTerminator(nextToken) ||
      (AdpType && !ConjType && nextAdpType && !nextConjType),
  );
};

const markerFollowsAVerbObject = (
  { tokens, stack }: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const {
    feats: { PronType: lastPronType, Case: lastCase },
  } = tokens[stack[stack.length - 2]];
  const { xpos: secondLastTag } = tokens[stack[stack.length - 3]];
  const {
    xpos: nextTag,
    misc: { pos: nextPosTags = {} },
  } = nextToken;
  return (
    (secondLastTag === "VERB" &&
      (lastPronType === "Dem" || lastCase === "Acc")) ||
    (nextTag != null && ["MARK", "PUNCT", "END"].includes(nextTag)) ||
    Boolean(nextPosTags.MARK && !nextPosTags.ADJ)
  );
};

const markerClosesAVerbObject = (
  args: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const { heads, tokens, stack } = args;
  if (stack.length <= 2) {
    return false;
  }

  const currentIndex = stack[stack.length - 1];
  const secondLastIndex = stack[stack.length - 3];
  const {
    feats: { AdpType, ConjType },
  } = tokens[currentIndex];
  return (
    tokens[secondLastIndex].xpos === "VERB" &&
    Boolean(AdpType) &&
    !ConjType &&
    markerFollowsAVerbObject(args, nextToken) &&
    belongToTheSameClause(tokens, heads, secondLastIndex, currentIndex)
  );
};

const markerAttachesToTheLeft = (
  args: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const { heads, tokens, stack } = args;
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const {
    xpos,
    feats: { AdpType },
  } = tokens[currentIndex];
  const { xpos: lastTag } = tokens[lastIndex];
  const isPostpositionOfTheNoun =
    lastTag === "NOUN" && xpos === "MARK" && AdpType === "Post";
  const modifiesTheAdverbBefore =
    lastTag === "ADV" &&
    belongToTheSameClause(tokens, heads, lastIndex, currentIndex);
  return (
    !isAncestor(heads, currentIndex, lastIndex) &&
    (modifiesTheAdverbBefore ||
      (lastTag === "NOUN" && markerClosesAVerbObject(args, nextToken)) ||
      isPostpositionOfTheNoun)
  );
};

const chainsOntoThePrecedingMarker = ({ tokens, stack }: OracleArgs) => {
  const {
    feats: { AdpType, ConjType },
  } = tokens[stack[stack.length - 1]];
  const {
    feats: { AdpType: lastAdpType, ConjType: lastConjType },
  } = tokens[stack[stack.length - 2]];
  return Boolean(
    lastAdpType &&
      !lastConjType &&
      ((AdpType && !ConjType) || (!AdpType && ConjType === "Sub")),
  );
};

const findPrecedingMarkerHeadOffset = ({ heads, stack }: OracleArgs) => {
  const lastHead = heads[stack[stack.length - 2]];
  return lastHead === -2
    ? -1
    : stack
        .slice()
        .reverse()
        .findIndex((stackMember) => stackMember === lastHead);
};

const headlessMarkerStep = (
  args: OracleArgs,
  nextToken: PartiallyParsedToken,
) => {
  const { heads, tokens, stack } = args;
  const currentIndex = stack[stack.length - 1];
  const lastIndex = stack[stack.length - 2];
  const {
    feats: { ConjType },
  } = tokens[currentIndex];
  const pop = isRightDelimitedMarker(args, nextToken);
  if (
    ConjType === "Comp" &&
    isComparativeCorrelate(heads, tokens, currentIndex - 1) &&
    !isAncestor(heads, currentIndex - 1, currentIndex)
  ) {
    return assignHead(currentIndex - 1);
  }

  if (
    tokens[lastIndex].xpos === "MARK" &&
    belongToTheSameClause(tokens, heads, lastIndex, currentIndex)
  ) {
    if (!chainsOntoThePrecedingMarker(args)) {
      return rightArc(1, { pop });
    }

    const headOffset = findPrecedingMarkerHeadOffset(args);
    return headOffset === -1 ? null : rightArc(headOffset, { pop });
  }

  const parentOffset = findMarkerParentOffset(
    heads,
    stack,
    tokens,
    currentIndex,
  );
  return parentOffset === -1 ? null : rightArc(parentOffset, { pop });
};

const markerStep = (args: OracleArgs) => {
  const { heads, tokens, stack } = args;
  const currentIndex = stack[stack.length - 1];
  const nextToken = tokenAfter(tokens, currentIndex);
  if (markerAttachesToTheLeft(args, nextToken)) {
    return leftArc(1);
  }

  if (heads[currentIndex] === -2) {
    return headlessMarkerStep(args, nextToken);
  }

  const objectIsAssigned = heads.some(
    (head, child) => head === currentIndex && child > currentIndex,
  );
  return objectIsAssigned ? reduce : null;
};

const determinerOrAdjectiveStep = (args: OracleArgs) => {
  const { heads, tokens, stack } = args;
  const {
    feats: { PronType },
  } = tokens[stack[stack.length - 1]];
  if (isNegatedQuantifier(tokens, stack)) {
    return leftArc(1);
  }

  const isBareDeterminer =
    PronType && !isCoordinatedModifier(heads, tokens, stack[stack.length - 2]);
  return isBareDeterminer ? null : adjectiveStep(args);
};

const stepsByTag = new Map<string, (args: OracleArgs) => Transition | null>([
  ["ADV", advStep],
  ["ADJ", determinerOrAdjectiveStep],
  ["VERB", verbStep],
  ["NOUN", nounStep],
]);

const oracle = (args: OracleArgs) => {
  const { stack, tokens } = args;
  if (stack.length < 2) {
    return null;
  }

  trace(
    () =>
      `Oracle at ${args.index} with stack ${JSON.stringify(
        stack,
      )} and heads ${JSON.stringify(args.heads)}`,
  );
  const { xpos } = tokens[stack[stack.length - 1]];
  const lastToken = tokens[stack[stack.length - 2]];
  if (xpos === "PUNCT") {
    return punctuationStep(args);
  }

  if (isDelimiter(lastToken) && !punctSideFinRegExp.test(lastToken.form)) {
    return leftArc(1);
  }

  return (stepsByTag.get(xpos ?? "") ?? markerStep)(args);
};

type PosTagAdjusterArgs = {
  tokens: PartiallyParsedToken[];
  index: number;
  pos: PosWeights;
};

const unitAbbreviations = ({ tokens, index, pos }: PosTagAdjusterArgs) => {
  if (index > 0 && tokens[index].form.toLowerCase() === "in") {
    const {
      feats: { NumType: lastNumType },
    } = tokens[index - 1];
    if (lastNumType != null) {
      return pos;
    }
  }

  delete pos.NOUN;
  return pos;
};

const isPossessiveMark = ({
  form,
  lemma = form.toLowerCase(),
  misc: { pos },
}: Token) => lemma === "be" && pos.MARK;

const isPrecededByDeterminer = (
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  let currentIndex = index - 1;
  while (currentIndex >= 0) {
    const {
      feats: { PronType },
      misc: { pos },
    } = tokens[currentIndex];
    const tags = Object.keys(pos);
    if (tags.length === 1 && pos.ADV) {
      currentIndex -= 1;
    } else {
      return Boolean(tags.length === 1 && pos.ADJ && PronType);
    }
  }

  return false;
};

const followsADeterminerAndClosesThePhrase = (
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  const {
    feats: { PronType },
  } = tokens[index];
  const {
    feats: { PronType: nextPronType },
    misc: { pos: nextPossiblePosTags },
  } =
    index + 1 < tokens.length
      ? tokens[index + 1]
      : { feats: { PronType: undefined }, misc: { pos: { END: 1 } } };
  const aftTags = Object.keys(nextPossiblePosTags ?? {});
  const nextTagClosesThePhrase =
    ["END", "PUNCT", "VERB", "MARK"].includes(aftTags[0]) ||
    (aftTags[0] === "NOUN" && nextPronType === "Prs");
  return (
    !PronType &&
    aftTags.length === 1 &&
    nextTagClosesThePhrase &&
    isPrecededByDeterminer(tokens, index)
  );
};

const isAnUnrecognisedProperNoun = ({
  tokens,
  index,
  pos,
}: PosTagAdjusterArgs) => {
  const {
    form,
    feats: { PronType },
  } = tokens[index];
  return (
    (!PronType &&
      index > 0 &&
      !(pos.NOUN || pos.MARK) &&
      isCapitalizedWord(form)) ||
    (index + 1 < tokens.length && isPossessiveMark(tokens[index + 1]))
  );
};

const forcedNouns = (args: PosTagAdjusterArgs) => {
  const { tokens, index, pos } = args;
  if (followsADeterminerAndClosesThePhrase(tokens, index)) {
    return { NOUN: 1 };
  }

  if (isAnUnrecognisedProperNoun(args)) {
    pos.NOUN = 0.01;
  }

  return pos;
};

const endsInS = /s$/iu;

const genitiveWithoutS = ({ tokens, index, pos }: PosTagAdjusterArgs) => {
  if (index === 0) {
    return pos;
  }

  const { form } = tokens[index];
  const {
    form: lastForm,
    misc: { pos: lastPos },
  } = tokens[index - 1];
  if (
    endsInS.test(lastForm) &&
    lastPos &&
    lastPos.NOUN &&
    !tokens.slice(0, index).some(({ form: opening }) => pairs[opening] === form)
  ) {
    tokens[index].lemma = "be";
    tokens[index].feats = {
      AdpType: "Post",
    };
    return { MARK: 1 };
  }

  return pos;
};

const isMostlyCapitalizedSentence = (tokens: PartiallyParsedToken[]) => {
  const capitalizedTotal = tokens.filter(
    ({ misc: { pos, isOpaque }, form }) =>
      !pos.PUNCT && !isOpaque && isCapitalizedWord(form),
  ).length;
  return capitalizedTotal / tokens.length > 0.7;
};

const hasCapitalizedNeighbour = (
  tokens: PartiallyParsedToken[],
  index: number,
) => {
  const { form: foreForm = "" } = index > 0 ? tokens[index - 1] : {};
  const { form: aftForm = "" } =
    index + 1 < tokens.length ? tokens[index + 1] : {};
  return isCapitalizedWord(foreForm) || isCapitalizedWord(aftForm);
};

const properNouns = ({ tokens, index, pos }: PosTagAdjusterArgs) => {
  const { misc } = tokens[index];
  const isSentenceInitialWithFeature = index === 0 && Boolean(misc.f);
  if (isSentenceInitialWithFeature || isMostlyCapitalizedSentence(tokens)) {
    return pos;
  }

  return !pos.NOUN && hasCapitalizedNeighbour(tokens, index)
    ? { ...pos, NOUN: 0.1 }
    : pos;
};

const clockHours = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

const antemeridiemAbbreviation = ({ tokens, index }: PosTagAdjusterArgs) => {
  if (index === 0) {
    return { VERB: 1 };
  }

  const { form: foreForm, lemma: foreLemma } = tokens[index - 1];

  if (clockHours.includes(foreLemma ?? "") || Number(foreForm) <= 12) {
    return { VERB: 0.1, NOUN: 0.9 };
  }

  return { VERB: 1 };
};

type AdjusterCondition = (token: Token) => boolean;

type Adjuster = (args: PosTagAdjusterArgs) => PosWeights;

const adjusters = [
  [
    ({ form, misc: { pos } }) =>
      isCapitalizedWord(form) && !Object.keys(pos).includes("NOUN"),
    properNouns,
  ],
  [({ form }) => form.toLowerCase() === "am", antemeridiemAbbreviation],
  [
    ({ misc: { pos, isUnit } }) => Boolean(isUnit) && (pos.PUNCT || pos.MARK),
    unitAbbreviations,
  ],
  [
    ({ misc: { pos } }) =>
      Object.keys(pos).some((xpos) =>
        ["MARK", "ADV", "ADJ", "INTJ"].includes(xpos),
      ),
    forcedNouns,
  ],
  [({ form }) => ["'", "’", "`", "´"].includes(form), genitiveWithoutS],
] as [AdjusterCondition, Adjuster][];

const adjustPosTags = (tokens: PartiallyParsedToken[], index: number) => {
  const {
    misc: { pos },
  } = tokens[index];
  return adjusters.reduce(
    (pos, [condition, adjust]) =>
      condition({ ...tokens[index] }) ? adjust({ tokens, index, pos }) : pos,
    pos,
  );
};

const isAmbiguous = ({ xpos, misc: { pos } }: PartiallyParsedToken) =>
  Object.keys(pos).length > 1 && !xpos;

const buildAmbiguousChain = (tokens: PartiallyParsedToken[], index: number) => {
  let currentIndex = index;
  const chain = [];
  while (currentIndex < tokens.length && isAmbiguous(tokens[currentIndex])) {
    chain.push(currentIndex);
    currentIndex += 1;
  }

  return chain;
};

const canBeDisambiguated = (
  tokens: PartiallyParsedToken[],
  chain: number[],
) => {
  const lastChainMember = chain[chain.length - 1];
  const { misc: { pos: nextPossibleTags = { END: 1 } } = {} } =
    lastChainMember + 1 < tokens.length ? tokens[lastChainMember + 1] : {};
  return chain.length > 0 && Object.keys(nextPossibleTags).length === 1;
};

const hasCoordinatingConjunctionChild = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  candidate: number,
) =>
  heads.reduce(childrenOf(candidate), []).some((child) => {
    const {
      xpos,
      feats: { ConjType },
    } = tokens[child];
    if (xpos !== "MARK" || ConjType !== "Coor") {
      return false;
    }

    return heads.reduce(childrenOf(child), []).some((grandchild) => {
      const conjunct = tokens[grandchild];
      return (
        conjunct.xpos === "VERB" &&
        heads.reduce(childrenOf(grandchild), []).some((id) => {
          const {
            xpos: subjectTag,
            feats: { PronType },
          } = tokens[id];
          return id < grandchild && subjectTag === "NOUN" && PronType !== "Rel";
        })
      );
    });
  });

const hasLeadingMarkerChild = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  candidate: number,
) =>
  heads.reduce(childrenOf(candidate), []).some((child) => {
    const {
      xpos,
      feats: { ConjType },
    } = tokens[child];
    if (child >= candidate || xpos !== "MARK" || ConjType === "Coor") {
      return false;
    }

    return !heads
      .reduce(childrenOf(child), [])
      .some((grandchild) => tokens[grandchild].xpos === "NOUN");
  });

type RootSearch = {
  heads: number[];
  stack: number[];
  tokens: PartiallyParsedToken[];
};

const findSubject = (
  { heads, stack, tokens }: RootSearch,
  candidate: number,
) => {
  const isSubjectNoun = (index: number) =>
    tokens[index].xpos === "NOUN" && tokens[index].feats.PronType !== "Rel";
  const attachedSubject = heads
    .reduce(childrenOf(candidate), [])
    .find((child) => child < candidate && isSubjectNoun(child));
  if (attachedSubject != null) {
    return attachedSubject;
  }

  const precedingStackEntry = stack[stack.indexOf(candidate) - 1];
  return precedingStackEntry != null && isSubjectNoun(precedingStackEntry)
    ? precedingStackEntry
    : undefined;
};

const isUnambiguouslyFinite = ({
  feats: { Tense, VerbForm },
}: PartiallyParsedToken) =>
  VerbForm !== "Part" && !(Tense === "Past" && VerbForm !== "Fin");

const hasPronounSubject = (search: RootSearch, candidate: number) => {
  const subject = findSubject(search, candidate);
  return subject != null && search.tokens[subject].feats.PronType === "Prs";
};

const isSolidRoot = (search: RootSearch, candidate: number) =>
  hasPronounSubject(search, candidate) ||
  isUnambiguouslyFinite(search.tokens[candidate]);

const parentheticalPredicateLemmas = [
  "say",
  "ask",
  "reply",
  "answer",
  "whisper",
  "mutter",
  "murmur",
  "add",
  "continue",
  "explain",
  "remark",
  "note",
  "shout",
  "call",
  "cry",
  "sigh",
  "think",
  "muse",
  "wonder",
  "announce",
  "declare",
  "insist",
  "admit",
  "confess",
  "offer",
  "interrupt",
  "snap",
  "laugh",
  "repeat",
  "recall",
  "report",
  "believe",
  "guess",
  "suppose",
  "hope",
  "bet",
  "gather",
  "assume",
  "reckon",
  "figure",
];

const evidentialAdjectiveLemmas = ["certain", "sure", "positive", "confident"];

const lemmaOf = ({ lemma, form }: PartiallyParsedToken) =>
  lemma ?? form.toLowerCase();

const isParentheticalPredicate = (
  heads: number[],
  tokens: PartiallyParsedToken[],
  candidate: number,
) => {
  if (parentheticalPredicateLemmas.includes(lemmaOf(tokens[candidate]))) {
    return true;
  }

  if (lemmaOf(tokens[candidate]) !== "be") {
    return false;
  }

  return heads.reduce(childrenOf(candidate), []).some((child) => {
    const { xpos } = tokens[child];
    return (
      xpos === "ADJ" &&
      evidentialAdjectiveLemmas.includes(lemmaOf(tokens[child]))
    );
  });
};

const isCompellingReplacement = (
  search: RootSearch,
  chosen: number,
  next: number,
) => {
  const { heads, tokens } = search;
  return (
    (hasPronounSubject(search, next) &&
      !isParentheticalPredicate(heads, tokens, next)) ||
    (findSubject(search, next) != null && findSubject(search, chosen) == null)
  );
};

const replacesTheChosenRoot = (
  search: RootSearch,
  chosen: number,
  next: number,
) => {
  const { heads, tokens } = search;
  return (
    hasCommaBetween(tokens, chosen, next) &&
    !hasCoordinatingConjunctionChild(heads, tokens, next) &&
    !hasLeadingMarkerChild(heads, tokens, next) &&
    isCompellingReplacement(search, chosen, next)
  );
};

const chooseVerbRoot = (search: RootSearch, candidates: number[]) => {
  const { heads, tokens } = search;
  const eligibleStart = candidates.findIndex(
    (candidate) => !hasLeadingMarkerChild(heads, tokens, candidate),
  );
  const start = eligibleStart === -1 ? 0 : eligibleStart;
  let chosen = candidates[start];
  let indexInCandidates = start + 1;
  while (
    indexInCandidates < candidates.length &&
    !isSolidRoot(search, chosen)
  ) {
    const next = candidates[indexInCandidates];
    if (replacesTheChosenRoot(search, chosen, next)) {
      chosen = next;
    }

    indexInCandidates += 1;
  }

  return chosen;
};

const findBestRoot = (search: RootSearch) => {
  const { heads, stack, tokens } = search;
  let tagIndex = 0;
  while (tagIndex < rootTagsOrdered.length) {
    const rootTag = rootTagsOrdered[tagIndex];
    const candidates = stack.filter(
      (index) => heads[index] === -2 && tokens[index].xpos === rootTag,
    );
    if (candidates.length > 0) {
      return rootTag === "VERB"
        ? chooseVerbRoot(search, candidates)
        : candidates[0];
    }

    tagIndex += 1;
  }

  return 0;
};

type HeadMatchers = {
  left: (index: number) => boolean;
  right: (index: number) => boolean;
};

const findClosestWithMatchers = (
  heads: number[],
  stack: number[],
  indexInStack: number,
  matches: HeadMatchers,
) => {
  const index = stack[indexInStack];
  const reverseLeftStack = stack.slice(0, indexInStack).reverse();
  const rightStack = stack.slice(indexInStack + 1);
  const leftHeadOffset = reverseLeftStack.findIndex(
    (headIndex) =>
      matches.left(headIndex) && !isAncestor(heads, headIndex, index),
  );
  const rightHeadOffset = rightStack.findIndex(
    (headIndex) =>
      matches.right(headIndex) && !isAncestor(heads, headIndex, index),
  );
  if (leftHeadOffset === -1 && rightHeadOffset === -1) {
    return null;
  }

  if (leftHeadOffset === -1 && rightHeadOffset !== -1) {
    return stack[indexInStack + 1 + rightHeadOffset];
  }

  if (leftHeadOffset !== -1 && rightHeadOffset === -1) {
    return stack[indexInStack - 1 - leftHeadOffset];
  }

  return rightHeadOffset > leftHeadOffset
    ? stack[indexInStack - 1 - leftHeadOffset]
    : stack[indexInStack + 1 + rightHeadOffset];
};

type HeadSearch = {
  root: number;
  heads: number[];
  stack: number[];
  tokens: TaggedToken[];
};

const findClosestMarkerHead = (
  { heads, stack, tokens }: HeadSearch,
  indexInStack: number,
) => {
  const childTags = heads
    .reduce(childrenOf(stack[indexInStack]), [])
    .map((child) => tokens[child].xpos);
  const headTags = childTags.includes("VERB")
    ? ["VERB"]
    : childTags.includes("NOUN")
      ? ["VERB", "NOUN"]
      : ["VERB", "NOUN", "MARK"];
  return findClosestWithMatchers(heads, stack, indexInStack, {
    left: (index) => headTags.includes(tokens[index].xpos),
    right: () => false,
  });
};

const findClosestVerbHead = (
  { heads, stack, tokens }: HeadSearch,
  indexInStack: number,
) =>
  findClosestWithMatchers(heads, stack, indexInStack, {
    left: (candidateIndex) => {
      const candidate = tokens[candidateIndex];
      return (
        candidate.xpos === "MARK" &&
        translativeDegree(candidate) === 2 &&
        !heads
          .reduce(childrenOf(candidateIndex), [])
          .some((child) => tokens[child].xpos === "VERB")
      );
    },
    right: () => false,
  });

const findClosestHead = (search: HeadSearch, indexInStack: number) => {
  const { root, heads, stack, tokens } = search;
  const { xpos } = tokens[stack[indexInStack]];
  const isNominalHead = (index: number) =>
    ["MARK", "VERB", "NOUN"].includes(tokens[index].xpos);
  if (["ADJ", "ADV"].includes(xpos)) {
    return findClosestWithMatchers(heads, stack, indexInStack, {
      left: isNominalHead,
      right: (index) => ["MARK", "NOUN"].includes(tokens[index].xpos),
    });
  }

  if (xpos === "NOUN") {
    return findClosestWithMatchers(heads, stack, indexInStack, {
      left: isNominalHead,
      right: isNominalHead,
    });
  }

  if (xpos === "MARK") {
    return findClosestMarkerHead(search, indexInStack);
  }

  return xpos === "VERB"
    ? (findClosestVerbHead(search, indexInStack) ?? root)
    : null;
};

const settleUnambiguousTags = (tokens: PartiallyParsedToken[]) => {
  tokens.forEach((_token, index) => {
    tokens[index].misc.pos = adjustPosTags(tokens, index);
    const pos = Object.keys(tokens[index].misc.pos) as PosTag[];
    if (pos.length === 1) {
      [tokens[index].xpos] = pos;
    }
  });
};

const runTransitions = (
  { heads, stack, tokens }: ParseState,
  index: number,
) => {
  let iteration = 0;
  let transition = oracle({ heads, stack, tokens, index });
  trace(
    () => `Stack: ${JSON.stringify(stack)} Heads: ${JSON.stringify(heads)}`,
  );
  while (transition != null && iteration < tokens.length) {
    transition(heads, tokens, stack);
    trace(
      () =>
        `Updated stack: ${JSON.stringify(stack)} Heads: ${JSON.stringify(
          heads,
        )}`,
    );
    iteration += 1;
    transition = oracle({ heads, stack, tokens, index });
  }
};

const tagAndParseAt = (
  state: ParseState,
  weights: FeatureWeights,
  index: number,
) => {
  const { tokens, stack } = state;
  if (tokens[index].xpos !== "INTJ") {
    stack.push(index);
  }

  const ambiguousChain = buildAmbiguousChain(tokens, index);
  trace(
    () =>
      `Ambiguous chain at ${index} ${tokens[index].form}: ${JSON.stringify(
        ambiguousChain,
      )}; pos tags: ${JSON.stringify(
        tokens[index].misc.pos,
      )}; assigned xpos: ${tokens[index].xpos}`,
  );

  if (canBeDisambiguated(tokens, ambiguousChain)) {
    trace(() => `Can disambiguate chain ${JSON.stringify(ambiguousChain)}`);
    tagChain(weights, ambiguousChain, state);
  }

  trace(() => `Tag: ${tokens[index].xpos}`);
  runTransitions(state, index);
};

const tag = (baseTokens: Token[], weights: FeatureWeights) => {
  const tokens: PartiallyParsedToken[] = baseTokens;
  const state: ParseState = {
    tokens,
    heads: new Array<number>(tokens.length).fill(-2),
    stack: [],
  };
  settleUnambiguousTags(tokens);
  for (let index = 0; index < tokens.length; index += 1) {
    tagAndParseAt(state, weights, index);
  }

  return {
    heads: state.heads,
    stack: state.stack,
    tokens: tokens as TaggedToken[],
  };
};

const isThirdPersonSForm = (form: string, lemma: string) => {
  const surface = form.toLowerCase();
  const base = lemma.toLowerCase();
  return (
    surface === `${base}s` ||
    surface === `${base}es` ||
    (base.endsWith("y") && surface === `${base.slice(0, -1)}ies`)
  );
};

const agreesWithASingularSubject = ({
  xpos,
  form,
  lemma,
  feats: { Person, Tense, VerbForm },
}: ParsedToken) =>
  xpos === "VERB" &&
  Person === 3 &&
  Tense === "Pres" &&
  VerbForm === "Fin" &&
  lemma != null &&
  isThirdPersonSForm(form, lemma);

const numberVerbsByTheirSuffix = (tokens: ParsedToken[]) =>
  tokens.forEach((token) => {
    if (agreesWithASingularSubject(token)) {
      token.feats.Number = "Sing";
    }
  });

const parseWhole = (
  tokens: Token[],
  weights: FeatureWeights,
): ParsedToken[] => {
  const { heads, stack, tokens: taggedTokens } = tag(tokens, weights);
  const root =
    stack.length > 0
      ? findBestRoot({ heads, stack, tokens: taggedTokens })
      : heads.findIndex((head) => head === -2);
  heads[root] = -1;

  const headSearch = { root, heads, stack, tokens: taggedTokens };
  stack.forEach((index, indexInStack) => {
    if (heads[index] !== -2) {
      return;
    }

    const closestHead = findClosestHead(headSearch, indexInStack);
    if (closestHead != null) {
      addToParse(heads, taggedTokens, closestHead, index);
    }
  });
  const headless = taggedTokens.reduce(
    (headless: number[], _token: PartiallyParsedToken, index: number) =>
      index === root || heads[index] !== -2 ? headless : [...headless, index],
    [],
  );

  trace(() => `Assigning root. Stack: ${JSON.stringify(stack)}`);
  headless.forEach((headlessChild) =>
    addToParse(heads, taggedTokens, root, headlessChild),
  );

  taggedTokens.forEach((t, index) => {
    const token = t as ParsedToken;
    const head = heads[index];
    token.head = head;
    if (!token.misc.children) {
      token.misc.children = [];
    }

    if (head !== -1) {
      const { misc: parent } = taggedTokens[head] as ParsedToken;
      if (parent.children) {
        parent.children.push(index);
      } else {
        parent.children = [index];
      }
    }
  });

  numberVerbsByTheirSuffix(taggedTokens as ParsedToken[]);
  return taggedTokens as ParsedToken[];
};

type Aside = { open: number; close: number };

const isWord = ({ feats: { PunctType } }: Token) => PunctType == null;

const closingBracketOf = (tokens: Token[], open: number) => {
  let depth = 0;
  return tokens.findIndex(({ form }, index) => {
    if (index < open) {
      return false;
    }

    depth += Number(form === "(") - Number(form === ")");
    return depth === 0;
  });
};

const SHORTEST_CLAUSE = 3;

const isMostlyAVerb = ({ misc: { pos } }: Token) =>
  Number(pos?.VERB ?? 0) >= 0.5;

const holdsAClause = (inside: Token[]) =>
  inside.filter(isWord).length >= SHORTEST_CLAUSE &&
  inside.filter(isWord).slice(1).some(isMostlyAVerb);

const asideIn = (tokens: Token[]): Aside | undefined => {
  const open = tokens.findIndex(({ form }) => form === "(");
  const close = open === -1 ? -1 : closingBracketOf(tokens, open);
  const inside = tokens.slice(open + 1, Math.max(close, 0));
  const leavesAWord = [
    ...tokens.slice(0, Math.max(open, 0)),
    ...tokens.slice(close + 1),
  ].some(isWord);
  return close > open && holdsAClause(inside) && leavesAWord
    ? { open, close }
    : undefined;
};

const range = (from: number, to: number) =>
  Array.from({ length: Math.max(to - from, 0) }, (_, offset) => from + offset);

const moved = (parsed: ParsedToken[], places: number[]) =>
  parsed.forEach((token) => {
    token.head = token.head === -1 ? -1 : places[token.head];
    token.misc.children = token.misc.children.map((child) => places[child]);
  });

const hostOf = (tokens: ParsedToken[], open: number, root: number) => {
  const before = range(0, open)
    .reverse()
    .find((index) => isWord(tokens[index]));
  return before ?? root;
};

const hung = (tokens: ParsedToken[], child: number, head: number) => {
  tokens[child].head = head;
  tokens[child].misc.children = tokens[child].misc.children ?? [];
  tokens[head].misc.children.push(child);
  tokens[head].misc.children.sort((one, other) => one - other);
};

const numbered = (tokens: Token[], places: number[]) =>
  places.map((place, id) => {
    tokens[place].id = id;
    return tokens[place];
  });

type Parse = (tokens: Token[]) => ParsedToken[];

const parseAroundAside = (
  tokens: Token[],
  { open, close }: Aside,
  parseEach: Parse,
): ParsedToken[] => {
  const inside = range(open + 1, close);
  const outside = [...range(0, open), ...range(close + 1, tokens.length)];
  const outer = parseEach(numbered(tokens, outside));
  const inner = parseEach(numbered(tokens, inside));
  const outerRoot = outside[outer.findIndex(({ head }) => head === -1)];
  const innerRoot = inside[inner.findIndex(({ head }) => head === -1)];
  moved(outer, outside);
  moved(inner, inside);
  const whole = numbered(tokens, range(0, tokens.length)) as ParsedToken[];
  whole[open].xpos = "PUNCT";
  whole[close].xpos = "PUNCT";
  whole[open].misc.children = [];
  whole[close].misc.children = [];
  hung(whole, innerRoot, hostOf(whole, open, outerRoot));
  hung(whole, open, innerRoot);
  hung(whole, close, innerRoot);
  return whole;
};

const parseSentence = (
  tokens: Token[],
  weights: FeatureWeights,
): ParsedToken[] => {
  const aside = asideIn(tokens);
  return aside == null
    ? parseWhole(tokens, weights)
    : parseAroundAside(tokens, aside, (part) => parseSentence(part, weights));
};

export default function (
  tokens: Token[],
  { weights = {} }: { weights?: FeatureWeights } = {},
): ParsedToken[] {
  return parseSentence(tokens, weights);
}
