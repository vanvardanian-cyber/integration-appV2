"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { saveProfile, type ProfileInput } from "@/lib/actions";

/**
 * The onboarding survey is the bridge between a fresh user and a solvable profile.
 *
 * Design principles:
 * - 6 screens max, one decision per screen
 * - Skippable fields where reasonable (we mark them "unknown" and the engine
 *   asks just-in-time later)
 * - Show the why for each question — newcomers don't trust forms
 * - Mobile-first: every screen fits a phone, big touch targets
 */

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const TOTAL_STEPS = 6;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [isPending, startTransition] = useTransition();

  // The profile being built
  const [profile, setProfile] = useState<Partial<ProfileInput>>({
    targetCountry: "DE",
    confidence: {},
  });

  const update = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => {
    setProfile((p) => ({
      ...p,
      [key]: value,
      confidence: { ...(p.confidence ?? {}), [key]: "confirmed" },
    }));
  };

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1) as Step);
  const back = () => setStep((s) => Math.max(0, s - 1) as Step);

  const submit = () => {
    startTransition(async () => {
      // Fill in safe defaults for fields the survey didn't cover
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
        hasIndianDrivingLicense: profile.hasIndianDrivingLicense,
        hasUSDrivingLicense: profile.hasUSDrivingLicense,
        hasOtherNonEUDrivingLicense: profile.hasOtherNonEUDrivingLicense,
        confidence: profile.confidence ?? {},
      };
      await saveProfile(fullProfile);
      router.push("/home");
    });
  };

  return (
    <main className="min-h-screen bg-warm-gradient flex flex-col">
      <div className="max-w-md w-full mx-auto px-6 pt-6 flex-1 flex flex-col">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
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

        {/* Steps */}
        <div className="flex-1 flex flex-col">
          {step === 0 && <Step0 profile={profile} update={update} onNext={next} />}
          {step === 1 && <Step1 profile={profile} update={update} onNext={next} />}
          {step === 2 && <Step2 profile={profile} update={update} onNext={next} />}
          {step === 3 && <Step3 profile={profile} update={update} onNext={next} />}
          {step === 4 && <Step4 profile={profile} update={update} onNext={next} />}
          {step === 5 && (
            <Step5 profile={profile} onSubmit={submit} isPending={isPending} />
          )}
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

type StepProps = {
  profile: Partial<ProfileInput>;
  update: <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => void;
  onNext: () => void;
};

function StepHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h1 className="font-serif text-3xl font-semibold tracking-tight mb-2 text-ink-700">
        {title}
      </h1>
      <p className="text-sm text-ink-400 mb-6 leading-relaxed">{sub}</p>
    </>
  );
}

function ChoiceButton({
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
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
        selected
          ? "border-warm-orange bg-warm-peach"
          : "border-transparent bg-white hover:border-cream-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink-700">{label}</span>
        {selected && <Check size={18} className="text-warm-orange" />}
      </div>
      {hint && <div className="text-xs text-ink-400 mt-1">{hint}</div>}
    </button>
  );
}

function NextButton({ disabled, onClick, label = "Continue" }: { disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full mt-6 py-4 rounded-2xl bg-ink-900 text-cream-100 font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-ink-700 transition-colors"
    >
      {label} <ArrowRight size={16} />
    </button>
  );
}

// Step 0: Where are you going?
function Step0({ profile, update, onNext }: StepProps) {
  return (
    <>
      <StepHeader
        title="Where are you headed?"
        sub="We'll personalize everything based on the country. Right now we know Germany inside-out."
      />
      <div className="space-y-2">
        <ChoiceButton
          selected={profile.targetCountry === "DE"}
          onClick={() => update("targetCountry", "DE")}
          label="🇩🇪 Germany"
          hint="Available now"
        />
        <ChoiceButton selected={false} onClick={() => {}} label="🇳🇱 Netherlands · Coming soon" />
        <ChoiceButton selected={false} onClick={() => {}} label="🇦🇹 Austria · Coming soon" />
        <ChoiceButton selected={false} onClick={() => {}} label="🇨🇭 Switzerland · Coming soon" />
      </div>
      <NextButton disabled={!profile.targetCountry} onClick={onNext} />
    </>
  );
}

// Step 1: Citizenship
function Step1({ profile, update, onNext }: StepProps) {
  return (
    <>
      <StepHeader
        title="What's your citizenship?"
        sub="EU citizens skip about half the bureaucracy. Non-EU folks get the full treatment."
      />
      <div className="space-y-2">
        <ChoiceButton
          selected={profile.nationality === "EU"}
          onClick={() => {
            update("nationality", "EU");
            update("visaType", "none");
          }}
          label="EU / EEA / Swiss citizen"
          hint="Visa-free movement, much simpler path"
        />
        <ChoiceButton
          selected={profile.nationality === "non-EU"}
          onClick={() => update("nationality", "non-EU")}
          label="Non-EU citizen"
          hint="The full bureaucratic adventure. We've got you."
        />
        <ChoiceButton
          selected={profile.nationality === "UK"}
          onClick={() => update("nationality", "UK")}
          label="UK citizen"
          hint="Post-Brexit: similar to non-EU but with quirks"
        />
      </div>
      <NextButton disabled={!profile.nationality} onClick={onNext} />
    </>
  );
}

// Step 2: Employment + visa
function Step2({ profile, update, onNext }: StepProps) {
  const isEU = profile.nationality === "EU";
  return (
    <>
      <StepHeader
        title="What kind of work?"
        sub={isEU ? "EU citizens don't need a visa, but employment type still matters for taxes and insurance." : "Different visas, different paths. Pick what applies."}
      />
      <div className="space-y-2">
        <ChoiceButton
          selected={profile.visaType === "blue-card"}
          onClick={() => {
            update("visaType", "blue-card");
            update("employment", "employed");
          }}
          label="Employed · EU Blue Card"
          hint="Salary-qualified employment, the most common path for skilled hires"
        />
        <ChoiceButton
          selected={profile.visaType === "work-permit"}
          onClick={() => {
            update("visaType", "work-permit");
            update("employment", "employed");
          }}
          label="Employed · Standard work permit"
          hint="Below Blue Card threshold, or shortage occupation"
        />
        <ChoiceButton
          selected={profile.employment === "freelance"}
          onClick={() => {
            update("visaType", "freelance-visa");
            update("employment", "freelance");
          }}
          label="Freelance / self-employed"
          hint="Different tax + insurance rules"
        />
        <ChoiceButton
          selected={profile.visaType === "none" && profile.nationality === "EU"}
          onClick={() => {
            update("visaType", "none");
            update("employment", "employed");
          }}
          label="EU citizen, employed"
          hint="No visa needed"
        />
      </div>
      <NextButton disabled={!profile.visaType} onClick={onNext} />
    </>
  );
}

// Step 3: City + arrival
function Step3({ profile, update, onNext }: StepProps) {
  return (
    <>
      <StepHeader
        title="When and where?"
        sub="If you don't know yet, leave blank. We'll ask later."
      />
      <label className="text-xs uppercase tracking-widest text-ink-300 font-semibold mb-2 block">
        German city
      </label>
      <select
        value={profile.city ?? ""}
        onChange={(e) => update("city", e.target.value || null)}
        className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-sm focus:outline-none focus:border-ink-900 mb-4"
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

      <label className="text-xs uppercase tracking-widest text-ink-300 font-semibold mb-2 block">
        Expected arrival date
      </label>
      <input
        type="date"
        value={profile.arrivalDate ?? ""}
        onChange={(e) => update("arrivalDate", e.target.value || null)}
        className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-sm focus:outline-none focus:border-ink-900 mb-4"
      />

      <label className="text-xs uppercase tracking-widest text-ink-300 font-semibold mb-2 block">
        Where will you stay first? (this matters more than you'd think)
      </label>
      <div className="space-y-2">
        <ChoiceButton
          selected={profile.housing === "temporary-employer"}
          onClick={() => update("housing", "temporary-employer")}
          label="Employer-provided temp flat"
          hint="They'll sign your Wohnungsgeberbestätigung — best case"
        />
        <ChoiceButton
          selected={profile.housing === "temporary-airbnb"}
          onClick={() => update("housing", "temporary-airbnb")}
          label="Hotel / Airbnb"
          hint="Most won't sign Wohnungsgeberbestätigung — we'll need a workaround"
        />
        <ChoiceButton
          selected={profile.housing === "temporary-friend"}
          onClick={() => update("housing", "temporary-friend")}
          label="Friend's place"
          hint="Friend can sign Wohnungsgeberbestätigung if willing"
        />
        <ChoiceButton
          selected={profile.housing === "permanent-rental"}
          onClick={() => update("housing", "permanent-rental")}
          label="Already have a permanent rental"
          hint="Lucky you — major deadlocks avoided"
        />
      </div>

      <NextButton onClick={onNext} />
    </>
  );
}

// Step 4: Salary + family
function Step4({ profile, update, onNext }: StepProps) {
  return (
    <>
      <StepHeader
        title="A few last details"
        sub="These affect your tax class and which decisions need extra thought."
      />

      <label className="text-xs uppercase tracking-widest text-ink-300 font-semibold mb-2 block">
        Annual gross salary (EUR)
      </label>
      <input
        type="range"
        min={20000}
        max={200000}
        step={1000}
        value={profile.annualGrossSalary ?? 60000}
        onChange={(e) => update("annualGrossSalary", parseInt(e.target.value))}
        className="w-full mb-1"
      />
      <div className="flex justify-between text-xs text-ink-400 mb-4">
        <span>€20k</span>
        <span className="font-semibold text-ink-700">
          €{(profile.annualGrossSalary ?? 60000).toLocaleString()}
        </span>
        <span>€200k</span>
      </div>
      {(profile.annualGrossSalary ?? 0) >= 69300 && (
        <div className="text-xs bg-warm-peach text-ink-700 rounded-lg p-2 mb-4">
          ℹ️ Above €69,300 you can choose private health insurance (PKV) instead of public (GKV).
          We'll guide you through that decision.
        </div>
      )}

      <label className="text-xs uppercase tracking-widest text-ink-300 font-semibold mb-2 block">
        Marital status
      </label>
      <select
        value={profile.maritalStatus ?? "single"}
        onChange={(e) =>
          update("maritalStatus", e.target.value as ProfileInput["maritalStatus"])
        }
        className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white text-sm mb-4"
      >
        <option value="single">Single</option>
        <option value="married">Married</option>
        <option value="registered-partnership">Registered partnership</option>
        <option value="divorced">Divorced</option>
      </select>

      <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-cream-300 cursor-pointer mb-2">
        <input
          type="checkbox"
          checked={profile.hasChildren ?? false}
          onChange={(e) => update("hasChildren", e.target.checked)}
        />
        <span className="text-sm">I have children</span>
      </label>
      <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-cream-300 cursor-pointer mb-2">
        <input
          type="checkbox"
          checked={profile.hasIndianDrivingLicense ?? false}
          onChange={(e) => update("hasIndianDrivingLicense", e.target.checked)}
        />
        <span className="text-sm">I have an Indian driving license</span>
      </label>
      <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-cream-300 cursor-pointer mb-2">
        <input
          type="checkbox"
          checked={profile.hasUSDrivingLicense ?? false}
          onChange={(e) => update("hasUSDrivingLicense", e.target.checked)}
        />
        <span className="text-sm">I have a US driving license</span>
      </label>
      <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-cream-300 cursor-pointer">
        <input
          type="checkbox"
          checked={profile.hasOtherNonEUDrivingLicense ?? false}
          onChange={(e) => update("hasOtherNonEUDrivingLicense", e.target.checked)}
        />
        <span className="text-sm">I have a non-EU driving license (other country)</span>
      </label>

      <NextButton onClick={onNext} />
    </>
  );
}

// Step 5: Confirm + submit
function Step5({
  profile,
  onSubmit,
  isPending,
}: {
  profile: Partial<ProfileInput>;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <>
      <StepHeader
        title="Ready to see your path?"
        sub="We'll generate a personalized, dependency-aware roadmap. You can update anything later."
      />

      <div className="bg-white rounded-2xl p-5 space-y-3">
        <Row label="Going to" value={`🇩🇪 Germany${profile.city ? ` · ${profile.city}` : ""}`} />
        <Row label="Citizenship" value={profile.nationality ?? "—"} />
        <Row label="Path" value={profile.visaType ?? "—"} />
        {profile.arrivalDate && <Row label="Arrival" value={profile.arrivalDate} />}
        {profile.annualGrossSalary && (
          <Row label="Salary" value={`€${profile.annualGrossSalary.toLocaleString()}`} />
        )}
        <Row label="Status" value={profile.maritalStatus ?? "—"} />
      </div>

      <button
        onClick={onSubmit}
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
