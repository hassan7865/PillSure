import { Router, Request, Response, NextFunction } from "express";
import { verifyToken } from "../middleware/jwt.handler";
import { BadRequestError } from "../middleware/error.handler";
import { ApiResponse } from "../core/api-response";
import { orderService } from "../services/order.service";

export class OrderRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post("/checkout", verifyToken, this.checkout);
    this.router.get("/shipping-addresses", verifyToken, this.getShippingAddresses);
    this.router.post("/shipping-addresses", verifyToken, this.createShippingAddress);
    this.router.put("/shipping-addresses/:addressId", verifyToken, this.updateShippingAddress);
    this.router.delete("/shipping-addresses/:addressId", verifyToken, this.deleteShippingAddress);
    this.router.get("/", verifyToken, this.getOrders);
    this.router.get("/:id", verifyToken, this.getOrderById);
  }

  private checkout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can place orders"));
      const patientId = (req as any).user.userId;
      const { paymentMethod, shippingAddress, contactNo, addressId } = req.body;
      if (!paymentMethod) return next(BadRequestError("paymentMethod is required"));

      if (paymentMethod === "cod") {
        const data = await orderService.createCodOrder(patientId, { addressId, shippingAddress, contactNo });
        return res.status(200).json(ApiResponse(data, "COD order placed"));
      }

      if (paymentMethod === "online") {
        const data = await orderService.createOnlineCheckoutSession(patientId, { addressId, shippingAddress, contactNo });
        return res.status(200).json(ApiResponse(data, "Online checkout session created"));
      }

      return next(BadRequestError("Invalid paymentMethod"));
    } catch (error) {
      next(error);
    }
  };

  private getShippingAddresses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can manage addresses"));
      const patientId = (req as any).user.userId;
      const data = await orderService.listPatientShippingAddresses(patientId);
      res.status(200).json(ApiResponse(data, "Shipping addresses retrieved"));
    } catch (error) {
      next(error);
    }
  };

  private createShippingAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can manage addresses"));
      const patientId = (req as any).user.userId;
      const data = await orderService.addPatientShippingAddress(patientId, req.body ?? {});
      res.status(200).json(ApiResponse(data, "Shipping address saved"));
    } catch (error) {
      next(error);
    }
  };

  private updateShippingAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can manage addresses"));
      const patientId = (req as any).user.userId;
      const addressId = String(req.params.addressId || "").trim();
      if (!addressId) return next(BadRequestError("addressId is required"));
      const data = await orderService.updatePatientShippingAddress(patientId, addressId, req.body ?? {});
      res.status(200).json(ApiResponse(data, "Shipping address updated"));
    } catch (error) {
      next(error);
    }
  };

  private deleteShippingAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can manage addresses"));
      const patientId = (req as any).user.userId;
      const addressId = String(req.params.addressId || "").trim();
      if (!addressId) return next(BadRequestError("addressId is required"));
      const data = await orderService.deletePatientShippingAddress(patientId, addressId);
      res.status(200).json(ApiResponse(data, "Shipping address removed"));
    } catch (error) {
      next(error);
    }
  };

  private getOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can view orders"));
      const patientId = (req as any).user.userId;
      const data = await orderService.getPatientOrders(patientId);
      res.status(200).json(ApiResponse(data, "Orders retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user.role !== "patient") return next(BadRequestError("Only patients can view orders"));
      const patientId = (req as any).user.userId;
      const data = await orderService.getPatientOrderById(patientId, req.params.id);
      res.status(200).json(ApiResponse(data, "Order retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  public getRouter() {
    return this.router;
  }
}

export default OrderRoute;
