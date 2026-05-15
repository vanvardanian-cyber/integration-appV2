/**
 * Ankommen Engine — Core Types
 *
 * Country-aware from day 1. Every Procedure declares which country/countries
 * it applies to. Every UserProfile has a targetCountry. The solver filters
 * accordingly.
 *
 * v1 ships with Germany only, but the architecture is ready for NL/AT/CH.
 */

export type Country = "DE" | "NL" | "AT" | "CH";

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────────────────────────────────────────

export type Nationality = "EU" | "non-EU" | "UK" | "Turkey";

export type EmploymentType =
  | "employed"
  | "freelance"
  | "self-employed"
  | "student"
  | "job-seeker"
  | "researcher";

export type MaritalStatus =
  | "single"
  | "married"
  | "registered-partnership"
  | "divorced";

export type HousingSituation =
  | "none"
  | "temporary-employer"
  | "temporary-airbnb"
  | "temporary-friend"
  | "permanent-rental"
  | "owned";

// CEFR language levels. A0 = no prior exposure; C2 = mastery.
export type LanguageLevel = "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/**
 * How long the user intends to stay. Drives residency-motivation copy
 * and which long-tail procedures we surface in /path.
 *
 *   short — 1–2 years (assignment, exchange, gap year)
 *   medium — 3–5 years (most Blue Card careers)
 *   long — settling indefinitely (residency + naturalisation track)
 */
export type StayHorizon = "short" | "medium" | "long";

export type VisaType =
  | "none"
  | "blue-card"
  | "work-permit"
  | "job-seeker"
  | "family-reunion"
  | "student"
  | "researcher"
  | "freelance-visa";

// City is country-aware: each country has its own city enum
export type GermanCity =
  | "Berlin" | "Munich" | "Hamburg" | "Frankfurt"
  | "Cologne" | "Stuttgart" | "Dusseldorf" | "Leipzig" | "other-DE";

export type DutchCity =
  | "Amsterdam" | "Rotterdam" | "The Hague" | "Utrecht" | "Eindhoven" | "other-NL";

export type AustrianCity =
  | "Vienna" | "Graz" | "Linz" | "Salzburg" | "other-AT";

export type SwissCity =
  | "Zurich" | "Geneva" | "Basel" | "Bern" | "other-CH";

export type City = GermanCity | DutchCity | AustrianCity | SwissCity;

/**
 * Confidence reflects whether a field was confirmed by the user, assumed
 * by the engine/employer, or simply unknown. The solver routes around
 * unknowns where possible; the UI prompts for confirmation just-in-time.
 */
export type Confidence = "confirmed" | "assumed" | "unknown";

export interface UserProfile {
  id: string;
  userId: string;

  // Where they're going (country gates everything else)
  targetCountry: Country;

  // Identity
  nationality: Nationality;
  countryOfOrigin: string; // ISO-2: "IN", "BR", "US", etc.

  // Arrival & location
  arrivalDate: string | null; // ISO date
  city: City | null;
  housing: HousingSituation;

  // Employment
  employment: EmploymentType;
  visaType: VisaType;
  hasJobOffer: boolean;
  hasSignedContract: boolean;
  annualGrossSalary: number | null;
  startDate: string | null;

  // Family
  maritalStatus: MaritalStatus;
  hasChildren: boolean;
  spouseAccompanying: boolean;

  // Misc
  speaksTargetLanguage: boolean;
  hasUniversityDegree: boolean;
  degreeRecognized: "yes" | "no" | "unknown";

  // Country-specific flags (extensible). Stored in profiles.extras jsonb,
  // surfaced as top-level booleans here so the solver predicates stay flat.
  hasIndianDrivingLicense?: boolean;
  hasUSDrivingLicense?: boolean;
  // Anything outside EU/IN/US — UK, BR, RU, AU, etc. Annex 11 of the FeV
  // governs which countries get partial recognition vs. full re-test.
  // The engine flags the procedure either way; the user sorts the detail
  // with a Fahrschule.
  hasOtherNonEUDrivingLicense?: boolean;

  // Employer block — unlocks HR-sync coordination. All optional; the
  // /me/employer page collects these post-onboarding so first-time users
  // aren't forced to know HR's email at signup.
  employerName?: string;
  hrContactName?: string;
  hrContactEmail?: string;
  officeCity?: string;

  // Language-learning goals. Surfaced in /learn and used to compute
  // urgency for the language_b1 procedure in /path.
  currentLanguageLevel?: LanguageLevel;
  goalLanguageLevel?: LanguageLevel;
  languageGoalDate?: string; // ISO date

  // Has the user lived in Germany before? Affects how much explanation
  // the UI gives for basics like Anmeldung. Not used by the solver yet
  // but cheap to capture upfront.
  livedInGermanyBefore?: boolean;

  // Intended stay duration. Lets us tune residency / naturalisation
  // procedures to the user's actual ambition.
  plannedStayLength?: StayHorizon;

  // For students only: which university (free text) and whether
  // they're still going through Uni-Assist (the centralized application
  // service for international students). Lets us surface the
  // Zulassungsbescheid prerequisite on the student path.
  institution?: string;
  applyingViaUniAssist?: boolean;

  // Per-field confidence map
  confidence: Record<string, Confidence>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCEDURE GRAPH
// ─────────────────────────────────────────────────────────────────────────────

export type ProcedureId = string;
export type ArtifactId = string;

export type Phase =
  | "pre-arrival"
  | "first-14-days"
  | "first-month"
  | "first-90-days"
  | "first-6-months"
  | "first-year"
  | "ongoing";

export type AppliesPredicate =
  | { type: "always" }
  | { type: "never" }
  | { type: "country_in"; values: Country[] }
  | { type: "nationality_in"; values: Nationality[] }
  | { type: "nationality_not_in"; values: Nationality[] }
  | { type: "employment_in"; values: EmploymentType[] }
  | { type: "city_in"; values: City[] }
  | { type: "marital_in"; values: MaritalStatus[] }
  | { type: "has_children" }
  | { type: "earns_above_threshold"; thresholdEur: number }
  | { type: "has_country_drivers_license"; country: "IN" | "US" | "OTHER" }
  | { type: "has_visa_in"; values: VisaType[] }
  | { type: "and"; clauses: AppliesPredicate[] }
  | { type: "or"; clauses: AppliesPredicate[] }
  | { type: "not"; clause: AppliesPredicate };

export type DeadlineTrigger =
  | { type: "after_arrival"; days: number }
  | { type: "after_move_in"; days: number }
  | { type: "after_procedure"; procedureId: ProcedureId; days: number }
  | { type: "before_procedure"; procedureId: ProcedureId; days: number }
  | { type: "before_visa_expiry"; days: number }
  | { type: "before_first_payroll"; days: number }
  | { type: "annual"; month: number; day: number }
  | { type: "none" };

export interface ProcessingTime {
  minDays: number;
  maxDays: number;
  notes?: string;
}

export interface CityOverride {
  city: City;
  appointmentWaitDays?: { min: number; max: number };
  officeName?: string;
  notes?: string;
  bookingUrl?: string;
}

export interface EscapePath {
  id: string;
  whenBlocked: string;
  resolution: string;
  alternativeProcedureId?: ProcedureId;
}

export interface HrSyncSpec {
  artifactsHrNeeds: ArtifactId[];
  uploadDeadlineDays?: number;
  notes?: string;
}

export interface Procedure {
  id: ProcedureId;
  country: Country; // Country gate — first thing the solver checks

  nameDe: string;
  nameEn: string;
  description: string;

  phase: Phase;
  appliesWhen: AppliesPredicate;

  prerequisites: ProcedureId[];
  softPrerequisites?: ProcedureId[];
  produces: ArtifactId[];

  deadline: DeadlineTrigger;
  processingTime: ProcessingTime;

  locationDependent: boolean;
  cityOverrides?: CityOverride[];

  costEur: number;

  documentsRequired: string[];
  officialUrl?: string;
  bookingUrl?: string;

  escapePaths: EscapePath[];
  hrSync?: HrSyncSpec;

  // Gamification
  xpReward: number;
  badgeId?: string;
  isDecisionModule?: boolean;

  notes?: string;
  lastVerified: string; // ISO date
  verificationSource?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOLVER OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

export type StepStatus =
  | "blocked"
  | "ready"
  | "in-progress"
  | "waiting"
  | "complete"
  | "skipped";

export interface PathStep {
  procedureId: ProcedureId;
  procedure: Procedure;
  status: StepStatus;
  earliestStartDate: string | null;
  recommendedStartDate: string | null;
  deadlineDate: string | null;
  expectedCompletionDate: string | null;
  blockedBy: ProcedureId[];
  unblocks: ProcedureId[];
  warnings: PathWarning[];
}

export interface PathWarning {
  severity: "info" | "warning" | "critical";
  message: string;
  suggestedEscapeId?: string;
}

export interface SolvedPath {
  profileId: string;
  country: Country;
  generatedAt: string;
  steps: PathStep[];
  deadlocks: DetectedDeadlock[];
  totalEstimatedDays: number;
  totalEstimatedCostEur: number;
  totalXpAvailable: number;
}

export interface DetectedDeadlock {
  involvedProcedureIds: ProcedureId[];
  title: string;
  description: string;
  resolution: string;
}
