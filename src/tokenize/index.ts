import type {
  Dictionary,
  LexicalFeatures,
  LexicalProps,
  MiscProps,
  MiscLexicalProps,
  Token,
  MiscContextProps,
} from "../types.js";
import lemmatize from "../lemmatize/index.js";

type LexicalToken = {
  feats: LexicalFeatures;
  misc: MiscLexicalProps;
  lemma?: string;
};

type ContextualToken = LexicalToken & {
  form: string;
  misc: MiscProps & {
    at: number;
  };
};

type WeightMap = {
  [key: string]: number;
};

type KeyedObject = {
  [key: string]: unknown;
};

const numberRegExp = /-?\d+(?:[.,]\d+)*(?:[eE][+-]?\d+)?/g;
const strayNumberRegExp = /\d+/g;
const ordinalRegExp = /\d+(?:st|nd|rd|(?:t?ie)?th)/gi;
const datetimeRegExp =
  /\b(\d{4})-?(0[1-9]|1[0-2])-?([12]\d|3[01]|0[1-9])T([01][0-9]|2[0-3])(?::?([0-5][0-9])(?::?([0-5][0-9])(?:\.(\d+))?)?)?(Z|([+-][01][0-9]|2[0-3])(?::?([0-5][0-9]))?)?\b/gi;
const dateRegExp =
  /\b((\d{4})[-/.,]{1,2}(0?[1-9]|1[0-2])[-/.,]{1,2}([12]\d|3[01]|0?[1-9])\b|([12]\d|3[01]|0?[1-9])[-/.,]{1,2}(0?[1-9]|1[0-2])[-/.,]{1,2}(\d{4})|(0?[1-9]|1[0-2])[-/.,]{1,2}([12]\d|3[01]|0?[1-9])[-/.,]{1,2}(\d{4}))/g;
const monthRegExp =
  /\b((\d{4})[-/.,]{1,2}(0?[1-9]|1[0-2])|(0?[1-9]|1[0-2])[-/.,]{1,2}(\d{4}))\b/g;
const timeRegExp =
  /\b([01]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9])(?:\.(\d+))?)?\b/g;
const postcodeRegExp =
  /\b([A-Z]{1,4}\d{1,3}[A-Z]?[\\-]?\d?[A-Z]{0,4}\d?|\d{3,5}([\\-]\d{4,5}))\b/g;
const telephoneRegExp =
  /(?:\+(1|2(?:[07]|1[1-368]|[236][0-9]|4[0-689]|5[0-8]|9[017-9])|3(?:[0-469]|5[0-9]|7[0-8]|8[0-35-79])|4(?:[013-9]|2[013])|5(?:[1-8]|[09][0-9])|6(?:[0-6]|7[02-9]|8[0-35-9]|9[0-2])|7|8(?:[1246]|5[02356]|8[06])|9(?:[0-58]|6[0-8]|7[0-7]|9[2-68]))[1-9]\d{3,13}|\d{5,15})/g;
const emailRegExp =
  /((\b[^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z-0-9]+\.)+[a-zA-Z]{2,}))/gi;
const urlRegExp =
  /(([a-zA-Z+.\d/:-]+:\/{1,3}[a-z\d:]+)([-._~:/?#[\]@!$&'()*+,;=%][%?]?\w+)*|([./]*[a-zA-Z:]+[@:.]([-._~:/?#[\]@!$&'()*+,;=%]?\w+)+))=?/g;
const hashtagRegExp = /#[^\s\p{Ps}\p{Pe}\p{Pi}\p{Pf}\p{Term}]+/gu;
const mentionRegExp = /@[\d\w]+\b/g;
const currencyRegExp = /\p{Sc}/gu;

const specialPunctuatedNounsRegExp =
  /(?:(M(rs?|iss)|Hon|St|Dr?)\.|°[CF]|\p{Lu}+[²³]|#\p{L}+)/giu;
const acronymRegExp =
  /\b\p{L}+(?:\.\p{L}+)+\.|\b\p{L}+[-.&](?:\p{L}+(?:[-.&](?=\p{L})|\b))+/gu;

const punctuationRegExp = /\.+|\\{1,2}n|\p{P}/gu;

const symbolRegExp = /&(?:[a-z]+|#\d+);|[#%&*\\^/\p{S}\p{Pc}]/giu;

const unhyphenatedWordRegExp = /\p{L}+/giu;

const beforeApostropheCharacters = `(?:[abcdefghijklmnpqrstuvwxyz]\\p{L}*|[o]\\p{L}+)`;
const apostropheCharacters = `['\`´’＇]`;
const afterApostropheCharacters = `((s|m|ve|ll|re|d)\\p{L}+\\b|([abcefghijknopqtuwxyz]\\p{L}*)|ve\\p{L}+|ll\\p{L}+|re\\p{L}+)`;

const midApostropheWordRegExp = RegExp(
  `${beforeApostropheCharacters}${apostropheCharacters}${afterApostropheCharacters}`,
  "giu",
);

const tokenRegExp = /\p{L}[\p{L}\p{N}]*(?:[\p{Pc}-][\p{L}\p{N}]+)+/giu;

const emojiKeycapSequence = `[#*0-9]\uFE0F\u20E3`;
const emojiFlagSequence = `\\p{RI}{2}`;
const emojiTagSequence = `\u{1F3F4}[\u{E0030}-\u{E0039}\u{E0061}-\u{E007A}]{4,5}\u{E007F}`;
const emojiModifierSequence = `\\p{EBase}\\p{EMod}`;
const emojiPresentationSequence = `\\p{Emoji}\uFE0F`;
const emojiZwjElement = `${emojiModifierSequence}?|${emojiPresentationSequence}|\\p{Emoji}`;
const emojiZwjSequence = `(?:${emojiZwjElement})(?:\u200D(?:${emojiZwjElement}))*`;
const emojiSequenceRegExp = RegExp(
  `${emojiKeycapSequence}|${emojiFlagSequence}|${emojiTagSequence}|${emojiZwjSequence}`,
  "giu",
);

const emoticonSymbols = `-%&@=′'*:;<>|?^(){}`;
const emoticonCharacters = `dDpPoOcl38`;
const emoticon = `(?:\\b[${emoticonCharacters}][${emoticonSymbols}]+|[${emoticonSymbols}]{2,}|[${emoticonSymbols}]+[${emoticonCharacters}](?:[${emoticonSymbols}]|\\b))|\\( '\\}\\{' \\)`;

const interjection = `\\b(?:u?h?m+|[eg]r+m*|e+w+|[aou]{2,}g*h*|(?:h[ae]){2,})\\b`;

const interjectionRegExp = RegExp(`${emoticon}|${interjection}`, "giu");

const specialContractions = `let${apostropheCharacters}s\\b`;
const specialContractionRegExp = RegExp(specialContractions, "gi");
const contractionsRegExp = RegExp(
  `${apostropheCharacters}(s|m|ve|ll|re|d|t)\\b`,
  "gi",
);

const adjacentWordCharactersRegExp = /[-_#*]+/;
const aphostropheAltRegExp = /[`´’]+/;

const patternsToTokens: [
  RegExp,
  { feats?: LexicalFeatures; misc?: MiscLexicalProps },
][] = [
  [emojiSequenceRegExp, { misc: { pos: { INTJ: 1 } } }],
  [interjectionRegExp, { misc: { pos: { INTJ: 1 } } }],
  [contractionsRegExp, {}],
  [specialContractionRegExp, {}],
  [hashtagRegExp, { misc: { isOpaque: true } }],
  [mentionRegExp, { misc: { pos: { INTJ: 1, NOUN: 1 }, isOpaque: true } }],
  [specialPunctuatedNounsRegExp, { misc: { pos: { NOUN: 1 } } }],
  [currencyRegExp, { misc: { pos: { NOUN: 1 } } }],
  [
    numberRegExp,
    {
      feats: { NumType: "Card" },
      misc: { pos: { NOUN: 1, ADJ: 1 } },
    },
  ],
  [
    strayNumberRegExp,
    {
      feats: { NumType: "Card" },
      misc: { pos: { NOUN: 1, ADJ: 1 } },
    },
  ],
  [
    ordinalRegExp,
    {
      feats: { NumType: "Ord" },
      misc: { pos: { NOUN: 1, ADJ: 1 } },
    },
  ],
  [emailRegExp, { misc: { pos: { NOUN: 1 }, isOpaque: true } }],
  [urlRegExp, { misc: { pos: { NOUN: 1 }, isOpaque: true } }],
  [datetimeRegExp, { misc: { pos: { NOUN: 1 } } }],
  [dateRegExp, { misc: { pos: { NOUN: 1 } } }],
  [monthRegExp, { misc: { pos: { NOUN: 1 } } }],
  [timeRegExp, { misc: { pos: { NOUN: 1 } } }],
  [postcodeRegExp, { misc: { pos: { NOUN: 1 }, isOpaque: true } }],
  [telephoneRegExp, { misc: { pos: { NOUN: 1 }, isOpaque: true } }],
  [acronymRegExp, { misc: { pos: { NOUN: 1 } } }],
  [unhyphenatedWordRegExp, {}],
  [midApostropheWordRegExp, {}],
  [tokenRegExp, {}],
  [symbolRegExp, { misc: { pos: { INTJ: 1 } } }],
  [punctuationRegExp, { misc: { pos: { PUNCT: 1 } } }],
];

const defined = <T extends object>(props: T): T => {
  const result = {} as T;
  for (const key in props) {
    if (props[key] !== undefined) {
      result[key] = props[key];
    }
  }

  return result;
};

const createToken = ({
  AdpType,
  Case,
  ConjType,
  Degree,
  Mood,
  NumType,
  Number,
  Person,
  Poss,
  PronType,
  PunctType,
  Reflex,
  Tense,
  VerbForm,

  f,
  fused,
  isOpaque,
  isUnit,
  pos,
  prepPairs,

  lemma,
}: LexicalProps = {}): LexicalToken => {
  const token: LexicalToken = {
    feats: defined<LexicalFeatures>({
      AdpType,
      Case,
      ConjType,
      Degree,
      Mood,
      NumType,
      Number,
      Person,
      Poss,
      PronType,
      PunctType,
      Reflex,
      Tense,
      VerbForm,
    }),
    misc: defined<MiscLexicalProps>({
      f,
      fused,
      isOpaque,
      isUnit,
      pos: pos && { ...pos },
      prepPairs: prepPairs && { ...prepPairs },
    }),
  };
  if (lemma) {
    token.lemma = lemma;
  }

  return token;
};

const independentContractions = `${apostropheCharacters}(s|m|ve|ll|re|d)`;

const combinePos = (a: WeightMap = {}, b: WeightMap = {}) => {
  for (const pos in b) {
    if (b[pos] !== undefined && a[pos] == null) {
      a[pos] = b[pos];
    }
  }

  return a;
};

const merge = (a?: KeyedObject, b?: KeyedObject): KeyedObject => {
  if (!a) {
    return b ?? {};
  }

  if (!b) {
    return a;
  }

  for (const prop in b) {
    if (b[prop] !== undefined) {
      a[prop] = b[prop];
    }
  }

  return a;
};

const matchedTokens = (text: string): ContextualToken[] =>
  patternsToTokens.reduce((tokens, [pattern, { misc, feats }]) => {
    let match = pattern.exec(text);
    const { pos = {}, ...miscProps } = misc ?? {};

    while (match != null) {
      tokens.push({
        form: match[0].trim(),
        misc: { at: match.index, pos: { ...pos }, ...miscProps },
        feats: feats ?? {},
      });
      match = pattern.exec(text);
    }

    return tokens;
  }, [] as ContextualToken[]);

const byPositionThenLength = (a: ContextualToken, b: ContextualToken) =>
  a.misc.at - b.misc.at || b.form.length - a.form.length;

const mergedInto = (
  replaced: ContextualToken,
  token: ContextualToken,
): ContextualToken => {
  const {
    feats,
    misc: { pos, prepPairs, ...misc },
    ...props
  } = token;
  const mergedMisc = merge(merge(replaced.misc, misc), {
    pos: combinePos(replaced.misc.pos, pos),
    prepPairs: merge(replaced.misc.prepPairs, prepPairs),
  });

  return {
    ...(merge(replaced, props) as ContextualToken),
    feats: merge(replaced.feats, feats) as LexicalFeatures,
    misc: mergedMisc as MiscContextProps,
  };
};

const stripsAnIndependentContraction = (
  replacedWord: string,
  replacementWord: string,
) =>
  !RegExp(specialContractions, "iu").test(replacedWord) &&
  RegExp(`\\w${apostropheCharacters}\\w`, "iu").test(replacedWord) &&
  replacementWord ===
    replacedWord.replace(RegExp(`${independentContractions}$`, "iu"), "");

const atSamePosition = (
  filtered: ContextualToken[],
  token: ContextualToken,
  replacedIndex: number,
) => {
  const replacedToken = filtered[replacedIndex];
  if (replacedToken.form.length === token.form.length) {
    filtered[replacedIndex] = mergedInto(replacedToken, token);
  }

  if (stripsAnIndependentContraction(replacedToken.form, token.form)) {
    filtered[replacedIndex] = token;
  }

  return filtered;
};

const splitsANegativeNumber = (
  filtered: ContextualToken[],
  replacedPosition: number,
  replacedWord: string,
) => {
  const {
    misc: { at: preReplacedPosition },
    form: preReplacedWord,
  } =
    filtered.length - 2 >= 0
      ? filtered[filtered.length - 2]
      : { misc: { at: 0 }, form: "" };
  return (
    replacedPosition === preReplacedPosition + preReplacedWord.length &&
    /\d$/iu.test(preReplacedWord) &&
    /^-\d/iu.test(replacedWord)
  );
};

const overlapping = (
  text: string,
  filtered: ContextualToken[],
  token: ContextualToken,
  replacedIndex: number,
) => {
  const {
    misc: { at: replacedPosition },
    form: replacedWord,
  } = filtered[replacedIndex];
  if (splitsANegativeNumber(filtered, replacedPosition, replacedWord)) {
    filtered[replacedIndex] = {
      form: text.slice(replacedPosition, replacedPosition + 1),
      misc: { at: replacedPosition, pos: {} },
      feats: {},
    };
    filtered.push(token);
  }

  return filtered;
};

const overlaps = (replaced: ContextualToken, token: ContextualToken) =>
  token.misc.at < replaced.misc.at + replaced.form.length &&
  replaced.misc.at < token.misc.at + token.form.length;

const withoutOverlaps = (text: string) => (tokens: ContextualToken[]) =>
  tokens.reduce((filtered, token) => {
    if (filtered.length === 0) {
      return [token];
    }

    const replacedIndex = filtered.length - 1;
    const replaced = filtered[replacedIndex];
    if (token.misc.at === replaced.misc.at) {
      return atSamePosition(filtered, token, replacedIndex);
    }

    if (overlaps(replaced, token)) {
      return overlapping(text, filtered, token, replacedIndex);
    }

    filtered.push(token);
    return filtered;
  }, [] as ContextualToken[]);

const normalizedForm = (form: string) =>
  form.length <= 1
    ? form.toLowerCase()
    : form
        .toLowerCase()
        .replace(adjacentWordCharactersRegExp, "")
        .replace(aphostropheAltRegExp, "'");

const withDictionaryEntry =
  (dictionary: Dictionary) =>
  (token: ContextualToken): Token => {
    const { form } = token;
    const formToken = createToken(dictionary.get(form));
    const {
      feats,
      misc: { fused, pos, prepPairs, ...misc },
      ...props
    } = createToken(dictionary.get(normalizedForm(form)));
    const miscMergedProps = merge(merge(misc, formToken.misc), token.misc);

    const mergedToken = {
      ...merge(merge(props, formToken), token),
      feats: merge(merge(feats, formToken.feats), token.feats),
      misc: {
        ...miscMergedProps,
        ...(!adjacentWordCharactersRegExp.test(form) && fused ? { fused } : {}),
        pos: combinePos(combinePos(pos, formToken.misc.pos), token.misc.pos),
        prepPairs: merge(
          merge(prepPairs, formToken.misc.prepPairs),
          token.misc.prepPairs,
        ),
      },
    } as Token;

    if (mergedToken.misc.pos.INTJ && mergedToken.feats.NumType === "Card") {
      delete mergedToken.misc.pos.INTJ;
    }

    if (Object.keys(mergedToken.misc.prepPairs ?? {}).length === 0) {
      delete mergedToken.misc.prepPairs;
    }

    return mergedToken;
  };

const splitFused = (token: Token): ContextualToken[] => {
  const {
    form: fusedForm,
    misc: { at, fused },
  } = token;
  if (fused == null) {
    return [token];
  }

  let offsetInToken = 0;
  const normalizedFusedWord = fusedForm.replace(aphostropheAltRegExp, "'");
  return fused.reduce((splitTokens, { fragment, information }) => {
    const match = RegExp(fragment, "iu").exec(
      normalizedFusedWord.slice(offsetInToken),
    );

    if (match == null) {
      return splitTokens;
    }

    const { index: fragmentOffset } = match;
    const fragmentAt = at + offsetInToken + fragmentOffset;
    const form = fusedForm.substring(
      offsetInToken + fragmentOffset,
      offsetInToken + fragmentOffset + fragment.length,
    );
    offsetInToken += fragmentOffset + fragment.length;
    const fragmentToken = createToken(information) as ContextualToken;
    fragmentToken.misc.at = fragmentAt;
    return splitTokens.concat({ ...fragmentToken, form });
  }, [] as ContextualToken[]);
};

const withLemma =
  (dictionary: Dictionary) => (token: ContextualToken, id: number) => {
    const { form, misc } = token;
    if (Object.keys(misc.pos ?? {}).length > 0) {
      return { id, ...token };
    }

    const { lemma, pos, feats = {} } = lemmatize(form, { dictionary });
    return { id, ...token, lemma, misc: { ...misc, pos }, feats };
  };

export default function (
  text: string,
  { dictionary }: { dictionary: Dictionary },
): Token[] {
  const distinct = withoutOverlaps(text)(
    matchedTokens(text).sort(byPositionThenLength),
  );
  return distinct
    .map(withDictionaryEntry(dictionary))
    .flatMap(splitFused)
    .map(withLemma(dictionary));
}
