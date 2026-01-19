import api from '@/lib/interceptor';
import { ApiResponse } from '@/lib/types';
import { Medicine } from './_api';
import { Doctor } from '@/lib/types';

export interface RAGMedicineInfo extends Medicine {
  ragScore?: number;
  contextUsed?: string;
}

export interface RAGRecommendationResponse {
  rewritten_query: string;
  result: RAGMedicineInfo | null;
  suggestions: RAGMedicineInfo[];
  recommendedDoctors: Doctor[];
  latency_ms: number;
}

import { extractApiData } from '@/lib/api-utils';

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

    return extractApiData(response);
  },
};

export default ragApi;
