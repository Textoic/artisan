# Parts of Speech

The tagset used in this project is partly based on Tesniere's _Elements of Structural Syntax_, particularly Chapter 32. POS tags refer to the function of a word inside a sentence. The parts-of-speech are the following 8, split into closed-class, open-class and other:
Open class:

- NOUN
- VERB
- ADJ (Adjective)
- ADV (Adverb)

Closed class:

- MARK: Marker
- PUNCT: Punctuation

Other:

- INTJ: Interjection
- X: Unknown

Some closed class words are subsumed under the open-class tag that corresponds to their function. Determiners, for example, are tagged as ADJ. Pronouns, as NOUN. The following features for English retain the information about these closed-class words, taken from [Interset](https://wiki.ufal.ms.mff.cuni.cz/user:zeman:interset):

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

Other features may be useful for another language if the parser can use them somehow. For example Gender can help the parser in languages with strong gender agreement.

## Guidelines

The rules in this section are useful either to manually tag a dataset or to understand the reasoning behind a tagger's output. The goal of this section is to help settle doubts when reading or assigning tags.

## Nouns

Nouns refer to concrete (_boar_) or abstract (_consciousness_) things. In English, to test if a word can be tagged as a noun, it must fulfill the following conditions:

1. It cannot accept unmarked objects. Example: "men" in "Some men take chances" can be extended with a marked object like "Some men _of courage_ take chances" but not with a direct object, like "Some men _history_ take chances."
2. It either has at least one dictionary acceptation as a noun or is forced to be a noun by its context. A word is forced to be a noun when it is preceded by a determiner and is not acting as an adjective or adverb of a noun at its right. Examples: "diseased" in "The _diseased_ cannot leave during the quarantine", "mentoring" in "The _mentoring_ of young talent", "blue" in "The blue I like is darker", but not "blue" in "The blue shirt."

Notice that gerunds can be verbs even when they act as the subjects of other verbs, as in "Cooking takes skill." This is because the gerund can take arguments like a verb, as in "Cooking blowfish takes skill." But if the gerund is forced to be a noun, for example "My cooking is awful," then it must be tagged as NOUN.

### Relative pronouns

A relative pronoun is a pronoun, so it is tagged NOUN. This covers "who", "whom", "whose", "which" and "what": "the man _who_ came", "each of _which_ has been tested", "this is _what_ I needed". A relative pronoun does head its clause, but heading a clause is not what makes a word a marker — a subject heads its clause too. What makes a marker is marking an object, and a relative pronoun _is_ the object rather than marking one. Tagging it MARK also loses the fact that it fills a slot in its own clause, which is the very thing a parser needs from it.

Three neighbouring cases are not relative pronouns and are not affected:

- **"that"** is genuinely ambiguous. As a complementizer it marks a clause and is MARK ("I said _that_ he left"); as a relative pronoun it is NOUN ("the book _that_ I read"); as a determiner it is ADJ ("_that_ book").
- **Relative adverbs** — "where", "when", "why", and the "where-" compounds — stand in for an adverbial rather than for a noun, so they remain markers ("the place _where_ I live").
- **Interrogative determiners** are adjectives like any other determiner: "which" in "_which_ bud is R" and "what" in "_what_ devices you can install" modify the noun at their right, so they are ADJ.

Some PoS tag specifications consider numbers as a separate category. Because this specification is functional, that would be wrong. Numbers either modify ("Buy two oranges") or behave as nouns ("Buy two"), so their tag should be either ADJ or NOUN. However, we argue that the ADJ tag for numbers is not necessary for the following reasons:

1. Numbers only behave as adjectives when specifying quantity. But then, they are not that different from the compound noun case, where a noun is the modifier of another noun, as in "Woody Allen" or "wood chipper."
2. One can argue in favor of numbers conceptually acting as adjectives. But the resulting parse will not change, nor the meaning of the sentence. Tagging numbers always as NOUN means the tagger (whether human or machine) does not have to choose. Lacking a strong argument in favor of tagging numbers as ADJ when they modify nouns, the practical approach is superior.

Nevertheless, anyone who wants to implement this specification but disagrees on this point may choose to treat numbers as either ADJ or NOUN.

## Verbs and their inflections

All verbs come from a lemma which is inflected to create its different tenses and forms. These inflections share some of UD's grammatical features, which can be useful if they help the parser, but not all features apply to all languages.

Verbs and their inflections may not always be tagged as VERB. For example, in Spanish, the infinitive behaves as a noun, and the past participle sometimes behaves as an adjective. In English, there are four possible verb inflections for the different combinations of Tense and VerbForm:

1. Present finite: Tense=Pres, VerbForm=Fin.
   - VERB: "I say", "You are", "He plays"
2. Past finite: Tense=Past, VerbForm=Fin.
   - VERB: "I said", "You were", "He played", "She was"
   - ADJ: "A cooked meal", "Delayed trains annoy him"
3. Present participle (gerund): Tense=Pres, VerbForm=Part
   - VERB: "I am playing to win", "Skiing in Spain might be fun", "Cooking blowfish takes skill"
   - ADJ: "A crying child", "Frightening birds"
4. Past participle: Tense=Past, VerbForm=Part (Used for irregular past forms)
   - VERB: Must be preceded by another verb, "He has broken the jar"
   - ADJ: "He needs written confirmation", "A foretold disaster"

Modals, auxiliaries and copulas are all tagged as verbs because they behave as such. Having tags for those types of verbs only adds redundancy when dealing with tags.

## Adjectives and adverbs

Adverbs modify adjectives, verbs, markers or other adverbs. Adjectives either modify nouns or act as objects to verbs. Determiners are adjectives that have the property PronType set to [the type of pronoun they are](https://universaldependencies.org/u/feat/PronType.html). Adjectives, even in English, can modify nouns at their left. This is the case for some of the indefinite pronouns, which often appear with the adjective at their right, as in "She only wants someone tall". Here, "tall" is the right-adjective of "someone".

Many verbs can accept adjectives as objects, not just "copulative" verbs. For example "He was acting weird". For adjectives that can also be adverbs, this poses a problem of consistency. Our suggested solution is to tag them as ADV when they are the verb's object, and as ADJ only if they modify a noun at their right.

## Markers

Markers are words that usually _mark_ objects giving them specific semantics. Markers can either appear before the object (conjunctions and prepositions), after the object (postpositions) and sometimes without object. This tag includes the following traditional types of words:

- Prepositions.
- Postpositions.
- Conjunctions.

Markers are subclassified depending on the objects they accept using the AdpType and ConjType features. There are three general categories of markers based on their values for both AdpType and ConjType:

- **Degree 0** (Has both AdpType and ConjType): Can accept either nouns or clauses.
- **Degree 1** (Has only AdpType): Can accept only nouns.
- **Degree 2** (Has only ConjType=Sub): Can accept only clauses.

Using these subdivisions instead of the four traditional categories generates less ambiguity. For example, the English marker "since" has one single possible pos tag (MARK), instead of the two it has with UD tags and other tag specifications: "SCONJ" when it introduces a clause, and "ADP" otherwise.

The parser sees that it has AdpType=Prep (as in "He's been working here since March") and ConjType=Sub ("He's been sad since you left") which lets it assign its syntactic head correctly.

Markers without object continue to be markers if their semantics are unchanged. For example the word "down" is a marker in the sentence "The cat jumped down". If the sentence is extended to "The cat jumped down the table", tagging "down" as a marker is consistent with the previous sentence.

But some markers such as "like" or "once" are polysemic and therefore have multiple possible tags that need to be disambiguated. For example, "once" is an adverb in "He once told me a joke" but is a marker in "Once free, he opened a flower shop".

### Punctuation

All the characters with [UTF-8's General_Category value "P"](https://unicode.org/reports/tr44/#General_Category_Values) are members of this category. Every other character or word must not be tagged as PUNCT.

Delimiters are Unicode characters with the [Quotation_Mark](https://unicode.org/reports/tr44/#Quotation_Mark) and [Pattern_Syntax](http://unicode.org/reports/tr44/#Pattern_Syntax) properties and GeneralCategory=Ps|Pe. These are useful to detect delimited clauses like appositives. This information can be added as a lexical feature to the token.

Terminators are Unicode characters with the [TerminalPunctuation](https://unicode.org/reports/tr44/#Terminal_Punctuation) property.

## Interjection

Some words and symbols are conversational and independent of the sentence they appear in. As a general division, there are words which can only be interjections, such as emojis or words like "uh-oh" and "ahem", while others can also act as open classes, like "ok" or "sorry".

The words that can also be open classes should only be tagged as INTJ if they are independent of the rest of the sentence. For example, in "ok, I'll do it" the word "ok" is an interjection, whereas in "An ok movie," the word "ok" is an adjective.

## Unknown tags

If a word is gibberish or unknown and does not follow any grammatical shape, for example "xptq" or "uuuuuuuu", it can be tagged as X. But note this tag does not need to be implemented nor used. Any word can, in the proper context, act as at least NOUN or VERB, and potentially as ADJ or ADV.
