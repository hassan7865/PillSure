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

