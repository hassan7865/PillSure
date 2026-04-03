import { desc, eq, sql, ilike, or, and, inArray, asc } from "drizzle-orm";
import { db } from "../config/database";
import { medicines } from "../schema/medicine";
import { drugCategories } from "../schema/drugCategories";
import { s3Service } from "./s3.service";
import { BadRequestError } from "../middleware/error.handler";
import {
  handleMedicineImageUpdate,
  deleteOldImages,
  formatImagesForDB,
} from "./utils/image.utils";

export class MedicineService {

    async getFeaturedMedicines({
        limit = 6,
    }: {
        limit?: number;
        category?: string;
        uniqueCategories?: boolean;
    }) {
        // Ensure limit is within safe bounds (minimum 1, maximum 24)
        const safeLimit = Math.max(1, Math.min(24, limit));
        
        const latestInCategory = db.$with('latestInCategory').as(
            db
                .select({
                    id: medicines.id,
                    medicineName: medicines.medicineName,
                    medicineUrl: medicines.medicineUrl,
                    price: medicines.price,
                    discount: medicines.discount,
                    stock: medicines.stock,
                    images: medicines.images,
                    prescriptionRequired: medicines.prescriptionRequired,
                    createdAt: medicines.createdAt,
                    drugCategoryId: medicines.drugCategoryId,
                    drugVarient: medicines.drugVarient,
                    drugDescription: medicines.drugDescription,
                    faqs: medicines.faqs,
                    rn: sql<number>`row_number() over (partition by ${medicines.drugCategoryId} order by ${medicines.createdAt} desc)`.as('rn'),
                })
                .from(medicines)
                .where(sql`${medicines.stock} > 0 AND ${medicines.drugCategoryId} IS NOT NULL`)
        );

        return await db
            .with(latestInCategory)
            .select({
                id: latestInCategory.id,
                medicineName: latestInCategory.medicineName,
                medicineUrl: latestInCategory.medicineUrl,
                price: latestInCategory.price,
                discount: latestInCategory.discount,
                stock: latestInCategory.stock,
                images: latestInCategory.images,
                prescriptionRequired: latestInCategory.prescriptionRequired,
                createdAt: latestInCategory.createdAt,
                drugCategoryId: latestInCategory.drugCategoryId,
                drugCategory: drugCategories.name,
                drugVarient: latestInCategory.drugVarient,
                drugDescription: latestInCategory.drugDescription,
                faqs: latestInCategory.faqs,
            })
            .from(latestInCategory)
            .leftJoin(drugCategories, eq(latestInCategory.drugCategoryId, drugCategories.id))
            .where(sql`${latestInCategory.rn} = 1`)
            .orderBy(desc(latestInCategory.createdAt))
            .limit(safeLimit);
    }

    async getCatalogMedicines({
        category,
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
        const filters = [sql`${medicines.stock} > 0`];

        const trimmedCategory = category?.trim();
        if (trimmedCategory) {
            filters.push(eq(drugCategories.name, trimmedCategory));
        }

        const trimmedSearch = search?.trim();
        if (trimmedSearch) {
            const searchTerm = `%${trimmedSearch}%`;
            filters.push(ilike(medicines.medicineName, searchTerm));
        }

        const groupedCategories = await db
            .select({
                category: drugCategories.name,
            })
            .from(medicines)
            .innerJoin(drugCategories, eq(medicines.drugCategoryId, drugCategories.id))
            .where(and(...filters))
            .groupBy(drugCategories.name)
            .orderBy(asc(drugCategories.name))
            .limit(safeCategoriesPerPage)
            .offset((safeCategoryPage - 1) * safeCategoriesPerPage);

        const categoryNames = groupedCategories
            .map((c) => c.category)
            .filter((c): c is string => Boolean(c));

        if (categoryNames.length === 0) {
            return {
                categories: [],
                pagination: {
                    categoryPage: safeCategoryPage,
                    categoriesPerPage: safeCategoriesPerPage,
                    hasMoreCategories: false,
                },
            };
        }

        const rows = await db
            .select({
                id: medicines.id,
                medicineName: medicines.medicineName,
                medicineUrl: medicines.medicineUrl,
                price: medicines.price,
                discount: medicines.discount,
                stock: medicines.stock,
                images: medicines.images,
                prescriptionRequired: medicines.prescriptionRequired,
                createdAt: medicines.createdAt,
                drugCategoryId: medicines.drugCategoryId,
                drugCategory: drugCategories.name,
                drugVarient: medicines.drugVarient,
                drugDescription: medicines.drugDescription,
                faqs: medicines.faqs,
            })
            .from(medicines)
            .innerJoin(drugCategories, eq(medicines.drugCategoryId, drugCategories.id))
            .where(and(...filters, inArray(drugCategories.name, categoryNames)))
            .orderBy(desc(medicines.stock), desc(medicines.createdAt));

        const grouped = new Map<string, typeof rows>();
        for (const row of rows) {
            if (!row.drugCategory) continue;
            const existing = grouped.get(row.drugCategory) ?? [];
            if (existing.length < safePerCategoryLimit) {
                existing.push(row);
                grouped.set(row.drugCategory, existing);
            }
        }

        const categories = Array.from(grouped.entries())
            .map(([categoryName, items]) => ({
                category: categoryName,
                items,
            }))
            .sort((a, b) => a.category.localeCompare(b.category));

        const hasMoreCategories = groupedCategories.length === safeCategoriesPerPage;

        return {
            categories,
            pagination: {
                categoryPage: safeCategoryPage,
                categoriesPerPage: safeCategoriesPerPage,
                hasMoreCategories,
            },
        };
    }

    /**
     * Update medicine images (max 4 images allowed)
     * @param medicineId - Medicine ID to update
     * @param newImages - Array of new image files
     * @param existingImageUrls - Array of existing image URLs to keep
     * @returns Updated medicine with new image URLs
     */
    async updateMedicineImages(
        medicineId: number,
        newImages: Express.Multer.File[] = [],
        existingImageUrls: string[] = []
    ) {
        // Validate medicine exists
        const medicine = await db
            .select()
            .from(medicines)
            .where(eq(medicines.id, medicineId))
            .limit(1);

        if (!medicine || medicine.length === 0) {
            throw BadRequestError("Medicine not found");
        }

        // Get current images
        const currentImages = (medicine[0].images as string[]) || [];

        // Use utility function to handle image updates
        const imageUpdateResult = await handleMedicineImageUpdate(
            currentImages,
            existingImageUrls,
            newImages,
            4
        );

        // Delete old images from S3
        await deleteOldImages(imageUpdateResult.imagesToDelete);

        // Update medicine in database with explicit JSONB casting
        await db
            .update(medicines)
            .set({ 
                images: formatImagesForDB(imageUpdateResult.finalImages)
            })
            .where(eq(medicines.id, medicineId));

        return this.getMedicineById(medicineId);
    }

    /**
     * Get medicine by ID
     * @param medicineId - Medicine ID
     * @returns Medicine details
     */
    async getMedicineById(medicineId: number) {
        const medicine = await db
            .select({
                id: medicines.id,
                medicineName: medicines.medicineName,
                medicineUrl: medicines.medicineUrl,
                price: medicines.price,
                discount: medicines.discount,
                stock: medicines.stock,
                images: medicines.images,
                prescriptionRequired: medicines.prescriptionRequired,
                createdAt: medicines.createdAt,
                drugCategoryId: medicines.drugCategoryId,
                drugCategory: drugCategories.name,
                drugVarient: medicines.drugVarient,
                drugDescription: medicines.drugDescription,
                faqs: medicines.faqs,
            })
            .from(medicines)
            .leftJoin(drugCategories, eq(medicines.drugCategoryId, drugCategories.id))
            .where(eq(medicines.id, medicineId))
            .limit(1);

        if (!medicine || medicine.length === 0) {
            throw BadRequestError("Medicine not found");
        }

        return medicine[0];
    }

    async listDrugCategories() {
        return db
            .select({
                id: drugCategories.id,
                name: drugCategories.name,
            })
            .from(drugCategories)
            .orderBy(asc(drugCategories.name));
    }

  
    async searchMedicines(query: string, limit: number = 20) {
        if (!query || query.trim().length === 0) {
            return [];
        }

        const safeLimit = Math.max(1, Math.min(50, limit));
        const searchTerm = `%${query.trim()}%`;

        const results = await db
            .select({
                id: medicines.id,
                medicineName: medicines.medicineName,
                medicineUrl: medicines.medicineUrl,
                price: medicines.price,
                discount: medicines.discount,
                stock: medicines.stock,
                images: medicines.images,
                prescriptionRequired: medicines.prescriptionRequired,
                drugCategoryId: medicines.drugCategoryId,
                drugCategory: drugCategories.name,
                drugVarient: medicines.drugVarient,
                drugDescription: medicines.drugDescription,
                faqs: medicines.faqs,
            })
            .from(medicines)
            .leftJoin(drugCategories, eq(medicines.drugCategoryId, drugCategories.id))
            .where(
                or(
                    ilike(medicines.medicineName, searchTerm),
                    ilike(drugCategories.name, searchTerm)
                )
            )
            .orderBy(desc(medicines.createdAt))
            .limit(safeLimit);

        return results;
    }
}

export const medicineService = new MedicineService();