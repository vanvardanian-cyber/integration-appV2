import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Building2, MapPin, CheckCircle2, Clock } from "lucide-react";
import { getMyPath } from "@/lib/actions";
import { BottomNav } from "@/components/bottom-nav";
import { EmployerForm } from "@/components/employer-form";
import { procedureMap } from "@/lib/procedures";

/**
 * /me/employer — collects HR contact info and surfaces a sync dashboard
 * showing every artifact HR is waiting on (or has already received).
 *
 * Status logic:
 *   - "ready": user has completed the procedure that produces the artifact
 *     (we don't yet track "actually shared" — that's v2 with audit log)
 *   - "pending": procedure not yet complete
 *
 * Once the user has hrContactEmail set, each ready artifact gets a
 * one-tap mailto: button with a pre-filled message.
 */
export default async function EmployerPage() {
  const result = await getMyPath();
  if (!result) redirect("/onboarding");
  const { profile, completedIds } = result;

  // Walk every procedure with hrSync. Group by status.
  const items: {
    procedureId: string;
    procedureName: string;
    artifactId: string;
    isReady: boolean;
  }[] = [];

  for (const procedure of procedureMap.values()) {
    if (!procedure.hrSync) continue;
    if (procedure.country !== profile.targetCountry) continue;
    for (const artifactId of procedure.hrSync.artifactsHrNeeds) {
      items.push({
        procedureId: procedure.id,
        procedureName: procedure.nameEn,
        artifactId,
        isReady: completedIds.has(procedure.id),
      });
    }
  }

  const ready = items.filter((i) => i.isReady);
  const pending = items.filter((i) => !i.isReady);

  return (
    <main className="min-h-screen bg-warm-gradient pb-28">
      <div className="max-w-md mx-auto px-5 pt-10">
        {/* Back to /me */}
        <Link
          href="/me"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 mb-3"
        >
          <ArrowLeft size={14} /> Back to profile
        </Link>

        <h1 className="font-serif text-2xl font-semibold text-ink-700 leading-tight">
          My employer
        </h1>
        <p className="text-xs text-ink-400 mt-1 mb-6 leading-relaxed">
          Tell us who's waiting on what. We'll generate one-tap emails to your HR
          contact when each document is ready.
        </p>

        <EmployerForm initial={profile} />

        {/* HR-sync dashboard */}
        <div className="mt-8">
          <div className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold mb-2">
            Documents HR is waiting on
          </div>

          {ready.length > 0 && (
            <div className="space-y-2 mb-3">
              {ready.map((item) => (
                <ArtifactRow
                  key={item.artifactId}
                  item={item}
                  hrEmail={profile.hrContactEmail}
                  hrName={profile.hrContactName}
                  fromName={profile.countryOfOrigin}
                />
              ))}
            </div>
          )}

          {pending.length > 0 && (
            <div className="space-y-2 opacity-60">
              <div className="text-[10px] uppercase tracking-wider text-ink-300 font-semibold mt-4">
                Pending — not ready yet
              </div>
              {pending.map((item) => (
                <PendingRow key={item.artifactId} item={item} />
              ))}
            </div>
          )}

          {items.length === 0 && (
            <div className="bg-white rounded-2xl p-4 text-xs text-ink-400 text-center">
              No HR-tracked documents for your current path.
            </div>
          )}
        </div>
      </div>

      <BottomNav active="me" />
    </main>
  );
}

function ArtifactRow({
  item,
  hrEmail,
  hrName,
  fromName,
}: {
  item: { procedureName: string; artifactId: string };
  hrEmail?: string;
  hrName?: string;
  fromName?: string;
}) {
  const niceName = artifactDisplayName(item.artifactId);
  const subject = `New document for payroll: ${niceName}`;
  const body =
    `Hi${hrName ? ` ${hrName}` : ""},\n\n` +
    `My ${item.procedureName} is now complete and the ${niceName} is ready. Please ` +
    `update payroll / HR records accordingly. Happy to send the document over — ` +
    `let me know what format you need.\n\n` +
    `Thanks${fromName ? `,\n${fromName}` : ""}`;
  const mailto = hrEmail
    ? `mailto:${encodeURIComponent(hrEmail)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`
    : null;

  return (
    <div className="bg-white rounded-2xl p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 size={14} className="text-green-700" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-ink-700 truncate">
            {niceName}
          </div>
          <div className="text-[10px] text-ink-400 truncate">
            From: {item.procedureName}
          </div>
        </div>
      </div>
      {mailto ? (
        <a
          href={mailto}
          className="px-2.5 py-1 rounded-full bg-warm-orange text-white text-[10px] font-semibold flex items-center gap-1 flex-shrink-0"
        >
          <Mail size={10} /> Email HR
        </a>
      ) : (
        <span className="text-[10px] text-ink-300 flex-shrink-0">
          Add HR email above
        </span>
      )}
    </div>
  );
}

function PendingRow({ item }: { item: { procedureName: string; artifactId: string } }) {
  return (
    <div className="bg-white rounded-2xl p-3 flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-full bg-cream-300 flex items-center justify-center flex-shrink-0">
        <Clock size={13} className="text-ink-400" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-ink-700 truncate">
          {artifactDisplayName(item.artifactId)}
        </div>
        <div className="text-[10px] text-ink-400 truncate">
          Waiting on: {item.procedureName}
        </div>
      </div>
    </div>
  );
}

// Pretty-print the artifact ID. The IDs in germany.ts are short snake_case
// keys; this maps them to something a human can read in the UI.
function artifactDisplayName(id: string): string {
  const map: Record<string, string> = {
    anmeldebestaetigung: "Anmeldebestätigung",
    iban_online: "IBAN (online bank)",
    steuer_id_number: "Steuer-ID number",
    gkv_membership: "GKV membership confirmation",
    sv_nummer: "Sozialversicherungsnummer",
    blue_card_eat: "Blue Card residence permit",
  };
  return map[id] ?? id.replace(/_/g, " ");
}
