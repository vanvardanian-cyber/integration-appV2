import { redirect } from "next/navigation";
import { Check, Lock, Calendar, Euro, Sparkles, Briefcase } from "lucide-react";
import { getMyPath } from "@/lib/actions";
import { CompleteButton } from "@/components/complete-button";
import { BottomNav } from "@/components/bottom-nav";

const phaseColors: Record<string, { bg: string; text: string }> = {
  "pre-arrival": { bg: "bg-purple-100", text: "text-purple-800" },
  "first-14-days": { bg: "bg-red-100", text: "text-red-800" },
  "first-month": { bg: "bg-orange-100", text: "text-orange-800" },
  "first-90-days": { bg: "bg-yellow-100", text: "text-yellow-800" },
  "first-6-months": { bg: "bg-blue-100", text: "text-blue-800" },
  "first-year": { bg: "bg-green-100", text: "text-green-800" },
};

const phaseNames: Record<string, string> = {
  "pre-arrival": "Pre-arrival",
  "first-14-days": "First 14 days",
  "first-month": "First month",
  "first-90-days": "First 90 days",
  "first-6-months": "First 6 months",
  "first-year": "First year",
};

export default async function PathPage() {
  const result = await getMyPath();
  if (!result) redirect("/onboarding");
  const { path, completedIds } = result;

  return (
    <main className="min-h-screen bg-warm-gradient pb-24">
      <div className="max-w-md mx-auto px-6 pt-8">
        <h1 className="font-serif text-3xl font-semibold text-ink-700 leading-tight">Your path</h1>
        <p className="text-sm text-ink-400 mt-1 mb-6">
          {completedIds.size} of {path.steps.length} done · {path.totalEstimatedDays} days estimated
        </p>

        <div className="space-y-2">
          {path.steps.map((step, i) => {
            const isComplete = completedIds.has(step.procedureId);
            const isReady = step.status === "ready";
            const isBlocked = step.status === "blocked";
            const colors = phaseColors[step.procedure.phase] ?? phaseColors["first-month"];
            const isCritical = step.warnings.some((w) => w.severity === "critical");

            return (
              <div
                key={step.procedureId}
                className={`rounded-2xl p-4 ${
                  isComplete ? "bg-white/50 opacity-60" : "bg-white"
                } ${isCritical && !isComplete ? "border-l-4 border-red-400" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isComplete
                        ? "bg-green-600"
                        : isBlocked
                        ? "bg-cream-300"
                        : "bg-warm-peach"
                    }`}
                  >
                    {isComplete ? (
                      <Check size={14} className="text-white" strokeWidth={3} />
                    ) : isBlocked ? (
                      <Lock size={12} className="text-ink-400" />
                    ) : (
                      <span className="text-xs font-bold text-warm-orange">{i + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          isComplete ? "line-through text-ink-300" : "text-ink-700"
                        }`}
                      >
                        {step.procedure.nameEn}
                      </span>
                      <span
                        className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-semibold ${colors.bg} ${colors.text}`}
                      >
                        {phaseNames[step.procedure.phase]}
                      </span>
                      {step.procedure.isDecisionModule && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800">
                          decision
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-ink-400 mt-1">{step.procedure.nameDe}</div>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-400 flex-wrap">
                      {step.deadlineDate && (
                        <span className={`flex items-center gap-1 ${isCritical ? "text-red-600 font-semibold" : ""}`}>
                          <Calendar size={10} />
                          Due {step.deadlineDate}
                        </span>
                      )}
                      {step.procedure.costEur > 0 && (
                        <span className="flex items-center gap-1">
                          <Euro size={10} />
                          {step.procedure.costEur}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-warm-orange">
                        <Sparkles size={10} />
                        {step.procedure.xpReward} XP
                      </span>
                    </div>

                    {isCritical && step.procedure.escapePaths.length > 0 && (
                      <div className="mt-2 p-2 rounded-lg bg-yellow-100 text-yellow-900 text-[11px] flex gap-1.5">
                        <Sparkles size={11} className="mt-0.5 flex-shrink-0" />
                        <span><strong>Escape:</strong> {step.procedure.escapePaths[0].resolution}</span>
                      </div>
                    )}

                    {isBlocked && step.blockedBy.length > 0 && (
                      <div className="mt-2 text-[11px] text-ink-400 italic">
                        Waiting on: {step.blockedBy.join(", ")}
                      </div>
                    )}

                    {isReady && !isComplete && (
                      <div className="mt-3">
                        <CompleteButton procedureId={step.procedureId} xp={step.procedure.xpReward} small />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav active="path" />
    </main>
  );
}
