# Artisan

## Installation

```
npm install @textoic/artisan
```

Artisan is a composable Natural Language Processing library designed and built with the following considerations:

- 100% **client-side** to guarantee **privacy** and **safety**.
- Works fast enough for **real-time** applications.
- Tolerates **ungrammatic and inconsistent texts** such as tweets and arbitrary Internet user posts.
- Includes a **test suite** to prove it works and show how it handles different texts.
- Has **interpretable language rules** that can be incrementally improved.

For a complete overview of this project's architecture, design and goals, please refer to [the official Artisan paper](docs/paper.md).

## Getting started

The library is designed as a pipeline split into different modules that each consumes the output of the previous step. The main modules are:

- **lemmatize**: Given a single word, extracts its most likely lemma and lexical features.
- **tokenize**: Converts a text into word tokens (objects with rich information about each word).
- **sentencize**: Splits an array of tokens into an array of sentences where each sentence is itself an array of tokens. From this point onward, all modules deal with a single sentence.
- **parse**: Assign a syntactic role (PoS tag) and a syntactic parent to each word token in a sentence.

To get a sense of the output of each module, we have prepared a CLI that will show you the JSON output of running any sentence through one of these modules.
These are the possible commands you can use with the _start_ script:

- **tokenize**
- **parse** (or tree, if you want a visual representation of the parse).
- **explain**, which shows why each word got the tag it got: for every word with
  more than one possible tag, which rule allowed or vetoed each reading.

To try it, you can run the following command:

```
npm start tokenize "Johnny got his gun"
```

The output should look like the JSON below:

```json
[
  [
    {
      "id": 0,
      "lemma": "johnny",
      "feats": { "Number": "Sing" },
      "misc": { "f": 0.0000772, "at": 0, "pos": { "NOUN": 1 } },
      "form": "Johnny"
    },
    {
      "id": 1,
      "lemma": "get",
      "feats": { "Tense": "Past", "VerbForm": "Part" },
      "misc": {
        "f": 0.000827,
        "pos": { "VERB": 0.89, "ADJ": 0.11 },
        "prepPairs": {
          "out": { "VERB": 0.99, "NOUN": 0.01 },
          "up": { "VERB": 0.97, "NOUN": 0.03 },
          "into": { "VERB": 1 },
          "over": { "VERB": 1 },
          "inch": { "VERB": 0.98, "NOUN": 0.02 },
          "off": { "VERB": 1 },
          "be": { "NOUN": 0.63, "VERB": 0.37 },
          "on": { "NOUN": 0.03, "VERB": 0.97 },
          "down": { "VERB": 1 },
          "of": { "VERB": 1 },
          "outside": { "VERB": 1 },
          "through": { "VERB": 1 },
          "behind": { "VERB": 1 },
          "along": { "VERB": 1 },
          "around": { "VERB": 1 },
          "inside": { "VERB": 1 },
          "with": { "VERB": 1 },
          "at": { "VERB": 1 },
          "under": { "VERB": 1 },
          "about": { "VERB": 1 },
          "from": { "VERB": 1 },
          "by": { "VERB": 1 },
          "past": { "VERB": 1 },
          "beyond": { "VERB": 1 },
          "near": { "VERB": 1 },
          "via": { "VERB": 1 }
        },
        "at": 7
      },
      "form": "got"
    },
    {
      "id": 2,
      "lemma": "his",
      "feats": { "Poss": true, "PronType": "Prs" },
      "misc": { "f": 0.00308, "pos": { "NOUN": 0.07, "ADJ": 0.93 }, "at": 11 },
      "form": "his"
    },
    {
      "id": 3,
      "lemma": "gun",
      "feats": {
        "Number": "Sing",
        "Person": 1,
        "Tense": "Pres",
        "VerbForm": "Fin"
      },
      "misc": {
        "f": 0.0000783,
        "pos": { "NOUN": 0.93, "VERB": 0.07 },
        "prepPairs": {
          "out": { "NOUN": 1 },
          "inch": { "NOUN": 0.95, "VERB": 0.05 },
          "on": { "NOUN": 1 },
          "with": { "NOUN": 1 },
          "at": { "NOUN": 1 },
          "into": { "NOUN": 1 },
          "from": { "NOUN": 1 },
          "down": { "NOUN": 1 }
        },
        "at": 15
      },
      "form": "gun"
    }
  ]
]
```

## Project structure

These are the main folders:

- **data**: The word lists that contain the lexical information necessary to build the language model. The file needed at runtime is _dictionary.json_, optionally accompanied by a trained _weights.json_; the rest of the files contain the lexical information used to generate the dictionary.
- **docs**: Documentation about the modules, the information they handle and their interfaces.
- **scripts**: The code used to build and test the language model.
- **src**: The main folder containing the different modules in the pipeline.
- **test**: The test files, run with the built-in Node test runner, mirroring the structure of the _src_ folder.

## Lexical information

During word tokenization, the lexical information of each word is retrieved from the _dictionary_. Different lexical features are useful for different modules. For example, a word's possible PoS tags have are crucial during the tagging/parsing step, but unnecessary afterwards.

The following are the basic properties which are always present after the word tokenizer is applied:

- **id**: The position (0-indexed) of the word in the sentence.
- **form**: The word as it appears in the text.
- **lemma**: The word's lemma, lowercased.
- **feats**: An object containing the subset of [Universal features](https://universaldependencies.org/u/feat/index.html) which are relevant for English.
- **misc**: Miscellaneous properties such as the word's position within the original text (_at_ property) or the word's possible PoS tags.

For a complete list of the properties that a token can be assigned, check the [token properties](docs/tokens.md) document.

### The dictionary

Having a good dictionary is the key to a working pipeline. However, since one of the main goals of this project is to be able to work client-side, the dictionary must necessarily be limited in size.

Most of the information stored in the dictionary is static and derived from lists and other dictionaries. Only the lexical facts that the tagger and the parser actually read are kept, so the dictionary stays small enough to ship to a browser.

However, there is also information derived from the specific dataset used to "train" the language model. The project includes the necessary scripts to process an arbitrarily large dataset and extract the following information:

- **frequency**: How frequently a word appears in the dataset.
- **disambiguated part of speech**: For words that can have more than one possible PoS tags, how relatively frequent are each of them when they are _disambiguated_ using the sentence's context. For example, in the sentence "The _play_ was really good", the word "play" is forced to be a noun due to the preceding determiner. If that was the only instance of a disambiguated "play" in the whole dataset, the frequency for that PoS tag would be 1. The larger the dataset used to train the language model, the estimate for the relative frequencies of each PoS tag will improve.
- **prepositional pairs**: Many words in English can act as either nouns or verbs and disambiguating them is a difficult task. One of the indicators that helps the PoS tagger disambiguate is the presence of a specific preposition. As an example, consider "ship": if it is followed by "out", it is very likely to be a verb, whereas if it is followed by "of" or "in" it is more likely (although not necessarily) acting as a noun.

## Building the dictionary

The dictionary is built from any collection of **unlabeled** text. The input is a plaintext file where each row is a JSON object with a `text` property. No annotation is needed, and no existing model is needed:

```
npm run build-model -- path/to/corpus.txt
```

That runs four steps in order, and you can also run them individually:

1. `npm run build-corpus-stats -- path/to/corpus.txt` reads the corpus with the language rules alone and records how often each ambiguous word took each tag (_parser-word-tags.txt_) and which prepositions followed which words (_prep-pairs.txt_). You can stop it at any point with Ctrl-C and it will resume where it left off.
2. `npm run build-likelihoods` turns the word/tag counts into _data/pos.json_.
3. `npm run build-preposition-pairs` turns the pair counts into _data/pairs.json_.
4. `npm run build-dictionary` rebuilds _data/dictionary.json_ from all the word lists.

None of these needs a model, so `parse` works with no _weights.json_ at all: where the rules cannot narrow a word to one tag, the tagger falls back to that word's most frequent tag. That fallback is deterministic and is the floor every trained model has to beat.

The one loop in the process is benign: step 1 tokenizes with the current dictionary and step 4 rewrites part of it. This is safe because _data/pos.json_ only redistributes weight between tags a word already has. It can never add or remove a possible tag, so it cannot change which parses are legal, only which one is preferred on a tie.

## Training the model

There used to be a fifth step here that trained the tagger on the same unlabeled text, taking as examples the words the **rules** had settled for themselves. It was a compromise from before language models existed, when there was no way to get a label for a word the rules could not settle, and it does not work — for a structural reason rather than a matter of scale. At run time the model is consulted **precisely for the words the rules left open**, so a word the rules can settle is by construction not a word the model will ever be asked about. Trained on one population and asked about another, it scored _below_ the most-frequent-tag prior it was meant to replace, and both more data and more epochs made it worse.

Training now happens on labelled data, in two steps:

```
npm run annotate-corpus        -- --corpus=../data/corpus/paraphrases.jsonl --out=../data/corpus/silver.jsonl
npm run train-from-annotations -- data/corpus/silver.jsonl --hold-out=400
```

`annotate-corpus` tags the corpus with the rules and asks a language model to settle only the positions they left open, against the guidelines in _docs/parts-of-speech.md_. `train-from-annotations` then learns from exactly those positions. The model's whole job is to learn how the annotator resolves an ambiguous word from its context, and then to do it without them.

`--hold-out=N` keeps the last N sentences back, scores the model on them after **every** epoch, and keeps the best one. That is not a nicety: training accuracy on this task climbs past 98% while held-out accuracy has already turned over, so running a fixed number of epochs and taking the end state reliably ships an overfitted model. The report prints the most-frequent-tag floor over the same held-out words, so a model that has learned nothing is obvious.

Two things to keep in mind about a silver set:

- It can never contain a tag the rules vetoed, because `annotate-corpus` drops illegal answers. It therefore **cannot expose a rule bug**, and its ceiling looks higher than it is — on the human-annotated set, 26% of the labels for ambiguous positions are unreachable by any weighting.
- The model inherits the annotating model's biases along with its judgement.

### Measuring the model

- `npm run test-tagger` scores the tagger against the small hand-annotated set at _data/tagger-data/annotated-dataset.json_, counting only the words that actually needed disambiguating, and prints the most-frequent-tag floor next to it. `--dataset=path` scores any other annotated set instead, in either the JSON-array or the one-object-per-line shape. **Use it.** The hand-annotated set is product reviews and tweets while the library's target input is model-written prose, and a model trained on one and scored on the other is measuring domain transfer rather than tagging.
- `npm run evaluate-features` measures how much the model's features are worth, by cross-validation on the same set, against that same floor. If the gap is not clearly positive, the features are not earning their keep and the deterministic fallback is the better tagger.

### Measuring the rules

The tagger is a set of rules in six ordered lists, one per tag it might assign. Each list is asked "can this word be this tag, here?" and answers with the first rule that matches; a rule with no features vetoes the tag. Nothing coordinates the six lists, so the ways they can disagree are not visible in any one of them, and reading the rules against each other does not find those disagreements: the ones that matter are not the ones that look dangerous.

`npm run audit-rules` runs them all over the annotated set and reports what they did to each other:

- **Where the answer came from**, which splits every wrong tag into one of three kinds: the rules allowed the right tag and the tie-break took another one (a better model fixes it), the rules ruled the right tag out (only a rule change fixes it), or the dictionary never offered it (only a dictionary change fixes it). This is the number to watch across changes; the percentage `test-tagger` prints has a denominator that moves whenever a rule stops vetoing something, so it is not comparable run to run.
- **Contradictions**, the positions where every candidate tag was vetoed and the tagger had to force one. Each is two rules that cannot both be right, with the sentence that proves it.
- **Rules that veto the right answer**, ranked. This is the worklist.
- **Rules that never decided anything**, and rules an earlier rule already covers.

`npm start explain "<sentence>"` asks the same question of one sentence.

For a longer discussion about model evaluation, please refer to [the official Artisan paper](docs/paper.md).

## Adjudicating tags with a language model

The tagger has always been two halves: rules that rule tags out, and something that picks among whatever survives. That picker is an averaged perceptron. It can also be a language model, and `npm run compare-taggers` puts one in the same seat on the same positions so the two are measured against each other rather than merely described.

A model is never asked to tag a sentence. It is asked only the questions the rules could not answer, and it must answer them from the candidates the rules left standing — so it cannot return a tag the grammar has already rejected, and an answer outside that set is reported as a rule violation rather than scored as a wrong guess.

### The corpus

```
npm run fetch-paraphrases -- --sentences=20000 --seed=1
```

Samples [redis/llm-paraphrases](https://huggingface.co/datasets/redis/llm-paraphrases), 7.07M model-written sentence pairs, into _data/corpus/paraphrases.jsonl_ in the same one-JSON-object-per-line format `build-model` reads. The tagger's original corpus is scraped prose; this library is going to spend its life reading model output, which is a different language, and this is the closest available sample of it. Sampling is spread over random pages and capped at a few sentences per page — consecutive rows are rewordings of one another, so an uncapped read returns a hundred versions of the same question. `--per-page` raises that cap, which is worth doing for a corpus in the millions where the request count starts to dominate.

**A large pull is resumable.** Sentences are appended as they arrive and the pages already visited are checkpointed to _paraphrases-progress.json_ beside the output; Ctrl-C and re-running the same command carries on rather than starting over. Because the page order is a function of the seed alone, an interrupted run visits exactly the pages an uninterrupted one would, and the resulting file is identical either way. `--restart` begins a fresh sample; changing `--seed` or `--per-page` mid-sample is refused rather than silently mixing two samples into one file.

### Annotating a corpus

```
npm run annotate-corpus -- --model=qwen3.8:27b --limit=5000
```

The production form of what `compare-taggers` measures: the rules tag each sentence, the model settles only what they left open, and the result is written to _data/corpus/annotated-llm.jsonl_ in the shape of _annotated-dataset.json_ so that every tool already pointed at that file works on this one. Each record also carries `decided`, the positions the model answered rather than the rules, and `model`, which is what lets a later pass tell one annotator's work from another's.

This is the step measured in hours, so it is built to be stopped. Every sentence is appended as it finishes and the position is checkpointed to _annotated-llm-progress.json_; re-running picks up at the next unannotated sentence, and `--limit` caps a single session rather than the whole job. A sentence that fails is counted and skipped so one bad input cannot end a long run. Ctrl-C finishes the sentence in flight and exits cleanly.

What comes out is a **silver standard, not a gold one**: it is one model's reading, and on the hand-annotated set that reading agrees with a human about nine times in ten.

### Comparing models

```
npm run compare-taggers -- --models=qwen3.8:27b,glm-5.2:cloud --source=annotated --limit=449
```

Ollama serves local and hosted models through one endpoint, so a name like `qwen3.8:27b` runs on this machine and `glm-5.2:cloud` runs on Ollama's servers, and both are scored the same way. Two sources answer two different questions:

- `--source=annotated` runs the 449 hand-tagged sentences. Every answer has a gold tag, so this reports real accuracy next to the most-frequent-tag floor, and it is the number to choose a model on.
- `--source=paraphrases` runs the LLM corpus, which has no gold tags. It reports how far the models agree and prints the positions they split on. That says where the hard cases are, not who is right.

Useful flags: `--dry-run` prints the prompt and how many positions the rules are handing over without calling anything; `--repeat=3` re-runs a model at a fixed seed, so a model that disagrees with itself shows up as disagreeing with itself; `--explain` asks for a one-line reason per decision; `--json=path` writes every answer out for inspection. Replies are cached on disk against the model, seed, instructions and sentence, so iterating on the prompt only re-runs what actually changed — `--no-cache` bypasses it.

The scoreboard reports three things per model, and the last two matter as much as the first: **correct** against the gold tags, **illegal** for tags outside the candidates offered, and **missing** for positions the model simply did not answer. A model that skips a third of the questions can post a respectable accuracy on the rest.

The **illegal** column turned out to do more than police the format. Most of the tags a good model returns from outside the candidate set are the _gold_ tag — the rules had vetoed the right answer and the model reached past the veto to it. Those entries are a rule worklist with an outside witness, which is strictly better evidence than `audit-rules` can produce on its own: the audit can say a rule vetoed the gold tag, but not what an independent reader thought instead.

### Reviewing the annotations

`npm run review-annotations` audits the hand-annotated set against the specification it was written to. This is the one file where a mistake does not look like a mistake — it looks like the tagger being wrong — so it needs its own check.

It finds disagreements from three sources, in descending order of certainty:

- **spec**: the specification decides outright, no judgement involved. A numeral tagged anything but NOUN, or a tag outside the eight. Proposed without asking a model.
- **ambiguous**: the rules left the position open and a model, reading the same specification, chose differently from the annotation.
- **settled**: the rules pinned the position down on their own and still disagree with the annotation.

Nothing is edited in place. The run writes proposals to _data/tagger-data/annotation-review.json_, each with the guideline that justifies it, and `--apply` is a separate pass over a file a human has read. Applying checks that the word and current tag at each offset still match before writing, so a stale proposal file fails loudly instead of shifting tags onto the wrong tokens.

**The `settled` bucket needs a person, not a rubber stamp.** On those positions the tagger has already committed to an answer, so "correct" the annotation toward it and the gold set stops being able to catch that error — you have quietly trained the exam on the candidate. The adjudication prompt defends against this as far as a prompt can, by never revealing which reading came from the annotation and which from the tagger, and by demanding the guideline rather than the verdict. It cannot defend against it completely: the rest of the sentence is shown with the rules' own tags, which tilts toward the rules' reading. Treat `spec` as mechanical, `ambiguous` as sound evidence, and `settled` as a list of questions to answer by hand.

## Tests

`npm test` runs the suite, which is deliberately split by the strength of the guarantee it offers.

- **Structural invariants** (_test/parse/invariants.test.ts_) must hold for every input and for every model. Each parse is a single tree, no token is its own ancestor, every tag is one the word can actually take, and the tokens never overlap. These are checked against the whole annotated corpus and against several arbitrary synthetic models, so they are statements about _any_ set of weights, not the current ones. A model may make the parse worse; it must never make it malformed.
- **Rule guarantees** (_test/parse/index.test.ts_) are the parses the language rules produce on their own. **No model is loaded**, so retraining the tagger cannot turn the suite red, and a passing suite means the rules alone did the work.
- **Known gaps** are the sentences the rules do not get right yet. They run on every build and report exactly what they got wrong, but they do not fail it: each one is a language rule waiting to be written. When one starts passing, the run says so and it can be promoted out of `KNOWN_GAPS`.
- **Accuracy** is asserted as a floor over the words the tagger actually had to choose for, never over every token. Scoring punctuation and single-tag words inflates the figure until it stops responding to real changes: the same tagger scores 96.9% counting all tokens and 69.1% counting only the ambiguous ones.

Note that assertions must always be given an explicit message. Without one, a failing `assert.ok` makes Node re-read and re-parse the test file through the TypeScript source map to reconstruct the expression, which on a file the size of _test/parse/index.test.ts_ never finishes.

### Data sources

Both word lists below are used for the vocabulary and the parts of speech they contribute; the synonym and opposite pairings themselves are not stored in the dictionary, because nothing in the pipeline reads them.

For Wordnet's license, see Princeton's page: https://wordnet.princeton.edu/license-and-commercial-use

- **synonyms**: Wordnet 3.0's synonyms, downloaded from https://github.com/zaibacu/thesaurus.
- **antonyms**: We compiled our list of opposites from multiple online sources.
- **emojis**: The list of emojis and their names is taken from https://github.com/amio/emoji.json.
