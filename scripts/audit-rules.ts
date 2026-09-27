import { writeFileSync } from "node:fs";
import parse from "../src/parse/index.js";
import tokenize from "../src/tokenize/index.js";
import {
  setTagAuditSink,
  type TagEvent,
  type TagVerdict,
} from "../src/tag/audit.js";
import { ruleRegistry } from "../src/tag/index.js";
import {
  loadAnnotatedDataset,
  loadDictionary,
  loadWeights,
  type AnnotatedSentence,
} from "./model.js";
import type { ParsedToken, PosTag } from "../src/types.js";

const argument = (name: string) => {
  const found = process.argv.find((value) => value.startsWith(`--${name}=`));
  return found == null ? undefined : found.split("=")[1];
};

const limit = Number(argument("limit") ?? 0);
const jsonPath = argument("json");

const dictionary = loadDictionary();
const weights = loadWeights();
const dataset = loadAnnotatedDataset();

type Site = {
  text: string;
  index: number;
  form: string;
  gold?: PosTag;
  final: PosTag;
};

const increment = (counts: Map<string, number>, key: string, by = 1) => {
  counts.set(key, (counts.get(key) ?? 0) + by);
};

const push = <Value>(
  lists: Map<string, Value[]>,
  key: string,
  value: Value,
) => {
  const list = lists.get(key);
  if (list == null) {
    lists.set(key, [value]);
  } else {
    list.push(value);
  }
};

const vetoes = new Map<string, number>();
const accepts = new Map<string, number>();
const vetoedGold = new Map<string, number>();
const vetoedOther = new Map<string, number>();
const matchedNotFirst = new Map<string, number>();
const redundantPairs = new Map<string, number>();

const contradictions = new Map<string, Site[]>();
const forcedSites: Site[] = [];

const goldVetoes = new Map<string, Site[]>();

let sentencesScored = 0;
let sentencesSkipped = 0;
let ambiguous = 0;
let correct = 0;
let wrongByVeto = 0;
let wrongByChoice = 0;
let goldNotAvailable = 0;
let needingChoice = 0;
let wrongDownstream = 0;

const verdictKey = (xpos: PosTag, rule: string) => `${xpos} vetoed by ${rule}`;

const ruleFeatures = new Map(
  ruleRegistry.map(({ id, features }) => [id, features]),
);

const seen = new Set<string>();
const isNew = (group: string, text: string, index: number) => {
  const key = `${group}@${index}@${text}`;
  if (seen.has(key)) {
    return false;
  }

  seen.add(key);
  return true;
};

type JudgedEvent = Extract<TagEvent, { type: "judged" }>;

const recordVeto = (
  { text, tags }: AnnotatedSentence,
  tokenCount: number,
  index: number,
  { rule, xpos, accepted }: TagVerdict,
) => {
  if (
    accepted ||
    tags.length !== tokenCount ||
    tags[index] == null ||
    !isNew(`${rule}:${xpos}`, text, index)
  ) {
    return;
  }

  increment(xpos === tags[index] ? vetoedGold : vetoedOther, rule);
};

const recordShadowing = (matched: string[]) => {
  matched.slice(1).forEach((later) => increment(matchedNotFirst, later));
  const [first, second] = matched;
  if (first == null || second == null) {
    return;
  }

  const firstFeatures = ruleFeatures.get(first);
  if (firstFeatures != null && firstFeatures === ruleFeatures.get(second)) {
    increment(redundantPairs, `${first} -> ${second}`);
  }
};

const recordForcedSite = (
  { text, tags }: AnnotatedSentence,
  tokens: ParsedToken[],
  index: number,
  { forced }: TagVerdict,
) => {
  if (!forced || tokens[index] == null || !isNew("forced", text, index)) {
    return;
  }

  forcedSites.push({
    text,
    index,
    form: tokens[index].form,
    gold: tags[index],
    final: tokens[index].xpos,
  });
};

const recordVerdict = (
  sentence: AnnotatedSentence,
  tokens: ParsedToken[],
  index: number,
  verdict: TagVerdict,
) => {
  increment(verdict.accepted ? accepts : vetoes, verdict.rule);
  recordVeto(sentence, tokens.length, index, verdict);
  recordShadowing(verdict.matched);
  recordForcedSite(sentence, tokens, index, verdict);
};

const recordContradiction = (
  { text, tags }: AnnotatedSentence,
  tokens: ParsedToken[],
  retried: Set<number>,
  { index, verdicts, flexibleMode }: JudgedEvent,
) => {
  if (
    flexibleMode ||
    !retried.has(index) ||
    verdicts.length < 2 ||
    verdicts.some(({ accepted }) => accepted)
  ) {
    return;
  }

  const key = verdicts
    .map(({ xpos, rule }) => verdictKey(xpos, rule))
    .sort()
    .join(", ");
  if (tokens[index] != null && isNew(key, text, index)) {
    push(contradictions, key, {
      text,
      index,
      form: tokens[index].form,
      gold: tags[index],
      final: tokens[index].xpos,
    });
  }
};

type TokenOutcome =
  | "unambiguous"
  | "correct"
  | "downstream"
  | "gold-not-offered"
  | "wrong-choice"
  | "wrong-veto";

const classifyToken = (
  events: TagEvent[],
  gold: PosTag,
  token: ParsedToken,
  index: number,
): TokenOutcome => {
  const candidates = Object.keys(token.misc.pos) as PosTag[];
  if (candidates.length < 2) {
    return "unambiguous";
  }

  if (token.xpos === gold) {
    return "correct";
  }

  if (!candidates.includes(gold)) {
    return "gold-not-offered";
  }

  const choice = events.find(
    (event) => event.type === "chose" && event.index === index,
  );
  return choice?.type === "chose" && choice.tags.includes(gold)
    ? "wrong-choice"
    : "wrong-veto";
};

const countOutcome = (outcome: TokenOutcome) => {
  if (outcome === "correct") {
    correct += 1;
  } else if (outcome === "downstream") {
    wrongDownstream += 1;
  } else if (outcome === "gold-not-offered") {
    goldNotAvailable += 1;
  } else if (outcome === "wrong-choice") {
    wrongByChoice += 1;
  } else {
    wrongByVeto += 1;
  }
};

const vetoingRules = (verdicts: TagVerdict[], gold: PosTag) =>
  verdicts
    .filter(({ xpos, accepted }) => xpos === gold && !accepted)
    .map(({ rule }) => rule);

const blameVetoingRules = (judged: JudgedEvent[], gold: PosTag, site: Site) => {
  const blame = new Set(
    judged
      .filter((event) => event.index === site.index)
      .flatMap(({ verdicts }) => vetoingRules(verdicts, gold)),
  );
  blame.forEach((rule) => push(goldVetoes, `${rule} (vetoing ${gold})`, site));
};

const scoreTokens = (
  { text, tags }: AnnotatedSentence,
  tokens: ParsedToken[],
  events: TagEvent[],
  judged: JudgedEvent[],
) => {
  let wrongEarlierInRun = false;
  tokens.forEach((token, index) => {
    const gold = tags[index];
    const verdict = classifyToken(events, gold, token, index);
    if (verdict === "unambiguous") {
      wrongEarlierInRun = false;
      return;
    }

    ambiguous += 1;
    if (token.isDisambiguated) {
      needingChoice += 1;
    }

    const isWrong = verdict !== "correct";
    const outcome = isWrong && wrongEarlierInRun ? "downstream" : verdict;
    wrongEarlierInRun = wrongEarlierInRun || isWrong;
    countOutcome(outcome);
    if (outcome === "wrong-veto") {
      blameVetoingRules(judged, gold, {
        text,
        index,
        form: token.form,
        gold,
        final: token.xpos,
      });
    }
  });
};

const auditSentence = (sentence: AnnotatedSentence) => {
  const { text, tags } = sentence;
  const events: TagEvent[] = [];
  setTagAuditSink((event) => events.push(event));
  const tokens = parse(tokenize(text, { dictionary }), { weights });
  setTagAuditSink(null);

  const judged = events.filter(
    (event): event is JudgedEvent => event.type === "judged",
  );
  const retried = new Set(
    judged.filter(({ flexibleMode }) => flexibleMode).map(({ index }) => index),
  );
  judged.forEach((event) => {
    event.verdicts.forEach((verdict) =>
      recordVerdict(sentence, tokens, event.index, verdict),
    );
    recordContradiction(sentence, tokens, retried, event);
  });

  if (tokens.length !== tags.length) {
    sentencesSkipped += 1;
    return;
  }

  sentencesScored += 1;
  scoreTokens(sentence, tokens, events, judged);
};

dataset
  .slice(0, limit > 0 ? limit : dataset.length)
  .forEach((sentence) => auditSentence(sentence));

const percent = (value: number, of: number) =>
  of === 0 ? "n/a" : `${((100 * value) / of).toFixed(2)}%`;

const showSite = ({ text, index, form, gold, final }: Site) =>
  `      "${form}" (${index}) tagged ${final}${gold ? `, gold ${gold}` : ""}\n` +
  `        ${JSON.stringify(text.length > 90 ? `${text.slice(0, 90)}...` : text)}`;

const byCount = <Value>(entries: [string, Value[]][]) =>
  entries.sort(([, a], [, b]) => b.length - a.length);

console.log(
  [
    "",
    "=".repeat(72),
    "  Where the tagger's answer came from",
    "=".repeat(72),
    `Sentences: ${sentencesScored} scored, ${sentencesSkipped} skipped for a token count mismatch`,
    `Ambiguous words: ${ambiguous} (the rules narrowed ${ambiguous - needingChoice} of them to one tag on their own;`,
    `                 the remaining ${needingChoice} needed the model to choose)`,
    `  right:                    ${correct} (${percent(correct, ambiguous)})`,
    `  wrong, rules allowed it:  ${wrongByChoice} (${percent(wrongByChoice, ambiguous)})  <- a better model would fix these`,
    `  wrong, rules vetoed it:   ${wrongByVeto} (${percent(wrongByVeto, ambiguous)})  <- only a rule change can fix these`,
    `  wrong, tag not offered:   ${goldNotAvailable} (${percent(goldNotAvailable, ambiguous)})  <- the dictionary never allowed the right tag`,
    `  wrong, downstream:        ${wrongDownstream} (${percent(wrongDownstream, ambiguous)})  <- an earlier word in the same run was already wrong`,
  ].join("\n"),
);

console.log(
  [
    "",
    "=".repeat(72),
    "  Contradictions: every candidate tag vetoed",
    "=".repeat(72),
    `${[...contradictions.values()].reduce((sum, sites) => sum + sites.length, 0)} positions, in ${contradictions.size} distinct combinations.`,
    "At each of these the lists disagreed with each other and the tag was",
    "forced. Fixing one rule in the pair fixes every position in its group.",
    "",
  ].join("\n"),
);
byCount([...contradictions.entries()])
  .slice(0, 15)
  .forEach(([key, sites]) => {
    console.log(`  ${String(sites.length).padStart(4)}x  ${key}`);
    sites.slice(0, 2).forEach((site) => console.log(showSite(site)));
  });

console.log(
  [
    "",
    "=".repeat(72),
    "  Rules that veto the right answer",
    "=".repeat(72),
    "Ranked by how often the rule made the gold tag impossible. This is the",
    "worklist: the rule at the top costs the most.",
    "",
  ].join("\n"),
);
byCount([...goldVetoes.entries()])
  .slice(0, 20)
  .forEach(([key, sites]) => {
    const [rule] = key.split(" ");
    const fired = (vetoes.get(rule) ?? 0) + (accepts.get(rule) ?? 0);
    const right = vetoedOther.get(rule) ?? 0;
    const wrong = vetoedGold.get(rule) ?? 0;
    console.log(
      `  ${String(sites.length).padStart(4)}  ${key.padEnd(46)} of ${fired} decisions;` +
        ` its vetoes land right ${right} times and wrong ${wrong}`,
    );
    sites.slice(0, 1).forEach((site) => console.log(showSite(site)));
  });

const never = ruleRegistry.filter(
  ({ id }) => !vetoes.has(id) && !accepts.has(id),
);
const neverFirst = ruleRegistry.filter(
  ({ id }) => !vetoes.has(id) && !accepts.has(id) && matchedNotFirst.has(id),
);

console.log(
  [
    "",
    "=".repeat(72),
    "  Rules that never decided anything",
    "=".repeat(72),
    `${never.length} of ${ruleRegistry.length} rules never decided a single word here.`,
    `${neverFirst.length} of those did match, but always behind a rule that spoke first:`,
    "",
  ].join("\n"),
);
never.forEach(({ id, tag, vetoes: isVeto }) =>
  console.log(
    `  ${id.padEnd(34)} ${(isVeto ? "vetoes" : "allows").padEnd(7)} ${tag}${
      matchedNotFirst.has(id)
        ? `  (matched ${matchedNotFirst.get(id) ?? 0}x behind another rule)`
        : ""
    }`,
  ),
);

console.log(
  [
    "",
    "=".repeat(72),
    "  Rules an earlier rule already covers",
    "=".repeat(72),
    "The first rule matched, and so did the next one, and both say the same",
    "thing. The first is doing no work these two do not already share.",
    "",
  ].join("\n"),
);
[...redundantPairs.entries()]
  .sort(([, a], [, b]) => b - a)
  .slice(0, 15)
  .forEach(([pair, count]) =>
    console.log(`  ${String(count).padStart(5)}x  ${pair}`),
  );

console.log(
  [
    "",
    "=".repeat(72),
    "  How often each rule decided",
    "=".repeat(72),
    "",
  ].join("\n"),
);
console.log("  decided   right   wrong  rule\n");
ruleRegistry
  .map(({ id, tag, vetoes: isVeto }) => ({
    id,
    tag,
    isVeto,
    fired: (vetoes.get(id) ?? 0) + (accepts.get(id) ?? 0),
    right: vetoedOther.get(id) ?? 0,
    wrong: vetoedGold.get(id) ?? 0,
  }))
  .sort((a, b) => b.fired - a.fired)
  .forEach(({ id, tag, isVeto, fired, right, wrong }) =>
    console.log(
      `  ${String(fired).padStart(6)}  ${String(isVeto ? right : "").padStart(6)}  ${String(isVeto ? wrong : "").padStart(6)}  ${id.padEnd(34)} ${(isVeto ? "vetoes" : "allows").padEnd(7)} ${tag}`,
    ),
  );

if (jsonPath != null) {
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        summary: {
          sentencesScored,
          sentencesSkipped,
          ambiguous,
          correct,
          wrongByChoice,
          wrongByVeto,
          goldNotAvailable,
          wrongDownstream,
        },
        contradictions: Object.fromEntries(contradictions),
        goldVetoes: Object.fromEntries(goldVetoes),
        forced: forcedSites,
        fired: Object.fromEntries(
          ruleRegistry.map(({ id }) => [
            id,
            { vetoes: vetoes.get(id) ?? 0, accepts: accepts.get(id) ?? 0 },
          ]),
        ),
        vetoedGold: Object.fromEntries(vetoedGold),
        vetoedOther: Object.fromEntries(vetoedOther),
        matchedNotFirst: Object.fromEntries(matchedNotFirst),
        redundantPairs: Object.fromEntries(redundantPairs),
      },
      null,
      2,
    ),
  );
  console.log(`\nWritten to ${jsonPath}`);
}
