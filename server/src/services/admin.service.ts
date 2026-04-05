import { db } from "../config/database";
import { users } from "../schema/users";
import { medicines } from "../schema/medicine";
import { specializations } from "../schema/specialization";
import { doctors } from "../schema/doctor";
import { hospitals } from "../schema/hospitals";
import { appointments } from "../schema/appointments";
import { orders } from "../schema/orders";
import { roles } from "../schema/roles";
import { eq, sql, count, and, desc, asc } from "drizzle-orm";
import { calculatePagination, calculateOffset } from "./utils/pagination.utils";
import { buildSearchConditions } from "./utils/search.utils";

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

  async getAllSpecializations() {
    return db
      .select({
        id: specializations.id,
        name: specializations.name,
      })
      .from(specializations)
      .orderBy(asc(specializations.name));
  }

}

