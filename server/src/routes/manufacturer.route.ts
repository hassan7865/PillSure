import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { verifyToken, requireRole } from "../middleware/jwt.handler";
import { UserRole } from "../core/types";
import type { ManufacturerMedicinesImportRequest } from "../core/types";
import { ApiResponse } from "../core/api-response";
import { manufacturerService } from "../services/manufacturer.service";
import { wholesaleOrderService } from "../services/wholesaleOrder.service";
import { buildManufacturerImportTemplateBuffer } from "../services/manufacturer.service";
import { BadRequestError } from "../middleware/error.handler";
import { parsePageLimitQuery } from "../utils/query-params";

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = (file.originalname || "").toLowerCase();
    const ok =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      name.endsWith(".xlsx") ||
      name.endsWith(".xls");
    if (ok) {
      cb(null, true);
    } else {
      cb(BadRequestError("Upload an Excel file (.xlsx or .xls)") as any, false);
    }
  },
});

export class ManufacturerRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/medicines/import/template",
      verifyToken,
      requireRole([UserRole.MANUFACTURER]),
      this.downloadTemplate,
    );
    this.router.get(
      "/medicines",
      verifyToken,
      requireRole([UserRole.MANUFACTURER]),
      this.listMedicines,
    );
    this.router.patch(
      "/medicines/:listingId",
      verifyToken,
      requireRole([UserRole.MANUFACTURER]),
      this.patchManufacturerListing,
    );
    this.router.post(
      "/medicines/import/excel",
      verifyToken,
      requireRole([UserRole.MANUFACTURER]),
      excelUpload.single("file"),
      this.importMedicinesExcel,
    );
    this.router.post(
      "/medicines/import",
      verifyToken,
      requireRole([UserRole.MANUFACTURER]),
      this.importMedicinesJson,
    );
    this.router.get(
      "/wholesale/orders",
      verifyToken,
      requireRole([UserRole.MANUFACTURER]),
      this.listWholesaleOrders,
    );
    this.router.get(
      "/wholesale/orders/:orderId",
      verifyToken,
      requireRole([UserRole.MANUFACTURER]),
      this.getWholesaleOrderDetail,
    );
    this.router.patch(
      "/wholesale/orders/:orderId",
      verifyToken,
      requireRole([UserRole.MANUFACTURER]),
      this.patchWholesaleOrder,
    );
  }

  private downloadTemplate = (_req: Request, res: Response, next: NextFunction) => {
    try {
      const buf = buildManufacturerImportTemplateBuffer();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="manufacturer-import-template.xlsx"',
      );
      res.status(200).send(buf);
    } catch (error) {
      next(error);
    }
  };

  private listMedicines = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { page, limit } = parsePageLimitQuery(req, { limitDefault: 20 });
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const result = await manufacturerService.listListedMedicines(userId, page, limit, q);
      res.status(200).json(ApiResponse(result, "Listed medicines retrieved."));
    } catch (error) {
      next(error);
    }
  };

  private patchManufacturerListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { listingId } = req.params;
      const body = req.body as {
        wholesalePrice?: string | number;
        moq?: number;
        listedQuantity?: number;
        isActive?: boolean;
      };
      if (body.wholesalePrice === undefined || body.wholesalePrice === "") {
        return next(BadRequestError("wholesalePrice is required"));
      }
      if (body.moq === undefined || body.listedQuantity === undefined) {
        return next(BadRequestError("moq and listedQuantity are required"));
      }
      const result = await manufacturerService.updateManufacturerListing(userId, listingId, {
        wholesalePrice: body.wholesalePrice,
        moq: Number(body.moq),
        listedQuantity: Number(body.listedQuantity),
        isActive: body.isActive,
      });
      res.status(200).json(ApiResponse(result, "Listing updated."));
    } catch (error) {
      next(error);
    }
  };

  private importMedicinesJson = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const body = req.body as ManufacturerMedicinesImportRequest;
      const result = await manufacturerService.importMedicines(userId, body);
      res.status(200).json(ApiResponse(result, "Import completed."));
    } catch (error) {
      next(error);
    }
  };

  private importMedicinesExcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const file = req.file;
      if (!file?.buffer) {
        return next(BadRequestError('Excel file is required (form field name: "file").'));
      }
      const result = await manufacturerService.importMedicinesFromExcel(userId, file.buffer);
      res.status(200).json(ApiResponse(result, "Import completed."));
    } catch (error) {
      next(error);
    }
  };

  private listWholesaleOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { page, limit } = parsePageLimitQuery(req, { limitDefault: 20 });
      const status = (req.query.status as string | undefined) || undefined;
      const result = await wholesaleOrderService.listOrdersForManufacturer(userId, page, limit, status);
      res.status(200).json(ApiResponse(result, "Wholesale orders retrieved."));
    } catch (error) {
      next(error);
    }
  };

  private getWholesaleOrderDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { orderId } = req.params;
      const result = await wholesaleOrderService.getOrderDetailForManufacturer(userId, orderId);
      res.status(200).json(ApiResponse(result, "Wholesale order retrieved."));
    } catch (error) {
      next(error);
    }
  };

  private patchWholesaleOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const { orderId } = req.params;
      const status = (req.body as { status?: string })?.status;
      if (status === undefined || String(status).trim() === "") {
        return next(BadRequestError("status is required"));
      }
      const result = await wholesaleOrderService.updateOrderStatusForManufacturer(userId, orderId, status);
      res.status(200).json(ApiResponse(result, "Wholesale order updated."));
    } catch (error) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}
