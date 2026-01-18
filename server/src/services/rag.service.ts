import { db } from "../config/database";
import { medicines } from "../schema/medicine";
import { specializations } from "../schema/specialization";
import { doctors } from "../schema/doctor";
import { users } from "../schema/users";
import { hospitals } from "../schema/hospitals";
import { drugCategorySpecializationMapping } from "../schema/drugCategorySpecializationMapping";
import { ragQueries } from "../schema/ragQuery";
import { eq, inArray, sql, and, or, ilike } from "drizzle-orm";
import { BadRequestError } from "../middleware/error.handler";

interface RAGRecommendationResult {
  rewritten_query: string;
  result: {
    medicine_id: string;
    medicine_name: string;
    score: number;
    drug_category?: string;
    prescription_required: boolean;
    context_used: string;
  } | null;
  suggestions: Array<{
    medicine_id: string;
    medicine_name: string;
    score: number;
    drug_category?: string;
    prescription_required: boolean;
    context_used: string;
  }>;
  latency_ms: number;
  embedding_cost?: number;
  rewritten_query_cost?: number;
  total_cost?: number;
}

interface MedicineDetails {
  id: number;
  medicineName: string;
  medicineUrl: string | null;
  price: string | null;
  discount: string | null;
  stock: number | null;
  images: any;
  prescriptionRequired: boolean | null;
  createdAt: Date | null;
  drugCategory: string | null;
  drugVarient: string | null;
  drugDescription: string | null;
  faqs: any;
}

interface MedicineWithRAGData extends MedicineDetails {
  ragScore?: number;
  contextUsed?: string;
}

interface DoctorInfo {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  mobile: string;
  specializationIds: number[];
  specializations: Array<{ id: number; name: string; description: string | null }>;
  qualifications: string[];
  experienceYears: number;
  patientSatisfactionRate: string;
  hospitalId: string | null;
  address: string;
  image: string | null;
  feePkr: string | null;
  consultationModes: string[] | null;
  openingTime: string | null;
  closingTime: string | null;
  availableDays: string[] | null;
  hospital: {
    id: string;
    name: string;
    address: string;
    contactNo: string;
  } | null;
  name: string;
  specialization: string;
  experience: number;
  fee: number;
  rating: number;
}

export class RAGService {
  private ragApiUrl: string;

  constructor() {
    // Get RAG API URL from environment variable, default to localhost
    this.ragApiUrl = process.env.RAG_API_URL || "http://localhost:8000";
  }

  /**
   * Call RAG API to get medicine recommendations based on query
   * @param query - User query/symptom description
   * @returns RAG recommendation results
   */
  async getRAGRecommendations(query: string): Promise<RAGRecommendationResult> {
    if (!query || query.trim().length === 0) {
      throw BadRequestError("Query is required");
    }

    try {
      const response = await fetch(`${this.ragApiUrl}/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: query.trim(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `RAG API request failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      return data as RAGRecommendationResult;
    } catch (error: any) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch RAG recommendations: ${error.message}`);
      }
      throw new Error("Failed to fetch RAG recommendations: Unknown error");
    }
  }

  /**
   * Fetch complete medicine entries from database based on medicine IDs
   * @param medicineIds - Array of medicine IDs to fetch
   * @returns Array of complete medicine entries
   */
  async getMedicinesByIds(medicineIds: number[]): Promise<MedicineDetails[]> {
    if (!medicineIds || medicineIds.length === 0) {
      return [];
    }

    // Remove duplicates and filter out invalid IDs
    const uniqueIds = Array.from(new Set(medicineIds.filter((id) => id && id > 0)));

    if (uniqueIds.length === 0) {
      return [];
    }

    const results = await db
      .select()
      .from(medicines)
      .where(inArray(medicines.id, uniqueIds));

    return results;
  }

  /**
   * Get doctors based on drug category using the mapping table
   * @param drugCategory - Drug category from medicine
   * @param limit - Maximum number of doctors to return (default: 10)
   * @returns Array of randomly selected doctors
   */
  async getDoctorsByDrugCategory(
    drugCategory: string | null,
    limit: number = 10
  ): Promise<DoctorInfo[]> {
    if (!drugCategory) {
      return [];
    }

    try {
      // Step 1: Get specializations from mapping table
      const mappings = await db
        .select()
        .from(drugCategorySpecializationMapping)
        .where(eq(drugCategorySpecializationMapping.drugCategory, drugCategory));

      if (mappings.length === 0) {
        return [];
      }

      const specializationNames = mappings.map((m) => m.specialization);

      // Step 2: Get specialization IDs by matching names (case-insensitive)
      if (specializationNames.length === 0) {
        return [];
      }

      const specializationRecords = await db
        .select()
        .from(specializations)
        .where(
          or(
            ...specializationNames.map((name) =>
              sql`LOWER(${specializations.name}) = LOWER(${name})`
            )
          )
        );

      if (specializationRecords.length === 0) {
        return [];
      }

      const specializationIds = specializationRecords.map((s) => s.id);

      // Step 3: Find doctors with these specialization IDs
      // Doctors have specializationIds as JSONB array, so we need to check if any ID is in the array
      // Use the same approach as doctor.service.ts - check if specializationIds contains any of the target IDs
      const jsonbConditions = specializationIds.map((id) =>
        sql`${doctors.specializationIds} @> ${JSON.stringify([id])}`
      );
      const specializationCondition = jsonbConditions.reduce((acc, condition) =>
        acc ? sql`${acc} OR ${condition}` : condition
      );

      const doctorsResult = await db
        .select({
          id: doctors.id,
          userId: doctors.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          gender: doctors.gender,
          mobile: doctors.mobile,
          specializationIds: doctors.specializationIds,
          qualifications: doctors.qualifications,
          experienceYears: doctors.experienceYears,
          patientSatisfactionRate: doctors.patientSatisfactionRate,
          hospitalId: doctors.hospitalId,
          address: doctors.address,
          image: doctors.image,
          feePkr: doctors.feePkr,
          consultationModes: doctors.consultationModes,
          openingTime: doctors.openingTime,
          closingTime: doctors.closingTime,
          availableDays: doctors.availableDays,
          hospitalName: hospitals.hospitalName,
          hospitalAddress: hospitals.hospitalAddress,
          hospitalContactNo: hospitals.hospitalContactNo,
        })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
        .where(
          and(
            eq(doctors.isActive, true),
            specializationCondition
          )
        );

      if (doctorsResult.length === 0) {
        return [];
      }

      // Step 4: Randomly shuffle and select doctors
      const shuffled = this.shuffleArray([...doctorsResult]);
      const selectedDoctors = shuffled.slice(0, limit);

      // Step 5: Transform doctors to include specializations and formatted data
      const specializationMap = new Map(
        specializationRecords.map((spec) => [spec.id, spec])
      );

      const doctorsWithDetails: DoctorInfo[] = selectedDoctors.map((doctor) => {
        const doctorSpecializationIds = (doctor.specializationIds as number[]) || [];
        const doctorSpecializations = doctorSpecializationIds
          .map((id) => specializationMap.get(id))
          .filter(Boolean) as Array<{
          id: number;
          name: string;
          description: string | null;
        }>;

        const primarySpecialization = doctorSpecializations[0];
        const qualifications = (doctor.qualifications as string[]) || [];

        return {
          id: doctor.id,
          userId: doctor.userId,
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          email: doctor.email,
          gender: doctor.gender,
          mobile: doctor.mobile,
          specializationIds: doctorSpecializationIds,
          specializations: doctorSpecializations,
          qualifications: qualifications,
          experienceYears: doctor.experienceYears,
          patientSatisfactionRate: doctor.patientSatisfactionRate || "0",
          hospitalId: doctor.hospitalId,
          address: doctor.address,
          image: doctor.image,
          feePkr: doctor.feePkr,
          consultationModes: (doctor.consultationModes as string[]) || null,
          openingTime: doctor.openingTime,
          closingTime: doctor.closingTime,
          availableDays: (doctor.availableDays as string[]) || null,
          hospital: doctor.hospitalName
            ? {
                id: doctor.hospitalId || "",
                name: doctor.hospitalName,
                address: doctor.hospitalAddress || "",
                contactNo: doctor.hospitalContactNo || "",
              }
            : null,
          name: `${doctor.firstName} ${doctor.lastName}`,
          specialization: primarySpecialization?.name || "General",
          experience: doctor.experienceYears,
          fee: doctor.feePkr ? parseFloat(doctor.feePkr) : 0,
          rating: doctor.patientSatisfactionRate
            ? parseFloat(doctor.patientSatisfactionRate)
            : 0,
        };
      });

      return doctorsWithDetails;
    } catch (error) {
      console.error("Error fetching doctors by drug category:", error);
      return [];
    }
  }

  /**
   * Shuffle array randomly (Fisher-Yates shuffle)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Log RAG query to database
   * @param query - Original user query
   * @param ragResults - RAG API results
   * @param embeddingCost - Cost for embedding generation (optional)
   * @param rewrittenQueryCost - Cost for query rewriting (optional)
   */
  private async logRAGQuery(
    query: string,
    ragResults: RAGRecommendationResult,
    embeddingCost?: number | null,
    rewrittenQueryCost?: number | null
  ): Promise<void> {
    try {
      // Prepare retrieved documents
      const retrievedDocuments: any[] = [];
      
      if (ragResults.result) {
        retrievedDocuments.push({
          medicine_id: ragResults.result.medicine_id,
          medicine_name: ragResults.result.medicine_name,
          score: ragResults.result.score,
          drug_category: ragResults.result.drug_category,
          prescription_required: ragResults.result.prescription_required,
          context_used: ragResults.result.context_used,
        });
      }

      ragResults.suggestions.forEach((suggestion) => {
        retrievedDocuments.push({
          medicine_id: suggestion.medicine_id,
          medicine_name: suggestion.medicine_name,
          score: suggestion.score,
          drug_category: suggestion.drug_category,
          prescription_required: suggestion.prescription_required,
          context_used: suggestion.context_used,
        });
      });

      // Calculate total cost
      const totalCost =
        (embeddingCost || 0) + (rewrittenQueryCost || 0);

      // Insert into database
      await db.insert(ragQueries).values({
        query: query.trim(),
        embeddingCost: embeddingCost?.toString() || null,
        rewrittenQuery: ragResults.rewritten_query || null,
        rewrittenQueryCost: rewrittenQueryCost?.toString() || null,
        totalCost: totalCost > 0 ? totalCost.toString() : null,
        retrievedDocuments: JSON.stringify(retrievedDocuments),
      });
    } catch (error) {
      // Log error but don't fail the request
      console.error("Failed to log RAG query to database:", error);
    }
  }

  /**
   * Get RAG recommendations with complete medicine details and recommended doctors
   * @param query - User query/symptom description
   * @param embeddingCost - Optional embedding cost to log
   * @param rewrittenQueryCost - Optional rewritten query cost to log
   * @returns RAG recommendations with complete medicine entries and doctors from database
   */
  async getRecommendationsWithMedicineDetails(
    query: string,
    embeddingCost?: number | null,
    rewrittenQueryCost?: number | null
  ): Promise<{
    rewritten_query: string;
    result: MedicineWithRAGData | null;
    suggestions: MedicineWithRAGData[];
    recommendedDoctors: DoctorInfo[];
    latency_ms: number;
  }> {
    // Get RAG recommendations
    const ragResults = await this.getRAGRecommendations(query);

    // Extract costs from RAG API response (if available)
    const extractedEmbeddingCost = ragResults.embedding_cost ?? embeddingCost ?? null;
    const extractedRewrittenQueryCost = ragResults.rewritten_query_cost ?? rewrittenQueryCost ?? null;

    // Log the query to database (async, non-blocking)
    this.logRAGQuery(
      query,
      ragResults,
      extractedEmbeddingCost,
      extractedRewrittenQueryCost
    ).catch((error) => {
      console.error("Error logging RAG query:", error);
    });

    // Collect all medicine IDs from result and suggestions
    const medicineIds: number[] = [];

    if (ragResults.result?.medicine_id) {
      const id = parseInt(ragResults.result.medicine_id, 10);
      if (!isNaN(id)) {
        medicineIds.push(id);
      }
    }

    ragResults.suggestions.forEach((suggestion) => {
      const id = parseInt(suggestion.medicine_id, 10);
      if (!isNaN(id)) {
        medicineIds.push(id);
      }
    });

    // Fetch complete medicine entries from database
    const medicineDetails = await this.getMedicinesByIds(medicineIds);

    // Create a map of medicine ID to medicine details for quick lookup
    const medicineMap = new Map<number, MedicineDetails>();
    medicineDetails.forEach((medicine) => {
      medicineMap.set(medicine.id, medicine);
    });

    // Combine RAG data with medicine details
    const resultWithDetails: MedicineWithRAGData | null = ragResults.result
      ? (() => {
          const medicineId = parseInt(ragResults.result.medicine_id, 10);
          const medicineDetail = medicineMap.get(medicineId);
          if (medicineDetail) {
            return {
              ...medicineDetail,
              ragScore: ragResults.result.score,
              contextUsed: ragResults.result.context_used,
            };
          }
          return null;
        })()
      : null;

    const suggestionsWithDetails: MedicineWithRAGData[] = ragResults.suggestions
      .map((suggestion) => {
        const medicineId = parseInt(suggestion.medicine_id, 10);
        const medicineDetail = medicineMap.get(medicineId);
        if (medicineDetail) {
          return {
            ...medicineDetail,
            ragScore: suggestion.score,
            contextUsed: suggestion.context_used,
          } as MedicineWithRAGData;
        }
        return null;
      })
      .filter((item): item is MedicineWithRAGData => item !== null && item.ragScore !== undefined);

    // Get recommended doctors based on top match medicine's drug category
    const recommendedDoctors = resultWithDetails?.drugCategory
      ? await this.getDoctorsByDrugCategory(resultWithDetails.drugCategory, 10)
      : [];

    return {
      rewritten_query: ragResults.rewritten_query,
      result: resultWithDetails,
      suggestions: suggestionsWithDetails,
      recommendedDoctors: recommendedDoctors,
      latency_ms: ragResults.latency_ms,
    };
  }
}

export const ragService = new RAGService();
