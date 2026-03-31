import { Router, Request, Response, NextFunction } from "express";
import { stripeService } from "../services/stripe.service";
import { appointmentService } from "../services/appointment.service";
import { orderService } from "../services/order.service";
import { ApiResponse } from "../core/api-response";
import { BadRequestError } from "../middleware/error.handler";

export class PaymentsRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post("/stripe/webhook", this.handleStripeWebhook);
  }

  private handleStripeWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers["stripe-signature"];
      if (!signature || typeof signature !== "string") {
        return next(BadRequestError("Missing Stripe signature"));
      }

      const event = stripeService.constructWebhookEvent(req.body as Buffer, signature);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const metadata = session.metadata;

        if (!metadata) {
          return next(BadRequestError("Missing checkout metadata"));
        }

        if (metadata.type === "medicine_order") {
          if (!metadata.patientId || !metadata.cartId) {
            return next(BadRequestError("Incomplete medicine checkout metadata"));
          }
          await orderService.finalizePaidOrderFromStripe({
            stripeSessionId: session.id,
            patientId: metadata.patientId,
            cartId: metadata.cartId,
            shippingAddress: metadata.shippingAddress || undefined,
            contactNo: metadata.contactNo || undefined,
          });
        } else {
          if (
            !metadata.patientId ||
            !metadata.doctorId ||
            !metadata.appointmentDate ||
            !metadata.appointmentTime ||
            !metadata.consultationMode
          ) {
            return next(BadRequestError("Incomplete checkout metadata"));
          }

          const amountTotal = session.amount_total ?? 0;
          await appointmentService.createAppointmentFromStripeSession({
            stripeSessionId: session.id,
            patientId: metadata.patientId,
            doctorId: metadata.doctorId,
            appointmentDate: metadata.appointmentDate,
            appointmentTime: metadata.appointmentTime,
            consultationMode: metadata.consultationMode as "inperson" | "online",
            patientNotes: metadata.patientNotes || undefined,
            amountPaid: amountTotal / 100,
            currency: session.currency || "pkr",
          });
        }
      }

      res.status(200).json(ApiResponse(null, "Webhook processed"));
    } catch (error) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}

export default PaymentsRoute;
