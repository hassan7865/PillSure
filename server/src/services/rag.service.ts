import { db } from "../config/database";
import { medicines } from "../schema/medicine";
import { ragQueries } from "../schema/ragQuery";
import { inArray } from "drizzle-orm";
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
query_understanding?: Record<string, unknown> | null;
  retrieval_meta?: Record<string, unknown> | null;
}

interface MedicineDetails {
  id: number;
  medicineName: string;
  prescriptionRequired: boolean | null;
  createdAt: Date | null;
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
      .select({
        id: medicines.id,
        medicineName: medicines.medicineName,
        prescriptionRequired: medicines.prescriptionRequired,
        createdAt: medicines.createdAt,
      })
      .from(medicines)
      .where(inArray(medicines.id, uniqueIds));

    const byId = new Map(results.map((row) => [row.id, row]));
    return uniqueIds.map((id) => byId.get(id)).filter((row): row is MedicineDetails => row != null);
  }
private async logRAGQuery(
    query: string,
    ragResults: RAGRecommendationResult,
    embeddingCost?: number | null,
    rewrittenQueryCost?: number | null
  ): Promise<void> {
    try {
      const retrieved: Array<{
        medicine_id: string;
        medicine_name: string;
        score: number;
        drug_category?: string;
        prescription_required: boolean;
        context_used: string;
      }> = [];

      if (ragResults.result) {
        retrieved.push({
          medicine_id: ragResults.result.medicine_id,
          medicine_name: ragResults.result.medicine_name,
          score: ragResults.result.score,
          drug_category: ragResults.result.drug_category,
          prescription_required: ragResults.result.prescription_required,
          context_used: ragResults.result.context_used,
        });
      }

      ragResults.suggestions.forEach((suggestion) => {
        retrieved.push({
          medicine_id: suggestion.medicine_id,
          medicine_name: suggestion.medicine_name,
          score: suggestion.score,
          drug_category: suggestion.drug_category,
          prescription_required: suggestion.prescription_required,
          context_used: suggestion.context_used,
        });
      });

      const totalCost =
        (embeddingCost || 0) + (rewrittenQueryCost || 0);

      const metaData = {
        retrieved,
        query_understanding: ragResults.query_understanding ?? null,
        retrieval_meta: ragResults.retrieval_meta ?? null,
      };

      await db.insert(ragQueries).values({
        query: query.trim(),
        embeddingCost: embeddingCost?.toString() || null,
        rewrittenQuery: ragResults.rewritten_query || null,
        rewrittenQueryCost: rewrittenQueryCost?.toString() || null,
        totalCost: totalCost > 0 ? totalCost.toString() : null,
        metaData,
      });
    } catch (error) {
      // Log error but don't fail the request
      console.error("Failed to log RAG query to database:", error);
    }
  }
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

    const recommendedDoctors: DoctorInfo[] = [];

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
