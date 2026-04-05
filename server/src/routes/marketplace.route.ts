import { Router, Request, Response, NextFunction } from "express";
import { ApiResponse } from "../core/api-response";
import { BadRequestError } from "../middleware/error.handler";
import { medicalStoreService } from "../services/medicalStore.service";
import { parsePageLimitQuery } from "../utils/query-params";

export class MarketplaceRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/stores", this.listStores);
    this.router.get("/listings/search", this.searchListings);
    this.router.get("/stores/:storeId/catalog", this.getStoreCatalog);
    this.router.get("/stores/:storeId", this.getStore);
  }

  private listStores = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = parsePageLimitQuery(req, { limitDefault: 12 });
      const q = (req.query.q as string | undefined) || undefined;
      const latRaw = req.query.lat as string | undefined;
      const lngRaw = req.query.lng as string | undefined;
      const lat = latRaw !== undefined ? parseFloat(latRaw) : undefined;
      const lng = lngRaw !== undefined ? parseFloat(lngRaw) : undefined;
      const result = await medicalStoreService.listPublicStores({
        page,
        limit,
        q,
        lat,
        lng,
      });
      res.status(200).json(ApiResponse(result, "Stores retrieved."));
    } catch (error) {
      next(error);
    }
  };

  private getStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;
      const result = await medicalStoreService.getPublicStoreById(storeId);
      res.status(200).json(ApiResponse(result, "Store retrieved."));
    } catch (error) {
      next(error);
    }
  };

  private getStoreCatalog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;
      const { page, limit } = parsePageLimitQuery(req, { limitDefault: 12 });
      const medicineIdRaw = req.query.medicineId as string | undefined;
      let medicineId: number | undefined;
      if (medicineIdRaw !== undefined && String(medicineIdRaw).trim() !== "") {
        const n = parseInt(String(medicineIdRaw), 10);
        if (!Number.isFinite(n) || n < 1) {
          return next(BadRequestError("medicineId must be a positive integer"));
        }
        medicineId = n;
      }
      const result = await medicalStoreService.getPublicStoreCatalog(storeId, page, limit, medicineId);
      res.status(200).json(ApiResponse(result, "Catalog retrieved."));
    } catch (error) {
      next(error);
    }
  };

  private searchListings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = parsePageLimitQuery(req, { limitDefault: 12 });
      const q = (req.query.q as string | undefined) || undefined;
      const result = await medicalStoreService.searchPublicListings({ q, page, limit });
      res.status(200).json(ApiResponse(result, "Listings retrieved."));
    } catch (error) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}
