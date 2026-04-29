import type { Procedure, Country } from "@/types/engine";
import { proceduresDE } from "./germany";

// When NL/AT/CH ship, import them here:
// import { proceduresNL } from "./netherlands";
// import { proceduresAT } from "./austria";
// import { proceduresCH } from "./switzerland";

export const allProcedures: Procedure[] = [
  ...proceduresDE,
  // ...proceduresNL,
  // ...proceduresAT,
  // ...proceduresCH,
];

export const procedureMap = new Map(allProcedures.map((p) => [p.id, p]));

export function getProceduresForCountry(country: Country): Procedure[] {
  return allProcedures.filter((p) => p.country === country);
}
