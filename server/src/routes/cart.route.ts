import { Router, Request, Response, NextFunction } from "express";
import { verifyToken } from "../middleware/jwt.handler";
import { BadRequestError } from "../middleware/error.handler";
import { ApiResponse } from "../core/api-response";
import { cartService } from "../services/cart.service";

export class CartRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/", verifyToken, this.getCart);
    this.router.get("/pharmacy-availability", verifyToken, this.getPharmacyAvailability);
    this.router.get("/pharmacy-selection/availability", verifyToken, this.getPrescriptionPharmacyAvailability);
    this.router.post("/pharmacy-selection", verifyToken, this.applyPharmacySelection);
    this.router.post("/pharmacy-selection/appointment", verifyToken, this.applyPrescriptionPharmacySelection);
    this.router.post("/items", verifyToken, this.addItem);
    this.router.patch("/items/:id", verifyToken, this.updateItem);
    this.router.delete("/items/:id", verifyToken, this.removeItem);
  }

  private getCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can access cart"));
      const patientId = (req as any).user.userId;
      const data = await cartService.getCart(patientId);
      res.status(200).json(ApiResponse(data, "Cart retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private addItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can access cart"));
      const patientId = (req as any).user.userId;
      const { medicineId, quantity, sourceType, appointmentId, medicalStoreMedicineId } = req.body;
      if (!medicineId) return next(BadRequestError("medicineId is required"));

      const data = await cartService.addItem(patientId, {
        medicineId: Number(medicineId),
        quantity: quantity ? Number(quantity) : 1,
        sourceType,
        appointmentId,
        medicalStoreMedicineId:
          medicalStoreMedicineId != null && String(medicalStoreMedicineId).trim() !== ""
            ? String(medicalStoreMedicineId)
            : undefined,
      });
      res.status(200).json(ApiResponse(data, "Item added to cart"));
    } catch (error) {
      next(error);
    }
  };

  private getPharmacyAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can access cart"));
      const patientId = (req as any).user.userId;
      const sortBy = String(req.query.sortBy || "availability").toLowerCase();
      const data = await cartService.getPharmacyAvailability(patientId, {
        sortBy: sortBy === "price" ? "price" : "availability",
      });
      res.status(200).json(ApiResponse(data, "Pharmacy availability retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getPrescriptionPharmacyAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can access cart"));
      const patientId = (req as any).user.userId;
      const appointmentId = String(req.query.appointmentId || "").trim();
      if (!appointmentId) return next(BadRequestError("appointmentId is required"));
      const sortBy = String(req.query.sortBy || "availability").toLowerCase();
      const data = await cartService.getPrescriptionPharmacyAvailability(patientId, appointmentId, {
        sortBy: sortBy === "price" ? "price" : "availability",
      });
      res.status(200).json(ApiResponse(data, "Pharmacy availability retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private applyPharmacySelection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can access cart"));
      const patientId = (req as any).user.userId;
      const { medicalStoreId, selections } = req.body ?? {};
      if (!medicalStoreId) return next(BadRequestError("medicalStoreId is required"));
      const data = await cartService.applyPharmacySelection(patientId, {
        medicalStoreId: String(medicalStoreId),
        selections: Array.isArray(selections)
          ? selections.map((s) => ({
              cartItemId: String(s?.cartItemId || ""),
              quantity: Number(s?.quantity || 0),
            }))
          : [],
      });
      res.status(200).json(ApiResponse(data, "Cart synchronized with selected pharmacy"));
    } catch (error) {
      next(error);
    }
  };

  private applyPrescriptionPharmacySelection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can access cart"));
      const patientId = (req as any).user.userId;
      const { appointmentId, medicalStoreId, selections } = req.body ?? {};
      if (!appointmentId) return next(BadRequestError("appointmentId is required"));
      if (!medicalStoreId) return next(BadRequestError("medicalStoreId is required"));
      const data = await cartService.applyPrescriptionPharmacySelection(patientId, {
        appointmentId: String(appointmentId),
        medicalStoreId: String(medicalStoreId),
        selections: Array.isArray(selections)
          ? selections.map((s) => ({
              cartItemId: String(s?.cartItemId || ""),
              quantity: Number(s?.quantity || 0),
            }))
          : [],
      });
      res.status(200).json(ApiResponse(data, "Prescription medicines added to cart from selected pharmacy"));
    } catch (error) {
      next(error);
    }
  };

  private updateItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can access cart"));
      const patientId = (req as any).user.userId;
      const { quantity } = req.body;
      if (!quantity) return next(BadRequestError("quantity is required"));

      const data = await cartService.updateItem(patientId, req.params.id, Number(quantity));
      res.status(200).json(ApiResponse(data, "Cart item updated"));
    } catch (error) {
      next(error);
    }
  };

  private removeItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can access cart"));
      const patientId = (req as any).user.userId;
      const data = await cartService.removeItem(patientId, req.params.id);
      res.status(200).json(ApiResponse(data, "Cart item removed"));
    } catch (error) {
      next(error);
    }
  };

  public getRouter() {
    return this.router;
  }
}

export default CartRoute;
