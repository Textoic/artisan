import assert from "node:assert/strict";
import { describe, it } from "node:test";
import inflect from "../../src/inflect/index.js";

describe("inflect", () => {
  it("inflect without some arguments", () => {
    assert.equal(inflect({}), undefined);
    assert.equal(inflect({ lemma: "do" }), "do");
    assert.equal(inflect({ lemma: "do", xpos: "NOUN" }), "do");
    assert.equal(inflect({ lemma: "do", xpos: "VERB" }), "do");
    assert.equal(
      inflect({ lemma: "do", xpos: "VERB", feats: { Person: 3 } }),
      "do",
    );
    assert.equal(
      inflect({
        lemma: "do",
        xpos: "VERB",
        feats: { Number: "Sing" },
      }),
      "do",
    );
  });

  it("something that is neither ADJ nor NOUN", () => {
    assert.equal(inflect({ lemma: "cute", xpos: "ADJ" }), "cute");
  });

  it("regular nouns", () => {
    assert.equal(
      inflect({
        lemma: "song",
        xpos: "NOUN",
        feats: { Number: "Plur" },
      }),
      "songs",
    );
    assert.equal(
      inflect({
        lemma: "bird",
        xpos: "NOUN",
        feats: { Number: "Plur" },
      }),
      "birds",
    );
  });

  it("regular verbs", () => {
    assert.equal(
      inflect({
        lemma: "attempt",
        xpos: "VERB",
        feats: { Tense: "Pres", Person: 1 },
      }),
      "attempt",
    );
    assert.equal(
      inflect({
        lemma: "attempt",
        xpos: "VERB",
        feats: { Tense: "Pres", Person: 2 },
      }),
      "attempt",
    );
    assert.equal(
      inflect({
        lemma: "attempt",
        xpos: "VERB",
        feats: { Tense: "Pres", Number: "Plur" },
      }),
      "attempt",
    );
    assert.equal(
      inflect({
        lemma: "attempt",
        xpos: "VERB",
        feats: { Tense: "Past" },
      }),
      "attempted",
    );
    assert.equal(
      inflect({
        lemma: "attempt",
        xpos: "VERB",
        feats: { Tense: "Pres", VerbForm: "Part" },
      }),
      "attempting",
    );
    assert.equal(
      inflect({
        lemma: "attempt",
        xpos: "VERB",
        feats: { Person: 3, Number: "Sing" },
      }),
      "attempts",
    );
    assert.equal(
      inflect({
        lemma: "attempt",
        xpos: "VERB",
        feats: { Tense: "Pres", VerbForm: "Part" },
      }),
      "attempting",
    );
  });

  it("plurals", () => {
    assert.equal(
      inflect({
        lemma: "song",
        xpos: "NOUN",
        feats: { Number: "Sing" },
      }),
      "song",
    );
    assert.equal(
      inflect({
        lemma: "play",
        xpos: "NOUN",
        feats: { Number: "Plur" },
      }),
      "plays",
    );
    assert.equal(
      inflect({
        lemma: "bus",
        xpos: "NOUN",
        feats: { Number: "Plur" },
      }),
      "buses",
    );
    assert.equal(
      inflect({
        lemma: "cry",
        xpos: "NOUN",
        feats: { Number: "Plur" },
      }),
      "cries",
    );
    assert.equal(
      inflect({
        lemma: "knife",
        xpos: "NOUN",
        feats: { Number: "Plur" },
      }),
      "knives",
    );
    assert.equal(
      inflect({
        lemma: "catharsis",
        xpos: "NOUN",
        feats: { Number: "Plur" },
      }),
      "catharses",
    );
    assert.equal(
      inflect({
        lemma: "cactus",
        xpos: "NOUN",
        feats: { Number: "Plur" },
      }),
      "cacti",
    );
    assert.equal(
      inflect({
        lemma: "index",
        xpos: "NOUN",
        feats: { Number: "Plur" },
      }),
      "indexes",
    );
    assert.equal(
      inflect({
        lemma: "addendum",
        xpos: "NOUN",
        feats: { Number: "Plur" },
      }),
      "addenda",
    );
    assert.equal(
      inflect({
        lemma: "criterion",
        xpos: "NOUN",
        feats: { Number: "Plur" },
      }),
      "criteria",
    );
    it("plurals", () => {
      assert.equal(
        inflect({
          lemma: "song",
          xpos: "NOUN",
          feats: { Number: "Sing" },
        }),
        "song",
      );
      assert.equal(
        inflect({
          lemma: "play",
          xpos: "NOUN",
          feats: { Number: "Plur" },
        }),
        "plays",
      );
      assert.equal(
        inflect({
          lemma: "bus",
          xpos: "NOUN",
          feats: { Number: "Plur" },
        }),
        "buses",
      );
      assert.equal(
        inflect({
          lemma: "cry",
          xpos: "NOUN",
          feats: { Number: "Plur" },
        }),
        "cries",
      );
      assert.equal(
        inflect({
          lemma: "knife",
          xpos: "NOUN",
          feats: { Number: "Plur" },
        }),
        "knives",
      );
      assert.equal(
        inflect({
          lemma: "catharsis",
          xpos: "NOUN",
          feats: { Number: "Plur" },
        }),
        "catharses",
      );
      assert.equal(
        inflect({
          lemma: "cactus",
          xpos: "NOUN",
          feats: { Number: "Plur" },
        }),
        "cacti",
      );
      assert.equal(
        inflect({
          lemma: "index",
          xpos: "NOUN",
          feats: { Number: "Plur" },
        }),
        "indexes",
      );
      assert.equal(
        inflect({
          lemma: "addendum",
          xpos: "NOUN",
          feats: { Number: "Plur" },
        }),
        "addenda",
      );
      assert.equal(
        inflect({
          lemma: "criterion",
          xpos: "NOUN",
          feats: { Number: "Plur" },
        }),
        "criteria",
      );
    });
  });

  it("the present simple", () => {
    assert.equal(
      inflect({
        lemma: "play",
        xpos: "VERB",
        feats: { Tense: "Pres", Person: 1 },
      }),
      "play",
    );
    assert.equal(
      inflect({
        lemma: "play",
        xpos: "VERB",
        feats: { Tense: "Pres", Person: 2 },
      }),
      "play",
    );
    assert.equal(
      inflect({
        lemma: "play",
        xpos: "VERB",
        feats: {
          Tense: "Pres",
          Person: 3,
          Number: "Sing",
        },
      }),
      "plays",
    );
    assert.equal(
      inflect({
        lemma: "take",
        xpos: "VERB",
        feats: {
          Tense: "Pres",
          Person: 3,
          Number: "Sing",
        },
      }),
      "takes",
    );
    assert.equal(
      inflect({
        lemma: "cuss",
        xpos: "VERB",
        feats: {
          Tense: "Pres",
          Person: 3,
          Number: "Sing",
        },
      }),
      "cusses",
    );
    assert.equal(
      inflect({
        lemma: "spy",
        xpos: "VERB",
        feats: {
          Tense: "Pres",
          Person: 3,
          Number: "Sing",
        },
      }),
      "spies",
    );
    assert.equal(
      inflect({
        lemma: "knife",
        xpos: "VERB",
        feats: {
          Tense: "Pres",
          Person: 3,
          Number: "Sing",
        },
      }),
      "knifes",
    );
    assert.equal(
      inflect({
        lemma: "lend",
        xpos: "VERB",
        feats: {
          Tense: "Pres",
          VerbForm: "Fin",
          Person: 3,
          Number: "Plur",
        },
      }),
      "lend",
    );
  });

  it("the present participle", () => {
    assert.equal(
      inflect({
        lemma: "play",
        xpos: "VERB",
        feats: { VerbForm: "Part", Tense: "Pres" },
      }),
      "playing",
    );
    assert.equal(
      inflect({
        lemma: "lie",
        xpos: "VERB",
        feats: { VerbForm: "Part", Tense: "Pres" },
      }),
      "lying",
    );
    assert.equal(
      inflect({
        lemma: "tie",
        xpos: "VERB",
        feats: { VerbForm: "Part", Tense: "Pres" },
      }),
      "tying",
    );
    assert.equal(
      inflect({
        lemma: "spar",
        xpos: "VERB",
        feats: { VerbForm: "Part", Tense: "Pres" },
      }),
      "sparring",
    );
    assert.equal(
      inflect({
        lemma: "believe",
        xpos: "VERB",
        feats: { VerbForm: "Part", Tense: "Pres" },
      }),
      "believing",
    );
    assert.equal(
      inflect({
        lemma: "panic",
        xpos: "VERB",
        feats: { VerbForm: "Part", Tense: "Pres" },
      }),
      "panicking",
    );
    assert.equal(
      inflect({
        lemma: "stop",
        xpos: "VERB",
        feats: { VerbForm: "Part", Tense: "Pres" },
      }),
      "stopping",
    );
  });

  it("past forms", () => {
    assert.equal(
      inflect({
        lemma: "play",
        xpos: "VERB",
        feats: { Tense: "Past" },
      }),
      "played",
    );
    assert.equal(
      inflect({
        lemma: "lie",
        xpos: "VERB",
        feats: { Tense: "Past" },
      }),
      "lay",
    );
    assert.equal(
      inflect({
        lemma: "cry",
        xpos: "VERB",
        feats: { Tense: "Past" },
      }),
      "cried",
    );
    assert.equal(
      inflect({
        lemma: "panic",
        xpos: "VERB",
        feats: { Tense: "Past" },
      }),
      "panicked",
    );
    assert.equal(
      inflect({
        lemma: "stop",
        xpos: "VERB",
        feats: { Tense: "Past" },
      }),
      "stopped",
    );
    assert.equal(
      inflect({
        lemma: "announce",
        xpos: "VERB",
        feats: { Tense: "Past" },
      }),
      "announced",
    );
    assert.equal(
      inflect({
        lemma: "hit",
        xpos: "VERB",
        feats: { Tense: "Past", VerbForm: "Part" },
      }),
      "hit",
    );
    assert.equal(
      inflect({
        lemma: "forget",
        xpos: "VERB",
        feats: { Tense: "Past", VerbForm: "Part" },
      }),
      "forgotten",
    );
    assert.equal(
      inflect({
        lemma: "slur",
        xpos: "VERB",
        feats: { Tense: "Past", VerbForm: "Fin" },
      }),
      "slurred",
    );
  });

  it("the verb 'be'", () => {
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: { Tense: "Past", VerbForm: "Part" },
      }),
      "been",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: { Tense: "Pres", VerbForm: "Part" },
      }),
      "being",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: {
          Tense: "Past",
          VerbForm: "Fin",
          Person: 1,
          Number: "Sing",
        },
      }),
      "was",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: {
          Tense: "Past",
          VerbForm: "Fin",
          Person: 2,
          Number: "Sing",
        },
      }),
      "were",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: {
          Tense: "Past",
          VerbForm: "Fin",
          Person: 3,
          Number: "Sing",
        },
      }),
      "was",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: {
          Tense: "Past",
          VerbForm: "Fin",
          Person: 1,
          Number: "Plur",
        },
      }),
      "were",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: {
          Tense: "Past",
          VerbForm: "Fin",
          Person: 2,
          Number: "Plur",
        },
      }),
      "were",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: {
          Tense: "Past",
          VerbForm: "Fin",
          Person: 3,
          Number: "Plur",
        },
      }),
      "were",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: {
          Tense: "Past",
          VerbForm: "Fin",
          Person: 3,
        },
      }),
      "were",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: {
          Tense: "Pres",
          VerbForm: "Fin",
          Person: 1,
        },
      }),
      "am",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: {
          Tense: "Pres",
          VerbForm: "Fin",
          Person: 2,
          Number: "Sing",
        },
      }),
      "are",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: {
          Tense: "Pres",
          VerbForm: "Fin",
          Person: 3,
          Number: "Sing",
        },
      }),
      "is",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: {
          Tense: "Pres",
          VerbForm: "Fin",
          Person: 1,
          Number: "Plur",
        },
      }),
      "are",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: {
          Tense: "Pres",
          VerbForm: "Fin",
          Person: 2,
          Number: "Plur",
        },
      }),
      "are",
    );
    assert.equal(
      inflect({
        lemma: "be",
        xpos: "VERB",
        feats: {
          Tense: "Pres",
          VerbForm: "Fin",
          Person: 3,
          Number: "Plur",
        },
      }),
      "are",
    );
  });
});
