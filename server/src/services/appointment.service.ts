import { db } from "../config/database";
import { appointments } from "../schema/appointments";
import { doctors } from "../schema/doctor";
import { users } from "../schema/users";
import { patients } from "../schema/patient";
import { hospitals } from "../schema/hospitals";
import { doctorPracticeAffiliations } from "../schema/doctorPracticeAffiliations";
import { orders } from "../schema/orders";
import { orderItems } from "../schema/orderItems";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { createError } from "../middleware/error.handler";
import { doctorService } from "./doctor.service";
import { practiceAffiliationService } from "./practiceAffiliation.service";
import { alias } from "drizzle-orm/pg-core";

import { hmToMinutes } from "../utils/whatsappBookingSlots.util";
import {
  canModifyAppointmentByCalendarDayRule,
  getWhatsAppClinicTimeZone,
  isAppointmentUpcoming,
  normalizeHm,
} from "../utils/clinicTime.util";

export class AppointmentService {
  async getPatientBookedIntervalsForDate(
    patientId: string,
    appointmentDate: string,
    excludeAppointmentId?: string
  ): Promise<{ startMin: number; endMin: number }[]> {
    const rows = await db
      .select({
        id: appointments.id,
        appointmentTime: appointments.appointmentTime,
        durationMinutes: appointments.durationMinutes,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, patientId),
          eq(appointments.appointmentDate, appointmentDate),
          eq(appointments.isActive, true),
          sql`${appointments.status} NOT IN ('cancelled', 'rejected')`
        )
      );

    const out: { startMin: number; endMin: number }[] = [];
    for (const row of rows) {
      if (excludeAppointmentId && row.id === excludeAppointmentId) continue;
      const start = hmToMinutes(normalizeHm(row.appointmentTime));
      if (start == null) continue;
      const dur = row.durationMinutes != null ? Number(row.durationMinutes) : 30;
      const safeDur = Number.isFinite(dur) && dur > 0 ? dur : 30;
      out.push({ startMin: start, endMin: start + safeDur });
    }
    return out;
  }

  async getBookedIntervalsForDate(
    doctorId: string,
    appointmentDate: string,
    excludeAppointmentId?: string
  ): Promise<{ startMin: number; endMin: number }[]> {
    const rows = await db
      .select({
        id: appointments.id,
        appointmentTime: appointments.appointmentTime,
        durationMinutes: appointments.durationMinutes,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.appointmentDate, appointmentDate),
          eq(appointments.isActive, true),
          sql`${appointments.status} NOT IN ('cancelled', 'rejected')`
        )
      );

    const out: { startMin: number; endMin: number }[] = [];
    for (const row of rows) {
      if (excludeAppointmentId && row.id === excludeAppointmentId) continue;
      const start = hmToMinutes(normalizeHm(row.appointmentTime));
      if (start == null) continue;
      const dur = row.durationMinutes != null ? Number(row.durationMinutes) : 30;
      const safeDur = Number.isFinite(dur) && dur > 0 ? dur : 30;
      out.push({ startMin: start, endMin: start + safeDur });
    }
    return out;
  }

  async assertSlotAvailable(
    doctorId: string,
    appointmentDate: string,
    appointmentTime: string,
    opts?: { durationMinutes?: number; excludeAppointmentId?: string }
  ) {
    const duration = opts?.durationMinutes ?? 30;
    const start = hmToMinutes(normalizeHm(appointmentTime));
    if (start == null) {
      throw createError("Invalid appointment time", 400);
    }
    const end = start + duration;
    const intervals = await this.getBookedIntervalsForDate(
      doctorId,
      appointmentDate,
      opts?.excludeAppointmentId
    );
    const { intervalsOverlap } = await import("../utils/whatsappBookingSlots.util");
    const clash = intervals.some((b) => intervalsOverlap(start, end, b.startMin, b.endMin));
    if (clash) {
      throw createError("This time slot is already booked", 400);
    }
  }

  async assertPatientSlotAvailable(
    patientId: string,
    appointmentDate: string,
    appointmentTime: string,
    opts?: { durationMinutes?: number; excludeAppointmentId?: string }
  ) {
    const duration = opts?.durationMinutes ?? 30;
    const start = hmToMinutes(normalizeHm(appointmentTime));
    if (start == null) {
      throw createError("Invalid appointment time", 400);
    }
    const end = start + duration;
    const intervals = await this.getPatientBookedIntervalsForDate(
      patientId,
      appointmentDate,
      opts?.excludeAppointmentId
    );
    const { intervalsOverlap } = await import("../utils/whatsappBookingSlots.util");
    const clash = intervals.some((b) => intervalsOverlap(start, end, b.startMin, b.endMin));
    if (clash) {
      throw createError("You already have another appointment at this time", 400);
    }
  }

  async getDoctorFeeAndName(doctorId: string, practiceAffiliationId?: string | null) {
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

    const feePkr = await practiceAffiliationService.getFeePkrForBooking(
      doctorId,
      practiceAffiliationId ?? null
    );
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
    const durationMinutes =
      data.durationMinutes != null && Number.isFinite(Number(data.durationMinutes)) && Number(data.durationMinutes) > 0
        ? Math.floor(Number(data.durationMinutes))
        : 30;

    const { practiceAffiliationId } = await practiceAffiliationService.assertAffiliationAllowsBooking({
      doctorId: data.doctorId,
      practiceAffiliationId: data.practiceAffiliationId,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      durationMinutes,
    });

    await this.assertSlotAvailable(data.doctorId, data.appointmentDate, data.appointmentTime, {
      durationMinutes,
    });
    await this.assertPatientSlotAvailable(patientId, data.appointmentDate, data.appointmentTime, {
      durationMinutes,
    });

    const meetingId = this.generateMeetingId(data.consultationMode);

    const newAppointment = await db
      .insert(appointments)
      .values({
        patientId,
        doctorId: data.doctorId,
        practiceAffiliationId: practiceAffiliationId ?? null,
        doctorServiceId: data.doctorServiceId ?? null,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        durationMinutes,
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

  async markAppointmentPaidFromStripeSession(params: {
    appointmentId: string;
    stripeSessionId: string;
    amountPaid: number;
    currency: string;
  }) {
    const row = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, params.appointmentId))
      .limit(1);

    if (!row.length) {
      throw createError("Appointment not found", 404);
    }

    const apt = row[0];
    if (apt.stripeSessionId && apt.stripeSessionId !== params.stripeSessionId) {
      throw createError("Appointment already linked to a different payment", 400);
    }

    const updated = await db
      .update(appointments)
      .set({
        paymentProvider: "stripe",
        paymentStatus: "paid",
        stripeSessionId: params.stripeSessionId,
        amountPaid: params.amountPaid.toFixed(2),
        currency: params.currency.toLowerCase(),
        status: "confirmed",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(appointments.id, params.appointmentId),
          eq(appointments.isActive, true)
        )
      )
      .returning();

    if (!updated.length) {
      throw createError("Failed to update appointment payment", 500);
    }

    return updated[0];
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
    durationMinutes?: number;
  }) {
    const existingBySession = await db
      .select()
      .from(appointments)
      .where(eq(appointments.stripeSessionId, params.stripeSessionId))
      .limit(1);

    if (existingBySession.length) {
      return existingBySession[0];
    }

    const durationMinutes =
      params.durationMinutes != null &&
      Number.isFinite(Number(params.durationMinutes)) &&
      Number(params.durationMinutes) > 0
        ? Math.floor(Number(params.durationMinutes))
        : 30;

    await this.assertSlotAvailable(params.doctorId, params.appointmentDate, params.appointmentTime, {
      durationMinutes,
    });
    await this.assertPatientSlotAvailable(params.patientId, params.appointmentDate, params.appointmentTime, {
      durationMinutes,
    });
    const meetingId = this.generateMeetingId(params.consultationMode);

    const created = await db
      .insert(appointments)
      .values({
        patientId: params.patientId,
        doctorId: params.doctorId,
        appointmentDate: params.appointmentDate,
        appointmentTime: params.appointmentTime,
        durationMinutes,
        consultationMode: params.consultationMode,
        patientNotes: params.patientNotes || null,
        meetingId,
        status: "confirmed",
        paymentProvider: "stripe",
        paymentStatus: "paid",
        stripeSessionId: params.stripeSessionId,
        amountPaid: params.amountPaid.toFixed(2),
        currency: params.currency.toLowerCase(),
      })
      .returning();

    return created[0];
  }

  async markAppointmentPaidFromSafepay(params: {
    appointmentId: string;
    paymentSessionId: string;
    amountPaid?: number;
    currency?: string;
  }) {
    const row = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, params.appointmentId))
      .limit(1);
    if (!row.length) {
      throw createError("Appointment not found", 404);
    }

    const apt = row[0];
    if (apt.paymentStatus === "paid") {
      return apt;
    }

    const updated = await db
      .update(appointments)
      .set({
        paymentProvider: "sfpy",
        paymentStatus: "paid",
        stripeSessionId: params.paymentSessionId,
        amountPaid: Number.isFinite(params.amountPaid) ? Number(params.amountPaid).toFixed(2) : apt.amountPaid,
        currency: (params.currency || apt.currency || "pkr").toLowerCase(),
        status: "confirmed",
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, params.appointmentId))
      .returning();

    return updated[0];
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
      .leftJoin(
        doctorPracticeAffiliations,
        eq(appointments.practiceAffiliationId, doctorPracticeAffiliations.id),
      )
      .leftJoin(hospitals, eq(doctorPracticeAffiliations.hospitalId, hospitals.id))
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
      paymentStatus: appointments.paymentStatus,
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
    .leftJoin(
      doctorPracticeAffiliations,
      eq(appointments.practiceAffiliationId, doctorPracticeAffiliations.id),
    )
    .leftJoin(hospitals, eq(doctorPracticeAffiliations.hospitalId, hospitals.id))
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
    const activeHospitalAffiliations = await db
      .select({ hospitalId: doctorPracticeAffiliations.hospitalId })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.doctorId, doctor.id),
          eq(doctorPracticeAffiliations.kind, "hospital"),
          eq(doctorPracticeAffiliations.status, "active"),
        ),
      )
      .limit(1);

    const hospitalId = activeHospitalAffiliations[0]?.hospitalId ?? null;
    const isHospitalAffiliated = Boolean(hospitalId);
    const totalEarned = isHospitalAffiliated ? 0 : Number((completedCount * doctorFee).toFixed(2));

    return {
      totalAppointments,
      byStatus,
      totalEarned,
      currency: "pkr",
      isHospitalAffiliated,
      doctorId: doctor.id,
      hospitalId,
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
      .innerJoin(
        doctorPracticeAffiliations,
        eq(appointments.practiceAffiliationId, doctorPracticeAffiliations.id),
      )
      .where(
        and(
          eq(doctorPracticeAffiliations.hospitalId, hospitalId),
          eq(appointments.isActive, true),
        ),
      )
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
      .innerJoin(
        doctorPracticeAffiliations,
        eq(appointments.practiceAffiliationId, doctorPracticeAffiliations.id),
      )
      .where(
        and(
          eq(doctorPracticeAffiliations.hospitalId, hospitalId),
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

  async hasUnpaidUpcomingAppointmentForPatientDoctor(params: {
    patientUserId: string;
    doctorId?: string | null;
    timeZone: string;
  }): Promise<boolean> {
    const conditions = [
      eq(appointments.patientId, params.patientUserId),
      eq(appointments.isActive, true),
      eq(appointments.paymentStatus, "unpaid"),
      sql`${appointments.status} NOT IN ('cancelled', 'rejected')`,
    ];
    if (params.doctorId) {
      conditions.push(eq(appointments.doctorId, params.doctorId));
    }

    const rows = await db
      .select({
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
      })
      .from(appointments)
      .where(and(...conditions));

    for (const r of rows) {
      const raw = r.appointmentDate as unknown;
      const ymd =
        raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw).slice(0, 10);
      if (isAppointmentUpcoming(ymd, r.appointmentTime, params.timeZone)) {
        return true;
      }
    }
    return false;
  }

  async listUpcomingForWhatsAppPatient(params: {
    patientUserId: string;
    doctorIdFilter?: string | null;
    allowedDoctorIds?: string[] | null;
    allowedPracticeAffiliationIds?: string[] | null;
    scopeMode?: "doctor_private" | "hospital" | null;
    scopeDoctorId?: string | null;
    scopeHospitalId?: string | null;
  }) {
    const tz = getWhatsAppClinicTimeZone();
    const conditions = [
      eq(appointments.patientId, params.patientUserId),
      eq(appointments.isActive, true),
      sql`${appointments.status} NOT IN ('cancelled', 'rejected', 'completed')`,
    ];
    const allowed =
      params.allowedDoctorIds && params.allowedDoctorIds.length
        ? params.allowedDoctorIds
        : params.doctorIdFilter
          ? [params.doctorIdFilter]
          : null;
    if (allowed?.length) {
      conditions.push(inArray(appointments.doctorId, allowed));
    }
    const allowedAffiliations =
      params.allowedPracticeAffiliationIds && params.allowedPracticeAffiliationIds.length
        ? [...new Set(params.allowedPracticeAffiliationIds.map((x) => String(x).trim()).filter(Boolean))]
        : null;
    if (allowedAffiliations?.length) {
      conditions.push(inArray(appointments.practiceAffiliationId, allowedAffiliations));
    }
    if (params.scopeMode === "doctor_private") {
      if (params.scopeDoctorId) {
        conditions.push(eq(doctorPracticeAffiliations.doctorId, params.scopeDoctorId));
      }
      conditions.push(eq(doctorPracticeAffiliations.kind, "private"));
    } else if (params.scopeMode === "hospital") {
      conditions.push(eq(doctorPracticeAffiliations.kind, "hospital"));
      if (params.scopeHospitalId) {
        conditions.push(eq(doctorPracticeAffiliations.hospitalId, params.scopeHospitalId));
      }
    }

    const rows = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        consultationMode: appointments.consultationMode,
        paymentStatus: appointments.paymentStatus,
        doctorId: appointments.doctorId,
        doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        patientNotes: appointments.patientNotes,
        durationMinutes: appointments.durationMinutes,
      })
      .from(appointments)
      .innerJoin(
        doctorPracticeAffiliations,
        eq(appointments.practiceAffiliationId, doctorPracticeAffiliations.id)
      )
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));

    return rows.filter((r) =>
      isAppointmentUpcoming(String(r.appointmentDate), r.appointmentTime, tz)
    );
  }

  async rescheduleAppointmentForWhatsAppPatient(params: {
    patientUserId: string;
    appointmentId: string;
    newDate: string;
    newTime: string;
    durationMinutes?: number;
  }) {
    const tz = getWhatsAppClinicTimeZone();
    const row = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, params.appointmentId),
          eq(appointments.patientId, params.patientUserId),
          eq(appointments.isActive, true)
        )
      )
      .limit(1);

    if (!row.length) {
      throw createError("Appointment not found", 404);
    }

    const apt = row[0];
    if (apt.status === "cancelled" || apt.status === "rejected") {
      throw createError("This appointment cannot be rescheduled", 400);
    }

    if (apt.status === "completed") {
      throw createError("This appointment is already completed. Book a new appointment if you need another visit.", 400);
    }

    if (!canModifyAppointmentByCalendarDayRule(String(apt.appointmentDate), tz)) {
      throw createError(
        "Rescheduling via WhatsApp is only allowed when your appointment is more than one full day away. Please call the clinic for shorter notice.",
        400
      );
    }

    const dur =
      params.durationMinutes != null &&
      Number.isFinite(Number(params.durationMinutes)) &&
      Number(params.durationMinutes) > 0
        ? Math.floor(Number(params.durationMinutes))
        : apt.durationMinutes != null && Number(apt.durationMinutes) > 0
          ? Number(apt.durationMinutes)
          : 30;

    const newHm = normalizeHm(params.newTime);

    await practiceAffiliationService.assertAffiliationAllowsBooking({
      doctorId: apt.doctorId,
      practiceAffiliationId: apt.practiceAffiliationId ?? null,
      appointmentDate: params.newDate,
      appointmentTime: newHm,
      durationMinutes: dur,
    });

    await this.assertSlotAvailable(apt.doctorId, params.newDate, newHm, {
      durationMinutes: dur,
      excludeAppointmentId: apt.id,
    });
    await this.assertPatientSlotAvailable(params.patientUserId, params.newDate, newHm, {
      durationMinutes: dur,
      excludeAppointmentId: apt.id,
    });
    const meetingId = this.generateMeetingId(apt.consultationMode);

    await db
      .update(appointments)
      .set({
        appointmentDate: params.newDate,
        appointmentTime: newHm,
        durationMinutes: dur,
        meetingId: apt.consultationMode?.toLowerCase() === "online" ? meetingId : apt.meetingId,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, apt.id));

    return { id: apt.id, appointmentDate: params.newDate, appointmentTime: newHm };
  }

  async cancelAppointmentForWhatsAppPatient(params: {
    patientUserId: string;
    appointmentId: string;
    reason?: string;
  }) {
    const tz = getWhatsAppClinicTimeZone();
    const row = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, params.appointmentId),
          eq(appointments.patientId, params.patientUserId),
          eq(appointments.isActive, true)
        )
      )
      .limit(1);

    if (!row.length) {
      throw createError("Appointment not found", 404);
    }

    const apt = row[0];
    if (apt.status === "cancelled" || apt.status === "rejected") {
      throw createError("This appointment is already cancelled", 400);
    }

    if (apt.status === "completed") {
      throw createError("This appointment is already completed and cannot be cancelled.", 400);
    }

    if (!canModifyAppointmentByCalendarDayRule(String(apt.appointmentDate), tz)) {
      throw createError(
        "Cancellation via WhatsApp is only allowed when your appointment is more than one full day away. Please call the clinic for shorter notice.",
        400
      );
    }

    await db
      .update(appointments)
      .set({
        status: "cancelled",
        cancellationReason: params.reason?.trim() || "Cancelled via WhatsApp",
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, apt.id));

    return { id: apt.id };
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

