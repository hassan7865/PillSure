import { Router, Request, Response, NextFunction } from "express";
import { medicineService } from "../services/medicine.service";
import { BadRequestError } from "../middleware/error.handler";
import { ApiResponse } from "../core/api-response";
import { upload, handleMulterError } from "../config/multer.config";

export class MedicineRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // GET /api/medicine/featured?limit=6&category=Vitamins&uniqueCategories=true
    this.router.get("/featured", this.getFeatured);

    // GET /api/medicine/:id - Get medicine by ID
    this.router.get("/:id", this.getMedicineById);

    // PATCH /api/medicine/:id/images - Update medicine images (max 4)
    this.router.patch(
      "/:id/images",
      upload.array("images", 4),
      handleMulterError,
      this.updateMedicineImages
    );
  }

  private getFeatured = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limitParam = req.query.limit as string | undefined;
      const category = (req.query.category as string | undefined) || undefined;
      const uniqueCategoriesParam = (req.query.uniqueCategories as string | undefined) ?? 'true';

      let limit: number | undefined = undefined;
      if (limitParam !== undefined) {
        const parsed = parseInt(limitParam, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 24) {
          return next(BadRequestError("limit must be an integer between 1 and 24"));
        }
        limit = parsed;
      }

      const uniqueCategories = uniqueCategoriesParam.toLowerCase() !== 'false';

      const data = await medicineService.getFeaturedMedicines({ limit, category, uniqueCategories });
      res.status(200).json(ApiResponse(data, "Featured medicines retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getMedicineById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const medicineId = parseInt(req.params.id, 10);

      if (isNaN(medicineId)) {
        return next(BadRequestError("Invalid medicine ID"));
      }

      const medicine = await medicineService.getMedicineById(medicineId);
      res.status(200).json(ApiResponse(medicine, "Medicine retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private updateMedicineImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const medicineId = parseInt(req.params.id, 10);

      if (isNaN(medicineId)) {
        return next(BadRequestError("Invalid medicine ID"));
      }

      // Get uploaded files
      const files = req.files as Express.Multer.File[];

      // Get existing image URLs from request body (sent as JSON array)
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

      // Validate total count
      const totalImages = existingImageUrls.length + (files?.length || 0);
      if (totalImages > 4) {
        return next(
          BadRequestError(
            `Maximum 4 images allowed. You have ${existingImageUrls.length} existing images and trying to upload ${files?.length || 0} new images.`
          )
        );
      }

      if (totalImages === 0) {
        return next(BadRequestError("At least one image is required"));
      }

      const updatedMedicine = await medicineService.updateMedicineImages(
        medicineId,
        files || [],
        existingImageUrls
      );

      res.status(200).json(
        ApiResponse(
          updatedMedicine,
          "Medicine images updated successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}

export default MedicineRoute;
