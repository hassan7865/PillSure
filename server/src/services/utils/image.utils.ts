/**
 * Utility functions for medicine image handling
 */
import { sql } from "drizzle-orm";
import { s3Service } from "../s3.service";

export interface ImageUpdateResult {
  finalImages: string[];
  imagesToDelete: string[];
  uploadedImages: string[];
}

/**
 * Handle medicine image updates
 * @param currentImages - Current images in database
 * @param existingImageUrls - Image URLs to keep
 * @param newImages - New image files to upload
 * @param maxImages - Maximum number of images allowed (default: 4)
 * @returns Image update result with final images, images to delete, and uploaded images
 */
export async function handleMedicineImageUpdate(
  currentImages: string[],
  existingImageUrls: string[],
  newImages: Express.Multer.File[],
  maxImages: number = 4
): Promise<ImageUpdateResult> {
  // Validate total images (existing + new) <= maxImages
  const totalImages = existingImageUrls.length + newImages.length;
  if (totalImages > maxImages) {
    throw new Error(
      `Maximum ${maxImages} images allowed. You are trying to have ${totalImages} images.`
    );
  }

  // Upload new images to S3
  let uploadedImages: string[] = [];
  if (newImages.length > 0) {
    const uploadResults = await s3Service.uploadMultipleFiles(newImages, {
      folder: "medicines",
    });
    uploadedImages = uploadResults.map((result) => result.url);
  }

  // Determine which images to delete
  const imagesToDelete = currentImages.filter(
    (imageUrl) => !existingImageUrls.includes(imageUrl)
  );

  // Combine existing and new images
  const finalImages = [...existingImageUrls, ...uploadedImages];

  return {
    finalImages,
    imagesToDelete,
    uploadedImages,
  };
}

/**
 * Cleanup uploaded images from S3 (for rollback on error)
 * @param uploadedImages - Array of uploaded image URLs
 */
export async function cleanupUploadedImages(
  uploadedImages: string[]
): Promise<void> {
  if (uploadedImages.length === 0) {
    return;
  }

  const keysToCleanup = uploadedImages
    .map((url) => s3Service.extractKeyFromUrl(url))
    .filter((key): key is string => key !== null);

  if (keysToCleanup.length > 0) {
    await s3Service.deleteMultipleFiles(keysToCleanup).catch((cleanupErr) => {
      console.error("Error cleaning up uploaded images after failure:", cleanupErr);
    });
  }
}

/**
 * Delete old images from S3 (best-effort, non-blocking)
 * @param imagesToDelete - Array of image URLs to delete
 */
export async function deleteOldImages(
  imagesToDelete: string[]
): Promise<void> {
  if (imagesToDelete.length === 0) {
    return;
  }

  const keysToDelete = imagesToDelete
    .map((url) => s3Service.extractKeyFromUrl(url))
    .filter((key): key is string => key !== null);

  if (keysToDelete.length > 0) {
    await s3Service.deleteMultipleFiles(keysToDelete).catch((err) => {
      console.error("Warning: Failed to delete old images from S3:", err);
      // Don't throw - DB update succeeded, S3 cleanup is best-effort
    });
  }
}

/**
 * Format images array for database storage (JSONB)
 */
export function formatImagesForDB(images: string[]) {
  return sql`${JSON.stringify(images)}::jsonb`;
}
