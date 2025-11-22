import { Router, Request, Response, NextFunction } from "express";
import { AdminService } from "../services/admin.service";
import { verifyToken } from "../middleware/jwt.handler";
import { ApiResponse } from "../core/api-response";
import { BadRequestError } from "../middleware/error.handler";

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

    // Admin medicine update endpoint
    this.router.put(
      "/medicines/:id",
      verifyToken,
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

      const result = await this.adminService.updateMedicine(medicineId, req.body);
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

