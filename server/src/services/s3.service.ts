import { PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3Client, s3Config, validateS3Config } from "../config/s3.config";
import { v4 as uuidv4 } from "uuid";

export interface UploadOptions {
  folder?: string;
  fileName?: string;
  contentType?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export class S3Service {
  private bucketName: string;
  private region: string;

  constructor() {
    this.bucketName = s3Config.bucketName;
    this.region = s3Config.region;
  }
async uploadFile(
    file: Buffer | Express.Multer.File,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      if (!validateS3Config()) {
        throw new Error(
          "S3 credentials are not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME, and AWS_REGION in server/.env.",
        );
      }
      const fileBuffer = Buffer.isBuffer(file) ? file : file.buffer;
      const originalName = Buffer.isBuffer(file) ? options.fileName || "file" : file.originalname;
      const mimeType = Buffer.isBuffer(file) ? options.contentType : file.mimetype;

      // Enforce image-only uploads (MIME + extension checks)
      if (!mimeType || !mimeType.startsWith("image/")) {
        throw new Error(`Only image uploads are allowed. Received: ${mimeType || "unknown"}`);
      }

      const mimeToExtension: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/heic": "heic",
        "image/heif": "heif",
        "image/avif": "avif",
      };
      const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "avif", "jfif"]);

      // Keep extension policy centralized here for all uploads using s3Service.
      const rawExt = (originalName.split(".").pop() || "").toLowerCase();
      let fileExtension = rawExt;
      if (!fileExtension || !allowedExtensions.has(fileExtension)) {
        const fromMime = mimeToExtension[mimeType.toLowerCase()];
        if (fromMime) fileExtension = fromMime;
      }
      if (!fileExtension || !allowedExtensions.has(fileExtension)) {
        throw new Error(
          `Image extension is not supported. Received extension "${rawExt || "(none)"}" and mimetype "${mimeType}".`,
        );
      }

      // Block SVG explicitly if not desired (XSS risk if inlined)
      if (mimeType === "image/svg+xml") {
        throw new Error("SVG uploads are not permitted.");
      }

      const MAX_BYTES = 5 * 1024 * 1024;
      if (fileBuffer.length > MAX_BYTES) {
        throw new Error(`File too large (${fileBuffer.length} bytes). Max allowed is ${MAX_BYTES} bytes.`);
      }

      // Generate unique filename
      const uniqueFileName = `${this.sanitizeFileName(originalName)}_${Date.now()}_${uuidv4().slice(0, 8)}.${fileExtension}`;

      // Construct S3 key (path in bucket)
      const folder = options.folder || "uploads";
      const key = `${folder}/${uniqueFileName}`;

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        // ACL: "public-read", // Uncomment if you want files to be publicly accessible
      });

      await s3Client.send(command);

      // Construct public URL
      const url = `https://${this.bucketName}.s3.amazonaws.com/${key}`;

      return {
        url,
        key,
        bucket: this.bucketName,
      };
    } catch (error) {
      console.error("Error uploading file to S3:", error);
      throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
async uploadMultipleFiles(
    files: Express.Multer.File[],
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }
async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await s3Client.send(command);
    } catch (error) {
      console.error("Error deleting file from S3:", error);
      throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
async deleteMultipleFiles(keys: string[]): Promise<void> {
    try {
      if (keys.length === 0) return;

      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      });

      await s3Client.send(command);
    } catch (error) {
      console.error("Error deleting files from S3:", error);
      throw new Error(`Failed to delete files from S3: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
extractKeyFromUrl(url: string): string | null {
    try {
      const escapedBucket = this.bucketName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escapedRegion = this.region.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const patterns = [
        new RegExp(`^https://${escapedBucket}\\.s3\\.amazonaws\\.com/(.+)$`),
        new RegExp(`^https://${escapedBucket}\\.s3\\.${escapedRegion}\\.amazonaws\\.com/(.+)$`),
      ];
      for (const p of patterns) {
        const match = url.match(p);
        if (match) return match[1];
      }
      return null;
    } catch (error) {
      return null;
    }
  }
private sanitizeFileName(fileName: string): string {
    // Remove extension
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
    // Replace spaces and special characters with underscores
    return nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .substring(0, 50); // Limit length
  }
}

export const s3Service = new S3Service();
