import { db } from "../config/database";
import { specializations } from "../schema/specialization";
import { doctors } from "../schema/doctor";
import { users } from "../schema/users";
import { eq, and, or, ilike, sql, inArray } from "drizzle-orm";
import { InternalServerError } from "../middleware/error.handler";
// Services should return raw data, not formatted responses

export class DoctorService {
  // Get all specializations

  async getAllDoctors(page: number, limit: number, specializationIds: string[], search: string) {
    const offset = (page - 1) * limit;
      
      // Build conditions array
      const conditions = [];
      
      // Add specialization filter if provided
      if (specializationIds && specializationIds.length > 0) {
        conditions.push(
          sql`JSON_EXTRACT(${doctors.specializationIds}, '$') && ${JSON.stringify(specializationIds)}`
        );
      }
      
      // Add search filter if provided
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(users.firstName, searchTerm),
            ilike(users.lastName, searchTerm),
            ilike(sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`, searchTerm)
          )
        );
      }
      
      // Add active doctors filter
      conditions.push(eq(doctors.isActive, true));
      
      // Build the query
      let query = db
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
          createdAt: doctors.createdAt,
          updatedAt: doctors.updatedAt,
        })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(and(...conditions))
        .orderBy(doctors.patientSatisfactionRate, doctors.experienceYears);
      
      // Get total count for pagination
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(and(...conditions));
      
      // Execute queries
      const [doctorsResult, countResult] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
      ]);
      
      const totalCount = countResult[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);
      
      return {
        doctors: doctorsResult,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
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

}

export const doctorService = new DoctorService();
