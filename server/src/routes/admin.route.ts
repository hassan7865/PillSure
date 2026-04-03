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
    this.router.get(
      "/revenue/monthly",
      verifyToken,
      this.getMonthlyRevenue.bind(this)
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

    // Medicine drug categories CRUD
    this.router.get(
      "/drug-categories",
      verifyToken,
      this.getDrugCategories.bind(this)
    );
    this.router.post(
      "/drug-categories",
      verifyToken,
      this.createDrugCategory.bind(this)
    );
    this.router.put(
      "/drug-categories/:id",
      verifyToken,
      this.updateDrugCategory.bind(this)
    );
    this.router.delete(
      "/drug-categories/:id",
      verifyToken,
      this.deleteDrugCategory.bind(this)
    );

    this.router.get(
      "/specializations",
      verifyToken,
      this.getAllSpecializations.bind(this)
    );
    this.router.get(
      "/drug-categories/:id/mappings",
      verifyToken,
      this.getDrugCategoryMappings.bind(this)
    );
    this.router.put(
      "/drug-categories/:id/mappings",
      verifyToken,
      this.setDrugCategoryMappings.bind(this)
    );

    // Admin medicines endpoint - paginated list
    this.router.get(
      "/medicines",
      verifyToken,
      this.getMedicines.bind(this)
    );

    // Admin orders endpoint - paginated list with filters
    this.router.get(
      "/orders",
      verifyToken,
      this.getOrders.bind(this)
    );

    // Admin order status update endpoint
    this.router.patch(
      "/orders/:id/status",
      verifyToken,
      this.updateOrderStatus.bind(this)
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

  private async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';
      const status = (req.query.status as string) || '';
      const dateFrom = (req.query.dateFrom as string) || '';
      const dateTo = (req.query.dateTo as string) || '';

      if (page < 1) {
        return next(BadRequestError("Page must be greater than 0"));
      }
      if (limit < 1 || limit > 100) {
        return next(BadRequestError("Limit must be between 1 and 100"));
      }

      const result = await this.adminService.getOrders({
        page,
        limit,
        search,
        status,
        dateFrom,
        dateTo,
      });
      res.status(200).json(ApiResponse(result, "Orders retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = req.params.id;
      const { status } = req.body;

      const validStatuses = ["pending", "shipped", "delivered", "returned"];
      if (!status || !validStatuses.includes(status)) {
        return next(BadRequestError("Invalid order status"));
      }

      const result = await this.adminService.updateOrderStatus(orderId, status);
      res.status(200).json(ApiResponse(result, "Order status updated successfully"));
    } catch (error: any) {
      if (error?.message === "Order not found") {
        return next(BadRequestError("Order not found"));
      }
      next(error);
    }
  }

  private async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await this.adminService.getStats();
      res.status(200).json(ApiResponse(stats, "Admin stats retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async getMonthlyRevenue(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedYear = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      if (parsedYear && (parsedYear < 2000 || parsedYear > 2100)) {
        return next(BadRequestError("Year must be between 2000 and 2100"));
      }

      const data = await this.adminService.getMonthlyRevenueByYear(parsedYear);
      res.status(200).json(ApiResponse(data, "Monthly revenue retrieved successfully"));
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

  private async getDrugCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";

      if (page < 1) {
        return next(BadRequestError("Page must be greater than 0"));
      }
      if (limit < 1 || limit > 100) {
        return next(BadRequestError("Limit must be between 1 and 100"));
      }

      const result = await this.adminService.getDrugCategories(page, limit, search);
      res.status(200).json(ApiResponse(result, "Drug categories retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async createDrugCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const name = req.body?.name as string | undefined;
      const result = await this.adminService.createDrugCategory(name ?? "");
      res.status(201).json(ApiResponse(result, "Drug category created successfully"));
    } catch (error: any) {
      if (error?.message === "Category name is required" || error?.message?.includes("already exists") || error?.message?.includes("200 characters")) {
        return next(BadRequestError(error.message));
      }
      next(error);
    }
  }

  private async updateDrugCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id < 1) {
        return next(BadRequestError("Invalid category ID"));
      }
      const name = req.body?.name as string | undefined;
      const result = await this.adminService.updateDrugCategory(id, name ?? "");
      res.status(200).json(ApiResponse(result, "Drug category updated successfully"));
    } catch (error: any) {
      if (error?.message === "Category not found") {
        return next(BadRequestError("Category not found"));
      }
      if (
        error?.message === "Category name is required" ||
        error?.message?.includes("already exists") ||
        error?.message?.includes("200 characters") ||
        error?.message === "Invalid category id"
      ) {
        return next(BadRequestError(error.message));
      }
      next(error);
    }
  }

  private async getAllSpecializations(req: Request, res: Response, next: NextFunction) {
    try {
      const rows = await this.adminService.getAllSpecializations();
      res.status(200).json(ApiResponse(rows, "Specializations retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async getDrugCategoryMappings(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id < 1) {
        return next(BadRequestError("Invalid category ID"));
      }
      const result = await this.adminService.getDrugCategoryMappings(id);
      res.status(200).json(ApiResponse(result, "Mappings retrieved successfully"));
    } catch (error: any) {
      if (error?.message === "Category not found" || error?.message === "Invalid category id") {
        return next(BadRequestError(error.message === "Category not found" ? "Category not found" : "Invalid category ID"));
      }
      next(error);
    }
  }

  private async setDrugCategoryMappings(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id < 1) {
        return next(BadRequestError("Invalid category ID"));
      }
      const specializationIds = req.body?.specializationIds;
      const result = await this.adminService.setDrugCategoryMappings(id, specializationIds);
      res.status(200).json(ApiResponse(result, "Mappings saved successfully"));
    } catch (error: any) {
      if (error?.message === "Category not found" || error?.message === "Invalid category id") {
        return next(BadRequestError(error.message === "Category not found" ? "Category not found" : "Invalid category ID"));
      }
      if (error?.message === "Invalid specialization id") {
        return next(BadRequestError("Invalid specialization id"));
      }
      next(error);
    }
  }

  private async deleteDrugCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id < 1) {
        return next(BadRequestError("Invalid category ID"));
      }
      const result = await this.adminService.deleteDrugCategory(id);
      res.status(200).json(ApiResponse(result, "Drug category deleted successfully"));
    } catch (error: any) {
      if (error?.message === "Category not found" || error?.message === "Invalid category id") {
        return next(BadRequestError(error.message === "Category not found" ? "Category not found" : "Invalid category ID"));
      }
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

