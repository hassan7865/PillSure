"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { useAuth } from "@/contexts/auth-context";
import { reviewApi } from "@/app/search-doctor/_api";
import { getErrorMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";

interface RatingReviewDialogProps {
  open: boolean;
  onClose: () => void;
  doctorId: string;
  doctorName: string;
  onRatingSubmitted?: () => void;
}

export default function RatingReviewDialog({
  open,
  onClose,
  doctorId,
  doctorName,
  onRatingSubmitted,
}: RatingReviewDialogProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useCustomToast();
  const { user } = useAuth();

  const handleStarClick = (value: number) => {
    setRating(value);
  };

  const handleStarHover = (value: number) => {
    setHoveredRating(value);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      showError("Rating Required", "Please select a rating before submitting.");
      return;
    }

    if (!user) {
      showError("Authentication Required", "Please log in to submit a review.");
      return;
    }

    // Verify user is a patient
    const userRole = user.role?.toLowerCase() || '';
    if (userRole !== 'patient') {
      showError(
        "Access Restricted",
        "Only patients can submit reviews. Please log in with a patient account."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewApi.createReview(doctorId, {
        rating,
        comment: comment.trim() || undefined,
      });
      
      showSuccess(
        "Review Submitted",
        "Thank you for your feedback! Your review has been submitted successfully."
      );
      
      // Reset form
      setRating(0);
      setComment("");
      setHoveredRating(0);
      onRatingSubmitted?.();
      onClose();
    } catch (error: any) {
      const errorMsg = getErrorMessage(error);
      showError(
        "Submission Failed",
        errorMsg || "Failed to submit review. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment("");
    setHoveredRating(0);
    onClose();
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= (hoveredRating || rating);

      return (
        <button
          key={starValue}
          type="button"
          onClick={() => handleStarClick(starValue)}
          onMouseEnter={() => handleStarHover(starValue)}
          onMouseLeave={handleStarLeave}
          className="focus:outline-none transition-transform hover:scale-110"
          disabled={isSubmitting}
        >
          <Star
            className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 transition-colors",
              isFilled
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground hover:text-amber-300"
            )}
          />
        </button>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold">
            Rate Dr. {doctorName}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Share your experience and help other patients make informed decisions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Rating *</Label>
            <div className="flex items-center justify-center gap-2">
              {renderStars()}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {rating === 5 && "Excellent"}
                {rating === 4 && "Very Good"}
                {rating === 3 && "Good"}
                {rating === 2 && "Fair"}
                {rating === 1 && "Poor"}
              </p>
            )}
          </div>

          {/* Comment Section */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              Your Review (Optional)
            </Label>
            <Textarea
              id="comment"
              placeholder="Share your experience with this doctor..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-32 resize-none"
              disabled={isSubmitting}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            {isSubmitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

