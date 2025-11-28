import { desc, eq, sql } from "drizzle-orm";
import { db } from "../config/database";
import { medicines } from "../schema/medicine";
import { s3Service } from "./s3.service";
import { BadRequestError } from "../middleware/error.handler";

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
                    drugDescription: medicines.drugDescription,
                    drugCategory: medicines.drugCategory,
                    drugVarient: medicines.drugVarient,
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
                drugDescription: latestInCategory.drugDescription,
                drugCategory: latestInCategory.drugCategory,
                drugVarient: latestInCategory.drugVarient,
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

        // Calculate total images after update
        const totalImages = existingImageUrls.length + newImages.length;

        // Validate: max 4 images allowed
        if (totalImages > 4) {
            throw BadRequestError(`Maximum 4 images allowed. You are trying to upload ${totalImages} images.`);
        }

        // Upload new images to S3
        const uploadedImages = [];
        if (newImages.length > 0) {
            const uploadResults = await s3Service.uploadMultipleFiles(newImages, {
                folder: "medicines",
            });
            uploadedImages.push(...uploadResults.map((result) => result.url));
        }

        // Determine which images to delete (images that were in DB but not in existingImageUrls)
        const imagesToDelete = currentImages.filter(
            (imageUrl) => !existingImageUrls.includes(imageUrl)
        );

        // Delete old images from S3
        if (imagesToDelete.length > 0) {
            const keysToDelete = imagesToDelete
                .map((url) => s3Service.extractKeyFromUrl(url))
                .filter((key): key is string => key !== null);

            if (keysToDelete.length > 0) {
                await s3Service.deleteMultipleFiles(keysToDelete);
            }
        }

        // Combine existing and new images
        const updatedImages = [...existingImageUrls, ...uploadedImages];

        // Update medicine in database with explicit JSONB casting
        await db
            .update(medicines)
            .set({ 
                images: sql`${JSON.stringify(updatedImages)}::jsonb`
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
}

export const medicineService = new MedicineService();