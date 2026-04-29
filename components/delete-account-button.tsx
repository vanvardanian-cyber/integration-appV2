"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteMyAccount } from "@/lib/actions";

/**
 * The actual right-to-erasure trigger. Two-step confirmation because
 * the cascade delete is not reversible. Once confirmed, calls the server
 * action which deletes the user row, lets cascade FKs handle profiles /
 * completions / activity / etc., and signs out via redirect.
 */
export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      await deleteMyAccount();
      // deleteMyAccount calls signOut({ redirectTo: "/" }) which throws a
      // NEXT_REDIRECT — control never returns here. Belt and braces:
      window.location.href = "/";
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="w-full flex items-center justify-between bg-white rounded-2xl p-4 hover:bg-cream-100 disabled:opacity-50"
    >
      <div className="flex items-center gap-3">
        <Trash2 size={16} className="text-red-500" />
        <span className="text-sm font-medium text-red-500">
          {isPending
            ? "Deleting…"
            : confirming
            ? "Tap again to permanently delete"
            : "Delete my account"}
        </span>
      </div>
    </button>
  );
}
