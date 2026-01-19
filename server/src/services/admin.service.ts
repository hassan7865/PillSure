import { db } from "../config/database";
import { users } from "../schema/users";
import { medicines } from "../schema/medicine";
import { doctors } from "../schema/doctor";
import { hospitals } from "../schema/hospitals";
import { appointments } from "../schema/appointments";
import { roles } from "../schema/roles";
import { eq, sql, count, and, or, ilike, desc } from "drizzle-orm";
import { s3Service } from "./s3.service";
import { calculatePagination, calculateOffset } from "./utils/pagination.utils";
import { buildSearchConditions } from "./utils/search.utils";
import {
  handleMedicineImageUpdate,
  cleanupUploadedImages,
  deleteOldImages,
  formatImagesForDB,
} from "./utils/image.utils";

export class AdminService {
  async getStats() {
    try {
      // Get total users by role
      const usersByRole = await db
        .select({
          roleName: roles.name,
          count: sql<number>`count(${users.id})::int`,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .groupBy(roles.name);

      // Convert to object for easier access
      const usersByRoleMap: Record<string, number> = {};
      usersByRole.forEach((item) => {
        usersByRoleMap[item.roleName] = item.count;
      });

      // Get total counts
      const totalUsers = await db.select({ count: count() }).from(users);
      const totalMedicines = await db.select({ count: count() }).from(medicines);
      const totalDoctors = await db.select({ count: count() }).from(doctors);
      const totalHospitals = await db.select({ count: count() }).from(hospitals);

      // Get appointments by status
      const appointmentsByStatus = await db
        .select({
          status: appointments.status,
          count: sql<number>`count(${appointments.id})::int`,
        })
        .from(appointments)
        .groupBy(appointments.status);

      const appointmentsByStatusMap: Record<string, number> = {};
      appointmentsByStatus.forEach((item) => {
        appointmentsByStatusMap[item.status] = item.count;
      });

      // Get total appointments
      const totalAppointments = await db.select({ count: count() }).from(appointments);

      // Get active users (isActive = true)
      const activeUsers = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isActive, true));

      // Get medicines in stock (stock > 0)
      const medicinesInStock = await db
        .select({ count: count() })
        .from(medicines)
        .where(sql`${medicines.stock} > 0`);

      // Get active doctors
      const activeDoctors = await db
        .select({ count: count() })
        .from(doctors)
        .where(eq(doctors.isActive, true));

      // Get active hospitals
      const activeHospitals = await db
        .select({ count: count() })
        .from(hospitals)
        .where(eq(hospitals.isActive, true));

      return {
        users: {
          total: totalUsers[0]?.count || 0,
          active: activeUsers[0]?.count || 0,
          byRole: usersByRoleMap,
        },
        medicines: {
          total: totalMedicines[0]?.count || 0,
          inStock: medicinesInStock[0]?.count || 0,
        },
        doctors: {
          total: totalDoctors[0]?.count || 0,
          active: activeDoctors[0]?.count || 0,
        },
        hospitals: {
          total: totalHospitals[0]?.count || 0,
          active: activeHospitals[0]?.count || 0,
        },
        appointments: {
          total: totalAppointments[0]?.count || 0,
          byStatus: appointmentsByStatusMap,
        },
      };
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      throw error;
    }
  }

  async getDoctors(page: number = 1, limit: number = 10, search: string = '') {
    try {
      const offset = calculateOffset(page, limit);
      const conditions = [];

      // Add search filter if provided
      const searchCondition = buildSearchConditions(search, [
        users.firstName,
        users.lastName,
        users.email,
        doctors.mobile,
        doctors.address,
      ]);
      if (searchCondition) {
        conditions.push(searchCondition);
      }

      // Build query with user and hospital information
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const query = db
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
          openingTime: doctors.openingTime,
          closingTime: doctors.closingTime,
          availableDays: doctors.availableDays,
          isActive: doctors.isActive,
          createdAt: doctors.createdAt,
          updatedAt: doctors.updatedAt,
          hospitalName: hospitals.hospitalName,
          hospitalAddress: hospitals.hospitalAddress,
          hospitalContactNo: hospitals.hospitalContactNo,
        })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
        .where(whereClause)
        .orderBy(desc(doctors.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
        .where(whereClause);

      const [doctorsList, countResult] = await Promise.all([
        query,
        countQuery,
      ]);

      const totalCount = countResult[0]?.count || 0;

      return {
        doctors: doctorsList,
        pagination: calculatePagination(page, limit, totalCount),
      };
    } catch (error) {
      console.error("Error fetching paginated doctors:", error);
      throw error;
    }
  }

  async getHospitals(page: number = 1, limit: number = 10, search: string = '') {
    try {
      const offset = calculateOffset(page, limit);
      const conditions = [];

      // Add search filter if provided
      const searchCondition = buildSearchConditions(search, [
        hospitals.hospitalName,
        hospitals.hospitalAddress,
        hospitals.hospitalEmail,
        hospitals.hospitalContactNo,
        hospitals.licenseNo,
        hospitals.adminName,
        users.email,
        users.firstName,
        users.lastName,
      ]);
      if (searchCondition) {
        conditions.push(searchCondition);
      }

      // Build query with user information
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const query = db
        .select({
          id: hospitals.id,
          userId: hospitals.userId,
          hospitalName: hospitals.hospitalName,
          hospitalAddress: hospitals.hospitalAddress,
          hospitalContactNo: hospitals.hospitalContactNo,
          hospitalEmail: hospitals.hospitalEmail,
          websiteHospital: hospitals.websiteHospital,
          licenseNo: hospitals.licenseNo,
          adminName: hospitals.adminName,
          isActive: hospitals.isActive,
          createdAt: hospitals.createdAt,
          updatedAt: hospitals.updatedAt,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
        })
        .from(hospitals)
        .innerJoin(users, eq(hospitals.userId, users.id))
        .where(whereClause)
        .orderBy(desc(hospitals.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(hospitals)
        .innerJoin(users, eq(hospitals.userId, users.id))
        .where(whereClause);

      const [hospitalsList, countResult] = await Promise.all([
        query,
        countQuery,
      ]);

      const totalCount = countResult[0]?.count || 0;

      return {
        hospitals: hospitalsList,
        pagination: calculatePagination(page, limit, totalCount),
      };
    } catch (error) {
      console.error("Error fetching paginated hospitals:", error);
      throw error;
    }
  }

  async getMedicines(page: number = 1, limit: number = 10, search: string = '') {
    try {
      const offset = calculateOffset(page, limit);
      const conditions = [];

      // Add search filter if provided - only search by medicine name
      const searchCondition = buildSearchConditions(search, [medicines.medicineName]);
      if (searchCondition) {
        conditions.push(searchCondition);
      }

      // Build query
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const query = db
        .select({
          id: medicines.id,
          medicineName: medicines.medicineName,
          medicineUrl: medicines.medicineUrl,
          price: medicines.price,
          discount: medicines.discount,
          stock: medicines.stock,
          images: medicines.images,
          prescriptionRequired: medicines.prescriptionRequired,
          createdAt: medicines.createdAt,
          drugCategory: medicines.drugCategory,
          drugVarient: medicines.drugVarient,
          drugDescription: medicines.drugDescription,
          faqs: medicines.faqs,
        })
        .from(medicines)
        .where(whereClause)
        .orderBy(desc(medicines.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(medicines)
        .where(whereClause);

      const [medicinesList, countResult] = await Promise.all([
        query,
        countQuery,
      ]);

      const totalCount = countResult[0]?.count || 0;

      return {
        medicines: medicinesList,
        pagination: calculatePagination(page, limit, totalCount),
      };
    } catch (error) {
      console.error("Error fetching paginated medicines:", error);
      throw error;
    }
  }

  async updateMedicine(
    medicineId: number, 
    data: any,
    newImages: Express.Multer.File[] = [],
    existingImageUrls: string[] = []
  ) {
    let uploadedImages: string[] = [];
    
    try {
      // Check if medicine exists
      const existing = await db
        .select()
        .from(medicines)
        .where(eq(medicines.id, medicineId))
        .limit(1);

      if (existing.length === 0) {
        throw new Error("Medicine not found");
      }

      // Build update data with validation
      const updateData: any = {};

      if (data.medicineName !== undefined) {
        const name = String(data.medicineName).trim();
        if (name) updateData.medicineName = name;
      }
      if (data.medicineUrl !== undefined) {
        const url = String(data.medicineUrl).trim();
        updateData.medicineUrl = url || null;
      }
      if (data.price !== undefined) {
        const priceNum = parseFloat(String(data.price));
        if (!isNaN(priceNum) && priceNum >= 0) {
          updateData.price = priceNum.toFixed(2);
        } else {
          updateData.price = null;
        }
      }
      if (data.discount !== undefined) {
        const discountNum = parseFloat(String(data.discount));
        if (!isNaN(discountNum) && discountNum >= 0 && discountNum <= 100) {
          updateData.discount = discountNum.toFixed(2);
        } else {
          updateData.discount = null;
        }
      }
      if (data.stock !== undefined) {
        const stockNum = parseInt(String(data.stock), 10);
        if (!isNaN(stockNum) && stockNum >= 0) {
          updateData.stock = stockNum;
        } else {
          updateData.stock = null;
        }
      }
      if (data.prescriptionRequired !== undefined) updateData.prescriptionRequired = Boolean(data.prescriptionRequired);
      if (data.drugDescription !== undefined) {
        const desc = String(data.drugDescription).trim();
        updateData.drugDescription = desc || null;
      }
      if (data.drugCategory !== undefined) updateData.drugCategory = data.drugCategory || null;
      if (data.drugVarient !== undefined) updateData.drugVarient = data.drugVarient || null;
      if (data.faqs !== undefined) {
        // If faqs is a string, try to parse it as JSON, otherwise use as is
        if (typeof data.faqs === 'string') {
          try {
            updateData.faqs = JSON.parse(data.faqs);
          } catch {
            updateData.faqs = null;
          }
        } else {
          updateData.faqs = data.faqs || null;
        }
      }

      // Handle image updates if files are provided or existingImages is sent
      if (newImages.length > 0 || existingImageUrls.length > 0 || data.existingImages !== undefined) {
        const currentImages = (existing[0].images as string[]) || [];

        // Use utility function to handle image updates
        const imageUpdateResult = await handleMedicineImageUpdate(
          currentImages,
          existingImageUrls,
          newImages,
          4
        );

        uploadedImages = imageUpdateResult.uploadedImages;
        updateData.images = formatImagesForDB(imageUpdateResult.finalImages);

        // Update medicine in database first
        await db
          .update(medicines)
          .set(updateData)
          .where(eq(medicines.id, medicineId));

        // Delete old images from S3 AFTER successful DB update (best-effort)
        await deleteOldImages(imageUpdateResult.imagesToDelete);
      } else {
        // No image updates, just update other fields
        await db
          .update(medicines)
          .set(updateData)
          .where(eq(medicines.id, medicineId));
      }

      // Fetch and return updated medicine
      const updated = await db
        .select()
        .from(medicines)
        .where(eq(medicines.id, medicineId))
        .limit(1);

      return updated[0];
    } catch (error) {
      console.error("Error updating medicine:", error);
      
      // Rollback: delete newly uploaded images if DB update fails
      await cleanupUploadedImages(uploadedImages);
      
      throw error;
    }
  }
}

