import { createReadStream, writeFileSync } from "fs";
import { createInterface } from "readline";
import type { PosTag } from "../src/types.js";

type LikelihoodMap = Record<string, Record<PosTag, number>>;

const inputPath = new URL(
  "../data/tagger-data/parser-word-tags.txt",
  import.meta.url,
);
const outputPath = new URL("../data/pos.json", import.meta.url);

const readStream = createReadStream(inputPath);
const lineReader = createInterface({
  input: readStream,
});

const BASE_COUNT_THRESHOLD = 10;
const PARTICLE_SEPARATOR = "['’`´]";
const apostropheAlternatives = RegExp(`${PARTICLE_SEPARATOR}+`, "giu");
const noiseCharactersRegExp = /-|_|#|\\*/iu;

const addWord = (map: LikelihoodMap) => (line: string) => {
  const [form, xpos] = line.split(" ");
  const key = form
    .toLowerCase()
    .replace(noiseCharactersRegExp, "")
    .replace(apostropheAlternatives, "'");
  const currentCounts = map[key] || {};
  const currentTagCount = currentCounts[xpos as PosTag] || 0;
  currentCounts[xpos as PosTag] = currentTagCount + 1;
  map[key] = currentCounts;
};

const tagLikelihoods: LikelihoodMap = {};
lineReader.on("line", addWord(tagLikelihoods));

lineReader.on("close", () => {
  const finalMap = [...Object.entries(tagLikelihoods)]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .reduce((map, [form, wordCounts]) => {
      const filteredEntries = [...Object.entries(wordCounts)].filter(
        ([, count]) => count >= BASE_COUNT_THRESHOLD,
      );
      const total = filteredEntries.reduce((sum, [, count]) => sum + count, 0);
      const entries = filteredEntries.reduce(
        (entries, [xpos, count]) => {
          entries[xpos as PosTag] = Number((count / total).toFixed(2));
          return entries;
        },
        {} as Record<PosTag, number>,
      );
      if ([...Object.keys(entries)].length > 0) {
        map[form] = entries;
      }

      return map;
    }, {} as LikelihoodMap);
  writeFileSync(outputPath, JSON.stringify(finalMap, null, 2));
});
