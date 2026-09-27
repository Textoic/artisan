import assert from "node:assert/strict";
import { describe, it } from "node:test";
import nlp from "../../src/index.js";
import { loadDictionary, loadWeights } from "../../scripts/model.js";

const dictionary = loadDictionary();
const weights = loadWeights();

const cases = [
  {
    text: "I will defeat their filthy heathen armies and the Glory of the Greater man will shine from coast to coast!",
    tags: { will: "VERB", shine: "VERB", Greater: "ADJ" },
  },
  {
    text: "we’ll need them to fool imperial tax collectors when they come",
    tags: { fool: "VERB", imperial: "ADJ", collectors: "NOUN" },
  },
  {
    text: "The king over no land felt confident enough to prepare a raid on the greatest city in the southern continent",
    tags: { felt: "VERB", confident: "ADJ", enough: "ADV" },
  },
  {
    text: "A delegation will visit our neighboring city to pay our respects",
    tags: { will: "VERB", visit: "VERB", delegation: "NOUN" },
  },
];

describe("editorial tagging regressions", () => {
  cases.forEach(({ text, tags }) => {
    it(text, () => {
      const tokens = nlp(text, { dictionary, weights }).flat();
      for (const [form, tag] of Object.entries(tags)) {
        const found = tokens.filter((token) => token.form === form);
        assert.ok(found.length > 0, form);
        for (const token of found) {
          assert.equal(token.xpos, tag, form);
        }
      }
    });
  });

  it("attaches degree enough to its adjective", () => {
    const tokens = nlp(cases[2].text, { dictionary, weights }).flat();
    const enough = tokens.find(({ form }) => form === "enough");
    assert.ok(enough);
    assert.equal(tokens[enough.head].form, "confident");
  });

  it("keeps quantity enough as a determiner", () => {
    const tokens = nlp("I have enough money.", { dictionary, weights }).flat();
    assert.equal(tokens.find(({ form }) => form === "enough")?.xpos, "ADJ");
  });
});

const controls = [
  { text: "The lawyer read her will.", form: "will", tag: "NOUN" },
  {
    text: "They polished the shine on the silver.",
    form: "shine",
    tag: "NOUN",
  },
  { text: "We sent them to tax collectors.", form: "tax", tag: "NOUN" },
  { text: "Enough is enough.", form: "Enough", tag: "NOUN" },
  { text: "We need them to fool tax collectors.", form: "fool", tag: "VERB" },
  { text: "She will shine.", form: "shine", tag: "VERB" },
];

describe("tagging controls without a model", () => {
  controls.forEach(({ text, form, tag }) => {
    it(text, () => {
      const token = nlp(text, { dictionary })
        .flat()
        .find((word) => word.form === form);
      assert.equal(token?.xpos, tag);
    });
  });
});

describe("modified quantity enough", () => {
  ["We have nearly enough food.", "We have hardly enough food."].forEach(
    (text) => {
      it(`does not force an adverb reading in ${text}`, () => {
        for (const model of [undefined, weights]) {
          const tokens = nlp(text, { dictionary, weights: model }).flat();
          const enough = tokens.find(({ form }) => form === "enough");
          assert.ok(enough);
          assert.notEqual(enough.xpos, "ADV");
        }
      });
    },
  );
});

describe("worth before a gerund", () => {
  for (const model of [undefined, weights]) {
    for (const text of [
      "Throughput note worth flagging now:**",
      "Throughput note worth flagging now:",
      "A book worth reading.",
      "This is worth reading.",
    ]) {
      it(text, () => {
        const tokens = nlp(text, { dictionary, weights: model }).flat();
        assert.equal(tokens.find(({ form }) => form === "worth")?.xpos, "ADJ");
      });
    }

    for (const text of [
      "The net worth calculation failed.",
      "Her worth increased.",
      "We questioned the worth of the project.",
    ]) {
      it(`keeps the noun in ${text}`, () => {
        const tokens = nlp(text, { dictionary, weights: model }).flat();
        assert.equal(tokens.find(({ form }) => form === "worth")?.xpos, "NOUN");
      });
    }
  }
});
