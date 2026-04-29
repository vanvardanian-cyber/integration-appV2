"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { completeStep } from "@/lib/actions";

export function CompleteButton({
  procedureId,
  xp,
  small,
}: {
  procedureId: string;
  xp: number;
  small?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [celebrate, setCelebrate] = useState(false);

  const handleClick = () => {
    startTransition(async () => {
      const result = await completeStep(procedureId);
      if (result.success && !result.alreadyComplete) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 2000);
      }
    });
  };

  if (small) {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        className="px-3 py-1.5 rounded-full bg-warm-orange text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 hover:bg-warm-amber transition-colors"
      >
        <Check size={11} /> Mark done
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="px-4 py-2 rounded-full bg-warm-orange text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 hover:bg-warm-amber transition-colors"
      >
        {isPending ? "Saving…" : "Mark done"}
        {!isPending && <ArrowRight size={12} />}
      </button>

      {celebrate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/70 backdrop-blur cursor-pointer"
          onClick={() => setCelebrate(false)}
        >
          <div className="text-center text-white">
            <div className="text-7xl mb-3">🎉</div>
            <div className="font-serif text-3xl font-semibold flex items-center gap-2 justify-center">
              <Sparkles className="text-warm-peach" /> +{xp} XP
            </div>
          </div>
        </div>
      )}
    </>
  );
}
