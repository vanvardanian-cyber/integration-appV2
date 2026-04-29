import { Mail } from "lucide-react";

export default function CheckEmailPage() {
  return (
    <main className="min-h-screen bg-warm-gradient flex items-center justify-center p-6">
      <div className="max-w-sm bg-white rounded-3xl p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-warm-peach text-warm-orange flex items-center justify-center mx-auto mb-4">
          <Mail size={20} />
        </div>
        <h1 className="font-serif text-xl font-semibold mb-2">Check your email</h1>
        <p className="text-sm text-ink-500 leading-relaxed">
          We've sent you a magic link. Click it to sign in. The link expires in 24 hours.
        </p>
      </div>
    </main>
  );
}
