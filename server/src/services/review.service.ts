import { db } from "../config/database";
import { reviews } from "../schema/reviews";
import { users } from "../schema/users";
import { doctors } from "../schema/doctor";
import { eq, desc, and, avg, count, sql } from "drizzle-orm";
import { createError } from "../middleware/error.handler";

export interface CreateReviewRequest {
  userId: string;
  doctorId: string;
  rating: number;
  comment?: string;
}

export interface ReviewResponse {
  id: string;
  userId: string;
  doctorId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export class ReviewService {
  async createReview(data: CreateReviewRequest): Promise<ReviewResponse> {
    try {
      // Validate rating
      if (data.rating < 1 || data.rating > 5) {
        throw createError("Rating must be between 1 and 5", 400);
      }

      // Check if doctor exists
      const doctorExists = await db
        .select()
        .from(doctors)
        .where(eq(doctors.id, data.doctorId))
        .limit(1);

      if (doctorExists.length === 0) {
        throw createError("Doctor not found", 404);
      }

      // Check if user already reviewed this doctor
      const existingReview = await db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.userId, data.userId),
            eq(reviews.doctorId, data.doctorId)
          )
        )
        .limit(1);

      if (existingReview.length > 0) {
        throw createError("You have already reviewed this doctor", 409);
      }

      // Create review
      const [review] = await db
        .insert(reviews)
        .values({
          userId: data.userId,
          doctorId: data.doctorId,
          rating: data.rating,
          comment: data.comment || null,
        })
        .returning();

      // Update doctor's average rating
      await this.updateDoctorRating(data.doctorId);

      // Fetch review with user info
      const reviewWithUser = await this.getReviewById(review.id);
      return reviewWithUser;
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }
      console.error("Error creating review:", error);
      throw createError("Failed to create review", 500);
    }
  }

  async getReviewsByDoctorId(
    doctorId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    reviews: ReviewResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    averageRating: number;
    totalReviews: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      // Get reviews with user info
      const reviewsList = await db
        .select({
          id: reviews.id,
          userId: reviews.userId,
          doctorId: reviews.doctorId,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(reviews)
        .innerJoin(users, eq(reviews.userId, users.id))
        .where(eq(reviews.doctorId, doctorId))
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(reviews)
        .where(eq(reviews.doctorId, doctorId));

      const totalCount = countResult?.count || 0;

      // Get average rating
      const [avgResult] = await db
        .select({ average: avg(reviews.rating) })
        .from(reviews)
        .where(eq(reviews.doctorId, doctorId));

      const averageRating = avgResult?.average
        ? parseFloat(avgResult.average)
        : 0;

      const reviewsResponse: ReviewResponse[] = reviewsList.map((review) => ({
        id: review.id,
        userId: review.userId,
        doctorId: review.doctorId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: {
          firstName: review.firstName,
          lastName: review.lastName,
          email: review.email,
        },
      }));

      const totalReviews = totalCount || 0;
      const totalPages = Math.ceil(totalReviews / limit);

      return {
        reviews: reviewsResponse,
        pagination: {
          page,
          limit,
          total: totalReviews,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        averageRating: Math.round(averageRating * 100) / 100,
        totalReviews,
      };
    } catch (error) {
      console.error("Error fetching reviews:", error);
      throw createError("Failed to fetch reviews", 500);
    }
  }

  async getReviewById(reviewId: string): Promise<ReviewResponse> {
    try {
      const [review] = await db
        .select({
          id: reviews.id,
          userId: reviews.userId,
          doctorId: reviews.doctorId,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(reviews)
        .innerJoin(users, eq(reviews.userId, users.id))
        .where(eq(reviews.id, reviewId))
        .limit(1);

      if (!review) {
        throw createError("Review not found", 404);
      }

      return {
        id: review.id,
        userId: review.userId,
        doctorId: review.doctorId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: {
          firstName: review.firstName,
          lastName: review.lastName,
          email: review.email,
        },
      };
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }
      console.error("Error fetching review:", error);
      throw createError("Failed to fetch review", 500);
    }
  }

  private async updateDoctorRating(doctorId: string): Promise<void> {
    try {
      // Calculate average rating
      const [avgResult] = await db
        .select({ average: avg(reviews.rating) })
        .from(reviews)
        .where(eq(reviews.doctorId, doctorId));

      const averageRating = avgResult?.average
        ? parseFloat(avgResult.average)
        : 0;

      // Update doctor's patient satisfaction rate
      await db
        .update(doctors)
        .set({
          patientSatisfactionRate: averageRating.toString(),
          updatedAt: new Date(),
        })
        .where(eq(doctors.id, doctorId));
    } catch (error) {
      console.error("Error updating doctor rating:", error);
      // Don't throw error here, just log it
    }
  }
}

export const reviewService = new ReviewService();

