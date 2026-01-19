import { eq, and } from 'drizzle-orm';
import { db } from '../config/database';
import { users, roles } from '../schema';
import { LoginRequest, RegisterRequest, GoogleLoginRequest, UserRole } from '../core/types';
import { generateToken } from '../middleware/jwt.handler';
import { createError } from '../middleware/error.handler';
import { getUserWithRoleByEmail, getUserWithRoleById } from './utils/auth.utils';
// Services should return raw data, not formatted responses
import bcrypt from 'bcryptjs';

export class AuthService {
  async register(userData: RegisterRequest) {
    // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw createError("User with this email already exists", 400);
      }

      // Find role by name
      const role = await db
        .select()
        .from(roles)
        .where(eq(roles.name, userData.role || UserRole.PATIENT))
        .limit(1);

      if (role.length === 0) {
        throw createError("Invalid role specified", 400);
      }

      // Hash password for non-Google users
      let hashedPassword = null;
      if (!userData.isGoogle && userData.password) {
        hashedPassword = await bcrypt.hash(userData.password, 10);
      }

      // Create new user
      const newUser = await db
        .insert(users)
        .values({
          email: userData.email,
          password: hashedPassword, // Null for Google users
          firstName: userData.firstName,
          lastName: userData.lastName,
          roleId: role[0].id,
          isGoogle: userData.isGoogle || false
        })
        .returning();

      const savedUser = newUser[0];

      // Generate token
      const token = generateToken({
        userId: savedUser.id,
        email: savedUser.email,
        role: role[0].name as UserRole
      });

      return {
        token,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          role: role[0].name as UserRole,
          isGoogle: savedUser.isGoogle
        }
      };
  }

  async login(loginData: LoginRequest) {
    // Find user by email with role details
      const userWithRole = await getUserWithRoleByEmail(loginData.email);

      if (!userWithRole) {
        throw createError("Invalid email or password", 401);
      }

      // Get password separately since it's not in the utility
      const userWithPassword = await db
        .select({ password: users.password })
        .from(users)
        .where(eq(users.id, userWithRole.id))
        .limit(1);

      const user = { ...userWithRole, password: userWithPassword[0]?.password || null };

      // Check if user is active
      if (!user.isActive) {
        throw createError("Account is deactivated", 401);
      }

      // Check if Google user is trying to login with password
      if (user.isGoogle) {
        throw createError("This account is registered with Google. Please use 'Continue with Google' to login.", 400);
      }

      // Validate password for non-Google users
      if (!user.password || user.password !== loginData.password) {
        throw createError("Invalid email or password", 401);
      }

      // Generate token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.roleName as UserRole
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.roleName as UserRole,
          isGoogle: user.isGoogle,
          onboardingStep: user.onboardingStep,
          isOnboardingComplete: user.isOnboardingComplete
        }
      };
  }

  async googleLogin(loginData: GoogleLoginRequest) {
    // Find user by email with role details; if missing, create as Google user
      let user = await getUserWithRoleByEmail(loginData.email);
      
      // If no existing account, auto-provision a Google account (default role: PATIENT)
      if (!user) {
        // Resolve role
        const role = await db
          .select()
          .from(roles)
          .where(eq(roles.name, UserRole.PATIENT))
          .limit(1);

        if (role.length === 0) {
          throw createError("Default role not configured", 500);
        }

        // Derive names from email as a fallback; proper name can be set later during onboarding
        const localPart = (loginData.email || '').split('@')[0];
        const firstName = localPart || 'User';
        const lastName = '';

        const inserted = await db
          .insert(users)
          .values({
            email: loginData.email,
            password: null,
            firstName,
            lastName,
            roleId: role[0].id,
            isGoogle: true,
          })
          .returning();

        const created = inserted[0];

        // Re-select with role join for consistent shape
        user = await getUserWithRoleById(created.id);
        
        if (!user) {
          throw createError("Failed to retrieve created user", 500);
        }
      }

      // Check if user is active
      if (!user.isActive) {
        throw createError("Account is deactivated", 401);
      }

      // Check if this is a Google user
      if (!user.isGoogle) {
        throw createError("This account was created with email/password. Please use regular login.", 400);
      }

      // Generate token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.roleName as UserRole
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.roleName as UserRole,
          isGoogle: user.isGoogle,
          onboardingStep: user.onboardingStep,
          isOnboardingComplete: user.isOnboardingComplete
        }
      };
  }

  async getUserById(userId: string): Promise<any | null> {
    return await getUserWithRoleById(userId);
  }

  async updateUserProfile(userId: string, updateData: Partial<typeof users.$inferInsert>): Promise<any> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw createError("User not found", 404);
    }

    // Remove sensitive fields from update
    const { password, email, ...safeUpdateData } = updateData;

    const updatedUser = await db
      .update(users)
      .set(safeUpdateData)
      .where(eq(users.id, userId))
      .returning();

    return updatedUser[0];
  }
}