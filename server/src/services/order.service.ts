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
import { safepayService } from "./safepay.service";
import { patients } from "../schema/patient";
import { isUuid } from "../utils/uuid";

export interface ShippingAddressEntry {
  id: string;
  label: string;
  addressLine: string;
  contactNo: string;
  isDefault?: boolean;
}

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
  private normalizeShippingAddresses(raw: unknown): ShippingAddressEntry[] {
    if (!Array.isArray(raw)) return [];
    const out: ShippingAddressEntry[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? "").trim();
      const label = String(row.label ?? "").trim();
      const addressLine = String(row.addressLine ?? "").trim();
      const contactNo = String(row.contactNo ?? "").trim();
      if (!id || !label || !addressLine || !contactNo) continue;
      out.push({ id, label, addressLine, contactNo, isDefault: Boolean(row.isDefault) });
    }
    if (!out.length) return out;
    if (!out.some((a) => a.isDefault)) out[0].isDefault = true;
    return out;
  }

  private async getPatientAddressBook(patientId: string): Promise<ShippingAddressEntry[]> {
    const [row] = await db
      .select({ shippingAddresses: patients.shippingAddresses })
      .from(patients)
      .where(eq(patients.userId, patientId))
      .limit(1);
    return this.normalizeShippingAddresses(row?.shippingAddresses);
  }

  async listPatientShippingAddresses(patientId: string): Promise<ShippingAddressEntry[]> {
    return this.getPatientAddressBook(patientId);
  }

  async addPatientShippingAddress(
    patientId: string,
    payload: { label?: string; addressLine?: string; contactNo?: string; isDefault?: boolean },
  ): Promise<ShippingAddressEntry[]> {
    const label = String(payload.label ?? "").trim();
    const addressLine = String(payload.addressLine ?? "").trim();
    const contactNo = String(payload.contactNo ?? "").trim();
    if (!label || !addressLine || !contactNo) throw createError("label, addressLine and contactNo are required", 400);
    const current = await this.getPatientAddressBook(patientId);
    const newRow: ShippingAddressEntry = {
      id: `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      label,
      addressLine,
      contactNo,
      isDefault: payload.isDefault === true || current.length === 0,
    };
    const next: ShippingAddressEntry[] = current.map((a) => ({
      ...a,
      isDefault: newRow.isDefault ? false : a.isDefault,
    }));
    next.push(newRow);
    await db
      .update(patients)
      .set({ shippingAddresses: next, updatedAt: new Date() })
      .where(eq(patients.userId, patientId));
    return next;
  }

  async updatePatientShippingAddress(
    patientId: string,
    addressId: string,
    payload: { label?: string; addressLine?: string; contactNo?: string; isDefault?: boolean },
  ): Promise<ShippingAddressEntry[]> {
    const current = await this.getPatientAddressBook(patientId);
    const idx = current.findIndex((a) => a.id === addressId);
    if (idx < 0) throw createError("Address not found", 404);
    const updated = {
      ...current[idx],
      ...(payload.label !== undefined ? { label: String(payload.label).trim() } : null),
      ...(payload.addressLine !== undefined ? { addressLine: String(payload.addressLine).trim() } : null),
      ...(payload.contactNo !== undefined ? { contactNo: String(payload.contactNo).trim() } : null),
      ...(payload.isDefault !== undefined ? { isDefault: Boolean(payload.isDefault) } : null),
    };
    if (!updated.label || !updated.addressLine || !updated.contactNo) {
      throw createError("label, addressLine and contactNo are required", 400);
    }
    const next = current.map((a, i) => (i === idx ? updated : { ...a }));
    if (updated.isDefault) {
      for (const a of next) if (a.id !== updated.id) a.isDefault = false;
    }
    if (!next.some((a) => a.isDefault)) next[0].isDefault = true;
    await db
      .update(patients)
      .set({ shippingAddresses: next, updatedAt: new Date() })
      .where(eq(patients.userId, patientId));
    return next;
  }

  async deletePatientShippingAddress(patientId: string, addressId: string): Promise<ShippingAddressEntry[]> {
    const current = await this.getPatientAddressBook(patientId);
    const next = current.filter((a) => a.id !== addressId);
    if (next.length && !next.some((a) => a.isDefault)) next[0].isDefault = true;
    await db
      .update(patients)
      .set({ shippingAddresses: next, updatedAt: new Date() })
      .where(eq(patients.userId, patientId));
    return next;
  }

  private async resolveCheckoutContactInfo(
    patientId: string,
    payload: { addressId?: string; shippingAddress?: string; contactNo?: string },
  ) {
    const addressId = String(payload.addressId ?? "").trim();
    if (addressId) {
      const book = await this.getPatientAddressBook(patientId);
      const found = book.find((a) => a.id === addressId);
      if (!found) throw createError("Selected shipping address not found", 400);
      return { shippingAddress: found.addressLine, contactNo: found.contactNo };
    }
    const shippingAddress = String(payload.shippingAddress ?? "").trim();
    const contactNo = String(payload.contactNo ?? "").trim();
    if (shippingAddress && contactNo) return { shippingAddress, contactNo };
    const book = await this.getPatientAddressBook(patientId);
    const fallback = book.find((a) => a.isDefault) ?? book[0];
    if (!fallback) throw createError("No shipping address found. Please add one before checkout.", 400);
    return { shippingAddress: fallback.addressLine, contactNo: fallback.contactNo };
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
    shouldMutateInventoryAndCart?: boolean;
  }) {
    const { checkout } = params;
    const shouldMutateInventoryAndCart = params.shouldMutateInventoryAndCart ?? true;

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

      if (shouldMutateInventoryAndCart) {
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
      }

      return order;
    });
  }

  async createCodOrder(patientId: string, payload: { addressId?: string; shippingAddress?: string; contactNo?: string }) {
    const contactInfo = await this.resolveCheckoutContactInfo(patientId, payload);
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

  async createOnlineCheckoutSession(
    patientId: string,
    payload: { addressId?: string; shippingAddress?: string; contactNo?: string },
  ) {
    const contactInfo = await this.resolveCheckoutContactInfo(patientId, payload);
    const checkout = await this.getCheckoutItems(patientId);
    const pendingOrder = await this.finalizeOrderInTransaction({
      patientId,
      paymentMethod: "online",
      paymentStatus: "pending_online",
      stripeSessionId: null,
      shippingAddress: contactInfo.shippingAddress,
      contactNo: contactInfo.contactNo,
      checkout,
      shouldMutateInventoryAndCart: false,
    });

    const session = await safepayService.createMedicineCheckoutSession({
      amountPkr: checkout.total,
      orderId: `med_${pendingOrder.id}`,
    });

    await db.delete(cartItems).where(eq(cartItems.cartId, checkout.cartId));
    return { sessionId: session.id, checkoutUrl: session.url };
  }

  async finalizePaidOrderFromSafepay(params: {
    orderRef: string;
    paymentSessionId: string;
    paymentState?: string;
  }) {
    if (params.paymentState && params.paymentState.toUpperCase() !== "PAID") {
      return null;
    }
    if (!params.orderRef.startsWith("med_")) {
      throw createError("Invalid Safepay order reference", 400);
    }
    const orderId = params.orderRef.slice(4);
    if (!isUuid(orderId)) {
      throw createError("Invalid Safepay order id", 400);
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      throw createError("Order not found", 404);
    }
    if (order.paymentStatus === "paid") {
      return order;
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    return db.transaction(async (tx) => {
      for (const item of items) {
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

      const [paidOrder] = await tx
        .update(orders)
        .set({
          paymentStatus: "paid",
          stripeSessionId: params.paymentSessionId,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id))
        .returning();
      return paidOrder;
    });
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
    if (!isUuid(String(orderId ?? "").trim())) {
      throw createError("Invalid order id", 400);
    }

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
