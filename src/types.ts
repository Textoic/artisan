export type PosTag =
  | "NOUN"
  | "VERB"
  | "ADJ"
  | "ADV"
  | "MARK"
  | "PUNCT"
  | "INTJ"
  | "X";

export type BoundaryTag = "START" | "END";

export type ContextualPosTag = PosTag | BoundaryTag;

export type PosWeights = {
  [posTag in PosTag]?: number;
};

export type AdpositionType = "Prep" | "Post";

export type MorphCase = "Nom" | "Acc";

export type ConjunctionType = "Sub" | "Comp" | "Coor";

export type VerbMood = "Pot" | "Nec" | "Cnd";

export type NumeralType = "Card" | "Ord";

export type GradeDegree = "Cmp" | "Sup";

export type NominalNumber = "Sing" | "Plur";

export type VerbPerson = 1 | 2 | 3;

export type PronounType = "Art" | "Dem" | "Prs" | "Tot" | "Neg" | "Rel" | "Ind";

export type PunctuationType =
  | "Peri"
  | "Qest"
  | "Excl"
  | "Quot"
  | "Brck"
  | "Comm"
  | "Colo"
  | "Semi"
  | "Dash";

export type Tense = "Pres" | "Past";

export type VerbForm = "Fin" | "Part";

export type LexicalFeatures = {
  AdpType?: AdpositionType;
  Case?: MorphCase;
  ConjType?: ConjunctionType;
  Degree?: GradeDegree;
  Mood?: VerbMood;
  NumType?: NumeralType;
  Number?: NominalNumber;
  Person?: VerbPerson;
  Poss?: boolean;
  PronType?: PronounType;
  PunctType?: PunctuationType;
  Reflex?: boolean;
  Tense?: Tense;
  VerbForm?: VerbForm;
};

export type LexicalProps = LexicalFeatures &
  MiscLexicalProps & {
    lemma?: string;
  };

export type FusedFragment = {
  fragment: string;
  fullWord: string;
  information: LexicalProps;
};

export type Fused = FusedFragment[];

export type PrepPairs = {
  [word: string]: PosWeights;
};

export type StaticMiscProps = {
  f?: number;
  fused?: Fused;
  isUnit?: boolean;
  isOpaque?: boolean;
  pos?: PosWeights;
  prepPairs?: PrepPairs;
};

export type MiscLexicalProps = StaticMiscProps;

export type ParentDirection = "L" | "R";

export type MiscContextProps = {
  at: number;
  pos: PosWeights;
  parentDirection?: ParentDirection;
};

export type MiscProps = MiscLexicalProps & MiscContextProps;

export type Token = {
  id: number;
  form: string;
  lemma?: string;
  misc: MiscProps;
  feats: LexicalFeatures;
};

export type PartiallyParsedToken = Token & {
  xpos?: ContextualPosTag;
  isDisambiguated?: boolean;
};

type ParsedTokenMisc = StaticMiscProps &
  MiscContextProps & {
    children: number[];
  };

export type ParsedToken = {
  id: number;
  form: string;
  lemma?: string;
  feats: LexicalFeatures;
  xpos: PosTag;
  head: number;
  isDisambiguated?: boolean;
  misc: ParsedTokenMisc;
};

export type TaggedToken = Token & {
  xpos: PosTag;
  head?: number;
};

export type Dictionary = Map<string, LexicalProps>;

export type FeatureMap = {
  [feature: string]: number;
};

export type FeatureWeights = {
  [feature: string]: PosWeights;
};

export type TokenMatcher = (
  token: PartiallyParsedToken,
  child: number,
  tokens: PartiallyParsedToken[],
) => boolean;

export type ParseState = {
  tokens: PartiallyParsedToken[];
  stack: number[];
  heads: number[];
};

export type Step = {
  index: number;
  xpos: PosTag;
  parentDirection?: ParentDirection;
};

export type ConfusionMatrix = {
  [posTag in PosTag]?: {
    [posTag in PosTag]?: number;
  };
};

export type SurfaceLexicalFeatures = {
  lemma: string;
  pos: PosWeights;
  feats?: LexicalFeatures;
};
