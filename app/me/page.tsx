import { redirect } from "next/navigation";
import { Trophy, Settings, LogOut } from "lucide-react";
import { getMyPath } from "@/lib/actions";
import { signOut } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { DeleteAccountButton } from "@/components/delete-account-button";

export default async function MePage() {
  const result = await getMyPath();
  if (!result) redirect("/onboarding");
  const { profile, path, completedIds } = result;

  const xpEarned = path.steps
    .filter((s) => completedIds.has(s.procedureId))
    .reduce((sum, s) => sum + s.procedure.xpReward, 0);
  const level = Math.floor(xpEarned / 200) + 1;
  const pct = path.steps.length > 0 ? Math.round((completedIds.size / path.steps.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-warm-gradient pb-24">
      <div className="max-w-md mx-auto px-6 pt-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-warm-orange to-warm-amber text-white flex items-center justify-center font-serif text-2xl font-bold mx-auto mb-3">
          {profile.countryOfOrigin}
        </div>
        <h1 className="font-serif text-2xl font-semibold text-ink-700">
          {profile.countryOfOrigin} → 🇩🇪
        </h1>
        <p className="text-xs text-ink-400 mt-1">
          {profile.nationality} · {profile.visaType}
        </p>

        <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-white">
          <Trophy size={12} className="text-yellow-600" />
          <span className="text-sm font-semibold text-ink-700">
            Level {level} · {xpEarned.toLocaleString()} XP
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-5 text-left">
          <div className="bg-white rounded-2xl p-4">
            <div className="font-serif text-2xl font-semibold text-ink-700">{pct}%</div>
            <div className="text-xs text-ink-400">through path</div>
          </div>
          <div className="bg-white rounded-2xl p-4">
            <div className="font-serif text-2xl font-semibold text-ink-700">{path.deadlocks.length}</div>
            <div className="text-xs text-ink-400">active risks</div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <a
            href="/onboarding"
            className="flex items-center justify-between bg-white rounded-2xl p-4 hover:bg-cream-100"
          >
            <div className="flex items-center gap-3">
              <Settings size={16} className="text-ink-400" />
              <span className="text-sm font-medium text-ink-700">Update my profile</span>
            </div>
          </a>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-between bg-white rounded-2xl p-4 hover:bg-cream-100"
            >
              <div className="flex items-center gap-3">
                <LogOut size={16} className="text-ink-400" />
                <span className="text-sm font-medium text-ink-700">Sign out</span>
              </div>
            </button>
          </form>

          <DeleteAccountButton />
        </div>
      </div>

      <BottomNav active="me" />
    </main>
  );
}
