"use client";

import { useState, useTransition } from "react";
import { Check, Calendar, TrendingUp } from "lucide-react";
import { saveLanguageGoals } from "@/lib/actions";
import type { UserProfile, LanguageLevel } from "@/types/engine";

const LEVELS: LanguageLevel[] = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];

export function LanguageGoalsForm({ initial }: { initial: UserProfile }) {
  const [current, setCurrent] = useState<LanguageLevel | undefined>(
    initial.currentLanguageLevel
  );
  const [goal, setGoal] = useState<LanguageLevel | undefined>(
    initial.goalLanguageLevel ?? "B1"
  );
  const [goalDate, setGoalDate] = useState(initial.languageGoalDate ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await saveLanguageGoals({
        currentLanguageLevel: current,
        goalLanguageLevel: goal,
        languageGoalDate: goalDate,
      });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2400);
    });
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl p-4 mb-5">
      <div className="text-[10px] uppercase tracking-widest text-ink-300 font-semibold mb-2 flex items-center gap-1.5">
        <TrendingUp size={12} /> Where I am now
      </div>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setCurrent(l)}
            className={`py-2 rounded-lg text-xs font-bold transition-colors ${
              current === l
                ? "bg-warm-orange text-white"
                : "bg-cream-100 text-ink-500 hover:bg-cream-200"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-widest text-ink-300 font-semibold mb-2 flex items-center gap-1.5">
        <TrendingUp size={12} /> Where I want to be
      </div>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setGoal(l)}
            className={`py-2 rounded-lg text-xs font-bold transition-colors ${
              goal === l
                ? "bg-ink-900 text-cream-100"
                : "bg-cream-100 text-ink-500 hover:bg-cream-200"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-widest text-ink-300 font-semibold mb-1.5 flex items-center gap-1.5">
        <Calendar size={12} /> Target date
      </div>
      <input
        type="date"
        value={goalDate}
        onChange={(e) => setGoalDate(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-white text-sm focus:outline-none focus:border-ink-700 mb-3"
      />
      <p className="text-[10px] text-ink-300 mb-3 leading-relaxed">
        Tip: B1 is the standard threshold for unbefristete Niederlassungserlaubnis at year 5.
        B2 unlocks it at year 3.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-xl bg-ink-900 text-cream-100 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {savedAt ? (
          <>
            <Check size={14} /> Saved
          </>
        ) : isPending ? (
          "Saving…"
        ) : (
          "Save my goals"
        )}
      </button>
    </form>
  );
}
