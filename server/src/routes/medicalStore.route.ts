import { Router, Request, Response, NextFunction } from "express";
import { verifyToken, requireRole } from "../middleware/jwt.handler";
import { UserRole } from "../core/types";
import { ApiResponse } from "../core/api-response";
import {
  medicalStoreService,
  type CreateMedicalStoreListingInput,
  type UpdateMedicalStoreListingInput,
} from "../services/medicalStore.service";
import { upload, handleMulterError } from "../config/multer.config";
import { BadRequestError } from "../middleware/error.handler";
import { wholesaleOrderService } from "../services/wholesaleOrder.service";
import { parsePageLimitQuery } from "../utils/query-params";

function parseCategoryIdsField(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter((s) => s.length > 0);
  }
  try {
    const parsed = JSON.parse(String(raw));
    if (Array.isArray(parsed)) {
      return parsed.map((x) => String(x).trim()).filter((s) => s.length > 0);
    }
  } catch {
    /* fall through */
  }
  throw BadRequestError("categoryIds must be a JSON array of UUID strings");
}

function parseOptionalFaqsJson(body: Record<string, unknown>, key: "faqs"): Array<{ question: string; answer: string }> | null | undefined {
  if (body[key] === undefined) return undefined;
  if (body[key] === null) return null;
  const s = String(body[key]).trim();
  if (s === "") return null;
  try {
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) {
      throw BadRequestError("faqs must be a JSON array");
    }
    return parsed as Array<{ question: string; answer: string }>;
  } catch {
    throw BadRequestError("Invalid faqs JSON");
  }
}

function parseCreateListingMultipart(body: Record<string, unknown>): CreateMedicalStoreListingInput {
  const medicineId = parseInt(String(body.medicineId ?? ""), 10);
  const listedQuantity = parseInt(String(body.listedQuantity ?? ""), 10);
  const sortOrder =
    body.sortOrder !== undefined && body.sortOrder !== ""
      ? parseInt(String(body.sortOrder), 10)
      : 0;
  let packImages: string[] | undefined;
  if (body.packImages != null && String(body.packImages).trim() !== "") {
    try {
      const parsed = JSON.parse(String(body.packImages));
      if (Array.isArray(parsed)) packImages = parsed as string[];
    } catch {
      throw BadRequestError("Invalid packImages JSON");
    }
  }
  const categoryIds = parseCategoryIdsField(body.categoryIds);
  const drugDescription =
    body.drugDescription !== undefined && body.drugDescription !== null
      ? String(body.drugDescription)
      : undefined;
  const faqs = parseOptionalFaqsJson(body, "faqs");
  return {
    medicineId,
    retailPrice: body.retailPrice as string | number,
    listedQuantity,
    currency: body.currency ? String(body.currency) : undefined,
    manufacturerMedicineId:
      body.manufacturerMedicineId != null && String(body.manufacturerMedicineId).trim() !== ""
        ? String(body.manufacturerMedicineId)
        : null,
    isActive: body.isActive === true || body.isActive === "true",
    sortOrder,
    packImages,
    categoryIds,
    drugDescription,
    faqs,
  };
}

function parseUpdateListingMultipart(body: Record<string, unknown>): UpdateMedicalStoreListingInput {
  const input: UpdateMedicalStoreListingInput = {};
  if (body.retailPrice !== undefined) input.retailPrice = body.retailPrice as string | number;
  if (body.listedQuantity !== undefined)
    input.listedQuantity = parseInt(String(body.listedQuantity), 10);
  if (body.currency !== undefined) input.currency = String(body.currency);
  if (body.manufacturerMedicineId !== undefined) {
    const v = body.manufacturerMedicineId;
    input.manufacturerMedicineId =
      v === null || v === "" ? null : String(v);
  }
  if (body.isActive !== undefined) input.isActive = body.isActive === true || body.isActive === "true";
  if (body.sortOrder !== undefined && body.sortOrder !== "")
    input.sortOrder = parseInt(String(body.sortOrder), 10);
  if (body.categoryIds !== undefined) {
    input.categoryIds = parseCategoryIdsField(body.categoryIds) ?? [];
  }
  if (body.drugDescription !== undefined) {
    input.drugDescription =
      body.drugDescription === null || String(body.drugDescription).trim() === ""
        ? null
        : String(body.drugDescription);
  }
  if (body.faqs !== undefined) {
    const parsed = parseOptionalFaqsJson(body, "faqs");
    input.faqs = parsed === undefined ? null : parsed;
  }
  return input;
}

export class MedicalStoreRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/categories",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      this.listCategories,
    );
    this.router.post(
      "/categories",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      this.createCategory,
    );
    this.router.patch(
      "/categories/:categoryId",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      this.updateCategory,
    );
    this.router.delete(
      "/categories/:categoryId",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      this.deleteCategory,
    );
    this.router.get(
      "/catalog",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      this.listCatalog,
    );
    this.router.post(
      "/listings",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      (req: Request, res: Response, next: NextFunction) => {
        const ct = (req.headers["content-type"] || "").toLowerCase();
        if (ct.includes("multipart/form-data")) {
          return upload.array("packImages", 4)(req, res, (err) => {
            if (err) return handleMulterError(err, req, res, next);
            next();
          });
        }
        next();
      },
      this.createListing,
    );
    this.router.get(
      "/listings/:listingId",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      this.getListing,
    );
    this.router.patch(
      "/listings/:listingId",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      (req: Request, res: Response, next: NextFunction) => {
        const ct = (req.headers["content-type"] || "").toLowerCase();
        if (ct.includes("multipart/form-data")) {
          return upload.array("packImages", 4)(req, res, (err) => {
            if (err) return handleMulterError(err, req, res, next);
            next();
          });
        }
        next();
      },
      this.updateListing,
    );
    this.router.delete(
      "/listings/:listingId",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      this.deleteListing,
    );
    this.router.get(
      "/wholesale/manufacturers",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      this.listWholesaleManufacturers,
    );
    this.router.get(
      "/wholesale/manufacturers/:manufacturerId/catalog",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      this.getWholesaleManufacturerCatalog,
    );
    this.router.get(
      "/wholesale/orders",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      this.listWholesaleOrders,
    );
    this.router.post(
      "/wholesale/orders",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      this.createWholesaleOrder,
    );
    this.router.get(
      "/retail/orders",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      this.listRetailOrders,
    );
    this.router.patch(
      "/retail/orders/:orderId/status",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      this.updateRetailOrderStatus,
    );
    this.router.post(
      "/profile/logo",
      verifyToken,
      requireRole([UserRole.MEDICAL_STORE]),
      (req: Request, res: Response, next: NextFunction) => {
        upload.single("logo")(req, res, (err) => {
          if (err) return handleMulterError(err, req, res, next);
          next();
        });
      },
      this.updateStoreLogo,
    );
    this.router.delete("/profile/logo", verifyToken, requireRole([UserRole.MEDICAL_STORE]), this.clearStoreLogo);
  }

  private listCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const result = await medicalStoreService.listStoreCategories(userId);
      res.status(200).json(ApiResponse(result, "Categories retrieved."));
    } catch (error) {
      next(error);
    }
  };

  private createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const body = req.body ?? {};
      const result = await medicalStoreService.createStoreCategory(userId, {
        name: String(body.name ?? ""),
        sortOrder:
          body.sortOrder !== undefined && body.sortOrder !== ""
            ? parseInt(String(body.sortOrder), 10)
            : undefined,
      });
      res.status(201).json(ApiResponse(result, "Category created."));
    } catch (error) {
      next(error);
    }
  };

  private updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { categoryId } = req.params;
      const body = req.body ?? {};
      const result = await medicalStoreService.updateStoreCategory(userId, categoryId, {
        name: body.name !== undefined ? String(body.name) : undefined,
        sortOrder:
          body.sortOrder !== undefined && body.sortOrder !== ""
            ? parseInt(String(body.sortOrder), 10)
            : undefined,
      });
      res.status(200).json(ApiResponse(result, "Category updated."));
    } catch (error) {
      next(error);
    }
  };

  private deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { categoryId } = req.params;
      await medicalStoreService.deleteStoreCategory(userId, categoryId);
      res.status(200).json(ApiResponse(null, "Category deleted."));
    } catch (error) {
      next(error);
    }
  };

  private listCatalog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { page, limit } = parsePageLimitQuery(req, { limitDefault: 12 });
      const result = await medicalStoreService.listStoreCatalog(userId, page, limit);
      res.status(200).json(ApiResponse(result, "Store catalog retrieved."));
    } catch (error) {
      next(error);
    }
  };

  private createListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const ct = (req.headers["content-type"] || "").toLowerCase();
      let input: CreateMedicalStoreListingInput;
      let files: Express.Multer.File[] = [];

      if (ct.includes("multipart/form-data")) {
        files = (req.files as Express.Multer.File[]) || [];
        input = parseCreateListingMultipart(req.body ?? {});
      } else {
        input = (req.body ?? {}) as CreateMedicalStoreListingInput;
      }

      const result = await medicalStoreService.createListing(userId, input, files);
      res.status(201).json(ApiResponse(result, "Listing created."));
    } catch (error) {
      next(error);
    }
  };

  private getListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { listingId } = req.params;
      const result = await medicalStoreService.getListing(userId, listingId);
      res.status(200).json(ApiResponse(result, "Listing retrieved."));
    } catch (error) {
      next(error);
    }
  };

  private updateListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { listingId } = req.params;
      const ct = (req.headers["content-type"] || "").toLowerCase();
      let input: UpdateMedicalStoreListingInput;
      let packOpts:
        | { files?: Express.Multer.File[]; existingPackImageUrls?: string[] | null }
        | undefined;

      if (ct.includes("multipart/form-data")) {
        const files = (req.files as Express.Multer.File[]) || [];
        input = parseUpdateListingMultipart(req.body ?? {});
        let existingPackImageUrls: string[] | undefined;
        if (req.body.existingPackImages !== undefined && String(req.body.existingPackImages).trim() !== "") {
          try {
            existingPackImageUrls = JSON.parse(String(req.body.existingPackImages));
            if (!Array.isArray(existingPackImageUrls)) {
              return next(BadRequestError("existingPackImages must be a JSON array"));
            }
          } catch {
            return next(BadRequestError("Invalid existingPackImages JSON"));
          }
        }
        if (files.length || existingPackImageUrls !== undefined) {
          packOpts = { files, existingPackImageUrls };
        }
      } else {
        input = (req.body ?? {}) as UpdateMedicalStoreListingInput;
      }

      const result = await medicalStoreService.updateListing(userId, listingId, input, packOpts);
      res.status(200).json(ApiResponse(result, "Listing updated."));
    } catch (error) {
      next(error);
    }
  };

  private deleteListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { listingId } = req.params;
      await medicalStoreService.deleteListing(userId, listingId);
      res.status(200).json(ApiResponse(null, "Listing deleted."));
    } catch (error) {
      next(error);
    }
  };

  private listWholesaleManufacturers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const result = await wholesaleOrderService.listManufacturersForMedicalStore(userId);
      res.status(200).json(ApiResponse(result, "Manufacturers retrieved."));
    } catch (error) {
      next(error);
    }
  };

  private getWholesaleManufacturerCatalog = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = (req as any).user.userId as string;
      const { manufacturerId } = req.params;
      const { page, limit } = parsePageLimitQuery(req, { limitDefault: 20 });
      const search = (req.query.search as string | undefined) || undefined;
      const result = await wholesaleOrderService.getManufacturerCatalog(
        userId,
        manufacturerId,
        page,
        limit,
        search,
      );
      res.status(200).json(ApiResponse(result, "Wholesale catalog retrieved."));
    } catch (error) {
      next(error);
    }
  };

  private listWholesaleOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { page, limit } = parsePageLimitQuery(req, { limitDefault: 20 });
      const result = await wholesaleOrderService.listOrdersForMedicalStore(userId, page, limit);
      res.status(200).json(ApiResponse(result, "Wholesale orders retrieved."));
    } catch (error) {
      next(error);
    }
  };

  private createWholesaleOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const body = req.body ?? {};
      const result = await wholesaleOrderService.createOrder(userId, {
        manufacturerId: String(body.manufacturerId ?? ""),
        items: Array.isArray(body.items) ? body.items : [],
        notes: body.notes,
        paymentMethod: body.paymentMethod,
      });
      res.status(201).json(ApiResponse(result, "Wholesale order created. Complete payment if required."));
    } catch (error) {
      next(error);
    }
  };

  private listRetailOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { page, limit } = parsePageLimitQuery(req, { limitDefault: 20 });
      const result = await medicalStoreService.listRetailOrders(userId, page, limit);
      res.status(200).json(ApiResponse(result, "Retail orders retrieved."));
    } catch (error) {
      next(error);
    }
  };

  private updateRetailOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { orderId } = req.params;
      const status = (req.body as { status?: string })?.status;
      if (!status || typeof status !== "string") {
        return next(BadRequestError("status is required"));
      }
      const result = await medicalStoreService.updateRetailOrderStatus(userId, orderId, status);
      res.status(200).json(ApiResponse(result, "Order status updated."));
    } catch (error) {
      next(error);
    }
  };

  private updateStoreLogo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        return next(BadRequestError("logo file is required (field name: logo)"));
      }
      const result = await medicalStoreService.updateStoreLogo(userId, file);
      res.status(200).json(ApiResponse(result, "Store logo updated."));
    } catch (error) {
      next(error);
    }
  };

  private clearStoreLogo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      await medicalStoreService.clearStoreLogo(userId);
      res.status(200).json(ApiResponse({ logoUrl: null }, "Store logo removed."));
    } catch (error) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}
