import featurize from "./featurize/index.js";
import inflect from "./inflect/index.js";
import lemmatize from "./lemmatize/index.js";
import parse from "./parse/index.js";
import sentencize from "./sentencize/index.js";
import tag from "./tag/index.js";
import tokenize from "./tokenize/index.js";
import {
  setTagAuditSink,
  type TagEvent,
  type TagVerdict,
} from "./tag/audit.js";
import { setTracing } from "./trace.js";
import type { Dictionary, FeatureWeights, ParsedToken } from "./types.js";

export default function (
  text: string,
  { dictionary, weights }: { dictionary: Dictionary; weights?: FeatureWeights },
): ParsedToken[][] {
  return sentencize(tokenize(text, { dictionary })).map((tokens) =>
    parse(tokens, { weights }),
  );
}

export {
  featurize,
  inflect,
  lemmatize,
  parse,
  sentencize,
  setTagAuditSink,
  setTracing,
  tag,
  tokenize,
};
export type { TagEvent, TagVerdict };
export * from "./types.js";
