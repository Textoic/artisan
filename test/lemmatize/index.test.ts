import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lemmatize from "../../src/lemmatize/index.js";
import { loadDictionary } from "../../scripts/model.js";
import type { LexicalFeatures, PosWeights } from "../../src/types.js";

const dictionary = loadDictionary();

const tests = [
  [
    "covfefingly",
    {
      lemma: "covfefingly",
      pos: { ADV: 1 },
    },
    "an ADV ending in -ingly",
  ],
  [
    "holofine",
    {
      lemma: "holofine",
      pos: { ADJ: 1 },
    },
    "an ADJ ending in -ine",
  ],
  [
    "holous",
    {
      lemma: "holous",
      pos: { ADJ: 1 },
    },
    "an ADJ ending in -ous",
  ],
  [
    "potatobound",
    {
      lemma: "potatobound",
      pos: { ADJ: 1 },
    },
    "an ADJ ending in -bound",
  ],
  [
    "edgemost",
    {
      lemma: "edgemost",
      pos: { ADJ: 1 },
    },
    "an ADJ ending in -most",
  ],
  [
    "postphysical",
    {
      lemma: "postphysical",
      pos: { ADJ: 1 },
    },
    "an ADJ ending in -ical",
  ],
  [
    "potatolike",
    {
      lemma: "potatolike",
      pos: { ADJ: 1 },
    },
    "an ADJ ending in -like",
  ],
  [
    "moronproof",
    {
      lemma: "moronproof",
      pos: { ADJ: 1, VERB: 1 },
      feats: { VerbForm: "Fin", Tense: "Pres", Person: 1 },
    },
    "an ADJ/VERB lemma ending in -proof",
  ],
  [
    "ectostasis",
    {
      lemma: "ectostasis",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -asis",
  ],
  [
    "edginess",
    {
      lemma: "edginess",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -ness",
  ],
  [
    "multiversity",
    {
      lemma: "multiversity",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -ity",
  ],
  [
    "multiversities",
    {
      lemma: "multiversity",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -ities",
  ],
  [
    "deoccupancy",
    {
      lemma: "deoccupancy",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -ncy",
  ],
  [
    "deoccupancies",
    {
      lemma: "deoccupancy",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -ncies",
  ],
  [
    "postmythology",
    {
      lemma: "postmythology",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -logy",
  ],
  [
    "postmythologies",
    {
      lemma: "postmythology",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -logies",
  ],
  [
    "postcrastination",
    {
      lemma: "postcrastination",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -ation",
  ],
  [
    "postcrastinations",
    {
      lemma: "postcrastination",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -ations",
  ],
  [
    "metastablishment",
    {
      lemma: "metastablishment",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -ment",
  ],
  [
    "metastablishments",
    {
      lemma: "metastablishment",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -ments",
  ],
  [
    "postfusion",
    {
      lemma: "postfusion",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -sion",
  ],
  [
    "postfusions",
    {
      lemma: "postfusion",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -sions",
  ],
  [
    "hypervention",
    {
      lemma: "hypervention",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -tion",
  ],
  [
    "hyperventions",
    {
      lemma: "hypervention",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -tions",
  ],
  [
    "megavalence",
    {
      lemma: "megavalence",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -ence",
  ],
  [
    "megavalences",
    {
      lemma: "megavalence",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -ences",
  ],
  [
    "fraudulenceship",
    {
      lemma: "fraudulenceship",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -ship",
  ],
  [
    "fraudulenceships",
    {
      lemma: "fraudulenceship",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -ships",
  ],
  [
    "fakeism",
    {
      lemma: "fakeism",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -ism",
  ],
  [
    "fakeisms",
    {
      lemma: "fakeism",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -isms",
  ],
  [
    "copium",
    {
      lemma: "copium",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -ium",
  ],
  [
    "copiums",
    {
      lemma: "copium",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -iums",
  ],
  [
    "modifier",
    {
      lemma: "modifier",
      pos: { NOUN: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN ending in -ifier",
  ],
  [
    "modifiers",
    {
      lemma: "modifier",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -ifiers",
  ],
  [
    "anarcocommunist",
    {
      lemma: "anarcocommunist",
      pos: { NOUN: 1, ADJ: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN/ADJ ending in -ist",
  ],
  [
    "anarcocommunists",
    {
      lemma: "anarcocommunist",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -ists",
  ],
  [
    "bullshitful",
    {
      lemma: "bullshitful",
      pos: { NOUN: 1, ADJ: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN/ADJ ending in -ful",
  ],
  [
    "bullshitfuls",
    {
      lemma: "bullshitful",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -fuls",
  ],
  [
    "kekian",
    {
      lemma: "kekian",
      pos: { NOUN: 1, ADJ: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN/ADJ ending in -ian",
  ],
  [
    "kekians",
    {
      lemma: "kekian",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -ians",
  ],
  [
    "redditoid",
    {
      lemma: "redditoid",
      pos: { NOUN: 1, ADJ: 1 },
      feats: { Number: "Sing" },
    },
    "a singular NOUN/ADJ ending in -oid",
  ],
  [
    "redditoids",
    {
      lemma: "redditoid",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural NOUN ending in -oids",
  ],
  [
    "sovietise",
    {
      lemma: "sovietise",
      pos: { VERB: 1 },
      feats: { VerbForm: "Fin", Tense: "Pres", Person: 1 },
    },
    "a VERB lemma ending in -ise",
  ],
  [
    "prettify",
    {
      lemma: "prettify",
      pos: { VERB: 1 },
      feats: { VerbForm: "Fin", Tense: "Pres", Person: 1 },
    },
    "a VERB lemma ending in -ify",
  ],
  [
    "deopinionate",
    {
      lemma: "deopinionate",
      pos: { VERB: 1 },
      feats: { VerbForm: "Fin", Tense: "Pres", Person: 1 },
    },
    "a VERB lemma ending in -ate",
  ],
  [
    "sunwise",
    {
      lemma: "sunwise",
      pos: { ADJ: 1, ADV: 1 },
    },
    "an ADJ/ADV ending in -wise",
  ],
  [
    "wingage",
    {
      lemma: "wingage",
      pos: { NOUN: 1, VERB: 1 },
      feats: {
        Number: "Sing",
        VerbForm: "Fin",
        Tense: "Pres",
        Person: 1,
      },
    },
    "a NOUN/VERB ending in -age",
  ],
  [
    "wingages",
    {
      lemma: "wingage",
      pos: { NOUN: 1, VERB: 1 },
      feats: {
        Number: "Plur",
        VerbForm: "Fin",
        Tense: "Pres",
        Person: 3,
      },
    },
    "a NOUN/VERB ending in -ages",
  ],
  [
    "almightily",
    {
      lemma: "almightily",
      pos: { ADV: 1 },
    },
    "an ADV ending in -ily with a matching -y ADJ in the dictionary",
  ],
  [
    "almondily",
    {
      lemma: "almondily",
      pos: { ADJ: 1, ADV: 1 },
    },
    "an ADJ/ADV ending in -ily without a matching -y ADJ in the dictionary",
  ],
  [
    "understandably",
    {
      lemma: "understandably",
      pos: { ADV: 1 },
    },
    "an ADV ending in -bly with a matching -y ADJ in the dictionary",
  ],
  [
    "tumbly",
    {
      lemma: "tumbly",
      pos: { ADJ: 1, ADV: 1 },
    },
    "an ADJ/ADV ending in -bly without a matching -y ADJ in the dictionary",
  ],
  [
    "cryptically",
    {
      lemma: "cryptically",
      pos: { ADV: 1 },
    },
    "an ADV ending in -ically with a matching -ic ADJ in the dictionary",
  ],
  [
    "metastatistically",
    {
      lemma: "metastatistically",
      pos: { ADJ: 1, ADV: 1 },
    },
    "an ADJ/ADV ending in -ically without a matching -ic ADJ in the dictionary",
  ],
  [
    "culpable",
    {
      lemma: "culpable",
      pos: { ADJ: 1 },
    },
    "an ADJ ending in -le with a matching -ly ADV in the dictionary",
  ],
  [
    "virile",
    {
      lemma: "virile",
      pos: { ADJ: 1, ADV: 1 },
    },
    "an ADJ ending in -le without a matching -ly ADV in the dictionary",
  ],
  [
    "demulcent",
    {
      lemma: "demulcent",
      pos: { NOUN: 1 },
    },
    "a word ending in -cent without a matching NOUN in the dictionary",
  ],
  [
    "demulcent",
    {
      lemma: "demulcent",
      pos: { NOUN: 1 },
    },
    "a word ending in -ent without a matching NOUN in the dictionary",
  ],
  [
    "coolant",
    {
      lemma: "coolant",
      pos: { NOUN: 1 },
    },
    "a word ending in -ant without a matching NOUN in the dictionary",
  ],
  [
    "expectant",
    {
      lemma: "expectant",
      pos: { ADJ: 1 },
    },
    "a word ending in -ant with a matching NOUN ending in -ancy in the dictionary",
  ],
  [
    "decent",
    {
      lemma: "decent",
      pos: { ADJ: 1 },
    },
    "a word ending in -ent with a matching NOUN ending in -ency in the dictionary",
  ],
  [
    "exorbitant",
    {
      lemma: "exorbitant",
      pos: { ADJ: 1 },
    },
    "a word ending in -ant with a matching NOUN ending in -ance in the dictionary",
  ],
  [
    "consequent",
    {
      lemma: "consequent",
      pos: { ADJ: 1 },
    },
    "a word ending in -ent with a matching NOUN ending in -ence in the dictionary",
  ],
  [
    "migrant",
    {
      lemma: "migrant",
      pos: { ADJ: 1 },
    },
    "a word ending in -ant with a matching NOUN ending in -ation in the dictionary",
  ],
  [
    "cyclical",
    {
      lemma: "cyclical",
      pos: { ADJ: 1 },
    },
    "a word ending in -ic with a matching ADV ending in -ically in the dictionary",
  ],
  [
    "cyclic",
    {
      lemma: "cyclic",
      pos: { ADJ: 1 },
    },
    "a word ending in -ic with a matching ADV ending in -ically in the dictionary",
  ],
  [
    "mimic",
    {
      lemma: "mimic",
      pos: { ADJ: 1, ADV: 1 },
    },
    "a word ending in -ic without a matching ADV ending in -ically in the dictionary",
  ],
  [
    "partial",
    {
      lemma: "partial",
      pos: { ADJ: 1 },
    },
    "a word ending in -ial with a matching NOUN ending without -ial in the dictionary",
  ],
  [
    "nuptial",
    {
      lemma: "nuptial",
      pos: { ADJ: 1, ADV: 1 },
    },
    "a word ending in -ial without a matching NOUN ending without -ial in the dictionary",
  ],
  [
    "cried",
    {
      lemma: "cry",
      pos: { ADJ: 1, VERB: 1 },
      feats: { Tense: "Past" },
    },
    "a past tense ending in -ied with a matching VERB ending without -ied in the dictionary",
  ],
  [
    "covfied",
    {
      lemma: "covfied",
      pos: { NOUN: 1 },
    },
    "a word ending in -ied without a matching VERB ending without -ied in the dictionary",
  ],
  [
    "morphed",
    {
      lemma: "morph",
      pos: { ADJ: 1, VERB: 1 },
      feats: { Tense: "Past" },
    },
    "a past tense ending in -ed with a matching VERB ending without -ed in the dictionary",
  ],
  [
    "moped",
    {
      lemma: "mope",
      pos: { ADJ: 1, VERB: 1 },
      feats: { Tense: "Past" },
    },
    "a past tense ending in -ed with a matching VERB ending without -d in the dictionary",
  ],
  [
    "milkweed",
    {
      lemma: "milkweed",
      pos: { NOUN: 1 },
    },
    "a word ending in -ed without a matching VERB ending without -ed in the dictionary",
  ],
  [
    "thing",
    {
      lemma: "thing",
      pos: { NOUN: 1 },
    },
    "a word ending in -ing without a matching VERB ending without -ing in the dictionary",
  ],
  [
    "recombobulating",
    {
      lemma: "recombobulating",
      pos: { NOUN: 1 },
    },
    "a word ending in -ing that has no deinflected form in the dictionary",
  ],
  [
    "thinking",
    {
      lemma: "think",
      pos: { NOUN: 1, VERB: 1, ADJ: 1 },
      feats: {
        VerbForm: "Part",
        Tense: "Pres",
        Number: "Sing",
      },
    },
    "a word ending in -ing with a matching VERB ending without -ing in the dictionary",
  ],
  [
    "complicating",
    {
      lemma: "complicate",
      pos: { NOUN: 1, VERB: 1, ADJ: 1 },
      feats: {
        VerbForm: "Part",
        Tense: "Pres",
        Number: "Sing",
      },
    },
    "a word ending in -ing with a matching VERB ending without -ing and with +e in the dictionary",
  ],
  [
    "munchies",
    {
      lemma: "munchies",
      pos: { NOUN: 1 },
    },
    "a word ending in -ies that doesn't have a matching singular NOUN in the dictionary",
  ],
  [
    "smithies",
    {
      lemma: "smithy",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural ending in -ies that has a matching NOUN ending in -y in the dictionary",
  ],
  [
    "solidifies",
    {
      lemma: "solidify",
      pos: { VERB: 1 },
      feats: { VerbForm: "Fin", Tense: "Pres", Person: 3 },
    },
    "a plural ending in -ies that has a matching VERB ending in -y in the dictionary",
  ],
  [
    "spies",
    {
      lemma: "spy",
      pos: { VERB: 1, NOUN: 1 },
      feats: {
        VerbForm: "Fin",
        Tense: "Pres",
        Person: 3,
        Number: "Plur",
      },
    },
    "a plural ending in -ies that has both a matching NOUN and VERB ending in -y in the dictionary",
  ],
  [
    "stymies",
    {
      lemma: "stymy",
      pos: { VERB: 1, NOUN: 1 },
      feats: {
        VerbForm: "Fin",
        Tense: "Pres",
        Person: 3,
        Number: "Plur",
      },
    },
    "a plural ending in -ies that has both a matching NOUN and VERB ending in -y in the dictionary",
  ],
  [
    "neckties",
    {
      lemma: "necktie",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural ending in -ies that has a matching NOUN ending in -ie",
  ],
  [
    "diabetes",
    {
      lemma: "diabetes",
      pos: { NOUN: 1 },
    },
    "a word ending in -es that doesn't have a matching singular NOUN in the dictionary",
  ],
  [
    "childcares",
    {
      lemma: "childcare",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural ending in -es that has a matching NOUN ending in -e in the dictionary",
  ],
  [
    "chides",
    {
      lemma: "chide",
      pos: { VERB: 1 },
      feats: { VerbForm: "Fin", Tense: "Pres", Person: 3 },
    },
    "a plural ending in -es that has a matching VERB ending in -e in the dictionary",
  ],
  [
    "abuses",
    {
      lemma: "abuse",
      pos: { VERB: 1, NOUN: 1 },
      feats: {
        VerbForm: "Fin",
        Tense: "Pres",
        Person: 3,
        Number: "Plur",
      },
    },
    "a plural ending in -es that has both a matching NOUN and VERB ending in -e in the dictionary",
  ],
  [
    "businesses",
    {
      lemma: "business",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural ending in -es that has a matching NOUN ending without -es in the dictionary",
  ],
  [
    "cherishes",
    {
      lemma: "cherish",
      pos: { VERB: 1 },
      feats: { VerbForm: "Fin", Tense: "Pres", Person: 3 },
    },
    "a plural ending in -es that has a matching VERB ending without -es in the dictionary",
  ],
  [
    "anguishes",
    {
      lemma: "anguish",
      pos: { VERB: 1, NOUN: 1 },
      feats: {
        VerbForm: "Fin",
        Tense: "Pres",
        Person: 3,
        Number: "Plur",
      },
    },
    "a plural ending in -es that has both a matching NOUN and VERB ending without -es in the dictionary",
  ],
  [
    "chilis",
    {
      lemma: "chili",
      pos: { NOUN: 1 },
      feats: { Number: "Plur" },
    },
    "a plural ending in -s that has a matching NOUN ending without -s in the dictionary",
  ],
  [
    "learns",
    {
      lemma: "learn",
      pos: { VERB: 1 },
      feats: { VerbForm: "Fin", Tense: "Pres", Person: 3 },
    },
    "a plural ending in -s that has a matching VERB ending without -s in the dictionary",
  ],
  [
    "laughs",
    {
      lemma: "laugh",
      pos: { VERB: 1, NOUN: 1 },
      feats: {
        VerbForm: "Fin",
        Tense: "Pres",
        Person: 3,
        Number: "Plur",
      },
    },
    "a plural ending in -s that has both a matching NOUN and VERB ending without -s in the dictionary",
  ],
  [
    "leathery",
    {
      lemma: "leathery",
      pos: { ADJ: 1 },
    },
    "an ADJ ending in -y that has a NOUN without -y in the dictionary",
  ],
  [
    "hungry",
    {
      lemma: "hungry",
      pos: { ADJ: 1 },
    },
    "an ADJ ending in -y that has an ADV with -y +ily in the dictionary",
  ],
  [
    "postpossibly",
    {
      lemma: "postpossibly",
      pos: { ADJ: 1, ADV: 1 },
    },
    "an ADJ ending in -y that has no ADV with -y +ily in the dictionary",
  ],
  [
    "covfefy",
    {
      lemma: "covfefy",
      pos: { ADJ: 1, ADV: 1, NOUN: 1 },
    },
    "an ADJ ending in -y that has neither NOUN nor ADV in the dictionary",
  ],
] as [
  text: string,
  tokens: { lemma: string; pos?: PosWeights; feats?: LexicalFeatures },
  name: string,
][];

describe("lemmatize", () => {
  tests.forEach(([text, token, name]) => {
    it(name, () => {
      assert.deepEqual(lemmatize(text, { dictionary }), token);
    });
  });
});
