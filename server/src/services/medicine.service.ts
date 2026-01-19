import { desc, eq, sql, ilike, or } from "drizzle-orm";
import { db } from "../config/database";
import { medicines } from "../schema/medicine";
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
                    drugCategory: medicines.drugCategory,
                    drugVarient: medicines.drugVarient,
                    drugDescription: medicines.drugDescription,
                    faqs: medicines.faqs,
                    rn: sql<number>`row_number() over (partition by ${medicines.drugCategory} order by ${medicines.createdAt} desc)`.as('rn'),
                })
                .from(medicines)
                .where(sql`${medicines.stock} > 0 AND ${medicines.drugCategory} IS NOT NULL`)
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
                drugCategory: latestInCategory.drugCategory,
                drugVarient: latestInCategory.drugVarient,
                drugDescription: latestInCategory.drugDescription,
                faqs: latestInCategory.faqs,
            })
            .from(latestInCategory)
            .where(sql`${latestInCategory.rn} = 1`)
            .orderBy(desc(latestInCategory.createdAt))
            .limit(safeLimit);
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

        // Fetch the updated medicine to ensure we get the latest data
        const updatedMedicine = await db
            .select()
            .from(medicines)
            .where(eq(medicines.id, medicineId))
            .limit(1);

        return updatedMedicine[0];
    }

    /**
     * Get medicine by ID
     * @param medicineId - Medicine ID
     * @returns Medicine details
     */
    async getMedicineById(medicineId: number) {
        const medicine = await db
            .select()
            .from(medicines)
            .where(eq(medicines.id, medicineId))
            .limit(1);

        if (!medicine || medicine.length === 0) {
            throw BadRequestError("Medicine not found");
        }

        return medicine[0];
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
                drugCategory: medicines.drugCategory,
                drugVarient: medicines.drugVarient,
                drugDescription: medicines.drugDescription,
                faqs: medicines.faqs,
            })
            .from(medicines)
            .where(
                or(
                    ilike(medicines.medicineName, searchTerm),
                    ilike(medicines.drugCategory, searchTerm)
                )
            )
            .limit(safeLimit);

        return results;
    }
}

export const medicineService = new MedicineService();