import { PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3Client, s3Config } from "../config/s3.config";
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

  /**
   * Upload a single file to S3
   * @param file - Buffer or file data to upload
   * @param options - Upload options (folder, fileName, contentType)
   * @returns Promise with upload result containing URL, key, and bucket
   */
  async uploadFile(
    file: Buffer | Express.Multer.File,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const fileBuffer = Buffer.isBuffer(file) ? file : file.buffer;
      const originalName = Buffer.isBuffer(file) ? options.fileName || "file" : file.originalname;
      const mimeType = Buffer.isBuffer(file) ? options.contentType : file.mimetype;

      // Enforce image-only uploads (MIME + extension checks)
      if (!mimeType || !mimeType.startsWith("image/")) {
        throw new Error(`Only image uploads are allowed. Received: ${mimeType || "unknown"}`);
      }

      const fileExtension = (originalName.split(".").pop() || "").toLowerCase();
      const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
      if (!allowedExtensions.has(fileExtension)) {
        throw new Error(`Extension .${fileExtension || "(none)"} not allowed. Allowed: ${Array.from(allowedExtensions).join(", ")}`);
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

  /**
   * Upload multiple files to S3
   * @param files - Array of files to upload
   * @param options - Upload options
   * @returns Promise with array of upload results
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a single file from S3
   * @param key - S3 key (path) of the file to delete
   * @returns Promise<void>
   */
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

  /**
   * Delete multiple files from S3
   * @param keys - Array of S3 keys to delete
   * @returns Promise<void>
   */
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

  /**
   * Extract S3 key from URL
   * @param url - Full S3 URL
   * @returns S3 key or null if invalid URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const pattern = new RegExp(`https://${this.bucketName}\\.s3\\.${this.region}\\.amazonaws\\.com/(.+)`);
      const match = url.match(pattern);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Sanitize filename to remove special characters
   * @param fileName - Original filename
   * @returns Sanitized filename
   */
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
