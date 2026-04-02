import { db } from "../config/database";
import { appointments } from "../schema/appointments";
import { doctors } from "../schema/doctor";
import { users } from "../schema/users";
import { patients } from "../schema/patient";
import { hospitals } from "../schema/hospitals";
import { orders } from "../schema/orders";
import { orderItems } from "../schema/orderItems";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { createError } from "../middleware/error.handler";
import { doctorService } from "./doctor.service";
import { alias } from "drizzle-orm/pg-core";

export class AppointmentService {
  async assertSlotAvailable(doctorId: string, appointmentDate: string, appointmentTime: string) {
    const existingAppointment = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.appointmentDate, appointmentDate),
          eq(appointments.appointmentTime, appointmentTime),
          eq(appointments.isActive, true),
          or(
            eq(appointments.status, "pending"),
            eq(appointments.status, "confirmed"),
            eq(appointments.status, "completed"),
            eq(appointments.status, "in_progress")
          )
        )
      )
      .limit(1);

    if (existingAppointment.length > 0) {
      throw createError("This time slot is already booked", 400);
    }
  }

  async getDoctorFeeAndName(doctorId: string) {
    const doctor = await db
      .select({
        feePkr: doctors.feePkr,
        doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.id, doctorId))
      .limit(1);

    if (!doctor.length) {
      throw createError("Doctor not found", 404);
    }

    const feeRaw = doctor[0].feePkr;
    const feePkr = feeRaw ? Number(feeRaw) : 0;
    if (!Number.isFinite(feePkr) || feePkr <= 0) {
      throw createError("Doctor consultation fee is not configured", 400);
    }

    return {
      feePkr,
      doctorName: doctor[0].doctorName.trim(),
    };
  }

  private generateMeetingId(consultationMode: string) {
    // Generate unique meeting ID for online appointments
    let meetingId: string | null = null;
    if (consultationMode?.toLowerCase() === "online") {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(1000 + Math.random() * 9000).toString();
      meetingId = `${timestamp}${random}`;
    }

    return meetingId;
  }

  async createAppointment(patientId: string, data: any) {
    await this.assertSlotAvailable(data.doctorId, data.appointmentDate, data.appointmentTime);

    const meetingId = this.generateMeetingId(data.consultationMode);

    const newAppointment = await db
      .insert(appointments)
      .values({
        patientId,
        doctorId: data.doctorId,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        consultationMode: data.consultationMode,
        patientNotes: data.patientNotes || null,
        meetingId: meetingId,
        status: "pending",
        paymentProvider: null,
        paymentStatus: "unpaid",
        stripeSessionId: null,
        amountPaid: null,
        currency: null,
      })
      .returning();

    return newAppointment[0];
  }

  async createAppointmentFromStripeSession(params: {
    stripeSessionId: string;
    patientId: string;
    doctorId: string;
    appointmentDate: string;
    appointmentTime: string;
    consultationMode: "inperson" | "online";
    patientNotes?: string;
    amountPaid: number;
    currency: string;
  }) {
    const existingBySession = await db
      .select()
      .from(appointments)
      .where(eq(appointments.stripeSessionId, params.stripeSessionId))
      .limit(1);

    if (existingBySession.length) {
      return existingBySession[0];
    }

    await this.assertSlotAvailable(params.doctorId, params.appointmentDate, params.appointmentTime);
    const meetingId = this.generateMeetingId(params.consultationMode);

    const created = await db
      .insert(appointments)
      .values({
        patientId: params.patientId,
        doctorId: params.doctorId,
        appointmentDate: params.appointmentDate,
        appointmentTime: params.appointmentTime,
        consultationMode: params.consultationMode,
        patientNotes: params.patientNotes || null,
        meetingId,
        status: "pending",
        paymentProvider: "stripe",
        paymentStatus: "paid",
        stripeSessionId: params.stripeSessionId,
        amountPaid: params.amountPaid.toFixed(2),
        currency: params.currency.toLowerCase(),
      })
      .returning();

    return created[0];
  }

  async getAppointmentsByPatient(patientId: string, status?: string) {
    const conditions = [eq(appointments.patientId, patientId), eq(appointments.isActive, true)];
    
    if (status) {
      conditions.push(eq(appointments.status, status));
    }

    const result = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        consultationMode: appointments.consultationMode,
        meetingId: appointments.meetingId,
        patientNotes: appointments.patientNotes,
        doctorNotes: appointments.doctorNotes,
        prescription: appointments.prescription,
        diagnosis: appointments.diagnosis,
        cancellationReason: appointments.cancellationReason,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        doctorId: doctors.id,
        doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        doctorImage: doctors.image,
        doctorSpecializations: doctors.specializationIds,
        doctorFee: doctors.feePkr,
        doctorMobile: doctors.mobile,
        hasMedicineOrder: sql<boolean>`exists(
          select 1
          from ${orderItems} oi
          inner join ${orders} o on o.id = oi.order_id
          where oi.appointment_id = ${appointments.id}
            and o.patient_id = ${appointments.patientId}
        )`,
        medicineOrderId: sql<string | null>`(
          select o.id
          from ${orderItems} oi
          inner join ${orders} o on o.id = oi.order_id
          where oi.appointment_id = ${appointments.id}
            and o.patient_id = ${appointments.patientId}
          order by o.created_at desc
          limit 1
        )`,
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));

    return result;
  }

  async getCompletedAppointmentsByPatientId(patientId: string) {
    const result = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        consultationMode: appointments.consultationMode,
        patientNotes: appointments.patientNotes,
        doctorNotes: appointments.doctorNotes,
        prescription: appointments.prescription,
        diagnosis: appointments.diagnosis,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        hospitalName: hospitals.hospitalName,
        hospitalAddress: hospitals.hospitalAddress,
        hospitalContactNo: hospitals.hospitalContactNo,
        hospitalEmail: hospitals.hospitalEmail,
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
      .where(
        and(
          eq(appointments.patientId, patientId),
          eq(appointments.status, "completed"),
          eq(appointments.isActive, true)
        )
      )
      .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));

    return result;
  }


async getAppointmentsByDoctor(doctorId: string, status?: string) {
  const conditions = [
    eq(appointments.doctorId, doctorId),
    eq(appointments.isActive, true),
  ];

  if (status) {
    conditions.push(eq(appointments.status, status));
  }

  // ✅ Aliases
  const patientUser = alias(users, "patient_user");
  const doctorUser = alias(users, "doctor_user");

  const result = await db
    .select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      appointmentTime: appointments.appointmentTime,
      status: appointments.status,
      consultationMode: appointments.consultationMode,
      meetingId: appointments.meetingId,
      patientNotes: appointments.patientNotes,
      doctorNotes: appointments.doctorNotes,
      prescription: appointments.prescription,
      diagnosis: appointments.diagnosis,
      cancellationReason: appointments.cancellationReason,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      isActive: appointments.isActive,
      patientName: sql<string>`CONCAT(${patientUser.firstName}, ' ', ${patientUser.lastName})`,
      patientEmail: patientUser.email,
      patientGender: patients.gender,
      patientMobile: patients.mobile,
      patientDateOfBirth: patients.dateOfBirth,
      patientAddress: patients.address,
      patientBloodGroup: patients.bloodGroup,
      patientHasCovid: patients.hasCovid,
      patientPastMedicalHistory: patients.pastMedicalHistory,
      patientSurgicalHistory: patients.surgicalHistory,
      patientAllergies: patients.allergies,
      doctorName: sql<string>`CONCAT(${doctorUser.firstName}, ' ', ${doctorUser.lastName})`,
      doctorSpecializations: doctors.specializationIds,
      doctorFee: doctors.feePkr,
      doctorMobile: doctors.mobile,
      doctorImage: doctors.image,
      hospitalName: hospitals.hospitalName,
      hospitalAddress: hospitals.hospitalAddress,
      hospitalContactNo: hospitals.hospitalContactNo,
      hospitalEmail: hospitals.hospitalEmail,
    })
    .from(appointments)
      .innerJoin(patientUser, eq(appointments.patientId, patientUser.id))
    .leftJoin(patients, eq(appointments.patientId, patients.userId))
    .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(doctorUser, eq(doctors.userId, doctorUser.id))
    .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
    .where(and(...conditions))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));

  return result;
}

  async getAppointmentById(appointmentId: string, userId: string) {
    const result = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        consultationMode: appointments.consultationMode,
        meetingId: appointments.meetingId,
        patientNotes: appointments.patientNotes,
        doctorNotes: appointments.doctorNotes,
        prescription: appointments.prescription,
        diagnosis: appointments.diagnosis,
        cancellationReason: appointments.cancellationReason,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
      })
      .from(appointments)
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.isActive, true),
          or(
            eq(appointments.patientId, userId),
            eq(doctors.userId, userId)
          )
        )
      )
      .limit(1);

    if (result.length === 0) {
      throw createError("Appointment not found", 404);
    }

    return result[0];
  }

  async updateAppointmentStatus(appointmentId: string, userId: string, status: string, reason?: string) {
    const appointment = await this.getAppointmentById(appointmentId, userId);
    const previousStatus = appointment.status;

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (reason && (status === "cancelled")) {
      updateData.cancellationReason = reason;
    }

    await db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, appointmentId));

    const updatedAppointment = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        status: appointments.status,
        meetingId: appointments.meetingId,
        consultationMode: appointments.consultationMode,
      })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (updatedAppointment.length > 0 && updatedAppointment[0].patientId) {
      const apt = updatedAppointment[0];
      
      if (status === 'in_progress') {
        try {
          const { activeAppointments } = await import('../config/sse');
          if (!activeAppointments.has(apt.id)) {
            activeAppointments.set(apt.id, {
              previousStatus: previousStatus || 'pending',
              doctorId: userId,
            });
          }
        } catch (error) {
        }
      }
      
      if (status !== 'in_progress' && previousStatus === 'in_progress') {
        try {
          const { activeAppointments } = await import('../config/sse');
          const appointmentInfo = activeAppointments.get(apt.id);
          if (appointmentInfo && appointmentInfo.doctorId === userId) {
            activeAppointments.delete(apt.id);
          }
        } catch (error) {
        }
      }
      
      try {
        const { sendSSEToPatient } = await import('../config/sse');
        
        sendSSEToPatient(apt.patientId, {
          appointmentId: apt.id,
          status: apt.status,
          meetingId: apt.meetingId,
          consultationMode: apt.consultationMode,
        });
      } catch (error) {
      }
    }

    return { success: true, status };
  }

  async updateAppointmentNotes(appointmentId: string, doctorId: string, data: any) {
    const appointment = await db
      .select()
      .from(appointments)
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.isActive, true),
          eq(doctors.userId, doctorId)
        )
      )
      .limit(1);

    if (appointment.length === 0) {
      throw createError("Appointment not found or unauthorized", 404);
    }

    const updateData: any = { updatedAt: new Date() };

    if (data.doctorNotes !== undefined) updateData.doctorNotes = data.doctorNotes;
    if (data.prescription !== undefined) updateData.prescription = data.prescription;
    if (data.diagnosis !== undefined) updateData.diagnosis = data.diagnosis;

    await db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, appointmentId));

    return { success: true };
  }

  async deleteAppointment(appointmentId: string, userId: string) {
    const appointment = await this.getAppointmentById(appointmentId, userId);

    await db
      .update(appointments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId));

    return { success: true };
  }

  async getBookedSlots(doctorId: string, date: string) {
    const bookedAppointments = await db
      .select({
        appointmentTime: appointments.appointmentTime,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.appointmentDate, date),
          eq(appointments.isActive, true),
          sql`${appointments.status} NOT IN ('cancelled', 'rejected')`
        )
      )
      .orderBy(appointments.appointmentTime);

    return bookedAppointments.map(apt => apt.appointmentTime);
  }

  async getAppointmentStats(doctorId: string) {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // Get total appointments count for the current month
    const monthlyCount = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.isActive, true),
          sql`${appointments.appointmentDate} >= ${oneMonthAgo.toISOString().split('T')[0]}`,
          sql`${appointments.appointmentDate} <= ${now.toISOString().split('T')[0]}`
        )
      );

    // Get appointments count by status for the current month
    const statusCounts = await db
      .select({
        status: appointments.status,
        count: sql<number>`COUNT(*)`
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.isActive, true),
          sql`${appointments.appointmentDate} >= ${oneMonthAgo.toISOString().split('T')[0]}`,
          sql`${appointments.appointmentDate} <= ${now.toISOString().split('T')[0]}`
        )
      )
      .groupBy(appointments.status);

    return {
      monthlyTotal: monthlyCount[0]?.count || 0,
      statusBreakdown: statusCounts
    };
  }

  async getYearlyAppointmentStats(doctorId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    // Get appointments count grouped by month
    const monthlyData = await db
      .select({
        month: sql<number>`EXTRACT(MONTH FROM ${appointments.appointmentDate})`,
        count: sql<number>`COUNT(*)`
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.isActive, true),
          sql`${appointments.appointmentDate} >= ${yearStart}`,
          sql`${appointments.appointmentDate} <= ${yearEnd}`
        )
      )
      .groupBy(sql`EXTRACT(MONTH FROM ${appointments.appointmentDate})`)
      .orderBy(sql`EXTRACT(MONTH FROM ${appointments.appointmentDate})`);

    // Add status breakdown for the year
    const statusCounts = await db
      .select({
        status: appointments.status,
        count: sql<number>`COUNT(*)`
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.isActive, true),
          sql`${appointments.appointmentDate} >= ${yearStart}`,
          sql`${appointments.appointmentDate} <= ${yearEnd}`
        )
      )
      .groupBy(appointments.status);

    // Status breakdown per month
    const monthlyStatusCounts = await db
      .select({
        month: sql<number>`EXTRACT(MONTH FROM ${appointments.appointmentDate})`,
        status: appointments.status,
        count: sql<number>`COUNT(*)`
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.isActive, true),
          sql`${appointments.appointmentDate} >= ${yearStart}`,
          sql`${appointments.appointmentDate} <= ${yearEnd}`
        )
      )
      .groupBy(sql`EXTRACT(MONTH FROM ${appointments.appointmentDate})`, appointments.status);

    // Create array with all 12 months, filling missing months with 0
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const monthly = monthNames.map((month, index) => {
      const monthNumber = index + 1;
      // Fix: ensure both sides are numbers
      const monthData = monthlyData.find(data => Number(data.month) === monthNumber);
      // Status breakdown for this month
      const statusBreakdown = monthlyStatusCounts
        .filter((s) => Number(s.month) === monthNumber)
        .map((s) => ({ status: s.status, count: Number(s.count) }));
      return {
        month,
        total: Number(monthData?.count) || 0,
        statusBreakdown
      };
    });

    return {
      year: currentYear,
      yearly: {
        total: monthly.reduce((sum, m) => sum + m.total, 0),
        statusBreakdown: statusCounts.map(s => ({ status: s.status, count: Number(s.count) }))
      },
      monthly
    };
  }

  // New methods that accept userId instead of doctorId
  async getAppointmentsByDoctorUserId(userId: string, status?: string) {
    const doctor = await doctorService.getDoctorByUserId(userId);
    return this.getAppointmentsByDoctor(doctor.id, status);
  }

  async getAppointmentStatsByUserId(userId: string) {
    const doctor = await doctorService.getDoctorByUserId(userId);
    return this.getAppointmentStats(doctor.id);
  }

  async getYearlyAppointmentStatsByUserId(userId: string, year?: number) {
    const doctor = await doctorService.getDoctorByUserId(userId);
    return this.getYearlyAppointmentStats(doctor.id, year);
  }

  async getDoctorDashboardStatsByUserId(userId: string) {
    const doctor = await doctorService.getDoctorByUserId(userId);

    const statusCounts = await db
      .select({
        status: appointments.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(appointments)
      .where(and(eq(appointments.doctorId, doctor.id), eq(appointments.isActive, true)))
      .groupBy(appointments.status);

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((row) => {
      byStatus[row.status] = Number(row.count) || 0;
    });

    const totalAppointments = Object.values(byStatus).reduce((sum, v) => sum + v, 0);
    const completedCount = byStatus.completed || 0;
    const doctorFee = doctor.feePkr ? Number(doctor.feePkr) : 0;
    const isHospitalAffiliated = !!doctor.hospitalId;
    const totalEarned = isHospitalAffiliated ? 0 : Number((completedCount * doctorFee).toFixed(2));

    return {
      totalAppointments,
      byStatus,
      totalEarned,
      currency: "pkr",
      isHospitalAffiliated,
      doctorId: doctor.id,
      hospitalId: doctor.hospitalId || null,
    };
  }

  async getHospitalDashboardStatsByUserId(userId: string) {
    const hospital = await db
      .select({
        id: hospitals.id,
        hospitalName: hospitals.hospitalName,
      })
      .from(hospitals)
      .where(eq(hospitals.userId, userId))
      .limit(1);

    if (!hospital.length) {
      throw createError("Hospital profile not found", 404);
    }

    const hospitalId = hospital[0].id;

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

    // Hospital revenue = completed appointments fee totals for affiliated doctors.
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
          eq(appointments.status, "completed")
        )
      );

    return {
      hospitalId,
      hospitalName: hospital[0].hospitalName,
      totalAppointments,
      byStatus,
      totalEarned: Number(revenueResult[0]?.total || 0),
      currency: "pkr",
    };
  }

  async getPrescriptionByAppointmentId(appointmentId: string) {
    const appointment = await db
      .select({ prescription: appointments.prescription })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);
    return appointment.length > 0 ? appointment[0].prescription || [] : [];
  }
}

export const appointmentService = new AppointmentService();

