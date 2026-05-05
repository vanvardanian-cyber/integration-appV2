"use client";

import { useState, useTransition } from "react";
import { Building2, User, Mail, MapPin, Check } from "lucide-react";
import { saveEmployer } from "@/lib/actions";
import type { UserProfile } from "@/types/engine";

export function EmployerForm({ initial }: { initial: UserProfile }) {
  const [employerName, setEmployerName] = useState(initial.employerName ?? "");
  const [hrContactName, setHrContactName] = useState(initial.hrContactName ?? "");
  const [hrContactEmail, setHrContactEmail] = useState(initial.hrContactEmail ?? "");
  const [officeCity, setOfficeCity] = useState(initial.officeCity ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await saveEmployer({
        employerName,
        hrContactName,
        hrContactEmail,
        officeCity,
      });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2400);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <Field
        icon={<Building2 size={14} className="text-ink-400" />}
        label="Company"
        placeholder="Acme GmbH"
        value={employerName}
        onChange={setEmployerName}
      />
      <Field
        icon={<User size={14} className="text-ink-400" />}
        label="HR contact name"
        placeholder="Anna Schmidt"
        value={hrContactName}
        onChange={setHrContactName}
      />
      <Field
        icon={<Mail size={14} className="text-ink-400" />}
        label="HR contact email"
        placeholder="hr@acme.de"
        type="email"
        value={hrContactEmail}
        onChange={setHrContactEmail}
      />
      <Field
        icon={<MapPin size={14} className="text-ink-400" />}
        label="Office city"
        placeholder="Berlin"
        value={officeCity}
        onChange={setOfficeCity}
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full mt-3 py-3 rounded-2xl bg-ink-900 text-cream-100 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-ink-700 transition-colors"
      >
        {savedAt ? (
          <>
            <Check size={14} /> Saved
          </>
        ) : isPending ? (
          "Saving…"
        ) : (
          "Save employer info"
        )}
      </button>
    </form>
  );
}

function Field({
  icon,
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest text-ink-300 font-semibold mb-1 flex items-center gap-1.5">
        {icon} {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-white text-sm focus:outline-none focus:border-ink-700"
      />
    </label>
  );
}
