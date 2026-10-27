import type { Location } from "./location";
import { normalizeText } from "./text";

/**
 * Free-text location inference for job sources. APIs hand us anything from
 * "Hamburg" to "Europe, USA, UK, Canada…" — this maps what it can onto the
 * canonical `Location`, so geo filters and content-key dedupe have a country to
 * work with (country used to be null on 2249/2281 rows).
 *
 * Every key is stored in `normalizeText` form (lowercase, diacritics stripped)
 * because lookups run through `normalizeText` as well.
 */

const COUNTRY_ALIASES: Record<string, string> = {
  germany: "Germany",
  deutschland: "Germany",
  alemania: "Germany",
  spain: "Spain",
  espana: "Spain",
  "united kingdom": "United Kingdom",
  uk: "United Kingdom",
  gb: "United Kingdom",
  britain: "United Kingdom",
  "great britain": "United Kingdom",
  england: "United Kingdom",
  "reino unido": "United Kingdom",
  ireland: "Ireland",
  eire: "Ireland",
  francia: "France",
  france: "France",
  netherlands: "Netherlands",
  holland: "Netherlands",
  "paises bajos": "Netherlands",
  portugal: "Portugal",
  italy: "Italy",
  italia: "Italy",
  belgium: "Belgium",
  belgica: "Belgium",
  switzerland: "Switzerland",
  suiza: "Switzerland",
  schweiz: "Switzerland",
  austria: "Austria",
  suecia: "Sweden",
  sweden: "Sweden",
  sverige: "Sweden",
  norway: "Norway",
  noruega: "Norway",
  denmark: "Denmark",
  dinamarca: "Denmark",
  danmark: "Denmark",
  finland: "Finland",
  finlandia: "Finland",
  poland: "Poland",
  polska: "Poland",
  polonia: "Poland",
  czechia: "Czechia",
  "czech republic": "Czechia",
  chequia: "Czechia",
  hungary: "Hungary",
  hungria: "Hungary",
  romania: "Romania",
  rumania: "Romania",
  bulgaria: "Bulgaria",
  greece: "Greece",
  griechenland: "Greece",
  grecia: "Greece",
  ukraine: "Ukraine",
  ucrania: "Ukraine",
  turkey: "Turkey",
  turkiye: "Turkey",
  turquia: "Turkey",
  russia: "Russia",
  rusia: "Russia",
  estonia: "Estonia",
  latvia: "Latvia",
  lithuania: "Lithuania",
  slovakia: "Slovakia",
  slovenia: "Slovenia",
  croatia: "Croatia",
  serbia: "Serbia",
  iceland: "Iceland",
  islandia: "Iceland",
  luxembourg: "Luxembourg",
  malta: "Malta",
  cyprus: "Cyprus",
  "united states": "United States",
  usa: "United States",
  "estados unidos": "United States",
  canada: "Canada",
  australia: "Australia",
  "new zealand": "New Zealand",
  israel: "Israel",
  india: "India",
  singapore: "Singapore",
  japan: "Japan",
  china: "China",
  brazil: "Brazil",
  mexico: "Mexico",
  argentina: "Argentina",
  colombia: "Colombia",
  chile: "Chile",
  "south korea": "South Korea",
  "hong kong": "Hong Kong",
  "united arab emirates": "United Arab Emirates",
  uae: "United Arab Emirates",
};

/**
 * Common cities → country. Kept deliberately curated (his market: EU/UK/US);
 * unknown cities fall through so we never invent a country.
 */
const CITY_GAZETTEER: Record<string, string> = {
  berlin: "Germany",
  hamburg: "Germany",
  munich: "Germany",
  munchen: "Germany",
  cologne: "Germany",
  koeln: "Germany",
  frankfurt: "Germany",
  stuttgart: "Germany",
  dusseldorf: "Germany",
  leipzig: "Germany",
  dresden: "Germany",
  hannover: "Germany",
  nuremberg: "Germany",
  nurnberg: "Germany",
  london: "United Kingdom",
  manchester: "United Kingdom",
  birmingham: "United Kingdom",
  edinburgh: "United Kingdom",
  glasgow: "United Kingdom",
  bristol: "United Kingdom",
  leeds: "United Kingdom",
  cambridge: "United Kingdom",
  oxford: "United Kingdom",
  brighton: "United Kingdom",
  dublin: "Ireland",
  cork: "Ireland",
  galway: "Ireland",
  paris: "France",
  lyon: "France",
  marseille: "France",
  toulouse: "France",
  nantes: "France",
  bordeaux: "France",
  lille: "France",
  strasbourg: "France",
  amsterdam: "Netherlands",
  rotterdam: "Netherlands",
  "den haag": "Netherlands",
  "the hague": "Netherlands",
  utrecht: "Netherlands",
  eindhoven: "Netherlands",
  groningen: "Netherlands",
  maastricht: "Netherlands",
  madrid: "Spain",
  barcelona: "Spain",
  valencia: "Spain",
  sevilla: "Spain",
  seville: "Spain",
  malaga: "Spain",
  bilbao: "Spain",
  zaragoza: "Spain",
  palma: "Spain",
  alicante: "Spain",
  granada: "Spain",
  murcia: "Spain",
  vigo: "Spain",
  lisbon: "Portugal",
  lisboa: "Portugal",
  porto: "Portugal",
  braga: "Portugal",
  coimbra: "Portugal",
  milan: "Italy",
  milano: "Italy",
  rome: "Italy",
  roma: "Italy",
  turin: "Italy",
  naples: "Italy",
  bologna: "Italy",
  florence: "Italy",
  venice: "Italy",
  padua: "Italy",
  zurich: "Switzerland",
  geneva: "Switzerland",
  basel: "Switzerland",
  bern: "Switzerland",
  lausanne: "Switzerland",
  vienna: "Austria",
  wien: "Austria",
  graz: "Austria",
  linz: "Austria",
  salzburg: "Austria",
  brussels: "Belgium",
  antwerp: "Belgium",
  ghent: "Belgium",
  leuven: "Belgium",
  stockholm: "Sweden",
  gothenburg: "Sweden",
  goteborg: "Sweden",
  malmo: "Sweden",
  uppsala: "Sweden",
  oslo: "Norway",
  bergen: "Norway",
  trondheim: "Norway",
  copenhagen: "Denmark",
  aarhus: "Denmark",
  helsinki: "Finland",
  espoo: "Finland",
  tampere: "Finland",
  warsaw: "Poland",
  warszawa: "Poland",
  krakow: "Poland",
  wroclaw: "Poland",
  poznan: "Poland",
  gdansk: "Poland",
  lodz: "Poland",
  prague: "Czechia",
  praha: "Czechia",
  brno: "Czechia",
  budapest: "Hungary",
  bucharest: "Romania",
  "cluj-napoca": "Romania",
  timisoara: "Romania",
  sofia: "Bulgaria",
  plovdiv: "Bulgaria",
  athens: "Greece",
  thessaloniki: "Greece",
  kyiv: "Ukraine",
  kiev: "Ukraine",
  lviv: "Ukraine",
  istanbul: "Turkey",
  ankara: "Turkey",
  moscow: "Russia",
  "saint petersburg": "Russia",
  tallinn: "Estonia",
  riga: "Latvia",
  vilnius: "Lithuania",
  bratislava: "Slovakia",
  ljubljana: "Slovenia",
  zagreb: "Croatia",
  belgrade: "Serbia",
  reykjavik: "Iceland",
  valletta: "Malta",
  nicosia: "Cyprus",
  "new york": "United States",
  "san francisco": "United States",
  "los angeles": "United States",
  seattle: "United States",
  austin: "United States",
  boston: "United States",
  chicago: "United States",
  denver: "United States",
  miami: "United States",
  portland: "United States",
  "san diego": "United States",
  atlanta: "United States",
  dallas: "United States",
  detroit: "United States",
  pittsburgh: "United States",
  toronto: "Canada",
  vancouver: "Canada",
  montreal: "Canada",
  ottawa: "Canada",
  calgary: "Canada",
  sydney: "Australia",
  melbourne: "Australia",
  brisbane: "Australia",
  perth: "Australia",
  adelaide: "Australia",
  "tel aviv": "Israel",
  bengaluru: "India",
  bangalore: "India",
  pune: "India",
  hyderabad: "India",
  delhi: "India",
  mumbai: "India",
  dubai: "United Arab Emirates",
  "sao paulo": "Brazil",
  "buenos aires": "Argentina",
  "mexico city": "Mexico",
};

const WORLDWIDE_PATTERN =
  /^(worldwide|anywhere( in (the )?world)?|remote|homeoffice|remote job|remoto|full.?remote)$/i;

// Regional scopes ("Europe", "EMEA") are not countries but must survive for
// display and geo filtering — stored as region, never as country or city.
const REGION_SCOPE_PATTERN = /^(europe|eu|emea|european union|apac|asia pacific|latin america)$/i;

const PLACE_SEPARATOR = /\s*(?:,|;|·|\||\/|–|—|-)\s*/;

/** Canonical country name when the text names a country (any alias), else undefined. */
export function countryFromName(text: string): string | undefined {
  return COUNTRY_ALIASES[normalizeText(text)];
}

/** True for scope texts like "Worldwide", "Anywhere in the World", "Remote". */
export function isWorldwide(text?: string): boolean {
  if (text === undefined || text.trim() === "") return true;
  return WORLDWIDE_PATTERN.test(text.trim());
}

/**
 * Infer the canonical `Location` from a source's free-text location:
 * - a country name → { country }
 * - "City, Country" → { city, country }
 * - a gazetted city → { city, country }
 * - regional scopes ("Europe", "EMEA") and multi-place lists → { region }
 * - worldwide texts ("Worldwide", "Remote") → { isRemote } only
 * - anything else → { city } (never invent a country)
 */
export function parseJobLocation(text: string | undefined, isRemote: boolean): Location {
  const value = text?.trim();
  if (!value || isWorldwide(value)) return { isRemote };
  if (REGION_SCOPE_PATTERN.test(value)) return { region: value, isRemote };

  const asCountry = countryFromName(value);
  if (asCountry) return { country: asCountry, isRemote };

  const segments = value
    .split(PLACE_SEPARATOR)
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");
  if (segments.length > 1) {
    const allCountries = segments.every((segment) => countryFromName(segment) !== undefined);
    if (allCountries) return { region: value, isRemote };
    // Only "City, Country" (exactly two segments) may take the tail as country —
    // longer lists like "Europe, USA, UK… Norway" are scopes, not places.
    if (segments.length === 2) {
      const tailCountry = countryFromName(segments[1] as string);
      if (tailCountry) return { city: segments[0] as string, country: tailCountry, isRemote };
    }
    return { region: value, isRemote };
  }

  const gazetted = CITY_GAZETTEER[normalizeText(value)];
  if (gazetted) return { city: value, country: gazetted, isRemote };
  return { city: value, isRemote };
}
