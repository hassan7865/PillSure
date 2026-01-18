import api from '@/lib/interceptor';
import { ApiResponse } from '@/lib/types';
import { Medicine } from './_api';

export interface RAGMedicineInfo extends Medicine {
  ragScore?: number;
  contextUsed?: string;
}

export interface RAGRecommendationResponse {
  rewritten_query: string;
  result: RAGMedicineInfo | null;
  suggestions: RAGMedicineInfo[];
  latency_ms: number;
}

export const ragApi = {
  getRecommendations: async (query: string): Promise<RAGRecommendationResponse> => {
    if (!query || query.trim().length === 0) {
      throw new Error("Query is required");
    }

    // RAG operations can take longer, so use a longer timeout (60 seconds)
    const response = await api.post<ApiResponse<RAGRecommendationResponse>>(
      '/rag/recommend',
      { query: query.trim() },
      {
        timeout: 60000, // 60 seconds timeout for RAG operations
      }
    );

    const data = response.data.data;

    if (!data) {
      throw new Error("Failed to get recommendations");
    }

    return data;
  },
};

export default ragApi;
