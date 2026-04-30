// Initialise the Ankommen database directly, bypassing drizzle-kit.
//
// Why this exists: `drizzle-kit push` is interactive and was hanging
// in the VS Code integrated terminal. This script connects to Neon
// over the same neon-http client the app uses, runs the schema as
// raw idempotent SQL, and prints a clear success or error.
//
// Run with: node scripts/init-db.mjs

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

function loadEnv() {
  try {
    const content = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const [, key, rawVal] = m;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawVal.replace(/^["'](.*)["']$/, "$1");
    }
  } catch (e) {
    /* no .env.local — fall through */
  }
}

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("✗ DATABASE_URL not found in .env.local");
  process.exit(1);
}

console.log("→ Connecting to Neon…");

const sql = neon(process.env.DATABASE_URL);

// Each statement runs as a separate `sql(…)` call so a single failure gives
// us a precise error instead of a vague Postgres parse error.
const STATEMENTS = [
  // ── ENUMS (idempotent) ──────────────────────────────────────────
  `DO $$ BEGIN CREATE TYPE country AS ENUM ('DE','NL','AT','CH');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

  `DO $$ BEGIN CREATE TYPE nationality AS ENUM ('EU','non-EU','UK','Turkey');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

  `DO $$ BEGIN CREATE TYPE employment AS ENUM ('employed','freelance','self-employed','student','job-seeker','researcher');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

  `DO $$ BEGIN CREATE TYPE housing AS ENUM ('none','temporary-employer','temporary-airbnb','temporary-friend','permanent-rental','owned');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

  `DO $$ BEGIN CREATE TYPE visa_type AS ENUM ('none','blue-card','work-permit','job-seeker','family-reunion','student','researcher','freelance-visa');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

  `DO $$ BEGIN CREATE TYPE marital_status AS ENUM ('single','married','registered-partnership','divorced');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

  // ── AUTH TABLES (NextAuth standard) ─────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     email text NOT NULL UNIQUE,
     email_verified timestamp,
     name text,
     image text,
     created_at timestamp NOT NULL DEFAULT now()
   );`,

  `CREATE TABLE IF NOT EXISTS accounts (
     user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     type text NOT NULL,
     provider text NOT NULL,
     provider_account_id text NOT NULL,
     refresh_token text,
     access_token text,
     expires_at integer,
     token_type text,
     scope text,
     id_token text,
     session_state text,
     PRIMARY KEY (provider, provider_account_id)
   );`,

  `CREATE TABLE IF NOT EXISTS sessions (
     session_token text PRIMARY KEY,
     user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires timestamp NOT NULL
   );`,

  `CREATE TABLE IF NOT EXISTS verification_tokens (
     identifier text NOT NULL,
     token text NOT NULL,
     expires timestamp NOT NULL,
     PRIMARY KEY (identifier, token)
   );`,

  // ── ANKOMMEN TABLES ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS profiles (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
     target_country country NOT NULL,
     nationality nationality NOT NULL,
     country_of_origin text NOT NULL,
     arrival_date text,
     city text,
     housing housing NOT NULL DEFAULT 'none',
     employment employment NOT NULL,
     visa_type visa_type NOT NULL,
     has_job_offer boolean NOT NULL DEFAULT false,
     has_signed_contract boolean NOT NULL DEFAULT false,
     annual_gross_salary integer,
     start_date text,
     marital_status marital_status NOT NULL DEFAULT 'single',
     has_children boolean NOT NULL DEFAULT false,
     spouse_accompanying boolean NOT NULL DEFAULT false,
     speaks_target_language boolean NOT NULL DEFAULT false,
     has_university_degree boolean NOT NULL DEFAULT false,
     degree_recognized text NOT NULL DEFAULT 'unknown',
     extras jsonb DEFAULT '{}'::jsonb,
     confidence jsonb DEFAULT '{}'::jsonb,
     created_at timestamp NOT NULL DEFAULT now(),
     updated_at timestamp NOT NULL DEFAULT now()
   );`,

  `CREATE TABLE IF NOT EXISTS completions (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     procedure_id text NOT NULL,
     completed_at timestamp NOT NULL DEFAULT now(),
     notes text,
     xp_earned integer NOT NULL DEFAULT 0,
     CONSTRAINT completions_user_proc_unique UNIQUE (user_id, procedure_id)
   );`,

  `CREATE TABLE IF NOT EXISTS user_badges (
     user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     badge_id text NOT NULL,
     earned_at timestamp NOT NULL DEFAULT now(),
     PRIMARY KEY (user_id, badge_id)
   );`,

  `CREATE TABLE IF NOT EXISTS activity (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     event_type text NOT NULL,
     metadata jsonb DEFAULT '{}'::jsonb,
     created_at timestamp NOT NULL DEFAULT now()
   );`,

  // pgcrypto for gen_random_uuid (Neon usually has it but make sure)
  `CREATE EXTENSION IF NOT EXISTS pgcrypto;`,
];

async function main() {
  let i = 0;
  for (const stmt of STATEMENTS) {
    i++;
    const preview = stmt.replace(/\s+/g, " ").slice(0, 70);
    process.stdout.write(`  [${i}/${STATEMENTS.length}] ${preview}… `);
    try {
      await sql(stmt);
      console.log("✓");
    } catch (e) {
      console.log("✗");
      console.error(`\n✗ Statement ${i} failed:\n  ${preview}\n`);
      console.error(e?.message ?? e);
      process.exit(1);
    }
  }
  console.log("\n✓ All tables created. You can run `npm run dev` now.");
}

main().catch((e) => {
  console.error("✗ Connection failed:", e?.message ?? e);
  process.exit(1);
});
