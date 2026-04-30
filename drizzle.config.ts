import { defineConfig } from "drizzle-kit";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * drizzle-kit runs as its own CLI process, separate from Next.js, so it
 * doesn't see the .env.local that next-dev loads. We parse it ourselves
 * (process.env still wins for CI/Vercel where DATABASE_URL is injected
 * directly). Empty-or-missing file is fine — we silently fall through.
 */
function loadEnvLocal() {
  try {
    const content = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const [, key, rawVal] = m;
      if (process.env[key] !== undefined) continue; // real env wins
      // Strip optional surrounding quotes (single or double).
      const val = rawVal.replace(/^["'](.*)["']$/, "$1");
      process.env[key] = val;
    }
  } catch {
    /* no .env.local — that's fine in CI */
  }
}
loadEnvLocal();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local or export it in your shell."
  );
}

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
