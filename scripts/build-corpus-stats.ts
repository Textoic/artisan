import { createWriteStream } from "node:fs";
import parse from "../src/parse/index.js";
import sentencize from "../src/sentencize/index.js";
import tokenize from "../src/tokenize/index.js";
import { streamCorpus } from "./corpus.js";
import { loadDictionary } from "./model.js";
import type { ParsedToken } from "../src/types.js";

const dictionary = loadDictionary();

const [inputPath = "data/json-dataset.txt"] = process.argv.slice(2);

const paginationPath = new URL(
  "../data/tagger-data/json-dataset-pagination.json",
  import.meta.url,
);

const wordTagsAppender = createWriteStream(
  "data/tagger-data/parser-word-tags.txt",
  { flags: "a" },
);
const prepPairsAppender = createWriteStream("data/tagger-data/prep-pairs.txt", {
  flags: "a",
});

const apostropheAlternatives = /['’`´]+/iu;
const noiseCharactersRegExp = /-|_|#|\\*/iu;

const normalize = (form: string) =>
  form
    .toLowerCase()
    .replace(noiseCharactersRegExp, "")
    .replace(apostropheAlternatives, "'")
    .replace(/\s+/giu, "_");

const ruleResolvedPrefix = (tokens: ParsedToken[]) => {
  const cut = tokens.findIndex(({ isDisambiguated }) => isDisambiguated);
  return cut === -1 ? tokens : tokens.slice(0, cut);
};

const ambiguousWordTags = (tokens: ParsedToken[]) =>
  tokens
    .filter(({ misc: { pos } }) => Object.keys(pos).length > 1)
    .map(({ form, xpos }) => `${normalize(form)} ${xpos}`);

const isPhrasalPair = (token: ParsedToken, next: ParsedToken) => {
  const { xpos, misc: { pos = {} } = {} } = token;
  const {
    xpos: nextTag,
    feats: { AdpType: nextAdpType, ConjType: nextConjType } = {},
  } = next;
  return (
    ["NOUN", "VERB"].includes(xpos) &&
    nextTag === "MARK" &&
    Boolean(pos.NOUN) &&
    Boolean(pos.VERB) &&
    Boolean(nextAdpType) &&
    !nextConjType
  );
};

const prepositionalPairs = (tokens: ParsedToken[]) => {
  const pairs = [];
  let index = 0;
  while (index < tokens.length - 1) {
    if (isPhrasalPair(tokens[index], tokens[index + 1])) {
      const { xpos, lemma } = tokens[index];
      pairs.push({ xpos, lemma, marker: tokens[index + 1].lemma });
      index += 2;
    } else {
      index += 1;
    }
  }

  return pairs;
};

let sentencesSeen = 0;
let sentencesUsed = 0;
let tagsRecorded = 0;

const processText = (text: string) => {
  sentencize(tokenize(text, { dictionary })).forEach((sentenceTokens) => {
    sentencesSeen += 1;
    const tokens = ruleResolvedPrefix(parse(sentenceTokens));
    if (tokens.length === 0) {
      return;
    }

    sentencesUsed += 1;
    const wordTags = ambiguousWordTags(tokens);
    if (wordTags.length > 0) {
      tagsRecorded += wordTags.length;
      wordTagsAppender.write(`${wordTags.join("\n")}\n`);
    }

    const pairs = prepositionalPairs(tokens);
    if (pairs.length > 0) {
      prepPairsAppender.write(
        `${pairs.map((pair) => JSON.stringify(pair)).join("\n")}\n`,
      );
    }
  });
};

console.log(`Reading ${inputPath}`);
const { linesRead, linesSkipped } = await streamCorpus(inputPath, processText, {
  paginationPath,
});
console.log(
  `Texts: ${linesRead} (${linesSkipped} unreadable)`,
  `\nSentences: ${sentencesUsed} usable of ${sentencesSeen}`,
  `\nAmbiguous words tagged by rules alone: ${tagsRecorded}`,
);
wordTagsAppender.end();
prepPairsAppender.end();
