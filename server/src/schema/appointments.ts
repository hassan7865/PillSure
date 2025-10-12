import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    date,
    boolean,
    index,
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
  
      patientNotes: text("patient_notes"),
      doctorNotes: text("doctor_notes"),
      prescription: text("prescription"),
      diagnosis: text("diagnosis"),
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
  