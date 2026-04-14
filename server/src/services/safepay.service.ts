import { Safepay } from "@sfpy/node-sdk";
import { createError } from "../middleware/error.handler";

const SAFEPAY_ENVIRONMENT = process.env.SAFEPAY_ENVIRONMENT;
const SAFEPAY_API_KEY = process.env.SAFEPAY_API_KEY;
const SAFEPAY_V1_SECRET = process.env.SAFEPAY_V1_SECRET;
const SAFEPAY_WEBHOOK_SECRET = process.env.SAFEPAY_WEBHOOK_SECRET;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;

if (!SAFEPAY_ENVIRONMENT) throw new Error("SAFEPAY_ENVIRONMENT is required");
if (!SAFEPAY_API_KEY) throw new Error("SAFEPAY_API_KEY is required");
if (!SAFEPAY_V1_SECRET) throw new Error("SAFEPAY_V1_SECRET is required");
if (!SAFEPAY_WEBHOOK_SECRET) throw new Error("SAFEPAY_WEBHOOK_SECRET is required");
if (!FRONTEND_BASE_URL) throw new Error("FRONTEND_BASE_URL is required");

type SafepayCurrency = "PKR" | "USD" | "AED" | "SAR" | "CAD" | "EUR" | "GBP";

export class SafepayService {
  private safepay: Safepay;
  private frontendBaseUrl: string;

  constructor() {
    this.safepay = new Safepay({
      environment: SAFEPAY_ENVIRONMENT as any,
      apiKey: SAFEPAY_API_KEY as string,
      v1Secret: SAFEPAY_V1_SECRET as string,
      webhookSecret: SAFEPAY_WEBHOOK_SECRET as string,
    });
    this.frontendBaseUrl = FRONTEND_BASE_URL as string;
  }

  private normalizeAmount(amountPkr: number) {
    if (!Number.isFinite(amountPkr) || amountPkr <= 0) {
      throw createError("Invalid checkout amount", 400);
    }
    return Number(amountPkr.toFixed(2));
  }

  private async createCheckout(params: {
    amountPkr: number;
    orderId: string;
    redirectPath: string;
    cancelPath: string;
    currency?: SafepayCurrency;
  }) {
    const amount = this.normalizeAmount(params.amountPkr);
    const currency = params.currency ?? "PKR";
    const { token } = await this.safepay.payments.create({ amount, currency });
    const checkoutUrl = this.safepay.checkout.create({
      token,
      orderId: params.orderId,
      cancelUrl: `${this.frontendBaseUrl}${params.cancelPath}`,
      redirectUrl: `${this.frontendBaseUrl}${params.redirectPath}`,
      webhooks: true,
    });
    return { id: params.orderId, url: checkoutUrl };
  }

  async createMedicineCheckoutSession(params: { amountPkr: number; orderId: string }) {
    return this.createCheckout({
      amountPkr: params.amountPkr,
      orderId: params.orderId,
      redirectPath: "/orders?payment=success",
      cancelPath: "/orders?payment=cancelled",
    });
  }

  async createAppointmentCheckoutSession(params: { amountPkr: number; orderId: string }) {
    return this.createCheckout({
      amountPkr: params.amountPkr,
      orderId: params.orderId,
      redirectPath: "/appointments?payment=success",
      cancelPath: "/appointments?payment=cancelled",
    });
  }

  async createWholesaleCheckoutSession(params: { amountPkr: number; orderId: string }) {
    return this.createCheckout({
      amountPkr: params.amountPkr,
      orderId: params.orderId,
      redirectPath: "/dashboard/medical-store/wholesale-order",
      cancelPath: "/dashboard/medical-store/wholesale-order",
    });
  }

  verifyWebhook(request: { body?: unknown; headers?: Record<string, unknown> }) {
    try {
      return this.safepay.verify.webhook(request as any);
    } catch {
      return false;
    }
  }
}

export const safepayService = new SafepayService();
