import { Router, Request, Response, NextFunction } from "express";
import { AdminService } from "../services/admin.service";
import { verifyToken } from "../middleware/jwt.handler";
import { ApiResponse } from "../core/api-response";
import { BadRequestError } from "../middleware/error.handler";
import { upload, handleMulterError } from "../config/multer.config";

export class AdminRoute {
  private router: Router;
  private adminService: AdminService;

  constructor() {
    this.router = Router();
    this.adminService = new AdminService();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Admin stats endpoint - requires authentication only
    // TODO: Add admin role check in middleware later
    this.router.get(
      "/stats",
      verifyToken,
      this.getStats.bind(this)
    );

    // Admin doctors endpoint - paginated list
    this.router.get(
      "/doctors",
      verifyToken,
      this.getDoctors.bind(this)
    );

    // Admin hospitals endpoint - paginated list
    this.router.get(
      "/hospitals",
      verifyToken,
      this.getHospitals.bind(this)
    );

    // Admin medicines endpoint - paginated list
    this.router.get(
      "/medicines",
      verifyToken,
      this.getMedicines.bind(this)
    );

    // Admin medicine update endpoint (with optional image uploads)
    this.router.put(
      "/medicines/:id",
      verifyToken,
      upload.array("images", 4),
      handleMulterError,
      this.updateMedicine.bind(this)
    );
  }

  private async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await this.adminService.getStats();
      res.status(200).json(ApiResponse(stats, "Admin stats retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async getDoctors(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';

      // Validate pagination parameters
      if (page < 1) {
        return next(BadRequestError("Page must be greater than 0"));
      }
      if (limit < 1 || limit > 100) {
        return next(BadRequestError("Limit must be between 1 and 100"));
      }

      const result = await this.adminService.getDoctors(page, limit, search);
      res.status(200).json(ApiResponse(result, "Doctors retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async getHospitals(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';

      // Validate pagination parameters
      if (page < 1) {
        return next(BadRequestError("Page must be greater than 0"));
      }
      if (limit < 1 || limit > 100) {
        return next(BadRequestError("Limit must be between 1 and 100"));
      }

      const result = await this.adminService.getHospitals(page, limit, search);
      res.status(200).json(ApiResponse(result, "Hospitals retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async getMedicines(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';

      // Validate pagination parameters
      if (page < 1) {
        return next(BadRequestError("Page must be greater than 0"));
      }
      if (limit < 1 || limit > 100) {
        return next(BadRequestError("Limit must be between 1 and 100"));
      }

      const result = await this.adminService.getMedicines(page, limit, search);
      res.status(200).json(ApiResponse(result, "Medicines retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async updateMedicine(req: Request, res: Response, next: NextFunction) {
    try {
      const medicineId = parseInt(req.params.id);
      if (isNaN(medicineId) || medicineId < 1) {
        return next(BadRequestError("Invalid medicine ID"));
      }

      // Get uploaded files
      const files = req.files as Express.Multer.File[];

      // Get existing image URLs from request body
      let existingImageUrls: string[] = [];
      if (req.body.existingImages) {
        try {
          existingImageUrls = typeof req.body.existingImages === 'string' 
            ? JSON.parse(req.body.existingImages) 
            : req.body.existingImages;

          if (!Array.isArray(existingImageUrls)) {
            return next(BadRequestError("existingImages must be an array"));
          }
        } catch (error) {
          return next(BadRequestError("Invalid existingImages format"));
        }
      }

      // Validate total images count
      const totalImages = existingImageUrls.length + (files?.length || 0);
      if (totalImages > 4) {
        return next(
          BadRequestError(
            `Maximum 4 images allowed. You have ${existingImageUrls.length} existing images and trying to upload ${files?.length || 0} new images.`
          )
        );
      }

      const result = await this.adminService.updateMedicine(
        medicineId, 
        req.body,
        files || [],
        existingImageUrls
      );
      res.status(200).json(ApiResponse(result, "Medicine updated successfully"));
    } catch (error: any) {
      if (error.message === "Medicine not found") {
        return next(BadRequestError("Medicine not found"));
      }
      next(error);
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}

