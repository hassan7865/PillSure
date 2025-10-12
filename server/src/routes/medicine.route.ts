import { Router, Request, Response, NextFunction } from "express";
import { medicineService } from "../services/medicine.service";
import { BadRequestError } from "../middleware/error.handler";
import { createSuccessResponse } from "../core/api-response";

export class MedicineRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // GET /api/medicine/featured?limit=6&category=Vitamins&uniqueCategories=true
    this.router.get("/featured", this.getFeatured);
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
      res.status(200).json(createSuccessResponse(data, "Featured medicines retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}

export default MedicineRoute;
