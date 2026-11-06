import assert from "node:assert/strict";
import { describe, it } from "node:test";
import nlp from "../../src/index.js";
import { loadDictionary, loadWeights } from "../../scripts/model.js";

const dictionary = loadDictionary();
const weights = loadWeights();

const cases = [
  {
    text: "She exists, as far as I can tell, so the book can be longer and so the author can show us how sensitive he is about family stuff.",
    word: "sensitive",
    tag: "ADJ",
  },
  {
    text: "I'm not reading the book to be impressed by how well-rounded a fictional detective is.",
    word: "well-rounded",
    tag: "ADJ",
  },
  {
    text: "She saw how the sensitive was treated.",
    word: "sensitive",
    tag: "NOUN",
  },
  {
    text: "I know how sensitive he is about family matters.",
    word: "sensitive",
    tag: "ADJ",
  },
  {
    text: "I do not care how well-rounded a fictional detective is.",
    word: "well-rounded",
    tag: "ADJ",
  },
  {
    text: "She wondered how sensitive the artist was.",
    word: "sensitive",
    tag: "ADJ",
  },
  { text: "Tell me how old he is.", word: "old", tag: "ADJ" },
  {
    text: "She knows how sensitive readers react.",
    word: "sensitive",
    tag: "ADJ",
  },
  { text: "She consulted a sensitive.", word: "sensitive", tag: "NOUN" },
  { text: "The sensitive complained.", word: "sensitive", tag: "NOUN" },
  {
    text: "A well-rounded detective solved it.",
    word: "well-rounded",
    tag: "ADJ",
  },
  { text: "I know how light travels.", word: "light", tag: "NOUN" },
  { text: "I know how much money he spent.", word: "money", tag: "NOUN" },
  { text: "I know how beauty is measured.", word: "beauty", tag: "NOUN" },
  {
    text: "They extend beyond the hat, which gives me something fairly specific to picture, though I could do without knowing exactly how far they stick out.",
    word: "far",
    tag: "ADV",
  },
  { text: "I wonder how far the boat sailed.", word: "far", tag: "ADV" },
  { text: "How far can she walk?", word: "far", tag: "ADV" },
  {
    text: "Even that takes a moment to say, but at least I don't have to picture a person deploying a vocabulary somewhere.",
    word: "least",
    tag: "ADV",
  },
  { text: "At least he read the book.", word: "least", tag: "ADV" },
  { text: "At most we wait an hour.", word: "most", tag: "ADV" },
  { text: "At least he will tell you.", word: "will", tag: "VERB" },
  { text: "At least my son will tell you.", word: "will", tag: "VERB" },
  { text: "At least her colleague will know.", word: "will", tag: "VERB" },
  { text: "At most she will read a page.", word: "will", tag: "VERB" },
  { text: "At least he can read.", word: "can", tag: "VERB" },
  {
    text: "That sounds obvious, yet plenty of prose makes a show of choosing the grander word when the ordinary one would do.",
    word: "ordinary",
    tag: "ADJ",
  },
  { text: "The ordinary ones will do.", word: "ordinary", tag: "ADJ" },
  { text: "She chose the blue one.", word: "blue", tag: "ADJ" },
  { text: "She chose the first one.", word: "first", tag: "NOUN" },
  { text: "She chose the second one.", word: "second", tag: "NOUN" },
  { text: "That was a good one(commercial).", word: "good", tag: "ADJ" },
  {
    text: "Anyway, I'm returning this and buying a Kindle (at least Amazon will tell you what devices you can install their etextbooks, i.e. almost all their Kindles, Mac, PC and oh, an iPad!)",
    word: "will",
    tag: "VERB",
  },
  { text: "That is the least of our worries.", word: "least", tag: "NOUN" },
  { text: "The ordinary is often overlooked.", word: "ordinary", tag: "NOUN" },
];

describe("degree adverbs and adjectives before anaphoric one", () => {
  for (const model of [undefined, weights]) {
    for (const entry of cases) {
      it(`${model ? "trained" : "rules"}: ${entry.text}`, () => {
        const tokens = nlp(entry.text, { dictionary, weights: model }).flat();
        const token = tokens.find(
          (value) => value.form.toLowerCase() === entry.word,
        );
        assert.ok(token);
        assert.equal(token.xpos, entry.tag);
      });
    }
  }
  it("does not force an adverb reading for attributive far", () => {
    for (const model of [undefined, weights]) {
      const tokens = nlp("The far shore is visible.", {
        dictionary,
        weights: model,
      }).flat();
      assert.notEqual(
        tokens.find((token) => token.form === "far")?.xpos,
        "ADV",
      );
    }
  });
});
