import { Router, Request, Response, NextFunction } from "express";
import { AdminService } from "../services/admin.service";
import { verifyToken } from "../middleware/jwt.handler";
import { ApiResponse } from "../core/api-response";
import { BadRequestError } from "../middleware/error.handler";
import { parsePageLimitQuery } from "../utils/query-params";

export class AdminRoute {
  private router: Router;
  private adminService: AdminService;

  constructor() {
    this.router = Router();
    this.adminService = new AdminService();
    this.initializeRoutes();
  }

  private parseAdminListQuery(req: Request): { page: number; limit: number; search: string } {
    const { page, limit } = parsePageLimitQuery(req, { limitDefault: 10 });
    const search = (req.query.search as string) || "";
    return { page, limit, search };
  }

  private initializeRoutes() {
    this.router.get("/stats", verifyToken, this.getStats.bind(this));
    this.router.get("/revenue/monthly", verifyToken, this.getMonthlyRevenue.bind(this));

    this.router.get("/doctors", verifyToken, this.getDoctors.bind(this));

    this.router.get("/hospitals", verifyToken, this.getHospitals.bind(this));

    this.router.get("/specializations", verifyToken, this.getAllSpecializations.bind(this));
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
      const { page, limit, search } = this.parseAdminListQuery(req);

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
      const { page, limit, search } = this.parseAdminListQuery(req);

      if (limit < 1 || limit > 100) {
        return next(BadRequestError("Limit must be between 1 and 100"));
      }

      const result = await this.adminService.getHospitals(page, limit, search);
      res.status(200).json(ApiResponse(result, "Hospitals retrieved successfully"));
    } catch (error) {
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

  public getRouter(): Router {
    return this.router;
  }
}
