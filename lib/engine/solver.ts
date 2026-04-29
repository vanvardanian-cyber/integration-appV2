import type {
  AppliesPredicate,
  DetectedDeadlock,
  PathStep,
  PathWarning,
  Procedure,
  ProcedureId,
  SolvedPath,
  StepStatus,
  UserProfile,
} from "@/types/engine";
import { getProceduresForCountry, procedureMap } from "@/lib/procedures";

// ─────────────────────────────────────────────────────────────────────────────
// PREDICATE EVALUATOR
// ─────────────────────────────────────────────────────────────────────────────

export function evaluatePredicate(p: AppliesPredicate, u: UserProfile): boolean {
  switch (p.type) {
    case "always": return true;
    case "never": return false;
    case "country_in": return p.values.includes(u.targetCountry);
    case "nationality_in": return p.values.includes(u.nationality);
    case "nationality_not_in": return !p.values.includes(u.nationality);
    case "employment_in": return p.values.includes(u.employment);
    case "city_in": return u.city ? p.values.includes(u.city) : false;
    case "marital_in": return p.values.includes(u.maritalStatus);
    case "has_children": return u.hasChildren;
    case "earns_above_threshold":
      return (u.annualGrossSalary || 0) >= p.thresholdEur;
    case "has_country_drivers_license":
      if (p.country === "IN") return !!u.hasIndianDrivingLicense;
      if (p.country === "US") return !!u.hasUSDrivingLicense;
      if (p.country === "OTHER") return !!u.hasOtherNonEUDrivingLicense;
      return false;
    case "has_visa_in": return p.values.includes(u.visaType);
    case "and": return p.clauses.every((c) => evaluatePredicate(c, u));
    case "or": return p.clauses.some((c) => evaluatePredicate(c, u));
    case "not": return !evaluatePredicate(p.clause, u);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function computeDeadline(
  procedure: Procedure,
  profile: UserProfile,
  completionDates: Map<ProcedureId, string>
): string | null {
  const t = procedure.deadline;
  switch (t.type) {
    case "none": return null;
    case "after_arrival":
      return profile.arrivalDate ? addDays(profile.arrivalDate, t.days) : null;
    case "after_move_in":
      return profile.arrivalDate ? addDays(profile.arrivalDate, t.days) : null;
    case "after_procedure": {
      const c = completionDates.get(t.procedureId);
      return c ? addDays(c, t.days) : null;
    }
    case "before_procedure": {
      const c = completionDates.get(t.procedureId);
      return c ? addDays(c, -t.days) : null;
    }
    case "before_visa_expiry":
      return profile.arrivalDate ? addDays(profile.arrivalDate, 90 - t.days) : null;
    case "before_first_payroll":
      if (profile.startDate) {
        const start = new Date(profile.startDate);
        const payroll = new Date(start.getFullYear(), start.getMonth() + 1, 25);
        return addDays(payroll.toISOString().slice(0, 10), -t.days);
      }
      return null;
    case "annual": {
      // Pick the next future occurrence of (month, day). This rolls forward
      // every year automatically — a returning user in 2028 sees the 2028
      // deadline, not the 2026 one we computed at first filing.
      //
      // Reference for "today" is the user's arrival date (so a not-yet-
      // arrived user gets a meaningful first deadline) but no earlier
      // than the actual current date (so an old arrivalDate doesn't
      // produce a deadline already in the past).
      const arrival = profile.arrivalDate ? new Date(profile.arrivalDate) : new Date();
      const today = new Date();
      const reference = arrival > today ? arrival : today;
      const mm = String(t.month).padStart(2, "0");
      const dd = String(t.day).padStart(2, "0");
      let year = reference.getFullYear();
      // If this year's date has already passed (relative to reference), bump.
      if (
        reference.getMonth() + 1 > t.month ||
        (reference.getMonth() + 1 === t.month && reference.getDate() > t.day)
      ) {
        year += 1;
      }
      return `${year}-${mm}-${dd}`;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOPOLOGICAL SORT
// ─────────────────────────────────────────────────────────────────────────────

function topologicalSort(procedures: Procedure[]): Procedure[] {
  const phaseOrder: Record<string, number> = {
    "pre-arrival": 0,
    "first-14-days": 1,
    "first-month": 2,
    "first-90-days": 3,
    "first-6-months": 4,
    "first-year": 5,
    ongoing: 6,
  };

  const ids = new Set(procedures.map((p) => p.id));
  const inDegree = new Map<ProcedureId, number>();
  const adj = new Map<ProcedureId, ProcedureId[]>();

  for (const p of procedures) {
    inDegree.set(p.id, 0);
    adj.set(p.id, []);
  }
  for (const p of procedures) {
    for (const prereq of p.prerequisites) {
      if (!ids.has(prereq)) continue;
      adj.get(prereq)!.push(p.id);
      inDegree.set(p.id, (inDegree.get(p.id) ?? 0) + 1);
    }
  }

  const queue = procedures
    .filter((p) => inDegree.get(p.id) === 0)
    .sort((a, b) => phaseOrder[a.phase] - phaseOrder[b.phase]);

  const result: Procedure[] = [];
  while (queue.length > 0) {
    queue.sort((a, b) => phaseOrder[a.phase] - phaseOrder[b.phase]);
    const node = queue.shift()!;
    result.push(node);
    for (const neighborId of adj.get(node.id) ?? []) {
      inDegree.set(neighborId, (inDegree.get(neighborId) ?? 0) - 1);
      if (inDegree.get(neighborId) === 0) {
        const neighbor = procedures.find((p) => p.id === neighborId)!;
        queue.push(neighbor);
      }
    }
  }

  if (result.length !== procedures.length) {
    throw new Error("Cycle detected in procedure graph");
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEADLOCK DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function detectDeadlocks(applicable: Procedure[], profile: UserProfile): DetectedDeadlock[] {
  const ids = new Set(applicable.map((p) => p.id));
  const deadlocks: DetectedDeadlock[] = [];

  if (
    ids.has("anmeldung") &&
    ids.has("schufa") &&
    ids.has("permanent_apartment") &&
    profile.housing !== "permanent-rental"
  ) {
    deadlocks.push({
      involvedProcedureIds: ["anmeldung", "schufa", "permanent_apartment"],
      title: "The Anmeldung-SCHUFA-Apartment trap",
      description: "Long-term apartments need SCHUFA. SCHUFA needs an Anmeldung. Anmeldung needs an address.",
      resolution: "Register at the temporary employer apartment first. Build SCHUFA history during temp stay. Then hunt for permanent rental.",
    });
  }

  const anmeldung = applicable.find((p) => p.id === "anmeldung");
  const cityOverride = anmeldung?.cityOverrides?.find((c) => c.city === profile.city);
  if (cityOverride?.appointmentWaitDays && cityOverride.appointmentWaitDays.min > 14) {
    deadlocks.push({
      involvedProcedureIds: ["anmeldung"],
      title: `${profile.city} Bürgeramt overload`,
      description: `Wait time of ${cityOverride.appointmentWaitDays.min}-${cityOverride.appointmentWaitDays.max} days exceeds the 14-day Anmeldung deadline.`,
      resolution: "Document booking attempts. Authorities don't fine when slots are objectively unavailable. Book the earliest available.",
    });
  }

  if (ids.has("online_bank") && profile.startDate && profile.arrivalDate) {
    const days = (new Date(profile.startDate).getTime() - new Date(profile.arrivalDate).getTime()) / 86400000;
    if (days < 30) {
      deadlocks.push({
        involvedProcedureIds: ["online_bank", "anmeldung"],
        title: "IBAN-before-payroll race",
        description: "First payroll likely runs before Anmeldung is complete.",
        resolution: "Open N26/Revolut/Wise in week 1 — passport-only, no Anmeldung needed.",
      });
    }
  }

  if (ids.has("steuer_id") && profile.startDate) {
    deadlocks.push({
      involvedProcedureIds: ["steuer_id"],
      title: "Steuer-ID delay = emergency tax",
      description: "Steuer-ID arrives 2-4 weeks after Anmeldung, often after first payroll.",
      resolution: "Employer runs payroll provisionally with Steuerklasse 6 (~42% emergency tax). Refunded retroactively. This is normal.",
    });
  }

  return deadlocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SOLVER
// ─────────────────────────────────────────────────────────────────────────────

export function solve(profile: UserProfile, completedIds: Set<ProcedureId> = new Set()): SolvedPath {
  // 1. Filter by country first
  const countryProcedures = getProceduresForCountry(profile.targetCountry);

  // 2. Filter by applicability predicate
  const applicable = countryProcedures.filter((p) => evaluatePredicate(p.appliesWhen, profile));

  // 3. Topologically sort
  const sorted = topologicalSort(applicable);

  // 4. Detect deadlocks
  const deadlocks = detectDeadlocks(applicable, profile);

  // 5. Compute dates and steps
  const completionDates = new Map<ProcedureId, string>();
  const steps: PathStep[] = [];
  let totalCost = 0;
  let totalXp = 0;
  let runningDate = profile.arrivalDate ?? new Date().toISOString().slice(0, 10);

  for (const procedure of sorted) {
    // FIXED: pre-arrival procedures don't gate post-arrival timeline
    const isPostArrival = procedure.phase !== "pre-arrival";

    const prereqDates = procedure.prerequisites
      .map((id) => {
        const pr = procedureMap.get(id);
        if (!pr) return undefined;
        if (isPostArrival && pr.phase === "pre-arrival") return undefined;
        return completionDates.get(id);
      })
      .filter((d): d is string => !!d);

    let earliestStart =
      prereqDates.length > 0 ? prereqDates.sort().slice(-1)[0] : runningDate;
    if (isPostArrival && profile.arrivalDate && earliestStart < profile.arrivalDate) {
      earliestStart = profile.arrivalDate;
    }

    // City-specific processing time
    let processingMax = procedure.processingTime.maxDays;
    if (procedure.locationDependent && procedure.cityOverrides && profile.city) {
      const override = procedure.cityOverrides.find((c) => c.city === profile.city);
      if (override?.appointmentWaitDays) {
        processingMax = override.appointmentWaitDays.max;
      }
    }

    const expectedCompletion = addDays(earliestStart, processingMax);
    completionDates.set(procedure.id, expectedCompletion);

    const deadlineDate = computeDeadline(procedure, profile, completionDates);

    const isComplete = completedIds.has(procedure.id);
    const blockedBy = procedure.prerequisites.filter((id) => !completedIds.has(id));
    let status: StepStatus;
    if (isComplete) status = "complete";
    else if (blockedBy.length > 0) status = "blocked";
    else status = "ready";

    const warnings: PathWarning[] = [];
    if (!isComplete && deadlineDate && deadlineDate < expectedCompletion) {
      warnings.push({
        severity: "critical",
        message: `Expected completion (${expectedCompletion}) is after the deadline (${deadlineDate}). Apply escape path.`,
      });
    }

    const unblocks = sorted
      .filter((other) => other.prerequisites.includes(procedure.id))
      .map((p) => p.id);

    steps.push({
      procedureId: procedure.id,
      procedure,
      status,
      earliestStartDate: earliestStart,
      recommendedStartDate: earliestStart,
      deadlineDate,
      expectedCompletionDate: expectedCompletion,
      blockedBy,
      unblocks,
      warnings,
    });

    if (!isComplete) {
      totalCost += procedure.costEur;
      totalXp += procedure.xpReward;
    }
    if (expectedCompletion > runningDate) runningDate = expectedCompletion;
  }

  const firstDate = steps[0]?.earliestStartDate;
  const lastDate = steps[steps.length - 1]?.expectedCompletionDate;
  const totalDays =
    firstDate && lastDate
      ? Math.round((new Date(lastDate).getTime() - new Date(firstDate).getTime()) / 86400000)
      : 0;

  return {
    profileId: profile.id,
    country: profile.targetCountry,
    generatedAt: new Date().toISOString(),
    steps,
    deadlocks,
    totalEstimatedDays: totalDays,
    totalEstimatedCostEur: totalCost,
    totalXpAvailable: totalXp,
  };
}

/**
 * Find the "next" step the user should work on — the first ready (unblocked, incomplete) step.
 */
export function getNextStep(path: SolvedPath): PathStep | null {
  return path.steps.find((s) => s.status === "ready") ?? null;
}
