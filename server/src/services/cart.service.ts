import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../config/database";
import { carts } from "../schema/carts";
import { cartItems } from "../schema/cartItems";
import { medicines } from "../schema/medicine";
import { appointments } from "../schema/appointments";
import { medicalStoreMedicines } from "../schema/medicalStoreMedicines";
import { medicalStores } from "../schema/medicalStores";
import { createError } from "../middleware/error.handler";

type CartSourceType = "direct" | "prescription";

export class CartService {
  async getOrCreateCart(patientId: string) {
    const existing = await db.select().from(carts).where(eq(carts.patientId, patientId)).limit(1);
    if (existing.length > 0) return existing[0];

    const created = await db.insert(carts).values({ patientId, isActive: true }).returning();
    return created[0];
  }

  private async getMedicineOrThrow(medicineId: number) {
    const medicine = await db
      .select()
      .from(medicines)
      .where(eq(medicines.id, medicineId))
      .limit(1);
    if (!medicine.length) throw createError("Medicine not found", 404);
    return medicine[0];
  }

  private async assertPrescriptionEligibility(params: {
    sourceType: CartSourceType;
    appointmentId?: string;
    patientId: string;
    medicineId: number;
  }) {
    const medicine = await this.getMedicineOrThrow(params.medicineId);

    if (params.sourceType === "direct" && medicine.prescriptionRequired) {
      throw createError("This medicine requires a prescription", 400);
    }

    if (params.sourceType === "prescription") {
      if (!params.appointmentId) throw createError("appointmentId is required for prescription items", 400);
      const apt = await db
        .select({ id: appointments.id, prescription: appointments.prescription, patientId: appointments.patientId })
        .from(appointments)
        .where(and(eq(appointments.id, params.appointmentId), eq(appointments.patientId, params.patientId)))
        .limit(1);
      if (!apt.length) throw createError("Appointment not found", 404);

      const prescription = Array.isArray(apt[0].prescription) ? apt[0].prescription : [];
      const prescribed = prescription.some((item: any) => Number(item?.medicineId) === params.medicineId);
      if (!prescribed) throw createError("Medicine is not prescribed in this appointment", 400);
    }

    return medicine;
  }

  async getCart(patientId: string) {
    const cart = await this.getOrCreateCart(patientId);
    const items = await db
      .select({
        id: cartItems.id,
        cartId: cartItems.cartId,
        medicineId: cartItems.medicineId,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        sourceType: cartItems.sourceType,
        appointmentId: cartItems.appointmentId,
        medicalStoreMedicineId: cartItems.medicalStoreMedicineId,
        medicineName: medicines.medicineName,
        prescriptionRequired: medicines.prescriptionRequired,
        medicalStoreName: medicalStores.storeName,
      })
      .from(cartItems)
      .innerJoin(medicines, eq(cartItems.medicineId, medicines.id))
      .leftJoin(medicalStoreMedicines, eq(cartItems.medicalStoreMedicineId, medicalStoreMedicines.id))
      .leftJoin(medicalStores, eq(medicalStoreMedicines.medicalStoreId, medicalStores.id))
      .where(eq(cartItems.cartId, cart.id))
      .orderBy(desc(cartItems.updatedAt), desc(cartItems.createdAt));

    const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
    return { cartId: cart.id, items, subtotal, total: subtotal, currency: "pkr" };
  }

  async addItem(
    patientId: string,
    payload: {
      medicineId: number;
      quantity?: number;
      sourceType?: CartSourceType;
      appointmentId?: string;
      medicalStoreMedicineId?: string;
    },
  ) {
    const quantity = Math.max(1, payload.quantity || 1);
    const sourceType: CartSourceType = payload.sourceType || "direct";

    if (payload.medicalStoreMedicineId) {
      if (sourceType !== "direct") {
        throw createError("Pharmacy listing items must use direct checkout", 400);
      }
      const cart = await this.getOrCreateCart(patientId);
      const listingRows = await db
        .select({
          id: medicalStoreMedicines.id,
          medicalStoreId: medicalStoreMedicines.medicalStoreId,
          medicineId: medicalStoreMedicines.medicineId,
          retailPrice: medicalStoreMedicines.retailPrice,
          listedQuantity: medicalStoreMedicines.listedQuantity,
          isActive: medicalStoreMedicines.isActive,
        })
        .from(medicalStoreMedicines)
        .where(eq(medicalStoreMedicines.id, payload.medicalStoreMedicineId))
        .limit(1);
      if (!listingRows.length) throw createError("Pharmacy listing not found", 404);
      const listing = listingRows[0];
      if (!listing.isActive) throw createError("This listing is not available", 400);
      if (Number(listing.medicineId) !== Number(payload.medicineId)) {
        throw createError("Listing does not match this medicine", 400);
      }
      if (listing.listedQuantity < quantity) throw createError("Not enough stock at this pharmacy", 400);

      const medicine = await this.getMedicineOrThrow(payload.medicineId);
      if (medicine.prescriptionRequired) {
        throw createError("This medicine requires a prescription", 400);
      }

      const existing = await db
        .select()
        .from(cartItems)
        .where(
          and(eq(cartItems.cartId, cart.id), eq(cartItems.medicalStoreMedicineId, payload.medicalStoreMedicineId)),
        )
        .limit(1);

      if (existing.length > 0) {
        const nextQty = Number(existing[0].quantity) + quantity;
        if (listing.listedQuantity < nextQty) throw createError("Not enough stock at this pharmacy", 400);
        await db
          .update(cartItems)
          .set({ quantity: nextQty, updatedAt: new Date() })
          .where(eq(cartItems.id, existing[0].id));
        return this.getCart(patientId);
      }

      await db.insert(cartItems).values({
        cartId: cart.id,
        medicalStoreMedicineId: payload.medicalStoreMedicineId,
        medicineId: payload.medicineId,
        quantity,
        unitPrice: String(listing.retailPrice ?? "0"),
        sourceType: "direct",
        appointmentId: null,
      });

      return this.getCart(patientId);
    }

    if (sourceType === "direct" && !payload.appointmentId) {
      throw createError("Add this medicine from a pharmacy listing (marketplace or pharmacy product page).", 400);
    }

    const medicine = await this.assertPrescriptionEligibility({
      sourceType,
      appointmentId: payload.appointmentId,
      patientId,
      medicineId: payload.medicineId,
    });

    const cart = await this.getOrCreateCart(patientId);

    const existing = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.medicineId, payload.medicineId),
          isNull(cartItems.medicalStoreMedicineId),
          eq(cartItems.appointmentId, payload.appointmentId!),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const nextQty = Number(existing[0].quantity) + quantity;
      await db.update(cartItems).set({ quantity: nextQty, updatedAt: new Date() }).where(eq(cartItems.id, existing[0].id));
      return this.getCart(patientId);
    }

    await db.insert(cartItems).values({
      cartId: cart.id,
      medicineId: payload.medicineId,
      quantity,
      unitPrice: "0",
      sourceType,
      appointmentId: payload.appointmentId || null,
    });

    return this.getCart(patientId);
  }

  async updateItem(patientId: string, itemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(patientId);
    const item = await db
      .select({
        row: cartItems,
        listedQuantity: medicalStoreMedicines.listedQuantity,
      })
      .from(cartItems)
      .innerJoin(medicines, eq(cartItems.medicineId, medicines.id))
      .leftJoin(medicalStoreMedicines, eq(cartItems.medicalStoreMedicineId, medicalStoreMedicines.id))
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .limit(1);
    if (!item.length) throw createError("Cart item not found", 404);

    const safeQty = Math.max(1, quantity);

    if (item[0].row.medicalStoreMedicineId) {
      const max = item[0].listedQuantity ?? 0;
      if (safeQty > max) throw createError("Not enough stock at this pharmacy", 400);
    }

    await db.update(cartItems).set({ quantity: safeQty, updatedAt: new Date() }).where(eq(cartItems.id, itemId));
    return this.getCart(patientId);
  }

  async removeItem(patientId: string, itemId: string) {
    const cart = await this.getOrCreateCart(patientId);
    await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
    return this.getCart(patientId);
  }

  async clearCartByCartId(cartId: string) {
    await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  }
}

export const cartService = new CartService();
