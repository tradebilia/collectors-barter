const US_STATE_TIME_ZONES: Record<string, string> = {
  AL: "America/Chicago",
  AK: "America/Anchorage",
  AZ: "America/Phoenix",
  AR: "America/Chicago",
  CA: "America/Los_Angeles",
  CO: "America/Denver",
  CT: "America/New_York",
  DE: "America/New_York",
  DC: "America/New_York",
  FL: "America/New_York",
  GA: "America/New_York",
  HI: "Pacific/Honolulu",
  ID: "America/Denver",
  IL: "America/Chicago",
  IN: "America/Indiana/Indianapolis",
  IA: "America/Chicago",
  KS: "America/Chicago",
  KY: "America/New_York",
  LA: "America/Chicago",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MI: "America/Detroit",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  MT: "America/Denver",
  NE: "America/Chicago",
  NV: "America/Los_Angeles",
  NH: "America/New_York",
  NJ: "America/New_York",
  NM: "America/Denver",
  NY: "America/New_York",
  NC: "America/New_York",
  ND: "America/Chicago",
  OH: "America/New_York",
  OK: "America/Chicago",
  OR: "America/Los_Angeles",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  SD: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  UT: "America/Denver",
  VT: "America/New_York",
  VA: "America/New_York",
  WA: "America/Los_Angeles",
  WV: "America/New_York",
  WI: "America/Chicago",
  WY: "America/Denver",
};

const US_STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO",
  connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID",
  illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA",
  washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
};

const COUNTRY_DEFAULT_TIME_ZONES: Record<string, string> = {
  "united kingdom": "Europe/London",
  uk: "Europe/London",
  "great britain": "Europe/London",
  canada: "America/Toronto",
  australia: "Australia/Sydney",
  "new zealand": "Pacific/Auckland",
  ireland: "Europe/Dublin",
  germany: "Europe/Berlin",
  france: "Europe/Paris",
  italy: "Europe/Rome",
  spain: "Europe/Madrid",
  japan: "Asia/Tokyo",
  china: "Asia/Shanghai",
  "south korea": "Asia/Seoul",
  india: "Asia/Kolkata",
  brazil: "America/Sao_Paulo",
  mexico: "America/Mexico_City",
};

function normalizeLocationPart(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function resolveStateCode(state: string) {
  const normalized = normalizeLocationPart(state);
  if (normalized.length === 2) return normalized.toUpperCase();
  return US_STATE_NAMES[normalized] ?? "";
}

export type ProfileLocation = {
  contactState?: string | null;
  contactCountry?: string | null;
};

/**
 * Resolves a display timezone from private profile location fields.
 * This intentionally returns no address or location data to the client.
 */
export function resolveProfileTimeZone(location: ProfileLocation | null | undefined) {
  const country = normalizeLocationPart(location?.contactCountry);
  const stateCode = resolveStateCode(location?.contactState ?? "");

  if (!country || country === "united states" || country === "us" || country === "usa") {
    if (US_STATE_TIME_ZONES[stateCode]) return US_STATE_TIME_ZONES[stateCode];
  }

  return COUNTRY_DEFAULT_TIME_ZONES[country] ?? null;
}
