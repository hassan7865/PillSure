import { db } from "../config/database";
import { specializations } from "../schema/specialization";

export class DoctorService {
  // Get all specializations
  async getAllSpecializations() {
    try {
      const result = await db.select({
        id: specializations.id,
        name: specializations.name,
        description: specializations.description,
      }).from(specializations)
      .orderBy(specializations.name);

      return {
        success: true,
        data: result,
        message: "Specializations retrieved successfully"
      };
    } catch (error: any) {
      console.error("Error fetching specializations:", error);
      return {
        success: false,
        message: "Failed to retrieve specializations",
        error: error.message
      };
    }
  }

}

export const doctorService = new DoctorService();
