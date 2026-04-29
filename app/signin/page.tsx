import { signIn } from "@/lib/auth";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-warm-gradient flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-ink-900 text-cream-100 flex items-center justify-center font-serif font-bold text-xl mb-5">
          A
        </div>
        <h1 className="font-serif text-2xl font-semibold mb-1">Welcome to Ankommen</h1>
        <p className="text-sm text-ink-500 mb-6">
          Enter your email. We'll send you a magic link.
        </p>

        <form
          action={async (formData) => {
            "use server";
            await signIn("resend", formData);
          }}
          className="space-y-3"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-cream-100 text-sm focus:outline-none focus:border-ink-900"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-ink-900 text-cream-100 text-sm font-semibold hover:bg-ink-700 transition-colors"
          >
            Send magic link
          </button>
        </form>

        <p className="text-xs text-ink-300 mt-6 leading-relaxed">
          By signing in you agree to our <a className="underline" href="/privacy">privacy policy</a>.
          Your data stays in the EU. We never share it.
        </p>
      </div>
    </main>
  );
}
