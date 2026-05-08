import { db } from "../config/database";
import { specializations } from "../schema/specialization";
import { doctors } from "../schema/doctor";
import { users } from "../schema/users";
import { hospitals } from "../schema/hospitals";
import {
  doctorPracticeAffiliations,
  type AffiliationWeeklySchedule,
} from "../schema/doctorPracticeAffiliations";
import { eq, and, sql, inArray, desc, SQL } from "drizzle-orm";
import { mergeWeeklySchedule } from "../utils/practiceSchedule.util";
import { hasAnyDiscreteHalfHourSlots } from "../utils/affiliationHalfHourSlots.util";
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
    address: doctors.address,
    image: doctors.image,
    feePkr: doctors.feePkr,
    consultationModes: doctors.consultationModes,
    openingTime: doctors.openingTime,
    closingTime: doctors.closingTime,
    availableDays: doctors.availableDays,
    createdAt: doctors.createdAt,
    updatedAt: doctors.updatedAt,
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

  return {
    ...doctor,
    specializations: doctorSpecializations,
    primarySpecialization: primarySpecialization || null,
    qualifications: qualifications,
    hospital: null,
  };
}

export type PublicBookablePracticeAffiliation = {
  id: string;
  kind: string;
  label: string;
  feePkr: string | null;
  availableDays: string[];
  openingTime: string | null;
  closingTime: string | null;
  /** When set, only these 30-minute starts (HH:mm) per weekday are bookable for this site. */
  halfHourSlotsByWeekday?: Record<string, string[]> | null;
};

function buildPracticeAffiliationLabel(row: {
  kind: string;
  hospitalName: string | null;
}): string {
  if (row.kind === "hospital") return (row.hospitalName || "").trim() || "Hospital";
  return "Private practice";
}

type DoctorScheduleFallbackRow = {
  availableDays: unknown;
  openingTime: string | null | undefined;
  closingTime: string | null | undefined;
  feePkr: string | null | undefined;
};

async function loadActiveBookableAffiliations(
  doctorIds: string[],
  scheduleByDoctorId: Map<string, DoctorScheduleFallbackRow>,
): Promise<Map<string, PublicBookablePracticeAffiliation[]>> {
  const out = new Map<string, PublicBookablePracticeAffiliation[]>();
  for (const id of doctorIds) {
    out.set(id, []);
  }
  if (doctorIds.length === 0) {
    return out;
  }

  const affRows = await db
    .select({
      id: doctorPracticeAffiliations.id,
      doctorId: doctorPracticeAffiliations.doctorId,
      kind: doctorPracticeAffiliations.kind,
      weeklySchedule: doctorPracticeAffiliations.weeklySchedule,
      hospitalName: hospitals.hospitalName,
    })
    .from(doctorPracticeAffiliations)
    .leftJoin(hospitals, eq(doctorPracticeAffiliations.hospitalId, hospitals.id))
    .where(and(inArray(doctorPracticeAffiliations.doctorId, doctorIds), eq(doctorPracticeAffiliations.status, "active")));

  for (const r of affRows) {
    const docFallback = scheduleByDoctorId.get(r.doctorId);
    const ws = (r.weeklySchedule as AffiliationWeeklySchedule | null) ?? null;
    const wsObject = ws && !Array.isArray(ws) ? ws : null;
    const merged = mergeWeeklySchedule(ws, {
      availableDays: docFallback?.availableDays ?? [],
      openingTime: docFallback?.openingTime ?? null,
      closingTime: docFallback?.closingTime ?? null,
    });
    const entry: PublicBookablePracticeAffiliation = {
      id: r.id,
      kind: r.kind,
      label: buildPracticeAffiliationLabel(r),
      feePkr: docFallback?.feePkr ?? null,
      availableDays: merged.availableDays,
      openingTime: merged.openingTime,
      closingTime: merged.closingTime,
      halfHourSlotsByWeekday: wsObject && hasAnyDiscreteHalfHourSlots(wsObject) ? wsObject.bookableHalfHourSlotsByWeekday ?? null : null,
    };
    const list = out.get(r.doctorId) ?? [];
    list.push(entry);
    out.set(r.doctorId, list);
  }
  return out;
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

    const scheduleByDoctorId = new Map<string, DoctorScheduleFallbackRow>(
      doctorsWithSpecializations.map((d: any) => [
        d.id,
        {
          availableDays: d.availableDays,
          openingTime: d.openingTime,
          closingTime: d.closingTime,
          feePkr: d.feePkr,
        },
      ]),
    );
    const affMap = await loadActiveBookableAffiliations(
      doctorsWithSpecializations.map((d: any) => d.id),
      scheduleByDoctorId,
    );
    const doctorsWithAffiliations = doctorsWithSpecializations.map((d: any) => ({
      ...d,
      bookableAffiliations: affMap.get(d.id) ?? [],
    }));

    const totalCount = countResult[0]?.count || 0;

    return {
      doctors: doctorsWithAffiliations,
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
        address: doctors.address,
        image: doctors.image,
        feePkr: doctors.feePkr,
        consultationModes: doctors.consultationModes,
        availableDays: doctors.availableDays,
        openingTime: doctors.openingTime,
        closingTime: doctors.closingTime,
        createdAt: doctors.createdAt,
        updatedAt: doctors.updatedAt,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
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
        address: doctors.address,
        image: doctors.image,
        feePkr: doctors.feePkr,
        consultationModes: doctors.consultationModes,
        availableDays: doctors.availableDays,
        openingTime: doctors.openingTime,
        closingTime: doctors.closingTime,
        createdAt: doctors.createdAt,
        updatedAt: doctors.updatedAt,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(eq(doctors.id, doctorId), eq(doctors.isActive, true)))
      .limit(1);

    if (result.length === 0) {
      throw createError("Doctor profile not found", 404);
    }

    const doctor = result[0];

    let profile: Record<string, unknown> = {
      ...doctor,
      specializations: [],
      primarySpecialization: null,
    };

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

        profile = {
          ...doctor,
          specializations: doctorSpecializations,
          primarySpecialization,
        };
      }
    }

    const scheduleMap = new Map<string, DoctorScheduleFallbackRow>([
      [
        String(profile.id),
        {
          availableDays: profile.availableDays,
          openingTime: profile.openingTime as string | null | undefined,
          closingTime: profile.closingTime as string | null | undefined,
          feePkr: profile.feePkr as string | null | undefined,
        },
      ],
    ]);
    const affMap = await loadActiveBookableAffiliations([String(profile.id)], scheduleMap);

    return {
      ...profile,
      bookableAffiliations: affMap.get(String(profile.id)) ?? [],
    };
  }
}

export const doctorService = new DoctorService();
