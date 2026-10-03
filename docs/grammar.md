# Grammar

How tagging and parsing work: the machinery that applies the tagset, the questions the rules ask, the structures the transitions build, and the collisions between them.

`docs/parts-of-speech.md` is the other half of this and stays separate on purpose. It defines the tagset — what the eight tags mean and which word takes which — and it changes only when the tags themselves change. This file describes the implementation: how the rules in `src/tag` narrow a word's candidates, how the transitions in `src/parse` attach a word to its head, and which construction gets which shape. Read this file before adding a rule to either module; the [collisions section](#known-collisions-and-traps) is the list of ways a new rule has already gone wrong.

## The pipeline in one page

```
tokenize → sentencize → parse(tokens, {weights})        src/parse/index.ts (default export)
```

`parse` runs tagging and parsing in a single left-to-right pass over the sentence, then finishes the tree in four passes:

1. **Candidates.** Each token arrives with `misc.pos`, the tag weights its dictionary entry allows. `settleUnambiguousTags` walks the tokens once, left to right; at each one it runs five **adjusters** (see below) and then assigns `xpos` outright if exactly one candidate remains. Because it is one pass, an adjuster sees earlier tokens already adjusted and tagged but later tokens raw — and three of the five read neighbours. A token settled here never sees a rule.
2. **The main loop** (`tagAndParseAt`, once per token): push the token onto the stack (a token already settled INTJ is not pushed; one tagged INTJ later, mid-chain, is), and if an **ambiguous chain** starts here — a maximal run of consecutive multi-candidate tokens — tag the whole chain at once (see "How a word gets its tag"). Then run the **oracle** repeatedly until it returns no transition (see "How a word gets its head").
3. **Root selection** (`findBestRoot`): the first stack entry still headless whose tag is VERB, else NOUN, else ADJ, else ADV. Verb candidates go through `chooseVerbRoot`, which arbitrates between comma-joined clauses.
4. **Fallback attachment**: every stack entry still headless gets a head from `findClosestHead` (per-tag search, below); anything left after that hangs off the root. Finally `children` arrays are filled in and `numberVerbsByTheirSuffix` stamps `Number=Sing` on third-person -s verbs (a lemmatizer artifact fix; see architecture.md 2026-08-30).

The five adjusters (`adjustPosTags` in `src/parse/index.ts`) rewrite `misc.pos` before anything is tagged:

| adjuster                  | fires on                                | effect                                                                                    |
| ------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `properNouns`             | capitalized word with no NOUN reading   | adds `NOUN: 0.1` if a neighbour is capitalized, unless the whole sentence is mostly caps or the word is sentence-initial with a frequency entry |
| `antemeridiemAbbreviation`| the form "am"                           | `{VERB: 1}`, or `{VERB: 0.1, NOUN: 0.9}` after a clock hour                               |
| `unitAbbreviations`       | unit word with PUNCT/MARK readings      | drops NOUN (kept for "in" after a numeral)                                                 |
| `forcedNouns`             | word with MARK/ADV/ADJ/INTJ readings    | `{NOUN: 1}` when it follows a determiner and the next word closes the phrase; adds `NOUN: 0.01` to unknown capitalized words and to any word before a possessive 's |
| `genitiveWithoutS`        | bare apostrophe                         | after an s-final noun, and only when no earlier quote pairs with it, becomes the possessive marker (`{MARK: 1}`, lemma `be`, `AdpType=Post`) |

## How a word gets its tag

The tagger (`src/tag/index.ts`, called as `tagChain` from the parser) resolves one ambiguous chain at a time, as soon as the chain's first member is reached and its right boundary is settled (the token after the chain has one candidate, or the sentence ends).

**Rules.** Six ordered lists, one per candidate tag, 74 rules total. For each candidate tag of each chain token, the list for that tag is scanned and **the first rule whose `when` matches decides**: `features: null` is a **veto** (the word cannot act as this tag here), anything else is an **allow**. A list that matches no rule falls through to `end-of-rules`, which allows. Nothing coordinates the six lists — each can only veto or allow its own tag — which is the root cause of most inconsistency here.

**What a rule can see** (`RuleArgs`): the token, the previous 4 tokens with the tags of the current hypothesis baked in (`taggedWindow`, with `foreToken`/`foreToken2` as the last two), the raw next token (`aftToken`, `xpos: "END"` past the sentence), the parser's `stack` and `heads` as they stand, and `steps` — the verdicts already reached **for this same token** by lists earlier in `tagOrder`. `steps.some(({xpos}) => xpos === "VERB")` means "the VERB list already accepted this word", and several rules condition on it. A rule looking rightward is looking at *untagged* words: it must ask what a word *can still be* (`canStillBe`), never what it has been tagged, because "undecided" is not "decided against".

**Order matters twice.** Within a list, first match wins, so a broad early rule shadows a narrow late one. Across lists, candidates are judged in `tagOrder` — `VERB NOUN MARK ADJ ADV PUNCT INTJ` (`src/grammar/index.ts`) — so `steps`-reading rules see verbs settled before nouns, nouns before markers, and so on.

**Search.** The chain is explored as a beam of subpaths (`greedyPath`): each token contributes its allowed tags, and every 3 tokens (`pruningLength`) the beam is pruned. Where more than one tag survived at a position, the averaged perceptron picks one (`filterSubpaths` → `predict`); candidates are sorted by the word's tag frequency, and a score tie keeps the first, so **no model degrades to the most-frequent-tag baseline**, deterministically. Exactly these positions get `token.isDisambiguated = true` and a `"chose"` audit event carrying the surviving candidates — the seam every training and comparison script reads. `misc.pos` is *not* that set; it is every tag the word could ever take.

**Contradiction.** If every candidate of a token is vetoed, that subpath dies. If *all* subpaths die at a position, that **position** is retried in **flexible mode** (the pruned prefix stands): rules run again, and if still nothing is accepted, the **last candidate in `tagOrder` is forced** (`forced-no-legal-tag`). Two consequences worth memorizing: a forced answer is an artifact of tag order, so **adding a legal tag to a word changes what it is forced to**; and the audit counts every forced position as a contradiction with a location.

PUNCT candidates inside a chain are always vetoed (`punct-never-in-a-chain`); a `parentDirection` carried by an allowing rule is stamped on the token, but see the [traps](#known-collisions-and-traps) — only `"L"` is ever read.

### The NOUN list (29 rules)

"Can this word act as NOUN here?" Veto rules mostly mean "this word is really a verb / determiner / marker".

| # | id | verdict | question |
|---|----|---------|----------|
| – | `n-is-only-finite-verb` | veto | the sentence opens with one noun phrase and no other word can be a finite verb — this word is the clause's verb ("Only the total *matters*.") |
| – | `n-is-main-verb-after-relative` | veto | the word follows the verb of an unmarked relative clause and agrees with that clause's antecedent — it is the main verb ("the year you start *matters*") |
| 1 | `n-is-verb-conj` | veto | a coordinator on the stack heads a verb, the word before it is no noun, and no verb follows — this word is the second verb conjunct |
| 2 | `n-is-last-possible-v-after-mark` | veto | right after a clause-only (degree-2) marker with no other verb candidate before the boundary — it must be that clause's verb |
| 3 | `n-is-adv` | veto | now/yesterday/tomorrow directly before a noun modifies it |
| 4 | `n-is-gerund-or-past-v` | veto | a gerund in verbal context, or a finite past whose context is verbal (sentence-initial, after a NOUN/VERB stack head, before a relative, …) |
| 5 | `n-is-verb-with-object` | veto | no verb to its left, not a marker's object, and a determiner/pronoun follows — a transitive verb and its object |
| 6 | `n-is-forced-relative-root` | veto | a relativized subject noun sits in the stack and nothing nominal follows — this word is the relative clause's verb |
| 7 | `n-is-invalid-gerund` | veto | a gerund after a finite verb / taking an object / heading a reduced relative |
| 8 | `invalid-past-n` | veto | a past form after be/have or after a noun that agrees as its subject |
| 9 | `n-is-v-after-nominative` | veto | VERB already accepted and a nominative pronoun directly before — "I say" |
| 10 | `n-is-object-complement-v` | veto | bare form after \[object-complement verb + object\] on the stack — "she made John *blush*" |
| 11 | `n-mod-before-v` | veto | a modal or "do" directly before a bare present finite is the auxiliary, not a noun |
| 12 | `n-is-infinitive` | veto | VERB accepted, bare first-person present, followed by its own argument, not governed by a determiner/preposition |
| 13 | `n-right-headed-adv` | veto | pronoun-type word before an ADV with a noun two back |
| 14 | `invalid-n-after-pro` | veto | a common noun directly after a non-accusative pronoun — "she book" is no noun phrase |
| 15 | `n-is-negated-det` | veto | a quantifier between a negator and a noun determines the noun — "not *all* cases" |
| 16 | `n-is-det` | veto | a PronType word with an agreeing noun later that it determines — see the leading-quantifier trap |
| 17 | `n-is-adj` | veto | a verb's adjective object, an adjective between determiner and noun, or an adverb-modified predicate |
| 18 | `n-is-marker` | veto | MARK-capable (non-relative) whose left context is a verb/marker/punct with no adjective between |
| 19 | `n-invalid-pro-after-n` | veto | a pronoun right after a noun, when it can't head a relative and no verb follows |
| 20 | `n-is-comp-adj` | veto | the word before "than" — or "then", which it deliberately also matches — unless the word before *it* already carries `Degree`: "easier *said* than done" stays a verb |
| 21 | `n-compound` | allow, head R | next word is a NOUN-tagged plain noun (neither a pronoun; a cardinal only before another cardinal) — compound modifier |
| 22 | `n-invalid-compound` | veto | after a plain noun, this word is a past participle or a time word, or that noun is L-headed or past — no compound |
| 23 | `n-right-v-parent` | allow, head R | a verb follows — subject position |
| 24 | `n-right-mark-parent` | allow, head R | a postposition or phrase-final marker follows |
| 25 | `n-is-imperative-v` | veto | bare form at start/after punctuation with VERB accepted — imperative |
| 26 | `n-at-start` | allow, head R | sentence-initial |
| 27 | `n-left-parent` | allow, head L | before ADJ/MARK/PUNCT/END with a finite verb or a preposition heading its own phrase behind |
| 28 | `n-right-delimited` | allow, head L | before MARK/END/boundary, not after another noun |
| 29 | `n-rel-clause-mark-pronoun` | allow, head R | a marker-omitting pronoun after a noun — "the man ~~that~~ *someone* saw" |

### The VERB list (13 rules)

| # | id | verdict | question |
|---|----|---------|----------|
| – | `v-is-only-finite-verb` | allow | same predicate as `n-is-only-finite-verb`; it runs first so the vetoes below cannot leave the sentence verbless |
| 1 | `v-is-pos-mark` | veto | 's after a substantive noun when *either* side rejects a be-verb (an incompatible verb on the left, or a clause on the right that refuses one) — possessive |
| 2 | `v-is-invalid-after-mark-1` | veto | an object-less preposition earlier needs this word as its noun |
| 3 | `v-is-noun` | veto | gerund with no verbal support; disagrees with the stack subject; plural closing a PP or opening a clause; singular under a determiner |
| 4 | `v-is-gerund-adj` | veto | a gerund with a modifiable noun ahead — "a *crying* child" |
| 5 | `v-after-incompatible-marker` | veto | present finite directly after a pure preposition |
| 6 | `v-irregular-past-adj` | veto | past participle at start or after an adjective — "A *foretold* disaster" |
| 7 | `v-is-past-adj` | veto | ADJ-capable past form after a pure preposition / as a verb's adjective object / between a cardinal and a unit — not after be/have, and not an unmarked relative root |
| 8 | `v-after-right-adj` | veto | this word is the noun a determiner-led adjective chain is waiting for |
| 9 | `v-has-non-verb-object` | veto | the next word is already a present finite verb this one could not be auxiliary to — so this one is nominal |
| 10 | `v-non-verb-object` | veto | present finite directly after a verb that does not license a bare complement — unless that verb closes an unmarked relative clause (same predicate as `n-is-main-verb-after-relative`) |
| 11 | `v-is-comp-adj` | veto | same predicate as `n-is-comp-adj`: the word before "than" (or "then") is the comparison's adjective |
| 12 | `v-is-past-subj` | veto | noun-capable word before a finite past verb, with no other noun in the run to be its subject |
| 13 | `v-object` | allow, head L | a compatible complement: after "be", or a perfect/passive participle or bare infinitive of the verb behind (adverbs skipped) |

### The ADJ list (13 rules)

| # | id | verdict | question |
|---|----|---------|----------|
| 1 | `adj-is-adv` | veto | ADV-capable before an ADJ/ADV — it modifies, so it is the adverb |
| 2 | `inv-adj-after-n` | veto | before VERB/END behind a left-headed noun phrase — nothing left for it to modify |
| 3 | `adj-incompatible-Number` | veto | a determiner whose Number disagrees with the nominal ahead — "this cars" |
| 4 | `adj-is-compound-noun` | veto | compound-noun modifier / gerund before a boundary / number with unit — the NOUN reading wins |
| 5 | `adj-poss-particle-argument` | veto | noun-capable word before a possessive 's is the possessor |
| 6 | `adj-is-forced-verb` | veto | VERB-capable and verbal: gerund/past in verbal context, unmarked relative root, or compatible complement |
| 7 | `adj-is-verb-object` | allow, head L | a verb to the left takes this as its adjective object (`findLeftVerbHead`, which may cross one noun phrase only for `takesObjectComplement` verbs) |
| 8 | `adj-post-adj` | allow, head L | post-adjective of an indefinite pronoun ("someone *tall*") or adjective object after a verb |
| 9 | `adj-is-forced-pro` | veto | a PronType word before MARK/VERB/END/boundary with a NOUN reading is a pronoun — unless it is a coordinated determiner |
| 10 | `adj-headless` | veto | before VERB/MARK/END/PUNCT with nothing to modify — "The *diseased* cannot leave" reads NOUN |
| 11 | `adj-next-form-unmodifiable` | veto | the next word cannot be modified (pronoun next, phrase already determined, …) |
| 12 | `adj-after-adj` | allow | previous word is ADJ — adjective chain |
| 13 | `adj-det` | allow, head R | any PronType word — determiner of what follows |

### The ADV list (9 rules)

| # | id | verdict | question |
|---|----|---------|----------|
| 1 | `adv-is-subj` | veto | NOUN-capable at a clause start directly before a verb — subject |
| 2 | `adv-is-adj` | veto | ADJ accepted and a noun follows |
| 3 | `adv-is-verb-object` | veto | NOUN accepted, a verb below on the stack, next word can't be ADJ/ADV — direct object |
| 4 | `adv-after-right-adj` | veto | this word is the noun a determiner-led chain is waiting for (mirror of `v-after-right-adj`) |
| 5 | `adv-is-mark` | veto | MARK accepted and a noun/adjective/pronoun/boundary follows, or (degree-0 marker) next can't still be VERB/ADV |
| 6 | `adv-is-noun` | veto | NOUN accepted before a preposition/boundary/pronoun — "for *now*" is a marked noun, per the spec |
| 7 | `adv-post-adj` | veto | same predicate as `adj-post-adj`: "someone *tall*" must not come out ADV |
| 8 | `adv-is-right-delimited` | allow, head L | PUNCT/END next |
| 9 | `adv-left-delimited` | allow, head R | START/PUNCT before |

### The MARK list (8 rules)

| # | id | verdict | question |
|---|----|---------|----------|
| 1 | `mark-is-amount` | veto | a numeral before a unit is a number, not a marker |
| – | `mark-is-modal-complement` | veto | same predicate as `n-is-modal-complement`: a base form directly after a modal is its verb ("you can *save* $200") |
| 2 | `mark-is-be-verb` | veto | 's that must be "is": he/she/it before, or the clause after needs a verb |
| 3 | `mark-is-verb` | veto | "like" before a marker or after an adverb; any verb-capable word after do-support |
| 4 | `mark-is-noun` | veto | NOUN-capable after a determined noun, before a participle — it is the noun |
| 5 | `mark-relative-pro` | veto | a relative word with nothing to relate back to stands in for a noun — see the traps |
| 6 | `is-adverb-not-marker` | veto | ADV-capable before a past verb or an ADJ/ADV — "then" before a verb stays an adverb |
| 7 | `mark-post-after-v` | veto | a postposition directly after a verb marks nothing there |
| 8 | `mark-poss-particle-no-args` | veto | 's not after a substantive noun — "who's" is "who is" (must agree with `v-is-pos-mark`, see traps) |

### The INTJ list (2 rules)

| # | id | verdict | question |
|---|----|---------|----------|
| 1 | `isolated-intj` | allow | at the start / next to other interjections / among unknowns — independent of the sentence |
| 2 | `no-ambiguous-intjs` | veto | everything else: a word that can be an open class is only INTJ when isolated (the spec's rule) |

## How a word gets its head

The parser is a stack machine. After each token is pushed (and its chain tagged), the **oracle** (`oracle` in `src/parse/index.ts`) runs until it returns no transition. With fewer than two stack items it does nothing. Otherwise: a PUNCT on top runs `punctuationStep`; a *delimiter* directly below the top — `PunctType` Quot, Brck or **Comm**, so commas included, excluding only forms that are closing/final characters like `)` or `”` (a straight `"` counts either way) — attaches to the top (`leftArc(1)`); otherwise it dispatches on the tag of the top of the stack via a `Map` — `ADV → advStep`, `ADJ → determinerOrAdjectiveStep`, `VERB → verbStep`, `NOUN → nounStep`, everything else (MARK, X) → `markerStep`.

**Transitions.** All attachment goes through `addToParse`, which does three things: it lets suitable grandchildren migrate to the new head (noun-phrase members, chained adverbs, unmatched opening delimiters — `canInherit`); **when the child already has a head, it re-parents the *new head* onto the child's old head** — the mechanism behind head moves that otherwise look inexplicable; and it never creates a cycle:

- `leftArc(k)` — the top of the stack takes the item `k` below it as child; that item and the `k−1` items between it and the top leave the stack, and any of them still headless attach to the top too.
- `rightArc(k, {pop})` — the item `k` below takes the top as child; `pop` also removes the top from the stack.
- `assignHead(i)` — the top attaches to the *absolute* index `i`, which is how a head that has already been popped is reached ("bite off more | *than*…").
- `reduce` — pop without attaching.

Returning `null` means *wait*: leave the stack alone and read the next token.

### The steps, in dispatch order of their checks

**`advStep`** — an ADV on top:
1. ADV directly below → `leftArc(1)` ("quite commendably" chains) — *unless* that ADV is a negator inside a verb construction, which is left for the verb (see Negation).
2. Wait if the adverb belongs to what follows (next is ADV/plain ADJ, a delimited clause opens, or a negator precedes the marker it modifies).
3. `rightArc(1, pop)` onto a verb, modifier or object-less marker directly below.
4. At END/MARK/non-appositive PUNCT: `rightArc` onto the nearest verb in the stack, else the nearest NOUN/ADJ/ADV (`findLeftModifierHead`).

**`determinerOrAdjectiveStep`** — an ADJ on top:
1. A negated quantifier takes its negator: `leftArc(1)` ("not *all* cases").
2. A bare determiner waits for its noun — unless it is the second conjunct of a coordinated determiner ("each and *every*"), which falls through to:

**`adjectiveStep`**:
1. ADV below → `leftArc(1)`.
2. Headless after a coordinated modifier → `rightArc(1, pop)` onto the conjunction ("each *and* every").
3. Wait if it modifies what follows (noun next, untagged noun next, already headed).
4. Before a boundary with \[object-complement verb + object\] behind: `rightArc` onto the **verb** (`findObjectComplementVerbOffset`) — "make a long story *short*".
5. `rightArc(1)` as predicate of the noun/verb before or object of the marker before.
6. At a boundary: `rightArc` via `findLeftModifierHead`.

**`verbStep`** — a VERB on top:
1. ADV below → `leftArc(1)` (this is how adverbs *and* the negator between auxiliary and verb land on the verb, one at a time).
2. Wait if a delimited clause opens after it.
3. A preposition-headed noun below: `leftArc(2)` — the fronted PP hangs off the verb.
4. Relative clause root: gerund / unmarked relative (`isUnmarkedRelativeRoot`) / explicit relative pronoun child → `rightArc(1)` onto the noun before, popping at a clause boundary.
5. Wait on a possible unmarked *past* relative still forming.
6. Chains onto the verb before when `verbsAreCompatible` and no comma-separated clause with its own subject intervenes; or onto a conjunction/clause-taking marker before → `rightArc(1)`.
7. Fallback: find a subject leftward (`findSubjectOffset` → `leftArc`); collect a leftover marker/adverb/appositive-ADJ; back-assign an unmarked relative; `reduce` at sentence end if headed.

**`nounStep`** — a NOUN on top:
1. Closes an appositive (reflexive, "all" after a pronoun, appositive punctuation) → `rightArc(1, pop)`.
2. Takes a whole coordinated-determiner run → `leftArc(2)` ("each and every *way*").
3. `leftArc(1)`: collects the ADJ before, the ADV that closes the phrase (including a noun-modifying negator), its postposition, or the noun before as compound.
4. Waits if it modifies the noun after, counts a unit, or is already headed.
5. Attaches rightward: end of a comma list → `rightArc(1, pop)`; **object of the marker below** → `rightArc(1)`; **object of the verb below** → `rightArc(1)`; second object → `rightArc(2)`; object of a verb behind a marker → `rightArc(3)`. Popping is decided per case (`objectPops`, `markerObjectPops`).

**`markerStep`** — a MARK (or X) on top:
1. `leftArc(1)`: a postposition takes the noun before; a marker takes the adverb (or negator) before; a preposition closes a verb's object.
2. Headless (`headlessMarkerStep`):
   - a **comparative marker** (`ConjType=Comp`) after a degree word or an "as X" correlate attaches to it by absolute index — `assignHead(index-1)` (`isComparativeCorrelate`; a bare -er form deliberately does not license this).
   - after another marker in the same clause: `rightArc(1)`, or chain to that marker's own head.
   - otherwise the head is found by **translative degree** (`translativeDegree` in `src/grammar/index.ts`):

     | degree | features | takes | head search |
     |--------|----------|-------|-------------|
     | 2 | `ConjType=Sub`, no `AdpType` | clauses only | nearest VERB in the stack (relative words: VERB or NOUN) |
     | 1 | `AdpType`, no `ConjType` | nouns only | the item directly below, if VERB/NOUN/ADJ and not delimited off |
     | 0 | both or neither | either | coordinator → `getConjunct`; "to" and left-delimited cases → directly below; with a clause ahead or a punctuation child of its own → nearest VERB, else nearest nominal; default: directly below |

   - the `rightArc` branches pop when right-delimited (END, terminator, or another preposition follows); the `assignHead` branch never pops.
3. Already headed: `reduce` once its object has arrived, else wait.

**Coordination** (`getConjunct`, degree-0 with `ConjType=Coor`): candidates are the possible tags of the words after the conjunction up to the first punctuation or `ConjType`-carrying word (stopping at a settled VERB — a bare preposition does not stop the scan); candidate parents are the stack below, within 16 tokens. Four stages, first hit wins: (1) the word right after the conjunction agrees in Number with a NOUN parent (or an ADJ predicate of "be"), or modifies an ADJ parent — the parent directly below wins (this covers "each *and* every", "red *and* blue", and defers to an ADJ conjunct over a dictionary-less word's fallback NOUN); (2) a verb conjunct by tense match; (3) a noun conjunct under the nearest NOUN parent; (4) a modifier conjunct. Default: the item below.

### Root selection and the final passes

`findBestRoot` picks the first headless stack entry tagged VERB, else NOUN, ADJ, ADV. Among verbs, `chooseVerbRoot`:

- a candidate fronted by its own bare subordinator (`hasLeadingMarkerChild` — a leading MARK child with no noun of its own) is skipped — though when *every* candidate is marker-led, the first one is taken after all;
- the first eligible candidate is kept once it is **solid**: a personal-pronoun subject, or unambiguously finite (imperatives count);
- a later comma-joined candidate replaces a non-solid one only when it is not a link in an explicit coordinate list (`hasCoordinatingConjunctionChild` with its own subject), not marker-led, and either has a pronoun subject that is not a parenthetical tag clause ("…, I *am certain*", "…, they *said*" — `parentheticalPredicateLemmas`) or has a subject while the chosen has none. This is what tells "Fingers crossed tightly, *she waited*" from a genuine absolute phrase.

`findClosestHead` then finds heads for stack leftovers: ADJ/ADV → nearest MARK/VERB/NOUN to the left or MARK/NOUN to the right; NOUN → nearest of MARK/VERB/NOUN on either side (equidistant candidates go right); MARK → left only, constrained by what it already holds (a VERB child → only a VERB head; a NOUN child → VERB/NOUN; bare → VERB/NOUN/MARK); VERB → the nearest degree-2 marker to the left that has no verb yet, else the root. Whatever still has no head hangs off the root.

## Where the grammar lives

| file | holds |
|------|-------|
| `src/grammar/index.ts` | the questions both modules ask: `tagOrder`, `translativeDegree`, `isTerminator`/`isDelimiter`, `isGerund`, `takesObjectComplement` (the only valence list), `canStillBe`, `isNegator`/`negatesVerbGroup`/`findNegatedVerb`, `verbsAreCompatible`, `hasVerbLaterInClause`, `isFollowedByClause`, `isCapitalizedWord`, `hasAppositivePunctuation` |
| `src/grammar/divergent.ts` | the questions they deliberately answer differently: `canBeSubjectOfWhenTagging` (positive evidence of agreement) vs `cannotBeSubjectWhenParsing` (only named disagreements ruled out), and `isPhraseBoundaryType` (the tagger's terminator set, without colon/semicolon) |
| `src/tag/index.ts` | the 74 rules, the chain search, `ruleRegistry` for the audit |
| `src/tag/audit.ts` | the `judged`/`chose` events every measuring script reads |
| `src/parse/index.ts` | the oracle, the steps, the transitions, the adjusters, root selection, the final passes |
| `src/featurize/index.ts` | the perceptron's features and `FEATURE_SET_VERSION`, which gates loading stale weights |
| `scripts/handpicked-words.ts` | closed-class words; a handpicked `pos` set is final — removing a tag there is stronger than any rule |

Unifying a divergent pair moves tags and must be measured on its own. `isUnmarkedRelativeRoot` exists in both modules under one name with unrelated evidence and is still a real divergence, too entangled to lift.

## Settled constructions

### Modal agreement, controlled infinitives and postposed degree

Modals do not inflect for their subject's person or number. A substantive
singular noun can therefore be the subject of "will", just as a plural noun
can. A bare verb immediately after a modal is its complement, not a compound
noun. When that pair is tagged inside one ambiguous chain, the preceding
preposition in the parser's unchanged stack cannot override the newly chosen
verbal context.

The current object-control check is deliberately local: `need`, `want`,
`expect`, `ask`, `tell`, `urge`, `require` or `allow`, followed immediately by an
accusative pronoun and `to`, licenses a bare infinitive. "We need them to fool
tax collectors" takes VERB for "fool". "We sent them to tax collectors" keeps
the prepositional noun phrase. Longer object phrases and interrupted control
constructions remain for the existing rules and model to decide.

Postposed "enough" modifies a preceding plain adjective and is ADV:
"confident enough". This check excludes determiners. A preceding ADV is
insufficient evidence: in "nearly enough food", "nearly" modifies the quantity
determiner "enough". Adverb contexts and standalone nominal uses remain for
the existing rules and model to decide.

### The main verb after an unmarked relative clause

"The year you start *matters*." "The year the $200 begins *beats* its size." Two finite verbs stand side by side, and the second is the main verb. Its subject is the noun the relative clause hangs from. `isMainVerbAfterUnmarkedRelative` (tagger) asks four things, in order:

- the word before is a finite verb with no `Mood`;
- that verb's subject sits directly in front of it, and is a subject pronoun ("you") or a phrase a determiner opens ("the $200"); quotation marks are skipped;
- the word before that subject is a substantive noun, the antecedent;
- the antecedent is free to be a subject. Its phrase opens the sentence or follows a word that opens a clause ("that", "why", "because", "if", "and", "but" and a dozen like them). An object does not qualify ("If you press the button it makes *sounds*", "I told the boy he needs *books*"), nor does the object of a preposition ("In the office the manager sends *reports*", "Before dinner she takes *walks*"). A time noun qualifies only directly after an article: "the year you start" does, and "last year", "every morning", "the next day" and "today" are phrases set in front of the clause;
- this word agrees with the antecedent, and no later word in the same clause is mostly a verb, finite or past, and able to take that subject.

The last test is what keeps "The day you start *classes* is hard", "The day you place *orders* matters" and "The day you start *classes* seemed long" nouns: a later verb takes the subject. The search stops at a punctuation mark or a conjunction ("than", "if", "because", "so"), so "matters more than the amount you put in" does not look as far as "put". It walks past a plain preposition, so "the things you need *help* with are listed" finds "are".  A bare plural subject ("the things people say matter") is not covered: without a determiner or a pronoun the pair reads the same as a compound noun.

When the rule fires it vetoes NOUN and exempts the word from `v-non-verb-object`, so the answer does not depend on the model. On the parser side `isPronounRelativeBeforeTheMainVerb` hangs the relative verb on the antecedent when its subject is a pronoun, the verb is no modal, and the next word is already a finite verb. A modal is excluded because a bare infinitive carries `VerbForm=Fin`: "If you find a book it will help" otherwise read "it will" as a relative clause on "book". A determiner-led subject already took that path. A quoted subject does not: 'The year "the $200" begins beats' gets the right tags and the wrong heads.

A free relative is the same adjacency with the pronoun as subject: "What *matters* is the year." `v-has-non-verb-object` now stands down when a relative pronoun is in front and both this word and the next are third-person singular. A plural noun could not be the subject of the second verb, so the first is a verb. "which *bud* is right" stays a noun, because "bud" is not a third-person form.

### One finite verb to a sentence

When a sentence opens with one noun phrase and exactly one word in it can be a finite verb, that word is the verb: "Only the total *matters*.", "Both *matter*.", "Details *matter*." `isTheOnlyFiniteVerb` requires every word before to be a noun, an adjective or an adverb, the word directly before to be able to head a subject (a noun reading and no determiner use, or "both"/"all"), and no other word to carry a finite or modal reading. The subject head must be a noun more often than anything else, or sit under a determiner ("the *total*"); "Best *wishes*" and "Quick *wins*" fail that test. The word itself must be a verb more often than a noun by its dictionary weights. Without that, every two-word heading became a clause: "Performance *issues*", "Test *results*", "Customer *reviews*". "matters" (0.75 verb) and "beats" (0.85) pass; "issues" (0.22) and "results" (0.19) do not. A word with a past verb reading counts as a finite verb whatever the current hypothesis calls it: in "The 2008 crash left an indelible mark" the model reads "left" as an adverb, and without this test "mark" became the verb. A gerund subject ("Being consistent matters more") is left to the model; allowing one made verbs out of the nouns in tweet fragments ("Like making *calls*", "the 4.0 numbering *leap*"), five gold tokens for one.

### The verb that do-support needs

"Why does this *matter*?" "It doesn't *matter*." "Does saving $20 now *matter* if you can save $200 later?" `isTheVerbDoSupports` reads a bare infinitive as the verb when a form of "do" supports it, no verb stands between the two, and no other bare infinitive follows before the clause ends. "Do" counts as support only where it cannot be a main verb with an object: directly before a negator, at the start of the sentence, or after a question word. Counting every "do" cost five gold tokens ("does a WONDERFUL *job*", "did a factory *reset*", "do *email*"). `n-is-do-supported-verb` vetoes NOUN and `v-is-do-supported` allows VERB ahead of the vetoes.

The rule exists because "matter" is hand-weighted as a noun first (`NOUN 0.6`, `VERB 0.4`). The corpus weights said `VERB 0.75`, and with them the trained model tagged the noun as a verb in 13 of 65 corpus sentences ("dark *matter*", "volatile *matter* content"), against 3 before the false comparative was removed.

### Invariant verbs agree with any subject

"beat", "put", "cut", "hit", "set", "let", "read" and twenty others spell the past like the base form, so the dictionary gives them `Tense=Pres`, `VerbForm=Fin` and no `Person`. `canBeSubjectOfWhenTagging` read the missing `Person` as "agrees with nothing", and "The Lakers *beat* the Celtics" lost its verb to `v-after-right-adj`. The parser's `cannotBeSubjectWhenParsing` already read it as "cannot be ruled out". The tagger now does the same. The cost, under the rules alone: "A tax *cut* helps everyone" tags "cut" VERB and "helps" NOUN, because `v-is-noun` can no longer reject "cut" for disagreeing with "tax". The model still picks NOUN there.

### Negation

The negator is "not" and its contractions "n't", "'t", "nt" — all carry lemma `not`, so the lemma is the whole test (`isNegator`), and it is always an ADV. **The word directly in front of it** decides its head; the point is that the shape must not depend on anything incidental, such as whether an adverb is written in between.

- **After an auxiliary or a modal** (the verbs with a `Mood`, plus lemmas `be`, `do`, `have` — `negatesVerbGroup`): the negator belongs to the verb the construction is about, stepping over adverbs — "can't *corrupt*", "can't accidentally *corrupt*" (`findNegatedVerb`). When no verb follows, it takes the predicate the auxiliary introduces: "is not *happy*", "was not the *problem*", "am I not a *hooman*". Directly in front, not anywhere in the clause: a clause-wide search would swallow the inverted question and the "not *only*" correlative.
- **Anywhere else** it modifies what is directly at its right — an adjective, adverb, or marker ("play outside the house not *out* in the street"). A quantifier at its right takes it ("not *all* cases", where the quantifier is a determiner — rule `n-is-negated-det`); an article does not — "not a *driver*" negates the phrase, whose head is the noun; a quantifier with no noun behind is a pronoun and still takes it ("not *all* of them").

`advStep` refuses to collect such a negator, `verbStep` picks it up like any adverb, and the oracle's determiner branch and `nounStep` read the same shared predicates. `test/parse/invariants.test.ts` guarantees the verb-construction shape over the whole corpus under five arbitrary models.

### Comparatives and correlatives

Comparative and superlative forms carry `Degree=Cmp|Sup` (lexical only; the perceptron does not read it). A comparison has one graded element: `v-is-comp-adj`/`n-is-comp-adj` read the word before "than" as the comparison's adjective *unless* its predecessor is already graded — that keeps "said" a verb in "easier said than done". Both rules deliberately match "then" as well as "than" (the misspelling is common in the corpus), which overlaps the coordinating-"then" known gap. On the parser side a comparative marker (`ConjType=Comp` — "as", "than") is licensed by a degree word and attaches to it via `assignHead`, the one transition that can reach a popped head. Exactly two licensers count (`isComparativeCorrelate`): a degree quantifier by *form* ("more", "less", "fewer", "most", "least", "fewest" — the lemma of "less" is "little"), and the object of a preceding "as". A bare -er form is deliberately excluded: "she has more money than I do" and "he runs faster than I do" hang the clause elsewhere and neither is wrong today.

### Object complements

`takesObjectComplement` (21 verbs: make, let, see, consider, keep, …) is the only valence knowledge in the pipeline. Every leftward search stops at the first noun — what sits behind a verb's object belongs to the object — and for these verbs that assumption is wrong by definition. Three readers: `findLeftVerbHead` may cross one noun phrase for them; `adj-is-compound-noun` yields to `adj-is-verb-object` when it does ("make a long story *short*"); `n-is-object-complement-v` licenses the bare infinitive ("she made John *blush*"). The parser hangs the complement on the **verb** (`findObjectComplementVerbOffset`), which settled a three-way disagreement between spellings of the same structure. The determiner check in `isObjectComplementInfinitive` is what keeps "make a Skype call" a noun phrase; widening the verb list is a measured behaviour change.

### Relative words

Relative *pronouns* ("who", "whom", "whose", "which", "what") are NOUN by dictionary — MARK was removed from their entries, not fought with rules. "that" keeps MARK (real complementizer); relative *adverbs* ("where", "when", "why") stay MARK. `PronType=Rel` is carried by both groups, so it means "relative", not "relative pronoun" — predicates that test it match "when" as readily as "who"; what separates the groups is the `pos` set. Once a relative pronoun is NOUN it fills a slot in its own clause: the relative verb attaches to the antecedent and the pronoun hangs off the verb. Unmarked ("the report *filed* yesterday") and reduced relatives are recognized structurally (`isUnmarkedRelativeRoot`, `canBeUnmarkedPastRelative`), keyed on non-finite past forms and clause continuity.

### Possessive 's

's with lemma `be` and `AdpType=Post` is either the verb "is" or the possessive particle, and **two rules on opposite lists ask the same question from opposite sides**: is there a substantive noun in front? `mark-poss-particle-no-args` vetoes the marker reading when there is not — a possessive hangs off a substantive noun, never a pronoun (English spells those "whose", "his"), so "who's" is always "who is" — and `v-is-pos-mark` vetoes the verb reading only when there is, plus further evidence that a be-verb cannot fit. The veto contexts are disjoint, so the two can never both fire; the day their noun tests drift apart, 's is left with no legal tag at all. Before relative pronouns became nouns the two agreed by accident; now they agree on purpose.

## Known collisions and traps

Each entry is a place where a deterministic rule that fixes one case breaks another. Check this list before adding a rule; add to it when a change gets reverted.

**Tagger**

- **`forced-no-legal-tag` is order-dependent.** When every list vetoes, the last candidate in `tagOrder` is forced — so adding a legal tag to a word (a dictionary improvement!) can change what a contradiction resolves to. Adding ADV readings to comparatives fixed 4 audit positions and broke 3 exactly this way; the rules had already failed there, the fix only changed how.
- **`adj-is-compound-noun` is the worst veto on the audit** (~107 right : 25 wrong). Its top witness: "Or something *worse*", where the spec says an indefinite pronoun takes a right-adjective, but the rule reads "something worse" as a compound. Exempting pronouns fixes "worse" and breaks "none *more* than the B&N" (gold ADV) — net zero, reverted. Settle what the gold set means by a comparative after a pronoun first.
- **`adj-headless` vs `adj-is-forced-pro`** ("Each and every day counts", a known gap): both ask whether the adjective has anything to modify; `adj-is-forced-pro` learned the coordinated-determiner exemption, but `adj-headless` runs *earlier* sentence-initially and still reads "Each" as a pronoun. Adding the same exemption there cost two gold tokens ("this" in "with this or that type of leader") and did not fix the sentence (the model reads "counts" as a noun). Blocked on gold adjudication.
- **`mark-relative-pro` cannot be narrowed.** A relative after a comma is a pronoun in "Ana, who had two children" and a marker in "..., which plays them fine" — same shape, opposite gold. Narrowing costs seven right for seven wrong; it stays until the annotations decide.
- **A leading quantifier is a determiner only when the model says so.** "All cases share the same strain": `n-is-det` declines while the next word could still be a verb, and `all` is NOUN-first by frequency. `n-is-negated-det` settles only the negated half. Relaxing `nounIsDeterminer`'s look-ahead is the obvious move and a broad one: measure it alone.
- **Untagged is not decided-against.** A rule reading rightward sees untagged words; testing `xpos !== "VERB"` there vetoes on evidence it does not have ("Then fails" cost "then" its adverb reading). Use `canStillBe`. Swept once; every new right-looking rule reintroduces the risk.
- **The two 's rules must agree** (see Possessive 's above); a disagreement is a guaranteed contradiction.
- **`n-is-negated-det` is unmeasurable** — the gold set contains no such position, so it sits on the dead-rule list; the parse suite is its only witness. Six rules never fire on this dataset; leave them until a larger gold set exists.
- **`parentDirection: "R"` is inert.** Thirteen rules stamp the field (seven "R", six "L"), but only `"L"` is ever read — by `isInvalidCompoundNoun` (tagger) and `conjunctionTakesTheNoun` (parser). Removing the `R` stamps would be behaviour-neutral inside `src` but changes the token surface downstream consumers see and the audit's rule-identity check; treat as an API decision, not a cleanup.
- **The INTJ catch-all was silently flipped once.** `no-ambiguous-intjs` is a veto; a 2024 typing refactor (`e7552b3d`) turned its `null` into `{}` and every INTJ-capable word kept its INTJ reading mid-sentence for two years. Restored 2026-08-31: 20 tokens right that were wrong, 2 wrong that were right, +18 net (architecture.md has the two losses). A rule's `features` field *is* its behaviour; diff rule tables, not just predicates, in any refactor.

**Parser**

- **Test every phrase alone and embedded.** With no verb in the sentence, a rule that searches the stack for one falls through to a fallback that can land right by accident; wrapping a clause around the phrase makes the search succeed and moves the head. Four of the five fixed phrases looked correct alone and broke embedded.
- **A tag chosen under one reading, a head attached under another** is the shape most parser bugs take. `nounStep` once tested a *stack* neighbour where the grammar tests the *token* before a negator; `verbsAreCompatible` had two bodies that inspected different tokens. The cure is a shared predicate in `src/grammar` — and `divergent.ts` for pairs that genuinely disagree, so unification is a decision, not an accident.
- **`headTagOf` reads a head of 0 as "no head"** (`heads[index] || -2`): token 0 is a real index, so this is a latent bug — but the gold parses are fitted to it, and changing it moves heads. Measure it alone.
- **`adverbModifiesTheModifierBefore` tests a different token than its name says**: it reads the head of the token *before* the stack neighbour, and a headless token (`-2`) counts as left-headed. Fitted behaviour; another measure-alone candidate.
- **Sentinel tokens differ on purpose**: `tokenAfter` past the end yields `xpos: "END"`, `tokenTwoAfter` yields `xpos: undefined`, and `nounEndsACommaList` relies on the difference to mean "there is a word there at all".
- **The negator before a plain noun phrase is untested ground**: "he brought not water but wine" reaches "water" through the coordination, but nothing says it should; only auxiliaries and modals count as verb constructions.

**Measurement**

- **The denominator trap.** Removing a veto moves positions from "rules settled" into "model must choose"; adding dictionary readings moves words into the ambiguous population. Every percentage's denominator moves. Report absolute counts; the one fixed denominator is every token of the review gold set, and there is no script for it — write the ten-line loop over `loadAnnotatedDataset()` and throw it away.
- **A refactor needs a full tag-and-head snapshot**: the suite and both scripts score tags only; a moved head is invisible to all three. Diff `form/xpos/head` triples over the corpora (architecture.md 2026-08-30).
- **Known gaps live in `KNOWN_GAPS`** in `test/parse/index.test.ts` (currently 22): they run on every build, report, and do not fail — the backlog of rules still to write.

## How to extend either module

1. **Prefer fixing data to adding a rule.** Removing a tag from a handpicked entry makes a reading structurally impossible — stronger and simpler than any rule.
2. **Only principled rule changes**: a rule may change when it reasons from evidence it does not have, contradicts the spec or this file, mirrors another rule that can also fire, or is dead/shadowed. Never tune against the eval set.
3. **New shared questions go in `src/grammar/index.ts`**; if the tagger and parser must answer differently, write both answers in `divergent.ts` with the difference stated.
4. **Measure**: `npm run audit-rules` (absolute right count, veto balance, contradictions), `npm test` (474+ structural cases; rule guarantees run with no model), `npm start explain "..."` for one sentence, `npm run test-tagger`/`compare-taggers` for the model seam. Revert anything net negative and record the attempt here or in a comment-free note in architecture.md.
5. **Write the decision down in this file** — the construction's shape, the witnesses, and what was rejected. `docs/parts-of-speech.md` changes only when the tagset does.
