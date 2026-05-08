import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { db } from "../config/database";
import {
  doctorPracticeAffiliations,
  type AffiliationWeeklySchedule,
  INVITATION_DOCTOR_REQUEST,
  INVITATION_ORG_INVITE,
} from "../schema/doctorPracticeAffiliations";
import { doctors } from "../schema/doctor";
import { users } from "../schema/users";
import { hospitals } from "../schema/hospitals";
import { roles } from "../schema/roles";
import { doctorAvailabilityExceptions } from "../schema/doctorAvailabilityExceptions";
import { createError } from "../middleware/error.handler";
import {
  defaultScheduleTimeZone,
  isSlotWithinWindow,
  isYmdOnAvailableWeekday,
  mergeWeeklySchedule,
} from "../utils/practiceSchedule.util";
import { hmToMinutes } from "../utils/whatsappBookingSlots.util";
import { intervalsOverlap } from "../utils/whatsappBookingSlots.util";
import { getEnglishWeekdayLongForYmd, normalizeHm } from "../utils/clinicTime.util";
import {
  buildDoctorBaseHalfHourSlotsByWeekday,
  hasAnyDiscreteHalfHourSlots,
  isAppointmentStartInDiscreteHalfHourSlots,
  validateHalfHourSlotsDisjointFromOtherAffiliations,
  validateHalfHourSlotsSubsetOfBase,
} from "../utils/affiliationHalfHourSlots.util";

const ACTIVE = "active" as const;
const PENDING = "pending" as const;
const SUSPENDED = "suspended" as const;
const ENDED = "ended" as const;

export class PracticeAffiliationService {
  async listActiveAffiliationIdsForDoctor(doctorId: string): Promise<string[]> {
    const rows = await db
      .select({ id: doctorPracticeAffiliations.id })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.doctorId, doctorId),
          eq(doctorPracticeAffiliations.status, ACTIVE)
        )
      )
      .orderBy(doctorPracticeAffiliations.createdAt);
    return rows.map((r) => r.id);
  }

  async getDoctorIdForUser(userId: string): Promise<string | null> {
    const rows = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, userId)).limit(1);
    return rows[0]?.id ?? null;
  }

  async listForDoctorUser(userId: string) {
    const doctorId = await this.getDoctorIdForUser(userId);
    if (!doctorId) return [];

    const rows = await db
      .select({
        id: doctorPracticeAffiliations.id,
        kind: doctorPracticeAffiliations.kind,
        status: doctorPracticeAffiliations.status,
        weeklySchedule: doctorPracticeAffiliations.weeklySchedule,
        hospitalId: doctorPracticeAffiliations.hospitalId,
        hospitalName: hospitals.hospitalName,
        invitationSource: doctorPracticeAffiliations.invitationSource,
      })
      .from(doctorPracticeAffiliations)
      .leftJoin(hospitals, eq(doctorPracticeAffiliations.hospitalId, hospitals.id))
      .where(eq(doctorPracticeAffiliations.doctorId, doctorId))
      .orderBy(doctorPracticeAffiliations.createdAt);

    return rows;
  }

  async ensurePrivateAffiliationForDoctorUser(userId: string) {
    const doctorId = await this.getDoctorIdForUser(userId);
    if (!doctorId) {
      throw createError("Doctor profile not found", 404);
    }

    const existing = await db
      .select({ id: doctorPracticeAffiliations.id })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.doctorId, doctorId),
          eq(doctorPracticeAffiliations.kind, "private"),
          eq(doctorPracticeAffiliations.status, ACTIVE)
        )
      )
      .limit(1);

    if (existing.length) {
      return existing[0];
    }

    const doc = await db
      .select({
        availableDays: doctors.availableDays,
        openingTime: doctors.openingTime,
        closingTime: doctors.closingTime,
      })
      .from(doctors)
      .where(eq(doctors.id, doctorId))
      .limit(1);

    const weekly: AffiliationWeeklySchedule = {
      services: [],
      bookableHalfHourSlotsByWeekday: null,
    };

    const [ins] = await db
      .insert(doctorPracticeAffiliations)
      .values({
        doctorId,
        kind: "private",
        hospitalId: null,
        status: ACTIVE,
        weeklySchedule: weekly,
      })
      .returning({ id: doctorPracticeAffiliations.id });

    return ins!;
  }

  async updateWeeklyScheduleForDoctor(userId: string, affiliationId: string, schedule: AffiliationWeeklySchedule) {
    const doctorId = await this.getDoctorIdForUser(userId);
    if (!doctorId) throw createError("Doctor profile not found", 404);

    const row = await db
      .select()
      .from(doctorPracticeAffiliations)
      .where(and(eq(doctorPracticeAffiliations.id, affiliationId), eq(doctorPracticeAffiliations.doctorId, doctorId)))
      .limit(1);
    if (!row.length) throw createError("Affiliation not found", 404);
    if (row[0].status !== ACTIVE && row[0].status !== PENDING) {
      throw createError("Cannot edit schedule for inactive affiliation", 400);
    }

    const doc = await db
      .select({
        availableDays: doctors.availableDays,
        openingTime: doctors.openingTime,
        closingTime: doctors.closingTime,
      })
      .from(doctors)
      .where(eq(doctors.id, doctorId))
      .limit(1);
    if (!doc.length) throw createError("Doctor profile not found", 404);

    const prev = (row[0].weeklySchedule as AffiliationWeeklySchedule | null) ?? {};
    const prevObject = Array.isArray(prev) ? {} : prev;
    const merged: AffiliationWeeklySchedule = { ...prevObject, ...schedule };

    if (!Array.isArray(merged) && merged.bookableHalfHourSlotsByWeekday && typeof merged.bookableHalfHourSlotsByWeekday === "object") {
      const slim: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(merged.bookableHalfHourSlotsByWeekday)) {
        if (!Array.isArray(v) || v.length === 0) continue;
        slim[k.toLowerCase()] = v.map((x) => String(x));
      }
      merged.bookableHalfHourSlotsByWeekday = Object.keys(slim).length ? slim : null;
    }

    if (hasAnyDiscreteHalfHourSlots(merged)) {
      const baseByDay = buildDoctorBaseHalfHourSlotsByWeekday(doc[0]);
      const err = validateHalfHourSlotsSubsetOfBase(
        (Array.isArray(merged) ? null : merged.bookableHalfHourSlotsByWeekday) as Record<string, string[]>,
        baseByDay,
      );
      if (err) {
        throw createError(err, 400);
      }

      const others = await db
        .select({
          id: doctorPracticeAffiliations.id,
          weeklySchedule: doctorPracticeAffiliations.weeklySchedule,
        })
        .from(doctorPracticeAffiliations)
        .where(
          and(eq(doctorPracticeAffiliations.doctorId, doctorId), inArray(doctorPracticeAffiliations.status, [ACTIVE, PENDING])),
        );
      const err2 = validateHalfHourSlotsDisjointFromOtherAffiliations(
        affiliationId,
        (Array.isArray(merged) ? null : merged.bookableHalfHourSlotsByWeekday) as Record<string, string[]>,
        others,
      );
      if (err2) {
        throw createError(err2, 400);
      }
    }

    await db
      .update(doctorPracticeAffiliations)
      .set({ weeklySchedule: merged, updatedAt: new Date() })
      .where(eq(doctorPracticeAffiliations.id, affiliationId));

    return { id: affiliationId };
  }

  async getDoctorBaseHalfHourSlotsForDoctorUser(userId: string) {
    const doctorId = await this.getDoctorIdForUser(userId);
    if (!doctorId) throw createError("Doctor profile not found", 404);

    const doc = await db
      .select({
        availableDays: doctors.availableDays,
        openingTime: doctors.openingTime,
        closingTime: doctors.closingTime,
      })
      .from(doctors)
      .where(eq(doctors.id, doctorId))
      .limit(1);
    if (!doc.length) throw createError("Doctor profile not found", 404);

    const slotsByWeekday = buildDoctorBaseHalfHourSlotsByWeekday(doc[0]);
    const hasHours = Boolean(doc[0].openingTime && doc[0].closingTime);
    const hasDays = Array.isArray(doc[0].availableDays) && (doc[0].availableDays as unknown[]).length > 0;
    const profileComplete = hasHours && hasDays && Object.keys(slotsByWeekday).length > 0;
    return {
      availableDays: doc[0].availableDays,
      openingTime: doc[0].openingTime,
      closingTime: doc[0].closingTime,
      slotsByWeekday,
      profileComplete,
    };
  }

  async doctorAcceptOrgInvite(doctorUserId: string, affiliationId: string) {
    const doctorId = await this.getDoctorIdForUser(doctorUserId);
    if (!doctorId) throw createError("Doctor profile not found", 404);

    const row = await db
      .select()
      .from(doctorPracticeAffiliations)
      .where(and(eq(doctorPracticeAffiliations.id, affiliationId), eq(doctorPracticeAffiliations.doctorId, doctorId)))
      .limit(1);
    if (!row.length) throw createError("Affiliation not found", 404);
    if (row[0].status !== PENDING) {
      throw createError("Only pending invitations can be accepted here", 400);
    }
    if (row[0].invitationSource !== INVITATION_ORG_INVITE) {
      throw createError("This pending affiliation is approved by the hospital admin, not here", 400);
    }

    await db
      .update(doctorPracticeAffiliations)
      .set({ status: ACTIVE, updatedAt: new Date() })
      .where(eq(doctorPracticeAffiliations.id, affiliationId));

    return { id: affiliationId, status: ACTIVE };
  }

  async doctorRejectOrgInvite(doctorUserId: string, affiliationId: string) {
    const doctorId = await this.getDoctorIdForUser(doctorUserId);
    if (!doctorId) throw createError("Doctor profile not found", 404);

    const row = await db
      .select()
      .from(doctorPracticeAffiliations)
      .where(and(eq(doctorPracticeAffiliations.id, affiliationId), eq(doctorPracticeAffiliations.doctorId, doctorId)))
      .limit(1);
    if (!row.length) throw createError("Affiliation not found", 404);
    if (row[0].status !== PENDING) {
      throw createError("Only pending invitations can be declined here", 400);
    }
    if (row[0].invitationSource !== INVITATION_ORG_INVITE) {
      throw createError("This pending affiliation is handled by the hospital admin", 400);
    }

    await db
      .update(doctorPracticeAffiliations)
      .set({
        status: ENDED,
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(doctorPracticeAffiliations.id, affiliationId));

    return { id: affiliationId, status: ENDED };
  }

  async requestJoinHospital(doctorUserId: string, hospitalId: string) {
    const doctorId = await this.getDoctorIdForUser(doctorUserId);
    if (!doctorId) throw createError("Doctor profile not found", 404);

    const h = await db.select({ id: hospitals.id }).from(hospitals).where(eq(hospitals.id, hospitalId)).limit(1);
    if (!h.length) throw createError("Hospital not found", 404);

    const dup = await db
      .select({ id: doctorPracticeAffiliations.id, status: doctorPracticeAffiliations.status })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.doctorId, doctorId),
          eq(doctorPracticeAffiliations.kind, "hospital"),
          eq(doctorPracticeAffiliations.hospitalId, hospitalId),
          inArray(doctorPracticeAffiliations.status, [ACTIVE, PENDING, SUSPENDED])
        )
      )
      .limit(1);
    if (dup.length) {
      throw createError("You already have or requested an affiliation with this hospital", 400);
    }

    const [ins] = await db
      .insert(doctorPracticeAffiliations)
      .values({
        doctorId,
        kind: "hospital",
        hospitalId,
        status: PENDING,
        invitationSource: INVITATION_DOCTOR_REQUEST,
        weeklySchedule: null,
      })
      .returning({ id: doctorPracticeAffiliations.id });

    return ins!;
  }

  async inviteDoctorToHospital(hospitalUserId: string, email: string) {
    const hospital = await db
      .select({ id: hospitals.id })
      .from(hospitals)
      .where(eq(hospitals.userId, hospitalUserId))
      .limit(1);
    if (!hospital.length) throw createError("Hospital profile not found", 404);
    const hospitalId = hospital[0].id;

    const normalized = email.trim().toLowerCase();
    const userRow = await db
      .select({ id: users.id })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.email, normalized), eq(roles.name, "doctor")))
      .limit(1);
    if (!userRow.length) throw createError("No doctor account found for this email", 404);

    const doctorId = await this.getDoctorIdForUser(userRow[0].id);
    if (!doctorId) throw createError("Doctor profile missing for user", 400);

    const existing = await db
      .select({ id: doctorPracticeAffiliations.id, status: doctorPracticeAffiliations.status })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.doctorId, doctorId),
          eq(doctorPracticeAffiliations.kind, "hospital"),
          eq(doctorPracticeAffiliations.hospitalId, hospitalId),
          eq(doctorPracticeAffiliations.status, ACTIVE)
        )
      )
      .limit(1);
    if (existing.length) {
      return { affiliationId: existing[0].id, status: ACTIVE, message: "Already active" };
    }

    const pendingRow = await db
      .select({ id: doctorPracticeAffiliations.id })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.doctorId, doctorId),
          eq(doctorPracticeAffiliations.kind, "hospital"),
          eq(doctorPracticeAffiliations.hospitalId, hospitalId),
          eq(doctorPracticeAffiliations.status, PENDING)
        )
      )
      .limit(1);
    if (pendingRow.length) {
      return {
        affiliationId: pendingRow[0].id,
        status: PENDING,
        message: "An invitation is already pending for this doctor",
      };
    }

    const [ins] = await db
      .insert(doctorPracticeAffiliations)
      .values({
        doctorId,
        kind: "hospital",
        hospitalId,
        status: PENDING,
        invitationSource: INVITATION_ORG_INVITE,
        weeklySchedule: null,
      })
      .returning({ id: doctorPracticeAffiliations.id });

    return {
      affiliationId: ins!.id,
      status: PENDING,
      message: "Invitation sent — the doctor must accept it in their account",
    };
  }

  async setAffiliationStatusByHospital(hospitalUserId: string, affiliationId: string, status: typeof ACTIVE | typeof PENDING | typeof SUSPENDED | typeof ENDED) {
    const hospital = await db
      .select({ id: hospitals.id })
      .from(hospitals)
      .where(eq(hospitals.userId, hospitalUserId))
      .limit(1);
    if (!hospital.length) throw createError("Hospital profile not found", 404);

    const aff = await db
      .select()
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.id, affiliationId),
          eq(doctorPracticeAffiliations.hospitalId, hospital[0].id),
          eq(doctorPracticeAffiliations.kind, "hospital")
        )
      )
      .limit(1);
    if (!aff.length) throw createError("Affiliation not found", 404);

    if (
      status === ACTIVE &&
      aff[0].status === PENDING &&
      aff[0].invitationSource === INVITATION_ORG_INVITE
    ) {
      throw createError("This invitation must be accepted by the doctor in their account first", 400);
    }

    await db
      .update(doctorPracticeAffiliations)
      .set({
        status,
        endedAt: status === ENDED ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(doctorPracticeAffiliations.id, affiliationId));

    return { id: affiliationId, status };
  }

  async listPendingForHospital(hospitalUserId: string) {
    const hospital = await db
      .select({ id: hospitals.id })
      .from(hospitals)
      .where(eq(hospitals.userId, hospitalUserId))
      .limit(1);
    if (!hospital.length) throw createError("Hospital profile not found", 404);

    return db
      .select({
        id: doctorPracticeAffiliations.id,
        doctorId: doctorPracticeAffiliations.doctorId,
        status: doctorPracticeAffiliations.status,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(doctorPracticeAffiliations)
      .innerJoin(doctors, eq(doctorPracticeAffiliations.doctorId, doctors.id))
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(
        and(
          eq(doctorPracticeAffiliations.hospitalId, hospital[0].id),
          eq(doctorPracticeAffiliations.kind, "hospital"),
          eq(doctorPracticeAffiliations.status, PENDING),
          or(
            isNull(doctorPracticeAffiliations.invitationSource),
            ne(doctorPracticeAffiliations.invitationSource, INVITATION_ORG_INVITE),
          ),
        ),
      );
  }

  async assertAffiliationAllowsBooking(params: {
    doctorId: string;
    practiceAffiliationId: string | null | undefined;
    appointmentDate: string;
    appointmentTime: string;
    durationMinutes: number;
  }) {
    const tz = defaultScheduleTimeZone();
    const { doctorId, appointmentDate, appointmentTime, durationMinutes } = params;
    let practiceAffiliationId = params.practiceAffiliationId ?? null;

    const docRows = await db
      .select({
        availableDays: doctors.availableDays,
        openingTime: doctors.openingTime,
        closingTime: doctors.closingTime,
      })
      .from(doctors)
      .where(eq(doctors.id, doctorId))
      .limit(1);
    if (!docRows.length) throw createError("Doctor not found", 404);
    const doc = docRows[0];

    if (!practiceAffiliationId) {
      const fallback = await db
        .select({ id: doctorPracticeAffiliations.id })
        .from(doctorPracticeAffiliations)
        .where(
          and(
            eq(doctorPracticeAffiliations.doctorId, doctorId),
            eq(doctorPracticeAffiliations.kind, "private"),
            eq(doctorPracticeAffiliations.status, ACTIVE)
          )
        )
        .limit(1);
      practiceAffiliationId = fallback[0]?.id ?? null;
    }

    if (!practiceAffiliationId) {
      const merged = mergeWeeklySchedule(null, doc);
      if (!isYmdOnAvailableWeekday(appointmentDate, merged.availableDays, tz)) {
        throw createError("Doctor is not available on that weekday", 400);
      }
      if (!isSlotWithinWindow(appointmentTime, durationMinutes, merged.openingTime, merged.closingTime)) {
        throw createError("Requested time is outside working hours", 400);
      }
      await this.assertNotBlockedByExceptions({
        doctorId,
        affiliationId: null,
        ymd: appointmentDate,
        hm: appointmentTime,
        durationMinutes,
      });
      return { practiceAffiliationId: null as string | null };
    }

    const affRows = await db
      .select()
      .from(doctorPracticeAffiliations)
      .where(
        and(eq(doctorPracticeAffiliations.id, practiceAffiliationId), eq(doctorPracticeAffiliations.doctorId, doctorId))
      )
      .limit(1);
    if (!affRows.length) throw createError("Practice affiliation not found", 404);
    const aff = affRows[0];
    if (aff.status !== ACTIVE) {
      throw createError("Practice site is not active for booking", 400);
    }

    const merged = mergeWeeklySchedule(aff.weeklySchedule as AffiliationWeeklySchedule | null, doc);
    if (!isYmdOnAvailableWeekday(appointmentDate, merged.availableDays, tz)) {
      throw createError("Not available on that weekday for this practice site", 400);
    }
    if (!isSlotWithinWindow(appointmentTime, durationMinutes, merged.openingTime, merged.closingTime)) {
      throw createError("Requested time is outside hours for this practice site", 400);
    }

    const weekdayLower = getEnglishWeekdayLongForYmd(appointmentDate, tz);
    if (
      !isAppointmentStartInDiscreteHalfHourSlots(
        weekdayLower,
        appointmentTime,
        durationMinutes,
        aff.weeklySchedule as AffiliationWeeklySchedule | null,
      )
    ) {
      throw createError(
        "Requested time is not a bookable 30-minute slot for this practice site (when slot-based hours are configured, duration must be 30 minutes)",
        400,
      );
    }

    await this.assertNotBlockedByExceptions({
      doctorId,
      affiliationId: practiceAffiliationId,
      ymd: appointmentDate,
      hm: appointmentTime,
      durationMinutes,
    });

    return { practiceAffiliationId };
  }

  private async assertNotBlockedByExceptions(params: {
    doctorId: string;
    affiliationId: string | null;
    ymd: string;
    hm: string;
    durationMinutes: number;
  }) {
    const start = hmToMinutes(normalizeHm(params.hm));
    if (start == null) return;
    const end = start + params.durationMinutes;

    const rows = await db
      .select()
      .from(doctorAvailabilityExceptions)
      .where(
        and(
          eq(doctorAvailabilityExceptions.doctorId, params.doctorId),
          eq(doctorAvailabilityExceptions.exceptionDate, params.ymd)
        )
      );

    for (const ex of rows) {
      const scopeId = (ex.practiceAffiliationId as string | null | undefined) ?? null;
      if (scopeId != null && scopeId !== params.affiliationId) continue;

      if (ex.isFullDay) {
        throw createError("Doctor is unavailable on that date (leave / block)", 400);
      }
      const exStart = ex.startTime ? hmToMinutes(normalizeHm(ex.startTime)) : null;
      const exEnd = ex.endTime ? hmToMinutes(normalizeHm(ex.endTime)) : null;
      if (exStart != null && exEnd != null && intervalsOverlap(start, end, exStart, exEnd)) {
        throw createError("Doctor is unavailable during that time (leave / block)", 400);
      }
    }
  }

  async getFeePkrForBooking(doctorId: string, practiceAffiliationId: string | null | undefined): Promise<number> {
    const doc = await db
      .select({ feePkr: doctors.feePkr })
      .from(doctors)
      .where(eq(doctors.id, doctorId))
      .limit(1);
    const base = doc[0]?.feePkr ? Number(doc[0].feePkr) : 0;
    return base;
  }

  async addAvailabilityExceptionForDoctor(
    userId: string,
    body: {
      exceptionDate: string;
      isFullDay?: boolean;
      startTime?: string;
      endTime?: string;
      reason?: string;
      practiceAffiliationId?: string | null;
    }
  ) {
    const doctorId = await this.getDoctorIdForUser(userId);
    if (!doctorId) throw createError("Doctor profile not found", 404);

    if (body.practiceAffiliationId) {
      const ok = await db
        .select({ id: doctorPracticeAffiliations.id })
        .from(doctorPracticeAffiliations)
        .where(
          and(
            eq(doctorPracticeAffiliations.id, body.practiceAffiliationId),
            eq(doctorPracticeAffiliations.doctorId, doctorId)
          )
        )
        .limit(1);
      if (!ok.length) throw createError("Practice affiliation not found", 404);
    }

    const [row] = await db
      .insert(doctorAvailabilityExceptions)
      .values({
        doctorId,
        practiceAffiliationId: body.practiceAffiliationId ?? null,
        exceptionDate: body.exceptionDate,
        isFullDay: body.isFullDay !== false,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        reason: body.reason ?? null,
      })
      .returning({ id: doctorAvailabilityExceptions.id });

    return row!;
  }

  async resolveDefaultAffiliationForWhatsApp(params: {
    ownerUserId: string;
    savedDefaultId: string | null | undefined;
    doctorId: string | null | undefined;
  }): Promise<string | null> {
    if (params.savedDefaultId) {
      const ok = await db
        .select({ id: doctorPracticeAffiliations.id })
        .from(doctorPracticeAffiliations)
        .innerJoin(doctors, eq(doctorPracticeAffiliations.doctorId, doctors.id))
        .where(
          and(
            eq(doctorPracticeAffiliations.id, params.savedDefaultId),
            eq(doctors.userId, params.ownerUserId),
            eq(doctorPracticeAffiliations.status, ACTIVE)
          )
        )
        .limit(1);
      if (ok.length) return params.savedDefaultId;
    }

    if (params.doctorId) {
      const docUser = await db
        .select({ userId: doctors.userId })
        .from(doctors)
        .where(eq(doctors.id, params.doctorId))
        .limit(1);
      if (docUser.length && docUser[0].userId === params.ownerUserId) {
        const priv = await db
          .select({ id: doctorPracticeAffiliations.id })
          .from(doctorPracticeAffiliations)
          .where(
            and(
              eq(doctorPracticeAffiliations.doctorId, params.doctorId),
              eq(doctorPracticeAffiliations.kind, "private"),
              eq(doctorPracticeAffiliations.status, ACTIVE)
            )
          )
          .limit(1);
        if (priv.length) return priv[0].id;
      }
    }

    const anyActive = await db
      .select({ id: doctorPracticeAffiliations.id })
      .from(doctorPracticeAffiliations)
      .innerJoin(doctors, eq(doctorPracticeAffiliations.doctorId, doctors.id))
      .where(and(eq(doctors.userId, params.ownerUserId), eq(doctorPracticeAffiliations.status, ACTIVE)))
      .limit(1);
    return anyActive[0]?.id ?? null;
  }
}

export const practiceAffiliationService = new PracticeAffiliationService();
