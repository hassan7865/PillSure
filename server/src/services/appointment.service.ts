import { db } from "../config/database";
import { appointments } from "../schema/appointments";
import { doctors } from "../schema/doctor";
import { users } from "../schema/users";
import { patients } from "../schema/patient";
import { hospitals } from "../schema/hospitals";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { createError } from "../middleware/error.handler";
import { randomBytes } from "crypto";
import { randomUUID } from "crypto";
import { doctorService } from "./doctor.service";

export class AppointmentService {
  async createAppointment(patientId: string, data: any) {
    const existingAppointment = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, data.doctorId),
          eq(appointments.appointmentDate, data.appointmentDate),
          eq(appointments.appointmentTime, data.appointmentTime),
          eq(appointments.isActive, true),
          or(
            eq(appointments.status, "pending"),
            eq(appointments.status, "confirmed")
          )
        )
      )
      .limit(1);

    if (existingAppointment.length > 0) {
      throw createError("This time slot is already booked", 400);
    }

    // Generate unique meeting ID for online appointments
    let meetingId: string | null = null;
    if (data.consultationMode?.toLowerCase() === 'online') {
      // Generate a simple numeric meeting ID (10-12 digits)
      // Format: timestamp + random to ensure uniqueness
      const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
      const random = Math.floor(1000 + Math.random() * 9000).toString(); // 4 random digits
      meetingId = `${timestamp}${random}`;
    }
    
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
      })
      .returning();

    return newAppointment[0];
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
    const conditions = [eq(appointments.doctorId, doctorId), eq(appointments.isActive, true)];
    
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
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        isActive: appointments.isActive,
        patientName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        patientEmail: users.email,
        patientGender: patients.gender,
        patientMobile: patients.mobile,
        patientDateOfBirth: patients.dateOfBirth,
        patientAddress: patients.address,
        patientBloodGroup: patients.bloodGroup,
        patientHasCovid: patients.hasCovid,
        patientPastMedicalHistory: patients.pastMedicalHistory,
        patientSurgicalHistory: patients.surgicalHistory,
        patientAllergies: patients.allergies,
        hospitalName: hospitals.hospitalName,
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .leftJoin(patients, eq(appointments.patientId, patients.userId))
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
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
      );

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
}

export const appointmentService = new AppointmentService();

