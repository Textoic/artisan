import type { PartiallyParsedToken } from "../types.js";

const phraseBoundaryTypes = ["Peri", "Qest", "Excl", "Comm"];

export const isPhraseBoundaryType = (type?: string) =>
  type != null && phraseBoundaryTypes.includes(type);

const agreesWithAnySubject = ({
  feats: { Person, Tense, VerbForm, Mood },
}: PartiallyParsedToken) =>
  Boolean(Mood) ||
  (VerbForm === "Fin" &&
    (Tense === "Past" || (Tense === "Pres" && Person == null)));

export const canBeSubjectOfWhenTagging = (
  subjectToken: PartiallyParsedToken,
  verbToken: PartiallyParsedToken,
) => {
  const {
    feats: { Number },
  } = subjectToken;
  const {
    feats: { Person: verbPerson },
  } = verbToken;
  return (
    agreesWithAnySubject(verbToken) ||
    (verbPerson === 3 && Number !== "Plur") ||
    (verbPerson != null && [1, 2].includes(verbPerson) && Number !== "Sing")
  );
};

export const cannotBeSubjectWhenParsing = (
  tokens: PartiallyParsedToken[],
  subject: number,
  verb: number,
) => {
  const {
    feats: { Number, Person: subjectPerson },
  } = tokens[subject];
  const {
    feats: { Person },
  } = tokens[verb];
  return (
    (Person === 3 && Number === "Plur") ||
    (Person != null &&
      [1, 2].includes(Person) &&
      Number === "Sing" &&
      subjectPerson !== 1)
  );
};
