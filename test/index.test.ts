import assert from "node:assert/strict";
import { describe, it } from "node:test";
import nlp from "../src/index.js";
import { loadDictionary, loadWeights } from "../scripts/model.js";
import type { ParsedToken } from "../src/types.js";

const dictionary = loadDictionary();
const weights = loadWeights();

const tests = [
  ["", [], "nlp with an empty string"],
  [
    "24 7",
    [
      [
        {
          id: 0,
          form: "24",
          lemma: "twentyfour",
          xpos: "NOUN",
          feats: { NumType: "Card" },
          head: 1,
          misc: {
            at: 0,
            pos: { NOUN: 1, ADJ: 1 },
            parentDirection: "R",
            children: [],
          },
        },
        {
          id: 1,
          form: "7",
          lemma: "seven",
          xpos: "NOUN",
          feats: { NumType: "Card" },
          head: -1,
          misc: { at: 3, pos: { NOUN: 1, ADJ: 1 }, children: [0] },
        },
      ],
    ],
    "nlp with numbers",
  ],
] as [text: string, sentences: ParsedToken[][], name: string][];

describe("nlp", () => {
  tests.forEach(([text, sentences, name]) => {
    it(name, () => {
      const parsedTokens = nlp(text, { dictionary, weights });
      assert.equal(parsedTokens.length, sentences.length);
      sentences.forEach((tokens, sentenceIndex) => {
        assert.equal(parsedTokens[sentenceIndex].length, tokens.length);
        tokens.forEach((expected, tokenIndex) => {
          const actual = parsedTokens[sentenceIndex][tokenIndex];
          assert.deepEqual(actual, expected);
        });
      });
    });
  });
});
