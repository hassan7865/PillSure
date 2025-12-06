import { db } from '../config/database';
import { users, patients, hospitals } from '../schema';
import { doctors } from '../schema/doctor';
import { eq } from 'drizzle-orm';
import { createError, ValidationError } from '../middleware/error.handler';
import { 
  PatientOnboardingRequest, 
  DoctorOnboardingRequest, 
  HospitalOnboardingRequest
} from '../core/types';

export class OnboardingService {
  constructor() {}

  // =========================================================
  // PATIENT ONBOARDING
  // =========================================================
  async savePatientOnboarding(userId: string, data: PatientOnboardingRequest) {
    return await db.transaction(async (tx) => {
      // 1. Check User
      const user = await tx
        .select({ id: users.id, onboardingStep: users.onboardingStep })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (user.length === 0) {
        throw createError("User not found", 404);
      }

      // 2. Fetch Existing Patient Data
      const existingPatient = await tx
        .select()
        .from(patients)
        .where(eq(patients.userId, userId))
        .limit(1);
      
      const current = existingPatient[0] || {};

      // 3. MERGE DATA (Incoming > Existing > Default)
      const finalData = {
        gender: data.gender !== undefined ? data.gender : current.gender,
        mobile: data.mobile !== undefined ? data.mobile : current.mobile,
        dateOfBirth: data.dateOfBirth !== undefined ? data.dateOfBirth : current.dateOfBirth,
        address: data.address !== undefined ? data.address : current.address,
        bloodGroup: data.bloodGroup !== undefined ? data.bloodGroup : current.bloodGroup,
        hasCovid: data.hasCovid !== undefined ? data.hasCovid : (current.hasCovid || false),
        pastMedicalHistory: data.pastMedicalHistory !== undefined ? data.pastMedicalHistory : (current.pastMedicalHistory || null),
        surgicalHistory: data.surgicalHistory !== undefined ? data.surgicalHistory : (current.surgicalHistory || null),
        allergies: data.allergies !== undefined ? data.allergies : (current.allergies || null),
      };

      // 4. VALIDATION - Required fields for patient onboarding
      // Step 1 (Personal Info): gender, mobile, dateOfBirth, address
      // Step 2 (Medical Info): bloodGroup (but only validated if provided with step 2 data)
      const missingFields: string[] = [];
      if (!finalData.gender) missingFields.push('Gender');
      if (!finalData.mobile) missingFields.push('Mobile');
      if (!finalData.dateOfBirth) missingFields.push('Date of Birth');
      if (!finalData.address) missingFields.push('Address');

      if (missingFields.length > 0) {
        throw ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Check if blood group is provided
      const hasBloodGroup = data.bloodGroup && data.bloodGroup !== '';
      if (!hasBloodGroup) {
        // Allow empty blood group - frontend will handle step-based requirement
        finalData.bloodGroup = current.bloodGroup || '';
      }

      // 5. SAVE TO DB
      if (existingPatient.length > 0) {
        await tx
          .update(patients)
          .set({ ...finalData, updatedAt: new Date() })
          .where(eq(patients.userId, userId));
      } else {
        await tx.insert(patients).values({
          userId,
          ...finalData,
        });
      }

      // 6. UPDATE USER STATUS
      // Progression logic:
      // - If no blood group provided → step 1 (first save on personal info)
      // - If blood group provided → step 3 (completing with medical details)
      // - If already at step >= 1, and blood group now provided → step 3 (completing)
      
      const currentStep = user[0].onboardingStep || 0;
      
      // Determine new step
      let newStep: number;
      let isComplete: boolean;
      
      if (hasBloodGroup) {
        // User has provided blood group - mark as complete
        newStep = 3;
        isComplete = true;
      } else {
        // No blood group - user is still on step 1 (personal info only)
        newStep = 1;
        isComplete = false;
      }
      
      await tx
        .update(users)
        .set({
          onboardingStep: newStep,
          isOnboardingComplete: isComplete,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return {
        onboardingStep: newStep,
        isOnboardingComplete: isComplete,
      };
    });
  }

  // =========================================================
  // DOCTOR ONBOARDING
  // =========================================================
  async saveDoctorOnboarding(userId: string, data: DoctorOnboardingRequest) {
    return await db.transaction(async (tx) => {
      // 1. Check User
      const user = await tx
        .select({ id: users.id, onboardingStep: users.onboardingStep })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (user.length === 0) {
        throw createError("User not found", 404);
      }

      // 2. Fetch Existing Doctor Data
      const existingDoctor = await tx
        .select()
        .from(doctors)
        .where(eq(doctors.userId, userId))
        .limit(1);
      
      const current = existingDoctor[0] || {};

      // 3. MERGE DATA
      const finalData = {
        gender: data.gender !== undefined ? data.gender : current.gender,
        mobile: data.mobile !== undefined ? data.mobile : current.mobile,
        experienceYears: data.experienceYears !== undefined ? data.experienceYears : current.experienceYears,
        specializationIds: data.specializationIds !== undefined 
          ? data.specializationIds 
          : (Array.isArray(current.specializationIds) ? current.specializationIds : []),
        qualifications: data.qualifications !== undefined 
          ? data.qualifications 
          : (Array.isArray(current.qualifications) ? current.qualifications : []),
        consultationModes: data.consultationModes !== undefined 
          ? data.consultationModes 
          : (Array.isArray(current.consultationModes) ? current.consultationModes : []),
        availableDays: data.availableDays !== undefined 
          ? data.availableDays 
          : (Array.isArray(current.availableDays) ? current.availableDays : []),
        address: data.address !== undefined ? data.address : (current.address || ''),
        image: data.image !== undefined ? data.image : (current.image || null),
        feePkr: data.feePkr !== undefined ? data.feePkr.toString() : (current.feePkr || null),
        openingTime: data.openingTime !== undefined ? data.openingTime : (current.openingTime || null),
        closingTime: data.closingTime !== undefined ? data.closingTime : (current.closingTime || null),
      };

      // 4. VALIDATION - Required fields for doctor
      // Step 1 (Info): gender, mobile
      // Step 2 (Details): experienceYears, specializationIds, qualifications, feePkr
      const missingFields: string[] = [];
      if (!finalData.gender) missingFields.push('Gender');
      if (!finalData.mobile) missingFields.push('Mobile');

      if (missingFields.length > 0) {
        throw ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Check if doctor details are complete (for completion)
      const hasExperienceYears = finalData.experienceYears !== undefined && finalData.experienceYears !== null;
      const hasSpecializations = finalData.specializationIds && finalData.specializationIds.length > 0;
      const hasQualifications = finalData.qualifications && finalData.qualifications.length > 0;
      const hasFee = finalData.feePkr !== null && finalData.feePkr !== undefined;

      // 5. SAVE TO DB
      if (existingDoctor.length > 0) {
        await tx
          .update(doctors)
          .set({ ...finalData, updatedAt: new Date() })
          .where(eq(doctors.userId, userId));
      } else {
        await tx.insert(doctors).values({
          userId,
          gender: finalData.gender,
          mobile: finalData.mobile,
          experienceYears: finalData.experienceYears || 0, // Default 0 if not provided
          specializationIds: finalData.specializationIds || [], // Default empty array
          qualifications: finalData.qualifications || [], // Default empty array
          patientSatisfactionRate: "0.00",
          address: finalData.address || "",
          consultationModes: finalData.consultationModes || [],
          availableDays: finalData.availableDays || [],
          image: finalData.image || null,
          feePkr: finalData.feePkr || null,
          openingTime: finalData.openingTime || null,
          closingTime: finalData.closingTime || null,
        });
      }

      // 6. UPDATE USER STATUS
      // Only mark as complete if all details are provided
      // Otherwise, keep at step 1 (incomplete)
      const isComplete: boolean = hasExperienceYears && hasSpecializations && hasQualifications && hasFee;
      const newStep = isComplete ? 3 : 1;
      
      await tx
        .update(users)
        .set({
          onboardingStep: newStep,
          isOnboardingComplete: isComplete,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return {
        onboardingStep: newStep,
        isOnboardingComplete: isComplete,
      };
    });
  }

  // =========================================================
  // HOSPITAL ONBOARDING
  // =========================================================
  async saveHospitalOnboarding(userId: string, data: HospitalOnboardingRequest) {
    return await db.transaction(async (tx) => {
      // 1. Check User
      const user = await tx
        .select({ id: users.id, onboardingStep: users.onboardingStep })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (user.length === 0) {
        throw createError("User not found", 404);
      }

      // 2. Fetch Existing Hospital Data
      const existingHospital = await tx
        .select()
        .from(hospitals)
        .where(eq(hospitals.userId, userId))
        .limit(1);
      
      const current = existingHospital[0] || {};

      // 3. MERGE DATA
      const finalData = {
        hospitalName: data.hospitalName !== undefined ? data.hospitalName : current.hospitalName,
        hospitalAddress: data.hospitalAddress !== undefined ? data.hospitalAddress : current.hospitalAddress,
        hospitalContactNo: data.hospitalContactNo !== undefined ? data.hospitalContactNo : current.hospitalContactNo,
        hospitalEmail: data.hospitalEmail !== undefined ? data.hospitalEmail : current.hospitalEmail,
        licenseNo: data.licenseNo !== undefined ? data.licenseNo : current.licenseNo,
        adminName: data.adminName !== undefined ? data.adminName : current.adminName,
        websiteHospital: data.websiteHospital !== undefined ? data.websiteHospital : (current.websiteHospital || null),
      };

      // 4. VALIDATION
      // Step 1 (Hospital Info): hospitalName, hospitalAddress, hospitalContactNo, hospitalEmail (required)
      // Step 2 (Licensing): licenseNo, adminName (required)
      const missingStep1Fields: string[] = [];
      if (!finalData.hospitalName) missingStep1Fields.push('Hospital Name');
      if (!finalData.hospitalAddress) missingStep1Fields.push('Address');
      if (!finalData.hospitalContactNo) missingStep1Fields.push('Contact No');
      if (!finalData.hospitalEmail) missingStep1Fields.push('Email');

      if (missingStep1Fields.length > 0) {
        throw ValidationError(`Missing required fields: ${missingStep1Fields.join(', ')}`);
      }

      // Check if step 2 (licensing) is complete
      const hasLicenseNo = finalData.licenseNo !== undefined && finalData.licenseNo !== null && finalData.licenseNo !== '';
      const hasAdminName = finalData.adminName !== undefined && finalData.adminName !== null && finalData.adminName !== '';

      // 5. SAVE TO DB
      if (existingHospital.length > 0) {
        await tx
          .update(hospitals)
          .set({ ...finalData, updatedAt: new Date() })
          .where(eq(hospitals.userId, userId));
      } else {
        await tx.insert(hospitals).values({
          userId,
          ...finalData,
        });
      }

      // 6. UPDATE USER STATUS
      // Only mark as complete if all licensing details are provided
      // Otherwise, keep at step 1 (incomplete)
      const isComplete: boolean = hasLicenseNo && hasAdminName;
      const newStep = isComplete ? 3 : 1;

      await tx
        .update(users)
        .set({
          onboardingStep: newStep,
          isOnboardingComplete: isComplete,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return {
        onboardingStep: newStep,
        isOnboardingComplete: isComplete,
      };
    });
  }

  // =========================================================
  // UTILITY METHODS
  // =========================================================
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
      isOnboardingComplete: user[0].isOnboardingComplete 
    };
  }

  async updateOnboardingStep(userId: string, step: number) {
    await db
      .update(users)
      .set({ onboardingStep: step, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    return { onboardingStep: step };
  }

  async getPatientData(userId: string) {
    const data = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);
    
    return data[0] || null;
  }

  async getDoctorData(userId: string) {
    const data = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);
    
    return data[0] || null;
  }

  async getHospitalData(userId: string) {
    const data = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.userId, userId))
      .limit(1);
    
    return data[0] || null;
  }
}