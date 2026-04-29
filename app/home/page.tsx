import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, Zap, Flame, Trophy, Target, ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
import { getMyPath } from "@/lib/actions";
import { getNextStep } from "@/lib/engine/solver";
import { CompleteButton } from "@/components/complete-button";
import { BottomNav } from "@/components/bottom-nav";

export default async function HomePage() {
  const result = await getMyPath();

  // No profile yet → onboarding
  if (!result) {
    redirect("/onboarding");
  }

  const { profile, path, completedIds } = result;
  const nextStep = getNextStep(path);
  const xpEarned = path.steps
    .filter((s) => completedIds.has(s.procedureId))
    .reduce((sum, s) => sum + s.procedure.xpReward, 0);
  const completedCount = completedIds.size;
  const totalSteps = path.steps.length;
  const pct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <main className="min-h-screen bg-warm-gradient pb-24">
      <div className="max-w-md mx-auto px-6 pt-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-ink-700 leading-tight">
              Hey 👋
            </h1>
            <p className="text-sm text-ink-400 mt-1">
              {pct}% through your path. The engine knows what's next.
            </p>
          </div>
          <button className="w-10 h-10 rounded-full bg-white/70 backdrop-blur flex items-center justify-center">
            <Bell size={16} className="text-ink-700" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <Tile icon={<Zap size={12} />} value={xpEarned.toString()} label="XP earned" color="text-warm-orange" />
          <Tile icon={<Flame size={12} />} value={completedCount.toString()} label="done" color="text-warm-amber" />
          <Tile icon={<Trophy size={12} />} value={path.deadlocks.length.toString()} label="risks spotted" color="text-yellow-600" />
        </div>

        {/* Today's Mission */}
        {nextStep ? (
          <div className="relative overflow-hidden rounded-3xl p-6 mb-5 text-cream-100 bg-gradient-to-br from-ink-700 to-ink-900">
            <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-warm-orange/30 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Target size={12} className="text-warm-peach" />
                <span className="text-[10px] uppercase tracking-widest text-warm-peach font-semibold">
                  Today's mission · engine-picked
                </span>
              </div>
              <h2 className="font-serif text-2xl font-semibold mb-2 leading-tight">
                {nextStep.procedure.nameEn}
              </h2>
              <p className="text-xs text-cream-300 mb-3 leading-relaxed">
                {nextStep.procedure.nameDe} ·{" "}
                {nextStep.deadlineDate ? `Due ${nextStep.deadlineDate}` : "No deadline"}
                {nextStep.warnings.some((w) => w.severity === "critical") && (
                  <span className="text-red-300 font-semibold"> · OVERDUE</span>
                )}
              </p>
              <p className="text-xs text-cream-300 mb-4 leading-relaxed">
                {nextStep.procedure.description}
              </p>
              <div className="flex items-center justify-between gap-3">
                <CompleteButton procedureId={nextStep.procedureId} xp={nextStep.procedure.xpReward} />
                <div className="flex items-center gap-1 text-xs text-warm-peach">
                  <Sparkles size={12} /> +{nextStep.procedure.xpReward} XP
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl p-6 mb-5 bg-green-100 text-green-900 text-center">
            <div className="font-serif text-2xl font-semibold mb-2">🎉 You're done!</div>
            <p className="text-sm">All applicable steps complete. You've made it.</p>
          </div>
        )}

        {/* Deadlocks the engine spotted */}
        {path.deadlocks.length > 0 && (
          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold mb-2 flex items-center gap-1">
              <AlertTriangle size={11} /> Engine warnings for your situation
            </div>
            {path.deadlocks.slice(0, 3).map((d, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 mb-2 border-l-4 border-warm-orange"
              >
                <div className="text-sm font-semibold text-ink-700 mb-1">{d.title}</div>
                <div className="text-xs text-ink-400 leading-relaxed mb-2">{d.description}</div>
                <div className="text-xs text-green-700 leading-relaxed">
                  <span className="font-semibold">Resolution:</span> {d.resolution}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick link to full path */}
        <Link
          href="/path"
          className="flex items-center justify-between bg-white rounded-2xl p-4 mb-2 hover:bg-cream-100 transition-colors"
        >
          <div>
            <div className="text-sm font-semibold text-ink-700">See your full path</div>
            <div className="text-xs text-ink-400">{totalSteps} steps · personalized for you</div>
          </div>
          <ArrowRight size={16} className="text-ink-400" />
        </Link>
      </div>

      <BottomNav active="home" />
    </main>
  );
}

function Tile({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-3 text-center">
      <div className={`flex items-center justify-center gap-1 ${color}`}>
        {icon}
        <span className="font-serif text-base font-semibold text-ink-700">{value}</span>
      </div>
      <div className="text-[9px] uppercase tracking-wider text-ink-400 font-semibold">{label}</div>
    </div>
  );
}
