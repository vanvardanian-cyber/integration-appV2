import { describe, it, expect } from "vitest";
import { solve, evaluatePredicate, getNextStep } from "./solver";
import type { UserProfile } from "@/types/engine";

/**
 * The engine is the moat — these tests are the load-bearing part.
 *
 * Strategy:
 *   - evaluatePredicate: small unit tests, one per predicate variant,
 *     including the AND/OR/NOT combinators and the OTHER license case
 *     that was wired in this round.
 *   - solve: smoke tests that exercise the country filter, topo sort,
 *     deadline computation for each trigger type, and the deadlock
 *     detectors for known-bad situations.
 *   - getNextStep: returns the first ready step, or null when complete.
 */

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const baseProfile: UserProfile = {
  id: "p1",
  userId: "u1",
  targetCountry: "DE",
  nationality: "non-EU",
  countryOfOrigin: "IN",
  arrivalDate: "2026-06-01",
  city: "Berlin",
  housing: "temporary-employer",
  employment: "employed",
  visaType: "blue-card",
  hasJobOffer: true,
  hasSignedContract: true,
  annualGrossSalary: 75000,
  startDate: "2026-06-15",
  maritalStatus: "single",
  hasChildren: false,
  spouseAccompanying: false,
  speaksTargetLanguage: false,
  hasUniversityDegree: true,
  degreeRecognized: "yes",
  confidence: {},
};

// ─────────────────────────────────────────────────────────────────────────────
// PREDICATE EVALUATOR
// ─────────────────────────────────────────────────────────────────────────────

describe("evaluatePredicate", () => {
  it("always / never", () => {
    expect(evaluatePredicate({ type: "always" }, baseProfile)).toBe(true);
    expect(evaluatePredicate({ type: "never" }, baseProfile)).toBe(false);
  });

  it("country_in matches target country", () => {
    expect(evaluatePredicate({ type: "country_in", values: ["DE"] }, baseProfile)).toBe(true);
    expect(evaluatePredicate({ type: "country_in", values: ["NL", "AT"] }, baseProfile)).toBe(false);
  });

  it("nationality_not_in excludes EU users from non-EU procedures", () => {
    expect(evaluatePredicate({ type: "nationality_not_in", values: ["EU"] }, baseProfile)).toBe(true);
    const eu = { ...baseProfile, nationality: "EU" as const };
    expect(evaluatePredicate({ type: "nationality_not_in", values: ["EU"] }, eu)).toBe(false);
  });

  it("earns_above_threshold for PKV decision module", () => {
    expect(evaluatePredicate({ type: "earns_above_threshold", thresholdEur: 69300 }, baseProfile)).toBe(true);
    const broke = { ...baseProfile, annualGrossSalary: 50000 };
    expect(evaluatePredicate({ type: "earns_above_threshold", thresholdEur: 69300 }, broke)).toBe(false);
    const noSalary = { ...baseProfile, annualGrossSalary: null };
    expect(evaluatePredicate({ type: "earns_above_threshold", thresholdEur: 69300 }, noSalary)).toBe(false);
  });

  it("has_country_drivers_license routes per country flag", () => {
    const inDriver = { ...baseProfile, hasIndianDrivingLicense: true };
    const usDriver = { ...baseProfile, hasUSDrivingLicense: true };
    const otherDriver = { ...baseProfile, hasOtherNonEUDrivingLicense: true };

    expect(evaluatePredicate({ type: "has_country_drivers_license", country: "IN" }, inDriver)).toBe(true);
    expect(evaluatePredicate({ type: "has_country_drivers_license", country: "IN" }, usDriver)).toBe(false);

    expect(evaluatePredicate({ type: "has_country_drivers_license", country: "US" }, usDriver)).toBe(true);
    expect(evaluatePredicate({ type: "has_country_drivers_license", country: "US" }, otherDriver)).toBe(false);

    // The OTHER case is the bug fix — UK / BR / RU / etc. drivers were
    // silently dropped before; now they trigger the conversion procedure.
    expect(evaluatePredicate({ type: "has_country_drivers_license", country: "OTHER" }, otherDriver)).toBe(true);
    expect(evaluatePredicate({ type: "has_country_drivers_license", country: "OTHER" }, inDriver)).toBe(false);
  });

  it("and / or / not combinators", () => {
    const blueCard = {
      type: "and" as const,
      clauses: [
        { type: "nationality_not_in" as const, values: ["EU" as const] },
        { type: "has_visa_in" as const, values: ["blue-card" as const] },
      ],
    };
    expect(evaluatePredicate(blueCard, baseProfile)).toBe(true);
    expect(evaluatePredicate(blueCard, { ...baseProfile, nationality: "EU" })).toBe(false);

    const anyDriver = {
      type: "or" as const,
      clauses: [
        { type: "has_country_drivers_license" as const, country: "IN" as const },
        { type: "has_country_drivers_license" as const, country: "US" as const },
      ],
    };
    expect(evaluatePredicate(anyDriver, baseProfile)).toBe(false);
    expect(evaluatePredicate(anyDriver, { ...baseProfile, hasUSDrivingLicense: true })).toBe(true);

    expect(evaluatePredicate({ type: "not", clause: { type: "always" } }, baseProfile)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SOLVE — INTEGRATION-ISH SMOKE TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("solve(profile)", () => {
  it("filters by country first — DE produces DE-only steps", () => {
    const path = solve(baseProfile);
    expect(path.steps.length).toBeGreaterThan(0);
    for (const s of path.steps) {
      expect(s.procedure.country).toBe("DE");
    }
  });

  it("respects nationality predicates — EU citizens skip Blue Card path", () => {
    const eu: UserProfile = {
      ...baseProfile,
      nationality: "EU",
      visaType: "none",
    };
    const path = solve(eu);
    const ids = path.steps.map((s) => s.procedureId);
    expect(ids).not.toContain("blue_card_visa");
    expect(ids).not.toContain("blue_card_app");
    expect(ids).not.toContain("anabin_check");
    // But Anmeldung still applies — everyone needs to register.
    expect(ids).toContain("anmeldung");
  });

  it("topological order: Anmeldung comes before Steuer-ID", () => {
    const path = solve(baseProfile);
    const anmeldungIdx = path.steps.findIndex((s) => s.procedureId === "anmeldung");
    const steuerIdx = path.steps.findIndex((s) => s.procedureId === "steuer_id");
    expect(anmeldungIdx).toBeGreaterThanOrEqual(0);
    expect(steuerIdx).toBeGreaterThanOrEqual(0);
    expect(anmeldungIdx).toBeLessThan(steuerIdx);
  });

  it("deadline: Anmeldung has after_arrival deadline of 14 days", () => {
    const path = solve(baseProfile);
    const anmeldung = path.steps.find((s) => s.procedureId === "anmeldung")!;
    expect(anmeldung.deadlineDate).toBe("2026-06-15"); // arrival 2026-06-01 + 14d
  });

  it("deadline: annual tax return rolls forward to next future occurrence", () => {
    // Arriving early-2026 with the tax-year-aware logic, the next 07-31
    // is 2026-07-31 (still in the future from arrival on 2026-06-01).
    const path = solve(baseProfile);
    const tax = path.steps.find((s) => s.procedureId === "annual_tax_return")!;
    expect(tax.deadlineDate).not.toBeNull();
    // Format check — YYYY-07-31
    expect(tax.deadlineDate).toMatch(/^\d{4}-07-31$/);
    // Should be a future date relative to arrival
    expect(new Date(tax.deadlineDate!).getTime()).toBeGreaterThan(
      new Date(baseProfile.arrivalDate!).getTime()
    );
  });

  it("deadlock: Anmeldung-SCHUFA-apartment trap when no permanent rental", () => {
    const path = solve(baseProfile); // housing: temporary-employer
    const trap = path.deadlocks.find((d) => d.title.includes("Anmeldung-SCHUFA"));
    expect(trap).toBeDefined();
    expect(trap!.involvedProcedureIds).toContain("anmeldung");
    expect(trap!.involvedProcedureIds).toContain("schufa");
  });

  it("deadlock: Berlin Bürgeramt overload triggers because wait > 14d", () => {
    const path = solve(baseProfile); // city: Berlin, wait 28-56 days
    const overload = path.deadlocks.find((d) => d.title.includes("Berlin"));
    expect(overload).toBeDefined();
  });

  it("no Bürgeramt overload deadlock for Hamburg (wait <= 14d)", () => {
    const hh = { ...baseProfile, city: "Hamburg" as const };
    const path = solve(hh);
    const overload = path.deadlocks.find((d) => d.title.toLowerCase().includes("overload"));
    expect(overload).toBeUndefined();
  });

  it("status flips to complete when procedureId is in the completed set", () => {
    const path = solve(baseProfile, new Set(["temporary_address", "anmeldung"]));
    const anmeldung = path.steps.find((s) => s.procedureId === "anmeldung")!;
    expect(anmeldung.status).toBe("complete");
    // And anything that depends on Anmeldung is no longer "blocked"
    const steuer = path.steps.find((s) => s.procedureId === "steuer_id")!;
    expect(steuer.status).toBe("ready");
  });

  it("OTHER non-EU license drivers see the conversion procedure", () => {
    const ukDriver = { ...baseProfile, hasOtherNonEUDrivingLicense: true };
    const path = solve(ukDriver);
    expect(path.steps.find((s) => s.procedureId === "drivers_license")).toBeDefined();

    // And the inverse — someone with no foreign license doesn't get it.
    const noLicense = { ...baseProfile };
    const path2 = solve(noLicense);
    expect(path2.steps.find((s) => s.procedureId === "drivers_license")).toBeUndefined();
  });
});

describe("getNextStep", () => {
  it("returns the first ready step, skipping blocked and complete", () => {
    const path = solve(baseProfile, new Set(["temporary_address"]));
    const next = getNextStep(path);
    expect(next).not.toBeNull();
    // First ready step after temp address is done should be Anmeldung
    // (or online_bank — both have only temp_address as prereq). Either
    // is acceptable here; just assert the step is actually ready.
    expect(next!.status).toBe("ready");
  });

  it("returns null when everything is complete", () => {
    const path = solve(baseProfile);
    const allIds = new Set(path.steps.map((s) => s.procedureId));
    const completedPath = solve(baseProfile, allIds);
    expect(getNextStep(completedPath)).toBeNull();
  });
});
