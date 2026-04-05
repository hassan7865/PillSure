import { Router, Request, Response, NextFunction } from "express";
import { medicineService } from "../services/medicine.service";
import { BadRequestError } from "../middleware/error.handler";
import { ApiResponse } from "../core/api-response";
import {
  parseIntInRangeOrDefault,
  parseOptionalIntInRange,
  parseOptionalPositiveInt,
} from "../utils/query-params";

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

    // GET /api/medicine/manufacturers — list manufacturers (for filters)
    this.router.get("/manufacturers", this.listManufacturers);

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
        const lr = parseOptionalIntInRange(limitParam, 1, 24, "limit");
        if (!lr.ok) return next(lr.error);
        limit = lr.value;
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

      const pl = parseOptionalIntInRange(perCategoryLimitParam, 1, 24, "perCategoryLimit");
      if (!pl.ok) return next(pl.error);
      const perCategoryLimit = pl.value;

      const cp = parseOptionalPositiveInt(categoryPageParam, "categoryPage");
      if (!cp.ok) return next(cp.error);
      const categoryPage = cp.value;

      const cpp = parseOptionalIntInRange(categoriesPerPageParam, 1, 20, "categoriesPerPage");
      if (!cpp.ok) return next(cpp.error);
      const categoriesPerPage = cpp.value;

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
      const manufacturerIdRaw = req.query.manufacturerId as string | undefined;

      if (!query || query.trim().length === 0) {
        return res.status(200).json(ApiResponse([], "No search query provided"));
      }

      const lr = parseIntInRangeOrDefault(limitParam, 20, 1, 50, "Limit");
      if (!lr.ok) return next(lr.error);
      const limit = lr.value;

      let manufacturerId: string | undefined;
      if (manufacturerIdRaw != null && String(manufacturerIdRaw).trim() !== "") {
        const m = String(manufacturerIdRaw).trim();
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m)
        ) {
          return next(BadRequestError("manufacturerId must be a valid UUID"));
        }
        manufacturerId = m;
      }

      const medicines = await medicineService.searchMedicines(query, limit, manufacturerId);
      res.status(200).json(ApiResponse(medicines, "Medicines retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private listManufacturers = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await medicineService.listManufacturersForPicker();
      res.status(200).json(ApiResponse(data, "Manufacturers retrieved successfully"));
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

  public getRouter(): Router {
    return this.router;
  }
}

export default MedicineRoute;
