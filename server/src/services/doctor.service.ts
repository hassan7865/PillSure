import { db } from "../config/database";
import { specializations } from "../schema/specialization";
import { doctors } from "../schema/doctor";
import { users } from "../schema/users";
import { hospitals } from "../schema/hospitals";
import { eq, and, or, ilike, sql, inArray } from "drizzle-orm";
import { createError } from "../middleware/error.handler";
// Services should return raw data, not formatted responses

export class DoctorService {
  // Get all specializations

  async getAllDoctors(page: number, limit: number, specializationIds: string[], search: string) {
    const offset = (page - 1) * limit;
        
      // Build conditions array
      const conditions = [];
      
      // Add specialization filter if provided
      if (specializationIds && specializationIds.length > 0) {
        // Convert string IDs to numbers for JSON contains check
        const numericSpecializationIds = specializationIds.map(id => parseInt(id)).filter(id => !isNaN(id));
        console.log('Numeric specialization IDs:', numericSpecializationIds);
        if (numericSpecializationIds.length > 0) {
          // Use JSON contains operator to check if any of the specialization IDs exist in the JSON array
          const jsonbCondition = numericSpecializationIds.map(id => 
            sql`${doctors.specializationIds} @> ${JSON.stringify([id])}`
          ).reduce((acc, condition) => acc ? sql`${acc} OR ${condition}` : condition);
          
          conditions.push(jsonbCondition);
        }
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
      
      // Build the query with hospital information
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
          // Hospital information
          hospitalName: hospitals.hospitalName,
          hospitalAddress: hospitals.hospitalAddress,
          hospitalContactNo: hospitals.hospitalContactNo,
          hospitalEmail: hospitals.hospitalEmail,
          hospitalWebsite: hospitals.websiteHospital,
          hospitalLicenseNo: hospitals.licenseNo,
          hospitalAdminName: hospitals.adminName,
        })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
        .where(and(...conditions))
        .orderBy(doctors.patientSatisfactionRate, doctors.experienceYears);
      
      // Get total count for pagination
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
        .where(and(...conditions));
      
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
      const doctorsWithSpecializations = doctorsResult.map(doctor => {
        const doctorSpecializations = (doctor.specializationIds as number[]).map((id: number) => 
          specializationMap.get(id)
        ).filter(Boolean);
        
        // Build hospital information if doctor is associated with a hospital
        const hospitalInfo = doctor.hospitalId ? {
          id: doctor.hospitalId,
          name: doctor.hospitalName,
          address: doctor.hospitalAddress,
          contactNo: doctor.hospitalContactNo,
          email: doctor.hospitalEmail,
          website: doctor.hospitalWebsite,
          licenseNo: doctor.hospitalLicenseNo,
          adminName: doctor.hospitalAdminName,
        } : null;
        
        return {
          ...doctor,
          specializations: doctorSpecializations,
          // Keep the primary specialization for backward compatibility
          primarySpecialization: doctorSpecializations[0] || null,
          // Add hospital information
          hospital: hospitalInfo,
          // Ensure qualifications are properly formatted
          qualifications: (doctor.qualifications as string[]) || [],
        };
      });
      
      const totalCount = countResult[0]?.count || 0;
     
      
      return {
        doctors: doctorsWithSpecializations,
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
