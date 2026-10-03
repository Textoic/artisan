# Architecture and findings — Artisan

This file is the only place in this repository where prose about the code is
allowed to live. The linter rejects comments in source files, so everything a
comment would have said belongs here.

**How to use it.** Add an entry when you learn something the code cannot state
for itself: why a design went one way when another looks more obvious, what you
tried that did not work and the measurement that says so, an invariant that
spans files, or a constraint imposed from outside. Newest entries at the top of
the log. Date each one. Keep each entry to a single finding.

**What does not go here.** Anything a name can carry. If you are about to write
"this function converts X to Y", the function is misnamed. Fix the name instead.
Nor does routine history: git already records what changed and when.

## Log

### 2026-10-03 — two finite verbs side by side, and a dictionary that turned "matter" into "more matte"

enlint needed "beats" and "matters" tagged as verbs in sentences like "the
year you start matters so much" and 'the year "the $200" begins beats its
size'. Both came out NOUN under the rules alone and under the model. The
grammar is in `docs/grammar.md` ("The main verb after an unmarked relative
clause", "One finite verb to a sentence", "Invariant verbs agree with any
subject"). This entry holds the measurements and what was rejected.

Measured on a list of 65 sentences built around the two words, each run with
the model and with the rules alone (130 results), and on the gold set:

| change | list wrong | gold, model | gold, rules | audit right |
| --- | --- | --- | --- | --- |
| before | 49 | 5780/6132 | 5753/6132 | 1708 |
| main verb after an unmarked relative | 37 | 5780 | 5753 | 1708 |
| quoted subjects, past relative verbs | 33 | 5780 | 5753 | 1708 |
| invariant verbs agree with any subject | 29 | 5780 | 5753 | 1708 |
| free relative ("what matters is") | 27 | 5780 | 5753 | 1708 |
| dictionary: false comparatives, "save" | 15 | 5780 | 5753 | 1707 |
| `mark-is-modal-complement` | 14 | 5780 | 5753 | 1707 |
| one finite verb to a sentence | 11 | 5781 | 5753 | 1708 |

The table stops before the review. The fixes that followed it left every
figure where the last row has it.

`npm test` went from 507 to 644, all passing. The gold set is reviews and
tweets and holds almost none of these constructions, so it can show that
nothing broke and little else. The 65-sentence list is the evidence that
something improved, and it was written by the person making the change.

Rejected, with the cost:

- The free-relative exception first fired for any relative word in front.
  It turned "which *bud* is R and L" and "wat *#twitter* does" into verbs,
  three gold tokens. Requiring third-person agreement on both words removed
  all three losses.
- "One finite verb" first accepted any earlier noun or gerund as the subject.
  It cost five gold tokens in fragments ("tablet, but *books*?", "In front of
  the @user *store*.") and won one. Requiring the sentence to open with a
  single noun phrase kept the win and dropped every loss.
- A lemma chosen by tag weight ("the form is its own lemma when another tag
  outweighs the adjective") gave "longer" the lemma "longer" and "least" the
  lemma "least". The weights in `pos.json` come from this tagger and say
  "longer" is a noun seven times in ten. They are no evidence about lemmas.

The dictionary change: `inflections.json` lists a comparative for every
adjective, so "matte" claimed "matter", "numb" claimed "number", "custom"
claimed "customer", "off" claimed "offer" and "own" claimed "owner". Each of
those words then carried an ADJ reading and the adjective's lemma, because
`keepsTheCurrentLemma` lets the first lemma stand. `isAWordOfItsOwn` in
`scripts/build-dictionary.ts` now refuses the comparative reading when the
form heads a noun or verb paradigm of its own and either the adjective lists
no superlative or the form is more frequent than the adjective. A real
comparative comes with a superlative and is rarer than its positive. 107
entries changed. "longer", "lower", "closer" and "better" keep their
adjective lemma. "upper" keeps an ADJ reading under its own lemma, because
the word list knows it as an adjective without help from "up". Irregular
grades ("more", "best", "less") are exempt by spelling.

The independent reviewer ran 190 sentences through the change and found four
defects the gold set cannot see. Each is fixed and has a test:

- The relative rule read any "noun, subject, verb, word" run as a relative
  clause. "Last year the company made changes" and "Every day you face
  challenges" made a verb of the object. A fronted time phrase and a noun
  under a plain preposition no longer count as antecedents.
- The later-verb test counted only words that can be nothing but a verb, so
  "The day you place orders matters" made "orders" the verb. It now counts any
  word that is a verb more often than not.
- "One finite verb" turned headings into clauses ("Performance issues", "Test
  results"). The word must now be a verb more often than a noun.
- The parser read "it will" in "If you find a book it will help" as a relative
  clause on "book", because a bare infinitive is `VerbForm=Fin`. A modal is no
  longer taken for a relative verb. This moved heads in gold sentences that no
  tag metric shows; there is still no script that scores heads.

"save" was built as `{VERB: 0.01, MARK: 0.99}`, because `pos.json` was gathered
while the word could only be a marker. A handpicked entry marked
`keepsItsWeights` now keeps them: `addPos` skips it. "save" is
`{VERB: 0.95, MARK: 0.05}`, which loses the preposition in "Save for a few
errors, the report is fine". "matter" is `{NOUN: 0.6, VERB: 0.4}`. The marker
lists in `scripts/handpicked-words.ts` rebuild each entry and drop any field
they do not name, so both entries live in `commonWords`.

A second review, against the committed parser on about 3,000 sentences, found
the relative rule still firing on objects ("If you press the button it makes
sounds"), the noun "matter" tagged VERB far more often under the model, and
"Best wishes" read as a clause. The antecedent must now open its clause, the
subject head must be mostly a noun or sit under a determiner, "matter" is
hand-weighted, and a do-support rule keeps "doesn't matter" and "Why does
this matter?" verbs. Gold and audit figures are unchanged: 5781, 5753, 1708.

Still wrong after this work, and why each was left:

- "Both matter.", model only: NOUN since "matter" became noun-first.
- "volatile matter content", "for that matter", "Grey matter": VERB, as
  before this work.
- "Budget cuts", "Quick wins", "Price changes": VERB under the model, as
  before this work or by its choice.
- "A tax cut helps everyone", rules alone: "cut" VERB. See the invariant-verb
  note in `docs/grammar.md`.
- "I know which costs matter": "matter" NOUN. "costs" comes out VERB through
  `invalid-n-after-pro`, an older fault. Before the dictionary change the
  rules reached VERB for "matter" by accident.
- "The day you place orders matters", model only: "matters" NOUN. Both
  readings are legal and the model picks.

- "Being consistent matters more" and "Starting early beats saving more":
  right under the rules alone, NOUN under the model. See the gerund note in
  `docs/grammar.md`.
- "120 beats per minute", "The drum beats grew louder": VERB. A numeral or a
  noun in front and a marker or a past verb behind.
- "subject matter from three fields": VERB, vetoed as a noun by
  `n-is-infinitive`.
- "Only the total matters": "matters" is right and "total" is ADJ.
- The quoted subject gets the right tags and the wrong heads.

`data/dictionary.json` in git did not match its own build before this change:
fourteen "-ise/-ize" verbs in `scripts/handpicked-words.ts` had no verb
features, and four pairs were missing from the built file. They now carry
`VerbForm=Fin`, `Tense=Pres`, `Person=1`, so a rebuild no longer strips
"optimize" of its tense.

`weights.json` was trained before the dictionary change and was not retrained.

### 2026-09-27 — `prepare` builds `dist` for git installs

`dist` stays out of git. npm builds a git dependency only by running its
`prepare` script. Without one, enlint's `git+https` install got `data/` and no
`dist/`, and every import failed to resolve. `prepare` now runs
`npm run build`. It also runs before `npm pack` and `npm publish`, so the
tarball always carries a fresh build.

### 2026-09-27 — Published as `@textoic/artisan`

The name `artisan` on npm belongs to an unrelated package, so this one
publishes under the `textoic` scope. npm makes a scoped package private by
default. `publishConfig.access` makes it public.

## Design notes, by module

### `scripts/annotate-corpus.ts`

_from scripts/annotate-corpus.ts:1_

Builds an annotated dataset by having a model settle the tags the grammar
rules cannot.

This is the production form of what `compare-taggers` measures. The rules tag
each sentence on their own; wherever they leave a genuine choice the model is
asked, from the same candidates and against the same specification; and the
result is written out in the shape of data/tagger-data/annotated-dataset.json
so that every tool already pointed at that file works on this one too.

A run over a real corpus takes many hours, so it is built to be stopped.
Every sentence is appended as it finishes and the position in the corpus is
checkpointed beside the output; running the same command again picks up at
the next unannotated sentence. Nothing is held in memory that would be lost,
and Ctrl-C is a supported way to end a session rather than an accident.

What comes out is a silver standard, not a gold one: it is one model's
reading, and on the hand-annotated set that reading agrees with a human about
nine times in ten. It is meant for training and for measuring coverage, and
every sentence carries the model that produced it so a later pass can tell
them apart.

_from scripts/annotate-corpus.ts:80_

A sentence in the shape data/tagger-data/annotated-dataset.json uses, plus
the provenance that file does not need: which model answered, and which
positions it answered for. `decided` is what separates a tag the grammar
settled from one a model chose, which is the difference between evidence and
opinion when this file is later used to train or to score.

_from scripts/annotate-corpus.ts:143_

The rules alone, plus the positions they could not settle. The candidates
come from the audit sink rather than the token's dictionary entry: `misc.pos`
is every tag the word has ever had, while the "chose" event carries only
those still standing after the rules had their say.

_from scripts/annotate-corpus.ts:223_

A tag outside the candidates is one the grammar had already ruled
out, so it is dropped and the rules' own answer stands. Recording it
would put something in the dataset that no rule can reproduce.

### `scripts/audit-rules.ts`

_from scripts/audit-rules.ts:1_

Reads every rule at once, by watching all of them decide.

The tagger is 74 rules in six ordered lists, one list per tag it might
assign. Each list is asked "can this word be this tag, here?" and answers
with the first rule that matches. Nothing coordinates the six lists, so the
ways they can disagree are not visible in any one of them:

  - all six can say no, leaving the word with no legal tag at all, at which
    point the tagger forces whichever tag sorts last and moves on
  - one list can veto the right answer on grounds another list contradicts
  - a rule can be unreachable because an earlier rule always speaks first

Checking 74 predicates against each other by reading them is not the way in:
they take an eight-token window and a dozen features, most pairs never meet,
and the ones that do are not the ones that look dangerous. So this runs them
over the annotated corpus and reports what they actually did to each other,
ranked by how much damage it does.

Usage: npm run audit-rules [-- --limit=N] [--json=path]

_from scripts/audit-rules.ts:139_

A position is judged once per path the tagger explores. Most paths that
leave a word with no legal tag are paths it then abandons, which is the
system working: the dead end is evidence that an earlier choice in that
path was wrong. Only when every path dies does it give up and force a
tag, and it says so by judging the position again in flexible mode. So
the retry, not the dead end, is what marks a real contradiction.

_from scripts/audit-rules.ts:156_

What a veto costs against what it buys. Some readings cannot be told
apart by any rule broad enough to be worth having, so a rule that
rules out the right tag now and then can still be earning its place;
what matters is the balance. A veto that lands on a tag the word was
not supposed to take is the rule doing its job, and one that lands on
the gold tag is the rule getting in the way.

_from scripts/audit-rules.ts:225_

The tagger resolves a run of consecutive ambiguous words together, and
every rule reads the tags chosen earlier in that run. So the second wrong
tag in a run usually is not a second mistake: it is the first one being
read back. Blaming the rule that vetoed the right tag downstream would
send us off writing a carve-out for a rule that was reasoning correctly
from a bad premise, so those are counted apart and left out of the
worklist.

_from scripts/audit-rules.ts:267_

Whether the right tag was still standing when the tie-break ran. A
choice is only recorded when more than one tag survived the rules, so a
choice that lists the gold tag is a position the rules allowed and the
tie-break got wrong. Everything else the rules ruled out.

_from scripts/audit-rules.ts:431_

A veto is right when it lands on a tag the word was not meant to take, and
wrong when it lands on the gold tag. Blank for a rule that allows rather
than vetoes.

### `scripts/build-corpus-stats.ts`

_from scripts/build-corpus-stats.ts:1_

First pass over a corpus of unlabeled text.

Runs the whole pipeline with NO model and records only what the language
rules were able to settle on their own:

  parser-word-tags.txt  how often each word took each tag  -> data/pos.json
  prep-pairs.txt        which preposition followed which   -> data/pairs.json

Both files feed build-dictionary. Nothing that the tagger had to guess is
recorded, so the counts never reinforce a guess the pipeline already made.

Usage: npm run build-corpus-stats -- path/to/corpus.txt

_from scripts/build-corpus-stats.ts:50_

A sentence is only trustworthy up to the point where the tagger had to guess:
from there on the parser state, and therefore every rule that reads it, is
downstream of that guess. Everything before it was settled by rules alone.

### `scripts/build-dictionary.ts`

_from scripts/build-dictionary.ts:129_

The positional scheme below only holds for a complete list. 267 entries are
short and are not aligned to either end: "bewhiskered", "birdnesting" and
"apotheoses" are each the whole VERB list of their lemma and each a different
slot. Those used to fall through to `{}`, which added the word to the
dictionary with no pos at all — worse than leaving it out, since the tagger
then sees a known word with no legal tag. Read the slot off the suffix
instead, reusing the same three shapes the positional cases produce.

_from scripts/build-dictionary.ts:219_

The ADJ list is <comparative> <superlative>, so the slot is the degree.

Comparing and superlating also do not turn an adverb into an adjective:
if the lemma is both, so are the two forms derived from it. Wordnet
lists the comparatives only under ADJ and leaves the ADV list empty,
and `addInflections` reads that as evidence the word is really an
adjective and drops ADV -- which is right for the lemma, whose adverb
reading comes back from the corpus, but silently left "easier",
"harder", "later" and "faster" unable to be adverbs at all. "It pushed
harder" and "easier said than done" had no legal tag for them.

_from scripts/build-dictionary.ts:272_

Every surface form `addHandpickedWords` writes. The handpicked `pos` set is
the last word on these, so nothing derived from the inflections may touch
them — but only them. Skipping a whole inflection entry because its *lemma*
is handpicked also threw away the entry's other forms, which are different
words: "pound" is a handpicked mass unit, so "pounded"/"pounding" were never
derived, and "cause" is a spelling variant of "because", so "caused" was
never derived either.

_from scripts/build-dictionary.ts:395_

Wordnet is the widest source of vocabulary and of the parts of speech each
word can take, which is what the tagger needs. The synonym lists themselves
are not stored: nothing in the pipeline reads them.

### `scripts/build-model.ts`

_from scripts/build-model.ts:1_

Rebuilds the dictionary from a corpus of unlabeled text, in order.

  npm run build-model -- path/to/corpus.txt

The corpus is a text file with one JSON object per line, each with a "text"
property. Nothing else is needed: no labels, and no existing model.

Every step runs the pipeline with the language rules alone, so none of them
depends on a model existing beforehand. The one loop in the process is that
pass 1 tokenizes with the current dictionary and then rewrites part of it:
that is safe because data/pos.json only redistributes weight between tags a
word already has. It can never add or remove a possible tag, so it cannot
change which parses are legal, only which one is preferred on a tie.

This used to end by training the tagger's model on the same unlabeled text,
taking as examples the words the rules had settled for themselves. That was a
compromise from before language models existed, and measured, it does not
work: the model is consulted at run time precisely for the words the rules
could NOT settle, so it was trained on one population and asked about
another, and it scored below the most-frequent-tag prior it replaced.
Training now happens separately, on words an annotator labelled:

  npm run annotate-corpus        -- --corpus=... --out=../data/corpus/silver.jsonl
  npm run train-from-annotations -- data/corpus/silver.jsonl --hold-out=400

### `scripts/build-preposition-pairs.ts`

_from scripts/build-preposition-pairs.ts:23_

The structure built looks like this:
{
  "bring": {
    "up": {
      VERB: 2,
      NOUN: 8
    },
    "down": {
      VERB: 16
    }
  }
}

### `scripts/compare-taggers.ts`

_from scripts/compare-taggers.ts:1_

Which model is best at settling the tags the grammar rules cannot.

The tagger already splits into two halves: rules that rule tags out, and
something that picks among whatever survives. Today that picker is an
averaged perceptron. This script puts a language model in the same seat and
measures it on exactly the same positions, so the numbers are comparable
rather than merely adjacent.

Two sources, for two different questions:

  --source=annotated    the 449 hand-tagged sentences. Every answer has a
                        gold tag, so this reports real accuracy and is the
                        number to choose a model on.
  --source=paraphrases  sentences from the LLM corpus, which have no gold
                        tags. This reports how far the models agree with
                        each other and with the current pipeline, and prints
                        the disagreements -- it says where the hard cases
                        are, not who is right.

Run the first to pick a model, the second to see what that model will do to
text it has not been measured on.

_from scripts/compare-taggers.ts:97_

One sentence tagged by the grammar rules alone, plus the positions they could
not settle and what each was left choosing between.

The candidate set comes from the audit sink rather than from the token's
dictionary entry, and the difference matters: `misc.pos` is every tag the
word has ever had, while the "chose" event carries only the tags still
standing after the rules had their say. Asking a model to pick from the
former would be asking it a different, easier question than the perceptron
answers.

_from scripts/compare-taggers.ts:148_

Replies are kept on disk, keyed by everything that could change one: the
model, the seed, the instructions and the sentence. Comparing models is a
loop of "change the prompt, re-run everything", and without this every one of
those iterations pays for the models that did not change.

_from scripts/compare-taggers.ts:190_

The sentences a model actually gets asked about: the ones the rules left a
choice in. A sentence whose gold tags do not line up with its tokens is
dropped here too, because nothing scored from it would mean anything.

_from scripts/compare-taggers.ts:303_

What would be sent, without sending it. The prompt is the whole experiment --
a model can only be as good as the question -- so it is worth being able to
read one, and to see how many positions the rules are actually handing over,
before spending an hour of GPU time on it.

_from scripts/compare-taggers.ts:361_

The two references every model is measured against, computed once. The
baseline is what the rules plus each word's most frequent tag already answer,
which is the score to beat before a model is worth anything at all.

_from scripts/compare-taggers.ts:451_

Where the models disagree with each other. On the annotated source this is
mostly a curiosity; on the paraphrase source it is the whole output, because
a position every model agrees on needs no review and one they split over is
exactly what a human should look at.

_from scripts/compare-taggers.ts:457_

Keyed on the sentence and the offset within it, joined by a tab because the
sentence is itself full of spaces. Two runs of one model land in the same
entry under the same name, so a --repeat run shows up here as a model
disagreeing with itself -- which is exactly what it is.

### `scripts/corpus.ts`

_from scripts/corpus.ts:1_

Streaming a corpus of unlabeled text. build-corpus-stats reads it to count how
words behave; annotate-corpus reads the same format to decide which words a
language model should be asked about. The pass runs the pipeline with no
model, so it never depends on a model existing beforehand.

_from scripts/corpus.ts:33_

Reads a corpus of JSON lines, each with a "text" property, and hands every
text to `onText`. Resolves once the corpus is exhausted or `limit` is hit.

### `scripts/evaluate-features.ts`

_from scripts/evaluate-features.ts:1_

Measures how much the model's features are worth, without needing a corpus.

The tagger only ever has to choose when a word has more than one possible
tag, so those are the only words scored here. Two numbers are reported:

  baseline  each word's most frequent tag, which is what the pipeline falls
            back to with no model at all
  model     an averaged perceptron over the current features, evaluated by
            k-fold cross-validation so it is never scored on a sentence it
            was trained on

The gap between them is what training buys. If it is small or negative, the
features are not earning their keep and the deterministic fallback is better.

Usage: npm run evaluate-features

_from scripts/evaluate-features.ts:35_

Builds one training example per ambiguous word. The surrounding tags are the
annotated ones, so every example sees the context the tagger would see if it
had got everything before it right.

### `scripts/fetch-paraphrases.ts`

_from scripts/fetch-paraphrases.ts:1_

Pulls sentences from redis/llm-paraphrases on Hugging Face.

The corpus this project was built on is scraped prose: fragments, markup
spill, transcription noise. The tagger is going to spend its life reading
model output instead, and that is a different language -- fully formed
sentences, conventional punctuation, a narrower vocabulary. This dataset is
7.07M sentence pairs written by models, which is as close to the real input
distribution as an off-the-shelf corpus gets.

Sampling is spread over random pages rather than taken from the front,
because the rows are grouped by source and the first few thousand are all one
flavour of text. A seed makes any sample reproducible: the same seed and
count give the same sentences, so a comparison run last week can be re-run
against exactly the same input today.

A large pull takes hours, so it is resumable. Sentences are appended to the
output as they arrive and the pages already visited are checkpointed beside
it; stopping with Ctrl-C and running the same command again carries on from
where it left off rather than starting over. Deleting the progress file is
what starts a fresh sample.

Output is one JSON object per line with a `text` property, which is the
format scripts/corpus.ts already streams, so build-corpus-stats and
annotate-corpus can read the result with no changes.

_from scripts/fetch-paraphrases.ts:41_

A Lehmer generator, the minimal standard parameters. Nothing here needs a
good random number -- it only needs the same page numbers to come back for
the same seed, so that a comparison run can be repeated exactly. The modulus
and multiplier are chosen so every product stays inside the range integers
are exact in, which keeps this arithmetic rather than bit twiddling.

_from scripts/fetch-paraphrases.ts:66_

Rate limiting is the normal path through here, not an error path. The
datasets server answers a burst of anonymous requests for a while and then
starts returning 429, so a 429 is retried far more patiently than a genuine
failure: a short exponential backoff gives up inside a minute and loses the
run, which is what happened the first time this was pointed at a corpus worth
having. Retry-After is honoured when the server sends it.

_from scripts/fetch-paraphrases.ts:115_

Sentences worth keeping. The dataset is clean but not uniformly useful: a
three-word fragment gives the rules nothing to disagree about, and anything
enormous is usually a run-on that the sentencizer would split anyway. The
bounds are deliberately loose -- this is for throwing out degenerate rows,
not for curating a style.

_from scripts/fetch-paraphrases.ts:140_

How many sentences to take from any one page. Consecutive rows are near
duplicates -- a sentence, its paraphrase, and the same sentence again
paired with a negative -- so an uncapped read of one page returns a
hundred rewordings of one question. Four per page buys a varied sample at
one request per four sentences, which is the right trade for the tens of
thousands a gold set needs. Raise it for a corpus in the millions, where
the request count starts to dominate and some redundancy is tolerable.

_from scripts/fetch-paraphrases.ts:150_

Milliseconds to pause between page requests. Going flat out gets about
fifty pages in before the server starts refusing, and then every request
is a retry; pacing them is faster overall as well as more polite. Raise
it if a long run keeps hitting 429.

_from scripts/fetch-paraphrases.ts:218_

Replaying the generator from the start on a resumed run is what keeps the
sample reproducible: the sequence of pages is a function of the seed alone,
so a run that stops and restarts visits exactly the pages an uninterrupted
one would. Only the pages not yet visited are actually fetched.

### `scripts/handpicked-words.ts`

_from scripts/handpicked-words.ts:2754_

const locationVerbs = [
  "go",
  "drive",
  "tour",
  "trek",
  "trip",
  "ride",
  "sail",
  "roam",
  "wander",
  "explore",
  "sightsee",
  "traverse",
  "fare",
  "fly",
  "flee",
  "escape",
  "depart",
  "cruise",
  "journey",
  "move",
  "leave",
  "travel",
  "visit",
  "live",
  "reside",
  "settle",
].map((form) => ({
  form,
  fields: {
    pos: {"VERB": 1},
    VerbForm: "Fin",
    Tense: "Pres",
  },
}));

_from scripts/handpicked-words.ts:4119_

Two kinds of word live here, and only one of them is a pronoun.

A relative PRONOUN stands in for a noun -- "the man who came", "each of
which" -- and so it is a NOUN, like every other pronoun in this tagset. It
keeps PronType="Rel", and it does not get a MARK reading at all: "who",
"whom", "whose", "which" and "what" have no conjunction use in English, so
offering the tagger a marker reading of them only ever gave it a way to be
wrong. "that" is the exception and keeps MARK, because "I said that he left"
is a genuine complementizer.

A relative ADVERB -- "where", "when", "why" and the "where-" compounds --
stands in for an adverbial, not a noun, and keeps its marker reading.

Note that PronType="Rel" is carried by both groups, so it means "relative",
not "relative pronoun", and a predicate testing it matches "when" exactly as
readily as "who". Stripping it from the adverbs to make the feature honest
was tried and reverted: several rules lean on it to recognise a clause
boundary ahead, and without it "why" stops being able to head its own
question. What separates the two groups here is the `pos` set instead -- the
pronouns simply have no MARK reading to choose.

### `scripts/model.ts`

_from scripts/model.ts:1_

Loading the language model from disk is the one thing every script and every
test needs and the library itself must not do: `src` is compiled without any
environment globals so it keeps running unmodified in a browser.

_from scripts/model.ts:36_

Weights are stored with the version of the feature set they were trained
under. A model trained against different features would still match a handful
of feature names, score nonsense on the rest and be worse than no model at
all, so a mismatch is treated as no model: the tagger then falls back to the
rules plus each word's most frequent tag, which is deterministic.

_from scripts/model.ts:74_

Any annotated set, by path, in either shape the project produces: a JSON
array (the hand-annotated set) or one JSON object per line (what
annotate-corpus writes). Both carry `text`, `words` and `tags`, so anything
that scores one can score the other.

This exists because the hand-annotated set is product reviews and tweets,
while the corpus the tagger will actually be used on is model-written prose.
A model trained on one and scored on the other is measuring domain transfer,
not tagging, and the two numbers have to be kept apart to see that.

### `scripts/ollama.ts`

_from scripts/ollama.ts:1_

Talking to a model over Ollama's HTTP API.

Ollama serves local and hosted models through the same endpoint: a name like
`qwen3.8:27b` runs on this machine, one like `glm-5.2:cloud` runs on Ollama's
servers and needs `ollama signin` first. Nothing below cares which, so the
comparison harness can put a 27B running on the GPU next to a 756B running
remotely and score them the same way.

Every request here is meant to be reproducible: temperature 0, a fixed seed,
and a JSON schema the reply has to satisfy. A tagging decision that changes
between runs cannot be used as training data, so determinism is a
requirement rather than a nicety, and `--repeat` in the harness checks that
the model actually delivers it.

_from scripts/ollama.ts:35_

A JSON schema. Ollama constrains decoding to it, which turns "the model
replied with prose around the JSON" from a common failure into an
impossible one. Models reached over :cloud honour it too.

_from scripts/ollama.ts:40_

Thinking models spend a long time reasoning before answering, and for a
task this small it rarely changes the answer. Left on for models that
refuse to answer without it.

_from scripts/ollama.ts:105_

Which models this Ollama can serve. Cloud models only appear here once they
have been pulled, so a name missing from the list is not proof it is
unavailable -- it is a prompt to run `ollama pull`.

### `scripts/review-annotations.ts`

_from scripts/review-annotations.ts:1_

Auditing the hand-annotated evaluation set against the specification it was
written to.

Every number this project reports is measured against
data/tagger-data/annotated-dataset.json, which makes it the one file where an
error does not show up as an error -- it shows up as the tagger being wrong.
Two things established that it contains some: a model given
docs/parts-of-speech.md tagged "80 books" as NOUN, per the specification's
explicit rule that numbers are always nouns, and was scored wrong against a
gold ADJ; and one token carries the tag "ANY", which is not in the tagset at
all and so can never be matched by anything.

This script finds the disputable positions and writes a proposal. It never
edits the dataset on its own: --apply is a separate run over a file a human
has looked at, and every applied change is recorded with the reason that
justified it.

Three sources of dispute, in descending order of certainty:

  spec       the specification decides it outright, with no judgement
             involved -- a numeral tagged anything but NOUN, or a tag outside
             the eight. Proposed without asking a model.
  ambiguous  the rules left the position open and a model, reading the same
             specification, chose differently from the annotation.
  settled    the rules pinned the position down on their own and still
             disagree with the annotation. Either the rule is wrong or the
             annotation is; a model is asked which.

_from scripts/review-annotations.ts:92_

Set by whoever reviews the file. `false` keeps the proposal on record with
the reason it was turned down, which is the part worth keeping: a rejected
proposal is evidence about where the adjudicator is unreliable, and
deleting it would throw that away. Anything unset is applied.

_from scripts/review-annotations.ts:129_

Relative pronouns are pronouns, so they are NOUN.

"that" is deliberately absent: it is the one word here with a real
complementizer use ("I said that he left"), so a MARK reading of it is not a
mistake. The relative adverbs -- "where", "when", "why" -- are absent too,
because they stand in for an adverbial rather than a noun and stay markers.
See the `relatives` block in handpicked-words.ts, where the same split is
made in the data.

_from scripts/review-annotations.ts:143_

What the rules alone make of a sentence, and which positions they left open.
Same seam the model comparison uses: a position the rules settled is a
different kind of disagreement from one they handed over.

_from scripts/review-annotations.ts:172_

`tags` is typed PosTag[] and is not one: the file has a token tagged
"ANY". Widening the tagset rather than narrowing the tag is what lets
this comparison mean anything -- the other direction would make the
check tautologically true and the bug invisible.

_from scripts/review-annotations.ts:184_

A hashtag is a name here: the tokenizer looks past a leading "#" or
"@" when testing for a proper noun, and "@apple" is NOUN elsewhere
in this same dataset.

_from scripts/review-annotations.ts:251_

The competing readings, and nothing else: whatever the rules were
choosing between, plus the annotation itself even when the rules had
ruled it out -- that case is exactly the one worth asking about.

_from scripts/review-annotations.ts:324_

The durable record, as against the proposals file.

Proposals are a working file: each run rewrites it, which is fine for a file
you are still arguing with and useless as history -- a later run for a
different reason silently erases what the last review decided. Every change
that actually lands is appended here instead, and nothing rewrites it. This
is the file to read to find out why a tag in the evaluation set is what it
is.

_from scripts/review-annotations.ts:377_

Guard against a proposal file written against a different version of the
dataset: applying an offset to the wrong token would be silent and
unrecoverable.

### `scripts/start.ts`

_from scripts/start.ts:52_

Why each word got the tag it got: for every word with more than one
possible tag, which rule allowed or vetoed each reading, and what settled
it. This is the single-sentence counterpart to `npm run audit-rules`, which
asks the same question of a whole corpus at once.

### `scripts/tagging-prompt.ts`

_from scripts/tagging-prompt.ts:1_

The instructions a model gets when it is asked to settle an ambiguous tag.

This tagset is not Universal Dependencies, and every model has read far more
UD than it will ever read of this. Left to its own devices it will answer DET
for "the", ADP for "of", NUM for "two" and PRON for "she" -- so the system
prompt spends most of its length on precisely the places where the two
disagree, and the examples are lifted from docs/parts-of-speech.md so that a
model and a human annotator are reading the same spec.

The model never chooses freely. The rules have already ruled out every tag
they can, and the question put to the model is only ever which of the
survivors is right -- the same question, on the same positions, that the
perceptron answers in src/tag. That is what makes the two comparable, and it
means a model cannot answer with a tag the grammar rejects.

_from scripts/tagging-prompt.ts:70_

The sentence as the model sees it: every token numbered, the settled ones
carrying the tag the rules gave them, and the undecided ones marked. Showing
the settled tags is what lets the model reason about context -- whether a
verb is already present, what the neighbours are -- rather than guessing at
the whole sentence at once.

_from scripts/tagging-prompt.ts:113_

Constrained decoding. The index and tag are required on every entry, so a
reply that omits a position fails loudly here rather than being silently
scored as a miss. `tag` is left a plain string rather than an enum because
the legal set differs per position; the harness checks each answer against
that position's own candidates.

_from scripts/tagging-prompt.ts:142_

A second, slower question, asked when a tag is disputed rather than merely
undecided.

The tagging prompt above asks "which of these is right?" and gets one pass of
judgement. This one puts a single token under a microscope: the whole
sentence, the competing readings, and a demand for the specific guideline
that settles it. It is used when an existing annotation and a fresh reading
disagree, and the answer decides which of the two was wrong.

Crucially it never says where either candidate came from. Told that a human
chose one and a machine the other, a model defers to the human almost every
time, which would make it useless for the one thing it is here to do.

### `scripts/test-tagger.ts`

_from scripts/test-tagger.ts:20_

Which annotated set to score against. The default is the hand-annotated one;
--dataset points at any other, which is how a model trained on model-written
prose gets measured on model-written prose instead of on product reviews.

_from scripts/test-tagger.ts:122_

What the word's most frequent tag alone would have answered, ignoring
everything the rules worked out from context. It is the floor that the
rules, and then the model, have to beat.

_from scripts/test-tagger.ts:150_

Only words the tagger actually had to choose for are scored. Counting
punctuation and single-tag words inflates the figure until it stops
responding to real changes; see docs/paper.md.

### `scripts/train-from-annotations.ts`

_from scripts/train-from-annotations.ts:1_

Trains the tagger's model on an annotated set.

This is the only way the model is trained now. It used to be trained on
unlabeled text, taking as examples the words whose tag the **rules** had
settled -- a compromise from before language models existed, when there was
no way to get a label for a word the rules could not settle. It does not
work, and the reason is structural rather than a matter of scale: at run time
the model is consulted precisely for the words the rules left open, so a word
the rules can settle is by construction not a word the model will ever be
asked about. Trained on one population and asked about another, it scored
below the most-frequent-tag prior it was meant to replace, and both more data
and more epochs made it worse. See CLAUDE.md for the measurements.

So the examples here are the positions the rules left open, labelled by
whoever annotated the set -- a human, or a language model reading
docs/parts-of-speech.md (see annotate-corpus). The model's whole job is to
learn how that annotator resolves an ambiguous word from its context, and
then to do it without them.

Usage:
  npm run train-from-annotations -- data/corpus/silver.jsonl --hold-out=400

_from scripts/train-from-annotations.ts:60_

The positions the rules left open, with the candidates they left standing.
Same seam compare-taggers and annotate-corpus use: the "chose" event carries
what survived the rules, which is a smaller set than every tag the word has
ever had, and asking the model to pick from the larger set would be asking it
an easier question than it faces at run time.

_from scripts/train-from-annotations.ts:88_

Featurizing is the slow part and does not depend on the weights, so every
example is built once and reused for every epoch.

`floor` is the candidate the rules would fall back on with no model at all:
the tag list arrives sorted by how often the word takes each tag, so the
first entry is the most-frequent-tag answer. Carrying it here is what lets
the report say whether the model beat doing nothing, on the same words.

_from scripts/train-from-annotations.ts:113_

A label the rules had already ruled out cannot be reached by any
weighting, so training on it teaches the model to want something it
will never be allowed to say.

_from scripts/train-from-annotations.ts:172_

The model is scored on the held-out set after every epoch and the best one is
kept, rather than whatever the last epoch happened to leave behind. Training
accuracy on this task climbs past 98% while held-out accuracy has already
turned over, so running a fixed number of epochs and taking the end state
reliably ships an overfitted model.

### `src/featurize/index.ts`

_from src/featurize/index.ts:124_

Suffixes are what is left to go on when the word itself is unknown: "-ness"
and "-tion" are nouns, "-ise" and "-ify" are verbs, "-ly" is an adverb. Only
alphabetic words get them, and only up to the length of the word.

_from src/featurize/index.ts:140_

Bumped whenever the features below change in a way that makes previously
trained weights meaningless. Weights are stored with the version they were
trained under and are ignored if it does not match, so a stale model degrades
to the deterministic baseline instead of half-matching feature names and
scoring nonsense.

_from src/featurize/index.ts:184_

Handpicked words carry a weight of 1 for every tag they can take, because
their real frequencies are unknown. Those add up to more than 1 and say
nothing about which tag is likelier, so they are left out.

_from src/featurize/index.ts:206_

The two preceding tags together separate cases one tag cannot, such as a
determiner followed by an adjective (where a noun must come next) from a
verb followed by an adjective (where one need not).

_from src/featurize/index.ts:246_

Which tags the following word can take, before anything has disambiguated
it. A word before something that can only be a marker behaves differently
from the same word before something that can only be a noun.

### `src/grammar/divergent.ts`

_from src/grammar/divergent.ts:3_

The questions the tagger and the parser answer differently.

Each pair below started as one idea and drifted into two implementations,
one per module. That drift is invisible while the two copies sit in
different files under the same name, and it is exactly what makes a tag
chosen under one reading get a head attached under another. Here the two
answers sit side by side with the difference written out, so the choice
between them is a decision someone makes rather than an accident.

Unifying a pair is a behaviour change: it moves tags, and it has to be
measured on its own rather than folded into a refactor. Until then each
caller keeps the answer it was written against. When one is settled it moves
to ./index.js, where the agreed answers live -- `verbsAreCompatible` went
that way, on the parser's reading, at no cost in accuracy and with the rules
settling four more words on their own.

Not every shared name is a divergence, and it is worth knowing which is
which before trying to unify anything:

  isFollowedByVerb        was two bodies under one name, but the two ask
                          different questions -- whether a clause has its
                          verb somewhere ahead, and whether what comes next
                          is itself a clause. Unifying them costs accuracy in
                          either direction because neither answer is the
                          other's. Both now live in ./index.js under names
                          that say what they ask.
  isUnmarkedRelativeRoot  a real divergence, but too entangled with its
                          callers to lift here: the tagger asks whether a
                          past or participial verb sits between a noun and a
                          marker, the parser asks a far larger question of
                          the stack, the heads and the rest of the sentence.
                          Same name, same intent, unrelated evidence.
  hasAppositivePunctuation
                          agreed and shared (see ./index.js), but the tagger
                          reaches for it in two rules where the parser
                          consults it throughout, so the two disagree about
                          when an appositive matters, not about what one is.

_from src/grammar/divergent.ts:43_

Punctuation that closes a phrase. The tagger tests this set in a dozen
places; the parser tests the six-type set in ./index.js (`isTerminatorType`).
The two differ only in the colon and the semicolon, which the tagger does not
treat as closing anything.

_from src/grammar/divergent.ts:54_

Subject-verb agreement. These two are meant to be complements and are not.

The tagger requires positive evidence of agreement, so a verb carrying no
Person -- which is most of them -- can only be subject-taking if it is a
past finite. The parser instead rules out only the two disagreements it can
name, so the same verb passes. Where the tagger says "no subject here" the
parser will happily attach one, and a past finite third person plural
("they were") is accepted by one and rejected by the other outright.

The parser also lets a first person subject through the second disagreement
("I say"), which the tagger does not.

### `src/grammar/index.ts`

_from src/grammar/index.ts:9_

The questions the tagger and the parser both ask of a token.

Is this a gerund? Does this marker take a clause or only a noun? Is this
punctuation a terminator? Both modules need the answers, and each used to
carry its own copy of them. A tag chosen under one answer and a head then
attached under a slightly different one is the shape almost every
inconsistency in this pipeline takes, so the answers live here, once.

The pairs that genuinely disagree today are in ./divergent.js instead, where
the disagreement is written down rather than spread across two files.

_from src/grammar/index.ts:22_

The order tags are considered in. It decides which reading of an ambiguous
word is tried first, so it is a real part of the rules and not a detail: verb
readings are ruled out before noun readings, nouns before markers, and so on.
"X" is deliberately absent -- a word tagged X has nothing left to decide.

_from src/grammar/index.ts:39_

Markers are classified by what they can take as an object, which is what
decides where their head can be. See docs/parts-of-speech.md:

  2  clauses only          ConjType=Sub and no AdpType ("although")
  1  nouns only            AdpType and no ConjType ("of")
  0  either, or neither    everything else ("since", "and")

_from src/grammar/index.ts:53_

How the degree is written when it is used as a feature name. Derived from
the classification above so the two can never drift apart; degree 0 is left
unlabelled because it is the unmarked case.

_from src/grammar/index.ts:61_

Punctuation that closes what came before it. Note that the comma counts:
what it closes is a phrase rather than a sentence, but the parser has to see
the same boundary either way.

_from src/grammar/index.ts:75_

Quotation marks and brackets can introduce subclauses, though they do not
always; commas often introduce appositives, splitting the sentence.

_from src/grammar/index.ts:105_

The verbs that take an object and then something predicated of that object:
"make a long story short", "she made John blush", "we consider the plan
risky", "they left the door open".

This is the only valence fact in the pipeline, and it is here because nothing
else can supply it. Every rule that walks left from a word stops at the first
noun, on the sound assumption that what sits behind a verb's object belongs to
the object -- "a long story short" reads as one noun phrase and "short" as its
last word. For these verbs that assumption is wrong by definition: the second
argument is *supposed* to sit behind the first, so the object cannot be where
the search ends. Without the list "make a long story short" had every tag but
NOUN vetoed for "short", and "blush" in "she made John blush" was a noun
because it does not agree with "John".

Two groups, kept in one list because both need the same thing of the parse:
the causative and perception verbs, which take a bare infinitive ("let him
go", "I saw her leave"), and the resultatives, which take an adjective or a
noun ("keep it warm", "call it a day"). A verb outside the list is left
alone, so widening this is a behaviour change to be measured on its own.

_from src/grammar/index.ts:153_

Whether a word could still turn out to be one of these tags.

A rule that looks at the word after the one it is judging is usually asking
before that word has been tagged, and a word with nothing decided yet is not
the same as a word decided against. Reading the first as the second is how a
rule comes to veto on evidence it does not have: "Then fails" was read as
"then" followed by something that is not a verb, because "fails" had not been
settled yet, and "then" lost its adverb reading over it.

So: once a word is tagged that tag is the answer, and until then every tag it
could still take counts.

_from src/grammar/index.ts:176_

Negation, which both modules have to read the same way.

The negator has four spellings once the tokenizer is done with it -- "not"
and the fused fragments "n't", "'t" and "nt" -- and all four carry lemma
"not", so the lemma is the whole test.

_from src/grammar/index.ts:185_

The verbs a negator can sit inside: the modals, which are exactly the verbs
that carry a Mood, and the three auxiliaries. A lexical verb is not one of
them, which is the distinction the two readings of a negator turn on.

_from src/grammar/index.ts:216_

Whether the negator at `index` belongs to a complex verb construction:
"can't corrupt", "will not stay", "did not say", "hasn't worked".

An auxiliary or a modal in front of it is the whole evidence, and it has to
be directly in front. Searching the clause instead would swallow two readings
that are not this one: the inverted question "am I not a hooman", where the
negation is over the predicate the copula introduces rather than over a later
verb, and the correlative "is ... not only achieving", where "not only" is a
pair and the negator belongs to "only".

_from src/grammar/index.ts:235_

The verb a negator in a verb construction belongs to, or -1 when there is
none.

"not" after an auxiliary or a modal negates the verb the construction is
about, and that verb can be any distance behind an adverb: "can't
accidentally corrupt", "will not always stay". The adverbs in between modify
the verb too, so stepping over them costs nothing, and a negator that lands
on one instead means the same sentence comes out two shapes depending on
whether an adverb happened to be written.

When nothing verbal follows -- "I'm not sure", "am I not a hooman" -- there is
no verb to negate and the answer is -1: the negator then belongs to whatever
the copula introduces, which is what the rest of the parser already decides.

_from src/grammar/index.ts:268_

Whether `childVerb` can hang off `headVerb`: "has played", "will play",
"did play".

The tagger used to answer this its own way, and the two differed in three
places, the worst of which was that when the head was neither finite nor past
they looked at different tokens entirely -- the tagger asked whether the head
was a present participle, the parser whether the child was a participle or a
past form, and neither implies the other. So a verb chain the tagger built
one way got its heads attached another. They now share the parser's reading,
which is the better informed of the two: it can see the heads, and so can
tell a past participle hanging off a noun ("the report filed yesterday"),
which is a relative clause root and takes no verb of its own.

_from src/grammar/index.ts:315_

Whether a verb turns up later in the clause. Adverbs, nouns and anything else
are stepped over; only a conjunction ends the search, because what is on the
far side of one belongs to a different clause.

This and `isFollowedByClause` below were one name with two bodies, which read
as a divergence and is not one: they are different questions. This one asks
whether a clause already has its verb somewhere ahead. That one asks whether
what comes next is itself a clause. Unifying them costs accuracy either way,
because neither answer is the other's.

_from src/grammar/index.ts:351_

Whether what follows is a clause: a run of nominal words and then a verb, as
in "since the price went up". Anything that is not a noun, an adjective or an
adverb ends it, because a clause cannot start with one.

_from src/grammar/index.ts:389_

Capitalization is evidence of a proper noun, so a leading "#" or "@" is
looked past: "@Ana" is as capitalized as "Ana". The tagger's copy of this
also returned false for a leading digit, which changed nothing -- a digit is
not an uppercase letter either way -- so it is gone.

_from src/grammar/index.ts:414_

Whether the token is delimited on both sides, which is what tells an
appositive ("Ana, my sister, called") from a clause that merely happens to
end in punctuation. A single terminator counts only at the end of the
sentence, where there is no room for the closing one.

### `src/parse/index.ts`

_from src/parse/index.ts:62_

bidi brackets
https://www.unicode.org/Public/UCD/latest/ucd/BidiBrackets.txt
https://www.unicode.org/notes/tn39/#Chapter5

_from src/parse/index.ts:348_

Attach the word on top of the stack to a head named outright rather than by
stack offset. Every other transition can only reach what is still on the
stack, and a word that has already been reduced is out of their reach: "bite
off more" is finished and popped before "than" is read, yet "than" belongs to
"more". The head is a plain index, so the caller has to have checked that it
is not a descendant of the child.

_from src/parse/index.ts:390_

Whether a comma sits anywhere between two token positions, in either
order. A comma is what tells a clause boundary apart from plain adjacency:
a fronted or trailing participial clause ("Fingers crossed tightly, she
waited") is always comma-set-off from the clause it belongs to, whereas an
inverted subject ("will he be able...") or an unfinished clausal
complement ("Jill said she wasn't...") sits directly against its verb with
no comma at all.

_from src/parse/index.ts:616_

An adverb collects the adverb in front of it, which is what builds
"quite commendably" into one chain. A negator inside a complex verb
construction is the exception: it belongs to the verb the construction
is about, so it is left on the stack for `verbStep` to take, and the
adverbs between the two end up on the same verb rather than on each
other. Without this "can't corrupt" and "can't accidentally corrupt"
come out two different shapes.

_from src/parse/index.ts:636_

Outside a verb construction a negator modifies whatever is directly at its
right, and a marker is one of the four things an adverb modifies: "play
outside the house not (out) in the street". Leaving it on the stack lets
`markerStep` take it. The branches below would instead search left for a
verb and carry it all the way back to the clause's own verb, which is the
head the same word gets when it *is* in a verb construction -- two
different structures coming out one shape.

_from src/parse/index.ts:663_

A negator inside a verb construction belongs to what the construction
predicates. When no verb follows, that is the phrase the auxiliary
introduces: "is not (happy)", "was not (the problem)", "am I not (a
hooman)". An adjective already falls through above, so what is left here is
a noun phrase, and sending the negator back to the auxiliary would give one
construction two shapes depending on nothing more than whether its
predicate needed a determiner.

_from src/parse/index.ts:708_

A negator directly in front of a quantifier negates the quantifier itself:
"not (all) cases", "not (every) day", "not (many) people". Negation and a
quantity are the two halves of one statement there, and moving the negator
on to the noun loses which of the two it applies to.

An article is the other reading -- "not a driver" negates the whole phrase,
whose head is its noun -- so only the quantifying determiners take it, and
they are the same set `isModifiablePronoun` already names.

_from src/parse/index.ts:732_

How far down the stack the verb is when the word on top is its complement and
its object sits between the two: "make a long story (short)", "we consider
the plan (risky)", "they left the door (open)".

Both words are arguments of the verb, so both hang off it. Attaching the
complement to the object instead is what made three spellings of one
structure disagree: "made him angry" put "angry" on the verb because the
pronoun object had already been popped, while "consider the plan risky" and
"made the room warm" put the complement on the object. Only the verbs that
take a complement at all are eligible, and only when everything between them
is the object -- nouns and their modifiers, nothing else.

_from src/parse/index.ts:766_

Whether the coordination on top of the stack already has an adjective as its
first conjunct, which makes an adjective after it the second one: "each (and
every) way", "the red (and blue) shirt".

_from src/parse/index.ts:813_

The second of two coordinated modifiers belongs to the conjunction, not to
the noun they both modify: "each (and every) way". A noun ahead normally
means the adjective is waiting for it, and the check below returns nothing
on that ground, but here the conjunction has already settled what this
adjective pairs with -- so "every" went to "way" and left "each" behind,
modifying nothing.

_from src/parse/index.ts:978_

Do a simple search for verb candidates. If it fails,
the parser will have to back-assign the relative
after finding the verb later on in the parse.

_from src/parse/index.ts:1368_

`verbsAreCompatible` reasons purely from Tense/VerbForm and knows nothing
about delimiters or subjects, so it read any trailing past-tense verb
across a comma as a candidate chain member, even one that had already
picked up a subject of its own: "Fingers crossed tightly, she waited"
attached "waited" under "crossed" instead of leaving both ownerless for
root selection to sort out (see `looksLikeFrontedParticipleRoot`).
Plain adjacency (no comma at all -- "will he be able", "He knows they
lied") is left alone, since that is how a subject-verb inversion or an
unmarked complement clause is expected to pick up its own subject before
chaining onto its head; only a genuine comma boundary combined with the
child already having a subject marks it as a separate clause rather than
a chain member. A coordinated chain never has this problem in the first
place: "knocking" and "breaking" in "was driving around, knocking down
mail posts, breaking the law" never acquire a subject of their own, so
`subject != null` alone would already spare them.

`subject != null` alone still missed the case where the child's subject
has not been reduced onto it yet but is sitting right there, further
back on the stack, waiting its turn: "A compromised machine ... belonging
to a person ..., contained explosive synthesis manuals" reads "contained"
as a chain member of "belonging" the same way "waited" almost was, because
"machine" -- "contained"'s real subject -- has not been picked up as a
child yet at this point in a left-to-right pass, so `subject` here is
still null even though the clause plainly has one. `findSubjectOffset`
is the same search `subject == null` falls to two branches down when
nothing here fires; running it early is exactly the same question asked
sooner, not a new one, so it carries no separate risk of finding a
subject that was not really there.

_from src/parse/index.ts:1590_

Two coordinated modifiers in front of this noun: "each and every way", "the
red and blue shirt". The conjunction and the second modifier already hang
off the first, so the noun takes the first one and the other two come with
it -- the alternative is a noun whose only modifier is the conjunction, with
the first determiner left over to be swept onto the root.

_from src/parse/index.ts:1631_

A negator outside a verb construction modifies the noun phrase it
introduces, and the noun is that phrase's head: "not (water)", "not
a (driver)". The test used to be that the stack item behind it was
not a verb, which asks the same question of a different word and so
could answer it differently from the tagger.

_from src/parse/index.ts:1913_

An adjective on each side of the conjunction: "each and every way", "any
and all claims", "the red and blue shirt". They are conjuncts of each
other and modify whatever noun follows together, so the conjunction hangs
off the first of them -- the same answer this already gives for two nouns
just above.

Without it the search fell through to the verb branch, which looks past
the noun for a verb anywhere ahead and found the one in "each and every
way I look", coordinating two clauses out of two determiners.

The word right after "and" also counts if NOUN is the *only* candidate
the dictionary offered it -- not a real reading, just the fallback a
word with no dictionary entry gets ("unmet" in "become unbounded and
unmet" has no entry at all, so its only candidate is `{NOUN: 1}`).
Trusting that guess over the parallel with an already-resolved ADJ
conjunct is backwards: "unbounded and unmet" attached the whole
"become" clause to "aspirations" -- the noun the coordinator went
hunting for once "unmet" outranked the adjective it stands next to --
instead of coordinating "unmet" with "unbounded" as two complements of
the same verb. A word the dictionary actually offers as NOUN keeps
that reading; only an unrecognised word defers to its neighbor.

_from src/parse/index.ts:2108_

Degree words that compare on their own, so that a comparative marker right
after one belongs to it: "more than one can chew", "less than we hoped".

Matched on the form rather than the lemma, because the lemma is the positive
and the positive is not a degree word: "less" and "least" both lemmatise to
"little", "fewer" to "few". They are also not simply the words carrying
`Degree`, which is every comparative there is -- see below for why an -er form
is deliberately not one of these.

_from src/parse/index.ts:2120_

Whether the word at `index` is what a comparative marker immediately after it
compares, rather than a word its clause merely happens to follow.

A comparative marker -- ConjType=Comp, so "as" and "than" -- is licensed by a
degree word, and that word is its head: "as far | as I am concerned", "more |
than one can chew". Without this, `findDegree0Parent` reaches past the degree
word for the enclosing clause's verb, which is why "as far as I am concerned"
parsed one way alone and another inside "It works as far as I am concerned":
the standalone had no verb to reach for and fell back to "far", the sentence
had one and did not.

Exactly two shapes count:

  - a degree quantifier, which compares by itself;
  - the object of a preceding "as", the first half of the "as X as"
    correlative.

A bare comparative inflection is deliberately not one of them. "she has more
money than I do" hangs the clause off the noun phrase the degree word
modifies, and "easier said than done" compares "said" with "done" rather than
"easier" with anything, so reading every -er form as a licenser would move
both of those and neither is wrong today.

_from src/parse/index.ts:2344_

A determiner is left alone for the noun on its right to collect. A
coordinated one is the exception: the conjunction has already paired it
with the determiner in front, so it is that pair, and not the noun, that
it belongs to -- "each (and every) way".

_from src/parse/index.ts:2597_

Whether `candidate` itself introduces a further coordinated clause ("were"
in "Wages stagnated, conditions were appalling, *and* artisan skills were
devalued" has "and" as a child). A candidate shaped like that is not a
standalone claim to root status competing with the one before it -- it is
one link in an explicit list, and the list's later links are no more
"the real clause" than its earlier ones just for happening to have a
pronoun subject or an unambiguous tense. Scoring higher than a
comma-spliced neighbor is exactly what a genuine absolute-phrase-vs-main-
clause distinction looks like; scoring higher while also opening onto
"and" is what a coordinate list looks like, and `findBestRoot` must not
confuse the two.

Ordinary VP coordination under one subject has exactly the same shape,
though, and is not a list of competing clauses at all: "organizations
arranged* numerous gatherings and issued statements ..." has "and" as
"arranged"'s child too, but "issued" -- the conjunct on its far side --
shares "arranged"'s subject rather than supplying one of its own, the same
way "paced" shares "waited"'s in "she waited, and paced". What tells the
two apart is whether that conjunct has a subject of its own: "were" in
"artisan skills *were* devalued" does, "issued" does not. Only a conjunct
with its own subject marks `candidate` as a mere list link.

_from src/parse/index.ts:2647_

Whether `candidate` is introduced by a leading marker of its own ("is" in
"My dad seemed relaxed for once, *which* is rare ..." has "which" as a
child; "departed" in "*As* Phelps departed the pool, ..." has "As"). Not
every subordinator reads as one structurally: relative words ("when",
"which") carry `ConjType=Sub`, but "as" here carries `ConjType=Comp`
(comparative) and "despite" carries no `ConjType` at all, both instead
tagged as plain prepositions (`AdpType=Prep`) -- the feature set a
subordinate clause's opener gets is not consistent enough to match on.

What distinguishes these from an ordinary fronted adverbial phrase ("*In*
honor of a holiday, I looked ..." has "In" as a child too; "*At* the end
of the day, the reason ... is ..." has "At") is not the marker's tag but
its own shape: "As" and "which" are bare, nothing attaches to them -- they
hand their clause's subject straight to the verb they introduce. "In" and
"At" are themselves the head of a noun phrase ("honor of a holiday", "the
end of the day"), with a NOUN child of their own, and that noun phrase is
what is fronted, not a clause. A leading MARK child with no NOUN child of
its own is the subordinator case; skip the candidate. One heading its own
noun phrase is an adverbial PP on an otherwise ordinary main clause; the
candidate stays eligible.

A VERB child rather than a NOUN one is a parser quirk, not a legitimate
noun phrase -- "*As* the moments passed, and no sign came ..." attaches
"passed" to "As" directly (a coordination artifact) rather than the usual
other way around, and that VERB child is exactly as much evidence of a
subordinate clause as no child at all would be; it still disqualifies the
candidate.

A coordinating marker's own VERB child is a different artifact of the same
general shape, but the opposite conclusion: "*Then*, looking directly at
me with raised eyebrow, *she said*, ..." attaches "looking" to "Then" the
same way "passed" attaches to "As", but "Then" (`ConjType=Coor`) is not a
subordinator at all -- it is a transition adverb, unrelated to whether
"said" heads its own clause -- where "As" (`ConjType=Comp`, functioning as
"while") genuinely introduces one. Only a marker that is not itself a
coordinator can disqualify a candidate this way.

This is checked only when candidates are already competing for root, so it
never touches an ordinary main clause with a fronted adverbial that has no
rival to compete with in the first place.

_from src/parse/index.ts:2706_

The candidate's own subject, if it has one -- a NOUN child positioned
before it, excluding a relative/subordinating word that was forced to
NOUN by some other rule (`mark-relative-pro`) but still carries
`PronType=Rel`; that is a marker introducing a clause, not a subject of
this one, and `hasLeadingMarkerChild` above already disqualifies a
candidate it belongs to.

The subject need not be attached yet. One immediately adjacent to its
verb on the stack ("It increased ...") is ordinarily picked up during the
main left-to-right pass, but when nothing else is on the stack to license
that step it is left for the post-root fallback (`findClosestHead`) to
attach once a root exists at all -- which is exactly the root-selection
this feeds into. Reading `children` alone would miss it the moment a
second orphaned VERB shows up later in the sentence, so a NOUN
immediately to the candidate's left on the stack counts too.

_from src/parse/index.ts:2757_

Whether `candidate` is solid enough that `findBestRoot` should stop
looking for anything better and keep it, regardless of what a later
comma-joined candidate looks like.

There is no verb-transitivity dictionary in this pipeline (see CLAUDE.md),
so nothing here can tell "crossed" in "Fingers crossed tightly, she
waited" apart from "waited" by valence -- both are just a VERB with a
subject, going by shape. What *is* available is two independent signals,
either of which is enough on its own:

- A personal pronoun subject ("waited" in "..., she waited"). A bare
  possessed or common noun subject (a body part or attribute) is how a
  genuine nominative absolute's internal subject is built, so "crossed"
  in "Fingers crossed tightly" and "hung" in "The sun hung low ..." do
  not qualify this way; a pronoun subject essentially never is one.
- Being unambiguously finite at all, subject or no subject. "Forget" in
  "Forget Jon or Dany on the throne, we want Arya" has no subject --
  imperatives never do -- but it is exactly as finite as any subject-
  having clause and is not a possible reduced participle, so nothing
  later in the sentence should be able to unseat it either. "Jill said,
  ('men' are such pigs lol)" needs this for "thought"/"said"-type verbs
  too, whenever the pronoun-subject test alone would not have caught it.

_from src/parse/index.ts:2790_

Verbs of speech and thought, and the copula-plus-stance-adjective forms
that work the same way ("am certain", "is sure"), when they show up as a
short comma-set-off clause commenting on the sentence around them rather
than describing an event of their own: "His breakdown ... haunted the
parish, I *am certain*." / "Republicans seized on ..., they *said*, of
...". Almost every instance of this shape has a pronoun subject purely
because it is a speaker commenting on something already said, not because
it is a second, coordinate event -- so a pronoun subject on one of these
is not the evidence `isCompellingReplacement`'s first branch treats it as
everywhere else, and letting it win there is what took root away from the
sentence's real main verb ("haunted") and gave it to the tag clause
instead. This only matters for a *trailing* clause challenging an already
-established `chosen`: a leading "I think ..." taking the rest of the
sentence as its complement is a completely different, entirely ordinary
construction, and is untouched here since it never reaches
`isCompellingReplacement` in the first place -- it is simply `chosen` from
the start.

_from src/parse/index.ts:2877_

Whether `next` is compelling enough evidence to replace a `chosen` that
`isSolidRoot` has already said is not good enough to stop on. A personal
pronoun subject always qualifies -- pronouns essentially never build a
genuine absolute-phrase-internal subject, so one on `next` is strong
evidence by itself -- *unless* `next` is a parenthetical predicate (see
above), whose pronoun subject is exactly as unhelpful evidence as it is on
a genuine absolute-phrase-internal one, for the same underlying reason:
both are pronoun subjects that do not mark a second, coordinate clause.
Failing that, `next` still qualifies if it has *any* subject at all while
`chosen` has none: "*following*" in "Throughout the week following the
announcement ..., organizations *arranged* numerous gatherings ..." is a
fronted participial adjunct with no subject of its own, and "arranged" --
a real clause with "organizations" as its subject, common noun or not --
is exactly the kind of candidate that should win against it. Two
candidates that both have a (non-pronoun) subject of their own do not
trigger this branch, deliberately: "Wages stagnated, prices soared." gives
`chosen` no better claim than `next`, and nothing here should prefer the
later one just for existing.

Deliberately not "unambiguously finite" on its own, on either branch,
which is what let "drive" in "Our mum used to do the same thing, drive us
mental with it" (a bare infinitive coordinated under "to", not a clause
with a subject of its own at all) outrank "used", an ordinary
tense-ambiguous clause with a real if non-pronoun subject. Finiteness only
settles anything when it is the reason `chosen` itself gets to stop early
(`isSolidRoot`); it is not on its own a reason for `next` to displace a
`chosen` that has not stopped.

_from src/parse/index.ts:2934_

A candidate fronted by its own marker ("As" in "As Phelps departed
...") is never eligible at all, not even as the fallback default --
skip past it looking for the first candidate that isn't, the same
way the comparison loop below refuses to let one become `chosen` by
replacement. Falling back to `candidates[0]` only happens if every
candidate is marker-led, so this never leaves root unassigned.

_from src/parse/index.ts:3069_

An orphaned verb's clause may belong to a "that"/"because"-style
subordinator sitting further back on the stack rather than to the
sentence root directly: "noted that despite his young age, Lane
demonstrated ..." leaves "demonstrated" without a head, and the
degree-2 marker "that" -- which takes a clause and nothing else -- is
still waiting for one. Skip a marker that already has a verb child; it
has already claimed a different clause (a relative clause resolved
earlier in the same sentence, say), and this verb belongs elsewhere.
Falling back to `root` unconditionally is what let "demonstrated"
attach straight to "noted", skipping over "that" entirely.

_from src/parse/index.ts:3160_

The model is optional. Without it the tagger still resolves every chain it
can with the language rules alone and falls back to the word's most frequent
tag for the rest, which is deterministic and needs no training. That is what
lets the training data be harvested with no model in the first place.

### `src/tag/audit.ts`

_from src/tag/audit.ts:3_

A window onto what the rules decided, for the rule audit to read.

Tracing (../trace.js) says what happened as prose, one line at a time, which
is what you want when you are following a single sentence. This says the same
thing as data: for every position the tagger judged, which tag each rule
allowed or vetoed and which one the model then picked. That is what makes it
possible to ask questions across a whole corpus -- which rule vetoes the
right answer most often, which pairs of rules leave a word with no legal tag
at all, which rules never fire.

Like tracing, this is off unless something asks for it, and the events are
built inside a thunk so that nothing is allocated on the hot path when it is.

_from src/tag/audit.ts:25_

Whether the tag was accepted without consulting the rules at all, because
every other candidate had already been vetoed and the word has to be
something. Each of these is a place where the rules contradict each other.

_from src/tag/audit.ts:29_

Every rule in the list that matched, in order, not only the first. Only the
first one decided anything; the rest are what would have decided had it not
been there, which is how a rule is shown to be redundant or unreachable.
Empty unless auditing, since working it out means running the whole list.

### `src/tag/index.ts`

_from src/tag/index.ts:56_

A rule answers one question: can this word act as this tag, here?

The rules for a tag are tried in order and the first one whose `when` matches
decides; nothing after it runs. `features: null` is a veto -- the word cannot
take this tag in this context. Anything else accepts it, and whatever the
rule carries is attached to the token: `parentDirection` records which side
the word's head is on, which the parser reads back later.

The id is what the audit counts and what tracing prints, so it has to be
stable and unique across every list.

_from src/tag/index.ts:209_

A cardinal followed by a noun used to end the compound here, back when the
cardinal itself was being read as an adjective. Now that it is a noun
(see nounIsAdjective), "seven judges" is a compound like any other, which is
the reading docs/parts-of-speech.md argues for: a number in front of a noun
modifies it the same way "wood" modifies "chipper". Ending the compound left
the noun after the number with nothing to be but a verb.

_from src/tag/index.ts:263_

The verb whose object this word could be, looking left.

A noun in the way normally ends the search: what sits behind a verb's object
is part of the object. The exception is a verb that takes an object *and* a
complement, where the complement is behind the object by construction --
"make a long story short" -- so one noun phrase may be crossed when the verb
on the far side of it is one of those. Only one, and only for those verbs.

_from src/tag/index.ts:477_

Improve searching forward for the candidate verb
in case there are adverbs or marked objects
i.e. 'the reason some often lie'

An article or a personal pronoun heads a phrase that is already
determined, so a determiner cannot be determining one: neither "the my
book" nor "what I" is a determiner and its noun. The predeterminers that
genuinely precede an article -- "all the", "both the" -- are Tot or Neg
and are handled by their own branch above. Without this, "What the
mayor did not know" read "What" as determining "the" and lost the free
relative, vetoing the noun reading on the strength of a word that was
never a candidate to be modified. Testing for any PronType rather than
an article is too strong: "some other day" has a determiner following a
determiner and "some" really is one.

_from src/tag/index.ts:497_

A cardinal is never an adjective, however much it looks like one in "eighty
books": docs/parts-of-speech.md settles that numbers are always nouns, on the
grounds that the parse and the meaning come out the same either way and the
distinction only gives the tagger something else to get wrong. There used to
be a branch here vetoing the noun reading of a cardinal before a noun, which
both contradicted that and collided with adj-is-compound-noun vetoing the
adjective reading of the same word, leaving nothing standing.

_from src/tag/index.ts:632_

A word a verb is taking as its adjective object is not the tail of the
compound noun in front of it. `adj-is-verb-object`, four rules further
down this list, accepts exactly that reading, and until now the two
could never disagree: every branch here needs a noun immediately
before, and a noun immediately before was enough to make
`findLeftVerbHead` give up, so `isVerbsAdjObject` was always false
here. Now that the search may cross the object of a verb that takes a
complement as well, they can, and the rule with the wider evidence
wins -- "make a long story short" read "story short" as one noun and
left "short" with every one of its four tags vetoed.

_from src/tag/index.ts:894_

The bare infinitive that a causative or perception verb takes across its
object: "she made John blush", "they let him go", "I saw her leave".

Like a nominative pronoun above, the licenser is positive evidence rather
than an absence: the verb two places back allows only the bare form here, so
the word is that form and not a noun. Dropping the veto that read "John
blush" as a subject and a verb that disagree with it was not enough on its
own -- it left both readings legal and the choice to the model, which took the
noun.

A determiner still waiting for its noun outvotes the whole reading, because
then the two words are one noun phrase and not a verb and its object: "make a
Skype call" and "has a Free NookBooks section" both end in a word that could
be a bare verb after a noun, and the "a" that has nothing else to determine is
what says they do not.

_from src/tag/index.ts:1090_

Any other marker -- a preposition ("despite his young age,") heading
its own noun phrase, say -- opens a nested phrase of its own between
here and the degree-2 marker, so this position is no longer
"immediately after" it in the sense this rule cares about: there is a
whole fronted adjunct in between, not a bare run of NOUN/ADJ/ADV up to
the clause's own verb. Scanning past it treated "despite" as
transparent and forced the real subject's head noun ("age") to read
as a verb instead, chasing a clause boundary two markers back.

_from src/tag/index.ts:1149_

Only a coordinator makes conjuncts. A comparative ("lower than local
retail stores") takes an object instead, and reading its object as a
second verb is what turned "stores" into a verb.

And a coordinator between two nouns coordinates the nouns, whatever its
head happens to be at this point: in "the back of monitors or wall
mounts" the "or" is still hanging off the verb, so the head alone says
verb conjunct while the word in front of it says otherwise. The word in
front is the better evidence, and it has to be read as what it can still
be, since the tagger has usually not settled it either.

_from src/tag/index.ts:1187_

The word right before "than" is the adjective of the comparison -- "cheaper
than", "much lower than" -- which rules out its noun and verb readings.

A comparison has one graded element, though, so if the word before this one
is already it, this one is what is being compared rather than the comparison
itself: "easier said than done" grades "easier" and compares "said" with
"done", and reading "said" as the comparative adjective left it with no verb
reading and no way to head the phrase. Only `Degree` counts as already
graded; a plain degree adverb does not, because "much better than" and "so
much lower than" put the graded word exactly where this rule expects it.

_from src/tag/index.ts:1274_

A quantifier between a negator and a noun is determining that noun, not
standing in for one: "not (all) cases", "not (many) people". The pronoun
reading leaves the negator -- an adverb -- modifying a noun, and
docs/parts-of-speech.md gives an adverb adjectives, verbs, markers and other
adverbs to modify, never a noun.

Both halves of the context are needed. Without the negator this is the plain
determiner question `n-is-det` answers, and it declines to answer it while
the next word could still be a verb, which "all cases share" is. Without a
noun behind it the quantifier really is a pronoun and NOUN is the right
reading: "not all of them", "not many know".

A negator inside a verb construction is a different word doing a different
job -- it is negating a verb further right, and what sits between the two is
none of its business -- so it does not license this.

_from src/tag/index.ts:1559_

What follows a modal in its bare form is the verb the modal is modifying,
and that holds whether or not the word could be an adverb somewhere else:
"will like" is the verb "like" either way.

_from src/tag/index.ts:1783_

The pattern "may he rest in peace" is a valid
modal + subject + verb structure

So is "she made John blush", for the same reason: what licenses the bare
form is the verb two places back, not agreement with the noun in between.
The tests below rule out a bare present finite that does not agree with the
noun before it -- "John blush" -- which is right when that noun is the
subject and wrong when it is the object of a causative or perception verb,
where the bare infinitive is the only form allowed. A modal was already the
exception; the causatives are the same exception with a different licenser.

_from src/tag/index.ts:2051_

A possessive 's hangs off a substantive noun: "the man's hat". It never
hangs off a pronoun, because English spells those possessives as separate
words -- "whose", "his", "its" -- so "who's" is always "who is". This is
the same test `isPossParticleWithoutArguments` makes on the marker side;
before relative pronouns became nouns the two agreed by accident, because
a relative was a MARK and failed the `foreTag !== "NOUN"` gate here. Now
they have to agree on purpose, and a disagreement between them leaves 's
with no legal tag at all.

_from src/tag/index.ts:2238_

A determiner coordinated with a second determiner: "each and every page",
"any and all claims". The pair determines the noun that follows, so the
conjunction between them is not the marker that would leave the first one
with nothing to determine.

All three parts have to be there -- a coordination, a second determiner, and
a noun for them to reach -- because "each and all" with nothing after it
really is two pronouns.

_from src/tag/index.ts:2262_

Tried and reverted: exempting `isCoordinatedDeterminer` here too, the way
`adj-is-forced-pro` does. Both rules ask whether the adjective has anything to
modify and a coordinated determiner does, so the two look like they should
agree -- and this one runs first, which is why "Each and every day counts"
still reads "Each" as a pronoun while "read each and every page" does not.

It cost two tokens of the gold set and bought nothing. Both losses are "this"
in "with this or that type of leader", annotated NOUN, where the exemption
makes it the determiner of "type"; and the sentence it was meant to fix stays
wrong anyway, because the model reads the "counts" that follows as a noun. A
fix here needs the gold set's reading of a demonstrative before a coordinated
determiner settled first.

_from src/tag/index.ts:2531_

A word that can be a marker and is followed by something a marker takes is a
marker rather than an adverb. What a marker does not take is a verb or an
adverb, and that has to be asked of what the next word can still be: asking
only what it has been tagged so far reads every undecided word as "not a
verb", which cost "then" its adverb reading in front of any verb the tagger
had not reached yet.

_from src/tag/index.ts:2692_

A relative that follows neither a noun nor a verb has nothing to relate
back to, so it is read as standing in for one. That costs this rule most
of what it gets wrong, all of it a relative opening a clause after a
comma or at the start of a sentence ("..., which plays them fine").
Excluding those two positions does not work: the same shape is a pronoun
in "Ana, who had two children" and a marker in "..., which plays them
fine", both subjects of their clause, and the annotations want NOUN for
the first and MARK for the second. Narrowing it costs seven right answers
to save seven wrong ones, so it stays until the annotations say which of
the two is the exception.

_from src/tag/index.ts:2782_

The scan runs ahead of the tagger, so most words it passes have not been
tagged yet and "not a noun" has to mean "cannot be a noun". Reading it as
"not yet known to be one" walks straight over the possessed noun to
whatever follows: that is how "the company's Customer Service" ended up
with a 's that was neither a verb nor a marker, this rule having vetoed
the marker and its mirror in the verb rules the verb.

_from src/tag/index.ts:2885_

The last resort, when every other tag this word could take has already been
vetoed and it still has to be something. The rules are skipped and the tag is
taken, which means the rule lists have contradicted each other: between them
they claimed the word can be nothing at all. The audit counts these, because
each one is a contradiction with a location.

_from src/tag/index.ts:2898_

Every rule in the list that matches, not only the first. Only for the audit:
a rule that matches but is never first is one an earlier rule always speaks
for, and that is not visible from the decision alone. A rule that only ever
runs after another has been given the chance to say no can also throw on
states the order was protecting it from, so a failure here is recorded rather
than raised -- it says something about the rule, but not about this parse.

_from src/tag/index.ts:3126_

Candidates are ordered by how often the word takes each tag, so that the
first one is the most-frequent-tag baseline. predict() keeps the earlier
candidate when scores tie, which makes the choice fall back to that
baseline instead of to an arbitrary order when the model has nothing to
say about this token -- or when there is no model at all.

_from src/tag/index.ts:3151_

Only the positions where the tagger had to pick between rule-legal tags
count as disambiguated. Everything else was settled by the rules alone,
which is what makes it safe to harvest as training data.

_from src/tag/index.ts:3271_

What the rules are, for the audit to read: the id, the tag whose reading each
one judges, and whether matching it vetoes that reading or allows it. Nothing
here is consulted while tagging; it exists so that a rule which never fires
can be named, which is impossible to do from the decisions alone.

_from src/tag/index.ts:3296_

Two rules only say the same thing if they also carry the same features:
one that allows a noun with its head on the left is not interchangeable
with one that allows it with its head on the right.

### `src/tokenize/index.ts`

_from src/tokenize/index.ts:35_

https://unicode.org/reports/tr18/#General_Category_Property
https://www.unicode.org/Public/UCD/latest/ucd/PropList.txt
https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt

_from src/tokenize/index.ts:172_

Destructuring a type with optional props yields `undefined` for the missing
ones. Storing those keys would leave every token with a dozen empty slots
that Object.assign() and the spread operator happily copy over real values,
so only the props that actually have a value are kept.

_from src/tokenize/index.ts:239_

Shallow-cloned: `pos` and `prepPairs` come straight off the shared
dictionary entry for this word form, not a fresh object per token.
Handing that reference to a token is what let `unitAbbreviations`'s
`delete pos.NOUN` (src/parse/index.ts) permanently remove NOUN from
every later token of the same word for the rest of the process --
corruption invisible within a single parse, and only visible as a
parse that depends on which documents a batch happened to run
first. Every token gets its own copy so tagging one can never leak
into tagging the next.

_from src/tokenize/index.ts:271_

Typescript's type system makes it so an object declared as a type
with optional props is assigned 'undefined' values when such props
are missing.When assigning these objects with Object.assign()
or the spread (...) operator, actual values can be overwritten with nulls.

### `src/trace.ts`

_from src/trace.ts:1_

Tracing exists to make the language rules inspectable: every decision the
tagger and the parser take can be replayed as a line of text. It is off by
default because parsing is a hot path in a real-time, client-side pipeline.

Messages are passed as thunks so that the template literals and the
JSON.stringify calls inside them never run while tracing is off.

### `src/types.ts`

_from src/types.ts:1_

The tag set is deliberately small and functional: closed classes are folded
into the open class that matches their role in the parse (determiners are
ADJ, pronouns are NOUN) and the distinctions they lose are recovered from the
lexical features below. See docs/parts-of-speech.md.

_from src/types.ts:42_

Comparative ("easier", "more") or superlative ("easiest", "most"). The
positive degree is left unmarked, as the other features leave their default
value unmarked. This says the word is a graded form, which is what tells the
one graded element of a comparison from the thing being compared: in "easier
said than done" the comparative is "easier", so "said" is not one.

_from src/types.ts:115_

Whether the token is an identifier rather than an English word: a URL, an
e-mail address, an @mention, a #hashtag, a phone number or a postcode.
Its characters carry no morphology, so rules that read the surface form
(capitalization, compounding) must skip it.

### `test/parse/index.test.ts`

_from test/parse/index.test.ts:7_

These parses are produced by the language rules alone: no model is passed, so
nothing here depends on a trained weights.json. That is the point. A retrained
tagger can raise accuracy on ambiguous words but it must never be needed to
make the suite green, otherwise every training run risks silently rewriting
what the library is supposed to do.

The sentences the rules cannot get right on their own are listed in
KNOWN_GAPS below. They still run, and they report what they got wrong, but
they do not fail the build: each one is a language rule waiting to be
written, not a regression.

_from test/parse/index.test.ts:21_

Accuracy is measured over the words the tagger actually had to choose for,
never over the whole sentence. Punctuation and single-tag words are free, and
counting them inflates the number until it stops responding to real changes
(see "Metrics neglect variance in task difficulty" in docs/paper.md).

_from test/parse/index.test.ts:466_

Negation, which an upstream application needs to come out one shape.

Two readings, and which one applies is decided by the word in front of the
negator alone. After an auxiliary or a modal it is part of a complex verb
construction and belongs to the verb that construction is about, however
many adverbs are written in between -- that is the group below. Anywhere
else it modifies what is directly at its right, which is the group after
it. Both are tested with and without the adverb, and the phrase is tested
alone as well as inside a clause, because a rule that searches the stack
for a verb finds nothing in a bare phrase and falls through to a fallback
that can land on the right answer for the wrong reason.

_from test/parse/index.test.ts:534_

No verb follows, so the negator takes what the copula introduces --
the same head it gets in "he is not happy", where the predicate needs
no determiner.

_from test/parse/index.test.ts:1171_

"the caption ... ran" is its own clause with its own subject
("caption"), comma-spliced onto the quoted caption rather than
continuing it, so it hangs off the sentence's real root ("IS")
rather than off "WATCHING" specifically -- the same distinction
that keeps "waited" from being read as a continuation of "crossed"
in "Fingers crossed tightly, she waited".

_from the "Also ... this ... #GoT #AryaStark" case in test/parse/index.test.ts_

This test previously expected "#GoT" tagged VERB and
rooted at -1, which turned out to depend on dictionary corruption: an
earlier-run test's `unitAbbreviations` adjuster mutated the shared "got"
dictionary entry's `pos` weights in place (`delete pos.NOUN`), so this
test only saw a VERB-only "got" because of what ran before it in the
same process -- see the `pos`/`prepPairs` cloning fix in
src/tokenize/index.ts. With tokens no longer sharing that reference,
"#GoT" tags NOUN like any other hashtag, and "this" is the nearest thing
to a nominal head in a fragment with no real verb at all.

_from test/parse/index.test.ts:4661_

Five fixed phrases an upstream application needs the same shape for wherever
they turn up. Each one is here twice or more, alone and inside a larger
sentence, because standing alone is what used to make them look right: with
no verb in the sentence for a rule to reach for, the fallback happened to
land on the correct head, and adding a clause around the phrase moved it.

_from test/parse/index.test.ts:5018_

Every assertion carries an explicit message. Without one, a failing
assert.ok makes Node re-read and re-parse this file through the TypeScript
source map to reconstruct the expression, which on a file this size never
finishes -- the suite would hang exactly when a test starts failing.

_from test/parse/index.test.ts:5087_

Sentences the language rules do not get right yet. They are exercised on
every run so that a fix shows up as soon as it lands, but they do not fail
the build: this list is the backlog of rules still to write, and the paper
is explicit that the pipeline is not expected to be perfect.

### `test/parse/invariants.test.ts`

_from test/parse/invariants.test.ts:1_

Structural guarantees, as opposed to the accuracy guarantees in
./index.test.ts.

These properties must hold for every input and for every model, including no
model at all. Nothing here says the parse is *right* -- only that it is
well formed, so that anything consuming it can recurse from the root, trust
the token offsets and trust that a tag is one the word can actually take.
A model can make the parse worse; it must never make it malformed.

They are checked over the whole annotated corpus rather than a handful of
sentences, because a malformed parse is exactly the kind of thing that only
shows up on messy real text.

_from test/parse/invariants.test.ts:41_

Negation, which the last block in this file is about: an auxiliary or a
modal, then the negator, then nothing / one adverb / several, so that a
model reading the adverbs differently cannot move where the negator lands.

_from test/parse/invariants.test.ts:134_

Stands in for an arbitrary trained model: it answers with a made-up but
repeatable score for whatever feature it is asked about. Running the
invariants against several of these is what turns "the parse is well formed"
from a statement about the current weights into a statement about every
possible set of weights, which is what makes retraining safe.

_from test/parse/invariants.test.ts:177_

Where a negator lands, which downstream consumers read structurally and so
needs to be the same shape for the same construction whatever the model does
with the words around it.

After an auxiliary or a modal the negator belongs to the verb of that
construction, and any adverbs written in between belong to the verb too:
"can't corrupt" and "can't accidentally corrupt" hang the negator on
"corrupt" alike. `findNegatedVerb` is the same predicate the parser consults
while building the tree, so asking it again of the finished parse is what
says its answer was actually used rather than merely available.

Outside a verb construction the negator modifies whatever is directly at its
right and there is nothing to check here -- what that word is depends on the
tags, which a model is allowed to change.
