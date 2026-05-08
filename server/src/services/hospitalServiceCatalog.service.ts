import { and, desc, eq } from "drizzle-orm";
import { db } from "../config/database";
import { createError } from "../middleware/error.handler";
import { hospitals } from "../schema/hospitals";
import { hospitalServiceCatalog } from "../schema/hospitalServiceCatalog";

type UpsertHospitalCatalogServiceInput = {
  serviceName: string;
  description?: string | null;
  durationMinutes: number;
  rate: number;
  currency: string;
  isActive?: boolean;
};

export class HospitalServiceCatalogService {
  private async getHospitalIdByUser(hospitalUserId: string): Promise<string> {
    const rows = await db
      .select({ id: hospitals.id })
      .from(hospitals)
      .where(eq(hospitals.userId, hospitalUserId))
      .limit(1);

    if (!rows.length) {
      throw createError("Hospital profile not found", 404);
    }
    return rows[0].id;
  }

  private validatePayload(payload: UpsertHospitalCatalogServiceInput) {
    if (!payload.serviceName.trim()) {
      throw createError("serviceName is required", 400);
    }
    if (!Number.isFinite(payload.rate) || payload.rate < 0) {
      throw createError("rate must be a positive number", 400);
    }
    if (!Number.isFinite(payload.durationMinutes) || payload.durationMinutes <= 0) {
      throw createError("durationMinutes must be a positive number", 400);
    }
    if ((payload.currency || "").trim().toUpperCase() !== "PKR") {
      throw createError("currency must be PKR", 400);
    }
  }

  async list(hospitalUserId: string) {
    const hospitalId = await this.getHospitalIdByUser(hospitalUserId);
    return db
      .select()
      .from(hospitalServiceCatalog)
      .where(eq(hospitalServiceCatalog.hospitalId, hospitalId))
      .orderBy(desc(hospitalServiceCatalog.updatedAt));
  }

  async create(hospitalUserId: string, payload: UpsertHospitalCatalogServiceInput) {
    this.validatePayload(payload);
    const hospitalId = await this.getHospitalIdByUser(hospitalUserId);
    const [created] = await db
      .insert(hospitalServiceCatalog)
      .values({
        hospitalId,
        serviceName: payload.serviceName.trim(),
        description: payload.description?.trim() || null,
        durationMinutes: Math.floor(Number(payload.durationMinutes)),
        rate: Number(payload.rate).toFixed(2),
        currency: "PKR",
        isActive: payload.isActive ?? true,
      })
      .returning();
    return created;
  }

  async update(hospitalUserId: string, serviceId: string, payload: UpsertHospitalCatalogServiceInput) {
    this.validatePayload(payload);
    const hospitalId = await this.getHospitalIdByUser(hospitalUserId);
    const [updated] = await db
      .update(hospitalServiceCatalog)
      .set({
        serviceName: payload.serviceName.trim(),
        description: payload.description?.trim() || null,
        durationMinutes: Math.floor(Number(payload.durationMinutes)),
        rate: Number(payload.rate).toFixed(2),
        currency: "PKR",
        isActive: payload.isActive ?? true,
        updatedAt: new Date(),
      })
      .where(and(eq(hospitalServiceCatalog.id, serviceId), eq(hospitalServiceCatalog.hospitalId, hospitalId)))
      .returning();

    if (!updated) {
      throw createError("Service not found", 404);
    }
    return updated;
  }

  async setActive(hospitalUserId: string, serviceId: string, isActive: boolean) {
    const hospitalId = await this.getHospitalIdByUser(hospitalUserId);
    const [updated] = await db
      .update(hospitalServiceCatalog)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(hospitalServiceCatalog.id, serviceId), eq(hospitalServiceCatalog.hospitalId, hospitalId)))
      .returning();

    if (!updated) {
      throw createError("Service not found", 404);
    }
    return updated;
  }
}

export const hospitalServiceCatalogService = new HospitalServiceCatalogService();
