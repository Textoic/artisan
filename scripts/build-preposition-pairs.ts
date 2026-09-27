import { createReadStream, writeFileSync } from "fs";
import { createInterface } from "readline";
import type { PosTag } from "../src/types.js";

const inputPath = new URL(
  "../data/tagger-data/prep-pairs.txt",
  import.meta.url,
);
const outputPath = new URL("../data/pairs.json", import.meta.url);

const readStream = createReadStream(inputPath);
const lineReader = createInterface({
  input: readStream,
});
const INDIVIDUAL_ENTRY_THRESHOLD = 10;

type PosPresenceMap = {
  [posTag in PosTag]?: number;
};

type CountMap = Record<string, Record<string, PosPresenceMap>>;

const addPair = (counts: CountMap) => (line: string) => {
  const { xpos, lemma, marker } = JSON.parse(line) as {
    xpos: PosTag;
    lemma: string;
    marker: string;
  };
  const currentCounts = counts[lemma] || {};
  const currentMarkerMap = currentCounts[marker] || {};
  const currentTagCount = currentMarkerMap[xpos] || 0;
  currentMarkerMap[xpos] = currentTagCount + 1;
  currentCounts[marker] = currentMarkerMap;
  counts[lemma] = currentCounts;
};

const pairCounts: CountMap = {};
lineReader.on("line", addPair(pairCounts));

const toFrequentPosShares = (posMap: PosPresenceMap) => {
  const total = Object.values(posMap).reduce((sum, value) => sum + value, 0);
  return Object.entries(posMap).reduce((map, [xpos, count]) => {
    if (count > INDIVIDUAL_ENTRY_THRESHOLD) {
      map[xpos as PosTag] = Number((count / total).toFixed(2));
    }

    return map;
  }, {} as PosPresenceMap);
};

const toMarkerShares = (allMarkersMap: Record<string, PosPresenceMap>) =>
  Object.entries(allMarkersMap).reduce(
    (map, [marker, posMap]) => {
      const shares = toFrequentPosShares(posMap);
      const tags = Object.keys(shares);
      if (tags.length === 1) {
        const [xpos] = tags;
        map[marker] = { [xpos]: 1 };
        console.log(
          `The map ${JSON.stringify(
            shares,
          )} has one entry; setting map to ${JSON.stringify(map[marker])}`,
        );
      } else if (tags.length > 0) {
        map[marker] = shares;
      }

      return map;
    },
    {} as Record<string, PosPresenceMap>,
  );

const toPairMap = (counts: CountMap) =>
  Object.entries(counts).reduce((map, [lemma, allMarkersMap]) => {
    const entries = toMarkerShares(allMarkersMap);
    if (Object.keys(entries).length > 0) {
      map[lemma] = entries;
    }

    return map;
  }, {} as CountMap);

lineReader.on("close", () => {
  writeFileSync(outputPath, JSON.stringify(toPairMap(pairCounts), null, 2));
});
