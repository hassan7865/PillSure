import { db } from "../config/database";
import { specializations } from "../schema/specialization";
import { doctors } from "../schema/doctor";
import { users } from "../schema/users";
import { hospitals } from "../schema/hospitals";
import { eq, and, sql, inArray, desc, SQL } from "drizzle-orm";
import { createError } from "../middleware/error.handler";
import { calculatePagination, calculateOffset } from "./utils/pagination.utils";
import { buildSearchConditions } from "./utils/search.utils";

// ---------------------------------------------------------------------------
// Doctor list / detail helpers (doctor listing only)
// ---------------------------------------------------------------------------

function getBaseDoctorSelect() {
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

function buildSpecializationFilter(specializationIds: number[]): SQL | undefined {
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
    sql`${doctors.specializationIds} @> ${JSON.stringify([id])}`,
  );

  return jsonbConditions.reduce((acc, condition) =>
    acc ? sql`${acc} OR ${condition}` : condition,
  );
}

function transformDoctorWithDetails(
  doctor: any,
  specializationMap: Map<number, { id: number; name: string; description: string | null }>,
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

  const hospitalInfo =
    doctor.hospitalId && doctor.hospitalName
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

// ---------------------------------------------------------------------------
// DoctorService
// ---------------------------------------------------------------------------

export class DoctorService {
  async getAllDoctors(page: number, limit: number, specializationIds: string[], search: string) {
    const offset = calculateOffset(page, limit);

    const conditions = [];

    if (specializationIds && specializationIds.length > 0) {
      const numericSpecializationIds = specializationIds.map((id) => parseInt(id)).filter((id) => !isNaN(id));

      if (numericSpecializationIds.length > 0) {
        const specializationFilter = buildSpecializationFilter(numericSpecializationIds);
        if (specializationFilter) {
          conditions.push(specializationFilter);
        }
      }
    }

    const searchCondition = buildSearchConditions(search, [
      users.firstName,
      users.lastName,
      sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
    ]);
    if (searchCondition) {
      conditions.push(searchCondition);
    }

    conditions.push(eq(doctors.isActive, true));

    const whereClause = and(...conditions);

    let query = db
      .select(getBaseDoctorSelect())
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
      .where(whereClause)
      .orderBy(
        desc(doctors.patientSatisfactionRate),
        desc(doctors.experienceYears),
        desc(doctors.createdAt),
      );

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
      .where(whereClause);

    const [doctorsResult, countResult] = await Promise.all([query.limit(limit).offset(offset), countQuery]);

    const allSpecializations = await db
      .select({
        id: specializations.id,
        name: specializations.name,
        description: specializations.description,
      })
      .from(specializations);

    const specializationMap = new Map(allSpecializations.map((spec) => [spec.id, spec]));

    const doctorsWithSpecializations = doctorsResult.map((doctor) =>
      transformDoctorWithDetails(doctor, specializationMap),
    );

    const totalCount = countResult[0]?.count || 0;

    return {
      doctors: doctorsWithSpecializations,
      pagination: calculatePagination(page, limit, totalCount),
    };
  }

  async getAllSpecializations() {
    const result = await db
      .select({
        id: specializations.id,
        name: specializations.name,
        description: specializations.description,
      })
      .from(specializations)
      .orderBy(specializations.name);

    return result;
  }

  async getDoctorByUserId(userId: string) {
    const result = await db
      .select({
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
        availableDays: doctors.availableDays,
        openingTime: doctors.openingTime,
        closingTime: doctors.closingTime,
        createdAt: doctors.createdAt,
        updatedAt: doctors.updatedAt,
        hospitalName: hospitals.hospitalName,
        hospitalAddress: hospitals.hospitalAddress,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
      .where(and(eq(doctors.userId, userId), eq(doctors.isActive, true)))
      .limit(1);

    if (result.length === 0) {
      throw createError("Doctor profile not found", 404);
    }

    return result[0];
  }

  async getDoctorById(doctorId: string) {
    const result = await db
      .select({
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
        availableDays: doctors.availableDays,
        openingTime: doctors.openingTime,
        closingTime: doctors.closingTime,
        createdAt: doctors.createdAt,
        updatedAt: doctors.updatedAt,
        hospitalName: hospitals.hospitalName,
        hospitalAddress: hospitals.hospitalAddress,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
      .where(and(eq(doctors.id, doctorId), eq(doctors.isActive, true)))
      .limit(1);

    if (result.length === 0) {
      throw createError("Doctor profile not found", 404);
    }

    const doctor = result[0];

    if (doctor.specializationIds && Array.isArray(doctor.specializationIds) && doctor.specializationIds.length > 0) {
      const specializationIdsArray = doctor.specializationIds
        .map((id: any) => Number(id))
        .filter((id: number) => !isNaN(id));

      if (specializationIdsArray.length > 0) {
        const specializationsResult = await db
          .select()
          .from(specializations)
          .where(inArray(specializations.id, specializationIdsArray));

        const doctorSpecializations = specializationsResult || [];
        const primarySpecialization =
          doctorSpecializations.find((s: any) => s.id === specializationIdsArray[0]) || null;

        return {
          ...doctor,
          specializations: doctorSpecializations,
          primarySpecialization,
        };
      }
    }

    return {
      ...doctor,
      specializations: [],
      primarySpecialization: null,
    };
  }
}

export const doctorService = new DoctorService();
