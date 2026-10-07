import assert from "node:assert/strict";
import { describe, it } from "node:test";
import nlp from "../../src/index.js";
import { loadDictionary, loadWeights } from "../../scripts/model.js";
import type { FeatureWeights } from "../../src/types.js";

const dictionary = loadDictionary();

const models = [
  ["the rules alone", {} as FeatureWeights],
  ["the trained model", loadWeights()],
] as const;

type Expected = { text: string; tags: Record<string, string> };

const tagged: Expected[] = [
  { text: "But how can 10 years beat 30?", tags: { beat: "VERB" } },
  {
    text: "These are rules another person can check.",
    tags: { can: "VERB", check: "VERB" },
  },
  {
    text: "You work inside rules that another person can check.",
    tags: { check: "VERB" },
  },
  {
    text: "The writer can name the grain of a table.",
    tags: { name: "VERB", grain: "NOUN" },
  },
  {
    text: "A reader who was bored starts to think.",
    tags: { bored: "VERB", starts: "VERB" },
  },
  {
    text: "The letters that were not signed sit in a drawer.",
    tags: { signed: "VERB", sit: "VERB" },
  },
  {
    text: "A clerk who was hired orders supplies.",
    tags: { orders: "VERB", supplies: "NOUN" },
  },
  { text: "The girl who paints houses lives here.", tags: { houses: "NOUN" } },
  { text: "## What are words?", tags: { words: "NOUN" } },
  { text: "That is why the year beats the amount.", tags: { beats: "VERB" } },
  {
    text: "Now here is the part that actually matters.",
    tags: { matters: "VERB" },
  },
  { text: "Last year the company made changes.", tags: { changes: "NOUN" } },
  {
    text: "Every morning the manager sends reports.",
    tags: { reports: "NOUN" },
  },
  { text: "Every day you face challenges.", tags: { challenges: "NOUN" } },
  { text: "Each time you run tests fail.", tags: { tests: "NOUN" } },
  {
    text: "In the office the manager sends reports.",
    tags: { reports: "NOUN" },
  },
  { text: "The day you place orders matters.", tags: { orders: "NOUN" } },
  {
    text: "The things you need help with are listed below.",
    tags: { help: "NOUN" },
  },
  {
    text: "The day you start classes seemed long.",
    tags: { classes: "NOUN", seemed: "VERB" },
  },
  {
    text: "If you press the button it makes sounds.",
    tags: { sounds: "NOUN" },
  },
  { text: "I told the boy he needs books.", tags: { books: "NOUN" } },
  {
    text: "The next day the company made changes.",
    tags: { changes: "NOUN" },
  },
  { text: "Before dinner she takes walks.", tags: { walks: "NOUN" } },
  { text: "As a rule you make plans.", tags: { plans: "NOUN" } },
  { text: "Today the company ships orders.", tags: { orders: "NOUN" } },
  { text: "Best wishes", tags: { wishes: "NOUN" } },
  { text: "Why does this matter?", tags: { matter: "VERB" } },
  {
    text: "It doesn't matter which one you pick.",
    tags: { matter: "VERB" },
  },
  {
    text: "The Nook does a wonderful job as a reader.",
    tags: { job: "NOUN" },
  },
  { text: "The universe is mostly dark matter.", tags: { matter: "NOUN" } },
  { text: "We can convert matter into energy.", tags: { matter: "NOUN" } },
  { text: "Performance issues", tags: { issues: "NOUN" } },
  { text: "Security concerns", tags: { concerns: "NOUN" } },
  { text: "Test results", tags: { results: "NOUN" } },
  { text: "Customer reviews.", tags: { reviews: "NOUN" } },
  { text: "You save $200.", tags: { save: "VERB" } },
  { text: "Save your work often.", tags: { Save: "VERB" } },
  {
    text: "The amount you save matters less than the year you start.",
    tags: { save: "VERB", matters: "VERB" },
  },
  {
    text: "The year the $200 begins beats its size.",
    tags: { begins: "VERB", beats: "VERB", size: "NOUN" },
  },
  {
    text: 'The year "the $200" begins beats its size.',
    tags: { begins: "VERB", beats: "VERB" },
  },
  {
    text: "That’s why the year you start matters so much.",
    tags: { start: "VERB", matters: "VERB" },
  },
  {
    text: "Because the year you start matters more than the amount you put in.",
    tags: { start: "VERB", matters: "VERB" },
  },
  {
    text: "Every choice you make matters.",
    tags: { make: "VERB", matters: "VERB" },
  },
  {
    text: "The man you met runs a bakery.",
    tags: { met: "VERB", runs: "VERB" },
  },
  {
    text: "The way the system works matters.",
    tags: { works: "VERB", matters: "VERB" },
  },
  {
    text: "The day you start classes is hard.",
    tags: { classes: "NOUN", is: "VERB" },
  },
  {
    text: "The people you tell stories remember them.",
    tags: { stories: "NOUN", remember: "VERB" },
  },
  {
    text: "What matters is the year you begin.",
    tags: { What: "NOUN", matters: "VERB", is: "VERB" },
  },
  {
    text: "We know which bud is right.",
    tags: { bud: "NOUN" },
  },
  {
    text: "The Lakers beat the Celtics last night.",
    tags: { beat: "VERB" },
  },
  {
    text: "The rain beat against the windows.",
    tags: { beat: "VERB" },
  },
  {
    text: "Does saving $20 now matter if you can save $200 later?",
    tags: { matter: "VERB", save: "VERB" },
  },
  {
    text: "Everyone came save the mayor.",
    tags: { save: "MARK" },
  },
  {
    text: "Only the total matters.",
    tags: { matters: "VERB" },
  },
  {
    text: "Details matter.",
    tags: { matter: "VERB" },
  },
  {
    text: "To make matters worse, it rained.",
    tags: { matters: "NOUN" },
  },
  {
    text: "These matters are private.",
    tags: { matters: "NOUN" },
  },
  {
    text: "It is only a matter of time.",
    tags: { matter: "NOUN" },
  },
];

const tokensOf = (text: string, weights: FeatureWeights) =>
  nlp(text, { dictionary, weights }).flat();

describe("the main verb of a clause", () => {
  models.forEach(([name, weights]) => {
    tagged.forEach(({ text, tags }) => {
      it(`${text} under ${name}`, () => {
        const tokens = tokensOf(text, weights);
        Object.entries(tags).forEach(([form, tag]) => {
          const found = tokens.filter((token) => token.form === form);
          assert.ok(found.length > 0, form);
          found.forEach((token) => {
            assert.equal(token.xpos, tag, form);
          });
        });
      });
    });
  });
});

const headOf = (text: string, weights: FeatureWeights, form: string) => {
  const tokens = tokensOf(text, weights);
  const token = tokens.find((one) => one.form === form);
  assert.ok(token, form);
  return token.head === -1 ? "ROOT" : tokens[token.head].form;
};

const attached = [
  ["The year the $200 begins beats its size.", "year", "beats"],
  ["The year the $200 begins beats its size.", "begins", "year"],
  ["The year the $200 begins beats its size.", "size", "beats"],
  ["Every choice you make matters.", "choice", "matters"],
  ["Every choice you make matters.", "make", "choice"],
  ["Every choice you make matters.", "you", "make"],
  ["The man you met runs a bakery.", "man", "runs"],
  ["The man you met runs a bakery.", "met", "man"],
  ["That’s why the year you start matters so much.", "year", "matters"],
  ["That’s why the year you start matters so much.", "start", "year"],
  ["The day you start classes is hard.", "classes", "is"],
  ["If you find a book it will help.", "will", "ROOT"],
  ["Every day you face challenges.", "face", "ROOT"],
] as const;

describe("an unmarked relative clause before the main verb", () => {
  models.forEach(([name, weights]) => {
    attached.forEach(([text, form, head]) => {
      it(`hangs "${form}" off "${head}" in "${text}" under ${name}`, () => {
        assert.equal(headOf(text, weights, form), head);
      });
    });
  });
});

describe("a word that only looks like a comparative", () => {
  (
    [
      ["matter", "matter"],
      ["number", "number"],
      ["offer", "offer"],
      ["owner", "owner"],
      ["customer", "customer"],
      ["longer", "long"],
      ["lower", "low"],
      ["better", "well"],
    ] as const
  ).forEach(([form, lemma]) => {
    it(`gives "${form}" the lemma "${lemma}"`, () => {
      assert.equal(dictionary.get(form)?.lemma, lemma);
    });
  });

  it("drops the adjective reading of a comparative with no superlative", () => {
    assert.deepEqual(Object.keys(dictionary.get("matter")?.pos ?? {}).sort(), [
      "NOUN",
      "VERB",
    ]);
    assert.equal(dictionary.get("matter")?.Degree, undefined);
  });

  it("keeps an adjective the word list knows by itself", () => {
    assert.ok(dictionary.get("upper")?.pos?.ADJ);
  });

  it("keeps the comparative of a real pair", () => {
    assert.equal(dictionary.get("longer")?.Degree, "Cmp");
  });
});
