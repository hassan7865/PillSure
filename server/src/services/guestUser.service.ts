import { eq } from "drizzle-orm";
import { db } from "../config/database";
import { users, roles } from "../schema";
import { UserRole } from "../core/types";
import { hashPassword } from "../utils/password.util";

const guestEmail = (e164: string) => {
  const digits = e164.replace(/\D/g, "");
  return `wa_${digits}@guest.pillsure.local`;
};

export const ensureGuestUserForWhatsApp = async (params: {
  phoneE164: string;
  firstName?: string;
  lastName?: string;
}): Promise<string> => {
  const email = guestEmail(params.phoneE164);
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) {
    return existing[0].id;
  }

  const roleRow = await db
    .select()
    .from(roles)
    .where(eq(roles.name, UserRole.PATIENT))
    .limit(1);
  if (!roleRow.length) {
    throw new Error("Patient role not found — run npm run init:roles");
  }

  const pwd = await hashPassword(`wa_guest_${Math.random().toString(36).slice(2)}`);
  const firstName = (params.firstName || "WhatsApp").slice(0, 100);
  const lastName = (params.lastName || "Guest").slice(0, 100);

  const inserted = await db
    .insert(users)
    .values({
      email,
      password: pwd,
      firstName,
      lastName,
      roleId: roleRow[0].id,
      isGoogle: false,
      isEmailVerified: false,
      isOnboardingComplete: false,
      onboardingStep: 0,
    })
    .returning();

  return inserted[0].id;
};
