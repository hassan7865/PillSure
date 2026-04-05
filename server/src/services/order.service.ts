import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../config/database";
import { orders } from "../schema/orders";
import { orderItems } from "../schema/orderItems";
import { cartItems } from "../schema/cartItems";
import { medicines } from "../schema/medicine";
import { medicalStoreMedicines } from "../schema/medicalStoreMedicines";
import { medicalStores } from "../schema/medicalStores";
import { createError } from "../middleware/error.handler";
import { cartService } from "./cart.service";
import { stripeService } from "./stripe.service";

type CheckoutLine = {
  id: string;
  medicineId: number;
  quantity: number;
  unitPrice: string;
  appointmentId: string | null;
  medicalStoreMedicineId: string | null;
  medicineName: string;
};

export class OrderService {
  private assertCheckoutContactInfo(payload: { shippingAddress?: string; contactNo?: string }) {
    const shippingAddress = String(payload.shippingAddress || "").trim();
    const contactNo = String(payload.contactNo || "").trim();
    if (!shippingAddress) throw createError("shippingAddress is required", 400);
    if (!contactNo) throw createError("contactNo is required", 400);
    return { shippingAddress, contactNo };
  }

  private async getCheckoutItems(patientId: string): Promise<{
    cartId: string;
    items: CheckoutLine[];
    subtotal: number;
    total: number;
    currency: string;
    medicalStoreId: string | null;
  }> {
    const cart = await cartService.getOrCreateCart(patientId);
    const rows = await db
      .select({
        id: cartItems.id,
        medicineId: cartItems.medicineId,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        appointmentId: cartItems.appointmentId,
        medicalStoreMedicineId: cartItems.medicalStoreMedicineId,
        medicineName: medicines.medicineName,
        listingStoreId: medicalStoreMedicines.medicalStoreId,
        listedQuantity: medicalStoreMedicines.listedQuantity,
        listingActive: medicalStoreMedicines.isActive,
        listingMedicineId: medicalStoreMedicines.medicineId,
      })
      .from(cartItems)
      .innerJoin(medicines, eq(cartItems.medicineId, medicines.id))
      .leftJoin(medicalStoreMedicines, eq(cartItems.medicalStoreMedicineId, medicalStoreMedicines.id))
      .where(eq(cartItems.cartId, cart.id))
      .orderBy(desc(cartItems.updatedAt), desc(cartItems.createdAt));

    if (!rows.length) throw createError("Cart is empty", 400);

    const withListing = rows.filter((r) => r.medicalStoreMedicineId != null);
    const withoutListing = rows.filter((r) => r.medicalStoreMedicineId == null);

    if (withListing.length && withoutListing.length) {
      throw createError(
        "Your cart cannot mix pharmacy items with prescription items. Remove one type and check out separately.",
        400,
      );
    }

    if (withListing.length) {
      const storeId = withListing[0].listingStoreId;
      if (!storeId) throw createError("Invalid pharmacy listing in cart", 400);

      for (const item of withListing) {
        if (item.listingStoreId !== storeId) {
          throw createError("All pharmacy items must be from the same store. Adjust your cart.", 400);
        }
        if (!item.listingActive) throw createError(`Listing no longer available for ${item.medicineName}`, 400);
        if (Number(item.listingMedicineId) !== Number(item.medicineId)) {
          throw createError("Cart line does not match listing", 400);
        }
        const listed = item.listedQuantity ?? 0;
        if (listed < Number(item.quantity)) {
          throw createError(`Insufficient stock at pharmacy for ${item.medicineName}`, 400);
        }
      }

      const subtotal = withListing.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0);
      const items: CheckoutLine[] = withListing.map((i) => ({
        id: i.id,
        medicineId: i.medicineId,
        quantity: Number(i.quantity),
        unitPrice: String(i.unitPrice),
        appointmentId: i.appointmentId,
        medicalStoreMedicineId: i.medicalStoreMedicineId!,
        medicineName: i.medicineName,
      }));

      return {
        cartId: cart.id,
        items,
        subtotal,
        total: subtotal,
        currency: "pkr",
        medicalStoreId: storeId,
      };
    }

    for (const item of withoutListing) {
      if (!item.appointmentId) {
        throw createError(
          "Add medicines from a pharmacy listing, or use prescribed medicines from your appointment.",
          400,
        );
      }
    }

    const subtotal = withoutListing.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0);
    const items: CheckoutLine[] = withoutListing.map((i) => ({
      id: i.id,
      medicineId: i.medicineId,
      quantity: Number(i.quantity),
      unitPrice: String(i.unitPrice),
      appointmentId: i.appointmentId,
      medicalStoreMedicineId: null,
      medicineName: i.medicineName,
    }));

    return {
      cartId: cart.id,
      items,
      subtotal,
      total: subtotal,
      currency: "pkr",
      medicalStoreId: null,
    };
  }

  private async finalizeOrderInTransaction(params: {
    patientId: string;
    paymentMethod: "cod" | "online";
    paymentStatus: string;
    stripeSessionId?: string | null;
    shippingAddress: string | null;
    contactNo: string | null;
    checkout: Awaited<ReturnType<OrderService["getCheckoutItems"]>>;
  }) {
    const { checkout } = params;

    return await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          patientId: params.patientId,
          status: "pending",
          paymentMethod: params.paymentMethod,
          paymentStatus: params.paymentStatus,
          stripeSessionId: params.stripeSessionId ?? null,
          subtotal: checkout.subtotal.toFixed(2),
          total: checkout.total.toFixed(2),
          currency: checkout.currency,
          shippingAddress: params.shippingAddress,
          contactNo: params.contactNo,
          medicalStoreId: checkout.medicalStoreId,
        })
        .returning();

      await tx.insert(orderItems).values(
        checkout.items.map((item) => ({
          orderId: order.id,
          medicineId: item.medicineId,
          medicalStoreMedicineId: item.medicalStoreMedicineId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice).toFixed(2),
          lineTotal: (Number(item.unitPrice) * item.quantity).toFixed(2),
          appointmentId: item.appointmentId,
        })),
      );

      for (const item of checkout.items) {
        if (item.medicalStoreMedicineId) {
          await tx
            .update(medicalStoreMedicines)
            .set({
              listedQuantity: sql`${medicalStoreMedicines.listedQuantity} - ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(medicalStoreMedicines.id, item.medicalStoreMedicineId));
        }
      }

      await tx.delete(cartItems).where(eq(cartItems.cartId, checkout.cartId));

      return order;
    });
  }

  async createCodOrder(patientId: string, payload: { shippingAddress?: string; contactNo?: string }) {
    const contactInfo = this.assertCheckoutContactInfo(payload);
    const checkout = await this.getCheckoutItems(patientId);

    const order = await this.finalizeOrderInTransaction({
      patientId,
      paymentMethod: "cod",
      paymentStatus: "pending_cod",
      stripeSessionId: null,
      shippingAddress: contactInfo.shippingAddress,
      contactNo: contactInfo.contactNo,
      checkout,
    });

    return { orderId: order.id, status: order.status, paymentStatus: order.paymentStatus };
  }

  async createOnlineCheckoutSession(patientId: string, payload: { shippingAddress?: string; contactNo?: string }) {
    const contactInfo = this.assertCheckoutContactInfo(payload);
    const checkout = await this.getCheckoutItems(patientId);
    const session = await stripeService.createMedicineCheckoutSession({
      amountPkr: checkout.total,
      metadata: {
        type: "medicine_order",
        patientId,
        cartId: checkout.cartId,
        shippingAddress: contactInfo.shippingAddress,
        contactNo: contactInfo.contactNo,
      },
    });

    return { sessionId: session.id, checkoutUrl: session.url };
  }

  async finalizePaidOrderFromStripe(params: {
    stripeSessionId: string;
    patientId: string;
    cartId: string;
    shippingAddress?: string;
    contactNo?: string;
  }) {
    const existing = await db
      .select()
      .from(orders)
      .where(eq(orders.stripeSessionId, params.stripeSessionId))
      .limit(1);
    if (existing.length) return existing[0];

    const checkout = await this.getCheckoutItems(params.patientId);
    if (checkout.cartId !== params.cartId) {
      throw createError("Cart mismatch for this checkout session", 400);
    }

    return await this.finalizeOrderInTransaction({
      patientId: params.patientId,
      paymentMethod: "online",
      paymentStatus: "paid",
      stripeSessionId: params.stripeSessionId,
      shippingAddress: params.shippingAddress || null,
      contactNo: params.contactNo || null,
      checkout,
    });
  }

  async getPatientOrders(patientId: string) {
    return db
      .select()
      .from(orders)
      .where(eq(orders.patientId, patientId))
      .orderBy(desc(orders.createdAt));
  }

  async getPatientOrderById(patientId: string, orderId: string) {
    const order = await db
      .select({
        order: orders,
        medicalStoreName: medicalStores.storeName,
      })
      .from(orders)
      .leftJoin(medicalStores, eq(orders.medicalStoreId, medicalStores.id))
      .where(and(eq(orders.id, orderId), eq(orders.patientId, patientId)))
      .limit(1);
    if (!order.length) throw createError("Order not found", 404);

    const o = order[0].order;
    const medicalStoreName = order[0].medicalStoreName;

    const items = await db
      .select({
        id: orderItems.id,
        medicineId: orderItems.medicineId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        lineTotal: orderItems.lineTotal,
        medicineName: medicines.medicineName,
        medicineImages: sql`null::jsonb`,
      })
      .from(orderItems)
      .innerJoin(medicines, eq(orderItems.medicineId, medicines.id))
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.createdAt), asc(orderItems.id));

    return {
      ...o,
      medicalStoreName: medicalStoreName ?? null,
      items,
    };
  }
}

export const orderService = new OrderService();
