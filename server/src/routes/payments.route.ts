import { Router, Request, Response, NextFunction } from "express";
import { safepayService } from "../services/safepay.service";
import { appointmentService } from "../services/appointment.service";
import { orderService } from "../services/order.service";
import { wholesaleOrderService } from "../services/wholesaleOrder.service";
import { ApiResponse } from "../core/api-response";
import { BadRequestError } from "../middleware/error.handler";

export class PaymentsRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.head("/sfpy/webhook", this.handleSafepayWebhookProbe);
    this.router.get("/sfpy/webhook", this.handleSafepayWebhookProbe);
    this.router.post("/sfpy/webhook", this.handleSafepayWebhook);
  }

  private handleSafepayWebhookProbe = (req: Request, res: Response) => {
    return res.status(200).json(
      ApiResponse(
        {
          ok: true,
          method: req.method,
          endpoint: "/api/payments/sfpy/webhook",
        },
        "Safepay webhook endpoint reachable",
      ),
    );
  };

  private handleSafepayWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const valid = safepayService.verifyWebhook({
        body: req.body,
        headers: req.headers as Record<string, unknown>,
      });
      if (!valid) {
        return next(BadRequestError("Invalid Safepay webhook signature"));
      }
      const payload = req.body?.data;
      if (!payload || typeof payload !== "object") {
        return next(BadRequestError("Invalid Safepay payload"));
      }
      if ((payload as any).type !== "payment:created") {
        return res.status(200).json(ApiResponse(null, "Webhook ignored"));
      }
      const notification = (payload as any).notification ?? {};
      const metadata = notification.metadata ?? {};
      const orderRef = String(metadata.order_id ?? "").trim();
      const tracker = String(notification.tracker ?? "").trim();
      const paymentState = String(notification.state ?? "").trim();
      const amountPaid = Number(notification.amount ?? 0);
      const currency = String(notification.currency ?? "PKR");
      if (!orderRef || !tracker) {
        return next(BadRequestError("Missing Safepay order reference or tracker"));
      }
      if (orderRef.startsWith("med_")) {
        await orderService.finalizePaidOrderFromSafepay({
          orderRef,
          paymentSessionId: tracker,
          paymentState,
        });
      } else if (orderRef.startsWith("whl_")) {
        await wholesaleOrderService.finalizePaidWholesaleOrderFromSafepay({
          orderRef,
          paymentSessionId: tracker,
          paymentState,
        });
      } else if (orderRef.startsWith("apt_")) {
        const appointmentId = orderRef.slice(4);
        await appointmentService.markAppointmentPaidFromSafepay({
          appointmentId,
          paymentSessionId: tracker,
          amountPaid,
          currency,
        });
      } else {
        return next(BadRequestError("Unknown Safepay order reference"));
      }
      return res.status(200).json(ApiResponse(null, "Webhook processed"));
    } catch (error) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}

export default PaymentsRoute;
