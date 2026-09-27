import assert from "node:assert/strict";
import { describe, it } from "node:test";
import parse from "../../src/parse/index.js";
import sentencize from "../../src/sentencize/index.js";
import tokenize from "../../src/tokenize/index.js";
import { findNegatedVerb } from "../../src/grammar/index.js";
import { loadAnnotatedDataset, loadDictionary } from "../../scripts/model.js";
import type { FeatureWeights, ParsedToken, PosTag } from "../../src/types.js";

const dictionary = loadDictionary();

const edgeCases = [
  "",
  " ",
  ".",
  "...",
  "!?",
  "💜",
  "a",
  "The",
  "qwertyuiop",
  "https://example.com/a?b=c",
  "@someone #hashtag",
  "a\nb\nc",
  "one two three four five six seven eight nine ten",
  "Don't; can't. Won't!",
  "It can't accidentally corrupt the schema",
  "I will not always stay here",
  "We haven't fully and properly tested it",
  "She wouldn't ever have said so",
  "They do not simply leave",
];

const texts = [...edgeCases, ...loadAnnotatedDataset().map(({ text }) => text)];

const problemsIn = (text: string, tokens: ParsedToken[]) => {
  const problems: string[] = [];
  const where = (index: number) =>
    `"${tokens[index]?.form ?? "?"}" (${index}) in ${JSON.stringify(text)}`;

  if (tokens.length === 0) {
    return problems;
  }

  tokens.forEach((token, index) => {
    if (token.id !== index) {
      problems.push(`${where(index)} has id ${token.id}, expected ${index}`);
    }

    const { head } = token;
    if (head !== -1 && (head < 0 || head >= tokens.length)) {
      problems.push(`${where(index)} has head ${head}, out of range`);
    }

    if (head === index) {
      problems.push(`${where(index)} is its own head`);
    }

    const possible = Object.keys(token.misc.pos);
    if (possible.length > 0 && !possible.includes(token.xpos)) {
      problems.push(
        `${where(index)} was tagged ${token.xpos}, which is not one of ${possible.join("/")}`,
      );
    }
  });

  const roots = tokens.filter(({ head }) => head === -1);
  if (roots.length !== 1) {
    problems.push(
      `${JSON.stringify(text)} has ${roots.length} roots, expected exactly 1`,
    );
  }

  tokens.forEach((_token, index) => {
    let steps = 0;
    let at = index;
    while (tokens[at].head !== -1 && steps <= tokens.length) {
      at = tokens[at].head;
      steps += 1;
    }

    if (steps > tokens.length) {
      problems.push(`${where(index)} is in a cycle`);
    }
  });

  tokens.forEach((token, index) => {
    const expected = tokens
      .map((child, childIndex) => (child.head === index ? childIndex : -1))
      .filter((childIndex) => childIndex !== -1);
    const actual = [...token.misc.children].sort((a, b) => a - b);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      problems.push(
        `${where(index)} lists children ${JSON.stringify(actual)} but heads say ${JSON.stringify(expected)}`,
      );
    }
  });

  return problems;
};

const tags: PosTag[] = ["NOUN", "VERB", "ADJ", "ADV", "MARK", "PUNCT", "INTJ"];

const hash = (string: string) => {
  let value = 7;
  for (let index = 0; index < string.length; index += 1) {
    value = (value * 31 + string.charCodeAt(index)) % 1000003;
  }

  return value;
};

const arbitraryModel = (seed: number) =>
  new Proxy({} as FeatureWeights, {
    get: (_target, feature: string) =>
      Object.fromEntries(
        tags.map((tag) => [
          tag,
          ((hash(`${seed}:${feature}:${tag}`) % 2001) - 1000) / 100,
        ]),
      ),
  });

const models: [name: string, weights: FeatureWeights | undefined][] = [
  ["no model", undefined],
  ...[1, 2, 3, 4, 5].map((seed): [string, FeatureWeights] => [
    `arbitrary model ${seed}`,
    arbitraryModel(seed),
  ]),
];

describe("parse: structural invariants", () => {
  models.forEach(([name, weights]) => {
    it(`every parse is a single tree over tags the words can take (${name})`, () => {
      const problems = texts.flatMap((text) =>
        sentencize(tokenize(text, { dictionary })).flatMap((sentence) =>
          problemsIn(text, parse(sentence, { weights })),
        ),
      );
      assert.equal(
        problems.length,
        0,
        `${problems.length} malformed parses with ${name}:\n${problems.slice(0, 20).join("\n")}`,
      );
    });
  });
});

const negationProblemsIn = (text: string, tokens: ParsedToken[]) =>
  tokens.flatMap((token, index) => {
    const verb = findNegatedVerb(tokens, index);
    if (verb === -1 || token.head === verb) {
      return [];
    }

    return [
      `"${token.form}" (${index}) in ${JSON.stringify(text)} negates "${tokens[verb].form}" (${verb}) but has head ${token.head}`,
    ];
  });

describe("parse: a negator lands on the verb it negates", () => {
  models.forEach(([name, weights]) => {
    it(`every negator in a verb construction hangs off its verb (${name})`, () => {
      const problems = texts.flatMap((text) =>
        sentencize(tokenize(text, { dictionary })).flatMap((sentence) =>
          negationProblemsIn(text, parse(sentence, { weights })),
        ),
      );
      assert.equal(
        problems.length,
        0,
        `${problems.length} misplaced negators with ${name}:\n${problems.slice(0, 20).join("\n")}`,
      );
    });
  });
});

describe("tokenize: the tokens partition the text", () => {
  it("no token overlaps the next one", () => {
    const problems = texts.flatMap((text) => {
      const tokens = tokenize(text, { dictionary });
      return tokens.flatMap((token, index) => {
        if (index === 0) {
          return [];
        }

        const previous = tokens[index - 1];
        const end = previous.misc.at + previous.form.length;
        return token.misc.at < end
          ? [
              `"${previous.form}" at ${previous.misc.at} overlaps "${token.form}" at ${token.misc.at} in ${JSON.stringify(text)}`,
            ]
          : [];
      });
    });
    assert.equal(
      problems.length,
      0,
      `${problems.length} overlapping tokens:\n${problems.slice(0, 20).join("\n")}`,
    );
  });

  it("every token can be found at the offset it reports", () => {
    const problems = texts.flatMap((text) =>
      tokenize(text, { dictionary }).flatMap((token) => {
        const { at } = token.misc;
        return text.slice(at, at + token.form.length) === token.form
          ? []
          : [
              `"${token.form}" claims offset ${at}, where the text has "${text.slice(at, at + token.form.length)}"`,
            ];
      }),
    );
    assert.equal(
      problems.length,
      0,
      `${problems.length} tokens at the wrong offset:\n${problems.slice(0, 20).join("\n")}`,
    );
  });
});
