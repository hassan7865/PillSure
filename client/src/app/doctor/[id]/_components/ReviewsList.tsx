    "use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, MessageSquare, ChevronLeft, ChevronRight, User } from "lucide-react";
import { reviewApi, Review, ReviewsResponse } from "@/app/search-doctor/_api";
import Loader from "@/components/ui/loader";
import EmptyState from "@/components/ui/empty-state";
import { formatDistanceToNow } from "date-fns";

interface ReviewsListProps {
  doctorId: string;
}

export default function ReviewsList({ doctorId }: ReviewsListProps) {
  const [reviewsData, setReviewsData] = useState<ReviewsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const limit = 5;

  useEffect(() => {
    let isMounted = true;

    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await reviewApi.getReviews(doctorId, page, limit);
        if (isMounted) {
          setReviewsData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch reviews"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchReviews();

    return () => {
      isMounted = false;
    };
  }, [doctorId, page]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= rating;

      return (
        <Star
          key={starValue}
          className={`h-3 w-3 sm:h-4 sm:w-4 ${
            isFilled
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground"
          }`}
        />
      );
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Loader
            title="Loading Reviews"
            description="Fetching patient reviews..."
          />
        </CardContent>
      </Card>
    );
  }

  if (error || !reviewsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            type="error"
            title="Failed to Load Reviews"
            description={error?.message || "Unable to fetch reviews at this time."}
          />
        </CardContent>
      </Card>
    );
  }

  const { reviews, pagination, averageRating, totalReviews } = reviewsData;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <MessageSquare className="h-5 w-5 text-primary" />
              Reviews
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              {totalReviews} review{totalReviews !== 1 ? "s" : ""} • Average rating:{" "}
              <span className="font-semibold text-foreground">
                {averageRating.toFixed(1)}
              </span>
              <div className="flex items-center gap-1 mt-1">
                {renderStars(Math.round(averageRating))}
              </div>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.length === 0 ? (
          <EmptyState
            type="empty"
            title="No Reviews Yet"
            description="Be the first to review this doctor!"
            icon={<MessageSquare className="w-12 h-12 text-muted-foreground" />}
          />
        ) : (
          <>
            {reviews.map((review: Review) => (
              <div key={review.id} className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border-2 border-border flex-shrink-0">
                      <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm sm:text-base text-foreground">
                          {review.user?.firstName} {review.user?.lastName}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {review.rating}/5
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {renderStars(review.rating)}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(review.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                <Separator className="last:hidden" />
              </div>
            ))}

            {pagination.totalPages > 1 && (
              <>
                <Separator />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                  <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total} reviews
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={!pagination.hasPrevPage || isLoading}
                      className="text-xs sm:text-sm"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="text-xs sm:text-sm text-muted-foreground px-2">
                      Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.hasNextPage || isLoading}
                      className="text-xs sm:text-sm"
                    >
                      Next
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

