import Stripe from "stripe";
import { createError } from "../middleware/error.handler";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;

if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

if (!STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET is required");
}

if (!FRONTEND_BASE_URL) {
  throw new Error("FRONTEND_BASE_URL is required");
}

export interface AppointmentCheckoutMetadata {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  consultationMode: "inperson" | "online";
  patientNotes: string;
}

export interface MedicineCheckoutMetadata {
  type: "medicine_order";
  patientId: string;
  cartId: string;
  shippingAddress: string;
  contactNo: string;
}

export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;
  private frontendBaseUrl: string;

  constructor() {
    this.stripe = new Stripe(STRIPE_SECRET_KEY as string);
    this.webhookSecret = STRIPE_WEBHOOK_SECRET as string;
    this.frontendBaseUrl = FRONTEND_BASE_URL as string;
  }

  async createMedicineCheckoutSession(params: {
    amountPkr: number;
    metadata: MedicineCheckoutMetadata;
  }) {
    const amountInPaisa = Math.round(params.amountPkr * 100);
    if (amountInPaisa <= 0) {
      throw createError("Invalid checkout amount", 400);
    }

    const metadata: Stripe.MetadataParam = {
      type: params.metadata.type,
      patientId: params.metadata.patientId,
      cartId: params.metadata.cartId,
      shippingAddress: params.metadata.shippingAddress,
      contactNo: params.metadata.contactNo,
    };

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "pkr",
            unit_amount: amountInPaisa,
            product_data: {
              name: "PillSure Medicine Order",
              description: "Medicine checkout",
            },
          },
        },
      ],
      success_url: `${this.frontendBaseUrl}/orders?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendBaseUrl}/cart?payment=cancelled`,
      metadata,
    });

    if (!session.url) {
      throw createError("Failed to create Stripe checkout URL", 500);
    }

    return session;
  }

  async createAppointmentCheckoutSession(params: {
    amountPkr: number;
    doctorName: string;
    metadata: AppointmentCheckoutMetadata;
  }) {
    const amountInPaisa = Math.round(params.amountPkr * 100);
    if (amountInPaisa <= 0) {
      throw createError("Invalid consultation fee amount", 400);
    }

    const metadata: Stripe.MetadataParam = {
      patientId: params.metadata.patientId,
      doctorId: params.metadata.doctorId,
      appointmentDate: params.metadata.appointmentDate,
      appointmentTime: params.metadata.appointmentTime,
      consultationMode: params.metadata.consultationMode,
      patientNotes: params.metadata.patientNotes,
    };

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "pkr",
            unit_amount: amountInPaisa,
            product_data: {
              name: `Appointment with Dr. ${params.doctorName}`,
              description: `${params.metadata.consultationMode} consultation on ${params.metadata.appointmentDate} at ${params.metadata.appointmentTime}`,
            },
          },
        },
      ],
      success_url: `${this.frontendBaseUrl}/appointments?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendBaseUrl}/appointments?payment=cancelled`,
      metadata,
    });

    if (!session.url) {
      throw createError("Failed to create Stripe checkout URL", 500);
    }

    return session;
  }

  constructWebhookEvent(payload: Buffer, signature: string) {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch {
      throw createError("Invalid Stripe webhook signature", 400);
    }
  }
}

export const stripeService = new StripeService();
