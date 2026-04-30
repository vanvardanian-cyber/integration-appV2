import Link from "next/link";
import { ArrowRight, Sparkles, Target, MapPin } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-warm-gradient">
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-ink-900 text-cream-100 flex items-center justify-center font-serif font-bold text-xl">
            A
          </div>
          <span className="font-serif font-semibold text-lg">Ankommen</span>
        </div>
        <Link href="/home" className="text-sm font-medium hover:underline">
          Sign in
        </Link>
      </nav>

      <section className="max-w-3xl mx-auto px-6 pt-12 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warm-peach text-ink-700 text-xs font-semibold mb-6">
          <Sparkles size={12} /> Built for newcomers, not employers
        </div>
        <h1 className="font-serif text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] mb-5">
          Germany has a thousand forms.
          <br />
          You only need the next one.
        </h1>
        <p className="text-lg text-ink-500 max-w-xl mx-auto leading-relaxed">
          Personalized, dependency-aware paths through Anmeldung, Steuer-ID, Blue Card, and the rest.
          We figure out the order. You just take the next step.
        </p>

        <Link
          href="/home"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3.5 rounded-full bg-ink-900 text-cream-100 font-semibold text-sm hover:bg-ink-700 transition-colors"
        >
          Start your path — it's free <ArrowRight size={14} />
        </Link>
        <div className="mt-3 text-xs text-ink-300">No employer required · 30-second signup</div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-4">
        <Feature
          icon={<Target size={20} />}
          title="The next mission, every day"
          body="One thing to do today. Engine handles the rest. No checklists with 47 items."
        />
        <Feature
          icon={<Sparkles size={20} />}
          title="The escape paths nobody told you"
          body="SCHUFA-Anmeldung deadlock? Bürgeramt overload? We saw it coming. Here's how to get around it."
        />
        <Feature
          icon={<MapPin size={20} />}
          title="City-aware, country-aware"
          body="Berlin's Bürgeramt isn't Munich's KVR. We know the difference. Coming soon: NL, AT, CH."
        />
      </section>

      <footer className="border-t border-cream-300 py-8 text-center text-xs text-ink-300">
        <div>Ankommen · Made with care for international hires in Germany</div>
        <div className="mt-1">
          <Link href="/privacy" className="underline">Privacy</Link>
          <span className="mx-2">·</span>
          <Link href="/imprint" className="underline">Imprint</Link>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-white/60 backdrop-blur rounded-3xl p-6 border border-white/80">
      <div className="w-10 h-10 rounded-xl bg-warm-peach text-warm-orange flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-serif font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-ink-500 leading-relaxed">{body}</p>
    </div>
  );
}
