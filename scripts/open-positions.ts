import parse from "../src/parse/index.js";
import tokenize from "../src/tokenize/index.js";
import { setTagAuditSink, type TagEvent } from "../src/tag/audit.js";
import type { Dictionary, ParsedToken, PosTag } from "../src/types.js";
import type { Ambiguity } from "./tagging-prompt.js";

export const rulesOnlyPass = (text: string, dictionary: Dictionary) => {
  const events: TagEvent[] = [];
  setTagAuditSink((event) => events.push(event));
  const tokens = parse(tokenize(text, { dictionary }));
  setTagAuditSink(null);

  const candidatesByIndex = new Map<number, PosTag[]>();
  events.forEach((event) => {
    if (event.type === "chose") {
      candidatesByIndex.set(event.index, event.tags);
    }
  });
  return { tokens, candidatesByIndex };
};

const ambiguitiesOf = (
  tokens: ParsedToken[],
  candidatesByIndex: Map<number, PosTag[]>,
): Ambiguity[] =>
  tokens.flatMap((token, index) => {
    const candidates = candidatesByIndex.get(index);
    return token.isDisambiguated && candidates != null && candidates.length > 1
      ? [{ index, form: token.form, candidates }]
      : [];
  });

export const rulesOnlyAmbiguities = (text: string, dictionary: Dictionary) => {
  const { tokens, candidatesByIndex } = rulesOnlyPass(text, dictionary);
  return { tokens, ambiguities: ambiguitiesOf(tokens, candidatesByIndex) };
};
