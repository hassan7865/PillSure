/**
 * Utility functions for doctor-related operations
 */
import { db } from "../../config/database";
import { doctors } from "../../schema/doctor";
import { users } from "../../schema/users";
import { hospitals } from "../../schema/hospitals";
import { specializations } from "../../schema/specialization";
import { eq, and, inArray, sql } from "drizzle-orm";

export interface DoctorSelectFields {
  id: typeof doctors.id;
  userId: typeof doctors.userId;
  firstName: typeof users.firstName;
  lastName: typeof users.lastName;
  email: typeof users.email;
  gender: typeof doctors.gender;
  mobile: typeof doctors.mobile;
  specializationIds: typeof doctors.specializationIds;
  qualifications: typeof doctors.qualifications;
  experienceYears: typeof doctors.experienceYears;
  patientSatisfactionRate: typeof doctors.patientSatisfactionRate;
  hospitalId: typeof doctors.hospitalId;
  address: typeof doctors.address;
  image: typeof doctors.image;
  feePkr: typeof doctors.feePkr;
  consultationModes: typeof doctors.consultationModes;
  openingTime: typeof doctors.openingTime;
  closingTime: typeof doctors.closingTime;
  availableDays: typeof doctors.availableDays;
  createdAt: typeof doctors.createdAt;
  updatedAt: typeof doctors.updatedAt;
  hospitalName?: typeof hospitals.hospitalName;
  hospitalAddress?: typeof hospitals.hospitalAddress;
  hospitalContactNo?: typeof hospitals.hospitalContactNo;
  hospitalEmail?: typeof hospitals.hospitalEmail;
  hospitalWebsite?: typeof hospitals.websiteHospital;
  hospitalLicenseNo?: typeof hospitals.licenseNo;
  hospitalAdminName?: typeof hospitals.adminName;
}

/**
 * Get base doctor select fields with user and hospital joins
 */
export function getBaseDoctorSelect() {
  return {
    id: doctors.id,
    userId: doctors.userId,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    gender: doctors.gender,
    mobile: doctors.mobile,
    specializationIds: doctors.specializationIds,
    qualifications: doctors.qualifications,
    experienceYears: doctors.experienceYears,
    patientSatisfactionRate: doctors.patientSatisfactionRate,
    hospitalId: doctors.hospitalId,
    address: doctors.address,
    image: doctors.image,
    feePkr: doctors.feePkr,
    consultationModes: doctors.consultationModes,
    openingTime: doctors.openingTime,
    closingTime: doctors.closingTime,
    availableDays: doctors.availableDays,
    createdAt: doctors.createdAt,
    updatedAt: doctors.updatedAt,
    hospitalName: hospitals.hospitalName,
    hospitalAddress: hospitals.hospitalAddress,
    hospitalContactNo: hospitals.hospitalContactNo,
    hospitalEmail: hospitals.hospitalEmail,
    hospitalWebsite: hospitals.websiteHospital,
    hospitalLicenseNo: hospitals.licenseNo,
    hospitalAdminName: hospitals.adminName,
  };
}

/**
 * Map specialization IDs to specialization objects
 */
export async function mapSpecializationsToDoctors(
  doctorSpecializationIds: number[]
): Promise<Map<number, { id: number; name: string; description: string | null }>> {
  if (!doctorSpecializationIds || doctorSpecializationIds.length === 0) {
    return new Map();
  }

  const uniqueIds = Array.from(new Set(doctorSpecializationIds.filter((id) => id && id > 0)));
  
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const specializationRecords = await db
    .select()
    .from(specializations)
    .where(inArray(specializations.id, uniqueIds));

  return new Map(
    specializationRecords.map((spec) => [spec.id, spec])
  );
}

/**
 * Build specialization filter condition for JSONB array
 */
export function buildSpecializationFilter(specializationIds: number[]): SQL | undefined {
  if (!specializationIds || specializationIds.length === 0) {
    return undefined;
  }

  const numericIds = specializationIds
    .map((id) => parseInt(String(id), 10))
    .filter((id) => !isNaN(id));

  if (numericIds.length === 0) {
    return undefined;
  }

  const jsonbConditions = numericIds.map((id) =>
    sql`${doctors.specializationIds} @> ${JSON.stringify([id])}`
  );

  return jsonbConditions.reduce((acc, condition) =>
    acc ? sql`${acc} OR ${condition}` : condition
  );
}

/**
 * Transform doctor data with specializations and hospital info
 */
export function transformDoctorWithDetails(
  doctor: any,
  specializationMap: Map<number, { id: number; name: string; description: string | null }>
) {
  const doctorSpecializationIds = (doctor.specializationIds as number[]) || [];
  const doctorSpecializations = doctorSpecializationIds
    .map((id) => specializationMap.get(id))
    .filter(Boolean) as Array<{
    id: number;
    name: string;
    description: string | null;
  }>;

  const primarySpecialization = doctorSpecializations[0];
  const qualifications = (doctor.qualifications as string[]) || [];

  const hospitalInfo = doctor.hospitalId && doctor.hospitalName
    ? {
        id: doctor.hospitalId,
        name: doctor.hospitalName,
        address: doctor.hospitalAddress || "",
        contactNo: doctor.hospitalContactNo || "",
        email: doctor.hospitalEmail || null,
        website: doctor.hospitalWebsite || null,
        licenseNo: doctor.hospitalLicenseNo || null,
        adminName: doctor.hospitalAdminName || null,
      }
    : null;

  return {
    ...doctor,
    specializations: doctorSpecializations,
    primarySpecialization: primarySpecialization || null,
    qualifications: qualifications,
    hospital: hospitalInfo,
  };
}
