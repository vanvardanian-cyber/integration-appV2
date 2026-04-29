"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { profiles, completions, userBadges, activity, users } from "@/db/schema";
import { auth, signOut } from "@/lib/auth";
import { solve } from "@/lib/engine/solver";
import type { UserProfile } from "@/types/engine";

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS (Zod)
// ─────────────────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  targetCountry: z.enum(["DE", "NL", "AT", "CH"]),
  nationality: z.enum(["EU", "non-EU", "UK", "Turkey"]),
  countryOfOrigin: z.string().length(2).toUpperCase(),
  arrivalDate: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  housing: z.enum(["none", "temporary-employer", "temporary-airbnb", "temporary-friend", "permanent-rental", "owned"]),
  employment: z.enum(["employed", "freelance", "self-employed", "student", "job-seeker", "researcher"]),
  visaType: z.enum(["none", "blue-card", "work-permit", "job-seeker", "family-reunion", "student", "researcher", "freelance-visa"]),
  hasJobOffer: z.boolean().default(false),
  hasSignedContract: z.boolean().default(false),
  annualGrossSalary: z.number().int().nullable().optional(),
  startDate: z.string().nullable().optional(),
  maritalStatus: z.enum(["single", "married", "registered-partnership", "divorced"]).default("single"),
  hasChildren: z.boolean().default(false),
  spouseAccompanying: z.boolean().default(false),
  speaksTargetLanguage: z.boolean().default(false),
  hasUniversityDegree: z.boolean().default(false),
  degreeRecognized: z.enum(["yes", "no", "unknown"]).default("unknown"),
  hasIndianDrivingLicense: z.boolean().optional(),
  hasUSDrivingLicense: z.boolean().optional(),
  hasOtherNonEUDrivingLicense: z.boolean().optional(),
  confidence: z.record(z.enum(["confirmed", "assumed", "unknown"])).default({}),
});

export type ProfileInput = z.infer<typeof profileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }
  return session.user.id;
}

/**
 * Create or update the user's profile (called from onboarding survey).
 */
export async function saveProfile(input: ProfileInput) {
  const userId = await requireUserId();
  const data = profileSchema.parse(input);

  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });

  const {
    hasIndianDrivingLicense,
    hasUSDrivingLicense,
    hasOtherNonEUDrivingLicense,
    ...rest
  } = data;
  const extras = {
    ...(hasIndianDrivingLicense !== undefined && { hasIndianDrivingLicense }),
    ...(hasUSDrivingLicense !== undefined && { hasUSDrivingLicense }),
    ...(hasOtherNonEUDrivingLicense !== undefined && { hasOtherNonEUDrivingLicense }),
  };

  if (existing) {
    await db
      .update(profiles)
      .set({ ...rest, extras, updatedAt: new Date() })
      .where(eq(profiles.userId, userId));
  } else {
    await db.insert(profiles).values({ userId, ...rest, extras });
  }

  await db.insert(activity).values({
    userId,
    eventType: existing ? "profile_update" : "profile_create",
    metadata: { fields: Object.keys(data) },
  });

  revalidatePath("/home");
  revalidatePath("/path");
  return { success: true };
}

/**
 * Mark a procedure as complete and award XP.
 */
export async function completeStep(procedureId: string) {
  const userId = await requireUserId();

  // Idempotent — if already completed, do nothing
  const existing = await db.query.completions.findFirst({
    where: (c, { and, eq }) => and(eq(c.userId, userId), eq(c.procedureId, procedureId)),
  });
  if (existing) return { success: true, alreadyComplete: true };

  // Look up XP from procedure data
  const { procedureMap } = await import("@/lib/procedures");
  const procedure = procedureMap.get(procedureId);
  const xp = procedure?.xpReward ?? 0;
  const badgeId = procedure?.badgeId;

  await db.insert(completions).values({
    userId,
    procedureId,
    xpEarned: xp,
  });

  if (badgeId) {
    // Idempotent badge insert
    await db.insert(userBadges).values({ userId, badgeId }).onConflictDoNothing();
  }

  await db.insert(activity).values({
    userId,
    eventType: "step_complete",
    metadata: { procedureId, xp, badgeId },
  });

  revalidatePath("/home");
  revalidatePath("/path");
  return { success: true, xpEarned: xp, badgeEarned: badgeId };
}

/**
 * Get the current user's solved path (server-side rendering).
 */
export async function getMyPath() {
  const userId = await requireUserId();

  const profileRow = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
  if (!profileRow) return null;

  const completionsRows = await db.query.completions.findMany({
    where: eq(completions.userId, userId),
  });
  const completedIds = new Set(completionsRows.map((c) => c.procedureId));

  // Reconstruct UserProfile from row
  const extras = (profileRow.extras as Record<string, unknown>) ?? {};
  const profile: UserProfile = {
    id: profileRow.id,
    userId: profileRow.userId,
    targetCountry: profileRow.targetCountry,
    nationality: profileRow.nationality,
    countryOfOrigin: profileRow.countryOfOrigin,
    arrivalDate: profileRow.arrivalDate,
    city: profileRow.city as UserProfile["city"],
    housing: profileRow.housing,
    employment: profileRow.employment,
    visaType: profileRow.visaType,
    hasJobOffer: profileRow.hasJobOffer,
    hasSignedContract: profileRow.hasSignedContract,
    annualGrossSalary: profileRow.annualGrossSalary,
    startDate: profileRow.startDate,
    maritalStatus: profileRow.maritalStatus,
    hasChildren: profileRow.hasChildren,
    spouseAccompanying: profileRow.spouseAccompanying,
    speaksTargetLanguage: profileRow.speaksTargetLanguage,
    hasUniversityDegree: profileRow.hasUniversityDegree,
    degreeRecognized: profileRow.degreeRecognized as UserProfile["degreeRecognized"],
    hasIndianDrivingLicense: extras.hasIndianDrivingLicense as boolean | undefined,
    hasUSDrivingLicense: extras.hasUSDrivingLicense as boolean | undefined,
    hasOtherNonEUDrivingLicense: extras.hasOtherNonEUDrivingLicense as boolean | undefined,
    confidence: (profileRow.confidence as UserProfile["confidence"]) ?? {},
  };

  const path = solve(profile, completedIds);
  return { profile, path, completedIds };
}

/**
 * GDPR: delete all user data.
 *
 * Right-to-erasure (Art. 17 GDPR). We log the request first (so we have a
 * non-PII audit trail tied to the now-removed userId), then delete the user
 * row. Cascade FKs on profiles, completions, userBadges, activity, accounts,
 * and sessions take care of the rest.
 *
 * After the delete, sign the user out and redirect to the public landing page.
 */
export async function deleteMyAccount() {
  const userId = await requireUserId();

  // Best-effort audit row before we wipe ourselves out. The cascade will
  // delete this row too — the point is that we tried, and any external
  // log shipper will already have it.
  await db.insert(activity).values({
    userId,
    eventType: "account_delete_executed",
  });

  // Hard delete. Cascading FKs take down profiles, completions, badges,
  // activity, accounts, sessions in one shot.
  await db.delete(users).where(eq(users.id, userId));

  // signOut clears the session cookie/db row and redirects.
  await signOut({ redirectTo: "/" });
}
