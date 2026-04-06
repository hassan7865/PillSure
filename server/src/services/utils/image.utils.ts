import { sql } from "drizzle-orm";
import { s3Service } from "../s3.service";

export interface ImageUpdateResult {
  finalImages: string[];
  imagesToDelete: string[];
  uploadedImages: string[];
}

async function handleImageUpdateWithFolder(
  currentImages: string[],
  existingImageUrls: string[],
  newImages: Express.Multer.File[],
  opts: { folder: string; maxImages: number; overLimitLabel: string },
): Promise<ImageUpdateResult> {
  const { folder, maxImages, overLimitLabel } = opts;
  const totalImages = existingImageUrls.length + newImages.length;
  if (totalImages > maxImages) {
    throw new Error(
      `Maximum ${maxImages} ${overLimitLabel} allowed. You are trying to have ${totalImages} images.`,
    );
  }

  let uploadedImages: string[] = [];
  if (newImages.length > 0) {
    const uploadResults = await s3Service.uploadMultipleFiles(newImages, { folder });
    uploadedImages = uploadResults.map((result) => result.url);
  }

  const imagesToDelete = currentImages.filter(
    (imageUrl) => !existingImageUrls.includes(imageUrl),
  );

  const finalImages = [...existingImageUrls, ...uploadedImages];

  return {
    finalImages,
    imagesToDelete,
    uploadedImages,
  };
}

export async function handleMedicineImageUpdate(
  currentImages: string[],
  existingImageUrls: string[],
  newImages: Express.Multer.File[],
  maxImages: number = 4,
): Promise<ImageUpdateResult> {
  return handleImageUpdateWithFolder(currentImages, existingImageUrls, newImages, {
    folder: "medicines",
    maxImages,
    overLimitLabel: "images",
  });
}

export async function handleListingPackImageUpdate(
  currentImages: string[],
  existingImageUrls: string[],
  newImages: Express.Multer.File[],
  maxImages: number = 4,
): Promise<ImageUpdateResult> {
  return handleImageUpdateWithFolder(currentImages, existingImageUrls, newImages, {
    folder: "store-pack-images",
    maxImages,
    overLimitLabel: "pack images",
  });
}

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

export function formatImagesForDB(images: string[]) {
  return sql`${JSON.stringify(images)}::jsonb`;
}
