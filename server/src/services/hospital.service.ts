import bcrypt from "bcryptjs";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../config/database";
import { appointments } from "../schema/appointments";
import { doctors } from "../schema/doctor";
import { users } from "../schema/users";
import { hospitals } from "../schema/hospitals";
import { roles } from "../schema/roles";
import { specializations } from "../schema/specialization";
import { createError } from "../middleware/error.handler";
import { appointmentService } from "./appointment.service";

export class HospitalService {
  private async requireHospitalForUser(
    userId: string,
  ): Promise<{ id: string; hospitalName: string }> {
    const rows = await db
      .select({
        id: hospitals.id,
        hospitalName: hospitals.hospitalName,
      })
      .from(hospitals)
      .where(eq(hospitals.userId, userId))
      .limit(1);

    if (!rows.length) {
      throw createError("Hospital profile not found", 404);
    }

    return rows[0];
  }

  async getHospitalDashboardStatsByUserId(userId: string) {
    const hospital = await this.requireHospitalForUser(userId);
    const hospitalId = hospital.id;

    const statusCounts = await db
      .select({
        status: appointments.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(and(eq(doctors.hospitalId, hospitalId), eq(appointments.isActive, true)))
      .groupBy(appointments.status);

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((row) => {
      byStatus[row.status] = Number(row.count) || 0;
    });
    const totalAppointments = Object.values(byStatus).reduce((sum, v) => sum + v, 0);

    const revenueResult = await db
      .select({
        total: sql<string>`coalesce(sum(cast(${doctors.feePkr} as numeric)), 0)::text`,
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(
        and(
          eq(doctors.hospitalId, hospitalId),
          eq(appointments.isActive, true),
          eq(appointments.status, "completed"),
        ),
      );

    return {
      hospitalId,
      hospitalName: hospital.hospitalName,
      totalAppointments,
      byStatus,
      totalEarned: Number(revenueResult[0]?.total || 0),
      currency: "pkr",
    };
  }

  async getHospitalDoctorsByUserId(userId: string) {
    const hospital = await this.requireHospitalForUser(userId);
    const hospitalId = hospital.id;

    const doctorRows = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        mobile: doctors.mobile,
        gender: doctors.gender,
        specializationIds: doctors.specializationIds,
        experienceYears: doctors.experienceYears,
        feePkr: doctors.feePkr,
        consultationModes: doctors.consultationModes,
        openingTime: doctors.openingTime,
        closingTime: doctors.closingTime,
        availableDays: doctors.availableDays,
        isActive: doctors.isActive,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.hospitalId, hospitalId))
      .orderBy(desc(doctors.createdAt));

    const statsRows = await db
      .select({
        doctorId: appointments.doctorId,
        status: appointments.status,
        count: sql<number>`count(*)`,
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(and(eq(doctors.hospitalId, hospitalId), eq(appointments.isActive, true)))
      .groupBy(appointments.doctorId, appointments.status);

    const specializationRows = await db
      .select({ id: specializations.id, name: specializations.name })
      .from(specializations);
    const specMap = new Map(specializationRows.map((s) => [s.id, s.name]));

    const byDoctorStatus = new Map<string, Record<string, number>>();
    for (const row of statsRows) {
      const current = byDoctorStatus.get(row.doctorId) ?? {};
      current[row.status] = Number(row.count) || 0;
      byDoctorStatus.set(row.doctorId, current);
    }

    const doctorsWithStats = doctorRows.map((d) => {
      const byStatus = byDoctorStatus.get(d.id) ?? {};
      const totalAppointments = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
      const completedCount = byStatus.completed || 0;
      const fee = Number(d.feePkr || 0);
      const specializationIds = Array.isArray(d.specializationIds) ? (d.specializationIds as number[]) : [];
      return {
        ...d,
        specializationIds,
        specializationNames: specializationIds.map((id) => specMap.get(Number(id))).filter(Boolean),
        byStatus,
        totalAppointments,
        totalEarned: Number((completedCount * fee).toFixed(2)),
      };
    });

    const activeDoctors = doctorsWithStats.filter((d) => d.isActive).length;
    return {
      doctors: doctorsWithStats,
      stats: {
        totalDoctors: doctorsWithStats.length,
        activeDoctors,
        inactiveDoctors: doctorsWithStats.length - activeDoctors,
        totalAppointments: doctorsWithStats.reduce((sum, d) => sum + d.totalAppointments, 0),
      },
    };
  }

  async createHospitalDoctorByUserId(
    hospitalUserId: string,
    payload: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
    },
  ) {
    const hospital = await this.requireHospitalForUser(hospitalUserId);

    const firstName = String(payload.firstName || "").trim();
    const lastName = String(payload.lastName || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");

    if (!firstName || !lastName || !email || !password) {
      throw createError("firstName, lastName, email and password are required", 400);
    }

    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingUser.length) {
      throw createError("User with this email already exists", 400);
    }

    const [doctorRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, "doctor"))
      .limit(1);
    if (!doctorRole) {
      throw createError("Doctor role not found", 500);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const created = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          firstName,
          lastName,
          roleId: doctorRole.id,
          isGoogle: false,
        })
        .returning({ id: users.id });

      const [newDoctor] = await tx
        .insert(doctors)
        .values({
          userId: newUser.id,
          gender: "other",
          mobile: "",
          specializationIds: [],
          qualifications: [],
          experienceYears: 0,
          patientSatisfactionRate: "0.00",
          hospitalId: hospital.id,
          address: "",
          consultationModes: [],
          availableDays: [],
          isActive: true,
        })
        .returning({ id: doctors.id });

      return { userId: newUser.id, doctorId: newDoctor.id };
    });

    return created;
  }

  async setHospitalDoctorActiveByUserId(hospitalUserId: string, doctorId: string, isActive: boolean) {
    const hospital = await this.requireHospitalForUser(hospitalUserId);

    const doctorRow = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(and(eq(doctors.id, doctorId), eq(doctors.hospitalId, hospital.id)))
      .limit(1);

    if (!doctorRow.length) {
      throw createError("Doctor not found or not affiliated with this hospital", 404);
    }

    await db
      .update(doctors)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(doctors.id, doctorId));

    return { doctorId, isActive };
  }
async getHospitalDoctorAppointmentsByUserId(hospitalUserId: string, doctorId: string) {
    const hospital = await this.requireHospitalForUser(hospitalUserId);

    const doctorRow = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        mobile: doctors.mobile,
        feePkr: doctors.feePkr,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(eq(doctors.id, doctorId), eq(doctors.hospitalId, hospital.id)))
      .limit(1);

    if (!doctorRow.length) {
      throw createError("Doctor not found or not affiliated with this hospital", 404);
    }

    const appointmentsList = await appointmentService.getAppointmentsByDoctor(doctorId);

    return {
      doctor: doctorRow[0],
      appointments: appointmentsList,
    };
  }
}

export const hospitalService = new HospitalService();
