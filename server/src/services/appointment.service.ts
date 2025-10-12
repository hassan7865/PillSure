import { db } from "../config/database";
import { appointments } from "../schema/appointments";
import { doctors } from "../schema/doctor";
import { users } from "../schema/users";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { createError } from "../middleware/error.handler";

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

    const newAppointment = await db
      .insert(appointments)
      .values({
        patientId,
        doctorId: data.doctorId,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        consultationMode: data.consultationMode,
        patientNotes: data.patientNotes || null,
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
        patientNotes: appointments.patientNotes,
        doctorNotes: appointments.doctorNotes,
        prescription: appointments.prescription,
        diagnosis: appointments.diagnosis,
        cancellationReason: appointments.cancellationReason,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        patientId: appointments.patientId,
        patientName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        patientEmail: users.email,
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
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
        patientNotes: appointments.patientNotes,
        doctorNotes: appointments.doctorNotes,
        prescription: appointments.prescription,
        diagnosis: appointments.diagnosis,
        cancellationReason: appointments.cancellationReason,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.isActive, true),
          or(
            eq(appointments.patientId, userId),
            eq(appointments.doctorId, userId)
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

    return { success: true, status };
  }

  async updateAppointmentNotes(appointmentId: string, doctorId: string, data: any) {
    const appointment = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.doctorId, doctorId),
          eq(appointments.isActive, true)
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
}

export const appointmentService = new AppointmentService();

