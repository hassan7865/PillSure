import { desc, sql } from "drizzle-orm";
import { db } from "../config/database";
import { medicines } from "../schema/medicine";

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
}

export const medicineService = new MedicineService();