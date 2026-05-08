import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { doctors } from "./doctor";
import { hospitals } from "./hospitals";

/** Per-site weekly hours; mirrors doctor row fields for migration and UI. */
export type AffiliationDailyWindow = {
  day: string;
  startTime: string;
  endTime: string;
};

export type AffiliationWeeklySchedule = {
  /** Optional service details saved alongside schedule for site-level booking context. */
  services?: Array<{
    catalogServiceId?: string;
    serviceName: string;
    description?: string;
    durationMinutes?: number;
    pricePkr?: number;
  }>;
  /**
   * Optional 30-minute bookable slot starts (HH:mm) per lowercase weekday (e.g. monday).
   * Must be a subset of the doctor profile grid and disjoint across other affiliations.
   */
  bookableHalfHourSlotsByWeekday?: Record<string, string[]> | null;
} | AffiliationDailyWindow[];

/** Hospital invited this doctor — pending until doctor accepts. */
export const INVITATION_ORG_INVITE = "org_invite" as const;
/** Doctor asked to join — pending until org approves. */
export const INVITATION_DOCTOR_REQUEST = "doctor_request" as const;
export type InvitationSource = typeof INVITATION_ORG_INVITE | typeof INVITATION_DOCTOR_REQUEST;

export const doctorPracticeAffiliations = pgTable(
  "doctor_practice_affiliations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 20 }).notNull(),
    hospitalId: uuid("hospital_id").references(() => hospitals.id, { onDelete: "set null" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    invitationSource: varchar("invitation_source", { length: 30 }).$type<InvitationSource | null>(),
    weeklySchedule: jsonb("weekly_schedule").$type<AffiliationWeeklySchedule | null>(),
    suspendedReason: text("suspended_reason"),
    endedAt: timestamp("ended_at", { withTimezone: false }),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    idxDoctor: index("idx_doctor_practice_affiliations_doctor").on(table.doctorId),
    idxHospital: index("idx_doctor_practice_affiliations_hospital").on(table.hospitalId),
    idxStatus: index("idx_doctor_practice_affiliations_status").on(table.status),
  })
);
