import type { ParsedToken, PosTag } from "../src/types.js";

export const systemPrompt = `You assign part-of-speech tags using a FUNCTIONAL tagset with exactly 8 tags. It is NOT Universal Dependencies. Tags are decided by the job a word does in its sentence, not by the word's dictionary class.

THE 8 TAGS
NOUN, VERB, ADJ, ADV, MARK, PUNCT, INTJ, X

WHERE THIS DIFFERS FROM UD — read this twice, it is where mistakes happen:
- Determiners are ADJ. "the", "a", "this", "my", "some", "every" are ADJ.
- Pronouns are NOUN. "she", "it", "they", "someone", "myself" are NOUN.
- RELATIVE PRONOUNS are pronouns, so they are NOUN: "who", "whom", "whose", "which", "what". "The man WHO came" -> "who" is NOUN. "each of WHICH has been tested" -> "which" is NOUN. Heading a clause does not make a word a marker; a subject heads its clause too. Three cases nearby are NOT this: "that" is MARK when it is a complementizer ("I said THAT he left") though NOUN as a relative ("the book THAT I read"); the relative adverbs "where", "when" and "why" stand in for an adverbial rather than a noun and stay MARK; and an interrogative determiner is ADJ ("WHICH bud is R", "WHAT devices you can install").
- Prepositions AND conjunctions are both MARK. "of", "since", "and", "but", "although", "because" are all MARK. There is no ADP, SCONJ or CCONJ.
- Numbers are ALWAYS NOUN, never ADJ. "Buy two oranges" -> "two" is NOUN. "Buy 150" -> "150" is NOUN. This is deliberate: a number modifying a noun is treated like the modifier in a compound noun ("wood chipper"), and compound modifiers keep their own tag. Never answer ADJ for a numeral.
- Modals, auxiliaries and copulas are VERB. "will", "can", "have", "is", "was" are VERB.
- There is no PART, no PROPN, no SYM, no AUX, no DET, no NUM, no PRON.

NOUN
A noun refers to a concrete or abstract thing. Two tests:
1. It cannot take an unmarked object. "Some men take chances" — "men" can be extended with a marked object ("Some men OF COURAGE take chances") but not a direct one.
2. It has a noun reading in the dictionary, OR its context forces one. A word is forced to be a noun when a determiner precedes it and it is not modifying a noun to its right: "The DISEASED cannot leave", "The MENTORING of young talent", "The BLUE I like is darker" — but NOT "the blue shirt", where "blue" modifies "shirt".

VERB
Gerunds stay VERB even when they act as a subject, because they still take arguments: "COOKING takes skill", "COOKING BLOWFISH takes skill". But a gerund forced to be a noun is NOUN: "My COOKING is awful".
The four English inflections and when each is not a VERB:
- Present finite (Tense=Pres, VerbForm=Fin): VERB. "I say", "he plays".
- Past finite (Tense=Past, VerbForm=Fin): VERB in "he played"; ADJ in "a COOKED meal", "DELAYED trains annoy him".
- Present participle / gerund (Tense=Pres, VerbForm=Part): VERB in "I am PLAYING to win"; ADJ in "a CRYING child".
- Past participle (Tense=Past, VerbForm=Part): VERB only when another verb precedes it — "he has BROKEN the jar"; otherwise ADJ — "he needs WRITTEN confirmation", "a FORETOLD disaster".

ADJ and ADV
- ADJ modifies a noun, or acts as the object of a verb.
- ADV modifies a verb, an adjective, a marker or another adverb.
- An adjective may modify a noun to its LEFT, which happens with indefinite pronouns: "She wants someone TALL" — "tall" is the right-adjective of "someone".
- When a word could be either and it is the OBJECT OF A VERB, answer ADV. Answer ADJ only when it modifies a noun to its right. "He was acting WEIRD" -> ADV.

MARK
Markers mark objects and give them semantics: prepositions, postpositions and conjunctions. A marker with no object stays a marker if the meaning is unchanged: "The cat jumped DOWN" is MARK, same as "The cat jumped DOWN the table".
Polysemous markers still need deciding: "once" is ADV in "He ONCE told me a joke" but MARK in "ONCE free, he opened a flower shop".

PUNCT
Any character in Unicode General_Category P. Nothing else is ever PUNCT.

INTJ
Conversational and independent of the sentence around it. "ok" is INTJ in "OK, I'll do it" but ADJ in "an OK movie". Words that can only be interjections ("uh-oh", "ahem", emoji) are always INTJ.

X
Gibberish with no grammatical shape ("xptq"). Almost never the right answer — nearly any word can act as at least NOUN or VERB in the right context.

HOW TO ANSWER
You are given one sentence, already tokenized and mostly tagged by a set of grammar rules. Only the listed positions are still undecided. For each, choose exactly one tag FROM THE CANDIDATES OFFERED for that position — the candidates are what the grammar rules could not rule out, and a tag outside them is always wrong. Decide each position from the sentence in front of you, not from how the word is usually tagged.`;

export type Ambiguity = { index: number; form: string; candidates: PosTag[] };

export const buildPrompt = (
  tokens: ParsedToken[],
  ambiguities: Ambiguity[],
  { explain }: { explain: boolean } = { explain: false },
) => {
  const undecided = new Set(ambiguities.map(({ index }) => index));
  const numbered = tokens
    .map(({ form, xpos }, index) =>
      undecided.has(index)
        ? `  ${index}: ${form}   <-- UNDECIDED`
        : `  ${index}: ${form}   ${xpos}`,
    )
    .join("\n");
  const questions = ambiguities
    .map(
      ({ index, form, candidates }) =>
        `  ${index}: "${form}" — choose one of: ${candidates.join(", ")}`,
    )
    .join("\n");

  return `SENTENCE
${tokens.map(({ form }) => form).join(" ")}

TOKENS
${numbered}

DECIDE THESE POSITIONS
${questions}

Answer with one entry per undecided position, using the exact index shown${
    explain
      ? ". Give a brief reason citing the rule you applied, under 20 words"
      : ""
  }.`;
};

export const responseSchema = (explain: boolean) => ({
  type: "object",
  properties: {
    decisions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          tag: {
            type: "string",
            enum: ["NOUN", "VERB", "ADJ", "ADV", "MARK", "PUNCT", "INTJ", "X"],
          },
          ...(explain ? { reason: { type: "string" } } : {}),
        },
        required: ["index", "tag", ...(explain ? ["reason"] : [])],
      },
    },
  },
  required: ["decisions"],
});

export const adjudicationPrompt = (
  tokens: { form: string; xpos: PosTag }[],
  index: number,
  candidates: PosTag[],
) => {
  const numbered = tokens
    .map(({ form, xpos }, position) =>
      position === index
        ? `  ${position}: ${form}   <-- THE TOKEN IN QUESTION`
        : `  ${position}: ${form}   ${xpos}`,
    )
    .join("\n");

  return `SENTENCE
${tokens.map(({ form }) => form).join(" ")}

TOKENS
${numbered}

Two readings of token ${index}, "${tokens[index].form}", are in dispute: ${candidates.join(" or ")}.

Decide which one the specification requires. Work from the token's function in
this sentence. Name the guideline that settles it — quote the rule, do not just
assert the tag. If the specification genuinely does not decide between them, say
so by setting "decisive" to false and still give your best answer.`;
};

export const adjudicationSchema = (candidates: PosTag[]) => ({
  type: "object",
  properties: {
    tag: { type: "string", enum: candidates },
    guideline: { type: "string" },
    decisive: { type: "boolean" },
  },
  required: ["tag", "guideline", "decisive"],
});

export type Adjudication = {
  tag: PosTag;
  guideline: string;
  decisive: boolean;
};

export type Decision = { index: number; tag: PosTag; reason?: string };

export const parseDecisions = (content: string): Decision[] => {
  const { decisions } = JSON.parse(content) as { decisions?: Decision[] };
  if (!Array.isArray(decisions)) {
    throw new TypeError("reply had no decisions array");
  }

  return decisions;
};
