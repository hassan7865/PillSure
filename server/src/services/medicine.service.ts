import { desc, eq, ilike, and, asc } from "drizzle-orm";
import { db } from "../config/database";
import { medicines } from "../schema/medicine";
import { manufacturers } from "../schema/manufacturers";
import { manufacturerMedicines } from "../schema/manufacturerMedicines";
import { BadRequestError } from "../middleware/error.handler";

export class MedicineService {
  async getFeaturedMedicines({
    limit = 6,
  }: {
    limit?: number;
    category?: string;
    uniqueCategories?: boolean;
  }) {
    const safeLimit = Math.max(1, Math.min(24, limit));

    return await db
      .select({
        id: medicines.id,
        medicineName: medicines.medicineName,
        prescriptionRequired: medicines.prescriptionRequired,
        createdAt: medicines.createdAt,
      })
      .from(medicines)
      .orderBy(desc(medicines.createdAt))
      .limit(safeLimit);
  }

  async getCatalogMedicines({
    search,
    perCategoryLimit = 12,
    categoryPage = 1,
    categoriesPerPage = 6,
  }: {
    category?: string;
    search?: string;
    perCategoryLimit?: number;
    categoryPage?: number;
    categoriesPerPage?: number;
  }) {
    const safePerCategoryLimit = Math.max(1, Math.min(24, perCategoryLimit));
    const safeCategoryPage = Math.max(1, categoryPage);
    const safeCategoriesPerPage = Math.max(1, Math.min(20, categoriesPerPage));

    const trimmedSearch = search?.trim();
    const searchCond = trimmedSearch
      ? ilike(medicines.medicineName, `%${trimmedSearch}%`)
      : undefined;

    const pageSize = safePerCategoryLimit * safeCategoriesPerPage;
    const offset = (safeCategoryPage - 1) * pageSize;

    const rows = await db
      .select({
        id: medicines.id,
        medicineName: medicines.medicineName,
        prescriptionRequired: medicines.prescriptionRequired,
        createdAt: medicines.createdAt,
      })
      .from(medicines)
      .where(searchCond)
      .orderBy(desc(medicines.createdAt))
      .limit(pageSize + 1)
      .offset(offset);

    const hasMoreCategories = rows.length > pageSize;
    const pageRows = rows.slice(0, pageSize);

    return {
      categories: pageRows.length ? [{ category: "All", items: pageRows }] : [],
      pagination: {
        categoryPage: safeCategoryPage,
        categoriesPerPage: safeCategoriesPerPage,
        hasMoreCategories,
      },
    };
  }

  async getMedicineById(medicineId: number) {
    const medicine = await db
      .select({
        id: medicines.id,
        medicineName: medicines.medicineName,
        prescriptionRequired: medicines.prescriptionRequired,
        createdAt: medicines.createdAt,
      })
      .from(medicines)
      .where(eq(medicines.id, medicineId))
      .limit(1);

    if (!medicine || medicine.length === 0) {
      throw BadRequestError("Medicine not found");
    }

    return medicine[0];
  }

  async listDrugCategories() {
    return [] as { id: number; name: string }[];
  }

  /** Active manufacturers for filters (e.g. medical store listing medicines by manufacturer catalog). */
  async listManufacturersForPicker() {
    return db
      .select({
        id: manufacturers.id,
        legalName: manufacturers.legalName,
        shortName: manufacturers.shortName,
      })
      .from(manufacturers)
      .where(eq(manufacturers.isActive, true))
      .orderBy(asc(manufacturers.legalName));
  }

  /**
   * Search medicines by name.
   * When `manufacturerId` is set, only medicines linked in `manufacturer_medicines` for that manufacturer are returned.
   */
  async searchMedicines(query: string, limit: number = 20, manufacturerId?: string | null) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const safeLimit = Math.max(1, Math.min(50, limit));
    const searchTerm = `%${query.trim()}%`;
    const nameCond = ilike(medicines.medicineName, searchTerm);

    const rowShape = {
      id: medicines.id,
      medicineName: medicines.medicineName,
      prescriptionRequired: medicines.prescriptionRequired,
    };

    const mid = manufacturerId?.trim();
    if (mid) {
      return await db
        .select(rowShape)
        .from(medicines)
        .innerJoin(
          manufacturerMedicines,
          and(
            eq(manufacturerMedicines.medicineId, medicines.id),
            eq(manufacturerMedicines.manufacturerId, mid),
            eq(manufacturerMedicines.isActive, true),
          ),
        )
        .where(nameCond)
        .orderBy(desc(medicines.createdAt))
        .limit(safeLimit);
    }

    return await db
      .select(rowShape)
      .from(medicines)
      .where(nameCond)
      .orderBy(desc(medicines.createdAt))
      .limit(safeLimit);
  }
}

export const medicineService = new MedicineService();
