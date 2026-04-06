import { db } from "../config/database";
import { eq, and, desc, asc, count, sql, or, ilike, inArray } from "drizzle-orm";
import { createError, BadRequestError, ConflictError } from "../middleware/error.handler";
import { orders } from "../schema/orders";
import { orderItems } from "../schema/orderItems";
import { users } from "../schema/users";
import { medicalStores } from "../schema/medicalStores";
import { medicalStoreMedicines } from "../schema/medicalStoreMedicines";
import { medicalStoreCategories } from "../schema/medicalStoreCategories";
import { medicalStoreMedicineCategories } from "../schema/medicalStoreMedicineCategories";
import { medicines } from "../schema/medicine";
import { manufacturerMedicines } from "../schema/manufacturerMedicines";
import { manufacturers } from "../schema/manufacturers";
import { s3Service } from "./s3.service";
import { deleteOldImages, handleListingPackImageUpdate } from "./utils/image.utils";
import { calculateOffset, normalizeLimit, normalizePage } from "./utils/pagination.utils";
import { isUuid } from "../utils/uuid";

function firstPackImageUrl(pack: unknown): string | null {
  if (Array.isArray(pack)) {
    const u = pack.find((x) => typeof x === "string" && x.length > 0);
    if (u) return u as string;
  }
  return null;
}

function normalizePackImages(p: unknown): string[] | null {
  if (!Array.isArray(p)) return null;
  const urls = p.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return urls.length ? urls.map((u) => u.trim()) : null;
}

function normalizeListingFaqsFromDb(raw: unknown): Array<{ question: string; answer: string }> | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out: Array<{ question: string; answer: string }> = [];
  for (const item of raw) {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      out.push({
        question: String(o.question ?? ""),
        answer: String(o.answer ?? ""),
      });
    }
  }
  return out.length ? out : null;
}

function normalizeDrugDescriptionInput(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  return t.length ? t : null;
}

function faqsForDb(
  raw: Array<{ question: string; answer: string }> | null | undefined,
): Array<{ question: string; answer: string }> | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) {
    throw BadRequestError("faqs must be a JSON array of { question, answer } objects");
  }
  return normalizeListingFaqsFromDb(raw);
}
export interface MedicalStoreCategoryRef {
  id: string;
  name: string;
}

export interface MedicalStoreCategoryDto {
  id: string;
  medicalStoreId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalStoreCatalogRow {
  listingId: string;
  medicineId: number;
  medicineName: string;
categories: MedicalStoreCategoryRef[];
  retailPrice: string;
  listedQuantity: number;
  currency: string;
  isActive: boolean;
  prescriptionRequired: boolean;
displayImageUrl: string | null;
  packImages: string[] | null;
  manufacturerMedicineId: string | null;
manufacturerId: string | null;
  manufacturerName: string | null;
drugDescription: string | null;
  faqs: Array<{ question: string; answer: string }> | null;
  sortOrder: number;
  updatedAt: string;
}

export interface MedicalStoreCatalogResponse {
  items: MedicalStoreCatalogRow[];
  total: number;
  page: number;
  limit: number;
  stats: {
    totalSkus: number;
    activeSkus: number;
    totalUnitsListed: number;
  };
}
export interface PublicStoreSummary {
  id: string;
  storeName: string;
  addressLine: string;
  city: string;
  province: string | null;
  country: string;
  openingTime: string | null;
  closingTime: string | null;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  activeListingCount: number;
}

export interface PublicStoresListResponse {
  items: PublicStoreSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicStoreDetail {
  id: string;
  storeName: string;
  addressLine: string;
  city: string;
  province: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  openingTime: string | null;
  closingTime: string | null;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
}
export interface MarketplaceListingHit extends MedicalStoreCatalogRow {
  medicalStoreId: string;
  storeName: string;
}

export interface MarketplaceListingSearchResponse {
  items: MarketplaceListingHit[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicStoreCatalogResponse {
  items: MedicalStoreCatalogRow[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateMedicalStoreListingInput {
  medicineId: number;
  retailPrice: string | number;
  listedQuantity: number;
  currency?: string;
  packImages?: string[] | null;
  manufacturerMedicineId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
categoryIds?: string[];
  drugDescription?: string | null;
  faqs?: Array<{ question: string; answer: string }> | null;
}

export interface UpdateMedicalStoreListingInput {
  retailPrice?: string | number;
  listedQuantity?: number;
  currency?: string;
  packImages?: string[] | null;
  manufacturerMedicineId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
categoryIds?: string[];
  drugDescription?: string | null;
  faqs?: Array<{ question: string; answer: string }> | null;
}

type ListingJoinRow = {
  listingId: string;
  medicineId: number;
  medicineName: string;
  retailPrice: unknown;
  listedQuantity: number;
  currency: string;
  isActive: boolean;
  prescriptionRequired: boolean | null;
  packImages: unknown;
  manufacturerMedicineId: string | null;
  manufacturerId: string | null;
  manufacturerLegalName: string | null;
  manufacturerShortName: string | null;
  drugDescription: string | null;
  faqs: unknown;
  sortOrder: number;
  updatedAt: Date | string;
};

function displayManufacturerName(
  shortName: string | null | undefined,
  legalName: string | null | undefined,
): string | null {
  const s = typeof shortName === "string" && shortName.trim().length > 0 ? shortName.trim() : null;
  if (s) return s;
  const l = typeof legalName === "string" && legalName.trim().length > 0 ? legalName.trim() : null;
  return l;
}

function mapJoinToCatalogRow(
  r: ListingJoinRow,
  categories: MedicalStoreCategoryRef[],
): MedicalStoreCatalogRow {
  const pack = normalizePackImages(r.packImages);
  return {
    listingId: r.listingId,
    medicineId: r.medicineId,
    medicineName: r.medicineName,
    categories,
    retailPrice: String(r.retailPrice),
    listedQuantity: r.listedQuantity,
    currency: r.currency,
    isActive: r.isActive,
    prescriptionRequired: Boolean(r.prescriptionRequired),
    displayImageUrl: firstPackImageUrl(r.packImages),
    packImages: pack,
    manufacturerMedicineId: r.manufacturerMedicineId ?? null,
    manufacturerId: r.manufacturerId ?? null,
    manufacturerName: displayManufacturerName(r.manufacturerShortName, r.manufacturerLegalName),
    drugDescription: r.drugDescription ?? null,
    faqs: normalizeListingFaqsFromDb(r.faqs),
    sortOrder: r.sortOrder,
    updatedAt:
      r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  };
}

const listingJoinSelect = {
  listingId: medicalStoreMedicines.id,
  medicineId: medicines.id,
  medicineName: medicines.medicineName,
  retailPrice: medicalStoreMedicines.retailPrice,
  listedQuantity: medicalStoreMedicines.listedQuantity,
  currency: medicalStoreMedicines.currency,
  isActive: medicalStoreMedicines.isActive,
  prescriptionRequired: medicines.prescriptionRequired,
  packImages: medicalStoreMedicines.packImages,
  manufacturerMedicineId: medicalStoreMedicines.manufacturerMedicineId,
  manufacturerId: manufacturers.id,
  manufacturerLegalName: manufacturers.legalName,
  manufacturerShortName: manufacturers.shortName,
  drugDescription: medicalStoreMedicines.drugDescription,
  faqs: medicalStoreMedicines.faqs,
  sortOrder: medicalStoreMedicines.sortOrder,
  updatedAt: medicalStoreMedicines.updatedAt,
} as const;

const listingFromJoin = () =>
  db
    .select(listingJoinSelect)
    .from(medicalStoreMedicines)
    .innerJoin(medicines, eq(medicines.id, medicalStoreMedicines.medicineId))
    .leftJoin(
      manufacturerMedicines,
      eq(medicalStoreMedicines.manufacturerMedicineId, manufacturerMedicines.id),
    )
    .leftJoin(manufacturers, eq(manufacturerMedicines.manufacturerId, manufacturers.id));

async function loadCategoriesByListingIds(
  listingIds: string[],
): Promise<Map<string, MedicalStoreCategoryRef[]>> {
  const map = new Map<string, MedicalStoreCategoryRef[]>();
  if (listingIds.length === 0) return map;
  const uniqueIds = [...new Set(listingIds)];
  const rows = await db
    .select({
      listingId: medicalStoreMedicineCategories.medicalStoreMedicineId,
      catId: medicalStoreCategories.id,
      catName: medicalStoreCategories.name,
      sortOrder: medicalStoreCategories.sortOrder,
    })
    .from(medicalStoreMedicineCategories)
    .innerJoin(
      medicalStoreCategories,
      eq(medicalStoreMedicineCategories.categoryId, medicalStoreCategories.id),
    )
    .where(inArray(medicalStoreMedicineCategories.medicalStoreMedicineId, uniqueIds));

  const byListing = new Map<
    string,
    Array<{ catId: string; catName: string; sortOrder: number }>
  >();
  for (const r of rows) {
    const list = byListing.get(r.listingId) ?? [];
    list.push({ catId: r.catId, catName: r.catName, sortOrder: r.sortOrder });
    byListing.set(r.listingId, list);
  }
  for (const [lid, list] of byListing) {
    list.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.catName.localeCompare(b.catName);
    });
    map.set(
      lid,
      list.map((x) => ({ id: x.catId, name: x.catName })),
    );
  }
  return map;
}

const listingJoinWithStoreSelect = {
  ...listingJoinSelect,
  medicalStoreId: medicalStores.id,
  storeName: medicalStores.storeName,
} as const;

type ListingJoinRowWithStore = ListingJoinRow & {
  medicalStoreId: string;
  storeName: string;
};

function mapJoinToMarketplaceHit(
  r: ListingJoinRowWithStore,
  categories: MedicalStoreCategoryRef[],
): MarketplaceListingHit {
  const base = mapJoinToCatalogRow(r, categories);
  return {
    ...base,
    medicalStoreId: r.medicalStoreId,
    storeName: r.storeName,
  };
}
function listingFromJoinWithStore() {
  return db
    .select(listingJoinWithStoreSelect)
    .from(medicalStoreMedicines)
    .innerJoin(medicines, eq(medicines.id, medicalStoreMedicines.medicineId))
    .leftJoin(
      manufacturerMedicines,
      eq(medicalStoreMedicines.manufacturerMedicineId, manufacturerMedicines.id),
    )
    .leftJoin(manufacturers, eq(manufacturerMedicines.manufacturerId, manufacturers.id))
    .innerJoin(medicalStores, eq(medicalStoreMedicines.medicalStoreId, medicalStores.id));
}

const hasActiveListingForStore = sql`exists (
  select 1 from ${medicalStoreMedicines} msm
  where msm.medical_store_id = ${medicalStores.id} and msm.is_active = true
)`;

export class MedicalStoreService {
  async resolveMedicalStoreIdForUser(userId: string): Promise<string> {
    const rows = await db
      .select({ id: medicalStores.id })
      .from(medicalStores)
      .where(eq(medicalStores.userId, userId))
      .limit(1);
    if (!rows.length) {
      throw createError("Medical store profile not found", 404);
    }
    return rows[0].id;
  }

  private async assertCategoryIdsForStore(
    medicalStoreId: string,
    categoryIds: string[],
  ): Promise<void> {
    if (categoryIds.length === 0) return;
    const unique = [...new Set(categoryIds)];
    for (const id of unique) {
      if (!isUuid(id)) {
        throw BadRequestError("Each category id must be a valid UUID");
      }
    }
    const rows = await db
      .select({ id: medicalStoreCategories.id })
      .from(medicalStoreCategories)
      .where(
        and(
          eq(medicalStoreCategories.medicalStoreId, medicalStoreId),
          inArray(medicalStoreCategories.id, unique),
        ),
      );
    if (rows.length !== unique.length) {
      throw BadRequestError("One or more categories are invalid for this store");
    }
  }

  private async replaceListingCategoryLinks(
    listingId: string,
    medicalStoreId: string,
    categoryIds: string[],
  ): Promise<void> {
    await this.assertCategoryIdsForStore(medicalStoreId, categoryIds);
    const unique = [...new Set(categoryIds)];
    await db
      .delete(medicalStoreMedicineCategories)
      .where(eq(medicalStoreMedicineCategories.medicalStoreMedicineId, listingId));
    if (unique.length === 0) return;
    await db.insert(medicalStoreMedicineCategories).values(
      unique.map((categoryId) => ({
        medicalStoreMedicineId: listingId,
        categoryId,
      })),
    );
  }

  private mapCategoryRow(r: typeof medicalStoreCategories.$inferSelect): MedicalStoreCategoryDto {
    return {
      id: r.id,
      medicalStoreId: r.medicalStoreId,
      name: r.name,
      sortOrder: r.sortOrder,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
    };
  }

  async listStoreCategories(userId: string): Promise<MedicalStoreCategoryDto[]> {
    const medicalStoreId = await this.resolveMedicalStoreIdForUser(userId);
    const rows = await db
      .select()
      .from(medicalStoreCategories)
      .where(eq(medicalStoreCategories.medicalStoreId, medicalStoreId))
      .orderBy(asc(medicalStoreCategories.sortOrder), asc(medicalStoreCategories.name));
    return rows.map((r) => this.mapCategoryRow(r));
  }

  async createStoreCategory(
    userId: string,
    input: { name: string; sortOrder?: number },
  ): Promise<MedicalStoreCategoryDto> {
    const medicalStoreId = await this.resolveMedicalStoreIdForUser(userId);
    const name = String(input.name ?? "").trim();
    if (!name) throw BadRequestError("Category name is required");
    if (name.length > 500) throw BadRequestError("Category name is too long");
    const sortOrder = Number(input.sortOrder ?? 0);
    if (!Number.isInteger(sortOrder)) throw BadRequestError("sortOrder must be an integer");
    try {
      const [row] = await db
        .insert(medicalStoreCategories)
        .values({ medicalStoreId, name, sortOrder, updatedAt: new Date() })
        .returning();
      if (!row) throw createError("Failed to create category", 500);
      return this.mapCategoryRow(row);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "23505") {
        throw ConflictError("A category with this name already exists for your store");
      }
      throw e;
    }
  }

  async updateStoreCategory(
    userId: string,
    categoryId: string,
    input: { name?: string; sortOrder?: number },
  ): Promise<MedicalStoreCategoryDto> {
    if (!isUuid(categoryId)) throw BadRequestError("Invalid category ID");
    const medicalStoreId = await this.resolveMedicalStoreIdForUser(userId);
    const patch: Partial<typeof medicalStoreCategories.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.name !== undefined) {
      const name = String(input.name).trim();
      if (!name) throw BadRequestError("Category name cannot be empty");
      if (name.length > 500) throw BadRequestError("Category name is too long");
      patch.name = name;
    }
    if (input.sortOrder !== undefined) {
      const so = Number(input.sortOrder);
      if (!Number.isInteger(so)) throw BadRequestError("sortOrder must be an integer");
      patch.sortOrder = so;
    }
    if (Object.keys(patch).length <= 1) {
      const [cur] = await db
        .select()
        .from(medicalStoreCategories)
        .where(
          and(
            eq(medicalStoreCategories.id, categoryId),
            eq(medicalStoreCategories.medicalStoreId, medicalStoreId),
          ),
        )
        .limit(1);
      if (!cur) throw createError("Category not found", 404);
      return this.mapCategoryRow(cur);
    }
    try {
      const [row] = await db
        .update(medicalStoreCategories)
        .set(patch)
        .where(
          and(
            eq(medicalStoreCategories.id, categoryId),
            eq(medicalStoreCategories.medicalStoreId, medicalStoreId),
          ),
        )
        .returning();
      if (!row) throw createError("Category not found", 404);
      return this.mapCategoryRow(row);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "23505") {
        throw ConflictError("A category with this name already exists for your store");
      }
      throw e;
    }
  }

  async deleteStoreCategory(userId: string, categoryId: string): Promise<void> {
    if (!isUuid(categoryId)) throw BadRequestError("Invalid category ID");
    const medicalStoreId = await this.resolveMedicalStoreIdForUser(userId);
    const deleted = await db
      .delete(medicalStoreCategories)
      .where(
        and(
          eq(medicalStoreCategories.id, categoryId),
          eq(medicalStoreCategories.medicalStoreId, medicalStoreId),
        ),
      )
      .returning({ id: medicalStoreCategories.id });
    if (!deleted.length) {
      throw createError("Category not found", 404);
    }
  }

  async getListing(userId: string, listingId: string): Promise<MedicalStoreCatalogRow> {
    if (!isUuid(listingId)) {
      throw BadRequestError("Invalid listing ID");
    }
    const medicalStoreId = await this.resolveMedicalStoreIdForUser(userId);
    const rows = await listingFromJoin()
      .where(
        and(
          eq(medicalStoreMedicines.id, listingId),
          eq(medicalStoreMedicines.medicalStoreId, medicalStoreId),
        ),
      )
      .limit(1);
    if (!rows.length) {
      throw createError("Listing not found", 404);
    }
    const row = rows[0] as ListingJoinRow;
    const catMap = await loadCategoriesByListingIds([row.listingId]);
    return mapJoinToCatalogRow(row, catMap.get(row.listingId) ?? []);
  }

  async createListing(
    userId: string,
    input: CreateMedicalStoreListingInput,
    packImageFiles: Express.Multer.File[] = [],
  ): Promise<MedicalStoreCatalogRow> {
    const medicalStoreId = await this.resolveMedicalStoreIdForUser(userId);
    const medicineId = Number(input.medicineId);
    if (!Number.isInteger(medicineId) || medicineId < 1) {
      throw BadRequestError("medicineId must be a positive integer");
    }
    const qty = Number(input.listedQuantity);
    if (!Number.isInteger(qty) || qty < 0) {
      throw BadRequestError("listedQuantity must be a non-negative integer");
    }
    const priceNum = typeof input.retailPrice === "string" ? parseFloat(input.retailPrice) : Number(input.retailPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      throw BadRequestError("retailPrice must be a positive number");
    }
    const currency = (input.currency ?? "PKR").trim().slice(0, 10) || "PKR";
    let sortOrder = Number(input.sortOrder ?? 0);
    if (!Number.isInteger(sortOrder)) {
      throw BadRequestError("sortOrder must be an integer");
    }
    let manufacturerMedicineId: string | null = null;
    if (input.manufacturerMedicineId != null && String(input.manufacturerMedicineId).trim() !== "") {
      const mid = String(input.manufacturerMedicineId).trim();
      if (!isUuid(mid)) {
        throw BadRequestError("manufacturerMedicineId must be a valid UUID");
      }
      manufacturerMedicineId = mid;
    }
    let packUrls: string[] = [];
    if (input.packImages != null) {
      if (!Array.isArray(input.packImages)) {
        throw BadRequestError("packImages must be an array of URL strings");
      }
      const n = normalizePackImages(input.packImages);
      if (n?.length) packUrls = [...n];
    }
    if (packImageFiles.length > 0) {
      const uploaded = await s3Service.uploadMultipleFiles(packImageFiles, {
        folder: "store-pack-images",
      });
      packUrls = [...packUrls, ...uploaded.map((u) => u.url)];
    }
    if (packUrls.length > 4) {
      throw BadRequestError("Maximum 4 pack images allowed");
    }
    const packImages: string[] | null = packUrls.length ? packUrls : null;

    const [exists] = await db
      .select({ id: medicines.id })
      .from(medicines)
      .where(eq(medicines.id, medicineId))
      .limit(1);
    if (!exists) {
      throw createError("Medicine not found", 404);
    }

    let newId: string;
    try {
      const inserted = await db
        .insert(medicalStoreMedicines)
        .values({
          medicalStoreId,
          medicineId,
          retailPrice: String(priceNum),
          listedQuantity: qty,
          currency,
          packImages,
          manufacturerMedicineId,
          isActive: input.isActive ?? true,
          sortOrder,
          drugDescription: normalizeDrugDescriptionInput(input.drugDescription),
          faqs: faqsForDb(input.faqs),
        })
        .returning({ id: medicalStoreMedicines.id });
      newId = inserted[0]!.id;
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "23505") {
        throw ConflictError("This medicine is already listed in your catalog");
      }
      throw e;
    }

    if (input.categoryIds !== undefined) {
      if (!Array.isArray(input.categoryIds)) {
        throw BadRequestError("categoryIds must be an array of UUID strings");
      }
      await this.replaceListingCategoryLinks(newId, medicalStoreId, input.categoryIds);
    }

    return this.getListing(userId, newId);
  }

  async updateListing(
    userId: string,
    listingId: string,
    input: UpdateMedicalStoreListingInput,
    packImageOptions?: {
      files?: Express.Multer.File[];
      existingPackImageUrls?: string[] | null;
    },
  ): Promise<MedicalStoreCatalogRow> {
    if (!isUuid(listingId)) {
      throw BadRequestError("Invalid listing ID");
    }
    const medicalStoreId = await this.resolveMedicalStoreIdForUser(userId);

    const patch: Record<string, unknown> = {};
    let packImagesToDeleteFromS3: string[] = [];

    if (
      packImageOptions &&
      (packImageOptions.files?.length ||
        packImageOptions.existingPackImageUrls !== undefined)
    ) {
      const [curRow] = await db
        .select({ packImages: medicalStoreMedicines.packImages })
        .from(medicalStoreMedicines)
        .where(
          and(
            eq(medicalStoreMedicines.id, listingId),
            eq(medicalStoreMedicines.medicalStoreId, medicalStoreId),
          ),
        )
        .limit(1);
      if (!curRow) {
        throw createError("Listing not found", 404);
      }
      const current = normalizePackImages(curRow.packImages) ?? [];
      const existing =
        packImageOptions.existingPackImageUrls !== undefined
          ? [...(packImageOptions.existingPackImageUrls ?? [])]
          : [...current];
      const files = packImageOptions.files ?? [];
      const result = await handleListingPackImageUpdate(current, existing, files, 4);
      patch.packImages = result.finalImages.length ? result.finalImages : null;
      packImagesToDeleteFromS3 = result.imagesToDelete;
    }

    if (input.retailPrice !== undefined) {
      const priceNum =
        typeof input.retailPrice === "string" ? parseFloat(input.retailPrice) : Number(input.retailPrice);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        throw BadRequestError("retailPrice must be a positive number");
      }
      patch.retailPrice = String(priceNum);
    }
    if (input.listedQuantity !== undefined) {
      const qty = Number(input.listedQuantity);
      if (!Number.isInteger(qty) || qty < 0) {
        throw BadRequestError("listedQuantity must be a non-negative integer");
      }
      patch.listedQuantity = qty;
    }
    if (input.currency !== undefined) {
      patch.currency = String(input.currency).trim().slice(0, 10) || "PKR";
    }
    if (
      input.packImages !== undefined &&
      !(packImageOptions &&
        (packImageOptions.files?.length || packImageOptions.existingPackImageUrls !== undefined))
    ) {
      if (input.packImages !== null && !Array.isArray(input.packImages)) {
        throw BadRequestError("packImages must be an array of URL strings or null");
      }
      patch.packImages = input.packImages === null ? null : normalizePackImages(input.packImages);
    }
    if (input.manufacturerMedicineId !== undefined) {
      if (input.manufacturerMedicineId === null || String(input.manufacturerMedicineId).trim() === "") {
        patch.manufacturerMedicineId = null;
      } else {
        const mid = String(input.manufacturerMedicineId).trim();
        if (!isUuid(mid)) {
          throw BadRequestError("manufacturerMedicineId must be a valid UUID");
        }
        patch.manufacturerMedicineId = mid;
      }
    }
    if (input.isActive !== undefined) {
      patch.isActive = Boolean(input.isActive);
    }
    if (input.sortOrder !== undefined) {
      const so = Number(input.sortOrder);
      if (!Number.isInteger(so)) {
        throw BadRequestError("sortOrder must be an integer");
      }
      patch.sortOrder = so;
    }
    if (input.drugDescription !== undefined) {
      patch.drugDescription = normalizeDrugDescriptionInput(input.drugDescription);
    }
    if (input.faqs !== undefined) {
      patch.faqs = input.faqs === null ? null : faqsForDb(input.faqs);
    }

    const hasCategoryUpdate = input.categoryIds !== undefined;
    if (hasCategoryUpdate) {
      if (!Array.isArray(input.categoryIds)) {
        throw BadRequestError("categoryIds must be an array of UUID strings");
      }
      await this.replaceListingCategoryLinks(listingId, medicalStoreId, input.categoryIds);
    }

    if (Object.keys(patch).length === 0) {
      return this.getListing(userId, listingId);
    }

    patch.updatedAt = new Date();

    const updated = await db
      .update(medicalStoreMedicines)
      .set(patch as typeof medicalStoreMedicines.$inferInsert)
      .where(
        and(
          eq(medicalStoreMedicines.id, listingId),
          eq(medicalStoreMedicines.medicalStoreId, medicalStoreId),
        ),
      )
      .returning({ id: medicalStoreMedicines.id });

    if (!updated.length) {
      throw createError("Listing not found", 404);
    }

    if (packImagesToDeleteFromS3.length > 0) {
      await deleteOldImages(packImagesToDeleteFromS3);
    }

    return this.getListing(userId, listingId);
  }

  async deleteListing(userId: string, listingId: string): Promise<void> {
    if (!isUuid(listingId)) {
      throw BadRequestError("Invalid listing ID");
    }
    const medicalStoreId = await this.resolveMedicalStoreIdForUser(userId);
    const deleted = await db
      .delete(medicalStoreMedicines)
      .where(
        and(
          eq(medicalStoreMedicines.id, listingId),
          eq(medicalStoreMedicines.medicalStoreId, medicalStoreId),
        ),
      )
      .returning({ id: medicalStoreMedicines.id });
    if (!deleted.length) {
      throw createError("Listing not found", 404);
    }
  }

  async listStoreCatalog(
    userId: string,
    pageParam = 1,
    limitParam = 12,
  ): Promise<MedicalStoreCatalogResponse> {
    const medicalStoreId = await this.resolveMedicalStoreIdForUser(userId);
    const page = normalizePage(pageParam, 1);
    const limit = normalizeLimit(limitParam, { defaultLimit: 12, max: 100 });
    const offset = calculateOffset(page, limit);

    const [totalRow] = await db
      .select({ n: count() })
      .from(medicalStoreMedicines)
      .where(eq(medicalStoreMedicines.medicalStoreId, medicalStoreId));

    const [activeRow] = await db
      .select({ n: count() })
      .from(medicalStoreMedicines)
      .where(
        and(
          eq(medicalStoreMedicines.medicalStoreId, medicalStoreId),
          eq(medicalStoreMedicines.isActive, true),
        ),
      );

    const [unitsRow] = await db
      .select({
        u: sql<number>`coalesce(sum(${medicalStoreMedicines.listedQuantity}), 0)::int`,
      })
      .from(medicalStoreMedicines)
      .where(eq(medicalStoreMedicines.medicalStoreId, medicalStoreId));

    const rows = await listingFromJoin()
      .where(eq(medicalStoreMedicines.medicalStoreId, medicalStoreId))
      .orderBy(desc(medicalStoreMedicines.updatedAt))
      .limit(limit)
      .offset(offset);

    const listingIds = rows.map((r) => (r as ListingJoinRow).listingId);
    const catMap = await loadCategoriesByListingIds(listingIds);
    const items: MedicalStoreCatalogRow[] = rows.map((r) => {
      const row = r as ListingJoinRow;
      return mapJoinToCatalogRow(row, catMap.get(row.listingId) ?? []);
    });

    const total = totalRow?.n ?? 0;
    const totalListedUnits = unitsRow?.u ?? 0;

    return {
      items,
      total,
      page,
      limit,
      stats: {
        totalSkus: total,
        activeSkus: activeRow?.n ?? 0,
        totalUnitsListed: totalListedUnits,
      },
    };
  }
async listPublicStores(params: {
    page?: number;
    limit?: number;
    q?: string;
    lat?: number;
    lng?: number;
  }): Promise<PublicStoresListResponse> {
    const page = normalizePage(params.page, 1);
    const limit = normalizeLimit(params.limit, { defaultLimit: 12, max: 50 });
    const offset = calculateOffset(page, limit);
    const q = params.q?.trim();

    const searchCond =
      q && q.length > 0
        ? or(ilike(medicalStores.storeName, `%${q}%`), ilike(medicalStores.city, `%${q}%`))
        : undefined;

    const storeFilters = and(eq(medicalStores.isActive, true), searchCond);
const listingAgg = db
      .select({
        storeId: medicalStoreMedicines.medicalStoreId,
        activeListingCount: sql<number>`count(*)::int`.as("activeListingCount"),
      })
      .from(medicalStoreMedicines)
      .where(eq(medicalStoreMedicines.isActive, true))
      .groupBy(medicalStoreMedicines.medicalStoreId)
      .as("listing_agg");

    const [totalRow] = await db
      .select({ n: count() })
      .from(medicalStores)
      .innerJoin(listingAgg, eq(medicalStores.id, listingAgg.storeId))
      .where(storeFilters);

    const geo =
      params.lat != null &&
      params.lng != null &&
      Number.isFinite(params.lat) &&
      Number.isFinite(params.lng)
        ? { lat: params.lat, lng: params.lng }
        : null;

    const rows = await db
      .select({
        id: medicalStores.id,
        storeName: medicalStores.storeName,
        addressLine: medicalStores.addressLine,
        city: medicalStores.city,
        province: medicalStores.province,
        country: medicalStores.country,
        openingTime: medicalStores.openingTime,
        closingTime: medicalStores.closingTime,
        latitude: medicalStores.latitude,
        longitude: medicalStores.longitude,
        logoUrl: medicalStores.logoUrl,
        activeListingCount: listingAgg.activeListingCount,
      })
      .from(medicalStores)
      .innerJoin(listingAgg, eq(medicalStores.id, listingAgg.storeId))
      .where(storeFilters)
      .orderBy(
        geo
          ? sql`(case when ${medicalStores.latitude} is null or ${medicalStores.longitude} is null then 1 else 0 end), (
              (${medicalStores.latitude}::float8 - ${geo.lat}) * (${medicalStores.latitude}::float8 - ${geo.lat}) +
              (${medicalStores.longitude}::float8 - ${geo.lng}) * (${medicalStores.longitude}::float8 - ${geo.lng})
            )`
          : asc(medicalStores.storeName),
      )
      .limit(limit)
      .offset(offset);

    const items: PublicStoreSummary[] = rows.map((r) => ({
      id: r.id,
      storeName: r.storeName,
      addressLine: r.addressLine,
      city: r.city,
      province: r.province,
      country: r.country,
      openingTime: r.openingTime ?? null,
      closingTime: r.closingTime ?? null,
      latitude: r.latitude,
      longitude: r.longitude,
      logoUrl: r.logoUrl ?? null,
      activeListingCount: Number(r.activeListingCount ?? 0),
    }));

    return {
      items,
      total: totalRow?.n ?? 0,
      page,
      limit,
    };
  }

  async getPublicStoreById(storeId: string): Promise<PublicStoreDetail> {
    if (!isUuid(storeId)) {
      throw BadRequestError("Invalid store ID");
    }
    const [row] = await db
      .select({
        id: medicalStores.id,
        storeName: medicalStores.storeName,
        addressLine: medicalStores.addressLine,
        city: medicalStores.city,
        province: medicalStores.province,
        postalCode: medicalStores.postalCode,
        country: medicalStores.country,
        phone: medicalStores.phone,
        openingTime: medicalStores.openingTime,
        closingTime: medicalStores.closingTime,
        latitude: medicalStores.latitude,
        longitude: medicalStores.longitude,
        logoUrl: medicalStores.logoUrl,
      })
      .from(medicalStores)
      .where(and(eq(medicalStores.id, storeId), eq(medicalStores.isActive, true)))
      .limit(1);
    if (!row) {
      throw createError("Store not found", 404);
    }
    return row;
  }
async getPublicStoreCatalog(
    storeId: string,
    pageParam = 1,
    limitParam = 12,
    medicineIdFilter?: number,
  ): Promise<PublicStoreCatalogResponse> {
    if (!isUuid(storeId)) {
      throw BadRequestError("Invalid store ID");
    }
    const [store] = await db
      .select({ id: medicalStores.id })
      .from(medicalStores)
      .where(and(eq(medicalStores.id, storeId), eq(medicalStores.isActive, true)))
      .limit(1);
    if (!store) {
      throw createError("Store not found", 404);
    }

    const page = normalizePage(pageParam, 1);
    const limit = normalizeLimit(limitParam, { defaultLimit: 12, max: 100 });
    const offset = calculateOffset(page, limit);

    const listingFilters = [
      eq(medicalStoreMedicines.medicalStoreId, storeId),
      eq(medicalStoreMedicines.isActive, true),
    ];
    if (medicineIdFilter != null && Number.isFinite(medicineIdFilter)) {
      listingFilters.push(eq(medicalStoreMedicines.medicineId, Math.floor(medicineIdFilter)));
    }
    const baseListingCond = and(...listingFilters);

    const [totalRow] = await db
      .select({ n: count() })
      .from(medicalStoreMedicines)
      .where(baseListingCond);

    const rows = await listingFromJoin()
      .where(baseListingCond)
      .orderBy(desc(medicalStoreMedicines.updatedAt))
      .limit(limit)
      .offset(offset);

    const listingIds = rows.map((r) => (r as ListingJoinRow).listingId);
    const catMap = await loadCategoriesByListingIds(listingIds);
    const items: MedicalStoreCatalogRow[] = rows.map((r) => {
      const row = r as ListingJoinRow;
      return mapJoinToCatalogRow(row, catMap.get(row.listingId) ?? []);
    });

    return {
      items,
      total: totalRow?.n ?? 0,
      page,
      limit,
    };
  }
async searchPublicListings(params: {
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<MarketplaceListingSearchResponse> {
    const page = normalizePage(params.page, 1);
    const limit = normalizeLimit(params.limit, { defaultLimit: 20, max: 50 });
    const offset = calculateOffset(page, limit);
    const q = params.q?.trim();

    const baseConditions = [eq(medicalStores.isActive, true), eq(medicalStoreMedicines.isActive, true)];
    if (q && q.length > 0) {
      const pattern = `%${q}%`;
      baseConditions.push(
        or(
          ilike(medicines.medicineName, pattern),
          ilike(medicalStores.storeName, pattern),
          ilike(medicalStores.city, pattern),
        )!,
      );
    }
    const whereClause = and(...baseConditions);

    const [totalRow] = await db
      .select({ n: count() })
      .from(medicalStoreMedicines)
      .innerJoin(medicines, eq(medicines.id, medicalStoreMedicines.medicineId))
      .innerJoin(medicalStores, eq(medicalStoreMedicines.medicalStoreId, medicalStores.id))
      .where(whereClause);

    const rows = await listingFromJoinWithStore()
      .where(whereClause)
      .orderBy(desc(medicalStoreMedicines.updatedAt))
      .limit(limit)
      .offset(offset);

    const listingIds = rows.map((r) => (r as ListingJoinRowWithStore).listingId);
    const catMap = await loadCategoriesByListingIds(listingIds);
    const items: MarketplaceListingHit[] = rows.map((r) => {
      const row = r as ListingJoinRowWithStore;
      return mapJoinToMarketplaceHit(row, catMap.get(row.listingId) ?? []);
    });

    return {
      items,
      total: totalRow?.n ?? 0,
      page,
      limit,
    };
  }
async listRetailOrders(userId: string, page: number, limit: number) {
    const medicalStoreId = await this.resolveMedicalStoreIdForUser(userId);
    const safePage = normalizePage(page, 1);
    const safeLimit = normalizeLimit(limit, { defaultLimit: 20, max: 100 });
    const offset = calculateOffset(safePage, safeLimit);

    const whereClause = eq(orders.medicalStoreId, medicalStoreId);

    const rows = await db
      .select({
        id: orders.id,
        patientId: orders.patientId,
        patientName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        patientEmail: users.email,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        total: orders.total,
        currency: orders.currency,
        shippingAddress: orders.shippingAddress,
        contactNo: orders.contactNo,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .innerJoin(users, eq(orders.patientId, users.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(safeLimit)
      .offset(offset);

    const [countRow] = await db.select({ n: count() }).from(orders).where(whereClause);

    const total = Number(countRow?.n ?? 0);

    const orderIds = rows.map((r) => r.id);
    const linesByOrderId = new Map<
      string,
      Array<{
        medicineId: number;
        medicineName: string;
        quantity: number;
        unitPrice: string;
        lineTotal: string;
        images: unknown;
      }>
    >();

    if (orderIds.length > 0) {
      const lineRows = await db
        .select({
          orderId: orderItems.orderId,
          medicineId: orderItems.medicineId,
          medicineName: medicines.medicineName,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          lineTotal: orderItems.lineTotal,
          images: sql`null::jsonb`,
        })
        .from(orderItems)
        .innerJoin(medicines, eq(orderItems.medicineId, medicines.id))
        .where(inArray(orderItems.orderId, orderIds))
        .orderBy(asc(orderItems.createdAt), asc(orderItems.id));

      for (const line of lineRows) {
        const oid = line.orderId;
        const list = linesByOrderId.get(oid) ?? [];
        list.push({
          medicineId: line.medicineId,
          medicineName: line.medicineName,
          quantity: Number(line.quantity),
          unitPrice: String(line.unitPrice),
          lineTotal: String(line.lineTotal),
          images: line.images,
        });
        linesByOrderId.set(oid, list);
      }
    }

    return {
      items: rows.map((row) => ({
        ...row,
        lines: linesByOrderId.get(row.id) ?? [],
      })),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async updateRetailOrderStatus(userId: string, orderId: string, status: string) {
    const valid = new Set(["pending", "placed", "shipped", "delivered", "returned"]);
    const s = String(status || "").toLowerCase();
    if (!valid.has(s)) throw createError("Invalid order status", 400);

    const medicalStoreId = await this.resolveMedicalStoreIdForUser(userId);

    const updated = await db
      .update(orders)
      .set({ status: s, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.medicalStoreId, medicalStoreId)))
      .returning();

    if (!updated.length) throw createError("Order not found", 404);
    return updated[0];
  }

  async updateStoreLogo(userId: string, file: Express.Multer.File): Promise<{ logoUrl: string }> {
    if (!file?.buffer?.length) {
      throw BadRequestError("Logo image is required");
    }
    const medicalStoreId = await this.resolveMedicalStoreIdForUser(userId);
    const [cur] = await db
      .select({ logoUrl: medicalStores.logoUrl })
      .from(medicalStores)
      .where(eq(medicalStores.id, medicalStoreId))
      .limit(1);
    const oldUrl = cur?.logoUrl;
    const [uploaded] = await s3Service.uploadMultipleFiles([file], { folder: "medical-store-logos" });
    const logoUrl = uploaded.url;
    if (oldUrl) await deleteOldImages([oldUrl]);
    await db
      .update(medicalStores)
      .set({ logoUrl, updatedAt: new Date() })
      .where(eq(medicalStores.id, medicalStoreId));
    return { logoUrl };
  }

  async clearStoreLogo(userId: string): Promise<void> {
    const medicalStoreId = await this.resolveMedicalStoreIdForUser(userId);
    const [cur] = await db
      .select({ logoUrl: medicalStores.logoUrl })
      .from(medicalStores)
      .where(eq(medicalStores.id, medicalStoreId))
      .limit(1);
    if (cur?.logoUrl) await deleteOldImages([cur.logoUrl]);
    await db
      .update(medicalStores)
      .set({ logoUrl: null, updatedAt: new Date() })
      .where(eq(medicalStores.id, medicalStoreId));
  }
}

export const medicalStoreService = new MedicalStoreService();
