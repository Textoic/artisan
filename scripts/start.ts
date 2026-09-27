import { createServer } from "node:http";
import prettier from "prettier";
import parse from "../src/parse/index.js";
import sentencize from "../src/sentencize/index.js";
import tokenize from "../src/tokenize/index.js";
import { setTagAuditSink, type TagEvent } from "../src/tag/audit.js";
import { loadDictionary, loadWeights } from "./model.js";
import type { ParsedToken } from "../src/types.js";

const dictionary = loadDictionary();
const weights = loadWeights();

const parseText = (text: string) =>
  sentencize(tokenize(text, { dictionary })).map((tokens) =>
    parse(tokens, { weights }),
  );

const [, path, command, text] = process.argv;

const handlers = {
  tokenize: async (text: string) => {
    const result = sentencize(tokenize(text, { dictionary }));
    console.log(
      await prettier.format(JSON.stringify(result), { parser: "json" }),
    );
  },
  parse: async (text: string) => {
    console.log(
      await prettier.format(JSON.stringify(parseText(text)), {
        parser: "json",
      }),
    );
  },
  serve: (port: number = 8080) => {
    createServer((req, res) => {
      const data: Buffer[] = [];
      req.on("data", (chunk: Buffer) => {
        data.push(chunk);
      });
      req.on("error", console.error);
      req.on("end", () => {
        const texts = JSON.parse(Buffer.concat(data).toString()) as {
          text: string;
        }[];
        const documents = texts.map(({ text }) => ({
          sentences: parseText(text),
        }));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(documents));
      });
    }).listen(port);
    console.log(`Listening on port: ${port}`);
  },
  explain: (text: string) => {
    const events: TagEvent[] = [];
    setTagAuditSink((event) => events.push(event));
    const sentences = parseText(text);
    setTagAuditSink(null);

    sentences.forEach((tokens) => {
      tokens.forEach((token, index) => {
        const candidates = Object.keys(token.misc.pos);
        const head =
          token.head === -1 ? "root" : `head ${tokens[token.head].form}`;
        console.log(
          `\n${index}  ${token.form}  -> ${token.xpos} (${head})` +
            `${candidates.length > 1 ? `  from ${candidates.join("/")}` : ""}`,
        );
        const judged = events.filter(
          (event) => event.type === "judged" && event.index === index,
        );
        const last = judged[judged.length - 1];
        if (last?.type === "judged") {
          last.verdicts.forEach(({ xpos, rule, accepted, forced }) =>
            console.log(
              `      ${accepted ? "allow " : "veto  "} ${xpos.padEnd(6)} ${rule}` +
                `${forced ? " (forced: no tag was left)" : ""}`,
            ),
          );
        }

        events.forEach((event) => {
          if (event.type === "chose" && event.index === index) {
            console.log(
              `      chose  ${event.predicted} out of ${event.tags.join("/")}`,
            );
          }
        });
      });
    });
  },
  tree: (text: string) => {
    const stringify = (
      tokens: ParsedToken[],
      tree = "",
      id = tokens.findIndex(({ head }) => head === -1),
      depth = 0,
    ): string => {
      const { form, xpos, head } = tokens[id];
      const children = tokens.reduce((children, { head }, index) => {
        if (head === id) {
          children.push(index);
        }

        return children;
      }, [] as number[]);
      const string = `${tree}\n${Array.from({ length: depth }, () => "| ").join(
        "",
      )}${children.length === 0 ? "\\" : "+"} ${id} ${form} ${xpos} ${head}`;
      return children.reduce(
        (tree, index) => stringify(tokens, tree, index, depth + 1),
        string,
      );
    };

    console.log(text);
    console.log(
      sentencize(tokenize(text, { dictionary }))
        .map((tokens) => stringify(parse(tokens, { weights })))
        .join("\n"),
    );
  },
} as {
  [command: string]: (arg: string | number) => unknown;
};

const handler = handlers[command];
if (handler) {
  handler(text);
} else {
  console.error(`Usage: ${path} (${Object.keys(handlers).join(" | ")}) <text>`);
}
