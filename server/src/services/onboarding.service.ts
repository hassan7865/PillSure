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

  async savePatientOnboarding(userId: string, data: PatientOnboardingRequest) {
    // Check if user exists
    const user = await db
      .select({ id: users.id })
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

    // Determine if all required fields are present for completion
    const isComplete = !!(data.gender && data.mobile && data.dateOfBirth && data.address && data.bloodGroup);

    if (existingPatient.length > 0) {
      // Update existing patient - only update provided fields
      const updateData: any = { updatedAt: new Date() };
      
      if (data.gender) updateData.gender = data.gender;
      if (data.mobile) updateData.mobile = data.mobile;
      if (data.dateOfBirth) updateData.dateOfBirth = data.dateOfBirth;
      if (data.address) updateData.address = data.address;
      if (data.bloodGroup) updateData.bloodGroup = data.bloodGroup;
      if (data.hasCovid !== undefined) updateData.hasCovid = data.hasCovid;
      if (data.surgicalHistory !== undefined) updateData.surgicalHistory = data.surgicalHistory;
      if (data.allergies !== undefined) updateData.allergies = data.allergies;
      
      // JSONB field - no JSON.stringify needed
      if (data.pastMedicalHistory && data.pastMedicalHistory.length > 0) {
        updateData.pastMedicalHistory = data.pastMedicalHistory;
      }
      
      await db
        .update(patients)
        .set(updateData)
        .where(eq(patients.userId, userId));
    } else {
      // Create new patient
      await db
        .insert(patients)
        .values({
          userId,
          gender: data.gender || 'male',
          mobile: data.mobile || '',
          dateOfBirth: data.dateOfBirth || new Date().toISOString(),
          address: data.address || '',
          bloodGroup: data.bloodGroup || '',
          hasCovid: data.hasCovid || false,
          pastMedicalHistory: data.pastMedicalHistory || null,
          surgicalHistory: data.surgicalHistory || null,
          allergies: data.allergies || null,
        });
    }

    // Update user onboarding status if complete
    if (isComplete) {
      await db
        .update(users)
        .set({
          onboardingStep: 3,
          isOnboardingComplete: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    return {
      onboardingStep: isComplete ? 3 : 2,
      isOnboardingComplete: isComplete,
    };
  }

  async saveDoctorOnboarding(userId: string, data: DoctorOnboardingRequest) {
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

    // Determine if all required fields are present for completion
    const isComplete = !!(data.gender && data.mobile && data.specializationIds?.length && 
                         data.qualifications?.length && data.experienceYears && data.address && 
                         data.consultationModes?.length && data.availableDays?.length);

    if (existingDoctor.length > 0) {
      // Update existing doctor - only update provided fields
      const updateData: any = { updatedAt: new Date() };
      
      if (data.gender) updateData.gender = data.gender;
      if (data.mobile) updateData.mobile = data.mobile;
      if (data.address) updateData.address = data.address;
      if (data.image !== undefined) updateData.image = data.image;
      if (data.experienceYears !== undefined) updateData.experienceYears = data.experienceYears;
      if (data.feePkr !== undefined) updateData.feePkr = data.feePkr.toString();
      if (data.openingTime !== undefined) updateData.openingTime = data.openingTime;
      if (data.closingTime !== undefined) updateData.closingTime = data.closingTime;
      
    
      if (data.specializationIds && data.specializationIds.length > 0) {
        updateData.specializationIds = data.specializationIds;
      }
      if (data.qualifications && data.qualifications.length > 0) {
        updateData.qualifications = data.qualifications;
      }
      if (data.consultationModes && data.consultationModes.length > 0) {
        updateData.consultationModes = data.consultationModes;
      }
      if (data.availableDays && data.availableDays.length > 0) {
        updateData.availableDays = data.availableDays;
      }
      
      await db
        .update(doctors)
        .set(updateData)
        .where(eq(doctors.userId, userId));
    } else {
      // Create new doctor
      await db
        .insert(doctors)
        .values({
          userId,
          gender: data.gender || 'male',
          mobile: data.mobile || '',
          specializationIds: data.specializationIds || [],
          qualifications: data.qualifications || [],
          experienceYears: data.experienceYears || 0,
          patientSatisfactionRate: "0.00",
          address: data.address || '',
          image: data.image || null,
          feePkr: data.feePkr ? data.feePkr.toString() : null,
          consultationModes: data.consultationModes || [],
          openingTime: data.openingTime || null,
          closingTime: data.closingTime || null,
          availableDays: data.availableDays || [],
        });
    }

    // Update user onboarding status if complete
    if (isComplete) {
      await db
        .update(users)
        .set({
          onboardingStep: 3,
          isOnboardingComplete: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    return {
      onboardingStep: isComplete ? 3 : 2,
      isOnboardingComplete: isComplete,
    };
  }

  async saveHospitalOnboarding(userId: string, data: HospitalOnboardingRequest) {
    // Check if user exists
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw createError("User not found", 404);
    }

    // Check if hospital already exists for this user
    const existingHospital = await db
      .select({ id: hospitals.id })
      .from(hospitals)
      .where(eq(hospitals.userId, userId))
      .limit(1);

    // Determine if all required fields are present for completion
    const isComplete = !!(data.hospitalName && data.hospitalAddress && data.hospitalContactNo && 
                         data.hospitalEmail && data.licenseNo && data.adminName);

    if (existingHospital.length > 0) {
      // Update existing hospital - only update provided fields
      const updateData: any = { updatedAt: new Date() };
      
      if (data.hospitalName) updateData.hospitalName = data.hospitalName;
      if (data.hospitalAddress) updateData.hospitalAddress = data.hospitalAddress;
      if (data.hospitalContactNo) updateData.hospitalContactNo = data.hospitalContactNo;
      if (data.hospitalEmail) updateData.hospitalEmail = data.hospitalEmail;
      if (data.websiteHospital !== undefined) updateData.websiteHospital = data.websiteHospital;
      if (data.licenseNo) updateData.licenseNo = data.licenseNo;
      if (data.adminName) updateData.adminName = data.adminName;
      
      await db
        .update(hospitals)
        .set(updateData)
        .where(eq(hospitals.userId, userId));
    } else {
      // Create new hospital
      await db
        .insert(hospitals)
        .values({
          userId,
          hospitalName: data.hospitalName || '',
          hospitalAddress: data.hospitalAddress || '',
          hospitalContactNo: data.hospitalContactNo || '',
          hospitalEmail: data.hospitalEmail || '',
          websiteHospital: data.websiteHospital || null,
          licenseNo: data.licenseNo || '',
          adminName: data.adminName || '',
        });
    }

    // Update user onboarding status if complete
    if (isComplete) {
      await db
        .update(users)
        .set({
          onboardingStep: 3,
          isOnboardingComplete: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    return {
      onboardingStep: isComplete ? 3 : 2,
      isOnboardingComplete: isComplete,
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

  // Get saved data methods (made public for routes)
  async getPatientData(userId: string) {
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);

    if (patient.length === 0) {
      return null;
    }

    // JSONB fields are already parsed by the driver, just ensure they're arrays
    const ensureArray = (value: any) => Array.isArray(value) ? value : [];

    return {
      ...patient[0],
      pastMedicalHistory: ensureArray(patient[0].pastMedicalHistory)
    };
  }

  async getDoctorData(userId: string) {
    const doctor = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    if (doctor.length === 0) {
      return null;
    }

    // JSONB fields are already parsed by the driver, just ensure they're arrays
    const ensureArray = (value: any) => Array.isArray(value) ? value : [];

    return {
      ...doctor[0],
      specializationIds: ensureArray(doctor[0].specializationIds),
      qualifications: ensureArray(doctor[0].qualifications),
      consultationModes: ensureArray(doctor[0].consultationModes),
      availableDays: ensureArray(doctor[0].availableDays),
    };
  }

  async getHospitalData(userId: string) {
    const hospital = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.userId, userId))
      .limit(1);

    if (hospital.length === 0) {
      return null;
    }

    return hospital[0];
  }
}
