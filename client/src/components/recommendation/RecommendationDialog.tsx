"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Sparkles } from "lucide-react";
import { ragApi, RAGRecommendationResponse } from "@/app/medicine/_rag-api";
import { toast } from "sonner";
import RecommendationResultCard from "./RecommendationResultCard";
import RecommendationSuggestionCard from "./RecommendationSuggestionCard";

interface RecommendationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RecommendationDialog({
  open,
  onOpenChange,
}: RecommendationDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<RAGRecommendationResponse | null>(null);

  const handleSearch = async () => {
    if (!query.trim() || query.trim().length < 3) {
      toast.error("Please enter at least 3 characters");
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      const data = await ragApi.getRecommendations(query.trim());
      setResults(data);
    } catch (error: any) {
      console.error("Error fetching recommendations:", error);
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to get recommendations. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleSearch();
    }
  };

  const handleCardClick = (medicineId: number) => {
    router.push(`/medicine/${medicineId}`);
    onOpenChange(false);
  };

  const handleClose = () => {
    setQuery("");
    setResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              Medicine Recommendations
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Describe your symptoms or ask about medicines, and we'll recommend the best options for you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Search Input */}
          <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-3 sm:pb-4 flex-shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g., I have a headache and fever"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 pr-4 h-10 sm:h-11"
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isLoading || !query.trim() || query.trim().length < 3}
                className="h-10 sm:h-11 px-4 sm:px-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 min-h-0">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Finding the best medicines for you...
                  </p>
                </div>
              </div>
            )}

            {!isLoading && results && (
              <div className="space-y-6">
                {/* Top Result */}
                {results.result && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-foreground">
                      Best Match
                    </h3>
                    <RecommendationResultCard
                      medicine={results.result}
                      onClick={() => handleCardClick(results.result!.id)}
                    />
                  </div>
                )}

                {/* Suggestions */}
                {results.suggestions && results.suggestions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-foreground">
                      Other Suggestions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {results.suggestions.map((medicine) => (
                        <RecommendationSuggestionCard
                          key={medicine.id}
                          medicine={medicine}
                          onClick={() => handleCardClick(medicine.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {!results.result && results.suggestions.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No recommendations found. Try rephrasing your query.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!isLoading && !results && (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Enter your symptoms or medicine query above to get recommendations
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
