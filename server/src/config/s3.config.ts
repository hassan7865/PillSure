import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

// AWS S3 Configuration
export const s3Config = {
  region: (process.env.AWS_REGION || "us-east-1").trim(),
  credentials: {
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || "").trim(),
  },
  bucketName: (process.env.AWS_S3_BUCKET_NAME || "").trim(),
};

// Initialize S3 Client
export const s3Client = new S3Client({
  region: s3Config.region,
  credentials: s3Config.credentials,
});

// Validate S3 configuration
export const validateS3Config = (): boolean => {
  const { accessKeyId, secretAccessKey } = s3Config.credentials;
  const { bucketName, region } = s3Config;

  if (!accessKeyId || !secretAccessKey || !bucketName || !region) {
    const missing: string[] = [];
    if (!accessKeyId) missing.push("AWS_ACCESS_KEY_ID");
    if (!secretAccessKey) missing.push("AWS_SECRET_ACCESS_KEY");
    if (!bucketName) missing.push("AWS_S3_BUCKET_NAME");
    if (!region) missing.push("AWS_REGION");
    console.error(
      `AWS S3 configuration is incomplete. Missing: ${missing.join(", ")}. ` +
        "Set these env vars in server/.env and restart the server.",
    );
    return false;
  }

  return true;
};
