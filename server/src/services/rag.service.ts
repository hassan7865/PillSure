import { db } from "../config/database";
import { medicines } from "../schema/medicine";
import { eq, inArray } from "drizzle-orm";
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
   * Get RAG recommendations with complete medicine details
   * @param query - User query/symptom description
   * @returns RAG recommendations with complete medicine entries from database
   */
  async getRecommendationsWithMedicineDetails(
    query: string
  ): Promise<{
    rewritten_query: string;
    result: MedicineWithRAGData | null;
    suggestions: MedicineWithRAGData[];
    latency_ms: number;
  }> {
    // Get RAG recommendations
    const ragResults = await this.getRAGRecommendations(query);

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

    return {
      rewritten_query: ragResults.rewritten_query,
      result: resultWithDetails,
      suggestions: suggestionsWithDetails,
      latency_ms: ragResults.latency_ms,
    };
  }
}

export const ragService = new RAGService();
