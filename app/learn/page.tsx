import { redirect } from "next/navigation";
import { ExternalLink, Sparkles, Target, Award } from "lucide-react";
import { getMyPath } from "@/lib/actions";
import { BottomNav } from "@/components/bottom-nav";
import { LanguageGoalsForm } from "@/components/language-goals-form";
import { pickPaths, examsFor, levelGap } from "@/lib/learn/recommendations";

/**
 * /learn — language hub.
 *
 * Order on the page:
 *   1. Goals form (current → target → date)
 *   2. Profile-aware course recommendations (BAMF, VHS, Goethe, DW, Tandem)
 *   3. Exam options for the user's target level
 *   4. Daily nudge — link to a free DW Nicos Weg lesson
 */
export default async function LearnPage() {
  const result = await getMyPath();
  if (!result) redirect("/onboarding");
  const { profile } = result;

  const paths = pickPaths(profile);
  const targetLevel = profile.goalLanguageLevel ?? "B1";
  const exams = examsFor(targetLevel);
  const gap = levelGap(profile.currentLanguageLevel, targetLevel);

  return (
    <main className="min-h-screen bg-warm-gradient pb-28">
      <div className="max-w-md mx-auto px-5 pt-10">
        <h1 className="font-serif text-2xl font-semibold text-ink-700 leading-tight">
          Learn German
        </h1>
        <p className="text-xs text-ink-400 mt-1 mb-5 leading-relaxed">
          The single highest-leverage thing you can do alongside the bureaucracy.
          B1 unlocks permanent residency at year 5.
        </p>

        <LanguageGoalsForm initial={profile} />

        {/* Status strip */}
        {profile.currentLanguageLevel && profile.goalLanguageLevel && (
          <div className="bg-warm-peach rounded-2xl p-3 mb-5 flex items-center gap-2">
            <Target size={14} className="text-warm-amber flex-shrink-0" />
            <div className="text-[11px] text-ink-700 leading-tight">
              <span className="font-semibold">{profile.currentLanguageLevel}</span> →{" "}
              <span className="font-semibold">{profile.goalLanguageLevel}</span> ·{" "}
              {gap === 0 ? (
                "You're already there 🎉"
              ) : (
                <span>
                  {gap} {gap === 1 ? "level" : "levels"} to go
                  {profile.languageGoalDate && ` by ${profile.languageGoalDate}`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Course recommendations */}
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold mb-2 flex items-center gap-1.5">
            <Sparkles size={11} /> Paths picked for your profile
          </div>
          <div className="space-y-2">
            {paths.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-2xl p-3.5 hover:scale-[1.01] transition-transform ${
                  p.recommended
                    ? "bg-white border-2 border-warm-orange"
                    : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-ink-700">
                      {p.title}
                    </span>
                    {p.recommended && (
                      <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-semibold bg-warm-orange text-white">
                        Recommended
                      </span>
                    )}
                  </div>
                  <ExternalLink size={12} className="text-ink-400 flex-shrink-0 mt-0.5" />
                </div>
                <p className="text-[11px] text-ink-500 leading-relaxed mb-2">
                  {p.blurb}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-ink-400">
                  <span>⏱ {p.effortLabel}</span>
                  <span>· €{p.costLabel.replace("€", "")}</span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Exams */}
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold mb-2 flex items-center gap-1.5">
            <Award size={11} /> {targetLevel} exams
          </div>
          <div className="space-y-2">
            {exams.map((e) => (
              <a
                key={e.id}
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-2xl p-3"
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-ink-700">
                    {e.name} {e.level}
                  </span>
                  <span className="text-[10px] text-ink-400">{e.cost}</span>
                </div>
                <p className="text-[10px] text-ink-400 leading-relaxed">{e.notes}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Daily nudge */}
        <a
          href="https://learngerman.dw.com/en/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gradient-to-br from-ink-700 to-ink-900 rounded-2xl p-4 text-cream-100"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={11} className="text-warm-peach" />
            <span className="text-[9px] uppercase tracking-widest text-warm-peach font-semibold">
              Today's 15 min
            </span>
          </div>
          <div className="text-sm font-semibold mb-0.5">Nicos Weg — free lesson</div>
          <div className="text-[11px] text-cream-300 leading-relaxed">
            Story-driven A1→B1 from Deutsche Welle. Pick up where you left off.
          </div>
        </a>
      </div>

      <BottomNav active="learn" />
    </main>
  );
}
