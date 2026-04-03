import { db } from "../config/database";
import { users } from "../schema/users";
import { medicines } from "../schema/medicine";
import { drugCategories } from "../schema/drugCategories";
import { drugCategorySpecializationMapping } from "../schema/drugCategorySpecializationMapping";
import { specializations } from "../schema/specialization";
import { doctors } from "../schema/doctor";
import { hospitals } from "../schema/hospitals";
import { appointments } from "../schema/appointments";
import { orders } from "../schema/orders";
import { roles } from "../schema/roles";
import { eq, sql, count, and, or, ilike, desc, ne, asc, inArray } from "drizzle-orm";
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
  async getMonthlyRevenueByYear(year?: number) {
    const currentYear = new Date().getFullYear();
    const targetYear = Number.isFinite(year) ? Number(year) : currentYear;

    const rows = await db
      .select({
        month: sql<number>`extract(month from ${orders.createdAt})::int`,
        revenue: sql<string>`coalesce(sum(${orders.total})::text, '0')`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.paymentStatus, "paid"),
          sql`extract(year from ${orders.createdAt})::int = ${targetYear}`
        )
      )
      .groupBy(sql`extract(month from ${orders.createdAt})`)
      .orderBy(sql`extract(month from ${orders.createdAt})`);

    const monthlyMap = new Map<number, number>();
    rows.forEach((row) => {
      monthlyMap.set(Number(row.month), Number(row.revenue || 0));
    });

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueByMonth = months.map((label, index) => {
      const month = index + 1;
      return {
        month,
        label,
        revenue: Number((monthlyMap.get(month) || 0).toFixed(2)),
      };
    });

    return {
      year: targetYear,
      currency: "PKR",
      revenueByMonth,
      totalRevenue: Number(
        revenueByMonth.reduce((sum, item) => sum + Number(item.revenue || 0), 0).toFixed(2)
      ),
    };
  }

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

      // Orders and paid revenue for admin dashboard
      const totalOrders = await db.select({ count: count() }).from(orders);
      const ordersByStatus = await db
        .select({
          status: orders.status,
          count: sql<number>`count(${orders.id})::int`,
        })
        .from(orders)
        .groupBy(orders.status);
      const ordersByStatusMap: Record<string, number> = {};
      ordersByStatus.forEach((item) => {
        ordersByStatusMap[item.status] = item.count;
      });

      const paidRevenue = await db
        .select({
          total: sql<string>`coalesce(sum(${orders.total})::text, '0')`,
        })
        .from(orders)
        .where(eq(orders.paymentStatus, "paid"));

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
        orders: {
          total: totalOrders[0]?.count || 0,
          byStatus: ordersByStatusMap,
          paidRevenue: paidRevenue[0]?.total || "0",
        },
      };
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      throw error;
    }
  }

  async getOrders(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = calculateOffset(page, limit);

    const conditions: any[] = [];

    if (params.search?.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(users.firstName, term),
          ilike(users.lastName, term),
          ilike(users.email, term),
          ilike(sql`cast(${orders.id} as text)`, term)
        )
      );
    }

    if (params.status?.trim()) {
      const requested = params.status.trim();
      if (requested === "pending") {
        // Backward compatibility for old rows saved as "placed"
        conditions.push(or(eq(orders.status, "pending"), eq(orders.status, "placed")));
      } else {
        conditions.push(eq(orders.status, requested));
      }
    }

    if (params.dateFrom) {
      conditions.push(sql`${orders.createdAt} >= ${params.dateFrom}::timestamp`);
    }
    if (params.dateTo) {
      conditions.push(sql`${orders.createdAt} <= (${params.dateTo}::date + interval '1 day')`);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const query = db
      .select({
        id: orders.id,
        patientId: orders.patientId,
        patientName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        patientEmail: users.email,
        status: sql<string>`case when ${orders.status} = 'placed' then 'pending' else ${orders.status} end`,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        subtotal: orders.subtotal,
        total: orders.total,
        currency: orders.currency,
        shippingAddress: orders.shippingAddress,
        contactNo: orders.contactNo,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .innerJoin(users, eq(orders.patientId, users.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .innerJoin(users, eq(orders.patientId, users.id))
      .where(whereClause);

    const [ordersList, countResult] = await Promise.all([query, countQuery]);
    const totalCount = countResult[0]?.count || 0;

    return {
      orders: ordersList,
      pagination: calculatePagination(page, limit, totalCount),
    };
  }

  async updateOrderStatus(orderId: string, status: "pending" | "shipped" | "delivered" | "returned") {
    const updated = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updated.length) {
      throw new Error("Order not found");
    }
    return updated[0];
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
          drugCategoryId: medicines.drugCategoryId,
          drugCategory: drugCategories.name,
          drugVarient: medicines.drugVarient,
          drugDescription: medicines.drugDescription,
          faqs: medicines.faqs,
        })
        .from(medicines)
        .leftJoin(drugCategories, eq(medicines.drugCategoryId, drugCategories.id))
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
      if (data.drugCategoryId !== undefined) {
        const raw = data.drugCategoryId;
        if (raw === null || raw === "" || raw === undefined) {
          updateData.drugCategoryId = null;
        } else {
          const n = parseInt(String(raw), 10);
          if (!isNaN(n) && n > 0) {
            updateData.drugCategoryId = n;
          }
        }
      }
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

      const updated = await db
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
          drugCategoryId: medicines.drugCategoryId,
          drugCategory: drugCategories.name,
          drugVarient: medicines.drugVarient,
          drugDescription: medicines.drugDescription,
          faqs: medicines.faqs,
        })
        .from(medicines)
        .leftJoin(drugCategories, eq(medicines.drugCategoryId, drugCategories.id))
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

  async getDrugCategories(page: number = 1, limit: number = 10, search: string = "") {
    try {
      const offset = calculateOffset(page, limit);
      const conditions = [];
      const searchCondition = buildSearchConditions(search, [drugCategories.name]);
      if (searchCondition) {
        conditions.push(searchCondition);
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const query = db
        .select({
          id: drugCategories.id,
          name: drugCategories.name,
        })
        .from(drugCategories)
        .where(whereClause)
        .orderBy(asc(drugCategories.name))
        .limit(limit)
        .offset(offset);

      const countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(drugCategories)
        .where(whereClause);

      const [rows, countResult] = await Promise.all([query, countQuery]);
      const totalCount = countResult[0]?.count ?? 0;

      return {
        categories: rows,
        pagination: calculatePagination(page, limit, totalCount),
      };
    } catch (error) {
      console.error("Error fetching drug categories:", error);
      throw error;
    }
  }

  async createDrugCategory(name: string) {
    const trimmed = String(name ?? "").trim();
    if (!trimmed) {
      throw new Error("Category name is required");
    }
    if (trimmed.length > 200) {
      throw new Error("Category name must be at most 200 characters");
    }

    const [dup] = await db
      .select({ id: drugCategories.id })
      .from(drugCategories)
      .where(eq(drugCategories.name, trimmed))
      .limit(1);
    if (dup) {
      throw new Error("A category with this name already exists");
    }

    const [inserted] = await db
      .insert(drugCategories)
      .values({ name: trimmed })
      .returning({
        id: drugCategories.id,
        name: drugCategories.name,
      });
    return inserted;
  }

  async updateDrugCategory(id: number, name: string) {
    if (!Number.isFinite(id) || id < 1) {
      throw new Error("Invalid category id");
    }
    const trimmed = String(name ?? "").trim();
    if (!trimmed) {
      throw new Error("Category name is required");
    }
    if (trimmed.length > 200) {
      throw new Error("Category name must be at most 200 characters");
    }

    const [existing] = await db
      .select({ id: drugCategories.id })
      .from(drugCategories)
      .where(eq(drugCategories.id, id))
      .limit(1);
    if (!existing) {
      throw new Error("Category not found");
    }

    const [conflict] = await db
      .select({ id: drugCategories.id })
      .from(drugCategories)
      .where(and(eq(drugCategories.name, trimmed), ne(drugCategories.id, id)))
      .limit(1);
    if (conflict) {
      throw new Error("A category with this name already exists");
    }

    const [updated] = await db
      .update(drugCategories)
      .set({ name: trimmed })
      .where(eq(drugCategories.id, id))
      .returning({
        id: drugCategories.id,
        name: drugCategories.name,
      });
    return updated;
  }

  async deleteDrugCategory(id: number) {
    if (!Number.isFinite(id) || id < 1) {
      throw new Error("Invalid category id");
    }

    const [existing] = await db
      .select({ id: drugCategories.id })
      .from(drugCategories)
      .where(eq(drugCategories.id, id))
      .limit(1);
    if (!existing) {
      throw new Error("Category not found");
    }

    await db.delete(drugCategories).where(eq(drugCategories.id, id));
    return { id };
  }

  async getAllSpecializations() {
    return db
      .select({
        id: specializations.id,
        name: specializations.name,
      })
      .from(specializations)
      .orderBy(asc(specializations.name));
  }

  async getDrugCategoryMappings(drugCategoryId: number) {
    if (!Number.isFinite(drugCategoryId) || drugCategoryId < 1) {
      throw new Error("Invalid category id");
    }
    const [cat] = await db
      .select({ id: drugCategories.id })
      .from(drugCategories)
      .where(eq(drugCategories.id, drugCategoryId))
      .limit(1);
    if (!cat) {
      throw new Error("Category not found");
    }
    const rows = await db
      .select({ specializationId: drugCategorySpecializationMapping.specializationId })
      .from(drugCategorySpecializationMapping)
      .where(eq(drugCategorySpecializationMapping.drugCategoryId, drugCategoryId));
    return {
      specializationIds: rows.map((r) => r.specializationId),
    };
  }

  async setDrugCategoryMappings(drugCategoryId: number, specializationIds: unknown) {
    if (!Number.isFinite(drugCategoryId) || drugCategoryId < 1) {
      throw new Error("Invalid category id");
    }
    const [cat] = await db
      .select({ id: drugCategories.id })
      .from(drugCategories)
      .where(eq(drugCategories.id, drugCategoryId))
      .limit(1);
    if (!cat) {
      throw new Error("Category not found");
    }

    const raw = Array.isArray(specializationIds) ? specializationIds : [];
    const unique = [
      ...new Set(
        raw
          .map((x) => parseInt(String(x), 10))
          .filter((n) => Number.isFinite(n) && n > 0)
      ),
    ];

    if (unique.length > 0) {
      const found = await db
        .select({ id: specializations.id })
        .from(specializations)
        .where(inArray(specializations.id, unique));
      if (found.length !== unique.length) {
        throw new Error("Invalid specialization id");
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(drugCategorySpecializationMapping)
        .where(eq(drugCategorySpecializationMapping.drugCategoryId, drugCategoryId));
      if (unique.length > 0) {
        await tx.insert(drugCategorySpecializationMapping).values(
          unique.map((specializationId) => ({
            drugCategoryId,
            specializationId,
          }))
        );
      }
    });

    return { drugCategoryId, specializationIds: unique };
  }
}

