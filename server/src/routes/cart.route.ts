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
      const { medicineId, quantity, sourceType, appointmentId } = req.body;
      if (!medicineId) return next(BadRequestError("medicineId is required"));

      const data = await cartService.addItem(patientId, {
        medicineId: Number(medicineId),
        quantity: quantity ? Number(quantity) : 1,
        sourceType,
        appointmentId,
      });
      res.status(200).json(ApiResponse(data, "Item added to cart"));
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
