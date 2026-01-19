import { db } from "../config/database";
import { specializations } from "../schema/specialization";
import { doctors } from "../schema/doctor";
import { users } from "../schema/users";
import { hospitals } from "../schema/hospitals";
import { eq, and, or, ilike, sql, inArray } from "drizzle-orm";
import { createError } from "../middleware/error.handler";
import { calculatePagination, calculateOffset } from "./utils/pagination.utils";
import { buildSearchConditions } from "./utils/search.utils";
import { 
  getBaseDoctorSelect, 
  mapSpecializationsToDoctors, 
  buildSpecializationFilter,
  transformDoctorWithDetails 
} from "./utils/doctor.utils";
// Services should return raw data, not formatted responses

export class DoctorService {
  // Get all specializations

  async getAllDoctors(page: number, limit: number, specializationIds: string[], search: string) {
    const offset = calculateOffset(page, limit);
        
      // Build conditions array
      const conditions = [];
      
      // Add specialization filter if provided
      if (specializationIds && specializationIds.length > 0) {
        const numericSpecializationIds = specializationIds
          .map(id => parseInt(id))
          .filter(id => !isNaN(id));
        
        if (numericSpecializationIds.length > 0) {
          const specializationFilter = buildSpecializationFilter(numericSpecializationIds);
          if (specializationFilter) {
            conditions.push(specializationFilter);
          }
        }
      }
      
      // Add search filter if provided
      const searchCondition = buildSearchConditions(search, [
        users.firstName,
        users.lastName,
        sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      ]);
      if (searchCondition) {
        conditions.push(searchCondition);
      }
      
      // Add active doctors filter
      conditions.push(eq(doctors.isActive, true));
      
      // Build the query with hospital information
      const whereClause = and(...conditions);
      
      let query = db
        .select(getBaseDoctorSelect())
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
        .where(whereClause)
        .orderBy(doctors.patientSatisfactionRate, doctors.experienceYears);
      
      // Get total count for pagination
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
        .where(whereClause);
      
      // Execute queries
      const [doctorsResult, countResult] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
      ]);
      
      // Get all specializations for mapping
      const allSpecializations = await db.select({
        id: specializations.id,
        name: specializations.name,
        description: specializations.description,
      }).from(specializations);
      
      // Create specialization map for quick lookup
      const specializationMap = new Map(
        allSpecializations.map(spec => [spec.id, spec])
      );
      
      // Transform doctors to include specialization and hospital details
      const doctorsWithSpecializations = doctorsResult.map(doctor => 
        transformDoctorWithDetails(doctor, specializationMap)
      );
      
      const totalCount = countResult[0]?.count || 0;
     
      return {
        doctors: doctorsWithSpecializations,
        pagination: calculatePagination(page, limit, totalCount)
      };
  }
  
  async getAllSpecializations() {
    const result = await db.select({
        id: specializations.id,
        name: specializations.name,
        description: specializations.description,
      }).from(specializations)
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
      .where(
        and(
          eq(doctors.userId, userId),
          eq(doctors.isActive, true)
        )
      )
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
      .where(
        and(
          eq(doctors.id, doctorId),
          eq(doctors.isActive, true)
        )
      )
      .limit(1);

    if (result.length === 0) {
      throw createError("Doctor profile not found", 404);
    }

    const doctor = result[0];

    // Fetch specializations for this doctor
    if (doctor.specializationIds && Array.isArray(doctor.specializationIds) && doctor.specializationIds.length > 0) {
      const specializationIdsArray = doctor.specializationIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));
      
      if (specializationIdsArray.length > 0) {
        const specializationsResult = await db
          .select()
          .from(specializations)
          .where(
            inArray(
              specializations.id,
              specializationIdsArray
            )
          );

        const doctorSpecializations = specializationsResult || [];
        const primarySpecialization = doctorSpecializations.find((s: any) => s.id === specializationIdsArray[0]) || null;

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
