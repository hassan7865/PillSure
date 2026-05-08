import { and, eq, ne } from "drizzle-orm";
import { db } from "../config/database";
import { hospitals } from "../schema/hospitals";
import { doctors } from "../schema/doctor";
import { users } from "../schema/users";
import {
  doctorPracticeAffiliations,
  type AffiliationWeeklySchedule,
} from "../schema/doctorPracticeAffiliations";
import {
  hospitalDoctorServiceOffers,
  type OfferConflict,
  type OfferService,
  type OfferedCatalogService,
} from "../schema/hospitalDoctorServiceOffers";
import { doctorServices } from "../schema/doctorServices";
import { hospitalServiceCatalog } from "../schema/hospitalServiceCatalog";
import { createError } from "../middleware/error.handler";
import {
  buildDoctorBaseHalfHourSlotsByWeekday,
  generateHalfHourStartsBetween,
  hasAnyDiscreteHalfHourSlots,
} from "../utils/affiliationHalfHourSlots.util";
import { hmToMinutes, intervalsOverlap } from "../utils/whatsappBookingSlots.util";

type SlotRange = { day: string; start: number; end: number; startTime: string; endTime: string };

const normalizeDay = (day: string) => day.trim().toLowerCase();

const toSlotRanges = (offer: OfferService): SlotRange[] =>
  (offer.offeredSlots || [])
    .filter((slot) => slot.isAvailable !== false)
    .map((slot) => {
      const start = hmToMinutes(slot.startTime);
      const end = hmToMinutes(slot.endTime);
      return {
        day: normalizeDay(slot.day || ""),
        start: start ?? -1,
        end: end ?? -1,
        startTime: slot.startTime,
        endTime: slot.endTime,
      };
    })
    .filter((slot) => slot.day && slot.start >= 0 && slot.end > slot.start);

const buildBookableHalfHourSlotsByWeekdayFromOffer = (
  offer: OfferService
): Record<string, string[]> | null => {
  const byDay = new Map<string, Set<string>>();
  for (const slot of offer.offeredSlots || []) {
    if (slot.isAvailable === false) continue;
    const day = normalizeDay(slot.day || "");
    if (!day) continue;
    const starts = generateHalfHourStartsBetween(slot.startTime, slot.endTime);
    if (starts.length === 0) continue;
    if (!byDay.has(day)) byDay.set(day, new Set<string>());
    for (const hm of starts) {
      byDay.get(day)!.add(hm);
    }
  }

  if (byDay.size === 0) return null;
  const out: Record<string, string[]> = {};
  for (const [day, set] of byDay.entries()) {
    out[day] = [...set].sort();
  }
  return out;
};

export class HospitalDoctorServiceOfferService {
  private async resolveDoctorIdByUser(doctorUserId: string): Promise<string> {
    const doc = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, doctorUserId))
      .limit(1);
    if (!doc.length) throw createError("Doctor profile not found", 404);
    return doc[0].id;
  }

  private async getHospitalIdByUser(hospitalUserId: string): Promise<string> {
    const rows = await db
      .select({ id: hospitals.id })
      .from(hospitals)
      .where(eq(hospitals.userId, hospitalUserId))
      .limit(1);
    if (!rows.length) throw createError("Hospital profile not found", 404);
    return rows[0].id;
  }

  private async getDoctorBaseSchedule(doctorId: string) {
    const rows = await db
      .select({
        availableDays: doctors.availableDays,
        openingTime: doctors.openingTime,
        closingTime: doctors.closingTime,
      })
      .from(doctors)
      .where(eq(doctors.id, doctorId))
      .limit(1);
    if (!rows.length) throw createError("Doctor profile not found", 404);
    return rows[0];
  }

  private ensureValidOfferShape(offer: OfferService) {
    if (!offer || typeof offer !== "object") {
      throw createError("offer payload is required", 400);
    }
    if (!Array.isArray(offer.offeredServices) || offer.offeredServices.length === 0) {
      throw createError("offeredServices array is required", 400);
    }
    if (!Array.isArray(offer.offeredSlots) || offer.offeredSlots.length === 0) {
      throw createError("offeredSlots array is required", 400);
    }
  }

  private async validateCatalogServicesForHospital(params: {
    hospitalId: string;
    offeredServices: OfferedCatalogService[];
  }) {
    const { hospitalId, offeredServices } = params;
    const uniqueIds = [...new Set(offeredServices.map((s) => String(s.catalogServiceId || "").trim()).filter(Boolean))];
    if (!uniqueIds.length) {
      throw createError("Every offered service must reference a catalogServiceId", 400);
    }
    const rows = await db
      .select({
        id: hospitalServiceCatalog.id,
        serviceName: hospitalServiceCatalog.serviceName,
        description: hospitalServiceCatalog.description,
        durationMinutes: hospitalServiceCatalog.durationMinutes,
      })
      .from(hospitalServiceCatalog)
      .where(and(eq(hospitalServiceCatalog.hospitalId, hospitalId), eq(hospitalServiceCatalog.isActive, true)));

    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const offered of offeredServices) {
      const id = String(offered.catalogServiceId || "").trim();
      const catalog = byId.get(id);
      if (!catalog) {
        throw createError("One or more services are not part of the hospital catalog", 400);
      }
      offered.serviceName = String(catalog.serviceName || "").trim();
      offered.description = catalog.description?.trim() || "";
      offered.durationMinutes = Number(catalog.durationMinutes || 30);
    }
  }

  private buildConflicts(params: {
    doctorBase: { availableDays: unknown; openingTime: string | null; closingTime: string | null };
    offer: OfferService;
    otherAffiliations: Array<{ id: string; weeklySchedule: AffiliationWeeklySchedule | null }>;
  }): OfferConflict[] {
    const { doctorBase, offer, otherAffiliations } = params;
    const conflicts: OfferConflict[] = [];
    const offerRanges = toSlotRanges(offer);
    const baseSlots = buildDoctorBaseHalfHourSlotsByWeekday(doctorBase);

    const otherRanges: Array<SlotRange & { affiliationId: string }> = [];
    for (const aff of otherAffiliations) {
      const weekly = (aff.weeklySchedule || {}) as AffiliationWeeklySchedule;
      if (Array.isArray(weekly)) {
        for (const window of weekly) {
          const start = hmToMinutes(window.startTime || "");
          const end = hmToMinutes(window.endTime || "");
          if (start == null || end == null || end <= start) continue;
          otherRanges.push({
            affiliationId: aff.id,
            day: normalizeDay(window.day || ""),
            start,
            end,
            startTime: window.startTime || "",
            endTime: window.endTime || "",
          });
        }
        continue;
      }
      if (hasAnyDiscreteHalfHourSlots(weekly) && weekly.bookableHalfHourSlotsByWeekday) {
        for (const [day, starts] of Object.entries(weekly.bookableHalfHourSlotsByWeekday)) {
          for (const hm of starts) {
            const s = hmToMinutes(hm);
            if (s == null) continue;
            otherRanges.push({
              affiliationId: aff.id,
              day: normalizeDay(day),
              start: s,
              end: s + 30,
              startTime: hm,
              endTime: hm,
            });
          }
        }
        continue;
      }
      const legacyWeekly = weekly as {
        availableDays?: unknown;
        openingTime?: string | null;
        closingTime?: string | null;
      };
      const availableDays = Array.isArray(legacyWeekly.availableDays)
        ? legacyWeekly.availableDays
        : Array.isArray(doctorBase.availableDays)
          ? (doctorBase.availableDays as string[])
          : [];
      const open = hmToMinutes(legacyWeekly.openingTime || doctorBase.openingTime || "");
      const close = hmToMinutes(legacyWeekly.closingTime || doctorBase.closingTime || "");
      if (open == null || close == null || close <= open) continue;
      for (const d of availableDays) {
        otherRanges.push({
          affiliationId: aff.id,
          day: normalizeDay(String(d)),
          start: open,
          end: close,
          startTime: "",
          endTime: "",
        });
      }
    }

    for (const slot of offerRanges) {
      const dayBase = baseSlots[slot.day] || [];
      if (!dayBase.length) {
        conflicts.push({
          code: "outside_doctor_base",
          message: "Offered slot is on a day not available in doctor base schedule",
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      } else {
        const starts = dayBase.map((x) => hmToMinutes(x)).filter((x): x is number => x != null);
        if (!starts.length || slot.start < Math.min(...starts) || slot.end > Math.max(...starts) + 30) {
          conflicts.push({
            code: "outside_doctor_base",
            message: "Offered slot is outside doctor base timing window",
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        }
      }
      for (const taken of otherRanges) {
        if (taken.day !== slot.day) continue;
        if (!intervalsOverlap(slot.start, slot.end, taken.start, taken.end)) continue;
        conflicts.push({
          code: "overlap_other_affiliation",
          message: "Offered slot conflicts with another affiliation schedule",
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          otherAffiliationId: taken.affiliationId,
        });
      }
    }

    return conflicts;
  }

  async upsertHospitalOffer(params: {
    hospitalUserId: string;
    doctorId: string;
    practiceAffiliationId: string;
    offer: OfferService;
  }) {
    const { hospitalUserId, doctorId, practiceAffiliationId, offer } = params;
    this.ensureValidOfferShape(offer);

    const hospitalId = await this.getHospitalIdByUser(hospitalUserId);
    await this.validateCatalogServicesForHospital({
      hospitalId,
      offeredServices: offer.offeredServices,
    });

    for (const slot of offer.offeredSlots) {
      if (!Array.isArray(slot.catalogServiceIds) || slot.catalogServiceIds.length === 0) {
        throw createError("Each offered slot must include at least one catalog service", 400);
      }
      slot.catalogServiceIds = [...new Set(slot.catalogServiceIds.map((id) => String(id).trim()).filter(Boolean))];
    }

    const affiliation = await db
      .select({
        id: doctorPracticeAffiliations.id,
        status: doctorPracticeAffiliations.status,
        weeklySchedule: doctorPracticeAffiliations.weeklySchedule,
      })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.id, practiceAffiliationId),
          eq(doctorPracticeAffiliations.hospitalId, hospitalId),
          eq(doctorPracticeAffiliations.doctorId, doctorId),
          eq(doctorPracticeAffiliations.kind, "hospital"),
        ),
      )
      .limit(1);
    if (!affiliation.length) {
      throw createError("Hospital-doctor affiliation not found", 404);
    }
    if (affiliation[0].status !== "active") {
      throw createError("Doctor must accept affiliation before receiving offers", 400);
    }

    const doctorBase = await this.getDoctorBaseSchedule(doctorId);
    const otherAffiliations = await db
      .select({
        id: doctorPracticeAffiliations.id,
        weeklySchedule: doctorPracticeAffiliations.weeklySchedule,
      })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.doctorId, doctorId),
          eq(doctorPracticeAffiliations.status, "active"),
          ne(doctorPracticeAffiliations.id, practiceAffiliationId),
        ),
      );
    const conflicts = this.buildConflicts({
      doctorBase,
      offer,
      otherAffiliations: otherAffiliations.map((r) => ({
        id: r.id,
        weeklySchedule: (r.weeklySchedule as AffiliationWeeklySchedule | null) ?? null,
      })),
    });
    // Keep offers pending for doctor review; conflict details live in `conflicts`.
    const status = "pending";

    const existing = await db
      .select({ id: hospitalDoctorServiceOffers.id })
      .from(hospitalDoctorServiceOffers)
      .where(
        and(
          eq(hospitalDoctorServiceOffers.practiceAffiliationId, practiceAffiliationId),
          eq(hospitalDoctorServiceOffers.isActive, true),
        ),
      )
      .limit(1);

    if (existing.length) {
      const [updated] = await db
        .update(hospitalDoctorServiceOffers)
        .set({
          services: offer,
          conflicts,
          status,
          doctorReviewedAt: null,
          doctorDecision: null,
          updatedAt: new Date(),
        })
        .where(eq(hospitalDoctorServiceOffers.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(hospitalDoctorServiceOffers)
      .values({
        hospitalId,
        doctorId,
        practiceAffiliationId,
        createdByUserId: hospitalUserId,
        services: offer,
        conflicts,
        status,
        isActive: true,
      })
      .returning();
    return created;
  }

  async listOffersForHospitalDoctor(params: { hospitalUserId: string; doctorId: string }) {
    const hospitalId = await this.getHospitalIdByUser(params.hospitalUserId);
    const rows = await db
      .select()
      .from(hospitalDoctorServiceOffers)
      .where(
        and(
          eq(hospitalDoctorServiceOffers.hospitalId, hospitalId),
          eq(hospitalDoctorServiceOffers.doctorId, params.doctorId),
        ),
      );
    return rows.map((row) => ({
      ...row,
      conflicts: [],
      status: row.doctorDecision ? row.status : "sent",
    }));
  }

  async listOffersForHospital(hospitalUserId: string) {
    const hospitalId = await this.getHospitalIdByUser(hospitalUserId);
    const rows = await db
      .select({
        id: hospitalDoctorServiceOffers.id,
        hospitalId: hospitalDoctorServiceOffers.hospitalId,
        doctorId: hospitalDoctorServiceOffers.doctorId,
        practiceAffiliationId: hospitalDoctorServiceOffers.practiceAffiliationId,
        createdByUserId: hospitalDoctorServiceOffers.createdByUserId,
        services: hospitalDoctorServiceOffers.services,
        conflicts: hospitalDoctorServiceOffers.conflicts,
        status: hospitalDoctorServiceOffers.status,
        isActive: hospitalDoctorServiceOffers.isActive,
        doctorReviewedAt: hospitalDoctorServiceOffers.doctorReviewedAt,
        doctorDecision: hospitalDoctorServiceOffers.doctorDecision,
        createdAt: hospitalDoctorServiceOffers.createdAt,
        updatedAt: hospitalDoctorServiceOffers.updatedAt,
        doctorFirstName: users.firstName,
        doctorLastName: users.lastName,
        doctorEmail: users.email,
      })
      .from(hospitalDoctorServiceOffers)
      .innerJoin(doctors, eq(hospitalDoctorServiceOffers.doctorId, doctors.id))
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(hospitalDoctorServiceOffers.hospitalId, hospitalId));

    return rows.map((row) => ({
      ...row,
      conflicts: [],
      status: row.doctorDecision ? row.status : "sent",
      doctorName: `${row.doctorFirstName || ""} ${row.doctorLastName || ""}`.trim(),
    }));
  }

  async listOffersForDoctor(doctorUserId: string) {
    const doc = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, doctorUserId))
      .limit(1);
    if (!doc.length) throw createError("Doctor profile not found", 404);
    return db
      .select()
      .from(hospitalDoctorServiceOffers)
      .where(
        and(
          eq(hospitalDoctorServiceOffers.doctorId, doc[0].id),
        ),
      );
  }

  async acceptOffer(doctorUserId: string, offerId: string) {
    const doctorId = await this.resolveDoctorIdByUser(doctorUserId);

    const offerRows = await db
      .select()
      .from(hospitalDoctorServiceOffers)
      .where(
        and(
          eq(hospitalDoctorServiceOffers.id, offerId),
          eq(hospitalDoctorServiceOffers.doctorId, doctorId),
          eq(hospitalDoctorServiceOffers.isActive, true),
        ),
      )
      .limit(1);
    if (!offerRows.length) throw createError("Offer not found", 404);
    const offer = offerRows[0];
    const offerBody = (offer.services as OfferService) || { offeredServices: [], offeredSlots: [] };

    // Re-check conflicts at accept time to prevent race conditions where schedules changed
    // after offer creation (e.g. private/hospital slots updated in the meantime).
    const doctorBase = await this.getDoctorBaseSchedule(offer.doctorId);
    const otherAffiliations = await db
      .select({
        id: doctorPracticeAffiliations.id,
        weeklySchedule: doctorPracticeAffiliations.weeklySchedule,
      })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.doctorId, offer.doctorId),
          eq(doctorPracticeAffiliations.status, "active"),
          ne(doctorPracticeAffiliations.id, offer.practiceAffiliationId),
        ),
      );
    const latestConflicts = this.buildConflicts({
      doctorBase,
      offer: offerBody,
      otherAffiliations: otherAffiliations.map((r) => ({
        id: r.id,
        weeklySchedule: (r.weeklySchedule as AffiliationWeeklySchedule | null) ?? null,
      })),
    });
    if (latestConflicts.length > 0) {
      await db
        .update(hospitalDoctorServiceOffers)
        .set({
          conflicts: latestConflicts,
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(hospitalDoctorServiceOffers.id, offerId));
      throw createError(
        "Offer has unresolved slot conflicts with current hospital/private schedules and cannot be accepted",
        400,
      );
    }

    // Status can become stale if schedules changed after offer creation.
    // Fresh conflict check above is source of truth; if clear now, normalize status and continue.
    if (offer.status !== "ready_to_accept") {
      await db
        .update(hospitalDoctorServiceOffers)
        .set({
          conflicts: [],
          status: "ready_to_accept",
          updatedAt: new Date(),
        })
        .where(eq(hospitalDoctorServiceOffers.id, offerId));
    }

    await db.transaction(async (tx) => {
      await tx
        .update(doctorServices)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(doctorServices.practiceAffiliationId, offer.practiceAffiliationId));

      for (const service of offerBody.offeredServices || []) {
        const catalogRows = await tx
          .select({
            rate: hospitalServiceCatalog.rate,
            durationMinutes: hospitalServiceCatalog.durationMinutes,
          })
          .from(hospitalServiceCatalog)
          .where(
            and(
              eq(hospitalServiceCatalog.id, service.catalogServiceId),
              eq(hospitalServiceCatalog.hospitalId, offer.hospitalId),
            ),
          )
          .limit(1);
        if (!catalogRows.length) {
          throw createError("Catalog service missing for accepted offer", 400);
        }
        await tx.insert(doctorServices).values({
          doctorId: offer.doctorId,
          practiceAffiliationId: offer.practiceAffiliationId,
          serviceName: service.serviceName.trim(),
          description: service.description?.trim() || null,
          durationMinutes: Number(catalogRows[0].durationMinutes || service.durationMinutes || 30),
          pricePkr: Number(catalogRows[0].rate || 0).toFixed(2),
          isActive: true,
        });
      }

      await tx
        .update(doctorPracticeAffiliations)
        .set({
          weeklySchedule: {
            services: (offerBody.offeredServices || []).map((service) => ({
              catalogServiceId: service.catalogServiceId,
              serviceName: service.serviceName.trim(),
              description: service.description?.trim() || "",
              durationMinutes: Number(service.durationMinutes || 30),
            })),
            bookableHalfHourSlotsByWeekday:
              buildBookableHalfHourSlotsByWeekdayFromOffer(offerBody),
          } as AffiliationWeeklySchedule,
          updatedAt: new Date(),
        })
        .where(eq(doctorPracticeAffiliations.id, offer.practiceAffiliationId));

      await tx
        .update(hospitalDoctorServiceOffers)
        .set({
          status: "accepted",
          doctorDecision: "accepted",
          doctorReviewedAt: new Date(),
          updatedAt: new Date(),
          isActive: false,
        })
        .where(eq(hospitalDoctorServiceOffers.id, offerId));
    });

    return { id: offerId, status: "accepted" };
  }

  async recheckOfferConflicts(doctorUserId: string, offerId: string) {
    const doctorId = await this.resolveDoctorIdByUser(doctorUserId);
    const offerRows = await db
      .select()
      .from(hospitalDoctorServiceOffers)
      .where(
        and(
          eq(hospitalDoctorServiceOffers.id, offerId),
          eq(hospitalDoctorServiceOffers.doctorId, doctorId),
          eq(hospitalDoctorServiceOffers.isActive, true),
        ),
      )
      .limit(1);
    if (!offerRows.length) throw createError("Offer not found", 404);
    const offer = offerRows[0];
    const offerBody = (offer.services as OfferService) || { offeredServices: [], offeredSlots: [] };

    const doctorBase = await this.getDoctorBaseSchedule(offer.doctorId);
    const otherAffiliations = await db
      .select({
        id: doctorPracticeAffiliations.id,
        weeklySchedule: doctorPracticeAffiliations.weeklySchedule,
      })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.doctorId, offer.doctorId),
          eq(doctorPracticeAffiliations.status, "active"),
          ne(doctorPracticeAffiliations.id, offer.practiceAffiliationId),
        ),
      );
    const latestConflicts = this.buildConflicts({
      doctorBase,
      offer: offerBody,
      otherAffiliations: otherAffiliations.map((r) => ({
        id: r.id,
        weeklySchedule: (r.weeklySchedule as AffiliationWeeklySchedule | null) ?? null,
      })),
    });

    const nextStatus = latestConflicts.length ? "pending" : "ready_to_accept";
    const [updated] = await db
      .update(hospitalDoctorServiceOffers)
      .set({
        conflicts: latestConflicts,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(hospitalDoctorServiceOffers.id, offerId))
      .returning();

    return {
      id: updated.id,
      status: updated.status,
      conflicts: (updated.conflicts as OfferConflict[]) ?? [],
      isReadyToAccept: latestConflicts.length === 0,
    };
  }

  async rejectOffer(doctorUserId: string, offerId: string) {
    const doc = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, doctorUserId))
      .limit(1);
    if (!doc.length) throw createError("Doctor profile not found", 404);

    const row = await db
      .select({ id: hospitalDoctorServiceOffers.id })
      .from(hospitalDoctorServiceOffers)
      .where(
        and(
          eq(hospitalDoctorServiceOffers.id, offerId),
          eq(hospitalDoctorServiceOffers.doctorId, doc[0].id),
          eq(hospitalDoctorServiceOffers.isActive, true),
        ),
      )
      .limit(1);
    if (!row.length) throw createError("Offer not found", 404);

    await db
      .update(hospitalDoctorServiceOffers)
      .set({
        status: "rejected",
        doctorDecision: "rejected",
        doctorReviewedAt: new Date(),
        updatedAt: new Date(),
        isActive: false,
      })
      .where(eq(hospitalDoctorServiceOffers.id, offerId));

    return { id: offerId, status: "rejected" };
  }
}

export const hospitalDoctorServiceOfferService = new HospitalDoctorServiceOfferService();

