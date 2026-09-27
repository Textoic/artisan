import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sentencize from "../../src/sentencize/index.js";
import tokenize from "../../src/tokenize/index.js";
import { loadDictionary } from "../../scripts/model.js";

const dictionary = loadDictionary();

const tests = [
  ["", [], "an empty string"],
  [
    "a\nb",
    [
      [
        { id: 0, form: "a" },
        { id: 1, form: "b" },
      ],
    ],
    "a LINE FEED",
  ],
  [
    "a\vb",
    [
      [
        { id: 0, form: "a" },
        { id: 1, form: "b" },
      ],
    ],
    "a LINE TABULATION",
  ],
  [
    "a\fb",
    [
      [
        { id: 0, form: "a" },
        { id: 1, form: "b" },
      ],
    ],
    "a FORM FEED",
  ],
  [
    "a\rb",
    [
      [
        { id: 0, form: "a" },
        { id: 1, form: "b" },
      ],
    ],
    "a CARRIAGE RETURN",
  ],
  [
    "a\u0085b",
    [
      [
        { id: 0, form: "a" },
        { id: 1, form: "b" },
      ],
    ],
    "a NEXT LINE",
  ],
  [
    "a\u2028b",
    [
      [
        { id: 0, form: "a" },
        { id: 1, form: "b" },
      ],
    ],
    "a LINE SEPARATOR",
  ],
  [
    "a\u2029b",
    [
      [
        { id: 0, form: "a" },
        { id: 1, form: "b" },
      ],
    ],
    "a PARAGRAPH SEPARATOR",
  ],
  [
    "a\r\nb",
    [
      [
        { id: 0, form: "a" },
        { id: 1, form: "b" },
      ],
    ],
    "a CRLF",
  ],
  [
    "I am ok.",
    [
      [
        { id: 0, form: "I" },
        { id: 1, form: "am" },
        { id: 2, form: "ok" },
        { id: 3, form: "." },
      ],
    ],
    "a single sentence",
  ],
  [
    "I.!?",
    [
      [
        { id: 0, form: "I" },
        { id: 1, form: "." },
      ],
      [{ id: 0, form: "!" }],
      [{ id: 0, form: "?" }],
    ],
    "several consecutive separators",
  ],
  [
    "I am ok. You are not",
    [
      [
        { id: 0, form: "I" },
        { id: 1, form: "am" },
        { id: 2, form: "ok" },
        { id: 3, form: "." },
      ],
      [
        { id: 0, form: "You" },
        { id: 1, form: "are" },
        { id: 2, form: "not" },
      ],
    ],
    "two stop-separated sentences",
  ],
  [
    "Yes, Mr. John has a Ph.D. on medicine; for his research of course",
    [
      [
        { id: 0, form: "Yes" },
        { id: 1, form: "," },
        { id: 2, form: "Mr." },
        { id: 3, form: "John" },
        { id: 4, form: "has" },
        { id: 5, form: "a" },
        { id: 6, form: "Ph.D." },
        { id: 7, form: "on" },
        { id: 8, form: "medicine" },
        { id: 9, form: ";" },
      ],
      [
        { id: 0, form: "for" },
        { id: 1, form: "his" },
        { id: 2, form: "research" },
        { id: 3, form: "of" },
        { id: 4, form: "course" },
      ],
    ],
    "an initialism and a title",
  ],
  [
    "The butler approaches, “Dinner is ready”, he says.",
    [
      [
        { id: 0, form: "The" },
        { id: 1, form: "butler" },
        { id: 2, form: "approaches" },
        { id: 3, form: "," },
        { id: 4, form: "“" },
        { id: 5, form: "Dinner" },
        { id: 6, form: "is" },
        { id: 7, form: "ready" },
        { id: 8, form: "”" },
        { id: 9, form: "," },
        { id: 10, form: "he" },
        { id: 11, form: "says" },
        { id: 12, form: "." },
      ],
    ],
    "a parenthetic sentence",
  ],
  [
    "'What are you doing?' Not this again. 'Hey, I'm talking to you, what are you, autistic?' The heir is speaking to me.",
    [
      [
        { id: 0, form: "'" },
        { id: 1, form: "What" },
        { id: 2, form: "are" },
        { id: 3, form: "you" },
        { id: 4, form: "doing" },
        { id: 5, form: "?'" },
        { id: 6, form: "Not" },
        { id: 7, form: "this" },
        { id: 8, form: "again" },
        { id: 9, form: "." },
      ],
      [
        { id: 0, form: "'" },
        { id: 1, form: "Hey" },
        { id: 2, form: "," },
        { id: 3, form: "I" },
        { id: 4, form: "'m" },
        { id: 5, form: "talking" },
        { id: 6, form: "to" },
        { id: 7, form: "you" },
        { id: 8, form: "," },
        { id: 9, form: "what" },
        { id: 10, form: "are" },
        { id: 11, form: "you" },
        { id: 12, form: "," },
        { id: 13, form: "autistic" },
        { id: 14, form: "?'" },
        { id: 15, form: "The" },
        { id: 16, form: "heir" },
        { id: 17, form: "is" },
        { id: 18, form: "speaking" },
        { id: 19, form: "to" },
        { id: 20, form: "me" },
        { id: 21, form: "." },
      ],
    ],
    "two separate quoted direct speech sentences",
  ],
  [
    "'do not fear.' Oh but please do",
    [
      [
        { id: 0, form: "'" },
        { id: 1, form: "do" },
        { id: 2, form: "not" },
        { id: 3, form: "fear" },
        { id: 4, form: "." },
        { id: 5, form: "'" },
      ],
      [
        { id: 0, form: "Oh" },
        { id: 1, form: "but" },
        { id: 2, form: "please" },
        { id: 3, form: "do" },
      ],
    ],
    "a terminator immediately before a delimiter",
  ],
] as [text: string, tokens: { id: number; form: string }[][], name: string][];

describe("sentencize", () => {
  tests.forEach(([text, sentences, name]) => {
    it(name, () => {
      const parsedTokens = sentencize(tokenize(text, { dictionary }));
      sentences.forEach((tokens, sentenceIndex) => {
        assert.equal(parsedTokens[sentenceIndex].length, tokens.length);
        tokens.forEach((expected, tokenIndex) => {
          const actual = parsedTokens[sentenceIndex][tokenIndex];
          assert.equal(actual.id, expected.id);
          assert.equal(actual.form, expected.form);
        });
      });
    });
  });
});
