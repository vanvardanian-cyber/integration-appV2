"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  Globe,
  Briefcase,
  Euro,
  Heart,
  BookOpen,
} from "lucide-react";
import { saveProfile, type ProfileInput } from "@/lib/actions";

/**
 * Onboarding survey — v2.
 *
 * 7 screens, designed so that:
 *   - Every question earns its place: each field is used either by the
 *     engine (eligibility, deadlines, deadlocks) or by a downstream
 *     feature (Learn, Employer).
 *   - Driver's license and employer details are NOT asked here — those
 *     are collected just-in-time in /path and /me/employer respectively.
 *   - Step 4 (Job & money) is conditional on the reason-for-coming
 *     selected in step 3, so non-employees don't see salary questions.
 */

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const TOTAL_STEPS = 7;

type ReasonForComing =
  | "employed-blue-card"
  | "employed-other"
  | "freelance"
  | "student"
  | "researcher"
  | "family-reunion"
  | "eu-citizen"
  | "job-seeker";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [isPending, startTransition] = useTransition();

  const [profile, setProfile] = useState<Partial<ProfileInput>>({
    targetCountry: "DE",
    confidence: {},
  });
  const [reason, setReason] = useState<ReasonForComing | undefined>();

  const update = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => {
    setProfile((p) => ({
      ...p,
      [key]: value,
      confidence: { ...(p.confidence ?? {}), [key]: "confirmed" },
    }));
  };

  // The reason-for-coming selector writes BOTH employment and visaType
  // at once — that's the whole point of collapsing them into one
  // question. Each branch maps to the engine-meaningful pair.
  const setReasonAndDerivedFields = (r: ReasonForComing) => {
    setReason(r);
    const mapping: Record<
      ReasonForComing,
      { employment: ProfileInput["employment"]; visaType: ProfileInput["visaType"] }
    > = {
      "employed-blue-card": { employment: "employed", visaType: "blue-card" },
      "employed-other": { employment: "employed", visaType: "work-permit" },
      freelance: { employment: "freelance", visaType: "freelance-visa" },
      student: { employment: "student", visaType: "student" },
      researcher: { employment: "researcher", visaType: "researcher" },
      "family-reunion": { employment: "employed", visaType: "family-reunion" },
      "eu-citizen": { employment: "employed", visaType: "none" },
      "job-seeker": { employment: "job-seeker", visaType: "job-seeker" },
    };
    const m = mapping[r];
    update("employment", m.employment);
    update("visaType", m.visaType);
  };

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1) as Step);
  const back = () => setStep((s) => Math.max(0, s - 1) as Step);

  const submit = () => {
    startTransition(async () => {
      const fullProfile: ProfileInput = {
        targetCountry: profile.targetCountry ?? "DE",
        nationality: profile.nationality ?? "non-EU",
        countryOfOrigin: profile.countryOfOrigin ?? "XX",
        arrivalDate: profile.arrivalDate ?? null,
        city: profile.city ?? null,
        housing: profile.housing ?? "none",
        employment: profile.employment ?? "employed",
        visaType: profile.visaType ?? "blue-card",
        hasJobOffer: profile.hasJobOffer ?? false,
        hasSignedContract: profile.hasSignedContract ?? false,
        annualGrossSalary: profile.annualGrossSalary ?? null,
        startDate: profile.startDate ?? null,
        maritalStatus: profile.maritalStatus ?? "single",
        hasChildren: profile.hasChildren ?? false,
        spouseAccompanying: profile.spouseAccompanying ?? false,
        speaksTargetLanguage: profile.speaksTargetLanguage ?? false,
        hasUniversityDegree: profile.hasUniversityDegree ?? false,
        degreeRecognized: profile.degreeRecognized ?? "unknown",
        livedInGermanyBefore: profile.livedInGermanyBefore,
        plannedStayLength: profile.plannedStayLength,
        currentLanguageLevel: profile.currentLanguageLevel,
        goalLanguageLevel: profile.goalLanguageLevel,
        languageGoalDate: profile.languageGoalDate,
        confidence: profile.confidence ?? {},
      };
      await saveProfile(fullProfile);
      router.push("/home");
    });
  };

  return (
    <main className="min-h-screen bg-warm-gradient flex flex-col">
      <div className="max-w-md w-full mx-auto px-6 pt-6 pb-10 flex-1 flex flex-col">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-7">
          {step > 0 && (
            <button onClick={back} className="text-ink-500 hover:text-ink-900">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex-1 h-1.5 rounded-full bg-cream-300 overflow-hidden">
            <div
              className="h-full bg-warm-orange transition-all duration-300"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          <span className="text-xs text-ink-400 font-medium">
            {step + 1}/{TOTAL_STEPS}
          </span>
        </div>

        {/* Step body */}
        <div className="flex-1 flex flex-col">
          {step === 0 && <StepWhere profile={profile} update={update} onNext={next} />}
          {step === 1 && (
            <StepCitizenship profile={profile} update={update} onNext={next} />
          )}
          {step === 2 && (
            <StepReason reason={reason} onPick={setReasonAndDerivedFields} onNext={next} />
          )}
          {step === 3 && (
            <StepJobMoney
              profile={profile}
              update={update}
              reason={reason}
              onNext={next}
            />
          )}
          {step === 4 && (
            <StepFamilyHousing profile={profile} update={update} onNext={next} />
          )}
          {step === 5 && <StepGoals profile={profile} update={update} onNext={next} />}
          {step === 6 && (
            <StepReview profile={profile} reason={reason} onSubmit={submit} isPending={isPending} />
          )}
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

type StepProps = {
  profile: Partial<ProfileInput>;
  update: <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => void;
  onNext: () => void;
};

function StepHeader({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <>
      <div className="w-10 h-10 rounded-xl bg-warm-peach text-warm-orange flex items-center justify-center mb-3">
        {icon}
      </div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight mb-1.5 text-ink-700">
        {title}
      </h1>
      <p className="text-sm text-ink-400 mb-5 leading-relaxed">{sub}</p>
    </>
  );
}

function Choice({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all ${
        selected
          ? "border-warm-orange bg-warm-peach"
          : "border-transparent bg-white hover:border-cream-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink-700 text-sm">{label}</span>
        {selected && <Check size={16} className="text-warm-orange" />}
      </div>
      {hint && <div className="text-[11px] text-ink-400 mt-0.5 leading-relaxed">{hint}</div>}
    </button>
  );
}

function NextButton({
  disabled,
  onClick,
  label = "Continue",
}: {
  disabled?: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      disabled={disabled}
      className="w-full mt-6 py-3.5 rounded-2xl bg-ink-900 text-cream-100 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-ink-700 transition-colors"
    >
      {label} <ArrowRight size={14} />
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-widest text-ink-300 font-semibold mb-1.5 mt-3">
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Where + when
// ─────────────────────────────────────────────────────────────────────────────

function StepWhere({ profile, update, onNext }: StepProps) {
  return (
    <>
      <StepHeader
        icon={<MapPin size={20} />}
        title="Where and when?"
        sub="Germany only for now. NL, AT and CH ship later — same engine."
      />

      <FieldLabel>City</FieldLabel>
      <select
        value={profile.city ?? ""}
        onChange={(e) => update("city", (e.target.value || null) as ProfileInput["city"])}
        className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-sm"
      >
        <option value="">Not sure yet</option>
        <option value="Berlin">Berlin</option>
        <option value="Munich">Munich</option>
        <option value="Hamburg">Hamburg</option>
        <option value="Frankfurt">Frankfurt</option>
        <option value="Cologne">Cologne</option>
        <option value="Stuttgart">Stuttgart</option>
        <option value="Dusseldorf">Düsseldorf</option>
        <option value="Leipzig">Leipzig</option>
        <option value="other-DE">Other</option>
      </select>

      <FieldLabel>Arrival date (or expected)</FieldLabel>
      <input
        type="date"
        value={profile.arrivalDate ?? ""}
        onChange={(e) => update("arrivalDate", e.target.value || null)}
        className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-sm"
      />
      <p className="text-[11px] text-ink-300 mt-1.5 leading-relaxed">
        Leave blank if you're still planning. We'll show you the pre-arrival path either way.
      </p>

      <NextButton onClick={onNext} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Citizenship + origin
// ─────────────────────────────────────────────────────────────────────────────

function StepCitizenship({ profile, update, onNext }: StepProps) {
  return (
    <>
      <StepHeader
        icon={<Globe size={20} />}
        title="Where are you coming from?"
        sub="Some procedures depend on your passport. EU citizens skip about half the bureaucracy."
      />

      <FieldLabel>Citizenship</FieldLabel>
      <div className="space-y-1.5">
        <Choice
          selected={profile.nationality === "EU"}
          onClick={() => update("nationality", "EU")}
          label="EU / EEA / Swiss"
          hint="Visa-free movement"
        />
        <Choice
          selected={profile.nationality === "non-EU"}
          onClick={() => update("nationality", "non-EU")}
          label="Non-EU"
          hint="The full bureaucratic adventure — we've got you"
        />
        <Choice
          selected={profile.nationality === "UK"}
          onClick={() => update("nationality", "UK")}
          label="UK"
          hint="Post-Brexit: similar to non-EU but with quirks"
        />
        <Choice
          selected={profile.nationality === "Turkey"}
          onClick={() => update("nationality", "Turkey")}
          label="Turkey"
          hint="Special bilateral agreements apply"
        />
      </div>

      <FieldLabel>Country of origin (ISO-2 code, e.g. IN, BR, US)</FieldLabel>
      <input
        type="text"
        maxLength={2}
        value={profile.countryOfOrigin ?? ""}
        onChange={(e) => update("countryOfOrigin", e.target.value.toUpperCase())}
        placeholder="IN"
        className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-sm uppercase"
      />

      <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-cream-300 mt-3 cursor-pointer">
        <input
          type="checkbox"
          checked={profile.livedInGermanyBefore ?? false}
          onChange={(e) => update("livedInGermanyBefore", e.target.checked)}
          className="accent-warm-orange"
        />
        <span className="text-sm text-ink-700">I've lived in Germany before</span>
      </label>

      <NextButton disabled={!profile.nationality} onClick={onNext} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Reason for coming (sets employment + visa_type)
// ─────────────────────────────────────────────────────────────────────────────

function StepReason({
  reason,
  onPick,
  onNext,
}: {
  reason: ReasonForComing | undefined;
  onPick: (r: ReasonForComing) => void;
  onNext: () => void;
}) {
  return (
    <>
      <StepHeader
        icon={<Briefcase size={20} />}
        title="Why are you coming?"
        sub="This sets your whole path. Pick the closest match — you can refine later."
      />

      <div className="space-y-1.5">
        <Choice
          selected={reason === "employed-blue-card"}
          onClick={() => onPick("employed-blue-card")}
          label="Employed · EU Blue Card"
          hint="Skilled hire, salary above €45–50k threshold"
        />
        <Choice
          selected={reason === "employed-other"}
          onClick={() => onPick("employed-other")}
          label="Employed · standard work permit"
          hint="Below Blue Card threshold, or non-academic role"
        />
        <Choice
          selected={reason === "freelance"}
          onClick={() => onPick("freelance")}
          label="Freelance / self-employed"
          hint="Freelance visa, Finanzamt registration"
        />
        <Choice
          selected={reason === "student"}
          onClick={() => onPick("student")}
          label="Student"
          hint="Sperrkonto, university enrollment, student visa"
        />
        <Choice
          selected={reason === "researcher"}
          onClick={() => onPick("researcher")}
          label="Researcher / academic"
          hint="Research permit, often with host institution support"
        />
        <Choice
          selected={reason === "family-reunion"}
          onClick={() => onPick("family-reunion")}
          label="Joining family / partner"
          hint="Family reunion visa, A1 German required from abroad"
        />
        <Choice
          selected={reason === "eu-citizen"}
          onClick={() => onPick("eu-citizen")}
          label="EU citizen — no visa needed"
          hint="Skip visa procedures, still need Anmeldung etc."
        />
        <Choice
          selected={reason === "job-seeker"}
          onClick={() => onPick("job-seeker")}
          label="Looking for work"
          hint="Job-seeker visa or Chancenkarte (Opportunity Card)"
        />
      </div>

      <NextButton disabled={!reason} onClick={onNext} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Job & money (conditional on reason)
// ─────────────────────────────────────────────────────────────────────────────

function StepJobMoney({
  profile,
  update,
  reason,
  onNext,
}: StepProps & { reason: ReasonForComing | undefined }) {
  const showSalary =
    reason === "employed-blue-card" ||
    reason === "employed-other" ||
    reason === "researcher" ||
    reason === "family-reunion" ||
    reason === "eu-citizen";

  const showFreelance = reason === "freelance";
  const showStudent = reason === "student";

  return (
    <>
      <StepHeader
        icon={<Euro size={20} />}
        title="Your work + money"
        sub="Determines tax class, insurance threshold, and whether the PKV decision applies to you."
      />

      {showSalary && (
        <>
          <FieldLabel>Annual gross salary (EUR)</FieldLabel>
          <input
            type="range"
            min={20000}
            max={200000}
            step={1000}
            value={profile.annualGrossSalary ?? 60000}
            onChange={(e) => update("annualGrossSalary", parseInt(e.target.value))}
            className="w-full mb-1 accent-warm-orange"
          />
          <div className="flex justify-between text-[11px] text-ink-400 mb-3">
            <span>€20k</span>
            <span className="font-semibold text-ink-700">
              €{(profile.annualGrossSalary ?? 60000).toLocaleString()}
            </span>
            <span>€200k</span>
          </div>
          {(profile.annualGrossSalary ?? 0) >= 69300 && (
            <div className="text-[11px] bg-warm-peach text-ink-700 rounded-lg p-2 mb-3 leading-snug">
              ℹ️ Above €69,300 you can choose private health insurance (PKV)
              instead of public (GKV). We'll guide you through that decision.
            </div>
          )}

          <FieldLabel>Job start date</FieldLabel>
          <input
            type="date"
            value={profile.startDate ?? ""}
            onChange={(e) => update("startDate", e.target.value || null)}
            className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-sm"
          />

          <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-cream-300 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.hasSignedContract ?? false}
              onChange={(e) => update("hasSignedContract", e.target.checked)}
              className="accent-warm-orange"
            />
            <span className="text-sm text-ink-700">I've signed my employment contract</span>
          </label>
        </>
      )}

      {showFreelance && (
        <>
          <FieldLabel>Expected first-year income (EUR)</FieldLabel>
          <input
            type="range"
            min={10000}
            max={200000}
            step={1000}
            value={profile.annualGrossSalary ?? 50000}
            onChange={(e) => update("annualGrossSalary", parseInt(e.target.value))}
            className="w-full mb-1 accent-warm-orange"
          />
          <div className="flex justify-between text-[11px] text-ink-400 mb-3">
            <span>€10k</span>
            <span className="font-semibold text-ink-700">
              €{(profile.annualGrossSalary ?? 50000).toLocaleString()}
            </span>
            <span>€200k</span>
          </div>
          <div className="text-[11px] bg-warm-peach text-ink-700 rounded-lg p-2 mb-3 leading-snug">
            ℹ️ Below €22,000 in year 1 you can register as Kleinunternehmer
            (small business — no VAT). We'll flag that decision.
          </div>
        </>
      )}

      {showStudent && (
        <>
          <FieldLabel>Expected start date of studies</FieldLabel>
          <input
            type="date"
            value={profile.startDate ?? ""}
            onChange={(e) => update("startDate", e.target.value || null)}
            className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-sm"
          />
          <div className="text-[11px] bg-warm-peach text-ink-700 rounded-lg p-2 mt-3 leading-snug">
            ℹ️ You'll need a blocked account (Sperrkonto) with €11,904
            deposited before your visa interview.
          </div>
        </>
      )}

      <NextButton onClick={onNext} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — Family + housing
// ─────────────────────────────────────────────────────────────────────────────

function StepFamilyHousing({ profile, update, onNext }: StepProps) {
  return (
    <>
      <StepHeader
        icon={<Heart size={20} />}
        title="Family and first home"
        sub="Housing situation is the single biggest determinant of whether you hit the SCHUFA deadlock."
      />

      <FieldLabel>Marital status</FieldLabel>
      <select
        value={profile.maritalStatus ?? "single"}
        onChange={(e) =>
          update("maritalStatus", e.target.value as ProfileInput["maritalStatus"])
        }
        className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-sm"
      >
        <option value="single">Single</option>
        <option value="married">Married</option>
        <option value="registered-partnership">Registered partnership</option>
        <option value="divorced">Divorced</option>
      </select>

      {(profile.maritalStatus === "married" ||
        profile.maritalStatus === "registered-partnership") && (
        <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-cream-300 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={profile.spouseAccompanying ?? false}
            onChange={(e) => update("spouseAccompanying", e.target.checked)}
            className="accent-warm-orange"
          />
          <span className="text-sm text-ink-700">My spouse is joining me</span>
        </label>
      )}

      <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-cream-300 mt-2 cursor-pointer">
        <input
          type="checkbox"
          checked={profile.hasChildren ?? false}
          onChange={(e) => update("hasChildren", e.target.checked)}
          className="accent-warm-orange"
        />
        <span className="text-sm text-ink-700">I have children coming with me</span>
      </label>

      <FieldLabel>First housing situation</FieldLabel>
      <div className="space-y-1.5">
        <Choice
          selected={profile.housing === "temporary-employer"}
          onClick={() => update("housing", "temporary-employer")}
          label="Employer-provided temp flat"
          hint="They'll sign your Wohnungsgeberbestätigung — best case"
        />
        <Choice
          selected={profile.housing === "temporary-airbnb"}
          onClick={() => update("housing", "temporary-airbnb")}
          label="Hotel / Airbnb"
          hint="Most won't sign — we'll need a workaround"
        />
        <Choice
          selected={profile.housing === "temporary-friend"}
          onClick={() => update("housing", "temporary-friend")}
          label="Friend's place"
          hint="Friend can sign if willing"
        />
        <Choice
          selected={profile.housing === "permanent-rental"}
          onClick={() => update("housing", "permanent-rental")}
          label="Already have permanent rental"
          hint="Lucky — major deadlocks avoided"
        />
      </div>

      <NextButton onClick={onNext} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6 — Integration goals (language + stay length)
// ─────────────────────────────────────────────────────────────────────────────

function StepGoals({ profile, update, onNext }: StepProps) {
  const LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

  return (
    <>
      <StepHeader
        icon={<BookOpen size={20} />}
        title="Language and time horizon"
        sub="B1 German is the standard threshold for permanent residency. Knowing your starting point lets us pick the right path."
      />

      <FieldLabel>My current German level</FieldLabel>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => update("currentLanguageLevel", l)}
            className={`py-2 rounded-lg text-xs font-bold transition-colors ${
              profile.currentLanguageLevel === l
                ? "bg-warm-orange text-white"
                : "bg-white text-ink-500 hover:bg-cream-100"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-ink-300 leading-relaxed">
        A0 = starting fresh. B1 = conversational. C2 = native-level.
      </p>

      <FieldLabel>My goal level</FieldLabel>
      <div className="grid grid-cols-7 gap-1">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => update("goalLanguageLevel", l)}
            className={`py-2 rounded-lg text-xs font-bold transition-colors ${
              profile.goalLanguageLevel === l
                ? "bg-ink-900 text-cream-100"
                : "bg-white text-ink-500 hover:bg-cream-100"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <FieldLabel>How long are you planning to stay?</FieldLabel>
      <div className="space-y-1.5">
        <Choice
          selected={profile.plannedStayLength === "short"}
          onClick={() => update("plannedStayLength", "short")}
          label="1–2 years"
          hint="Assignment, exchange, gap year"
        />
        <Choice
          selected={profile.plannedStayLength === "medium"}
          onClick={() => update("plannedStayLength", "medium")}
          label="3–5 years"
          hint="Most Blue Card careers — residency in reach"
        />
        <Choice
          selected={profile.plannedStayLength === "long"}
          onClick={() => update("plannedStayLength", "long")}
          label="Settling indefinitely"
          hint="Permanent residency + naturalisation track"
        />
      </div>

      <NextButton onClick={onNext} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7 — Review + submit
// ─────────────────────────────────────────────────────────────────────────────

function StepReview({
  profile,
  reason,
  onSubmit,
  isPending,
}: {
  profile: Partial<ProfileInput>;
  reason: ReasonForComing | undefined;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const reasonLabel: Record<ReasonForComing, string> = {
    "employed-blue-card": "Blue Card employee",
    "employed-other": "Standard work permit",
    freelance: "Freelance / self-employed",
    student: "Student",
    researcher: "Researcher",
    "family-reunion": "Family reunion",
    "eu-citizen": "EU citizen",
    "job-seeker": "Job-seeker",
  };

  return (
    <>
      <StepHeader
        icon={<Check size={20} />}
        title="Ready to see your path?"
        sub="The engine combines all of this into a personalized, dependency-aware roadmap. You can update anything later."
      />

      <div className="bg-white rounded-2xl p-4 space-y-2 text-sm">
        <Row label="Going to" value={`🇩🇪 Germany${profile.city ? ` · ${profile.city}` : ""}`} />
        <Row label="From" value={profile.countryOfOrigin ?? "—"} />
        <Row label="Citizenship" value={profile.nationality ?? "—"} />
        <Row label="Path" value={reason ? reasonLabel[reason] : "—"} />
        {profile.arrivalDate && <Row label="Arrival" value={profile.arrivalDate} />}
        {profile.annualGrossSalary !== null &&
          profile.annualGrossSalary !== undefined && (
            <Row
              label="Salary / income"
              value={`€${profile.annualGrossSalary.toLocaleString()}`}
            />
          )}
        {profile.maritalStatus && <Row label="Status" value={profile.maritalStatus} />}
        {profile.hasChildren && <Row label="Kids coming" value="Yes" />}
        {profile.currentLanguageLevel && (
          <Row
            label="German"
            value={`${profile.currentLanguageLevel} → ${profile.goalLanguageLevel ?? "B1"}`}
          />
        )}
        {profile.plannedStayLength && (
          <Row
            label="Staying"
            value={
              profile.plannedStayLength === "short"
                ? "1–2 years"
                : profile.plannedStayLength === "medium"
                ? "3–5 years"
                : "Indefinitely"
            }
          />
        )}
      </div>

      <button
        onClick={onSubmit}
        type="button"
        disabled={isPending}
        className="w-full mt-6 py-4 rounded-2xl bg-warm-orange text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-warm-amber transition-colors"
      >
        {isPending ? "Generating your path..." : "Generate my path"}
        {!isPending && <ArrowRight size={16} />}
      </button>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-ink-400">{label}</span>
      <span className="font-semibold text-ink-700">{value}</span>
    </div>
  );
}
