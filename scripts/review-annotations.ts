import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadAnnotatedDataset, loadDictionary } from "./model.js";
import { chat } from "./ollama.js";
import { optionReader } from "./args.js";
import { rulesOnlyPass } from "./open-positions.js";
import {
  adjudicationPrompt,
  adjudicationSchema,
  systemPrompt,
  type Adjudication,
} from "./tagging-prompt.js";
import type { PosTag } from "../src/types.js";

const dictionary = loadDictionary();
const tagset: PosTag[] = [
  "NOUN",
  "VERB",
  "ADJ",
  "ADV",
  "MARK",
  "PUNCT",
  "INTJ",
  "X",
];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const value = optionReader(args);

  return {
    model: value("model") ?? "qwen3.8:27b",
    proposals:
      value("proposals") ?? "../data/tagger-data/annotation-review.json",
    apply: args.includes("--apply"),
    specOnly: args.includes("--spec-only"),
    limit: Number(value("limit") ?? 0),
  };
};

const options = parseArgs();
const proposalsPath = fileURLToPath(
  new URL(options.proposals, import.meta.url),
);
const datasetPath = fileURLToPath(
  new URL("../data/tagger-data/annotated-dataset.json", import.meta.url),
);

type Proposal = {
  sentence: number;
  index: number;
  word: string;
  text: string;
  current: string;
  proposed: PosTag;
  source: "spec" | "ambiguous" | "settled";
  reason: string;
  decisive: boolean;
  accepted?: boolean;
  review?: string;
};

const numberWords = new Set([
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "hundred",
  "thousand",
  "million",
]);

const isNumeral = (word: string) =>
  /^\d[\d,.]*$/.test(word) || numberWords.has(word.toLowerCase());

const relativePronouns = new Set(["who", "whom", "whose", "which", "what"]);

const dataset = loadAnnotatedDataset();

type Disputed = Omit<Proposal, "reason" | "decisive" | "proposed"> & {
  candidates: PosTag[];
  tokens: { form: string; xpos: PosTag }[];
};

type Position = {
  sentence: number;
  index: number;
  word: string;
  text: string;
  current: string;
};

const specProposalsAt = (position: Position): Proposal[] => {
  const { word, current } = position;
  if (!(tagset as string[]).includes(current)) {
    return [
      {
        ...position,
        proposed: "NOUN",
        source: "spec",
        reason: `"${current}" is not one of the eight tags, so this position can never be matched by any tagger. Tagged NOUN for consistency with the other handle-like tokens in the set.`,
        decisive: true,
      },
    ];
  }

  const proposals: Proposal[] = [];
  if (isNumeral(word) && current !== "NOUN") {
    proposals.push({
      ...position,
      proposed: "NOUN",
      source: "spec",
      reason:
        "docs/parts-of-speech.md: numbers are always NOUN, never ADJ. A numeral modifying a noun is treated as the modifier in a compound noun, which keeps its own tag.",
      decisive: true,
    });
  }

  if (relativePronouns.has(word.toLowerCase()) && current === "MARK") {
    proposals.push({
      ...position,
      proposed: "NOUN",
      source: "spec",
      reason:
        "docs/parts-of-speech.md: pronouns are NOUN, and a relative pronoun is a pronoun. It heads its clause, but so does any other subject; heading a clause is not what makes a word a marker.",
      decisive: true,
    });
  }

  return proposals;
};

const specViolations = () =>
  dataset.flatMap(({ text, tags, words }, sentence) =>
    words.flatMap((word, index) =>
      specProposalsAt({ sentence, index, word, text, current: tags[index] }),
    ),
  );

const taggerDisagreements = (spec: Proposal[]) => {
  const alreadyProposed = new Set(
    spec.map(({ sentence, index }) => `${sentence}:${index}`),
  );
  const disputed: Disputed[] = [];
  dataset.forEach(({ text, tags }, sentence) => {
    const { tokens, candidatesByIndex } = rulesOnlyPass(text, dictionary);
    if (tokens.length !== tags.length) {
      return;
    }

    tokens.forEach((token, index) => {
      const current = tags[index];
      if (
        token.xpos === current ||
        alreadyProposed.has(`${sentence}:${index}`)
      ) {
        return;
      }

      const open = candidatesByIndex.get(index);
      disputed.push({
        sentence,
        index,
        word: token.form,
        text,
        current,
        source: open == null ? "settled" : "ambiguous",
        candidates: [...new Set([...(open ?? [token.xpos]), current])],
        tokens: tokens.map(({ form, xpos }) => ({ form, xpos })),
      });
    });
  });
  return disputed;
};

const disputes = () => {
  const spec = specViolations();
  return {
    spec,
    disputed: options.specOnly ? [] : taggerDisagreements(spec),
  };
};

const adjudicate = async () => {
  const { spec, disputed } = disputes();
  console.log(
    `Specification violations: ${spec.length}\n` +
      `Disagreements to adjudicate: ${disputed.length}` +
      `  (${disputed.filter(({ source }) => source === "ambiguous").length} the rules left open,` +
      ` ${disputed.filter(({ source }) => source === "settled").length} the rules settled)\n`,
  );

  const queue = options.limit > 0 ? disputed.slice(0, options.limit) : disputed;
  const proposals: Proposal[] = [...spec];
  let agreed = 0;

  for (let position = 0; position < queue.length; position += 1) {
    const { tokens, index, candidates, ...rest } = queue[position];
    // eslint-disable-next-line no-await-in-loop
    const { content } = await chat({
      model: options.model,
      system: systemPrompt,
      prompt: adjudicationPrompt(tokens, index, candidates),
      schema: adjudicationSchema(candidates),
    });
    const { tag, guideline, decisive } = JSON.parse(content) as Adjudication;
    if (tag === rest.current) {
      agreed += 1;
    } else {
      proposals.push({
        ...rest,
        index,
        proposed: tag,
        reason: guideline,
        decisive,
      });
    }

    if ((position + 1) % 10 === 0) {
      process.stdout.write(
        `\r  adjudicated ${position + 1}/${queue.length}, ${proposals.length - spec.length} overturned   `,
      );
    }
  }

  process.stdout.write(`\r${" ".repeat(70)}\r`);
  console.log(
    `Adjudicated ${queue.length}: annotation upheld ${agreed}, ` +
      `overturned ${proposals.length - spec.length}\n`,
  );
  writeFileSync(proposalsPath, JSON.stringify(proposals, null, 2));
  console.log(`${proposals.length} proposals -> ${proposalsPath}`);
};

const changelogPath = fileURLToPath(
  new URL("../data/tagger-data/annotation-changes.json", import.meta.url),
);

const recordChanges = (entries: Proposal[]) => {
  const existing = existsSync(changelogPath)
    ? (JSON.parse(readFileSync(changelogPath).toString()) as {
        applied: string;
        changes: Proposal[];
      }[])
    : [];
  existing.push({ applied: new Date().toISOString(), changes: entries });
  writeFileSync(changelogPath, `${JSON.stringify(existing, null, 2)}\n`);
  console.log(`Recorded in ${changelogPath}`);
};

const apply = () => {
  if (!existsSync(proposalsPath)) {
    console.error(
      `No proposals at ${proposalsPath}. Run without --apply first.`,
    );
    process.exit(1);
  }

  const proposals = JSON.parse(
    readFileSync(proposalsPath).toString(),
  ) as Proposal[];
  const updated = dataset.map((sentence) => ({
    ...sentence,
    tags: [...sentence.tags],
  }));

  const landed: Proposal[] = [];
  let applied = 0;
  let rejected = 0;
  proposals.forEach((proposal) => {
    const { sentence, index, word, current, proposed, accepted } = proposal;
    if (accepted === false) {
      rejected += 1;
      return;
    }

    const target = updated[sentence];
    if (target?.words[index] !== word || target.tags[index] !== current) {
      console.error(
        `Skipped s${sentence} w${index}: expected "${word}"=${current}, found ` +
          `"${target?.words[index] ?? "(none)"}"=${target?.tags[index] ?? "(none)"}`,
      );
      return;
    }

    target.tags[index] = proposed;
    landed.push(proposal);
    applied += 1;
  });

  writeFileSync(datasetPath, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(
    `Applied ${applied} of ${proposals.length} ` +
      `(${rejected} rejected on review) -> ${datasetPath}`,
  );
  if (landed.length > 0) {
    recordChanges(landed);
  }
};

if (options.apply) {
  apply();
} else {
  await adjudicate();
}
