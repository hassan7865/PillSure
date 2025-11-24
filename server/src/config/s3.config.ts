import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

// AWS S3 Configuration
export const s3Config = {
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  bucketName: process.env.AWS_S3_BUCKET_NAME || "",
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
    console.error("AWS S3 configuration is incomplete. Please check your environment variables.");
    return false;
  }

  return true;
};
