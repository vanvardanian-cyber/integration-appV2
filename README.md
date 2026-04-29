# Ankommen

A consumer-first product for navigating German bureaucracy. Deeply opinionated, country-aware engine that produces personalized, dependency-aware paths.

## What this is

A real Next.js application — not a prototype. It has:

- **Standalone signup** (no employer required) via magic-link email
- **Multi-step onboarding survey** that builds a profile
- **Dependency-aware bureaucracy engine** with deadlock detection
- **Mobile-first PWA** (installable to home screen)
- **EU-compliant architecture** (GDPR-aware schema, EU hosting via Neon Frankfurt)
- **Country-ready data model** (DE shipped, NL/AT/CH ready to add)
- **Postgres persistence** with Drizzle ORM
- **Gamification** (XP, badges, completion tracking)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env.local
# Edit .env.local with your Neon DB URL, Resend API key, and AUTH_SECRET

# 3. Generate and apply database migrations
npm run db:generate
npm run db:push

# 4. Run development server
npm run dev
```

Open http://localhost:3000.

## Required services (all free tier or near-free)

- **Neon** — Postgres database (https://neon.tech, pick `eu-central-1` Frankfurt region)
- **Resend** — Magic link emails (https://resend.com, EU sending region)
- **Vercel** — Hosting (https://vercel.com, set region to `fra1` Frankfurt for GDPR)

## Architecture

```
app/
  ├── page.tsx              ← Public landing page
  ├── signin/               ← Magic link auth flow
  ├── onboarding/           ← Multi-step profile survey
  ├── home/                 ← Today's Mission + stats + deadlocks
  ├── path/                 ← Full personalized path
  ├── me/                   ← Profile + GDPR controls
  └── api/auth/             ← NextAuth.js handlers

lib/
  ├── auth.ts               ← Auth.js config (Resend + Drizzle adapter)
  ├── actions.ts            ← Server actions (profile CRUD, step completion)
  ├── engine/solver.ts      ← The brain: solve(profile) → SolvedPath
  └── procedures/
      ├── germany.ts        ← German procedure data (16 nodes)
      └── index.ts          ← Country-aware combiner

db/
  ├── schema/index.ts       ← Drizzle schema
  └── client.ts             ← Neon client

components/
  ├── bottom-nav.tsx        ← Mobile bottom navigation
  └── complete-button.tsx   ← Mark-step-done with celebration

types/
  └── engine.ts             ← Core types (UserProfile, Procedure, etc.)
```

## The engine

The heart of the product. Given a `UserProfile` (country, nationality, city, employment, etc.), `solve()` returns a `SolvedPath`:

- Filters procedures by country → applicability predicates
- Topologically sorts by dependencies
- Computes earliest start dates respecting prerequisites
- Detects known deadlocks (Anmeldung-SCHUFA-apartment cycle, Bürgeramt overload, IBAN-before-payroll, etc.)
- Surfaces escape paths
- Returns ordered steps with deadlines, costs, XP rewards, and warnings

### Adding a country

1. Create `lib/procedures/netherlands.ts` (or austria, switzerland)
2. Define procedures with `country: "NL"`
3. Import + spread in `lib/procedures/index.ts`

The engine handles the rest. No solver changes needed.

## What's NOT done yet (real talk)

- **Engine data is unverified.** Every node in `germany.ts` is marked `verificationSource: "Claude general knowledge — REQUIRES expert review"`. Before anyone real uses this, get an immigration lawyer to review. Budget €300–500 for that.
- **No appointment booking yet.** Procedures link to Bürgeramt booking pages but we don't actually book.
- **No document upload.** Procedures list `documentsRequired` but there's no R2/S3 upload yet.
- **No email reminders.** Resend is wired for auth only; deadline reminders come later.
- **No analytics.** Add Plausible or Posthog.
- **No legal docs.** You need a real privacy policy + DPA before launching. Get a lawyer.
- **Translations are English-only** in the UI. The data has German + English; the UI shell needs i18n (next-intl recommended).

## Deployment

```bash
# Push to GitHub, then connect to Vercel
# In Vercel, set:
#   - Region: fra1
#   - Environment variables (copy from .env.local)
# Deploy.
```

Add `vercel.json` with `{"regions": ["fra1"]}` to enforce EU region.

## License

You wrote it (with Claude's help). Treat it accordingly.
