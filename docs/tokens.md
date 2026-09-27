# Tokens

The first step in the NLP pipeline is converting text into discrete units, or tokens. Further steps in the pipeline may add or modify token properties.

Most properties added during tokenization are lexical (i.e. they depend only on the word), whereas further steps down the pipeline add properties that rely heavily on contextual information, such as PoS tags and syntactic dependencies.

Next we will cover each property and the module that assigns or modifies it.

## form

Type: String
Module: tokenize

The word as it appears in the text.

## id

Type: Number
Module: tokenize

The position (0-indexed) of the word in the sentence.

## lemma

Type: String
Module: tokenize

The word's lemma, lowercased. For unknown words there is a special submodule, _lemmatize_, which tries to guess the word's actual lemma and guess its lexical properties using the word's morphological features (suffixes in particular) and the dictionary.

## xpos

Type: String
Module: parse
Possible values:

- VERB
- NOUN
- ADJ
- ADV
- MARK
- PUNCT
- INTJ
- X

One of the possible part-of-speech tags. See our [article about parts of speech](./parts-of-speech.md) for more details.

## head

Type: Number
Module: parse

The position (0-indexed) of the token's syntactic head within the sentence. By convention, the sentence's root is assigned -1 as its head.

## isDisambiguated

Type: Boolean
Module: parse

Whether the word's xpos had to be disambiguated because it had multiple valid PoS tags. See [the official Artisan paper](paper.md) for reference on how the parse module works to understand this property.

## feats

Type: Object
Module: tokenize

Properties:

- AdpType
- Case
- ConjType
- Mood
- NumType
- Number
- Person
- Poss
- PronType
- PunctType
- Reflex
- Tense
- VerbForm

An object containing the subset of [Universal Dependencies' features](https://universaldependencies.org/u/feat/index.html) which are relevant for English. Some of this properties are subsets of similar [Interset](https://wiki.ufal.ms.mff.cuni.cz/user:zeman:interset) properties, which Universal Dependencies also uses.

### feats.AdpType

Type: String
Possible values: Prep|Post

The _adposition type_ is used to identify whether a Marker is a preposition (Prep) or a postposition (Post). In English there are only two postpositions: _ago_ and the genitive _'s_, which is very common and requires its own specific set of rules during parsing.

### feats.Case

Type: String
Possible values: Nom|Acc

The [grammatical case](https://en.wikipedia.org/wiki/Grammatical_case) of the word. For English we provide the Nominative (Nom) and Accusative (Acc) cases because they are the only morphological case in English. All other cases are encoded analytically in the language, i.e. through constructions that include prepositions. Example: "we" (Case=Nom) vs. "us" (Case=Acc).

### feats.ConjType

Type: String
Possible values: Sub|Comp|Coor

The type of conjunction that a marker can be. Examples:

- **Subordinating Conjunction** (ConjType=Sub): "but", "after"
- **Comparing Conjunction** (ConjType=Comp): "as", "like"
- **Coordinating Conjunction** (ConjType=Coor): "and", "or"

### feats.Degree

Type: String
Possible values: Cmp|Sup

The [degree](https://universaldependencies.org/u/feat/Degree.html) of a comparative or superlative form. The dictionary sets it on the inflected forms of graded adjectives. Examples:

- **Comparative** (Degree=Cmp): "easier", "harder"
- **Superlative** (Degree=Sup): "easiest", "hardest"

### feats.Mood

Type: String
Possible values: Pot|Nec|Cnd

The [verb mood](https://wiki.ufal.ms.mff.cuni.cz/user:zeman:interset:features#mood). This feature is only present for modal verbs. Examples:

- **Potential Modal** (Mood=Pot): "could", "might"
- **Necessitative Modal** (Mood=Nec): "must", "ought", "will"
- **Conditional Modal** (Mood=Cnd): "would"

### feats.NumType

Type: String
Possible values: Card|Ord

The [number type](https://wiki.ufal.ms.mff.cuni.cz/user:zeman:interset:features#numtype), either Cardinal (represents quantity) or Ordinal (represents order). Other types of numbers like ranges and proportions are not lexical but semantical and depend on the structure of the sentence. Numbers are always tagged as NOUN. Examples:

- **Cardinal** (NumType=Card): "thirty-two"
- **Ordinal** (NumType=Ord): "eighth"

### feats.Number

Type: String
Possible values: Sing|Plur

The [grammatical number](https://en.wikipedia.org/wiki/Grammatical_number) of a noun. It distinguishes between singular ("potato") and plural ("potatoes") which is necessary to guarantee verb-subject agreement.

### feats.Person

Type: Number
Possible values: 1|2|3

The [grammatical person](https://en.wikipedia.org/wiki/Grammatical_person) of the verb, which distinguishes the speaker (1st person) from the addressee (2nd person) from a third party (3rd person).

### feats.Poss

Type: Boolean

Whether the pronoun/determiner is [possessive](https://en.wikipedia.org/wiki/Possessive). There are 12 possessives:

- mine
- my
- yours
- your
- his
- hers
- her
- its
- ours
- our
- theirs
- their

### feats.PronType

Type: String
Possible values: Art|Dem|Prs|Tot|Neg|Rel|Ind

The [pronoun type](https://wiki.ufal.ms.mff.cuni.cz/user:zeman:interset:features#prontype) used for both determiners (tagged as ADJ) and pronouns (tagged as NOUN). Note that many determiners can also be pronouns (that, some, his, another). Examples:

- **Article** (PronType=Art): "a", "the"
- **Demonstrative** (PronType=Dem): "this", "here"
- **Personal** (PronType=Prs): "mine" (noun), "my" (adjective)
- **Total** (PronType=Tot): "all", "either"
- **Negative** (PronType=Neg): "neither", "no"
- **Relative** (PronType=Rel): "that", "what"
- **Indefinite** (PronType=Ind): "anybody", "many"

Note that the word "that" could be used as a Demonstrative as in "Look at that car". However, its pronType is invariably set to Rel.\*

### feats.PunctType

Type: String
Possible values: Peri|Qest|Excl|Quot|Brck|Comm|Colo|Semi|Dash

The [punctuation type](https://wiki.ufal.ms.mff.cuni.cz/user:zeman:interset:features#punctype) used for punctuation characters, which are always tagged as PUNCT. Examples:

- **Periods** (PunctType=Peri): ".", "…"
- **Question Marks** (PunctType=Qest): "?", "❓"
- **Exclamation Marks** (PunctType=Excl): "!", "‼"
- **Quotation Marks** (PunctType=Quot): "'", "“"
- **Brackets** (PunctType=Brck): "(", "]"
- **Commas** (PunctType=Comm): ",", "❟"
- **Colons** (PunctType=Colo): ":", "︓"
- **Semicolons** (PunctType=Semi): ";", "⁏"
- **Dashes** (PunctType=Semi): "-", "₋"

### feats.Reflex

Type: Boolean

Whether the pronoun is [reflexive](https://en.wikipedia.org/wiki/Reflexive_pronoun) or not. There are 8 English reflexive pronouns, all of them tagged as NOUN, pronType=Prs:

- myself
- yourself
- himself
- herself
- itself
- ourselves
- yourselves
- themselves

### feats.Tense

Type: String
Possible values: Pres|Past

The [verb tense](https://wiki.ufal.ms.mff.cuni.cz/user:zeman:interset:features#tense). Note that gerunds are classified as present. Examples:

- **Present** (Tense=Pres): "says", "saying"
- **Past** (Tense=Past): "played", "shaken"

### feats.VerbForm

Type: String
Possible values: Fin|Part

- Fin (Finite)
- Part (Participle)

The [verb form](https://wiki.ufal.ms.mff.cuni.cz/user:zeman:interset:features#verbform). In English, the imperative (i.e. "Take that") overlaps with the infinitive ("To take") and sometimes with the finite present ("They take out their trash").

The past form of a regular past is used as either participle or finite depending on the context. But all these are treated as finite verbs. Only irregular past participles (taken, been) and all gerunds (taking, playing) have verbForm=Part.

Examples:

- **Finite Verbs** (VerbForm=Fin): "be", "play", "plays", "played"
- **Participles** (VerbForm=Part): "shaken", "buying"

## misc

Type: Object
Module: tokenize (other modules modify properties of this object)

Miscellaneous properties such as the word's position within the original text (_at_ property) or the word's possible PoS tags.

### misc.at

Type: Number
Module: tokenize

The offset where the word begins within the original string.

### misc.fused

Type: Object[]

Certain words, specially slang, are actually multiple words fused into a single token. Sometimes the component words are clearly present in their original forms (cant, couldnt), sometimes they have been modified (wanna, sorta), sometimes they are acronyms without punctuation (rn, aka) and sometimes the word has completely dropped some of its components (ima="I am going to").

The correct treatment of these words, very common in informal user-generated texts, is to split them into different tokens and assign them the lexical information of their component words. This is the only way to parse correctly a sentence like "ima finish watching dat show rn".

### misc.prepPairs

Type: Object

This property is mainly used as an internal feature in the `tag` submodule, and the external consumer should not care about it.

Many words in English can act as either nouns or verbs and disambiguating them is a difficult task. One of the indicators that helps the PoS tagger disambiguate is the presence of a specific preposition. As an example, consider "ship": if it is followed by "out", it is very likely to be a verb, whereas if it is followed by "of" or "in" it is more likely (although not necessarily) acting as a noun.

### misc.pos

Type: Object

Map of PoS tag => Number, where the Number represents the relative frequency observed in the training dataset of that word having that particular PoS tag. For handpicked words this Number is often set to 1 for all the tags since the real frequency is unknown.

The map's keys are the more relevant piece of information, whereas the attached frequencies are merely used as a feature during PoS tag disambiguation in the parser. See [the official Artisan paper](paper.md) for more details on how tagging/parsing works.

### misc.f

Type: Number
Range: 0 to 1

The frequency of the word relative to the dataset on which the language model is trained.

### misc.isUnit

Type: Boolean|undefined
Module: tokenize

Present on units of measurement such as "km" or "yards". A number followed by a unit is read as one quantity rather than as a determiner and a noun.

### misc.isOpaque

Type: Boolean|undefined
Module: tokenize

Present on tokens whose internal shape carries no grammar: e-mail addresses, URLs, postcodes and telephone numbers. Rules that read a word as ordinary text skip them: a capitalized URL is not a proper noun, and an e-mail address is not an adjective.

### misc.parentDirection

Type: "L"|"R"|undefined
Module: tag

The side of the word where some tagging rules expect its head. Only "L" is read inside the pipeline.

### misc.children

Type: Number[]
Module: parse

The indices of the token's syntactic dependents.
