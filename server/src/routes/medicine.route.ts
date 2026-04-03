import { Router, Request, Response, NextFunction } from "express";
import { medicineService } from "../services/medicine.service";
import { BadRequestError } from "../middleware/error.handler";
import { ApiResponse } from "../core/api-response";

export class MedicineRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // GET /api/medicine/featured?limit=6&category=Vitamins&uniqueCategories=true
    this.router.get("/featured", this.getFeatured);

    // GET /api/medicine/catalog?category=Vitamins&search=paracetamol&perCategoryLimit=12
    this.router.get("/catalog", this.getCatalogMedicines);

    // GET /api/medicine/search?q=paracetamol&limit=20 - Search medicines
    this.router.get("/search", this.searchMedicines);

    this.router.get("/drug-categories", this.listDrugCategories);

    // GET /api/medicine/:id - Get medicine by ID
    this.router.get("/:id", this.getMedicineById);
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

  private getCatalogMedicines = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = (req.query.category as string | undefined) || undefined;
      const search = (req.query.search as string | undefined) || undefined;
      const perCategoryLimitParam = req.query.perCategoryLimit as string | undefined;
      const categoryPageParam = req.query.categoryPage as string | undefined;
      const categoriesPerPageParam = req.query.categoriesPerPage as string | undefined;

      let perCategoryLimit: number | undefined = undefined;
      if (perCategoryLimitParam !== undefined) {
        const parsed = parseInt(perCategoryLimitParam, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 24) {
          return next(BadRequestError("perCategoryLimit must be an integer between 1 and 24"));
        }
        perCategoryLimit = parsed;
      }

      let categoryPage: number | undefined = undefined;
      if (categoryPageParam !== undefined) {
        const parsed = parseInt(categoryPageParam, 10);
        if (isNaN(parsed) || parsed < 1) {
          return next(BadRequestError("categoryPage must be an integer greater than 0"));
        }
        categoryPage = parsed;
      }

      let categoriesPerPage: number | undefined = undefined;
      if (categoriesPerPageParam !== undefined) {
        const parsed = parseInt(categoriesPerPageParam, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 20) {
          return next(BadRequestError("categoriesPerPage must be an integer between 1 and 20"));
        }
        categoriesPerPage = parsed;
      }

      const data = await medicineService.getCatalogMedicines({
        category,
        search,
        perCategoryLimit,
        categoryPage,
        categoriesPerPage,
      });
      res.status(200).json(ApiResponse(data, "Catalog medicines retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private searchMedicines = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query.q as string | undefined;
      const limitParam = req.query.limit as string | undefined;

      if (!query || query.trim().length === 0) {
        return res.status(200).json(ApiResponse([], "No search query provided"));
      }

      const limit = limitParam ? parseInt(limitParam, 10) : 20;
      if (isNaN(limit) || limit < 1 || limit > 50) {
        return next(BadRequestError("Limit must be between 1 and 50"));
      }

      const medicines = await medicineService.searchMedicines(query, limit);
      res.status(200).json(ApiResponse(medicines, "Medicines retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private listDrugCategories = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await medicineService.listDrugCategories();
      res.status(200).json(ApiResponse(data, "Drug categories retrieved successfully"));
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

      const medicine = await medicineService.getMedicineById(medicineId);
      res.status(200).json(ApiResponse(medicine, "Medicine retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}

export default MedicineRoute;
