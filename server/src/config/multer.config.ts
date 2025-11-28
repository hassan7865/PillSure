import multer from "multer";
import { BadRequestError } from "../middleware/error.handler";

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  // Accept images only
  if (file.mimetype.startsWith("image/")) {
    callback(null, true);
  } else {
    callback(BadRequestError("Only image files are allowed") as any);
  }
};

// Multer configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Middleware for handling upload errors
export const handleMulterError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return next(BadRequestError("File size exceeds 5MB limit"));
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return next(BadRequestError("Too many files uploaded"));
    }
    return next(BadRequestError(error.message));
  }
  next(error);
};
