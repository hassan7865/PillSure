import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../config/database";
import { orders } from "../schema/orders";
import { orderItems } from "../schema/orderItems";
import { cartItems } from "../schema/cartItems";
import { medicines } from "../schema/medicine";
import { createError } from "../middleware/error.handler";
import { cartService } from "./cart.service";
import { stripeService } from "./stripe.service";

export class OrderService {
  private assertCheckoutContactInfo(payload: { shippingAddress?: string; contactNo?: string }) {
    const shippingAddress = String(payload.shippingAddress || "").trim();
    const contactNo = String(payload.contactNo || "").trim();
    if (!shippingAddress) throw createError("shippingAddress is required", 400);
    if (!contactNo) throw createError("contactNo is required", 400);
    return { shippingAddress, contactNo };
  }

  private async getCheckoutItems(patientId: string) {
    const cart = await cartService.getOrCreateCart(patientId);
    const items = await db
      .select({
        id: cartItems.id,
        medicineId: cartItems.medicineId,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        appointmentId: cartItems.appointmentId,
        medicineName: medicines.medicineName,
        stock: medicines.stock,
        prescriptionRequired: medicines.prescriptionRequired,
      })
      .from(cartItems)
      .innerJoin(medicines, eq(cartItems.medicineId, medicines.id))
      .where(eq(cartItems.cartId, cart.id))
      .orderBy(desc(cartItems.updatedAt), desc(cartItems.createdAt));

    if (!items.length) throw createError("Cart is empty", 400);

    for (const item of items) {
      if ((item.stock ?? 0) < Number(item.quantity)) {
        throw createError(`Insufficient stock for ${item.medicineName}`, 400);
      }
    }

    const subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0);
    return { cartId: cart.id, items, subtotal, total: subtotal, currency: "pkr" };
  }

  async createCodOrder(patientId: string, payload: { shippingAddress?: string; contactNo?: string }) {
    const contactInfo = this.assertCheckoutContactInfo(payload);
    const checkout = await this.getCheckoutItems(patientId);

    const createdOrder = await db
      .insert(orders)
      .values({
        patientId,
        status: "pending",
        paymentMethod: "cod",
        paymentStatus: "pending_cod",
        subtotal: checkout.subtotal.toFixed(2),
        total: checkout.total.toFixed(2),
        currency: checkout.currency,
        shippingAddress: contactInfo.shippingAddress,
        contactNo: contactInfo.contactNo,
      })
      .returning();

    const order = createdOrder[0];

    await db.insert(orderItems).values(
      checkout.items.map((item) => ({
        orderId: order.id,
        medicineId: item.medicineId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice).toFixed(2),
        lineTotal: (Number(item.unitPrice) * Number(item.quantity)).toFixed(2),
        appointmentId: item.appointmentId || null,
      }))
    );

    await cartService.clearCartByCartId(checkout.cartId);
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

    const items = await db
      .select({
        medicineId: cartItems.medicineId,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        appointmentId: cartItems.appointmentId,
      })
      .from(cartItems)
      .where(eq(cartItems.cartId, params.cartId))
      .orderBy(desc(cartItems.updatedAt), desc(cartItems.createdAt));

    if (!items.length) throw createError("Cart is empty for this checkout session", 400);

    const subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0);
    const createdOrder = await db
      .insert(orders)
      .values({
        patientId: params.patientId,
        status: "pending",
        paymentMethod: "online",
        paymentStatus: "paid",
        stripeSessionId: params.stripeSessionId,
        subtotal: subtotal.toFixed(2),
        total: subtotal.toFixed(2),
        currency: "pkr",
        shippingAddress: params.shippingAddress || null,
        contactNo: params.contactNo || null,
      })
      .returning();

    const order = createdOrder[0];
    await db.insert(orderItems).values(
      items.map((item) => ({
        orderId: order.id,
        medicineId: item.medicineId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice).toFixed(2),
        lineTotal: (Number(item.unitPrice) * Number(item.quantity)).toFixed(2),
        appointmentId: item.appointmentId || null,
      }))
    );

    await cartService.clearCartByCartId(params.cartId);
    return order;
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
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.patientId, patientId)))
      .limit(1);
    if (!order.length) throw createError("Order not found", 404);

    const items = await db
      .select({
        id: orderItems.id,
        medicineId: orderItems.medicineId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        lineTotal: orderItems.lineTotal,
        medicineName: medicines.medicineName,
        medicineImages: medicines.images,
      })
      .from(orderItems)
      .innerJoin(medicines, eq(orderItems.medicineId, medicines.id))
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.createdAt), asc(orderItems.id));

    return { ...order[0], items };
  }
}

export const orderService = new OrderService();
