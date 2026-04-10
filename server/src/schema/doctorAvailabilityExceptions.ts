import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { doctors } from "./doctor";

export const doctorAvailabilityExceptions = pgTable(
  "doctor_availability_exceptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    exceptionDate: date("exception_date").notNull(),
    startTime: varchar("start_time", { length: 10 }),
    endTime: varchar("end_time", { length: 10 }),
    isFullDay: boolean("is_full_day").notNull().default(true),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    idxDoctorDate: index("idx_doctor_availability_exceptions_doctor_date").on(
      table.doctorId,
      table.exceptionDate
    ),
  })
);
