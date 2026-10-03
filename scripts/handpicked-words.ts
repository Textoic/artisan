import type { LexicalProps } from "../src/types.js";

type HandpickedEntry = {
  form: string;
  synonyms?: string[];
  plurals?: string[];
  keepsItsWeights?: boolean;
  fields?: LexicalProps;
};

const potenciesOf10From100: HandpickedEntry[] = [
  {
    form: "hundred",
    plurals: ["hundreds"],
  },
  {
    form: "thousand",
    synonyms: ["k"],
    plurals: ["thousands"],
  },
  {
    form: "million",
    synonyms: ["M"],
    plurals: ["millions"],
  },
  {
    form: "billion",
    plurals: ["billions"],
  },
  {
    form: "trillion",
    plurals: ["trillions"],
  },
  {
    form: "quadrillion",
    plurals: ["quadrillions"],
  },
  {
    form: "quintillion",
    plurals: ["quintillions"],
  },
  {
    form: "sextillion",
    plurals: ["sextillions"],
  },
];

const numberWords1To99 = [
  "zero",
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
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
  "twentyone",
  "twentytwo",
  "twentythree",
  "twentyfour",
  "twentyfive",
  "twentysix",
  "twentyseven",
  "twentyeight",
  "twentynine",
  "thirty",
  "thirtyone",
  "thirtytwo",
  "thirtythree",
  "thirtyfour",
  "thirtyfive",
  "thirtysix",
  "thirtyseven",
  "thirtyeight",
  "thirtynine",
  "forty",
  "fortyone",
  "fortytwo",
  "fortythree",
  "fortyfour",
  "fortyfive",
  "fortysix",
  "fortyseven",
  "fortyeight",
  "fortynine",
  "fifty",
  "fiftyone",
  "fiftytwo",
  "fiftythree",
  "fiftyfour",
  "fiftyfive",
  "fiftysix",
  "fiftyseven",
  "fiftyeight",
  "fiftynine",
  "sixty",
  "sixtyone",
  "sixtytwo",
  "sixtythree",
  "sixtyfour",
  "sixtyfive",
  "sixtysix",
  "sixtyseven",
  "sixtyeight",
  "sixtynine",
  "seventy",
  "seventyone",
  "seventytwo",
  "seventythree",
  "seventyfour",
  "seventyfive",
  "seventysix",
  "seventyseven",
  "seventyeight",
  "seventynine",
  "eighty",
  "eightyone",
  "eightytwo",
  "eightythree",
  "eightyfour",
  "eightyfive",
  "eightysix",
  "eightyseven",
  "eightyeight",
  "eightynine",
  "ninety",
  "ninetyone",
  "ninetytwo",
  "ninetythree",
  "ninetyfour",
  "ninetyfive",
  "ninetysix",
  "ninetyseven",
  "ninetyeight",
  "ninetynine",
];

const numbers1To99: HandpickedEntry[] = numberWords1To99.map((form, value) => ({
  form,
  synonyms: [`${value}`],
  plurals: [],
}));

const otherCardinals: HandpickedEntry[] = [
  {
    form: "forty",
    synonyms: ["fourty"],
  },
  {
    form: "fortyone",
    synonyms: ["fourtyone"],
  },
  {
    form: "fortytwo",
    synonyms: ["fourtytwo"],
  },
  {
    form: "fortythree",
    synonyms: ["fourtythree"],
  },
  {
    form: "fortyfour",
    synonyms: ["fourtyfour"],
  },
  {
    form: "fortyfive",
    synonyms: ["fourtyfive"],
  },
  {
    form: "fortysix",
    synonyms: ["fourtysix"],
  },
  {
    form: "fortyseven",
    synonyms: ["fourtyseven"],
  },
  {
    form: "fortyeight",
    synonyms: ["fourtyeight"],
  },
  {
    form: "fortynine",
    synonyms: ["fourtynine"],
  },
  {
    form: "half",
    plurals: ["halves"],
  },
  {
    form: "quarter",
    plurals: ["halves"],
  },
];

const cardinals = [
  ...potenciesOf10From100,
  ...numbers1To99,
  ...otherCardinals,
].map(({ form, fields, plurals = [`${form}s`], ...other }) => ({
  form,
  fields: {
    ...fields,
    pos: { NOUN: 1, ADJ: 1 },
    NumType: "Card",
  },
  plurals,
  ...other,
}));

const ordinalWords1To99 = [
  "zeroth",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
  "thirteenth",
  "fourteenth",
  "fifteenth",
  "sixteenth",
  "seventeenth",
  "eighteenth",
  "nineteenth",
  "twentieth",
  "twentyfirst",
  "twentysecond",
  "twentythird",
  "twentyfourth",
  "twentyfifth",
  "twentysixth",
  "twentyseventh",
  "twentyeighth",
  "twentyninth",
  "thirtieth",
  "thirtyfirst",
  "thirtysecond",
  "thirtythird",
  "thirtyfourth",
  "thirtyfifth",
  "thirtysixth",
  "thirtyseventh",
  "thirtyeighth",
  "thirtyninth",
  "fortieth",
  "fortyfirst",
  "fortysecond",
  "fortythird",
  "fortyfourth",
  "fortyfifth",
  "fortysixth",
  "fortyseventh",
  "fortyeighth",
  "fortyninth",
  "fiftieth",
  "fiftyfirst",
  "fiftysecond",
  "fiftythird",
  "fiftyfourth",
  "fiftyfifth",
  "fiftysixth",
  "fiftyseventh",
  "fiftyeighth",
  "fiftyninth",
  "sixtieth",
  "sixtyfirst",
  "sixtysecond",
  "sixtythird",
  "sixtyfourth",
  "sixtyfifth",
  "sixtysixth",
  "sixtyseventh",
  "sixtyeighth",
  "sixtyninth",
  "seventieth",
  "seventyfirst",
  "seventysecond",
  "seventythird",
  "seventyfourth",
  "seventyfifth",
  "seventysixth",
  "seventyseventh",
  "seventyeighth",
  "seventyninth",
  "eightieth",
  "eightyfirst",
  "eightysecond",
  "eightythird",
  "eightyfourth",
  "eightyfifth",
  "eightysixth",
  "eightyseventh",
  "eightyeighth",
  "eightyninth",
  "ninetieth",
  "ninetyfirst",
  "ninetysecond",
  "ninetythird",
  "ninetyfourth",
  "ninetyfifth",
  "ninetysixth",
  "ninetyseventh",
  "ninetyeighth",
  "ninetyninth",
];

const tenPotenciesOrdinals: HandpickedEntry[] = potenciesOf10From100.map(
  ({ form }) => ({ form: `${form}th` }),
);

const ordinals1To99: HandpickedEntry[] = ordinalWords1To99.map((form) => ({
  form,
}));

const otherOrdinals = [
  {
    form: "fortieth",
    synonyms: ["fourtieth"],
  },
  {
    form: "fortyfirst",
    synonyms: ["fourtyfirst"],
  },
  {
    form: "fortysecond",
    synonyms: ["fourtysecond"],
  },
  {
    form: "fortythird",
    synonyms: ["fourtythird"],
  },
  {
    form: "fortyfourth",
    synonyms: ["fourtyfourth"],
  },
  {
    form: "fortyfifth",
    synonyms: ["fourtyfifth"],
  },
  {
    form: "fortysixth",
    synonyms: ["fourtysixth"],
  },
  {
    form: "fortyseventh",
    synonyms: ["fourtyseventh"],
  },
  {
    form: "fortyeighth",
    synonyms: ["fourtyeighth"],
  },
  {
    form: "fortyninth",
    synonyms: ["fourtyninth"],
  },
] as HandpickedEntry[];

const ordinals = [
  ...tenPotenciesOrdinals,
  ...ordinals1To99,
  ...otherOrdinals,
].map(({ form, fields, ...other }) => ({
  form,
  fields: {
    ...fields,
    pos: { NOUN: 1, ADJ: 1 },
    NumType: "Ord",
  },
  plurals: [`${form}s`],
  ...other,
}));

const numbers = [...cardinals, ...ordinals];

const lengthUnits = [
  {
    form: "yottameter",
    fields: {
      isUnit: true,
    },
    plurals: ["yottameters", "yottametres"],
    synonyms: ["yottametre", "Ym"],
  },
  {
    form: "zettameter",
    fields: {
      isUnit: true,
    },
    plurals: ["zettametres", "zettameters"],
    synonyms: ["zettametre", "Zm"],
  },
  {
    form: "exameter",
    fields: {
      isUnit: true,
    },
    plurals: ["exametres", "exameters"],
    synonyms: ["exametre", "Em"],
  },
  {
    form: "petameter",
    fields: {
      isUnit: true,
    },
    plurals: ["petametres", "petameters"],
    synonyms: ["petametre", "Pm"],
  },
  {
    form: "terameter",
    fields: {
      isUnit: true,
    },
    plurals: ["terametres", "terameters"],
    synonyms: ["terametre", "Tm"],
  },
  {
    form: "gigameter",
    fields: {
      isUnit: true,
    },
    plurals: ["gigametres", "gigameters"],
    synonyms: ["gigametre", "Gm"],
  },
  {
    form: "megameter",
    fields: {
      isUnit: true,
    },
    plurals: ["megametres", "megameters"],
    synonyms: ["megametre", "Mm"],
  },
  {
    form: "kilometer",
    fields: {
      isUnit: true,
    },
    plurals: ["kilometres", "kilometers"],
    synonyms: ["kilometre", "km"],
  },
  {
    form: "hectometer",
    fields: {
      isUnit: true,
    },
    plurals: ["hectometres", "hectometers"],
    synonyms: ["hectometre", "hm"],
  },
  {
    form: "decameter",
    fields: {
      isUnit: true,
    },
    plurals: ["decametres", "decameters"],
    synonyms: ["decametre", "dam"],
  },
  {
    form: "meter",
    fields: {
      isUnit: true,
    },
    plurals: ["meters", "metres"],
    synonyms: ["metre", "m"],
  },
  {
    form: "decimeter",
    fields: {
      isUnit: true,
    },
    plurals: ["decimetres", "decimeters"],
    synonyms: ["decimetre", "dm"],
  },
  {
    form: "centimeter",
    fields: {
      isUnit: true,
    },
    plurals: ["centimetres", "centimeters"],
    synonyms: ["centimetre", "cm"],
  },
  {
    form: "millimeter",
    fields: {
      isUnit: true,
    },
    plurals: ["millimetres", "millimeters"],
    synonyms: ["millimetre", "mm"],
  },
  {
    form: "micrometer",
    fields: {
      isUnit: true,
    },
    plurals: ["micrometres", "micrometers"],
    synonyms: ["micrometre", "μm"],
  },
  {
    form: "nanometer",
    fields: {
      isUnit: true,
    },
    plurals: ["nanometres", "nanometers"],
    synonyms: ["nanometre", "nm"],
  },
  {
    form: "picometer",
    fields: {
      isUnit: true,
    },
    plurals: ["picometres", "picometers"],
    synonyms: ["picometre", "pm"],
  },
  {
    form: "femtometer",
    fields: {
      isUnit: true,
    },
    plurals: ["femtometres", "femtometers"],
    synonyms: ["femtometre", "fm"],
  },
  {
    form: "attometer",
    fields: {
      isUnit: true,
    },
    plurals: ["attometres", "attometers"],
    synonyms: ["attometre", "am"],
  },
  {
    form: "zeptometer",
    fields: {
      isUnit: true,
    },
    plurals: ["zeptometres", "zeptometers"],
    synonyms: ["zeptometre", "zm"],
  },
  {
    form: "yoctometer",
    fields: {
      isUnit: true,
    },
    plurals: ["yoctometres", "yoctometers"],
    synonyms: ["yoctometre", "ym"],
  },
  {
    form: "angstrom",
    fields: {
      isUnit: true,
    },
    plurals: ["angstroms", "ångströms"],
    synonyms: ["Å", "Å", "ångström"],
  },
  {
    form: "inch",
    fields: {
      isUnit: true,
    },
    plurals: ["inches"],
    synonyms: ["′"],
  },
  {
    form: "foot",
    fields: {
      isUnit: true,
    },
    plurals: ["feet"],
    synonyms: ["ft", "fts"],
  },
  {
    form: "yard",
    fields: {
      isUnit: true,
    },
    plurals: ["yards"],
    synonyms: ["yd", "yds"],
  },
  {
    form: "astronomicalunit",
    fields: {
      isUnit: true,
    },
    plurals: ["astronomicalunits"],
    synonyms: ["au", "ua"],
  },
  {
    form: "mile",
    fields: {
      isUnit: true,
    },
    plurals: ["miles"],
    synonyms: ["mi"],
  },
];

const areaSymbolUnits = [
  {
    form: "Ym²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Zm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Em²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Pm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Tm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Gm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Mm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "km²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "hm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "dam²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "m²",
    fields: { isUnit: true },
  },
  {
    form: "dm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "cm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "mm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "μm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "nm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "pm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "fm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "am²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "zm²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "ym²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Å²",
    fields: {
      isUnit: true,
    },
    synonyms: ["Å²"],
  },
  {
    form: "in²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "ft²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "yd²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "ua²",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "mi²",
    fields: {
      isUnit: true,
    },
  },
];

const closedClassAreaUnits = [
  {
    form: "barn",
    fields: {
      isUnit: true,
    },
    plurals: ["barns"],
  },
  {
    form: "hectare",
    fields: {
      isUnit: true,
    },
    plurals: ["hectares"],
  },
  {
    form: "acre",
    fields: {
      isUnit: true,
    },
    plurals: ["acres"],
  },
];

const areaUnits = [...closedClassAreaUnits, ...areaSymbolUnits];

const closedClassVolumeUnits = [
  {
    form: "liter",
    fields: {
      isUnit: true,
    },
    plurals: ["liters", "liters"],
    synonyms: ["litre", "l", "L"],
  },
  {
    form: "pint",
    fields: {
      isUnit: true,
    },
    plurals: ["pints"],
  },
  {
    form: "gallon",
    fields: {
      isUnit: true,
    },
    plurals: ["gallons"],
  },
];

const volumeSymbolUnits = [
  {
    form: "Ym³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Zm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Em³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Pm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Tm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Gm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Mm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "km³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "hm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "dam³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "m³",
    fields: { isUnit: true },
  },
  {
    form: "dm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "cm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "mm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "μm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "nm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "pm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "fm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "am³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "zm³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "ym³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Å³",
    fields: {
      isUnit: true,
    },
    synonyms: ["Å³"],
  },
  {
    form: "in³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "ft³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "yd³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "ua³",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "mi³",
    fields: {
      isUnit: true,
    },
  },
];

const volumeUnits = [...closedClassVolumeUnits, ...volumeSymbolUnits];

const unitTemperatures = [
  {
    form: "celsius",
    fields: {
      isUnit: true,
    },
    synonyms: ["°C", "℃"],
  },
  {
    form: "fahrenheit",
    fields: {
      isUnit: true,
    },
    synonyms: ["°F", "℉"],
  },
  {
    form: "kelvin",
    fields: {
      isUnit: true,
    },
    synonyms: ["K"],
  },
];

const massUnits = [
  {
    form: "pound",
    fields: {
      isUnit: true,
    },
    plurals: ["pounds", "lbs"],
    synonyms: ["lb"],
  },
  {
    form: "yottagram",
    fields: {
      isUnit: true,
    },
    plurals: ["yottagrammes", "yottagrams"],
    synonyms: ["yottagramme", "Yg"],
  },
  {
    form: "zettagram",
    fields: {
      isUnit: true,
    },
    plurals: ["zettagrammes", "zettagrams"],
    synonyms: ["zettagramme", "Zg"],
  },
  {
    form: "exagram",
    fields: {
      isUnit: true,
    },
    plurals: ["exagrammes", "exagrams"],
    synonyms: ["exagramme", "Eg"],
  },
  {
    form: "petagram",
    fields: {
      isUnit: true,
    },
    plurals: ["petagrammes", "petagrams"],
    synonyms: ["petagramme", "Pg"],
  },
  {
    form: "teragram",
    fields: {
      isUnit: true,
    },
    plurals: ["teragrammes", "teragrams"],
    synonyms: ["teragramme", "Tg"],
  },
  {
    form: "gigagram",
    fields: {
      isUnit: true,
    },
    plurals: ["gigagrammes", "gigagrams"],
    synonyms: ["gigagramme", "Gg"],
  },
  {
    form: "megagram",
    fields: {
      isUnit: true,
    },
    plurals: ["megagrammes", "megagrams"],
    synonyms: ["megagramme", "Mg"],
  },
  {
    form: "kilogram",
    fields: {
      isUnit: true,
    },
    plurals: ["kilos", "kgs"],
    synonyms: ["kilo", "kg"],
  },
  {
    form: "hectogram",
    fields: {
      isUnit: true,
    },
    plurals: ["hectogrammes", "hectograms"],
    synonyms: ["hectogramme", "hg"],
  },
  {
    form: "decagram",
    fields: {
      isUnit: true,
    },
    plurals: ["decagrammes", "decagrams"],
    synonyms: ["decagramme", "dag"],
  },
  {
    form: "gram",
    fields: {
      isUnit: true,
    },
    plurals: ["grammes"],
    synonyms: ["gramme", "g"],
  },
  {
    form: "decigram",
    fields: {
      isUnit: true,
    },
    plurals: ["decigrammes", "decigrams"],
    synonyms: ["decigramme", "dg"],
  },
  {
    form: "centigram",
    fields: {
      isUnit: true,
    },
    plurals: ["centigrammes", "centigrams"],
    synonyms: ["centigramme", "cg"],
  },
  {
    form: "milligram",
    fields: {
      isUnit: true,
    },
    plurals: ["milligrammes", "milligrams"],
    synonyms: ["milligramme", "mg"],
  },
  {
    form: "microgram",
    fields: {
      isUnit: true,
    },
    plurals: ["microgrammes", "micrograms"],
    synonyms: ["microgramme", "μg"],
  },
  {
    form: "nanogram",
    fields: {
      isUnit: true,
    },
    plurals: ["nanogrammes", "nanograms"],
    synonyms: ["nanogramme", "ng"],
  },
  {
    form: "picogram",
    fields: {
      isUnit: true,
    },
    plurals: ["nanogrammes", "nanograms"],
    synonyms: ["picogramme", "nanogrammes", "nanograms", "pg"],
  },
  {
    form: "femtogram",
    fields: {
      isUnit: true,
    },
    plurals: ["femtogrammes", "femtograms"],
    synonyms: ["femtogramme", "fg"],
  },
  {
    form: "attogram",
    fields: {
      isUnit: true,
    },
    plurals: ["attogrammes", "attograms"],
    synonyms: ["attogramme", "ag"],
  },
  {
    form: "zeptogram",
    fields: {
      isUnit: true,
    },
    plurals: ["attogrammes", "attograms"],
    synonyms: ["zeptogramme", "attogrammes", "attograms", "zg"],
  },
  {
    form: "yoctogram",
    fields: {
      isUnit: true,
    },
    plurals: ["yoctogrammes", "yoctograms"],
    synonyms: ["yoctogramme", "yg"],
  },
  {
    form: "yottatonne",
    fields: {
      isUnit: true,
    },
    plurals: ["yottatons", "yottatonnes"],
    synonyms: ["yottaton", "Yt"],
  },
  {
    form: "zettatonne",
    fields: {
      isUnit: true,
    },
    plurals: ["zettatons", "zettatonnes"],
    synonyms: ["zettaton", "Zt"],
  },
  {
    form: "exatonne",
    fields: {
      isUnit: true,
    },
    plurals: ["exatons", "exatonnes"],
    synonyms: ["exaton", "Et"],
  },
  {
    form: "petatonne",
    fields: {
      isUnit: true,
    },
    plurals: ["petatons", "petatonnes"],
    synonyms: ["petaton", "Pt"],
  },
  {
    form: "teratonne",
    fields: {
      isUnit: true,
    },
    plurals: ["teratons", "teratonnes"],
    synonyms: ["teraton", "Tt"],
  },
  {
    form: "gigatonne",
    fields: {
      isUnit: true,
    },
    plurals: ["gigatons", "gigatonnes"],
    synonyms: ["gigaton", "Gt"],
  },
  {
    form: "megatonne",
    fields: {
      isUnit: true,
    },
    plurals: ["megatons", "megatonnes"],
    synonyms: ["megaton", "Mt"],
  },
  {
    form: "kilotonne",
    fields: {
      isUnit: true,
    },
    plurals: ["kilotons", "kilotonnes"],
    synonyms: ["kiloton", "kt"],
  },
  {
    form: "hectotonne",
    fields: {
      isUnit: true,
    },
    plurals: ["hectotons", "hectotonnes"],
    synonyms: ["hectoton", "ht"],
  },
  {
    form: "decatonne",
    fields: {
      isUnit: true,
    },
    plurals: ["decatons", "decatonnes"],
    synonyms: ["decaton", "dat"],
  },
  {
    form: "tonne",
    fields: {
      isUnit: true,
    },
    plurals: ["tons", "tonnes"],
    synonyms: ["ton", "t"],
  },
];

const speedUnits = [
  {
    form: "meterssecond",
    fields: {
      isUnit: true,
    },
    synonyms: ["mps"],
  },
  {
    form: "kilometershour",
    fields: {
      isUnit: true,
    },
    synonyms: ["kph", "kmph"],
  },
  {
    form: "mileshour",
    fields: {
      isUnit: true,
    },
    synonyms: ["mph"],
  },
  {
    form: "knot",
    fields: {
      isUnit: true,
    },
    plurals: ["knots"],
    synonyms: ["kn", "kt"],
  },
  {
    form: "feetsecond",
    fields: {
      isUnit: true,
    },
    synonyms: ["fps"],
  },
];

const informationUnits = [
  {
    form: "yottabit",
    fields: {
      isUnit: true,
    },
    plurals: ["yottabits"],
    synonyms: ["Yb"],
  },
  {
    form: "zettabit",
    fields: {
      isUnit: true,
    },
    plurals: ["zettabits"],
    synonyms: ["Zb"],
  },
  {
    form: "exabit",
    fields: {
      isUnit: true,
    },
    plurals: ["exabits"],
    synonyms: ["Eb"],
  },
  {
    form: "petabit",
    fields: {
      isUnit: true,
    },
    plurals: ["petabits"],
    synonyms: ["Pb"],
  },
  {
    form: "terabit",
    fields: {
      isUnit: true,
    },
    plurals: ["terabits"],
    synonyms: ["Tb"],
  },
  {
    form: "gigabit",
    fields: {
      isUnit: true,
    },
    plurals: ["gigabits"],
    synonyms: ["Gb"],
  },
  {
    form: "megabit",
    fields: {
      isUnit: true,
    },
    plurals: ["megabits"],
    synonyms: ["Mb"],
  },
  {
    form: "kilobit",
    fields: {
      isUnit: true,
    },
    plurals: ["kilobits"],
    synonyms: ["kb"],
  },
  {
    form: "hectobit",
    fields: {
      isUnit: true,
    },
    plurals: ["hectobits"],
    synonyms: ["hb"],
  },
  {
    form: "decabit",
    fields: {
      isUnit: true,
    },
    plurals: ["decabits"],
    synonyms: ["dab"],
  },
  {
    form: "bit",
    fields: {
      isUnit: true,
    },
    plurals: ["bits"],
    synonyms: ["b"],
  },
  {
    form: "kibibit",
    fields: {
      isUnit: true,
    },
    plurals: ["kibibits"],
    synonyms: ["Kib"],
  },
  {
    form: "mebibit",
    fields: {
      isUnit: true,
    },
    plurals: ["mebibits"],
    synonyms: ["Mib"],
  },
  {
    form: "gibibit",
    fields: {
      isUnit: true,
    },
    plurals: ["gibibits"],
    synonyms: ["Gib"],
  },
  {
    form: "tebibit",
    fields: {
      isUnit: true,
    },
    plurals: ["tebibits"],
    synonyms: ["Tib"],
  },
  {
    form: "pebibit",
    fields: {
      isUnit: true,
    },
    plurals: ["pebibits"],
    synonyms: ["Pib"],
  },
  {
    form: "exbibit",
    fields: {
      isUnit: true,
    },
    plurals: ["exbibits"],
    synonyms: ["Eib"],
  },
  {
    form: "zebibit",
    fields: {
      isUnit: true,
    },
    plurals: ["zebibits"],
    synonyms: ["Zib"],
  },
  {
    form: "yobibit",
    fields: {
      isUnit: true,
    },
    plurals: ["yobibits"],
    synonyms: ["Yib"],
  },
  {
    form: "yottabyte",
    fields: {
      isUnit: true,
    },
    plurals: ["yottabytes"],
    synonyms: ["YB"],
  },
  {
    form: "zettabyte",
    fields: {
      isUnit: true,
    },
    plurals: ["zettabytes"],
    synonyms: ["ZB"],
  },
  {
    form: "exabyte",
    fields: {
      isUnit: true,
    },
    plurals: ["exabytes"],
    synonyms: ["EB"],
  },
  {
    form: "petabyte",
    fields: {
      isUnit: true,
    },
    plurals: ["petabytes"],
    synonyms: ["PB"],
  },
  {
    form: "terabyte",
    fields: {
      isUnit: true,
    },
    plurals: ["terabytes"],
    synonyms: ["TB"],
  },
  {
    form: "gigabyte",
    fields: {
      isUnit: true,
    },
    plurals: ["gigabytes"],
    synonyms: ["GB"],
  },
  {
    form: "megabyte",
    fields: {
      isUnit: true,
    },
    plurals: ["megabytes"],
    synonyms: ["MB"],
  },
  {
    form: "kilobyte",
    fields: {
      isUnit: true,
    },
    plurals: ["kilobytes"],
    synonyms: ["kB"],
  },
  {
    form: "hectobyte",
    fields: {
      isUnit: true,
    },
    plurals: ["hectobytes"],
    synonyms: ["hB"],
  },
  {
    form: "decabyte",
    fields: {
      isUnit: true,
    },
    plurals: ["decabytes"],
    synonyms: ["daB"],
  },
  {
    form: "byte",
    fields: {
      isUnit: true,
    },
    plurals: ["bytes"],
    synonyms: ["B"],
  },
  {
    form: "kibibyte",
    fields: {
      isUnit: true,
    },
    plurals: ["kibibytes"],
    synonyms: ["KiB"],
  },
  {
    form: "mebibyte",
    fields: {
      isUnit: true,
    },
    plurals: ["mebibytes"],
    synonyms: ["MiB"],
  },
  {
    form: "gibibyte",
    fields: {
      isUnit: true,
    },
    plurals: ["gibibytes"],
    synonyms: ["GiB"],
  },
  {
    form: "tebibyte",
    fields: {
      isUnit: true,
    },
    plurals: ["tebibytes"],
    synonyms: ["TiB"],
  },
  {
    form: "pebibyte",
    fields: {
      isUnit: true,
    },
    plurals: ["pebibytes"],
    synonyms: ["PiB"],
  },
  {
    form: "exbibyte",
    fields: {
      isUnit: true,
    },
    plurals: ["exbibytes"],
    synonyms: ["EiB"],
  },
  {
    form: "zebibyte",
    fields: {
      isUnit: true,
    },
    plurals: ["zebibytes"],
    synonyms: ["ZiB"],
  },
  {
    form: "yobibyte",
    fields: {
      isUnit: true,
    },
    plurals: ["yobibytes"],
    synonyms: ["YiB"],
  },
];

const dataTransferRateUnits = [
  {
    form: "Ybps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Zbps",
    fields: { isUnit: true },
  },
  {
    form: "Ebps",
    fields: { isUnit: true },
  },
  {
    form: "Pbps",
    fields: { isUnit: true },
  },
  {
    form: "Tbps",
    fields: { isUnit: true },
  },
  {
    form: "Gbps",
    fields: { isUnit: true },
  },
  {
    form: "Mbps",
    fields: { isUnit: true },
  },
  {
    form: "kbps",
    fields: { isUnit: true },
  },
  {
    form: "hbps",
    fields: { isUnit: true },
  },
  {
    form: "dabps",
    fields: { isUnit: true },
  },
  {
    form: "bps",
    fields: { isUnit: true },
  },
  {
    form: "Kibps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Mibps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Gibps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Tibps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Pibps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Eibps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Zibps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Yibps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "YBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "ZBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "EBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "PBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "TBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "GBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "MBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "kBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "hBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "daBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "Bps",
    fields: { isUnit: true },
  },
  {
    form: "KiBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "MiBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "GiBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "TiBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "PiBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "EiBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "ZiBps",
    fields: {
      isUnit: true,
    },
  },
  {
    form: "YiBps",
    fields: {
      isUnit: true,
    },
  },
];

const angleUnits = [
  {
    form: "degree",
    fields: {
      isUnit: true,
    },
    plurals: ["degrees"],
    synonyms: ["arcdegree", "°"],
  },
  {
    form: "arcminute",
    fields: {
      isUnit: true,
    },
    plurals: ["arcminutes"],
    synonyms: ["′", "arcmin"],
  },
  {
    form: "arcsecond",
    fields: {
      isUnit: true,
    },
    plurals: ["arcseconds"],
    synonyms: ["′′", "arcsec"],
  },
  {
    form: "gradian",
    fields: {
      isUnit: true,
    },
    plurals: ["gradians"],
    synonyms: ["grad"],
  },
  {
    form: "radian",
    fields: {
      isUnit: true,
    },
    plurals: ["radians"],
    synonyms: ["rad"],
  },
  {
    form: "milliradian",
    fields: {
      isUnit: true,
    },
    plurals: ["milliradians"],
    synonyms: ["millirad"],
  },
];

const timeUnits = [
  {
    form: "yottasecond",
    fields: { isUnit: true },
    plurals: ["yottaseconds"],
    synonyms: ["Ys"],
  },
  {
    form: "zettasecond",
    fields: { isUnit: true },
    plurals: ["zettaseconds"],
    synonyms: ["Zs"],
  },
  {
    form: "exasecond",
    fields: { isUnit: true },
    plurals: ["exaseconds"],
    synonyms: ["Es"],
  },
  {
    form: "petasecond",
    fields: { isUnit: true },
    plurals: ["petaseconds"],
    synonyms: ["Ps"],
  },
  {
    form: "terasecond",
    fields: { isUnit: true },
    plurals: ["teraseconds"],
    synonyms: ["Ts"],
  },
  {
    form: "gigasecond",
    fields: { isUnit: true },
    plurals: ["gigaseconds"],
    synonyms: ["Gs"],
  },
  {
    form: "megasecond",
    fields: { isUnit: true },
    plurals: ["megaseconds"],
    synonyms: ["Ms"],
  },
  {
    form: "kilosecond",
    fields: { isUnit: true },
    plurals: ["kiloseconds"],
    synonyms: ["ks"],
  },
  {
    form: "hectosecond",
    fields: { isUnit: true },
    plurals: ["hectoseconds"],
    synonyms: ["hs"],
  },
  {
    form: "decasecond",
    fields: { isUnit: true },
    plurals: ["decaseconds"],
    synonyms: ["das"],
  },
  {
    form: "second",
    fields: {
      isUnit: true,
    },
    plurals: ["seconds"],
    synonyms: ["s"],
  },
  {
    form: "decisecond",
    fields: { isUnit: true },
    plurals: ["deciseconds"],
    synonyms: ["ds"],
  },
  {
    form: "centisecond",
    fields: { isUnit: true },
    plurals: ["centiseconds"],
    synonyms: ["cs"],
  },
  {
    form: "millisecond",
    fields: { isUnit: true },
    plurals: ["milliseconds"],
    synonyms: ["ms"],
  },
  {
    form: "microsecond",
    fields: { isUnit: true },
    plurals: ["microseconds"],
    synonyms: ["μs"],
  },
  {
    form: "nanosecond",
    fields: { isUnit: true },
    plurals: ["nanoseconds"],
    synonyms: ["ns"],
  },
  {
    form: "picosecond",
    fields: {
      isUnit: true,
    },
    plurals: ["picoseconds"],
    synonyms: ["ps"],
  },
  {
    form: "femtosecond",
    fields: {
      isUnit: true,
    },
    plurals: ["femtoseconds"],
    synonyms: ["fs"],
  },
  {
    form: "zeptosecond",
    fields: {
      isUnit: true,
    },
    plurals: ["zeptoseconds"],
    synonyms: ["zs"],
  },
  {
    form: "yoctosecond",
    fields: {
      isUnit: true,
    },
    plurals: ["yoctoseconds"],
    synonyms: ["ys"],
  },
  {
    form: "Svedberg",
    fields: {
      isUnit: true,
    },
    plurals: ["Svedbergs"],
  },
  {
    form: "minute",
    fields: {
      isUnit: true,
    },
    plurals: ["minutes"],
  },
  {
    form: "hour",
    fields: { isUnit: true },
    plurals: ["hours"],
  },
  {
    form: "day",
    fields: { isUnit: true },
    plurals: ["days"],
  },
  {
    form: "week",
    fields: {
      isUnit: true,
    },
    plurals: ["weeks"],
  },
  {
    form: "month",
    fields: {
      isUnit: true,
    },
    plurals: ["months"],
  },
  {
    form: "year",
    fields: {
      isUnit: true,
    },
    plurals: ["years"],
  },
  {
    form: "biennium",
    fields: {
      isUnit: true,
    },
    plurals: ["bienniums"],
  },
  {
    form: "triennium",
    fields: {
      isUnit: true,
    },
    plurals: ["trienniums"],
  },
  {
    form: "quadriennium",
    fields: {
      isUnit: true,
    },
    plurals: ["quadrienniums"],
    synonyms: ["olympiad"],
  },
  {
    form: "lustrum",
    fields: {
      isUnit: true,
    },
    plurals: ["lustrums"],
  },
  {
    form: "decade",
    fields: {
      isUnit: true,
    },
    plurals: ["decades"],
  },
  {
    form: "century",
    fields: {
      isUnit: true,
    },
    plurals: ["centuries"],
  },
  {
    form: "millennium",
    fields: {
      isUnit: true,
    },
    plurals: ["millennia", "millenniums"],
  },
  {
    form: "epoch",
    fields: {
      isUnit: true,
    },
    plurals: ["epochs"],
  },
  {
    form: "eon",
    fields: {
      isUnit: true,
    },
    plurals: ["eons"],
  },
];

const units = [
  ...lengthUnits,
  ...areaUnits,
  ...volumeUnits,
  ...massUnits,
  ...angleUnits,
  ...timeUnits,
  ...informationUnits,
  ...dataTransferRateUnits,
  ...speedUnits,
  ...unitTemperatures,
].map(({ form, fields, ...other }) => ({
  form,
  fields: {
    ...fields,
    pos: { NOUN: 1 },
  },
  ...other,
}));

const monthNames: HandpickedEntry[] = [
  {
    form: "January",
    synonyms: ["jan", "january"],
  },
  {
    form: "February",
    synonyms: ["feb", "february"],
  },
  {
    form: "March",
  },
  {
    form: "April",
    synonyms: ["apr", "april"],
  },
  {
    form: "May",
  },
  {
    form: "June",
    synonyms: ["june"],
  },
  {
    form: "July",
    synonyms: ["july"],
  },
  {
    form: "August",
    synonyms: ["aug", "august"],
  },
  {
    form: "September",
    synonyms: ["sep", "september"],
  },
  {
    form: "October",
    synonyms: ["oct", "october"],
  },
  {
    form: "November",
    synonyms: ["nov", "november"],
  },
  {
    form: "December",
    synonyms: ["dec", "december"],
  },
];

const months = monthNames.map(({ form, fields, ...other }) => ({
  form,
  fields: {
    ...fields,
    pos: { NOUN: 1 },
  },
  ...other,
}));

const currencies = [
  {
    form: "dollar",
    fields: {
      Number: "Sing",
    },
    synonyms: ["dolla", "usd"],
    plurals: ["dollas", "dollars"],
  },
].map(({ form, fields, ...other }) => ({
  form,
  fields: {
    ...fields,
    pos: { NOUN: 1 },
  },
  ...other,
}));

const otherVerbs = [
  {
    form: "be",
    fields: {
      pos: { VERB: 1 },
      lemma: "be",
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Sing",
    },
    synonyms: ["b"],
  },
  {
    form: "am",
    fields: {
      pos: { VERB: 1 },
      lemma: "be",
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Sing",
    },
    synonyms: ["'m"],
  },
  {
    form: "is",
    fields: {
      pos: { VERB: 1 },
      lemma: "be",
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Sing",
      Person: 3,
    },
    synonyms: ["isn"],
  },
  {
    form: "are",
    fields: {
      pos: { VERB: 1 },
      lemma: "be",
      VerbForm: "Fin",
      Tense: "Pres",
      Person: 2,
    },
    synonyms: ["r", "ain", "'re"],
  },
  {
    form: "was",
    fields: {
      pos: { VERB: 1 },
      lemma: "be",
      VerbForm: "Fin",
      Tense: "Past",
    },
    synonyms: ["wuz"],
  },
  {
    form: "were",
    fields: {
      pos: { VERB: 1 },
      lemma: "be",
      VerbForm: "Fin",
      Tense: "Past",
    },
  },
  {
    form: "been",
    fields: {
      pos: { VERB: 1 },
      lemma: "be",
      VerbForm: "Part",
      Tense: "Past",
    },
  },
  {
    form: "being",
    fields: {
      pos: { VERB: 1 },
      lemma: "be",
      VerbForm: "Part",
      Tense: "Pres",
    },
  },
  {
    form: "do",
    fields: {
      pos: { VERB: 1 },
      lemma: "do",
      VerbForm: "Fin",
      Tense: "Pres",
    },
  },
  {
    form: "does",
    fields: {
      pos: { VERB: 1 },
      lemma: "do",
      VerbForm: "Fin",
      Tense: "Pres",
      Person: 3,
    },
    synonyms: ["doesn"],
  },
  {
    form: "did",
    fields: {
      pos: { VERB: 1 },
      lemma: "do",
      VerbForm: "Fin",
      Tense: "Past",
    },
  },
  {
    form: "doing",
    fields: {
      pos: { VERB: 1 },
      lemma: "do",
      VerbForm: "Part",
      Tense: "Pres",
    },
  },
  {
    form: "done",
    fields: {
      pos: { VERB: 1, ADJ: 1 },
      lemma: "do",
      VerbForm: "Part",
      Tense: "Past",
    },
  },
  {
    form: "departed",
    fields: {
      pos: { VERB: 1, ADJ: 1 },
      lemma: "depart",
      Tense: "Past",
    },
  },
  {
    form: "see",
    fields: {
      pos: { VERB: 1 },
      lemma: "see",
      VerbForm: "Fin",
      Tense: "Pres",
    },
    synonyms: ["c"],
  },
  {
    form: "sees",
    fields: {
      pos: { VERB: 1 },
      lemma: "see",
      VerbForm: "Fin",
      Tense: "Pres",
      Person: 3,
    },
  },
  {
    form: "saw",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
      lemma: "see",
      VerbForm: "Fin",
      Tense: "Past",
    },
  },
  {
    form: "seeing",
    fields: {
      pos: { VERB: 1 },
      lemma: "see",
      VerbForm: "Part",
      Tense: "Pres",
    },
  },
  {
    form: "seen",
    fields: {
      pos: { VERB: 1, ADJ: 1 },
      lemma: "see",
      VerbForm: "Part",
      Tense: "Past",
    },
  },
  {
    form: "have",
    fields: {
      pos: { VERB: 1 },
      lemma: "have",
      VerbForm: "Fin",
      Tense: "Pres",
    },
    synonyms: ["hav", "'ve"],
  },
  {
    form: "has",
    fields: {
      pos: { VERB: 1 },
      lemma: "have",
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Sing",
      Person: 3,
    },
    synonyms: ["hast", "hath"],
  },
  {
    form: "know",
    fields: {
      pos: { VERB: 1 },
      lemma: "know",
      VerbForm: "Fin",
      Tense: "Pres",
    },
    synonyms: ["kno"],
  },
  {
    form: "due",
    fields: {
      pos: { VERB: 1 },
      lemma: "due",
      VerbForm: "Fin",
      Tense: "Pres",
    },
  },
  {
    form: "rather",
    fields: {
      lemma: "rather",
      pos: { VERB: 1, ADV: 1 },
      VerbForm: "Fin",
      Tense: "Pres",
    },
  },
  {
    form: "had",
    fields: {
      lemma: "have",
      pos: { VERB: 1 },
      VerbForm: "Fin",
      Tense: "Past",
    },
    synonyms: ["'d", "hadst"],
  },
  {
    form: "likes",
    fields: {
      lemma: "like",
      pos: { VERB: 1, NOUN: 1 },
      Number: "Plur",
      VerbForm: "Fin",
      Tense: "Pres",
      Person: 3,
    },
  },
  {
    form: "liked",
    fields: {
      lemma: "like",
      pos: { NOUN: 1, ADJ: 1, VERB: 1 },
      Tense: "Past",
    },
  },
  {
    form: "having",
    fields: {
      lemma: "have",
      pos: { VERB: 1 },
      VerbForm: "Part",
      Tense: "Pres",
    },
  },
  {
    form: "liking",
    fields: {
      lemma: "like",
      pos: { VERB: 1, NOUN: 1, ADJ: 1 },
      VerbForm: "Part",
      Tense: "Pres",
    },
  },
  {
    form: "paid",
    fields: {
      lemma: "pay",
      pos: { VERB: 1, ADJ: 1 },
      Tense: "Past",
    },
  },
  {
    form: "wit",
    fields: {
      pos: { VERB: 1 },
      lemma: "wit",
      VerbForm: "Fin",
      Tense: "Pres",
    },
  },
  {
    form: "wot",
    fields: {
      pos: { VERB: 1 },
      lemma: "wit",
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Sing",
    },
  },
  {
    form: "wost",
    fields: {
      pos: { VERB: 1 },
      lemma: "wit",
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Sing",
      Person: 2,
    },
    synonyms: ["wottest"],
  },
  {
    form: "wite",
    fields: {
      pos: { VERB: 1 },
      lemma: "wit",
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Plur",
    },
  },
  {
    form: "wist",
    fields: {
      pos: { VERB: 1 },
      lemma: "wit",
      Tense: "Past",
    },
  },
  {
    form: "wistest",
    fields: {
      pos: { VERB: 1 },
      lemma: "wit",
      VerbForm: "Fin",
      Tense: "Past",
      Number: "Plur",
      Person: 2,
    },
  },
  {
    form: "witting",
    fields: {
      pos: { VERB: 1 },
      lemma: "wit",
      VerbForm: "Part",
      Tense: "Pres",
    },
  },
  {
    form: "say",
    fields: {
      pos: { VERB: 1 },
      lemma: "say",
      VerbForm: "Fin",
      Tense: "Pres",
    },
  },
  {
    form: "says",
    fields: {
      pos: { VERB: 1 },
      lemma: "say",
      VerbForm: "Fin",
      Tense: "Pres",
      Person: 3,
    },
  },
  {
    form: "said",
    fields: {
      pos: { VERB: 1, ADJ: 1 },
      lemma: "say",
      Tense: "Past",
    },
  },
  {
    form: "saying",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
      lemma: "say",
      VerbForm: "Part",
      Tense: "Pres",
    },
  },
  {
    form: "think",
    fields: {
      pos: { VERB: 1 },
      lemma: "think",
      VerbForm: "Fin",
      Tense: "Pres",
    },
  },
  {
    form: "thinks",
    fields: {
      pos: { VERB: 1 },
      lemma: "think",
      VerbForm: "Fin",
      Tense: "Pres",
      Person: 3,
    },
  },
  {
    form: "thought",
    fields: {
      pos: { VERB: 1, NOUN: 1, ADJ: 1 },
      lemma: "think",
      Tense: "Past",
    },
  },
  {
    form: "thinking",
    fields: {
      pos: { VERB: 1 },
      lemma: "think",
      VerbForm: "Part",
      Tense: "Pres",
    },
  },
  {
    form: "tell",
    fields: {
      pos: { VERB: 1 },
      lemma: "tell",
      VerbForm: "Fin",
      Tense: "Pres",
    },
  },
  {
    form: "tells",
    fields: {
      pos: { VERB: 1 },
      lemma: "tell",
      VerbForm: "Fin",
      Tense: "Pres",
      Person: 3,
    },
  },
  {
    form: "told",
    fields: {
      pos: { VERB: 1 },
      lemma: "tell",
      Tense: "Past",
    },
  },
  {
    form: "telling",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
      lemma: "tell",
      VerbForm: "Part",
      Tense: "Pres",
    },
  },
  {
    form: "drive",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
      lemma: "drive",
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Sing",
    },
  },
  {
    form: "drives",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
      lemma: "drives",
      VerbForm: "Fin",
      Tense: "Pres",
      Person: 3,
      Number: "Plur",
    },
  },
  {
    form: "drove",
    fields: {
      pos: { VERB: 1 },
      lemma: "drive",
      VerbForm: "Fin",
      Tense: "Past",
    },
  },
  {
    form: "driven",
    fields: {
      pos: { VERB: 1, ADJ: 1 },
      lemma: "drive",
      VerbForm: "Part",
      Tense: "Past",
    },
  },
  {
    form: "driving",
    fields: {
      pos: { VERB: 1 },
      lemma: "drive",
      VerbForm: "Part",
      Tense: "Pres",
    },
  },
];

const modals = [
  {
    form: "can",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
      Number: "Sing",
      VerbForm: "Fin",
      Tense: "Pres",
      Mood: "Pot",
    },
  },
  {
    form: "could",
    fields: {
      pos: { VERB: 1 },
      VerbForm: "Fin",
      Tense: "Past",
      Mood: "Pot",
    },
  },
  {
    form: "may",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
      Number: "Sing",
      VerbForm: "Fin",
      Tense: "Pres",
      Mood: "Pot",
    },
  },
  {
    form: "might",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
      Number: "Sing",
      VerbForm: "Fin",
      Tense: "Pres",
      Mood: "Pot",
    },
  },
  {
    form: "must",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
      Number: "Sing",
      VerbForm: "Fin",
      Tense: "Pres",
      Mood: "Nec",
    },
  },
  {
    form: "ought",
    fields: {
      pos: { VERB: 1 },
      VerbForm: "Fin",
      Tense: "Pres",
      Mood: "Nec",
    },
  },
  {
    form: "shall",
    fields: {
      pos: { VERB: 1 },
      VerbForm: "Fin",
      Tense: "Pres",
      Mood: "Nec",
    },
  },
  {
    form: "should",
    fields: {
      pos: { VERB: 1 },
      VerbForm: "Fin",
      Tense: "Past",
      Mood: "Nec",
    },
  },
  {
    form: "will",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
      Number: "Sing",
      VerbForm: "Fin",
      Tense: "Pres",
      Mood: "Nec",
    },
    synonyms: ["'ll"],
  },
  {
    form: "would",
    fields: {
      pos: { VERB: 1 },
      VerbForm: "Fin",
      Tense: "Past",
      Mood: "Cnd",
    },
    synonyms: ["'d"],
  },
];

const verbs = [...modals, ...otherVerbs];

const markersDegree0 = [
  {
    form: "after",
    fields: {
      AdpType: "Prep",
      ConjType: "Sub",
    },
  },
  {
    form: "as",
    fields: {
      AdpType: "Prep",
      ConjType: "Comp",
    },
  },
  {
    form: "and",
    fields: {
      AdpType: "Prep",
      ConjType: "Coor",
    },
    synonyms: ["n", "&", "&amp;"],
  },
  {
    form: "before",
    fields: {
      AdpType: "Prep",
      ConjType: "Sub",
    },
    synonyms: ["b4"],
  },
  {
    form: "but",
    fields: {
      AdpType: "Prep",
      ConjType: "Sub",
    },
  },
  {
    form: "except",
    fields: {
      AdpType: "Prep",
      ConjType: "Sub",
    },
  },
  {
    form: "for",
    fields: {
      AdpType: "Prep",
      ConjType: "Sub",
    },
    synonyms: ["4"],
  },
  {
    form: "ie",
    fields: {
      AdpType: "Prep",
      ConjType: "Comp",
    },
    synonyms: ["i.e."],
  },
  {
    form: "like",
    fields: {
      pos: { VERB: 1, MARK: 1 },
      AdpType: "Prep",
      ConjType: "Comp",
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Sing",
    },
  },
  {
    form: "nor",
    fields: {
      AdpType: "Prep",
      ConjType: "Coor",
    },
  },
  {
    form: "once",
    fields: {
      pos: { MARK: 1, ADV: 1 },
      AdpType: "Prep",
      ConjType: "Sub",
    },
  },
  {
    form: "or",
    fields: {
      AdpType: "Prep",
      ConjType: "Coor",
    },
    synonyms: ["/"],
  },
  {
    form: "since",
    fields: {
      AdpType: "Prep",
      ConjType: "Sub",
    },
  },
  {
    form: "sithence",
    fields: {
      AdpType: "Prep",
      ConjType: "Sub",
    },
  },
  {
    form: "than",
    fields: {
      AdpType: "Prep",
      ConjType: "Comp",
    },
  },
  {
    form: "then",
    fields: {
      pos: { MARK: 1, ADJ: 1, ADV: 1 },
      AdpType: "Prep",
      ConjType: "Coor",
    },
  },
  {
    form: "to",
    fields: {
      AdpType: "Prep",
      ConjType: "Sub",
    },
  },
  {
    form: "until",
    fields: {
      AdpType: "Prep",
      ConjType: "Sub",
    },
  },
].map(
  ({ form, fields: { pos = { MARK: 1 }, ...fields } = {}, synonyms = [] }) => ({
    form,
    fields: {
      pos,
      ...fields,
    },
    synonyms,
  }),
);

const markersDegree1 = [
  {
    form: "aboard",
  },
  {
    form: "about",

    synonyms: ["bout"],
  },
  {
    form: "above",
  },
  {
    form: "across",
  },
  {
    form: "against",

    synonyms: ["'gainst", "gainst"],
  },
  {
    form: "ago",
    fields: {
      AdpType: "Post",
    },
  },
  {
    form: "along",
  },
  {
    form: "alongside",
  },
  {
    form: "amid",

    synonyms: ["amidst", "mid", "midst"],
  },
  {
    form: "among",

    synonyms: ["amongst"],
  },
  {
    form: "apropos",
  },
  {
    form: "apud",
  },
  {
    form: "around",

    synonyms: ["round", "'round"],
  },
  {
    form: "astride",
  },
  {
    form: "at",
    synonyms: ["@"],
  },
  {
    form: "atop",
  },
  {
    form: "bar",
    fields: {
      pos: { NOUN: 1, MARK: 1 },
      Number: "Sing",
    },
  },
  {
    form: "behind",
  },
  {
    form: "below",
  },
  {
    form: "beneath",
  },
  {
    form: "beside",
  },
  {
    form: "besides",
  },
  {
    form: "between",
  },
  {
    form: "beyond",
  },
  {
    form: "by",
  },
  {
    form: "circa",

    synonyms: ["ca"],
  },
  {
    form: "chez",
  },
  {
    form: "dehors",
  },
  {
    form: "despite",
  },
  {
    form: "down",
  },
  {
    form: "during",
  },
  {
    form: "from",
  },
  {
    form: "furthermore",
  },
  {
    form: "in",
    fields: {
      pos: { NOUN: 1, MARK: 1 },
      Number: "Sing",
    },
  },
  {
    form: "inside",
  },
  {
    form: "into",
  },
  {
    form: "near",
  },
  {
    form: "notwithstanding",
  },
  {
    form: "of",
    synonyms: ["o'", "o"],
  },
  {
    form: "off",
  },
  {
    form: "on",
  },
  {
    form: "onto",
  },
  {
    form: "opposite",
  },
  {
    form: "out",
  },
  {
    form: "outside",
  },
  {
    form: "over",

    synonyms: ["o'er"],
  },
  {
    form: "past",
    fields: {
      pos: { NOUN: 1, ADJ: 1, MARK: 1 },
      Number: "Sing",
    },
  },
  {
    form: "per",
  },
  {
    form: "plus",
    synonyms: ["+"],
  },
  {
    form: "qua",
  },
  {
    form: "sans",
  },
  {
    form: "sauf",
  },
  {
    form: "through",

    synonyms: ["thru"],
  },
  {
    form: "throughout",

    synonyms: ["thruout"],
  },
  {
    form: "toward",

    synonyms: ["towards"],
  },
  {
    form: "under",
  },
  {
    form: "underneath",
  },
  {
    form: "unlike",
  },
  {
    form: "until",
    synonyms: ["till", "'till"],
  },
  {
    form: "up",
  },
  {
    form: "upon",
  },
  {
    form: "upside",
  },
  {
    form: "versus",

    synonyms: ["vs", "v"],
  },
  {
    form: "via",
  },
  {
    form: "vis-a-vis",
    synonyms: ["vis-à-vis"],
  },
  {
    form: "with",

    synonyms: ["w/"],
  },
  {
    form: "within",

    synonyms: ["w/i"],
  },
  {
    form: "without",

    synonyms: ["w/o"],
  },
  {
    form: "'s",
    fields: {
      pos: { VERB: 1, MARK: 1 },
      AdpType: "Post",
      lemma: "be",
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Sing",
      Person: 3,
    },
    synonyms: ["`s", "´s", "’s", "՚s", "＇s"],
  },
].map(
  ({ form, fields: { pos = { MARK: 1 }, ...fields } = {}, synonyms = [] }) => ({
    form,
    fields: {
      pos,
      AdpType: "Prep",
      ...fields,
    },
    synonyms,
  }),
);

const markersDegree2 = [
  {
    form: "although",
    synonyms: ["altho"],
  },
  {
    form: "howbeit",
  },
  {
    form: "because",
    synonyms: [
      "cuz",
      "cus",
      "coz",
      "cos",
      "bc",
      "bcuz",
      "bcus",
      "bcoz",
      "bcos",
    ],
  },
  {
    form: "how",
    fields: {
      pos: { ADV: 1, MARK: 1 },
    },
  },
  {
    form: "if",
  },
  {
    form: "iff",
  },
  {
    form: "lest",
  },
  {
    form: "provided",
    fields: {
      pos: { ADJ: 1, VERB: 1, NOUN: 1, MARK: 1 },
    },
  },
  {
    form: "so",
    fields: {
      pos: { ADV: 1, MARK: 1 },
    },
  },
  {
    form: "though",
    synonyms: ["tho"],
  },
  {
    form: "unless",
  },
  {
    form: "whenever",
  },
  {
    form: "wherever",
  },
  {
    form: "whether",
  },
  {
    form: "whereat",
    fields: {
      pos: { ADV: 1, MARK: 1 },
    },
  },
  {
    form: "whereof",
    fields: {
      pos: { ADV: 1, MARK: 1 },
    },
  },
  {
    form: "whilom",
    fields: {
      pos: { ADV: 1, MARK: 1, ADJ: 1 },
    },
  },
  {
    form: "while",
  },
  {
    form: "yet",
    fields: {
      pos: { ADV: 1, MARK: 1 },
    },
  },
].map(
  ({ form, fields: { pos = { MARK: 1 }, ...fields } = {}, synonyms = [] }) => ({
    form,
    fields: {
      pos,
      ConjType: "Sub",
      ...fields,
    },
    synonyms,
  }),
);

const markers = [...markersDegree0, ...markersDegree1, ...markersDegree2];

const periods = [".", "…", "﹒", "．"].map((form) => ({
  form,
  fields: { PunctType: "Peri" },
}));

const questionMarks = [
  "?",
  "¿",
  "⁇",
  "⁉",
  "❓",
  "❔",
  "⸮",
  "︖",
  "﹖",
  "？",
].map((form) => ({
  form,
  fields: { PunctType: "Qest" },
}));

const exclamationMarks = [
  "!",
  "¡",
  "‼",
  "⁈",
  "❕",
  "❗",
  "❢",
  "❣",
  "︕",
  "﹗",
  "！",
].map((form) => ({
  form,
  fields: { PunctType: "Excl" },
}));

const quotationMarks = [
  '"',
  "'",
  "«",
  "»",
  "‘",
  "’",
  "‚",
  "‛",
  "“",
  "”",
  "„",
  "‟",
  "‹",
  "›",
  "⹂",
  "「",
  "」",
  "『",
  "』",
  "〝",
  "〞",
  "〟",
  "﹁",
  "﹂",
  "﹃",
  "﹄",
  "＂",
  "＇",
  "｢",
  "｣",
].map((form) => ({
  form,
  fields: { PunctType: "Quot" },
}));

const brackets = [
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  "༺",
  "༻",
  "༼",
  "༽",
  "᚛",
  "᚜",
  "⁅",
  "⁆",
  "⁽",
  "⁾",
  "₍",
  "₎",
  "⌈",
  "⌉",
  "⌊",
  "⌋",
  "〈",
  "〉",
  "❨",
  "❩",
  "❪",
  "❫",
  "❬",
  "❭",
  "❮",
  "❯",
  "❰",
  "❱",
  "❲",
  "❳",
  "❴",
  "❵",
  "⟅",
  "⟆",
  "⟦",
  "⟧",
  "⟨",
  "⟩",
  "⟪",
  "⟫",
  "⟬",
  "⟭",
  "⟮",
  "⟯",
  "⦃",
  "⦄",
  "⦅",
  "⦆",
  "⦇",
  "⦈",
  "⦉",
  "⦊",
  "⦋",
  "⦌",
  "⦍",
  "⦎",
  "⦏",
  "⦐",
  "⦑",
  "⦒",
  "⦓",
  "⦔",
  "⦕",
  "⦖",
  "⦗",
  "⦘",
  "⧘",
  "⧙",
  "⧚",
  "⧛",
  "⧼",
  "⧽",
  "⸢",
  "⸣",
  "⸤",
  "⸥",
  "⸦",
  "⸧",
  "⸨",
  "⸩",
  "〈",
  "〉",
  "《",
  "》",
  "「",
  "」",
  "『",
  "』",
  "【",
  "】",
  "〔",
  "〕",
  "〖",
  "〗",
  "〘",
  "〙",
  "〚",
  "〛",
  "﹙",
  "﹚",
  "﹛",
  "﹜",
  "﹝",
  "﹞",
  "（",
  "）",
  "［",
  "］",
  "｛",
  "｝",
  "｟",
  "｠",
  "｢",
  "｣",
].map((form) => ({
  form,
  fields: { PunctType: "Brck" },
}));

const commas = [",", "❟", "⸲", "⸴", "⹁", "︐", "﹐", "，"].map((form) => ({
  form,
  fields: { PunctType: "Comm" },
}));

const colons = [":", "꞉", "︓", "﹕", "："].map((form) => ({
  form,
  fields: { PunctType: "Colo" },
}));

const semicolons = [";", "⁏", "⸵", "︔", "﹔", "；"].map((form) => ({
  form,
  fields: { PunctType: "Semi" },
}));

const dashes = [
  "-",
  "֊",
  "־",
  "᐀",
  "᠆",
  "‐",
  "―",
  "⁓",
  "⁻",
  "₋",
  "−",
  "⸗",
  "⸚",
  "⸺",
  "⸻",
  "⹀",
  "〜",
  "〰",
  "゠",
  "︱",
  "︲",
  "﹘",
  "－",
  "ცD",
].map((form) => ({
  form,
  fields: { PunctType: "Dash" },
}));

const punctuation = [
  ...periods,
  ...questionMarks,
  ...exclamationMarks,
  ...quotationMarks,
  ...brackets,
  ...commas,
  ...colons,
  ...semicolons,
  ...dashes,
].map(({ form, fields }) => ({
  form,
  fields: {
    pos: { PUNCT: 1 },
    ...fields,
  },
}));

const articles = [
  {
    form: "a",
    fields: {
      pos: { ADJ: 1 },
      Number: "Sing",
      PronType: "Art",
    },
    synonyms: ["an"],
  },
  {
    form: "the",
    fields: {
      pos: { ADJ: 1 },
      PronType: "Art",
    },
    synonyms: ["da"],
  },
];

const demonstratives = [
  {
    form: "this",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      Number: "Sing",
      PronType: "Dem",
    },
    synonyms: ["dis"],
  },
  {
    form: "these",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      Number: "Plur",
      PronType: "Dem",
    },
  },
  {
    form: "those",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      Number: "Plur",
      PronType: "Dem",
    },
  },
  {
    form: "here",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Dem",
    },
  },
  {
    form: "there",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Dem",
    },
    synonyms: ["ther"],
  },
];

const possessives = [
  {
    form: "mine",
    fields: {
      pos: { NOUN: 1, VERB: 1 },
      PronType: "Prs",
      Person: 1,
      VerbForm: "Fin",
      Tense: "Pres",
      Poss: true,
    },
  },
  {
    form: "my",
    fields: {
      pos: { ADJ: 1 },
      PronType: "Prs",
      Poss: true,
    },
    synonyms: ["muh", "mah"],
  },
  {
    form: "yours",
    fields: {
      pos: { NOUN: 1 },
      PronType: "Prs",
      Poss: true,
    },
  },
  {
    form: "your",
    fields: {
      pos: { ADJ: 1 },
      PronType: "Prs",
      Poss: true,
    },
    synonyms: ["ur", "yer"],
  },
  {
    form: "thy",
    fields: {
      pos: { ADJ: 1 },
      PronType: "Prs",
      Poss: true,
    },
  },
  {
    form: "thine",
    fields: {
      pos: { ADJ: 1 },
      PronType: "Prs",
      Poss: true,
    },
  },
  {
    form: "his",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      PronType: "Prs",
      Poss: true,
    },
  },
  {
    form: "hers",
    fields: {
      pos: { NOUN: 1 },
      PronType: "Prs",
      Poss: true,
    },
  },
  {
    form: "its",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      PronType: "Prs",
      Poss: true,
    },
  },
  {
    form: "ours",
    fields: {
      pos: { NOUN: 1 },
      PronType: "Prs",
      Poss: true,
    },
  },
  {
    form: "our",
    fields: {
      pos: { ADJ: 1 },
      PronType: "Prs",
      Poss: true,
    },
  },
  {
    form: "theirs",
    fields: {
      pos: { NOUN: 1 },
      PronType: "Prs",
      Poss: true,
    },
  },
  {
    form: "their",
    fields: {
      pos: { ADJ: 1 },
      PronType: "Prs",
      Poss: true,
    },
  },
];

const totalPronounsOrDeterminers = [
  {
    form: "all",
    fields: {
      pos: { NOUN: 1, ADJ: 1, ADV: 1 },
      PronType: "Tot",
    },
  },
  {
    form: "either",
    fields: {
      pos: { NOUN: 1, ADJ: 1, MARK: 1 },
      PronType: "Tot",
      ConjType: "Sub",
    },
  },
  {
    form: "both",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      PronType: "Tot",
    },
  },
  {
    form: "each",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      PronType: "Tot",
    },
  },
  {
    form: "every",
    fields: {
      pos: { ADJ: 1 },
      Number: "Sing",
      PronType: "Tot",
    },
  },
  {
    form: "everybody",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Tot",
    },
  },
  {
    form: "everyone",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Tot",
    },
  },
  {
    form: "everything",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Tot",
    },
  },
];

const negativePronounsOrDeterminers = [
  {
    form: "neither",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      PronType: "Neg",
    },
  },
  {
    form: "no",
    fields: {
      pos: { ADJ: 1, INTJ: 1 },
      PronType: "Neg",
    },
  },
  {
    form: "none",
    fields: {
      pos: { NOUN: 1 },
      Number: "Plur",
      PronType: "Neg",
    },
  },
  {
    form: "noone",
    fields: {
      pos: { NOUN: 1 },
      PronType: "Neg",
    },
  },
  {
    form: "nothing",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Neg",
    },
  },
];

const indefinitePronounsOrDeterminers = [
  {
    form: "another",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      Number: "Sing",
      PronType: "Ind",
    },
  },
  {
    form: "any",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      PronType: "Ind",
    },
  },
  {
    form: "anybody",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Ind",
    },
  },
  {
    form: "anyone",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Ind",
    },
  },
  {
    form: "anything",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Ind",
    },
  },
  {
    form: "one",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Ind",
    },
  },
  {
    form: "many",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      Number: "Plur",
      PronType: "Ind",
    },
  },
  {
    form: "most",
    fields: {
      pos: { NOUN: 1, ADJ: 1, ADV: 1 },
      Degree: "Sup",
      PronType: "Ind",
    },
  },
  {
    form: "much",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      Number: "Sing",
      PronType: "Ind",
    },
  },
  {
    form: "other",
    fields: {
      pos: { ADJ: 1 },
      PronType: "Ind",
    },
  },
  {
    form: "others",
    fields: {
      pos: { NOUN: 1 },
      Number: "Plur",
      PronType: "Ind",
    },
  },
  {
    form: "some",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      PronType: "Ind",
    },
  },
  {
    form: "somebody",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Ind",
    },
    synonyms: ["sumbody"],
  },
  {
    form: "someone",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Ind",
    },
    synonyms: ["sumone"],
  },
  {
    form: "something",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Ind",
    },
    synonyms: ["sumthing", "sthing"],
  },
  {
    form: "whatever",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      Number: "Sing",
      PronType: "Ind",
    },
  },
  {
    form: "whichever",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      Number: "Sing",
      PronType: "Ind",
    },
  },
];

const relatives = [
  {
    form: "that",
    fields: {
      pos: { MARK: 1, NOUN: 1, ADJ: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
    synonyms: ["dat"],
  },
  {
    form: "what",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
    synonyms: ["wat", "wot", "wut"],
  },
  {
    form: "when",
    fields: {
      pos: { MARK: 1, NOUN: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
  },
  {
    form: "whence",
    fields: {
      pos: { MARK: 1, NOUN: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
  },
  {
    form: "where",
    fields: {
      pos: { MARK: 1, NOUN: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
  },
  {
    form: "whereby",
    fields: {
      pos: { MARK: 1, NOUN: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
  },
  {
    form: "wherein",
    fields: {
      pos: { MARK: 1, NOUN: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
  },
  {
    form: "whereupon",
    fields: {
      pos: { MARK: 1, NOUN: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
  },
  {
    form: "whereon",
    fields: {
      pos: { MARK: 1, NOUN: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
  },
  {
    form: "whither",
    fields: {
      pos: { MARK: 1, NOUN: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
  },
  {
    form: "which",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
  },
  {
    form: "who",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
  },
  {
    form: "whom",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
    synonyms: ["whome"],
  },
  {
    form: "whose",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
  },
  {
    form: "why",
    fields: {
      pos: { MARK: 1, NOUN: 1 },
      Number: "Sing",
      PronType: "Rel",
      ConjType: "Sub",
    },
    synonyms: ["y"],
  },
];

const personalPronouns = [
  {
    form: "I",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      Person: 1,
      PronType: "Prs",
      Case: "Nom",
    },
    synonyms: ["i"],
  },
  {
    form: "me",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      Person: 1,
      PronType: "Prs",
      Case: "Acc",
    },
  },
  {
    form: "you",
    fields: {
      pos: { NOUN: 1 },
      Person: 2,
      PronType: "Prs",
    },
    synonyms: ["ya", "u", "yo", "chu"],
  },
  {
    form: "thou",
    fields: {
      pos: { NOUN: 1 },
      Person: 2,
      PronType: "Prs",
      Number: "Sing",
      Case: "Nom",
    },
  },
  {
    form: "thee",
    fields: {
      pos: { NOUN: 1 },
      Person: 2,
      PronType: "Prs",
      Number: "Sing",
      Case: "Acc",
    },
  },
  {
    form: "ye",
    fields: {
      pos: { NOUN: 1 },
      Person: 2,
      PronType: "Prs",
      Number: "Plur",
      Case: "Nom",
    },
  },
  {
    form: "he",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Prs",
      Case: "Nom",
    },
  },
  {
    form: "him",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Prs",
      Case: "Acc",
    },
  },
  {
    form: "she",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Prs",
      Case: "Nom",
    },
  },
  {
    form: "her",
    fields: {
      pos: { NOUN: 1, ADJ: 1 },
      PronType: "Prs",
      Case: "Acc",
      Poss: true,
    },
  },
  {
    form: "it",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Prs",
    },
  },
  {
    form: "we",
    fields: {
      pos: { NOUN: 1 },
      Number: "Plur",
      Person: 1,
      PronType: "Prs",
      Case: "Nom",
    },
  },
  {
    form: "us",
    fields: {
      pos: { NOUN: 1 },
      Number: "Plur",
      Person: 1,
      PronType: "Prs",
      Case: "Acc",
    },
  },
  {
    form: "they",
    fields: {
      pos: { NOUN: 1 },
      Number: "Plur",
      PronType: "Prs",
      Case: "Nom",
    },
  },
  {
    form: "them",
    fields: {
      pos: { NOUN: 1 },
      Number: "Plur",
      PronType: "Prs",
      Case: "Acc",
    },
  },
];

const reflexives = [
  {
    form: "myself",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      Person: 1,
      PronType: "Prs",
      Reflex: true,
    },
  },
  {
    form: "yourself",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      Person: 2,
      PronType: "Prs",
      Reflex: true,
    },
    synonyms: ["urself"],
  },
  {
    form: "thyself",
    fields: {
      pos: { NOUN: 1 },
      Number: "Plur",
      Person: 2,
      PronType: "Prs",
      Reflex: true,
    },
  },
  {
    form: "himself",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Prs",
      Reflex: true,
    },
  },
  {
    form: "herself",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Prs",
      Reflex: true,
    },
  },
  {
    form: "itself",
    fields: {
      pos: { NOUN: 1 },
      Number: "Sing",
      PronType: "Prs",
      Reflex: true,
    },
  },
  {
    form: "ourselves",
    fields: {
      pos: { NOUN: 1 },
      Number: "Plur",
      Person: 1,
      PronType: "Prs",
      Reflex: true,
    },
  },
  {
    form: "yourselves",
    fields: {
      pos: { NOUN: 1 },
      Number: "Plur",
      Person: 2,
      PronType: "Prs",
      Reflex: true,
    },
  },
  {
    form: "themselves",
    fields: {
      pos: { NOUN: 1 },
      Number: "Plur",
      PronType: "Prs",
      Reflex: true,
    },
  },
];

const closedClassWords = [
  ...articles,
  ...demonstratives,
  ...possessives,
  ...negativePronounsOrDeterminers,
  ...totalPronounsOrDeterminers,
  ...indefinitePronounsOrDeterminers,
  ...relatives,
  ...personalPronouns,
  ...reflexives,
];

const adverbs = [
  {
    form: "accurately",
    fields: {
      pos: { ADV: 1 },
    },
  },
  {
    form: "btw",
    fields: {
      pos: { ADV: 1 },
    },
  },
  {
    form: "bad",
    fields: {
      pos: { ADV: 1, ADJ: 1 },
    },
  },
  {
    form: "even",
    fields: {
      pos: { ADJ: 1, ADV: 1, NOUN: 1, VERB: 1 },
    },
  },
  {
    form: "just",
    fields: {
      pos: { ADJ: 1, ADV: 1 },
    },
  },
  {
    form: "more",
    fields: {
      Degree: "Cmp",
      pos: { ADJ: 1, ADV: 1, NOUN: 1 },
    },
  },
  {
    form: "not",
    fields: {
      pos: { ADV: 1 },
    },
    synonyms: ["n't", "'t", "nt"],
  },
  {
    form: "now",
    fields: {
      pos: { ADV: 0.9, INTJ: 0.1 },
    },
  },
  {
    form: "often",
    fields: {
      pos: { ADV: 1 },
    },
  },
  {
    form: "pretty",
    fields: {
      pos: { ADJ: 1, ADV: 1, NOUN: 1, VERB: 1 },
    },
  },
  {
    form: "right",
    fields: {
      pos: { ADJ: 1, ADV: 1 },
    },
    synonyms: ["rite"],
  },
  {
    form: "too",
    fields: {
      pos: { ADV: 1 },
    },
  },
  {
    form: "way",
    fields: {
      pos: { NOUN: 1, ADV: 1 },
    },
  },
];

const intensifiers = [
  "absolutely",
  "awfully",
  "amazingly",
  "astoundingly",
  "awful",
  "bloody",
  "dreadfully",
  "certainly",
  "colossally",
  "decidedly",
  "deeply",
  "eminently",
  "especially",
  "exceptionally",
  "exceedingly",
  "excessively",
  "extraordinarily",
  "extremely",
  "greatly",
  "fantastically",
  "frightfully",
  "fucking",
  "fully",
  "hella",
  "highly",
  "holy",
  "incredibly",
  "insanely",
  "literally",
  "mad",
  "mightily",
  "moderately",
  "noticeably",
  "outrageously",
  "particularly",
  "phenomenally",
  "profoundly",
  "quite",
  "radically",
  "real",
  "really",
  "remarkably",
  "ridiculously",
  "so",
  "strikingly",
  "super",
  "supremely",
  "surpassingly",
  "surprisingly",
  "terribly",
  "terrifically",
  "too",
  "totally",
  "truly",
  "uncommonly",
  "unusually",
  "utterly",
  "veritably",
  "very",
  "wicked",
  "wonderfully",
].map((form) => ({
  form,
  fields: { pos: { ADV: 1 } },
}));

const adjectives = [
  {
    form: "relevant",
    fields: {
      pos: { ADJ: 1 },
    },
  },
  {
    form: "intelligent",
    fields: {
      pos: { ADJ: 1 },
    },
  },
  {
    form: "apolitical",
    fields: {
      pos: { ADJ: 1 },
    },
  },
  {
    form: "liberal",
    fields: {
      pos: { ADJ: 1, NOUN: 1 },
    },
  },
  {
    form: "big",
    fields: {
      pos: { ADJ: 1, ADV: 1 },
    },
  },
  {
    form: "full",
    fields: {
      pos: { ADJ: 1, ADV: 1 },
    },
  },
  {
    form: "varicose",
    fields: {
      pos: { ADJ: 1 },
    },
  },
];

const modifiers = [...intensifiers, ...adjectives, ...adverbs];

const nouns = [
  {
    form: "church",
    fields: { pos: { NOUN: 1 } },
  },
  {
    form: "monday",
    fields: { pos: { NOUN: 1 } },
  },
  {
    form: "tuesday",
    fields: { pos: { NOUN: 1 } },
  },
  {
    form: "wednesday",
    fields: { pos: { NOUN: 1 } },
  },
  {
    form: "thursday",
    fields: { pos: { NOUN: 1 } },
  },
  {
    form: "friday",
    fields: { pos: { NOUN: 1 } },
  },
  {
    form: "saturday",
    fields: { pos: { NOUN: 1 } },
  },
  {
    form: "sunday",
    fields: { pos: { NOUN: 1 } },
  },
  {
    form: "refresh",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
      Number: "Sing",
      Person: 1,
      lemma: "refresh",
      VerbForm: "Fin",
      Tense: "Pres",
    },
  },
  {
    form: "refreshes",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
      Number: "Plur",
      Person: 3,
      lemma: "refresh",
      VerbForm: "Fin",
      Tense: "Pres",
    },
  },
];

const izeVerbs = [
  {
    form: "operationalize",
    fields: {
      lemma: "operationalize",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "operationalise",
    fields: {
      lemma: "operationalise",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "galvanise",
    fields: {
      lemma: "galvanise",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "galvanize",
    fields: {
      lemma: "galvanize",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "internalise",
    fields: {
      lemma: "internalise",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "internalize",
    fields: {
      lemma: "internalize",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "optimise",
    fields: {
      lemma: "optimise",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "optimize",
    fields: {
      lemma: "optimize",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "revolutionise",
    fields: {
      lemma: "revolutionise",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "revolutionize",
    fields: {
      lemma: "revolutionize",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "strategise",
    fields: {
      lemma: "strategise",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "strategize",
    fields: {
      lemma: "strategize",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "synergise",
    fields: {
      lemma: "synergise",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "synergize",
    fields: {
      lemma: "synergize",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "verbalise",
    fields: {
      lemma: "verbalise",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
  {
    form: "verbalize",
    fields: {
      lemma: "verbalize",
      Number: "Sing",
      Person: 1,
      Tense: "Pres",
      VerbForm: "Fin",
      pos: { VERB: 1 },
    },
  },
];

const commonWords = [
  ...nouns,
  ...izeVerbs,
  {
    form: "matter",
    keepsItsWeights: true,
    fields: {
      pos: { NOUN: 0.6, VERB: 0.4 },
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Sing",
      Person: 1,
    },
  },
  {
    form: "save",
    keepsItsWeights: true,
    fields: {
      pos: { VERB: 0.95, MARK: 0.05 },
      AdpType: "Prep",
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Sing",
      Person: 1,
    },
  },
  {
    form: "confident",
    fields: { lemma: "confident", pos: { ADJ: 1 } },
  },
  {
    form: "imperial",
    fields: { lemma: "imperial", pos: { ADJ: 1, NOUN: 1 } },
  },
  {
    form: "felt",
    fields: {
      lemma: "feel",
      pos: { VERB: 1, ADJ: 1, NOUN: 1 },
      Tense: "Past",
      Number: "Sing",
    },
  },
  {
    form: "antemeridiem",
    fields: {
      lemma: "antemeridiem",
      pos: { NOUN: 1 },
    },
    synonyms: ["a.m", "a.m.", "A.M", "A.M."],
  },
  {
    form: "pm",
    fields: {
      lemma: "postmeridiem",
      pos: { NOUN: 1 },
    },
    synonyms: ["p.m", "p.m.", "PM", "P.M", "P.M.", "postmeridiem"],
  },
  {
    form: "round",
    fields: {
      pos: { NOUN: 1, ADJ: 1, VERB: 1, MARK: 1 },
    },
  },
  {
    form: "harassment",
    fields: {
      pos: { NOUN: 1 },
    },
    synonyms: ["harrassment", "harrasment"],
  },
  {
    form: "clothes",
    fields: {
      pos: { NOUN: 1, VERB: 1 },
      Person: 3,
      Number: "Plur",
    },
  },
  {
    form: "mining",
    fields: {
      pos: { NOUN: 1, VERB: 1 },
      Number: "Sing",
      VerbForm: "Part",
      Tense: "Pres",
    },
  },
  {
    form: "mined",
    fields: {
      pos: { ADJ: 1, VERB: 1 },
      Tense: "Past",
    },
  },
  {
    form: "far",
    fields: {
      pos: { NOUN: 1, ADJ: 1, ADV: 1 },
      Number: "Sing",
    },
  },
  {
    form: "new",
    fields: {
      pos: { ADJ: 1 },
    },
  },
  {
    form: "emote",
    fields: {
      pos: { NOUN: 1, VERB: 1 },
      VerbForm: "Fin",
      Tense: "Pres",
      Number: "Sing",
    },
  },
  {
    form: "o'",
    fields: {
      pos: { NOUN: 1 },
    },
  },
  {
    form: "m'",
    fields: {
      pos: { NOUN: 1 },
    },
  },
  {
    form: "%",
    fields: {
      pos: { NOUN: 1 },
    },
    synonyms: ["percent"],
  },
  {
    form: "shockwave",
    fields: {
      lemma: "shockwave",
      Number: "Sing",
      pos: { NOUN: 1 },
    },
  },
];

const otherInterjections = [
  "achoo",
  "ack",
  "ahh",
  "aha",
  "ahem",
  "ahoy",
  "alack",
  "amen",
  "argh",
  "aww",
  "ay",
  "bam",
  "blah",
  "boo",
  "darn",
  "dang",
  "doh",
  "drat",
  "duh",
  "eek",
  "eh",
  "gee",
  "geepers",
  "golly",
  "gosh",
  "greetings",
  "ha",
  "hehe",
  "hello",
  "hey",
  "hi",
  "hm",
  "hmm",
  "hmmm",
  "ho",
  "hooray",
  "huh",
  "jeez",
  "lo",
  "lol",
  "lul",
  "lmao",
  "oh",
  "omfg",
  "omg",
  "oops",
  "ouch",
  "phew",
  "rofl",
  "shucks",
  "sheesh",
  "tut",
  "uggh",
  "waa",
  "welcome",
  "whoops",
  "woah",
  "woops",
  "wow",
  "yikes",
  "yo",
  "yuck",
  "yum",
];

const interjections = [
  {
    form: "anyhoo",
    fields: {
      pos: { ADV: 1, INTJ: 1 },
    },
  },
  {
    form: "maybe",
    fields: {
      pos: { INTJ: 1 },
    },
  },
  {
    form: "nevertheless",
    fields: {
      pos: { INTJ: 1 },
    },
  },
  {
    form: "ofc",
    fields: {
      pos: { INTJ: 1 },
    },
  },
  {
    form: "ok",
    fields: {
      pos: { ADJ: 1, INTJ: 1 },
    },
    synonyms: ["k", "okie", "oky"],
  },
  {
    form: "please",
    fields: {
      pos: { VERB: 1, INTJ: 1 },
      VerbForm: "Fin",
      Tense: "Pres",
    },
    synonyms: ["pls", "plz", "plx", "plox"],
  },
  {
    form: "sorry",
    fields: {
      pos: { ADJ: 1, INTJ: 1 },
    },
    synonyms: ["sry"],
  },
  {
    form: "still",
    fields: {
      pos: { ADJ: 1, ADV: 1, NOUN: 1, INTJ: 1 },
    },
  },
  {
    form: "thanks",
    fields: {
      pos: { VERB: 1, INTJ: 1 },
      VerbForm: "Fin",
      Tense: "Pres",
      Person: 3,
    },
    synonyms: ["thx", "ty"],
  },
  {
    form: "voila",
    fields: {
      pos: { INTJ: 1 },
    },
    synonyms: ["voilà"],
  },
  {
    form: "well",
    fields: {
      pos: { ADJ: 1, ADV: 1, NOUN: 1, VERB: 1, INTJ: 1 },
    },
  },
  {
    form: "yes",
    fields: {
      pos: { INTJ: 1 },
    },
    synonyms: ["aye", "y", "yas", "ye", "yea", "yeah", "yep", "yup"],
  },
  ...otherInterjections.map((form) => ({
    form,
    fields: { pos: { INTJ: 1 } },
  })),
];

const genericShortcuts = [
  {
    form: "love",
    fields: {
      pos: { NOUN: 1, VERB: 1 },
    },
    synonyms: ["luv"],
  },
  {
    form: "barbeque",
    fields: {
      pos: { NOUN: 1, VERB: 1 },
    },
    synonyms: ["bbq"],
  },
  {
    form: "probably",
    fields: {
      pos: { ADV: 1 },
    },
    synonyms: ["prob", "probs", "prolly"],
  },
  {
    form: "today",
    fields: {
      pos: { ADV: 1, NOUN: 1 },
    },
    synonyms: ["2day"],
  },
  {
    form: "night",
    fields: {
      pos: { NOUN: 1 },
    },
    synonyms: ["nite"],
  },
  {
    form: "little",
    fields: {
      pos: { ADJ: 1, ADV: 1, NOUN: 1 },
    },
    synonyms: ["lil"],
  },
  {
    form: "etcetera",
    fields: {
      pos: { ADV: 1 },
    },
    synonyms: ["e.t.c", "etc"],
  },
];

const singleCharacterWords = [
  {
    form: "fail",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
    },
    synonyms: ["f"],
  },
  {
    form: "win",
    fields: {
      pos: { VERB: 1, NOUN: 1 },
    },
    synonyms: ["w"],
  },
];

const fusedWords = [
  {
    form: "sorta",
    fields: {
      fused: [
        {
          fragment: "sort",
          fullWord: "sort",
          information: {
            pos: { NOUN: 1 },
          },
        },
        {
          fragment: "a",
          fullWord: "of",
          information: {
            pos: { MARK: 1 },
            AdpType: "Prep",
          },
        },
      ],
    },
  },
  {
    form: "kinda",
    fields: {
      fused: [
        {
          fragment: "kind",
          fullWord: "kind",
          information: {
            pos: { NOUN: 1 },
          },
        },
        {
          fragment: "a",
          fullWord: "of",
          information: {
            pos: { MARK: 1 },
            AdpType: "Prep",
          },
        },
      ],
    },
  },
  {
    form: "rn",
    fields: {
      fused: [
        {
          fragment: "r",
          fullWord: "right",
          information: {
            pos: { ADV: 1 },
          },
        },
        {
          fragment: "n",
          fullWord: "now",
          information: {
            pos: { ADV: 1 },
          },
        },
      ],
    },
  },
  {
    form: "aka",
    fields: {
      fused: [
        {
          fragment: "a",
          fullWord: "also",
          information: {
            pos: { ADV: 1 },
          },
        },
        {
          fragment: "k",
          fullWord: "known",
          information: {
            pos: { ADJ: 1 },
            Tense: "Past",
            VerbForm: "Part",
          },
        },
        {
          fragment: "a",
          fullWord: "as",
          information: {
            pos: { MARK: 1 },
            ConjType: "Comp",
          },
        },
      ],
    },
  },
  {
    form: "let's",
    fields: {
      fused: [
        {
          fragment: "let",
          fullWord: "let",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "'s",
          fullWord: "us",
        },
      ],
    },
  },
  {
    form: "gunna",
    fields: {
      fused: [
        {
          fragment: "gun",
          fullWord: "going",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Part",
            Tense: "Pres",
          },
        },
        {
          fragment: "na",
          fullWord: "to",
        },
      ],
    },
  },
  {
    form: "gonna",
    fields: {
      fused: [
        {
          fragment: "go",
          fullWord: "going",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Part",
            Tense: "Pres",
          },
        },
        {
          fragment: "na",
          fullWord: "to",
        },
      ],
    },
  },
  {
    form: "gon",
    fields: {
      fused: [
        {
          fragment: "go",
          fullWord: "going",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Part",
            Tense: "Pres",
          },
        },
        {
          fragment: "n",
          fullWord: "to",
        },
      ],
    },
  },
  {
    form: "gona",
    fields: {
      fused: [
        {
          fragment: "go",
          fullWord: "going",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Part",
            Tense: "Pres",
          },
        },
        {
          fragment: "na",
          fullWord: "to",
        },
      ],
    },
  },
  {
    form: "gotta",
    fields: {
      fused: [
        {
          fragment: "got",
          fullWord: "got",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "ta",
          fullWord: "to",
        },
      ],
    },
  },
  {
    form: "wanna",
    fields: {
      fused: [
        {
          fragment: "wan",
          fullWord: "want",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "na",
          fullWord: "to",
        },
      ],
    },
  },
  {
    form: "wana",
    fields: {
      fused: [
        {
          fragment: "wa",
          fullWord: "want",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "na",
          fullWord: "to",
        },
      ],
    },
  },
  {
    form: "tryna",
    fields: {
      fused: [
        {
          fragment: "try",
          fullWord: "trying",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Part",
            Tense: "Pres",
          },
        },
        {
          fragment: "na",
          fullWord: "to",
        },
      ],
    },
  },
  {
    form: "im",
    fields: {
      fused: [
        {
          fragment: "i",
          fullWord: "i",
        },
        {
          fragment: "m",
          fullWord: "am",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
      ],
    },
  },
  {
    form: "ima",
    fields: {
      fused: [
        {
          fragment: "i",
          fullWord: "i",
        },
        {
          fragment: "m",
          fullWord: "am",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "a",
          fullWord: "going",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Part",
            Tense: "Pres",
          },
        },
      ],
    },
  },
  {
    form: "couldn't",
    fields: {
      fused: [
        {
          fragment: "couldn",
          fullWord: "could",
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "couldnt",
    fields: {
      fused: [
        {
          fragment: "could",
          fullWord: "could",
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "cannot",
    fields: {
      fused: [
        {
          fragment: "can",
          fullWord: "can",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "not",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "cant",
    fields: {
      fused: [
        {
          fragment: "can",
          fullWord: "can",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "can't",
    fields: {
      fused: [
        {
          fragment: "can",
          fullWord: "can",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "don't",
    fields: {
      fused: [
        {
          fragment: "don",
          fullWord: "do",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "dont",
    fields: {
      fused: [
        {
          fragment: "do",
          fullWord: "do",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "doesn't",
    fields: {
      fused: [
        {
          fragment: "doesn",
          fullWord: "does",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "doesnt",
    fields: {
      fused: [
        {
          fragment: "does",
          fullWord: "does",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "dosent",
    fields: {
      fused: [
        {
          fragment: "dose",
          fullWord: "does",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "didn't",
    fields: {
      fused: [
        {
          fragment: "didn",
          fullWord: "did",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Past",
          },
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "didnt",
    fields: {
      fused: [
        {
          fragment: "did",
          fullWord: "did",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Past",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "won't",
    fields: {
      fused: [
        {
          fragment: "won",
          fullWord: "will",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "wont",
    fields: {
      fused: [
        {
          fragment: "wo",
          fullWord: "will",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "wouldn't",
    fields: {
      fused: [
        {
          fragment: "wouldn",
          fullWord: "would",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Past",
          },
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "wouldnt",
    fields: {
      fused: [
        {
          fragment: "would",
          fullWord: "would",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Past",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "mustn't",
    fields: {
      fused: [
        {
          fragment: "mustn",
          fullWord: "must",
          information: {
            pos: { VERB: 1 },
            Number: "Sing",
            VerbForm: "Fin",
            Tense: "Pres",
            Mood: "Nec",
          },
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "mustnt",
    fields: {
      fused: [
        {
          fragment: "must",
          fullWord: "must",
          information: {
            pos: { VERB: 1 },
            Number: "Sing",
            VerbForm: "Fin",
            Tense: "Pres",
            Mood: "Nec",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "shouldnt",
    fields: {
      fused: [
        {
          fragment: "should",
          fullWord: "should",
          information: {
            pos: { VERB: 1 },
            Number: "Sing",
            VerbForm: "Fin",
            Tense: "Past",
            Mood: "Nec",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "shouldn't",
    fields: {
      fused: [
        {
          fragment: "shouldn",
          fullWord: "should",
          information: {
            pos: { VERB: 1 },
            Number: "Sing",
            VerbForm: "Fin",
            Tense: "Past",
            Mood: "Nec",
          },
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "ure",
    fields: {
      fused: [
        {
          fragment: "u",
          fullWord: "you",
          information: { pos: { NOUN: 1 }, PronType: "Prs" },
        },
        {
          fragment: "re",
          fullWord: "are",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
      ],
    },
  },
  {
    form: "aint",
    fields: {
      fused: [
        {
          fragment: "ai",
          fullWord: "be",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "aren't",
    fields: {
      fused: [
        {
          fragment: "aren",
          fullWord: "are",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "arent",
    fields: {
      fused: [
        {
          fragment: "are",
          fullWord: "are",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "ain't",
    fields: {
      fused: [
        {
          fragment: "ain",
          fullWord: "be",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "isn't",
    fields: {
      fused: [
        {
          fragment: "isn",
          fullWord: "is",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "isnt",
    fields: {
      fused: [
        {
          fragment: "is",
          fullWord: "is",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "wasnt",
    fields: {
      fused: [
        {
          fragment: "was",
          fullWord: "be",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Past",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "wasn't",
    fields: {
      fused: [
        {
          fragment: "wasn",
          fullWord: "be",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Past",
          },
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "werent",
    fields: {
      fused: [
        {
          fragment: "were",
          fullWord: "be",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Past",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "weren't",
    fields: {
      fused: [
        {
          fragment: "weren",
          fullWord: "be",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Past",
          },
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "yall",
    fields: {
      fused: [
        {
          fragment: "y",
          fullWord: "you",
          information: { pos: { NOUN: 1 }, PronType: "Prs" },
        },
        {
          fragment: "all",
          fullWord: "all",
        },
      ],
    },
  },
  {
    form: "hes",
    fields: {
      fused: [
        {
          fragment: "he",
          fullWord: "he",
          information: { pos: { NOUN: 1 } },
        },
        {
          fragment: "s",
          fullWord: "is",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
      ],
    },
  },
  {
    form: "dnt",
    fields: {
      fused: [
        {
          fragment: "d",
          fullWord: "do",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "whats",
    fields: {
      fused: [
        {
          fragment: "what",
          fullWord: "what",
        },
        {
          fragment: "s",
          fullWord: "is",
          information: {
            pos: { VERB: 1 },
            VerbForm: "Fin",
            Tense: "Pres",
          },
        },
      ],
    },
  },
  {
    form: "haven't",
    fields: {
      fused: [
        {
          fragment: "haven",
          fullWord: "have",
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "havent",
    fields: {
      fused: [
        {
          fragment: "have",
          fullWord: "have",
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "hasn't",
    fields: {
      fused: [
        {
          fragment: "hasn",
          fullWord: "has",
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "hasnt",
    fields: {
      fused: [
        {
          fragment: "has",
          fullWord: "has",
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "hadnt",
    fields: {
      fused: [
        {
          fragment: "had",
          fullWord: "had",
        },
        {
          fragment: "nt",
          fullWord: "not",
        },
      ],
    },
  },
  {
    form: "hadn't",
    fields: {
      fused: [
        {
          fragment: "hadn",
          fullWord: "had",
        },
        {
          fragment: "'t",
          fullWord: "not",
        },
      ],
    },
  },
];

const demonymAdjectives = [
  "Afghan",
  "Albanian",
  "Algerian",
  "Andorran",
  "Angolan",
  "Antiguan",
  "Barbudan",
  "Argentine",
  "Argentinean",
  "Armenian",
  "Australian",
  "Ozzie",
  "Aussie",
  "Austrian",
  "Azerbaijani",
  "Bahamian",
  "Bahraini",
  "Bangladeshi",
  "Barbadian",
  "Bajuns",
  "Belarusian",
  "Belgian",
  "Belizean",
  "Beninese",
  "Bhutanese",
  "Bolivian",
  "Bosnian",
  "Herzegovinian",
  "Motswana",
  "Batswana",
  "Brazilian",
  "Bruneian",
  "Bulgarian",
  "Burkinabe",
  "Burundian",
  "Cambodian",
  "Cameroonian",
  "Canadian",
  "Cape-Verdian",
  "Cape-Verdean",
  "Chadian",
  "Chilean",
  "Chinese",
  "Colombian",
  "Comoran",
  "Congolese",
  "Costa Rican",
  "Ivorian",
  "Croat",
  "Croatian",
  "Cuban",
  "Cypriot",
  "Czech",
  "Danish",
  "Djibouti",
  "Dominican",
  "Dominican",
  "East-Timorese",
  "Ecuadorean",
  "Egyptian",
  "Salvadoran",
  "Equatoguinean",
  "Eritrean",
  "Estonian",
  "Ethiopian",
  "Fijian",
  "Finnish",
  "French",
  "Gabonese",
  "Gambian",
  "Georgian",
  "German",
  "Ghanaian",
  "Greek",
  "Grenadian",
  "Grenadan",
  "Guatemalan",
  "Guinean",
  "Guinea-Bissauan",
  "Guyanese",
  "Haitian",
  "Honduran",
  "Hungarian",
  "Icelander",
  "Indian",
  "Indonesian",
  "Iranian",
  "Iraqi",
  "Irish",
  "Israeli",
  "Italian",
  "Jamaican",
  "Japanese",
  "Jordanian",
  "Kazakhstani",
  "Kenyan",
  "I-Kiribati",
  "Kosovar",
  "Kuwaiti",
  "Kyrgyz",
  "Kirghiz",
  "Lao",
  "Laotian",
  "Latvian",
  "Lebanese",
  "Mosotho",
  "Basotho",
  "Liberian",
  "Libyan",
  "Liechtensteiner",
  "Lithuanian",
  "Luxembourger",
  "Macedonian",
  "Malagasy",
  "Malawian",
  "Malaysian",
  "Maldivan",
  "Malian",
  "Maltese",
  "Marshallese",
  "Mauritanian",
  "Mauritian",
  "Mexican",
  "Micronesian",
  "Moldovan",
  "Monegasque",
  "Monacan",
  "Mongolian",
  "Montenegrin",
  "Moroccan",
  "Mozambican",
  "Burmese",
  "Myanmarese",
  "Namibian",
  "Nauruan",
  "Nepalese",
  "Netherlander",
  "Hollander",
  "Dutch",
  "Kiwi",
  "Nicaraguan",
  "Nigerien",
  "Nigerian",
  "Norwegian",
  "Omani",
  "Pakistani",
  "Palauan",
  "Panamanian",
  "Paraguayan",
  "Peruvian",
  "Filipino",
  "Pole",
  "Polish",
  "Portuguese",
  "Qatari",
  "Romanian",
  "Russian",
  "Rwandan",
  "Kittian",
  "Nevisian",
  "Samoan",
  "Sammarinese",
  "San-Marinese",
  "Sao-Tomean",
  "Saudi",
  "Senegalese",
  "Serbian",
  "Seychellois",
  "Singaporean",
  "Slovak",
  "Slovakian",
  "Slovene",
  "Slovenian",
  "Solomon-Islander",
  "Somali",
  "Spanish",
  "Sri-Lankan",
  "Sudanese",
  "Surinamer",
  "Swazi",
  "Swedish",
  "Swiss",
  "Syrian",
  "Taiwanese",
  "Tajik",
  "Tadzhik",
  "Tanzanian",
  "Thai",
  "Togolese",
  "Tongan",
  "Trinidadian",
  "Tobagonian",
  "Tunisian",
  "Turkish",
  "Turkmen",
  "Tuvaluan",
  "Ugandan",
  "Ukrainian",
  "Emirian",
  "Scottish",
  "British",
  "Welsh",
  "Irish",
  "American",
  "Uruguayan",
  "Uzbek",
  "Uzbekistani",
  "Ni-Vanuatu",
  "Venezuelan",
  "Vietnamese",
  "Yemeni",
  "Zambian",
  "Zimbabwean",
].map((form) => ({
  form,
  fields: {
    pos: { ADJ: 1 },
  },
}));

const demonymNouns = [
  "Dane",
  "Finn",
  "Frenchman",
  "Frenchwoman",
  "Irishman",
  "Irishwoman",
  "Dutchman",
  "Dutchwoman",
  "Spaniard",
  "Turk",
  "Swede",
  "Briton",
  "Englishman",
  "Englishwoman",
  "Scot",
  "Scotsman",
  "Scotswoman",
  "Welshman",
  "Welshwoman",
  "Yemenite",
].map((form) => ({
  form,
  fields: {
    pos: { NOUN: 1 },
    Number: "Sing",
  },
}));

const demonyms = [...demonymAdjectives, ...demonymNouns];

export default [
  ...numbers,
  ...units,
  ...months,
  ...currencies,

  ...verbs,
  ...markers,
  ...punctuation,
  ...closedClassWords,

  ...modifiers,
  ...commonWords,
  ...interjections,
  ...genericShortcuts,
  ...singleCharacterWords,
  ...fusedWords,
  ...demonyms,
] as HandpickedEntry[];
