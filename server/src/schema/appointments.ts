import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  boolean,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
  import { users } from "./users";
  import { doctors } from "./doctor";
  
  export const appointments = pgTable(
    "appointments",
    {
      id: uuid("id").defaultRandom().primaryKey(),
  
      patientId: uuid("patient_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
  
      doctorId: uuid("doctor_id")
        .notNull()
        .references(() => doctors.id, { onDelete: "cascade" }),
  
      appointmentDate: date("appointment_date").notNull(),
      appointmentTime: varchar("appointment_time", { length: 10 }).notNull(),
      status: varchar("status", { length: 20 }).notNull().default("pending"),
      consultationMode: varchar("consultation_mode", { length: 20 }).notNull(),
      meetingId: varchar("meeting_id", { length: 100 }),

      patientNotes: text("patient_notes"),
      doctorNotes: text("doctor_notes"),
      // Structured prescription as JSONB:
      // [{ medicineId, medicineName, quantity, dose }]
      prescription: jsonb("prescription").$type<
        {
          medicineId?: number;
          medicineName: string;
          quantity: number;
          dose: string;
        }[]
      >(),
      // Diagnosis as JSONB array of strings (chips)
      diagnosis: jsonb("diagnosis").$type<string[]>(),
      cancellationReason: text("cancellation_reason"),
  
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (table) => {
      return {
        idxPatientId: index("idx_appointments_patient_id").on(table.patientId),
        idxDoctorId: index("idx_appointments_doctor_id").on(table.doctorId),
        idxAppointmentDate: index("idx_appointments_date").on(table.appointmentDate),
        idxStatus: index("idx_appointments_status").on(table.status),
        idxCreatedAt: index("idx_appointments_created_at").on(table.createdAt),
      };
    }
  );
  
  // Utility function to fetch prescription for a specific appointment
  import { db } from '../config/database';

  export async function getPrescriptionByAppointmentId(appointmentId: string) {
    const appointment = await db.query.appointments.findFirst({
      where: (appt, { eq }) => eq(appt.id, appointmentId),
      columns: {
        prescription: true,
      },
    });
    return appointment?.prescription || [];
  }
