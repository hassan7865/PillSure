import * as XLSX from "xlsx";
import { db } from "../config/database";
import { eq, and, sql, desc, count, ilike } from "drizzle-orm";
import { createError, ValidationError } from "../middleware/error.handler";
import { manufacturers } from "../schema/manufacturers";
import { medicines } from "../schema/medicine";
import { manufacturerMedicines } from "../schema/manufacturerMedicines";
import type { ManufacturerMedicineImportItem, ManufacturerMedicinesImportRequest } from "../core/types";
import { calculateOffset, normalizeLimit, normalizePage } from "./utils/pagination.utils";

// ---------------------------------------------------------------------------
// Name matching (same rules as SQL regexp_replace(lower(...), '[^a-z0-9]', '', 'g'))
// ---------------------------------------------------------------------------

function medicineMatchKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeMedicineDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// Excel import (xlsx)
// ---------------------------------------------------------------------------

function normalizeExcelHeader(h: string): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

type ExcelImportRow = {
  medicineName?: string;
  categoryName?: string;
  wholesalePrice: number | string;
  moq?: number;
  listedQuantity?: number;
  prescriptionRequired?: boolean;
};

type ExcelParsedRow = {
  medicineName?: string;
  categoryName?: string;
  wholesalePrice?: number | string;
  moq?: number;
  listedQuantity?: number;
  prescriptionRequired?: boolean;
};

const EXCEL_HEADER_ALIASES: Record<string, keyof ExcelParsedRow> = {
  medicine_name: "medicineName",
  medicine: "medicineName",
  product_name: "medicineName",
  product: "medicineName",
  item_name: "medicineName",
  name: "medicineName",
  category_name: "categoryName",
  drug_category: "categoryName",
  category: "categoryName",
  wholesale_price: "wholesalePrice",
  price: "wholesalePrice",
  unit_price: "wholesalePrice",
  wholesale: "wholesalePrice",
  moq: "moq",
  min_order: "moq",
  minimum_order_quantity: "moq",
  listed_quantity: "listedQuantity",
  quantity: "listedQuantity",
  qty: "listedQuantity",
  stock: "listedQuantity",
  prescription_required: "prescriptionRequired",
  rx_required: "prescriptionRequired",
  rx: "prescriptionRequired",
  prescription: "prescriptionRequired",
};

function parseExcelBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["yes", "y", "true", "1", "x"].includes(s)) return true;
  if (["no", "n", "false", "0"].includes(s)) return false;
  return undefined;
}

function parseExcelNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : undefined;
}

function excelRowIsEmpty(obj: Record<string, unknown>): boolean {
  return Object.values(obj).every((v) => v === undefined || v === null || String(v).trim() === "");
}

function parseManufacturerImportExcel(buffer: Buffer): {
  rows: ExcelImportRow[];
  parseWarnings: string[];
} {
  const parseWarnings: string[] = [];
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], parseWarnings: ["Workbook has no sheets."] };
  }
  const sheet = workbook.Sheets[sheetName];
  const dataRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (!dataRows.length) {
    return { rows: [], parseWarnings: ["Sheet is empty."] };
  }

  const rows: ExcelImportRow[] = [];
  let rowIndex = 0;
  for (const raw of dataRows) {
    rowIndex += 1;
    const mapped: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(raw)) {
      const nk = normalizeExcelHeader(key);
      const field = EXCEL_HEADER_ALIASES[nk];
      if (field) {
        mapped[field] = val;
      }
    }
    if (excelRowIsEmpty(mapped) || excelRowIsEmpty(raw)) {
      continue;
    }

    const pr: ExcelParsedRow = {};
    if (mapped.medicineName !== undefined && String(mapped.medicineName).trim() !== "") {
      pr.medicineName = String(mapped.medicineName).trim();
    }
    if (mapped.categoryName !== undefined && String(mapped.categoryName).trim() !== "") {
      pr.categoryName = String(mapped.categoryName).trim();
    }
    const wp = mapped.wholesalePrice;
    if (wp !== undefined && wp !== "" && wp !== null) {
      pr.wholesalePrice = String(wp).trim();
    }
    if (mapped.moq !== undefined && mapped.moq !== "") {
      const m = parseExcelNumber(mapped.moq);
      if (m !== undefined) pr.moq = Math.max(1, Math.floor(m));
    }
    if (mapped.listedQuantity !== undefined && mapped.listedQuantity !== "") {
      const q = parseExcelNumber(mapped.listedQuantity);
      if (q !== undefined) pr.listedQuantity = Math.max(0, Math.floor(q));
    }
    const rx = parseExcelBool(mapped.prescriptionRequired);
    if (rx !== undefined) pr.prescriptionRequired = rx;

    if (pr.wholesalePrice === undefined) {
      parseWarnings.push(`Row ${rowIndex}: missing wholesale price (Wholesale Price / Price) — skipped.`);
      continue;
    }

    rows.push({
      medicineName: pr.medicineName,
      categoryName: pr.categoryName,
      wholesalePrice: pr.wholesalePrice,
      moq: pr.moq,
      listedQuantity: pr.listedQuantity,
      prescriptionRequired: pr.prescriptionRequired,
    });
  }

  return { rows, parseWarnings };
}

function excelRowsToImportItems(rows: ExcelImportRow[]): {
  items: ManufacturerMedicineImportItem[];
  mappingWarnings: string[];
} {
  const items: ManufacturerMedicineImportItem[] = [];
  const mappingWarnings: string[] = [];
  rows.forEach((r, i) => {
    const rowLabel = `Excel row ${i + 1}`;
    if (!r.medicineName?.trim()) {
      mappingWarnings.push(`${rowLabel}: missing Medicine Name — skipped.`);
      return;
    }
    items.push({
      medicineName: r.medicineName.trim(),
      categoryName: r.categoryName?.trim(),
      wholesalePrice: r.wholesalePrice,
      moq: r.moq,
      listedQuantity: r.listedQuantity,
      prescriptionRequired: r.prescriptionRequired,
    });
  });
  return { items, mappingWarnings };
}
export function buildManufacturerImportTemplateBuffer(): Buffer {
  const headers = [
    "Medicine Name",
    "Wholesale Price",
    "MOQ",
    "Listed Quantity",
    "Prescription Required",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Import");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface ManufacturerImportSummary {
  createdMedicines: number;
  updatedListings: number;
  createdListings: number;
  errors: string[];
  warnings?: string[];
}

export interface ManufacturerListingRow {
  listingId: string;
  medicineId: number;
  medicineName: string;
  wholesalePrice: string;
  moq: number;
  listedQuantity: number;
  currency: string;
  isActive: boolean;
  updatedAt: string;
}

export interface ManufacturerListResponse {
  items: ManufacturerListingRow[];
  total: number;
  page: number;
  limit: number;
  stats: {
    totalListings: number;
    activeListings: number;
    totalListedUnits: number;
  };
}

export class ManufacturerService {
private async syncMedicinesIdSequence(): Promise<void> {
    await db.execute(sql`
      SELECT setval(
        pg_get_serial_sequence('public.medicines', 'id'),
        COALESCE((SELECT MAX(id) FROM public.medicines), 0) + 1,
        false
      )
    `);
  }

  async resolveManufacturerIdForUser(userId: string): Promise<string> {
    const rows = await db
      .select({ id: manufacturers.id })
      .from(manufacturers)
      .where(eq(manufacturers.userId, userId))
      .limit(1);
    if (!rows.length) {
      throw createError("Manufacturer profile not found", 404);
    }
    return rows[0].id;
  }
private sanitizeMedicineSearch(raw: string): string {
    return raw.trim().replace(/[%_\\]/g, " ").replace(/\s+/g, " ").trim();
  }

  async listListedMedicines(
    userId: string,
    pageParam = 1,
    limitParam = 20,
    searchRaw?: string,
  ): Promise<ManufacturerListResponse> {
    const manufacturerId = await this.resolveManufacturerIdForUser(userId);
    const page = normalizePage(pageParam, 1);
    const limit = normalizeLimit(limitParam, { defaultLimit: 20, max: 100 });
    const offset = calculateOffset(page, limit);

    const search = searchRaw ? this.sanitizeMedicineSearch(searchRaw) : "";
    const nameMatch =
      search.length > 0 ? ilike(medicines.medicineName, `%${search}%`) : undefined;

    const baseManufacturerFilter = eq(manufacturerMedicines.manufacturerId, manufacturerId);
    const listWhere = nameMatch ? and(baseManufacturerFilter, nameMatch) : baseManufacturerFilter;

    const [totalRow] = await db
      .select({ n: count() })
      .from(manufacturerMedicines)
      .innerJoin(medicines, eq(medicines.id, manufacturerMedicines.medicineId))
      .where(listWhere);

    const [activeRow] = await db
      .select({ n: count() })
      .from(manufacturerMedicines)
      .where(
        and(
          eq(manufacturerMedicines.manufacturerId, manufacturerId),
          eq(manufacturerMedicines.isActive, true),
        ),
      );

    const [unitsRow] = await db
      .select({
        u: sql<number>`coalesce(sum(${manufacturerMedicines.listedQuantity}), 0)::int`,
      })
      .from(manufacturerMedicines)
      .where(eq(manufacturerMedicines.manufacturerId, manufacturerId));

    const rows = await db
      .select({
        listingId: manufacturerMedicines.id,
        medicineId: medicines.id,
        medicineName: medicines.medicineName,
        wholesalePrice: manufacturerMedicines.wholesalePrice,
        moq: manufacturerMedicines.moq,
        listedQuantity: manufacturerMedicines.listedQuantity,
        currency: manufacturerMedicines.currency,
        isActive: manufacturerMedicines.isActive,
        updatedAt: manufacturerMedicines.updatedAt,
      })
      .from(manufacturerMedicines)
      .innerJoin(medicines, eq(medicines.id, manufacturerMedicines.medicineId))
      .where(listWhere)
      .orderBy(desc(manufacturerMedicines.updatedAt))
      .limit(limit)
      .offset(offset);

    const items: ManufacturerListingRow[] = rows.map((r) => ({
      listingId: r.listingId,
      medicineId: r.medicineId,
      medicineName: r.medicineName,
      wholesalePrice: String(r.wholesalePrice),
      moq: Number(r.moq) || 0,
      listedQuantity: Number(r.listedQuantity) || 0,
      currency: r.currency,
      isActive: r.isActive,
      updatedAt:
        r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
    }));

    const total = totalRow?.n ?? 0;
    const totalListedUnits = unitsRow?.u ?? 0;

    return {
      items,
      total,
      page,
      limit,
      stats: {
        totalListings: total,
        activeListings: activeRow?.n ?? 0,
        totalListedUnits,
      },
    };
  }

  async importMedicinesFromExcel(userId: string, buffer: Buffer): Promise<ManufacturerImportSummary> {
    const { rows, parseWarnings } = parseManufacturerImportExcel(buffer);
    const { items, mappingWarnings } = excelRowsToImportItems(rows);

    const warnings = [...parseWarnings, ...mappingWarnings];

    if (!items.length) {
      return {
        createdMedicines: 0,
        updatedListings: 0,
        createdListings: 0,
        errors: [],
        warnings:
          warnings.length > 0
            ? warnings
            : ["No importable rows. Check Medicine Name and Wholesale Price."],
      };
    }

    const result = await this.importMedicines(userId, { items });
    return {
      ...result,
      warnings: [...warnings, ...(result.warnings ?? [])],
    };
  }

  async importMedicines(
    userId: string,
    body: ManufacturerMedicinesImportRequest,
  ): Promise<ManufacturerImportSummary> {
    if (!body?.items || !Array.isArray(body.items)) {
      throw ValidationError("Request body must include an items array.");
    }

    const manufacturerId = await this.resolveManufacturerIdForUser(userId);

    const summary: ManufacturerImportSummary = {
      createdMedicines: 0,
      updatedListings: 0,
      createdListings: 0,
      errors: [],
    };

    await this.syncMedicinesIdSequence();

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      const rowLabel = `Row ${i + 1}`;
      try {
        await db.transaction(async (tx) => {
          const wholesaleRaw = item.wholesalePrice;
          if (wholesaleRaw === undefined || wholesaleRaw === null || wholesaleRaw === "") {
            throw new Error("wholesalePrice is required");
          }
          const wholesalePrice = String(wholesaleRaw);
          const moq = item.moq ?? 1;
          const listedQuantity = item.listedQuantity ?? 0;

          if (!item.medicineName?.trim()) {
            throw new Error("Medicine Name is required");
          }

          const medKey = medicineMatchKey(item.medicineName);
          if (!medKey) {
            throw new Error("Medicine name must contain at least one letter or digit (a–z, 0–9)");
          }
const existingMfrListing = await tx
            .select({
              listingId: manufacturerMedicines.id,
              medicineId: manufacturerMedicines.medicineId,
            })
            .from(manufacturerMedicines)
            .innerJoin(medicines, eq(medicines.id, manufacturerMedicines.medicineId))
            .where(
              and(
                eq(manufacturerMedicines.manufacturerId, manufacturerId),
                sql`regexp_replace(lower(${medicines.medicineName}), '[^a-z0-9]', '', 'g') = ${medKey}`,
              ),
            )
            .limit(1);

          if (existingMfrListing.length) {
            await tx
              .update(manufacturerMedicines)
              .set({
                wholesalePrice,
                moq,
                listedQuantity,
                updatedAt: new Date(),
              })
              .where(eq(manufacturerMedicines.id, existingMfrListing[0].listingId));
            summary.updatedListings += 1;
            return;
          }

          let medicineId: number | undefined;

          const found = await tx
            .select({ id: medicines.id })
            .from(medicines)
            .where(sql`regexp_replace(lower(${medicines.medicineName}), '[^a-z0-9]', '', 'g') = ${medKey}`)
            .limit(1);
          if (found.length) {
            medicineId = found[0].id;
          }

          if (medicineId == null) {
            const displayName = normalizeMedicineDisplayName(item.medicineName);
            const [inserted] = await tx
              .insert(medicines)
              .values({
                medicineName: displayName,
                prescriptionRequired: item.prescriptionRequired ?? false,
              })
              .returning({ id: medicines.id });
            medicineId = inserted.id;
            summary.createdMedicines += 1;
          }

          const existing = await tx
            .select({ id: manufacturerMedicines.id })
            .from(manufacturerMedicines)
            .where(
              and(
                eq(manufacturerMedicines.manufacturerId, manufacturerId),
                eq(manufacturerMedicines.medicineId, medicineId),
              ),
            )
            .limit(1);

          if (existing.length) {
            await tx
              .update(manufacturerMedicines)
              .set({
                wholesalePrice,
                moq,
                listedQuantity,
                updatedAt: new Date(),
              })
              .where(eq(manufacturerMedicines.id, existing[0].id));
            summary.updatedListings += 1;
          } else {
            await tx.insert(manufacturerMedicines).values({
              manufacturerId,
              medicineId,
              wholesalePrice,
              moq,
              listedQuantity,
              currency: "PKR",
              isActive: true,
            });
            summary.createdListings += 1;
          }
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        summary.errors.push(`${rowLabel}: ${msg}`);
      }
    }

    return summary;
  }

  async updateManufacturerListing(
    userId: string,
    listingId: string,
    body: {
      wholesalePrice: string | number;
      moq: number;
      listedQuantity: number;
      isActive?: boolean;
    },
  ): Promise<ManufacturerListingRow> {
    const manufacturerId = await this.resolveManufacturerIdForUser(userId);
    const wholesalePrice = String(body.wholesalePrice).trim();
    if (!wholesalePrice) {
      throw ValidationError("Wholesale price is required.");
    }
    const moq = Math.max(1, Math.floor(Number(body.moq) || 1));
    const listedQuantity = Math.max(0, Math.floor(Number(body.listedQuantity) || 0));

    const updated = await db
      .update(manufacturerMedicines)
      .set({
        wholesalePrice,
        moq,
        listedQuantity,
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(manufacturerMedicines.id, listingId),
          eq(manufacturerMedicines.manufacturerId, manufacturerId),
        ),
      )
      .returning({
        id: manufacturerMedicines.id,
        medicineId: manufacturerMedicines.medicineId,
        wholesalePrice: manufacturerMedicines.wholesalePrice,
        moq: manufacturerMedicines.moq,
        listedQuantity: manufacturerMedicines.listedQuantity,
        currency: manufacturerMedicines.currency,
        isActive: manufacturerMedicines.isActive,
        updatedAt: manufacturerMedicines.updatedAt,
      });

    const row = updated[0];
    if (!row) {
      throw createError("Listing not found", 404);
    }

    const [med] = await db
      .select({ medicineName: medicines.medicineName })
      .from(medicines)
      .where(eq(medicines.id, row.medicineId))
      .limit(1);

    return {
      listingId: row.id,
      medicineId: row.medicineId,
      medicineName: med?.medicineName ?? "",
      wholesalePrice: String(row.wholesalePrice),
      moq: Number(row.moq) || 0,
      listedQuantity: Number(row.listedQuantity) || 0,
      currency: row.currency,
      isActive: row.isActive,
      updatedAt:
        row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
  }
}

export const manufacturerService = new ManufacturerService();
