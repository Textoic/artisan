import type { Token } from "../types.js";

export default function (tokens: Token[]): Token[][] {
  let index = 0;
  const sentences = [];
  while (index < tokens.length) {
    const offset = tokens
      .slice(index)
      .findIndex(
        ({ feats: { PunctType = "" }, form }) =>
          ["Peri", "Qest", "Excl", "Semi"].includes(PunctType) ||
          ["\\n", "\n", "\\\\n"].includes(form),
      );
    if (offset === -1) {
      const sentence = tokens.slice(index);
      sentence.forEach((token, id) => {
        token.id = id;
      });
      sentences.push(sentence);
      return sentences;
    }

    const start = index;
    let end = index + offset;
    if (
      tokens
        .slice(index, index + offset)
        .some(({ feats: { PunctType = "" } }) =>
          ["Quot", "Brck"].includes(PunctType),
        ) &&
      tokens[end + 1] &&
      ["Quot", "Brck"].includes(tokens[end + 1].feats.PunctType ?? "") &&
      tokens[end + 1].misc.at === tokens[end].misc.at + tokens[end].form.length
    ) {
      end += 1;
      index += offset + 2;
    } else {
      index += offset === 0 ? 1 : offset + 1;
    }

    const sentence = tokens.slice(start, end + 1);
    sentence.forEach((token, id) => {
      token.id = id;
    });
    sentences.push(sentence);
  }

  return sentences;
}
