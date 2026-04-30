import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  primaryKey,
  pgEnum,
  uuid,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Ankommen Database Schema
 *
 * Tables:
 *   - users, accounts, sessions, verificationTokens (NextAuth standard)
 *   - profiles (the UserProfile object — one per user)
 *   - completions (which procedures the user has marked done)
 *   - badges (which badges the user has earned)
 *   - activity (event log for analytics + GDPR audit trail)
 *
 * Conventions:
 *   - All tables use UUIDs for IDs (better than serial for distributed systems)
 *   - All timestamps in UTC, ISO format
 *   - jsonb for flexible/evolving data (confidence map, profile extras)
 *   - Foreign keys with cascade delete for GDPR (delete user → cascade everything)
 */

// ─────────────────────────────────────────────────────────────────────────────
// AUTH (NextAuth/Auth.js standard tables)
// ─────────────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    pk: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    pk: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// ANKOMMEN-SPECIFIC TABLES
// ─────────────────────────────────────────────────────────────────────────────

export const countryEnum = pgEnum("country", ["DE", "NL", "AT", "CH"]);
export const nationalityEnum = pgEnum("nationality", ["EU", "non-EU", "UK", "Turkey"]);
export const employmentEnum = pgEnum("employment", [
  "employed", "freelance", "self-employed", "student", "job-seeker", "researcher",
]);
export const housingEnum = pgEnum("housing", [
  "none", "temporary-employer", "temporary-airbnb", "temporary-friend",
  "permanent-rental", "owned",
]);
export const visaEnum = pgEnum("visa_type", [
  "none", "blue-card", "work-permit", "job-seeker",
  "family-reunion", "student", "researcher", "freelance-visa",
]);
export const maritalEnum = pgEnum("marital_status", [
  "single", "married", "registered-partnership", "divorced",
]);

/**
 * One profile per user. The user *is* the candidate; standalone signup means
 * the profile is created during onboarding survey, not by an employer.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),

  // Where they're going
  targetCountry: countryEnum("target_country").notNull(),

  // Identity
  nationality: nationalityEnum("nationality").notNull(),
  countryOfOrigin: text("country_of_origin").notNull(), // ISO-2

  // Arrival & location
  arrivalDate: text("arrival_date"), // ISO date string; nullable
  city: text("city"),
  housing: housingEnum("housing").notNull().default("none"),

  // Employment
  employment: employmentEnum("employment").notNull(),
  visaType: visaEnum("visa_type").notNull(),
  hasJobOffer: boolean("has_job_offer").notNull().default(false),
  hasSignedContract: boolean("has_signed_contract").notNull().default(false),
  annualGrossSalary: integer("annual_gross_salary"),
  startDate: text("start_date"),

  // Family
  maritalStatus: maritalEnum("marital_status").notNull().default("single"),
  hasChildren: boolean("has_children").notNull().default(false),
  spouseAccompanying: boolean("spouse_accompanying").notNull().default(false),

  // Misc
  speaksTargetLanguage: boolean("speaks_target_language").notNull().default(false),
  hasUniversityDegree: boolean("has_university_degree").notNull().default(false),
  degreeRecognized: text("degree_recognized").notNull().default("unknown"),

  // Country-specific extras (extensible)
  extras: jsonb("extras").$type<Record<string, unknown>>().default({}),

  // Confidence levels per field
  confidence: jsonb("confidence").$type<Record<string, "confirmed" | "assumed" | "unknown">>().default({}),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Completions: one row per (user, procedureId) pair when a step is marked done.
 * The composite unique constraint prevents duplicates.
 */
export const completions = pgTable(
  "completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    procedureId: text("procedure_id").notNull(),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
    notes: text("notes"),
    xpEarned: integer("xp_earned").notNull().default(0),
  },
  (t) => ({
    // The (userId, procedureId) pair is a UNIQUE constraint, not a second
    // primary key — Postgres only allows one PK per table. The original
    // declaration as primaryKey() is what made db:push fail with
    // transformIndexConstraint. This is the right shape for "user can
    // only complete a given procedure once".
    userProcedureUnique: unique("completions_user_proc_unique").on(t.userId, t.procedureId),
  })
);

/**
 * Badges earned by the user.
 */
export const userBadges = pgTable(
  "user_badges",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull(),
    earnedAt: timestamp("earned_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.badgeId] }),
  })
);

/**
 * Activity log — for analytics, debugging, and GDPR audit trail.
 * On user deletion, this cascades, satisfying right-to-erasure.
 */
export const activity = pgTable("activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // e.g. "signup", "profile_update", "step_complete"
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  completions: many(completions),
  badges: many(userBadges),
  activity: many(activity),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const completionsRelations = relations(completions, ({ one }) => ({
  user: one(users, { fields: [completions.userId], references: [users.id] }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED TYPES (inferred from schema)
// ─────────────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;
export type Completion = typeof completions.$inferSelect;
export type NewCompletion = typeof completions.$inferInsert;
