/**
 * Utility functions for auth-related operations
 */
import { db } from "../../config/database";
import { users } from "../../schema/users";
import { roles } from "../../schema/roles";
import { eq } from "drizzle-orm";

export interface UserWithRole {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isGoogle: boolean;
  isActive: boolean;
  roleName: string;
  onboardingStep: number | null;
  isOnboardingComplete: boolean | null;
}

/**
 * Get user with role information by email
 */
export async function getUserWithRoleByEmail(email: string): Promise<UserWithRole | null> {
  const userWithRole = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      isGoogle: users.isGoogle,
      isActive: users.isActive,
      roleName: roles.name,
      onboardingStep: users.onboardingStep,
      isOnboardingComplete: users.isOnboardingComplete,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.email, email))
    .limit(1);

  return userWithRole.length > 0 ? userWithRole[0] : null;
}

/**
 * Get user with role information by user ID
 */
export async function getUserWithRoleById(userId: string): Promise<UserWithRole | null> {
  const userWithRole = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      isGoogle: users.isGoogle,
      isActive: users.isActive,
      roleName: roles.name,
      onboardingStep: users.onboardingStep,
      isOnboardingComplete: users.isOnboardingComplete,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId))
    .limit(1);

  return userWithRole.length > 0 ? userWithRole[0] : null;
}
