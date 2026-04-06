import { db } from "../config/database";
import { eq, and, desc, count, inArray, SQL } from "drizzle-orm";
import { createError, BadRequestError } from "../middleware/error.handler";
import { medicalStoreService } from "./medicalStore.service";
import { manufacturerService } from "./manufacturer.service";
import { manufacturers } from "../schema/manufacturers";
import { manufacturerMedicines } from "../schema/manufacturerMedicines";
import { medicines } from "../schema/medicine";
import { manufacturerWholesaleOrders } from "../schema/manufacturerWholesaleOrders";
import { manufacturerWholesaleOrderItems } from "../schema/manufacturerWholesaleOrderItems";
import { medicalStores } from "../schema/medicalStores";
import { buildSearchConditions } from "./utils/search.utils";
import { calculateOffset, normalizeLimit, normalizePage } from "./utils/pagination.utils";
import { isUuid } from "../utils/uuid";

const WHOLESALE_STATUSES = ["pending", "confirmed", "fulfilled", "cancelled"] as const;
export type WholesaleOrderStatus = (typeof WHOLESALE_STATUSES)[number];

function displayManufacturerName(shortName: string | null, legalName: string): string {
  const s = typeof shortName === "string" && shortName.trim().length > 0 ? shortName.trim() : null;
  if (s) return s;
  return legalName.trim();
}

function roundMoney(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export interface WholesaleManufacturerRow {
  id: string;
  legalName: string;
  shortName: string | null;
  displayName: string;
}

export interface WholesaleCatalogRow {
  listingId: string;
  medicineId: number;
  medicineName: string;
  wholesalePrice: string;
  moq: number;
  listedQuantity: number;
  currency: string;
}

export interface WholesaleCatalogResponse {
  items: WholesaleCatalogRow[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateWholesaleOrderLineInput {
  manufacturerMedicineId: string;
  quantity: number;
}

export interface CreateWholesaleOrderInput {
  manufacturerId: string;
  items: CreateWholesaleOrderLineInput[];
  notes?: string | null;
}

export interface WholesaleOrderSummaryRow {
  id: string;
  manufacturerId: string;
  medicalStoreId: string;
  status: string;
  currency: string;
  subtotal: string;
  total: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
manufacturerDisplayName?: string;
medicalStoreName?: string;
}

export interface WholesaleOrdersListResponse {
  items: WholesaleOrderSummaryRow[];
  total: number;
  page: number;
  limit: number;
}

export interface WholesaleOrderItemDetail {
  id: string;
  manufacturerMedicineId: string;
  medicineId: number;
  medicineName: string;
  quantity: number;
  moqSnapshot: number;
  unitPrice: string;
  lineTotal: string;
}

export interface MedicalStoreContactBlock {
  storeName: string;
  addressLine: string;
  city: string;
  province: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
}

export interface WholesaleOrderDetailResponse {
  order: WholesaleOrderSummaryRow;
  items: WholesaleOrderItemDetail[];
  medicalStore: MedicalStoreContactBlock;
}

export class WholesaleOrderService {
  async listManufacturersForMedicalStore(_userId: string): Promise<WholesaleManufacturerRow[]> {
    await medicalStoreService.resolveMedicalStoreIdForUser(_userId);
    const rows = await db
      .select({
        id: manufacturers.id,
        legalName: manufacturers.legalName,
        shortName: manufacturers.shortName,
      })
      .from(manufacturers)
      .where(eq(manufacturers.isActive, true))
      .orderBy(manufacturers.legalName);

    return rows.map((r) => ({
      id: r.id,
      legalName: r.legalName,
      shortName: r.shortName ?? null,
      displayName: displayManufacturerName(r.shortName ?? null, r.legalName),
    }));
  }

  async getManufacturerCatalog(
    userId: string,
    manufacturerIdParam: string,
    pageParam = 1,
    limitParam = 20,
    search?: string,
  ): Promise<WholesaleCatalogResponse> {
    if (!isUuid(manufacturerIdParam)) {
      throw BadRequestError("Invalid manufacturer ID");
    }
    await medicalStoreService.resolveMedicalStoreIdForUser(userId);

    const [mfr] = await db
      .select({ id: manufacturers.id })
      .from(manufacturers)
      .where(and(eq(manufacturers.id, manufacturerIdParam), eq(manufacturers.isActive, true)))
      .limit(1);
    if (!mfr) {
      throw createError("Manufacturer not found", 404);
    }

    const page = normalizePage(pageParam, 1);
    const limit = normalizeLimit(limitParam, { defaultLimit: 20, max: 100 });
    const offset = calculateOffset(page, limit);

    const searchCond = buildSearchConditions(search, [medicines.medicineName]);

    const whereBase = and(
      eq(manufacturerMedicines.manufacturerId, manufacturerIdParam),
      eq(manufacturerMedicines.isActive, true),
      searchCond,
    );

    const [totalRow] = await db
      .select({ n: count() })
      .from(manufacturerMedicines)
      .innerJoin(medicines, eq(medicines.id, manufacturerMedicines.medicineId))
      .where(whereBase);

    const rows = await db
      .select({
        listingId: manufacturerMedicines.id,
        medicineId: medicines.id,
        medicineName: medicines.medicineName,
        wholesalePrice: manufacturerMedicines.wholesalePrice,
        moq: manufacturerMedicines.moq,
        listedQuantity: manufacturerMedicines.listedQuantity,
        currency: manufacturerMedicines.currency,
      })
      .from(manufacturerMedicines)
      .innerJoin(medicines, eq(medicines.id, manufacturerMedicines.medicineId))
      .where(whereBase)
      .orderBy(medicines.medicineName)
      .limit(limit)
      .offset(offset);

    const items: WholesaleCatalogRow[] = rows.map((r) => ({
      listingId: r.listingId,
      medicineId: r.medicineId,
      medicineName: r.medicineName,
      wholesalePrice: String(r.wholesalePrice),
      moq: r.moq,
      listedQuantity: r.listedQuantity,
      currency: r.currency,
    }));

    return {
      items,
      total: totalRow?.n ?? 0,
      page,
      limit,
    };
  }

  private mergeLines(
    items: CreateWholesaleOrderLineInput[],
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const line of items) {
      const id = String(line.manufacturerMedicineId ?? "").trim();
      const q = Number(line.quantity);
      if (!isUuid(id)) {
        throw BadRequestError("Each item needs a valid manufacturerMedicineId");
      }
      if (!Number.isInteger(q) || q < 1) {
        throw BadRequestError("Each item quantity must be a positive integer");
      }
      map.set(id, (map.get(id) ?? 0) + q);
    }
    return map;
  }

  async createOrder(userId: string, input: CreateWholesaleOrderInput): Promise<WholesaleOrderSummaryRow> {
    const medicalStoreId = await medicalStoreService.resolveMedicalStoreIdForUser(userId);
    const manufacturerId = String(input.manufacturerId ?? "").trim();
    if (!isUuid(manufacturerId)) {
      throw BadRequestError("manufacturerId must be a valid UUID");
    }
    if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
      throw BadRequestError("items must be a non-empty array");
    }

    const merged = this.mergeLines(input.items);
    const listingIds = [...merged.keys()];

    const [mfr] = await db
      .select({ id: manufacturers.id })
      .from(manufacturers)
      .where(and(eq(manufacturers.id, manufacturerId), eq(manufacturers.isActive, true)))
      .limit(1);
    if (!mfr) {
      throw createError("Manufacturer not found", 404);
    }

    const listings = await db
      .select({
        id: manufacturerMedicines.id,
        medicineId: manufacturerMedicines.medicineId,
        wholesalePrice: manufacturerMedicines.wholesalePrice,
        moq: manufacturerMedicines.moq,
        currency: manufacturerMedicines.currency,
      })
      .from(manufacturerMedicines)
      .where(
        and(
          eq(manufacturerMedicines.manufacturerId, manufacturerId),
          eq(manufacturerMedicines.isActive, true),
          inArray(manufacturerMedicines.id, listingIds),
        ),
      );

    if (listings.length !== listingIds.length) {
      throw BadRequestError(
        "One or more listings are invalid, inactive, or do not belong to this manufacturer",
      );
    }

    type LinePrepared = {
      manufacturerMedicineId: string;
      medicineId: number;
      quantity: number;
      moq: number;
      unitPrice: number;
      lineTotal: number;
      currency: string;
    };

    const lines: LinePrepared[] = [];
    for (const row of listings) {
      const qty = merged.get(row.id)!;
      const moq = row.moq;
      if (qty < moq) {
        throw BadRequestError(
          `Quantity for a line must be at least MOQ (${moq}). Check listing ${row.id}.`,
        );
      }
      const unit = parseFloat(String(row.wholesalePrice));
      if (!Number.isFinite(unit) || unit <= 0) {
        throw BadRequestError("Invalid wholesale price on a listing");
      }
      const lineTotal = unit * qty;
      lines.push({
        manufacturerMedicineId: row.id,
        medicineId: row.medicineId,
        quantity: qty,
        moq,
        unitPrice: unit,
        lineTotal,
        currency: row.currency,
      });
    }

    const currencies = new Set(lines.map((l) => l.currency));
    if (currencies.size !== 1) {
      throw BadRequestError("Mixed currencies in one order are not supported");
    }
    const currency = lines[0]!.currency;

    const subtotalNum = lines.reduce((s, l) => s + l.lineTotal, 0);
    const subtotal = roundMoney(subtotalNum);
    const total = subtotal;

    const notes =
      input.notes != null && String(input.notes).trim() !== ""
        ? String(input.notes).trim().slice(0, 5000)
        : null;

    const [created] = await db.transaction(async (tx) => {
      const [orderRow] = await tx
        .insert(manufacturerWholesaleOrders)
        .values({
          medicalStoreId,
          manufacturerId,
          status: "pending",
          currency,
          subtotal,
          total,
          notes,
          updatedAt: new Date(),
        })
        .returning();

      if (!orderRow) {
        throw createError("Failed to create order", 500);
      }

      await tx.insert(manufacturerWholesaleOrderItems).values(
        lines.map((l) => ({
          orderId: orderRow.id,
          manufacturerMedicineId: l.manufacturerMedicineId,
          medicineId: l.medicineId,
          quantity: l.quantity,
          moqSnapshot: l.moq,
          unitPrice: roundMoney(l.unitPrice),
          lineTotal: roundMoney(l.lineTotal),
        })),
      );

      return [orderRow];
    });

    return this.mapOrderRow(created);
  }

  async listOrdersForMedicalStore(
    userId: string,
    pageParam = 1,
    limitParam = 20,
  ): Promise<WholesaleOrdersListResponse> {
    const medicalStoreId = await medicalStoreService.resolveMedicalStoreIdForUser(userId);
    const page = normalizePage(pageParam, 1);
    const limit = normalizeLimit(limitParam, { defaultLimit: 20, max: 100 });
    const offset = calculateOffset(page, limit);

    const [totalRow] = await db
      .select({ n: count() })
      .from(manufacturerWholesaleOrders)
      .where(eq(manufacturerWholesaleOrders.medicalStoreId, medicalStoreId));

    const rows = await db
      .select({
        order: manufacturerWholesaleOrders,
        legalName: manufacturers.legalName,
        shortName: manufacturers.shortName,
      })
      .from(manufacturerWholesaleOrders)
      .innerJoin(manufacturers, eq(manufacturers.id, manufacturerWholesaleOrders.manufacturerId))
      .where(eq(manufacturerWholesaleOrders.medicalStoreId, medicalStoreId))
      .orderBy(desc(manufacturerWholesaleOrders.createdAt))
      .limit(limit)
      .offset(offset);

    const items: WholesaleOrderSummaryRow[] = rows.map((r) => ({
      ...this.mapOrderRow(r.order),
      manufacturerDisplayName: displayManufacturerName(r.shortName ?? null, r.legalName),
    }));

    return {
      items,
      total: totalRow?.n ?? 0,
      page,
      limit,
    };
  }

  async listOrdersForManufacturer(
    userId: string,
    pageParam = 1,
    limitParam = 20,
    statusFilter?: string,
  ): Promise<WholesaleOrdersListResponse> {
    const manufacturerId = await manufacturerService.resolveManufacturerIdForUser(userId);
    const page = normalizePage(pageParam, 1);
    const limit = normalizeLimit(limitParam, { defaultLimit: 20, max: 100 });
    const offset = calculateOffset(page, limit);

    let statusCond: SQL | undefined;
    if (statusFilter && String(statusFilter).trim() !== "") {
      const st = String(statusFilter).trim().toLowerCase();
      if (!WHOLESALE_STATUSES.includes(st as WholesaleOrderStatus)) {
        throw BadRequestError(`status must be one of: ${WHOLESALE_STATUSES.join(", ")}`);
      }
      statusCond = eq(manufacturerWholesaleOrders.status, st);
    }

    const whereClause = statusCond
      ? and(eq(manufacturerWholesaleOrders.manufacturerId, manufacturerId), statusCond)
      : eq(manufacturerWholesaleOrders.manufacturerId, manufacturerId);

    const [totalRow] = await db
      .select({ n: count() })
      .from(manufacturerWholesaleOrders)
      .where(whereClause);

    const rows = await db
      .select({
        order: manufacturerWholesaleOrders,
        storeName: medicalStores.storeName,
      })
      .from(manufacturerWholesaleOrders)
      .innerJoin(medicalStores, eq(medicalStores.id, manufacturerWholesaleOrders.medicalStoreId))
      .where(whereClause)
      .orderBy(desc(manufacturerWholesaleOrders.createdAt))
      .limit(limit)
      .offset(offset);

    const items: WholesaleOrderSummaryRow[] = rows.map((r) => ({
      ...this.mapOrderRow(r.order),
      medicalStoreName: r.storeName,
    }));

    return {
      items,
      total: totalRow?.n ?? 0,
      page,
      limit,
    };
  }

  async getOrderDetailForManufacturer(
    userId: string,
    orderIdParam: string,
  ): Promise<WholesaleOrderDetailResponse> {
    if (!isUuid(orderIdParam)) {
      throw BadRequestError("Invalid order ID");
    }
    const manufacturerId = await manufacturerService.resolveManufacturerIdForUser(userId);

    const [row] = await db
      .select({
        order: manufacturerWholesaleOrders,
        storeName: medicalStores.storeName,
        addressLine: medicalStores.addressLine,
        city: medicalStores.city,
        province: medicalStores.province,
        postalCode: medicalStores.postalCode,
        country: medicalStores.country,
        phone: medicalStores.phone,
        email: medicalStores.email,
      })
      .from(manufacturerWholesaleOrders)
      .innerJoin(medicalStores, eq(medicalStores.id, manufacturerWholesaleOrders.medicalStoreId))
      .where(
        and(
          eq(manufacturerWholesaleOrders.id, orderIdParam),
          eq(manufacturerWholesaleOrders.manufacturerId, manufacturerId),
        ),
      )
      .limit(1);

    if (!row) {
      throw createError("Order not found", 404);
    }

    const itemRows = await db
      .select({
        item: manufacturerWholesaleOrderItems,
        medicineName: medicines.medicineName,
      })
      .from(manufacturerWholesaleOrderItems)
      .innerJoin(medicines, eq(medicines.id, manufacturerWholesaleOrderItems.medicineId))
      .where(eq(manufacturerWholesaleOrderItems.orderId, orderIdParam))
      .orderBy(medicines.medicineName);

    const items: WholesaleOrderItemDetail[] = itemRows.map((r) => ({
      id: r.item.id,
      manufacturerMedicineId: r.item.manufacturerMedicineId,
      medicineId: r.item.medicineId,
      medicineName: r.medicineName,
      quantity: r.item.quantity,
      moqSnapshot: r.item.moqSnapshot,
      unitPrice: String(r.item.unitPrice),
      lineTotal: String(r.item.lineTotal),
    }));

    const medicalStore: MedicalStoreContactBlock = {
      storeName: row.storeName,
      addressLine: row.addressLine,
      city: row.city,
      province: row.province ?? null,
      postalCode: row.postalCode ?? null,
      country: row.country,
      phone: row.phone ?? null,
      email: row.email ?? null,
    };

    return {
      order: this.mapOrderRow(row.order),
      items,
      medicalStore,
    };
  }

  async updateOrderStatusForManufacturer(
    userId: string,
    orderIdParam: string,
    nextStatus: string,
  ): Promise<WholesaleOrderSummaryRow> {
    if (!isUuid(orderIdParam)) {
      throw BadRequestError("Invalid order ID");
    }
    const manufacturerId = await manufacturerService.resolveManufacturerIdForUser(userId);
    const st = String(nextStatus ?? "")
      .trim()
      .toLowerCase();
    if (!WHOLESALE_STATUSES.includes(st as WholesaleOrderStatus)) {
      throw BadRequestError(`status must be one of: ${WHOLESALE_STATUSES.join(", ")}`);
    }

    const [existing] = await db
      .select()
      .from(manufacturerWholesaleOrders)
      .where(
        and(
          eq(manufacturerWholesaleOrders.id, orderIdParam),
          eq(manufacturerWholesaleOrders.manufacturerId, manufacturerId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw createError("Order not found", 404);
    }

    const cur = existing.status as WholesaleOrderStatus;
    if (cur === "cancelled" || cur === "fulfilled") {
      throw BadRequestError("Order cannot change status from its current state");
    }
    if (st === cur) {
      return this.mapOrderRow(existing);
    }
    if (cur === "pending" && (st === "confirmed" || st === "cancelled")) {
      // ok
    } else if (cur === "confirmed" && (st === "fulfilled" || st === "cancelled")) {
      // ok
    } else if (st === "pending") {
      throw BadRequestError("Invalid status transition");
    } else {
      throw BadRequestError("Invalid status transition");
    }

    const [updated] = await db
      .update(manufacturerWholesaleOrders)
      .set({
        status: st,
        updatedAt: new Date(),
      })
      .where(eq(manufacturerWholesaleOrders.id, orderIdParam))
      .returning();

    if (!updated) {
      throw createError("Failed to update order", 500);
    }
    return this.mapOrderRow(updated);
  }

  private mapOrderRow(order: typeof manufacturerWholesaleOrders.$inferSelect): WholesaleOrderSummaryRow {
    const createdAt =
      order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt);
    const updatedAt =
      order.updatedAt instanceof Date ? order.updatedAt.toISOString() : String(order.updatedAt);
    return {
      id: order.id,
      manufacturerId: order.manufacturerId,
      medicalStoreId: order.medicalStoreId,
      status: order.status,
      currency: order.currency,
      subtotal: String(order.subtotal),
      total: String(order.total),
      notes: order.notes ?? null,
      createdAt,
      updatedAt,
    };
  }
}

export const wholesaleOrderService = new WholesaleOrderService();
