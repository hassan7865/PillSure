import { and, eq, ilike } from "drizzle-orm";
import { db } from "../config/database";
import { doctors } from "../schema/doctor";
import { hospitals } from "../schema/hospitals";
import { doctorPracticeAffiliations } from "../schema/doctorPracticeAffiliations";
import { doctorServices } from "../schema/doctorServices";
import { createError } from "../middleware/error.handler";

type UpsertDoctorServicePayload = {
  practiceAffiliationId: string;
  serviceName: string;
  description?: string | null;
  durationMinutes: number;
  pricePkr: number;
};

export class DoctorServiceCatalogService {
  private async resolveDoctorIdForUser(userId: string): Promise<string> {
    const rows = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, userId)).limit(1);
    if (!rows.length) throw createError("Doctor profile not found", 404);
    return rows[0].id;
  }

  private async assertAffiliationBelongsToDoctor(doctorId: string, practiceAffiliationId: string) {
    const rows = await db
      .select({ id: doctorPracticeAffiliations.id, kind: doctorPracticeAffiliations.kind })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.id, practiceAffiliationId),
          eq(doctorPracticeAffiliations.doctorId, doctorId),
          eq(doctorPracticeAffiliations.status, "active")
        )
      )
      .limit(1);
    if (!rows.length) throw createError("Active practice affiliation not found for doctor", 404);
    return rows[0];
  }

  async listForDoctorUser(userId: string, practiceAffiliationId?: string) {
    const doctorId = await this.resolveDoctorIdForUser(userId);
    const conditions = [eq(doctorServices.doctorId, doctorId), eq(doctorServices.isActive, true)];
    if (practiceAffiliationId) {
      conditions.push(eq(doctorServices.practiceAffiliationId, practiceAffiliationId));
    }
    return db
      .select()
      .from(doctorServices)
      .where(and(...conditions));
  }

  async createForDoctorUser(userId: string, payload: UpsertDoctorServicePayload) {
    const doctorId = await this.resolveDoctorIdForUser(userId);
    const affiliation = await this.assertAffiliationBelongsToDoctor(doctorId, payload.practiceAffiliationId);
    const durationMinutes = affiliation.kind === "private" ? 30 : payload.durationMinutes;

    const [row] = await db
      .insert(doctorServices)
      .values({
        doctorId,
        practiceAffiliationId: payload.practiceAffiliationId,
        serviceName: payload.serviceName.trim(),
        description: payload.description?.trim() || null,
        durationMinutes,
        pricePkr: payload.pricePkr.toFixed(2),
        isActive: true,
      })
      .returning();
    return row;
  }

  async updateForDoctorUser(userId: string, serviceId: string, patch: Partial<UpsertDoctorServicePayload>) {
    const doctorId = await this.resolveDoctorIdForUser(userId);
    const existing = await db
      .select()
      .from(doctorServices)
      .where(and(eq(doctorServices.id, serviceId), eq(doctorServices.doctorId, doctorId), eq(doctorServices.isActive, true)))
      .limit(1);
    if (!existing.length) throw createError("Doctor service not found", 404);

    let targetAffiliationKind: string | null = null;
    if (patch.practiceAffiliationId) {
      const target = await this.assertAffiliationBelongsToDoctor(doctorId, patch.practiceAffiliationId);
      targetAffiliationKind = target.kind;
    } else {
      const current = await db
        .select({ kind: doctorPracticeAffiliations.kind })
        .from(doctorPracticeAffiliations)
        .where(
          and(
            eq(doctorPracticeAffiliations.id, existing[0].practiceAffiliationId),
            eq(doctorPracticeAffiliations.doctorId, doctorId),
          ),
        )
        .limit(1);
      targetAffiliationKind = current[0]?.kind ?? null;
    }

    const [updated] = await db
      .update(doctorServices)
      .set({
        practiceAffiliationId: patch.practiceAffiliationId ?? existing[0].practiceAffiliationId,
        serviceName: patch.serviceName?.trim() ?? existing[0].serviceName,
        description: patch.description !== undefined ? patch.description?.trim() || null : existing[0].description,
        durationMinutes:
          targetAffiliationKind === "private"
            ? 30
            : patch.durationMinutes ?? existing[0].durationMinutes,
        pricePkr:
          patch.pricePkr !== undefined ? patch.pricePkr.toFixed(2) : String(existing[0].pricePkr ?? "0.00"),
        updatedAt: new Date(),
      })
      .where(eq(doctorServices.id, serviceId))
      .returning();
    return updated;
  }

  async deactivateForDoctorUser(userId: string, serviceId: string) {
    const doctorId = await this.resolveDoctorIdForUser(userId);
    const row = await db
      .select({ id: doctorServices.id })
      .from(doctorServices)
      .where(and(eq(doctorServices.id, serviceId), eq(doctorServices.doctorId, doctorId), eq(doctorServices.isActive, true)))
      .limit(1);
    if (!row.length) throw createError("Doctor service not found", 404);
    await db
      .update(doctorServices)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(doctorServices.id, serviceId));
    return { id: serviceId };
  }

  async listForHospitalDoctor(hospitalUserId: string, doctorId: string, practiceAffiliationId?: string) {
    const hospital = await db
      .select({ id: hospitals.id })
      .from(hospitals)
      .where(eq(hospitals.userId, hospitalUserId))
      .limit(1);
    if (!hospital.length) throw createError("Hospital profile not found", 404);

    const ownedAff = await db
      .select({ id: doctorPracticeAffiliations.id })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.doctorId, doctorId),
          eq(doctorPracticeAffiliations.hospitalId, hospital[0].id),
          eq(doctorPracticeAffiliations.kind, "hospital")
        )
      );
    if (!ownedAff.length) throw createError("Doctor not affiliated with this hospital", 404);

    const ownedAffIds = ownedAff.map((r) => r.id);
    const conditions = [eq(doctorServices.doctorId, doctorId), eq(doctorServices.isActive, true)];
    if (practiceAffiliationId) {
      if (!ownedAffIds.includes(practiceAffiliationId)) {
        throw createError("Affiliation does not belong to this hospital/doctor", 400);
      }
      conditions.push(eq(doctorServices.practiceAffiliationId, practiceAffiliationId));
    }

    return db.select().from(doctorServices).where(and(...conditions));
  }

  async findActiveByNameForScope(params: {
    doctorId: string;
    practiceAffiliationId: string | null;
    serviceName: string;
  }) {
    if (!params.practiceAffiliationId) return null;
    const rows = await db
      .select()
      .from(doctorServices)
      .where(
        and(
          eq(doctorServices.doctorId, params.doctorId),
          eq(doctorServices.practiceAffiliationId, params.practiceAffiliationId),
          eq(doctorServices.isActive, true),
          ilike(doctorServices.serviceName, params.serviceName.trim())
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async listActiveForScope(doctorId: string, practiceAffiliationId: string | null) {
    if (!practiceAffiliationId) return [];
    return db
      .select()
      .from(doctorServices)
      .where(
        and(
          eq(doctorServices.doctorId, doctorId),
          eq(doctorServices.practiceAffiliationId, practiceAffiliationId),
          eq(doctorServices.isActive, true)
        )
      );
  }
}

export const doctorServiceCatalogService = new DoctorServiceCatalogService();

