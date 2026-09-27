# Working on Artisan

A client-side, dependency-free TypeScript NLP library: tokenizer, tagger and
dependency parser. `tokenize → tag → parse`, with tagging and parsing interleaved.
It is deliberately deterministic and runs in a browser with no network.

Read `docs/parts-of-speech.md` before you touch tagging: it is the specification,
and most disagreements in this codebase turn out to be disagreements with it.

# The working agreement

These rules bind every agent that touches this repository. They are not advice.
A hook enforces the first two on every edit you make, and it will reject the
edit and hand you the reasons.

## 1. No comments in code

Not one. Not a header, not a `//` at the end of a line, not a JSDoc block. The
only comments the linter allows are machine-readable directives:
`eslint-disable`, `@ts-expect-error`, `prettier-ignore`. Everything else is an
error.

This is not a style preference. A comment is a claim about the code that no
test checks and no compiler verifies, so it rots, and a wrong comment costs
more than no comment. Write code that does not need one instead: name the
variable after what it holds, name the function after what it does, and lift a
condition you were about to explain into a predicate whose name is the
explanation.

```
if (token.xpos === "ADJ" && !token.feats.NumType) {   // not a number word
```

becomes

```
const isNonNumericAdjective = ({ xpos, feats }) =>
  xpos === "ADJ" && !feats.NumType;
```

**Where the prose goes:** `docs/architecture.md`. That file is the one place in
this repository where you may write for a human. Put there anything you would
have put in a comment and could not express in a name:

- why a design went one way when another way looks more obvious
- what you tried that did not work, and the measurement that says so
- an invariant that spans files and cannot live in any one of them
- a constraint imposed from outside that the code cannot state

Write it as you would a lab notebook: dated entries, newest at the top, one
finding each. When you learn something while working, that is where it goes.
Read it before you start; it is the fastest way to avoid repeating an
experiment that already failed.

## 2. Keep functions simple

The linter enforces, per function: cyclomatic complexity at most 10, nesting
depth at most 3, at most 20 statements, at most 60 lines, at most 4 parameters,
and at most 3 nested callbacks. Tests are exempt from the length and nesting
limits, because a `describe` block is not a function in the sense that matters.

When the gate rejects a function, do not spread the same logic across two
functions to get under the number. Ask what the function is actually deciding,
and give each decision a name. The usual moves:

- A long `if (a && b && !c) return x;` chain becomes one named predicate per
  condition, then a flat sequence of guards.
- A `switch` or if-chain that maps a value to a result becomes a lookup object.
- A loop with branching inside becomes a `filter` then a `map`, each named.
- A function that gathers, then decides, then formats, becomes three functions.

Never reach for `eslint-disable` to get past the gate. If you genuinely believe
a limit is wrong for a specific function, leave it failing and say so in your
summary. That is a decision for the person you are working with, not for you.

## 3. Finish with an independent review

When you believe a feature or a fix is done — tests written, tests passing,
lint clean — you are not done. Hand the work to a reviewer that has not been
reading over your shoulder:

```
Agent(subagent_type: "independent-reviewer",
      description: "Review <what you built>",
      prompt: "<the original task> ... <the diff, or the files to read>")
```

Give it the task as it was given to you and the diff you produced. Do not tell
it what you think is safe, and do not tell it where to look; a review you have
steered is not a review.

Then handle what comes back on the merits. Fix what is a real bug. Where you
disagree, say why in your summary — "the reviewer flagged X; it is not a bug
because Y" is a fine answer, and a better one than a silent fix. A review that
returns nothing is a legitimate result; report that too.

## 4. Write the summary in the house style

Every summary of your work follows `docs/STYLE_GUIDELINES.md`. Read it. The
short version: be direct, use the active voice, one idea per sentence, prefer
verbs to nouns, and say the thing instead of gesturing at it.

State what you changed, what you verified and how, and what you left undone.
If tests fail, print the failure. If you skipped part of the task, say which
part and why. Do not open with a restatement of the request, do not close with
an offer to do more, and do not describe your own work as comprehensive,
robust, or production-ready — show the evidence and let the reader judge.

## The loop, in order

1. Read `docs/architecture.md`.
2. Build the thing. The hook checks every edit as you go.
3. Write tests. Run them.
4. Run `npm run lint` and `npm run typecheck`. Both must be clean.
5. Record in `docs/architecture.md` anything you learned that the code cannot say.
6. Send the diff to `independent-reviewer`. Act on what it finds.
7. Summarize, in the house style.

---

# The project itself

The record below predates `docs/architecture.md` and stays here. New findings go
in `docs/architecture.md`, not in this section.

A client-side, dependency-free TypeScript NLP library: tokenizer, tagger and
dependency parser. It predates LLMs and is deliberately deterministic — it runs
in a browser with no network and no model server. Its expected input going
forward is **LLM-generated prose**, which is a different language from the
scraped text it was originally built on.

Read `docs/parts-of-speech.md` first. It is the specification, and most
disagreements in this codebase turn out to be disagreements with it. **Edit it
only when the tagset itself changes.** Everything about how tagging and parsing
_work_ — which rule asks what, which construction gets which shape — goes in
`docs/grammar.md` instead, which is where such decisions get written down as
they are settled.

## The tagset, in one paragraph

Eight functional tags: `NOUN VERB ADJ ADV MARK PUNCT INTJ X`. Tags describe the
job a word does, not its dictionary class. This is **not** Universal
Dependencies and the differences are where mistakes happen: determiners are
ADJ, pronouns are NOUN (including relative pronouns), prepositions **and**
conjunctions are both MARK, numbers are always NOUN, modals/auxiliaries/copulas
are VERB. There is no DET, ADP, SCONJ, CCONJ, NUM, PRON, PART, PROPN, AUX or
SYM.

## Architecture, and the one seam that matters

`tokenize → tag → parse`, with tagging and parsing interleaved.

The tagger is **80 deterministic rules in six ordered, first-match-wins lists**,
one list per candidate tag (`src/tag/index.ts`). A rule with `features: null`
**vetoes** that reading; anything else accepts it. Nothing coordinates the six
lists, which is the root cause of most inconsistency here.

When every list vetoes, `applyRules` forces the **last tag in `tagOrder`**
(`forced-no-legal-tag`). That makes the answer to a contradiction an artifact of
the order tags are tried in, so **adding a legal tag to a word can change what
it is forced to** — see the comparative adverbs in section 2.

**The seam:** where the rules narrow a word to one tag, that is the answer.
Where they leave two or more, something has to choose. That chooser is
currently an averaged perceptron — and it can equally be an LLM, which is what
`compare-taggers` exploits. `token.isDisambiguated` marks exactly those
positions, and the `"chose"` event from the audit sink carries the rule-legal
candidate set. Anything that wants to answer the same question the perceptron
answers must read candidates from that event, **not** from `token.misc.pos`,
which is every tag the word has ever had.

## 1. Training the model

**`train-tagger` has been deleted.** The only trainer is
`npm run train-from-annotations -- <annotated.jsonl> [--hold-out=N] [--epochs=N]`,
which learns from LLM-labelled ambiguous positions. `build-model` is now four
steps and builds the dictionary only; it no longer trains anything.

### Why the old trainer was removed

`train-tagger` learned from unlabeled text, taking as examples the words whose
tag the **rules** settled. That kept the build free of any dependence on a
previous model, and it was the only option before language models existed. But
at run time the model is consulted **precisely when the rules could not narrow
the candidates**, so a word the rules can settle is by construction not a word
the model will ever be asked about. The training and inference populations are
**disjoint**.

Measured, on 10,050 sentences of LLM prose:

|                                      | review gold | LLM silver |
| ------------------------------------ | ----------- | ---------- |
| no model (rules + most frequent tag) | **77.02%**  | **66.70%** |
| `train-tagger`, 1 epoch              | 62.68%      | 65.08%     |
| `train-tagger`, 5 epochs             | 66.91%      | —          |

Worse than no model; **more epochs made it worse** (training accuracy rose to
96% as test accuracy fell) and **more data made it worse** (3,840 sentences
scored 68.24%, 10,050 scored 62.68%). This was not a matter of scale, which is
why the script is gone rather than tuned. If you are tempted to reintroduce
self-supervision from rule-settled words, this is the experiment that says no.

### How training works now

`annotate-corpus` runs the rules over a corpus and asks a model to settle only
the open positions, against `docs/parts-of-speech.md`.
`train-from-annotations` then learns from exactly those positions, with
candidates from the audit sink. The model's job is to learn how the annotator
resolves an ambiguous word from context, and then do it without them.

`--hold-out=N` scores the model on the last N sentences after **every** epoch
and keeps the best. This is load-bearing, not a nicety: training accuracy climbs
past 98% while held-out accuracy turns over around epoch 4, so a fixed epoch
count ships an overfitted model. The report prints the most-frequent-tag floor
over the same held-out words.

### The current model

Trained on 3,400 silver sentences (5,749 examples), best epoch 11 of 16, with
600 sentences held out. The data files are gitignored and are not in the
repository; the paraphrase sample is reproducible from its seed, the silver
annotations only by annotating again:

- `data/corpus/paraphrases.jsonl` — 15,000 corpus sentences (seed 1, 30/page)
- `data/corpus/silver.jsonl` — the first 4,000 annotated by `qwen3.8:27b`
- `data/corpus/silver-holdout.jsonl` — the last 600 of those, never trained on

| whole pipeline, ambiguous words     | no model | with model |
| ----------------------------------- | -------- | ---------- |
| **held-out LLM domain** (984 words) | 64.51%   | **85.87%** |
| review gold, out of domain (692)    | 77.02%   | **77.68%** |

**+21.4 points in domain**, and mildly positive out of domain too. The audit's
model-fixable bucket fell from 125 to 118 and overall right went 1,646 → 1,650.

The perceptron's own accuracy on held-out ambiguous positions is 85.20% against
a 65.94% most-frequent-tag floor — that is the number `train-from-annotations`
prints, measured on the positions in isolation rather than end to end.

**Domain dominates every other factor.** The hand-annotated set is Amazon
reviews and tweets; the target domain is model-written prose. A model trained on
one and scored on the other is measuring domain transfer, not tagging. Keep both
numbers and say which is which. `npm run test-tagger -- --dataset=path` scores
any annotated set.

Scale still helps: 997 training examples gave 81.88% held-out, 3,485 gave
84.42%, 5,749 gave 85.20%. 11,000 corpus sentences remain unannotated.

Two caveats on silver-trained models:

- `annotate-corpus` drops any tag outside the rule-legal candidates, so a silver
  set **can never contain a label the rules vetoed** and therefore can never
  expose a rule bug. On the human gold set 167 of 633 labels (26%) are
  unreachable — that is the ceiling the rules impose, and it is invisible in
  silver data.
- The same applies to the **dictionary**, and it has already bitten once. The
  candidates come from each word's `pos` set, so a reading the dictionary lacks
  is a label the annotator cannot give. `data/corpus/silver.jsonl` was annotated
  while `addInflections` was dropping whole inflection entries, so `causing`,
  `known`, `failing` and `rounding` were NOUN-only and are labelled NOUN in the
  silver set even as finite verbs ("What is causing VShare to malfunction?").
  Fixing the dictionary therefore _lowers_ the held-out score, 9467 → 9443 of
  9876 tokens, because the fix disagrees with labels that were forced. Of those
  26 flips, roughly four are real losses on hand inspection. **`silver.jsonl`
  and the `weights.json` trained from it both predate the fix; re-annotate
  before trusting either as a target.**
- The model inherits the annotating model's biases.

`npm run evaluate-features` is a third thing again: it trains in process on the
**gold set's own labels** under 5-fold cross-validation (85.67% vs a 77.65%
floor) and leaves no file. It measures whether the features are worth anything,
not whether a trainable model exists.

`FEATURE_SET_VERSION` in `src/featurize/index.ts` gates loading. Weights trained
under a different feature set are **ignored with a warning**, because a model
that matches a handful of feature names and scores nonsense on the rest is worse
than no model. Bump it whenever feature _names_ change; verify with an A/B of
`evaluate-features` output.

## 2. How data is generated or extended

**Static inputs — never regenerated by any script.** Replace by hand:
`frequencies.json` (60MB word-frequency list), `synonyms.json` (WordNet),
`antonyms.json`, `emojis.json`, `inflections.json`.

**Hand-maintained source:** `scripts/handpicked-words.ts` — closed-class words
and their features (`PronType`, `ConjType`, `AdpType`, …) plus an authoritative
`pos` set. **The handpicked `pos` set wins**: `build-dictionary` filters the
corpus-derived weights down to the tags listed there, so removing a tag from a
handpicked entry makes that reading structurally impossible. This is the
strongest available way to enforce a rule — no tagger rule needed.

**Generated from a corpus of unlabeled text**, in this order:

| step | command                              | reads                                 | writes                                               |
| ---- | ------------------------------------ | ------------------------------------- | ---------------------------------------------------- |
| 1    | `build-corpus-stats -- corpus.jsonl` | corpus                                | `tagger-data/parser-word-tags.txt`, `prep-pairs.txt` |
| 2    | `build-likelihoods`                  | parser-word-tags.txt                  | `data/pos.json`                                      |
| 3    | `build-preposition-pairs`            | prep-pairs.txt                        | `data/pairs.json`                                    |
| 4    | `build-dictionary`                   | handpicked + all static + pos + pairs | `data/dictionary.json`                               |

`npm run build-model -- corpus.jsonl` runs all four. Corpus format is one JSON
object per line with a `text` property (`scripts/corpus.ts` streams it, with
Ctrl-C resume). **None of these trains a model** — see section 1.

The dictionary build still runs with **no model loaded**, so it never depends on
a previous one. What changed is the perceptron: it is now supervised by an
outside annotator rather than bootstrapped from the rules, so the old
"only rule-settled words, and only up to the first guess" invariants no longer
apply to training. They still describe how `build-corpus-stats` gathers
statistics, and that pass must stay model-free.

The one remaining loop is benign: step 1 tokenizes with the current dictionary
and step 4 rewrites part of it. Safe because `pos.json` only redistributes
weight among tags a word **already has** — it can never add or remove a legal
parse, only change which one wins a tie.

`build-dictionary` is **byte-for-byte reproducible**: run it before you change it
and diff, so the diff you get afterwards is only your change.

### Comparative and superlative forms

`addInflections` reads the ADJ inflection list as `<comparative> <superlative>`
and now records that as **`Degree=Cmp|Sup`** (`GradeDegree` in `src/types.ts`),
on 1,609 lemmas. It is a lexical feature only — `featurize` does not read it, so
`FEATURE_SET_VERSION` stays at 2 and existing weights keep loading. One rule
reads it: `v-is-comp-adj`/`n-is-comp-adj` treat the word before `than` as the
adjective of the comparison, and a comparison has one graded element, so a word
whose predecessor is already graded is the thing being compared instead. That is
what lets `said` stay a verb in "easier said than done".

Those same forms also **inherit the adverb reading of their lemma**. Wordnet
lists comparatives only under ADJ with an empty ADV list, and `addInflections`
reads the empty list as evidence the word is really an adjective and drops ADV.
That is right for the lemma — `easy` gets its adverb reading back from the corpus
— but it left `easier`, `harder`, `later` and `faster` unable to be adverbs at
all, so "it pushed harder" had no legal tag. 458 entries changed.

Measured on its own, that fix was **+4 on the audit's absolute right and −1 on
every-token gold**, which is worth understanding before touching it again: three
of the four losses were positions where every reading was already vetoed, so the
answer came from `forced-no-legal-tag`, and adding ADV changed which tag is last
in `tagOrder`. The rules had already failed there; the fix only changed how.

**New corpus tooling (both resumable — long runs are expected to be stopped):**

- `npm run fetch-paraphrases -- --sentences=N --seed=1` samples
  [redis/llm-paraphrases](https://huggingface.co/datasets/redis/llm-paraphrases)
  (7.07M model-written sentence pairs) into `data/corpus/paraphrases.jsonl`.
  Checkpoints visited pages; because page order is a function of the seed alone,
  **an interrupted run yields a byte-identical file to an uninterrupted one**
  (verified). Caps sentences per page because consecutive rows are rewordings of
  each other — uncapped, one page returns a hundred versions of one question.
- `npm run annotate-corpus -- --model=qwen3.8:27b --limit=N` runs the rules,
  asks an LLM only the positions they left open, and writes
  `data/corpus/annotated-llm.jsonl` **in the same shape as
  `annotated-dataset.json`** so every existing tool reads it. Checkpoints
  position; `--limit` caps a session, not the job. ~1.3s/sentence.
  Output is a **silver standard** — one model's reading, ~90% agreement with a
  human. Train on it; do not score against it.

## 3. The four sources of truth, and how they fight

There are four, and each was wrong somewhere:

1. **`docs/parts-of-speech.md`** — the spec.
2. **`data/tagger-data/annotated-dataset.json`** — 449 hand-annotated sentences.
3. **The deterministic rules** in `src/tag` and `src/parse`.
4. **`test/parse/index.test.ts`** — which is gold data too, and was treated as
   such.

An error in (2) or (4) does not look like an error. It looks like the tagger
being wrong, and it silently caps every number the project reports.

### The method

Reading 80 rule predicates against each other does not work — an 8-token
window, ~13 features, and most pairs never co-occur. What works is
**instrumenting what the rules actually did to each other, then ranking by
cost**:

- `npm run audit-rules` — the primary instrument. Splits every wrong tag into
  **rules allowed it** (a better model fixes it) / **rules vetoed it** (only a
  rule change fixes it) / **tag not offered** (dictionary) / **downstream** (an
  earlier word in the same ambiguous run was already wrong). Also lists
  contradictions, a ranked veto worklist with each rule's right-vs-wrong veto
  balance, dead rules, and shadowed rules.
- `npm start explain "<sentence>"` — the same question for one sentence.
- `npm run compare-taggers` — an LLM in the perceptron's seat, same positions.
- `npm run review-annotations` — audits the **gold set** against the spec.

### What this found and fixed

- **Shared predicates.** `src/grammar/index.ts` now holds the questions both
  tagger and parser ask; `src/grammar/divergent.ts` documents the ones that
  genuinely still disagree. A tag chosen under one reading and a head attached
  under a slightly different one is the shape almost every bug here takes.
- **"Untagged" read as "not that tag".** Rules inspecting the _next_ word were
  asking before it was tagged and treating undecided as decided-against —
  vetoing on evidence they did not have. `canStillBe()` is the fix. Swept; only
  one dangerous instance existed.
- **95 gold corrections**, each recorded with the guideline that justified it in
  `data/tagger-data/annotation-changes.json` (append-only). 17 numerals tagged
  ADJ against an explicit spec rule; one token tagged `ANY`, which is not in the
  tagset and so could never be matched by anything; 12 relative pronouns tagged
  MARK; plus 65 adjudicated individually.
- **Relative pronouns are NOUN.** `who/whom/whose/which/what` have no marker
  use in English, so MARK was removed from their **dictionary entries** rather
  than fought with rules, and the two rules that vetoed their NOUN and ADJ
  readings were deleted. `that` keeps MARK (real complementizer). Relative
  _adverbs_ (`where/when/why`) are not pronouns and stay MARK.
- **Changing a tag changes the tree.** Once `who` is a NOUN it fills a slot in
  its own clause, so the relative-clause verb attaches to the antecedent and the
  pronoun hangs off the verb. Five test _head_ expectations followed.
- **Contradictions**: 43 → 22 positions.

### Fixed phrases, and what standing alone hides

An upstream application needs five fixed phrases to come out the same shape
wherever they appear. Four of the five looked correct **on their own** and broke
inside a sentence, for one reason worth remembering: with no verb anywhere in the
input, a rule that searches the stack for a verb finds nothing and falls through
to a fallback that happens to land on the right head. Put a clause around the
phrase and the search succeeds, so the fallback never runs. **Test every phrase
alone and embedded**; the tests added for these do exactly that.

- **`as far as I am concerned`, `more than one can chew`** — a comparative marker
  (`ConjType=Comp`) is licensed by a degree word and belongs to it, not to the
  clause's verb. `isComparativeCorrelate` in `src/parse/index.ts` recognises two
  shapes and only two: a degree quantifier (`more`, `less`, `fewer`, `most`,
  `least`, `fewest`, matched on the **form** — the lemma of `less` is `little`),
  and the object of a preceding `as`, which is the `as X as` correlative. A bare
  -er form is deliberately excluded: including it would move "he runs faster than
  I do" and "she has more money than I do", and neither is wrong today.
  This needed a new transition, `assignHead`. Every other transition names its
  head by stack offset and so cannot reach a word that has been reduced — and
  "bite off more" is finished and popped before "than" is read.
- **`make a long story short`, `she made John blush`** — verb valence, the one
  thing nothing else in the pipeline could supply. `takesObjectComplement` in
  `src/grammar/index.ts` lists the verbs that take an object **and** something
  predicated of it. Every rule that walks left from a word stops at the first
  noun, soundly, because what sits behind a verb's object belongs to the object;
  for these verbs the second argument is behind the first by definition. Three
  places read the list: `findLeftVerbHead` may cross one noun phrase,
  `adj-is-compound-noun` yields to `adj-is-verb-object` when it does (until now
  the two could never disagree, since a noun in front was enough to make
  `findLeftVerbHead` give up), and `n-is-object-complement-v` licenses the bare
  infinitive that `v-is-noun` used to reject for not agreeing with the object.
  On the parser side `findObjectComplementVerbOffset` hangs the complement on the
  verb. That also settled a three-way disagreement about one structure:
  "made him angry" put the complement on the verb only because the pronoun object
  had been popped, while "consider the plan risky" and "made the room warm" put it
  on the object.
- **`each and every`** — coordinated determiners. `getConjunct` now answers an
  adjective on each side of a coordination the same way it already answered two
  nouns, instead of falling through to the verb branch, which looks past the noun
  for a verb anywhere ahead and coordinated two clauses out of two determiners in
  "each and every way I look". The parser side is three small pieces: the oracle
  lets a coordinated determiner into `adjectiveStep` (a determiner is otherwise
  left for the noun to collect), `adjectiveStep` attaches it to the conjunction,
  and `nounStep` takes the whole run with `leftArc(2)`.
- **`easier said than done`** — one dictionary gap and one over-broad rule, both
  in section 2: `easier` had no adverb reading, and `v-is-comp-adj` read any
  ADJ-capable word before `than` as the comparative.

Net, all five: audit right **1642 → 1648** (population 1928 → 1936), every-token
gold **5743 → 5744**, `npm test` 442 → 459 with one new known gap.

### Negation, and why it needed a shared predicate

The same upstream application needs `not` — and the fused `n't`/`'t`/`nt`, which
all carry lemma `not` — to hang off the same word for the same construction.
It did not. **`docs/grammar.md` is new and its Negation section is the statement
of what the shape is**; this section is only what changed to get there. The whole
rule is decided by **the word directly in front of the negator**, and
`src/grammar/index.ts` holds it as `isNegator`, `negatesVerbGroup` and
`findNegatedVerb`.

- **After an auxiliary or a modal** — the verbs with a `Mood`, plus lemmas `be`,
  `do` and `have` — the negator is inside a complex verb construction and
  belongs to the verb that construction is about, **stepping over any adverbs**:
  "can't accidentally _corrupt_", "will not always _stay_", "hasn't fully
  _tested_". It used to land on the adverb, so writing one in silently moved the
  negator and "can't corrupt" and "can't accidentally corrupt" came out two
  shapes. `advStep` no longer lets an adverb collect such a negator; leaving it
  on the stack is enough, because `verbStep` already takes a run of adverbs one
  at a time.
- **Directly in front, not anywhere in the clause.** Searching the clause for an
  auxiliary looks more general and breaks two readings that are not this one:
  the inverted question "am I not a _hooman_", where the negation is over the
  predicate rather than a later verb, and the correlative "is ... not _only_
  achieving", where `not only` is a pair. Both are gold and both survive because
  the test is adjacency.
- **No verb after it** — "is not _happy_", "was not the _problem_", "am I not a
  _hooman_" — and the head is the predicate the auxiliary introduces. The
  nominal case used to go back to the auxiliary instead, so one construction had
  two shapes depending on nothing but whether its predicate needed a determiner.
- **Anywhere else** the negator modifies what is directly at its right. A marker
  now takes it ("play outside the house not _out_ in the street"), where the
  search for a verb to the left used to carry it back to the clause's verb —
  which is the head it gets when it _is_ in a verb construction, so the two
  readings were indistinguishable downstream. A quantifier takes it too ("not
  _all_ cases"), and the oracle's determiner short-circuit had to learn that
  exception the same way it learned the coordinated one.
- **`nounStep` asked the same question a different way**: `lastLemma === "not" &&
secondLastTag !== "VERB"` tests a _stack_ neighbour where the grammar tests the
  _token_ before the negator, which is how a tag and a head come to disagree. It
  now calls `negatesVerbGroup`.
- One tagger rule, **`n-is-negated-det`**: a quantifier between a negator and a
  noun is determining that noun, not standing in for one ("not _all_ cases"), so
  its NOUN reading is vetoed. Needed because `all` is NOUN-first by frequency, so
  without it the sentence is only right when a model happens to choose ADJ. The
  gold set contains no such position, so the rule joins the dead-rule list and is
  **unmeasurable on the audit** — the same reason "Not all of them agree", where
  the quantifier really is a pronoun, is in the suite next to it.

`test/parse/invariants.test.ts` carries the guarantee: over the whole gold corpus
and under five arbitrary models, **every negator in a verb construction hangs off
the verb `findNegatedVerb` names**. It is checked at 42 of the corpus's 61
negators, and reverting the `advStep` change fails it on seven sentences,
three of them real gold ("I don't really drink", "I have not yet received", "I
hadn't really thought").

Net: `npm test` 459 → **474**, and every tagging number is unchanged to the token
— audit **1648/1936**, every-token gold **5744/6111**, review gold 77.32%,
held-out LLM domain 84.90%. Four of the five changes only move heads, which no
tagging metric can see, and the fifth never fires on this corpus. **There is no
script that scores heads over the gold set**; the parse suite is the only
instrument for this work.

### Rules of engagement, learned the hard way

- **Only principled changes.** A rule may be changed when it reasons from
  evidence it does not have, contradicts `docs/parts-of-speech.md` or
  `docs/grammar.md`, mirrors another rule that can also fire, or is
  dead/shadowed. **Never tune empirically** against the eval set.
- **Write the decision down in `docs/grammar.md`, not in the spec.** A change to
  how tagging or parsing works belongs there; `docs/parts-of-speech.md` is only
  touched when the tagset itself changes.
- **Measure every change on both the audit and the suite. Revert anything net
  negative**, and record what was tried and why it failed in
  `docs/architecture.md` — a silent revert invites a repeat.
- **Prefer fixing the data to adding a rule.** Removing a tag from a handpicked
  entry is stronger and simpler than a rule enforcing the same thing.
- **Beware circularity when "correcting" gold.** If the tagger has already
  committed to an answer and you move the annotation toward it, the gold set
  loses its ability to catch that error — you have trained the exam on the
  candidate. `review-annotations` classifies disputes as `spec` (mechanical),
  `ambiguous` (rules left it open — sound evidence) and `settled` (rules
  committed — **review by hand**), and never reveals to the adjudicator which
  reading came from where.
- The LLM adjudicator has a known failure mode: it tags **objects of markers**
  ("for now", "in full") as ADV where the spec makes them NOUN.

### The denominator trap

**Percentages here are not comparable across changes.** Removing a veto rule
moves positions from "rules settled it" to "model must choose", which changes
the denominator of `test-tagger`, `compare-taggers` and the audit at once. A
number can fall while the work strictly improves. Always report **absolute
counts** alongside, and say which denominator you used.

Current state, measured 2026-09-27 with the trained `weights.json` in place:
review gold **79.06%** of 635 words vs a 74.02% floor; audit **1708/1979
(86.31%)** right, 98 model-fixable, 115 vetoed-the-gold-tag, 19
tag-not-offered. `npm test` 507/507. `evaluate-features` 86.00% vs a 77.97%
floor. The held-out LLM domain figure needs `data/corpus/silver-holdout.jsonl`,
which is not in the repository. It was last recorded at 84.90% (821/967) vs a
60.19% floor and has not been re-measured since the rule changes logged in
`docs/architecture.md`.

The dictionary work in section 2 is the standing example. It lowered two headline
percentages (84.96% → 84.90% held out, 85.17% → 85.12% on the audit) while every
absolute count rose (819 → 821, 538 → 542, 1642 → 1648). It added correct
readings, which makes more words ambiguous and moves them into the scored
population; the rule work settled some outright and moved them out. On the one
denominator that does not move, **every token of the review gold set**, it went
5743 → **5744 of 6111**. Score a dictionary change that way; the ambiguous-word
percentages cannot see it. There is no script for it — `test-tagger` scores
ambiguous words only — so write the ten-line loop over `loadAnnotatedDataset()`
and throw it away.

## LLM adjudication

Runs through **Ollama** (`scripts/ollama.ts`), which serves local and `:cloud`
models through one endpoint, so a 27B on the GPU and a 756B remote are scored
identically. `qwen3.8:27b` (18GB) is the chosen model and the only one of
interest that runs locally on a 24GB GPU, which caps a local model at roughly
27B at Q4. Prompts live in `scripts/tagging-prompt.ts` and
must keep restating the UD differences; every model defaults to UD otherwise.

The model is a **teacher, not a runtime**. This library is client-side and
deterministic; the LLM exists to build better training data and to audit the
gold set.

`compare-taggers` reports **correct / illegal / missing** separately, and the
last two matter. `missing` catches a model that skips questions and posts a
good score on the rest. `illegal` — a tag outside the offered candidates —
turned out to be a **rule worklist with an outside witness**: most illegal
answers from a good model are the _gold_ tag, meaning the rules vetoed the
right answer and the model reached past the veto to it.

## Commands

```
npm test                  507 tests; rule guarantees run with NO model loaded
npm run lint / typecheck / format
npm run audit-rules       the primary instrument
npm start explain "..."   per-sentence rule trace
npm start tree "..."      the parse as an indented tree
npm start parse "..."     the parse as JSON
npm run test-tagger       accuracy over ambiguous words only; --dataset=path
npm run evaluate-features what the perceptron's features are worth
npm run compare-taggers   LLM vs perceptron vs floor, same positions
npm run review-annotations  audit the gold set against the spec
npm run fetch-paraphrases / annotate-corpus    resumable corpus work
npm run train-from-annotations -- <silver.jsonl> --hold-out=N   the only trainer
npm run build-model -- <corpus>   dictionary only; trains nothing
```

`npm run typecheck` (not `tsc --noEmit -p tsconfig.dev.json`, which checks
against a stale `dist/` and reports TS6305).

## Open items

- **More silver data is still the cheapest win.** 11,000 of the 15,000 corpus
  sentences are unannotated. `npm run annotate-corpus -- --corpus=../data/corpus/paraphrases.jsonl --out=../data/corpus/silver.jsonl --limit=N`
  resumes where it left off, at roughly 0.8s per sentence. The held-out curve
  was still rising at 5,749 examples.
- **There is no human-labelled benchmark for the target domain.** The 449-sentence
  gold set is reviews and tweets. Until some LLM-domain sentences are annotated by
  hand, in-domain numbers are agreement with qwen3.8, not correctness.
- **`who` is still inconsistent in gold** (MARK 5 / NOUN 2 before the fix; the
  fix landed, but the review can only see positions where the tagger disagrees,
  so a systematically wrong annotation the tagger _agrees_ with stays
  invisible). Sweep by word, not by disagreement.
- 11 of 80 rules never decide a word on this dataset — left alone until a
  larger gold set exists.
- Veto worklist top: `adj-is-compound-noun` (103 right : 25 wrong vetoes),
  `adv-is-mark` (16:9), `adj-is-forced-verb` (171:12 — leave it). Increasingly
  limited by annotation quality rather than rule quality.
- **`adj-is-compound-noun` is now the worst veto on the list**, and its top
  witness is `worse` in "Or something worse", where the word before is an
  indefinite pronoun. `docs/parts-of-speech.md` says outright that those take an
  adjective on their right, and the parser has an `isModifiablePronoun` for it;
  this rule reads the pair as a compound noun instead, which a pronoun cannot be
  the modifier of. Exempting it fixes `worse` and breaks `more` in "none more
  than the B&N", annotated ADV — net zero, so it was reverted unrecorded. Settle
  what the gold set means by a comparative after a pronoun first.
- **`Each and every day counts` is a known gap** (recorded as such in
  `test/parse/index.test.ts`). Sentence-initial, `adj-headless` reaches the
  determiner before `adj-is-forced-pro` does, and the coordinated-determiner
  exemption that fixed every other position was net negative there — see
  "Known collisions and traps" in `docs/grammar.md`. Two things block it: two gold tokens of
  "this" in "with this or that type of leader", and the model reading the
  following "counts" as a noun.
- `takesObjectComplement` is the only valence knowledge in the pipeline, and it is
  a hand-written list of 21 verbs. Widening it is a behaviour change to measure on
  its own; the compound-noun trap it walks into is real — an early version read
  "make a Skype call" and "has a Free NookBooks section" as verbs taking bare
  infinitives, which is what the determiner check in
  `isObjectComplementInfinitive` is for.
- `isUnmarkedRelativeRoot` is still defined twice, in `src/tag/index.ts` and
  `src/parse/index.ts`, under one name with unrelated evidence: a real
  tagger/parser divergence, too entangled with its callers to lift.
- **A leading quantifier is a determiner only when the model says so.** "All
  cases share the same strain" tags `All` NOUN with the rules alone — `all` is
  NOUN-first by frequency and `n-is-det` declines while the next word could
  still be a verb, which "cases" can. `n-is-negated-det` settles the negated
  half of this ("not all cases") and nothing settles the rest. Relaxing the
  `aftPosTags.every(...)` test in `nounIsDeterminer` is the obvious move and a
  broad one: measure it on its own.
- **The negator still goes to a lexical verb rather than to what follows it**
  when a noun phrase is next: "he brought not water but wine" reaches `water`
  through the coordination, but nothing says it should. Only auxiliaries and
  modals are treated as verb constructions, which is what
  `docs/parts-of-speech.md` says; the fallback for the rest is untested.
