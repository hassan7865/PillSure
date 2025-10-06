import { db } from '../config/database';
import { users, patients, hospitals } from '../schema';
import { doctors } from '../schema/doctor';
import { eq } from 'drizzle-orm';
import { createError } from '../middleware/error.handler';
import { 
  PatientOnboardingRequest, 
  DoctorOnboardingRequest, 
  HospitalOnboardingRequest
} from '../core/types';
// Services should return raw data, not formatted responses

export class OnboardingService {
  constructor() {}

  async completePatientOnboarding(userId: string, data: PatientOnboardingRequest) {
    // Check if user exists and get role
      const user = await db
        .select({ id: users.id, roleId: users.roleId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        throw createError("User not found", 404);
      }

      // Check if patient already exists
      const existingPatient = await db
        .select({ id: patients.id })
        .from(patients)
        .where(eq(patients.userId, userId))
        .limit(1);

      if (existingPatient.length > 0) {
        throw createError("Patient profile already exists", 400);
      }

      // Create patient profile
      const newPatient = await db
        .insert(patients)
        .values({
          userId,
          gender: data.gender,
          mobile: data.mobile,
          dateOfBirth: data.dateOfBirth,
          address: data.address,
          bloodGroup: data.bloodGroup,
          hasCovid: data.hasCovid || false,
          pastMedicalHistory: data.pastMedicalHistory ? JSON.stringify(data.pastMedicalHistory) : null,
          surgicalHistory: data.surgicalHistory || null,
          allergies: data.allergies || null,
        })
        .returning();

      // Update user onboarding status
      await db
        .update(users)
        .set({
          onboardingStep: 3, // Completed
          isOnboardingComplete: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return {
        onboardingStep: 3,
        isOnboardingComplete: true,
      };
  }

  async completeDoctorOnboarding(userId: string, data: DoctorOnboardingRequest) {
    // Check if user exists
      const user = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        throw createError("User not found", 404);
      }

      // Check if doctor already exists
      const existingDoctor = await db
        .select({ id: doctors.id })
        .from(doctors)
        .where(eq(doctors.userId, userId))
        .limit(1);

      if (existingDoctor.length > 0) {
        throw createError("Doctor profile already exists", 400);
      }

      // Create doctor profile
      const newDoctor = await db
        .insert(doctors)
        .values({
          userId,
          gender: data.gender,
          mobile: data.mobile,
          specializationIds: JSON.stringify(data.specializationIds),
          qualifications: JSON.stringify(data.qualifications),
          experienceYears: data.experienceYears,
          patientSatisfactionRate: "0.00", // Default value
          address: data.address,
          image: data.image || null,
          feePkr: data.feePkr ? data.feePkr.toString() : null,
          consultationModes: JSON.stringify(data.consultationModes),
        })
        .returning();

      // Update user onboarding status
      await db
        .update(users)
        .set({
          onboardingStep: 3, // Completed
          isOnboardingComplete: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return {
        onboardingStep: 3,
        isOnboardingComplete: true,
      };
  }

  async completeHospitalOnboarding(userId: string, data: HospitalOnboardingRequest) {
    // Check if user exists
      const user = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        throw createError("User not found", 404);
      }

      // Check if hospital already exists
      const existingHospital = await db
        .select({ id: hospitals.id })
        .from(hospitals)
        .where(eq(hospitals.hospitalEmail, data.hospitalEmail))
        .limit(1);

      if (existingHospital.length > 0) {
        throw createError("Hospital with this email already exists", 400);
      }

      // Create hospital profile
      const newHospital = await db
        .insert(hospitals)
        .values({
          userId,
          hospitalName: data.hospitalName,
          hospitalAddress: data.hospitalAddress,
          hospitalContactNo: data.hospitalContactNo,
          hospitalEmail: data.hospitalEmail,
          websiteHospital: data.websiteHospital || null,
          licenseNo: data.licenseNo,
          adminName: data.adminName,
        })
        .returning();

      // Update user onboarding status
      await db
        .update(users)
        .set({
          onboardingStep: 3, // Completed
          isOnboardingComplete: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return {
        onboardingStep: 3,
        isOnboardingComplete: true,
      };
  }

  async updateOnboardingStep(userId: string, step: number) {
    await db
        .update(users)
        .set({
          onboardingStep: step,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return {
        onboardingStep: step,
      };
  }

  async getOnboardingStatus(userId: string) {
    const user = await db
        .select({ 
          onboardingStep: users.onboardingStep, 
          isOnboardingComplete: users.isOnboardingComplete 
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        throw createError("User not found", 404);
      }

      return {
        onboardingStep: user[0].onboardingStep,
        isOnboardingComplete: user[0].isOnboardingComplete,
      };
  }
}
