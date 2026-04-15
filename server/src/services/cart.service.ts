import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../config/database";
import { carts } from "../schema/carts";
import { cartItems } from "../schema/cartItems";
import { medicines } from "../schema/medicine";
import { appointments } from "../schema/appointments";
import { medicalStoreMedicines } from "../schema/medicalStoreMedicines";
import { medicalStores } from "../schema/medicalStores";
import { createError } from "../middleware/error.handler";

type CartSourceType = "direct" | "prescription";

type AvailabilityLineStatus = "full" | "partial" | "not_available";

type AvailabilityStoreStatus = "full" | "partial" | "not_available";

interface RequestedCartItem {
  cartItemId: string;
  medicineId: number;
  medicineName: string;
  requestedQuantity: number;
  sourceType: string;
  appointmentId: string | null;
}

interface PharmacyAvailabilityLine {
  cartItemId: string;
  medicineId: number;
  medicineName: string;
  requestedQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
  unitPrice: string | null;
  listingId: string | null;
  status: AvailabilityLineStatus;
}

interface PharmacyAvailabilityStore {
  medicalStoreId: string;
  storeName: string;
  status: AvailabilityStoreStatus;
  fullItemsCount: number;
  availableItemsCount: number;
  missingItemsCount: number;
  totalItemsCount: number;
  estimatedTotal: number;
  currency: string;
  items: PharmacyAvailabilityLine[];
}

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

  async getPharmacyAvailability(
    patientId: string,
    opts?: {
      sortBy?: "availability" | "price";
    },
  ) {
    const sortBy = opts?.sortBy === "price" ? "price" : "availability";
    const cart = await this.getOrCreateCart(patientId);
    const cartRows = await db
      .select({
        cartItemId: cartItems.id,
        medicineId: cartItems.medicineId,
        quantity: cartItems.quantity,
        sourceType: cartItems.sourceType,
        appointmentId: cartItems.appointmentId,
        medicineName: medicines.medicineName,
      })
      .from(cartItems)
      .innerJoin(medicines, eq(cartItems.medicineId, medicines.id))
      .where(eq(cartItems.cartId, cart.id))
      .orderBy(desc(cartItems.updatedAt), desc(cartItems.createdAt));

    if (!cartRows.length) {
      return {
        cartId: cart.id,
        requestedItems: [] as RequestedCartItem[],
        stores: [] as PharmacyAvailabilityStore[],
        sortBy,
      };
    }

    const requestedItems: RequestedCartItem[] = cartRows.map((row) => ({
      cartItemId: row.cartItemId,
      medicineId: Number(row.medicineId),
      medicineName: row.medicineName,
      requestedQuantity: Math.max(1, Number(row.quantity) || 1),
      sourceType: String(row.sourceType ?? "direct"),
      appointmentId: row.appointmentId ?? null,
    }));

    const medicineIds = [...new Set(requestedItems.map((item) => item.medicineId))];
    
    if (medicineIds.length === 0) {
      return {
        cartId: cart.id,
        requestedItems,
        stores: [],
        sortBy,
        diagnostics: {
          totalMedicinesRequested: 0,
          medicinesWithListings: 0,
          medicinesWithoutListings: 0,
          missingMedicines: [],
          reason: "Cart has no valid medicines",
        },
      };
    }

    const listingRows = await db
      .select({
        listingId: medicalStoreMedicines.id,
        medicalStoreId: medicalStoreMedicines.medicalStoreId,
        storeName: medicalStores.storeName,
        medicineId: medicalStoreMedicines.medicineId,
        listedQuantity: medicalStoreMedicines.listedQuantity,
        retailPrice: medicalStoreMedicines.retailPrice,
        currency: medicalStoreMedicines.currency,
        isActive: medicalStoreMedicines.isActive,
      })
      .from(medicalStoreMedicines)
      .innerJoin(medicalStores, eq(medicalStoreMedicines.medicalStoreId, medicalStores.id))
      .where(
        and(
          inArray(medicalStoreMedicines.medicineId, medicineIds),
          eq(medicalStoreMedicines.isActive, true),
          eq(medicalStores.isActive, true),
        ),
      );

    const coverageByMedicineId = new Map<number, number>();
    for (const row of listingRows) {
      const medId = Number(row.medicineId);
      coverageByMedicineId.set(medId, (coverageByMedicineId.get(medId) ?? 0) + 1);
    }

    const medicinesWithoutListings = requestedItems
      .filter((item) => !coverageByMedicineId.has(item.medicineId))
      .map((item) => ({
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        quantity: item.requestedQuantity,
      }));

    const byStore = new Map<
      string,
      {
        storeName: string;
        currency: string;
        listingsByMedicineId: Map<
          number,
          {
            listingId: string;
            listedQuantity: number;
            retailPrice: string;
            currency: string;
          }
        >;
      }
    >();

    for (const row of listingRows) {
      const storeId = row.medicalStoreId;
      const medId = Number(row.medicineId);
      if (!byStore.has(storeId)) {
        byStore.set(storeId, {
          storeName: row.storeName,
          currency: String(row.currency || "PKR"),
          listingsByMedicineId: new Map(),
        });
      }
      byStore.get(storeId)!.listingsByMedicineId.set(medId, {
        listingId: row.listingId,
        listedQuantity: Number(row.listedQuantity || 0),
        retailPrice: String(row.retailPrice || "0"),
        currency: String(row.currency || "PKR"),
      });
    }

    const stores: PharmacyAvailabilityStore[] = [];

    for (const [medicalStoreId, store] of byStore.entries()) {
      const items: PharmacyAvailabilityLine[] = requestedItems.map((item) => {
        const listing = store.listingsByMedicineId.get(item.medicineId);
        const requestedQuantity = item.requestedQuantity;
        const listedQuantity = listing ? Number(listing.listedQuantity) : 0;
        const availableQuantity = Math.max(0, Math.min(requestedQuantity, listedQuantity));
        const missingQuantity = Math.max(0, requestedQuantity - availableQuantity);

        let status: AvailabilityLineStatus = "not_available";
        if (availableQuantity > 0 && missingQuantity === 0) status = "full";
        else if (availableQuantity > 0) status = "partial";

        return {
          cartItemId: item.cartItemId,
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          requestedQuantity,
          availableQuantity,
          missingQuantity,
          unitPrice: listing ? String(listing.retailPrice) : null,
          listingId: listing ? listing.listingId : null,
          status,
        };
      });

      const fullItemsCount = items.filter((line) => line.status === "full").length;
      const availableItemsCount = items.filter((line) => line.availableQuantity > 0).length;
      const totalItemsCount = items.length;
      const missingItemsCount = totalItemsCount - fullItemsCount;
      const estimatedTotal = items.reduce(
        (sum, line) => sum + Number(line.unitPrice || "0") * Number(line.availableQuantity),
        0,
      );

      let status: AvailabilityStoreStatus = "not_available";
      if (availableItemsCount === totalItemsCount && fullItemsCount === totalItemsCount) {
        status = "full";
      } else if (availableItemsCount > 0) {
        status = "partial";
      }

      if (availableItemsCount > 0) {
        stores.push({
          medicalStoreId,
          storeName: store.storeName,
          status,
          fullItemsCount,
          availableItemsCount,
          missingItemsCount,
          totalItemsCount,
          estimatedTotal,
          currency: store.currency,
          items,
        });
      }
    }

    stores.sort((a, b) => {
      if (sortBy === "price") {
        if (a.estimatedTotal !== b.estimatedTotal) return a.estimatedTotal - b.estimatedTotal;
        if (a.availableItemsCount !== b.availableItemsCount) return b.availableItemsCount - a.availableItemsCount;
        return a.storeName.localeCompare(b.storeName);
      }

      if (a.availableItemsCount !== b.availableItemsCount) return b.availableItemsCount - a.availableItemsCount;
      if (a.fullItemsCount !== b.fullItemsCount) return b.fullItemsCount - a.fullItemsCount;
      if (a.estimatedTotal !== b.estimatedTotal) return a.estimatedTotal - b.estimatedTotal;
      return a.storeName.localeCompare(b.storeName);
    });

    return {
      cartId: cart.id,
      requestedItems,
      stores,
      sortBy,
      diagnostics: {
        totalMedicinesRequested: requestedItems.length,
        medicinesWithListings: coverageByMedicineId.size,
        medicinesWithoutListings: medicinesWithoutListings.length,
        missingMedicines: medicinesWithoutListings,
        totalStoresChecked: new Set(listingRows.map((r) => r.medicalStoreId)).size,
        totalListingsFound: listingRows.length,
      },
    };
  }

  private async getPrescriptionRequestedItems(patientId: string, appointmentId: string) {
    const appointmentRows = await db
      .select({
        id: appointments.id,
        prescription: appointments.prescription,
      })
      .from(appointments)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.patientId, patientId)))
      .limit(1);

    if (!appointmentRows.length) {
      throw createError("Appointment not found", 404);
    }

    const prescription = Array.isArray(appointmentRows[0].prescription) ? appointmentRows[0].prescription : [];

    return prescription
      .filter((item: any) => Number(item?.medicineId))
      .map((item: any) => ({
        cartItemId: `prescription:${appointmentId}:${Number(item.medicineId)}`,
        medicineId: Number(item.medicineId),
        medicineName: String(item.medicineName || "Medicine"),
        requestedQuantity: Math.max(1, Number(item.quantity) || 1),
        sourceType: "prescription",
        appointmentId,
      })) as RequestedCartItem[];
  }

  async getPrescriptionPharmacyAvailability(
    patientId: string,
    appointmentId: string,
    opts?: {
      sortBy?: "availability" | "price";
    },
  ) {
    const sortBy = opts?.sortBy === "price" ? "price" : "availability";
    const cart = await this.getOrCreateCart(patientId);
    const requestedItems = await this.getPrescriptionRequestedItems(patientId, appointmentId);

    if (!requestedItems.length) {
      return {
        cartId: cart.id,
        requestedItems,
        stores: [] as PharmacyAvailabilityStore[],
        sortBy,
        diagnostics: {
          totalMedicinesRequested: 0,
          medicinesWithListings: 0,
          medicinesWithoutListings: 0,
          missingMedicines: [],
          reason: "Appointment has no prescription medicines",
        },
      };
    }

    const medicineIds = [...new Set(requestedItems.map((item) => item.medicineId))];
    const listingRows = await db
      .select({
        listingId: medicalStoreMedicines.id,
        medicalStoreId: medicalStoreMedicines.medicalStoreId,
        storeName: medicalStores.storeName,
        medicineId: medicalStoreMedicines.medicineId,
        listedQuantity: medicalStoreMedicines.listedQuantity,
        retailPrice: medicalStoreMedicines.retailPrice,
        currency: medicalStoreMedicines.currency,
        isActive: medicalStoreMedicines.isActive,
      })
      .from(medicalStoreMedicines)
      .innerJoin(medicalStores, eq(medicalStoreMedicines.medicalStoreId, medicalStores.id))
      .where(
        and(
          inArray(medicalStoreMedicines.medicineId, medicineIds),
          eq(medicalStoreMedicines.isActive, true),
          eq(medicalStores.isActive, true),
        ),
      );

    const coverageByMedicineId = new Map<number, number>();
    for (const row of listingRows) {
      const medId = Number(row.medicineId);
      coverageByMedicineId.set(medId, (coverageByMedicineId.get(medId) ?? 0) + 1);
    }

    const medicinesWithoutListings = requestedItems
      .filter((item) => !coverageByMedicineId.has(item.medicineId))
      .map((item) => ({
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        quantity: item.requestedQuantity,
      }));

    const byStore = new Map<
      string,
      {
        storeName: string;
        currency: string;
        listingsByMedicineId: Map<
          number,
          {
            listingId: string;
            listedQuantity: number;
            retailPrice: string;
            currency: string;
          }
        >;
      }
    >();

    for (const row of listingRows) {
      const storeId = row.medicalStoreId;
      const medId = Number(row.medicineId);
      if (!byStore.has(storeId)) {
        byStore.set(storeId, {
          storeName: row.storeName,
          currency: String(row.currency || "PKR"),
          listingsByMedicineId: new Map(),
        });
      }
      byStore.get(storeId)!.listingsByMedicineId.set(medId, {
        listingId: row.listingId,
        listedQuantity: Number(row.listedQuantity || 0),
        retailPrice: String(row.retailPrice || "0"),
        currency: String(row.currency || "PKR"),
      });
    }

    const stores: PharmacyAvailabilityStore[] = [];

    for (const [medicalStoreId, store] of byStore.entries()) {
      const items: PharmacyAvailabilityLine[] = requestedItems.map((item) => {
        const listing = store.listingsByMedicineId.get(item.medicineId);
        const requestedQuantity = item.requestedQuantity;
        const listedQuantity = listing ? Number(listing.listedQuantity) : 0;
        const availableQuantity = Math.max(0, Math.min(requestedQuantity, listedQuantity));
        const missingQuantity = Math.max(0, requestedQuantity - availableQuantity);

        let status: AvailabilityLineStatus = "not_available";
        if (availableQuantity > 0 && missingQuantity === 0) status = "full";
        else if (availableQuantity > 0) status = "partial";

        return {
          cartItemId: item.cartItemId,
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          requestedQuantity,
          availableQuantity,
          missingQuantity,
          unitPrice: listing ? String(listing.retailPrice) : null,
          listingId: listing ? listing.listingId : null,
          status,
        };
      });

      const fullItemsCount = items.filter((line) => line.status === "full").length;
      const availableItemsCount = items.filter((line) => line.availableQuantity > 0).length;
      const totalItemsCount = items.length;
      const missingItemsCount = totalItemsCount - fullItemsCount;
      const estimatedTotal = items.reduce(
        (sum, line) => sum + Number(line.unitPrice || "0") * Number(line.availableQuantity),
        0,
      );

      let status: AvailabilityStoreStatus = "not_available";
      if (availableItemsCount === totalItemsCount && fullItemsCount === totalItemsCount) {
        status = "full";
      } else if (availableItemsCount > 0) {
        status = "partial";
      }

      if (availableItemsCount > 0) {
        stores.push({
          medicalStoreId,
          storeName: store.storeName,
          status,
          fullItemsCount,
          availableItemsCount,
          missingItemsCount,
          totalItemsCount,
          estimatedTotal,
          currency: store.currency,
          items,
        });
      }
    }

    stores.sort((a, b) => {
      if (sortBy === "price") {
        if (a.estimatedTotal !== b.estimatedTotal) return a.estimatedTotal - b.estimatedTotal;
        if (a.availableItemsCount !== b.availableItemsCount) return b.availableItemsCount - a.availableItemsCount;
        return a.storeName.localeCompare(b.storeName);
      }

      if (a.availableItemsCount !== b.availableItemsCount) return b.availableItemsCount - a.availableItemsCount;
      if (a.fullItemsCount !== b.fullItemsCount) return b.fullItemsCount - a.fullItemsCount;
      if (a.estimatedTotal !== b.estimatedTotal) return a.estimatedTotal - b.estimatedTotal;
      return a.storeName.localeCompare(b.storeName);
    });

    return {
      cartId: cart.id,
      requestedItems,
      stores,
      sortBy,
      diagnostics: {
        totalMedicinesRequested: requestedItems.length,
        medicinesWithListings: coverageByMedicineId.size,
        medicinesWithoutListings: medicinesWithoutListings.length,
        missingMedicines: medicinesWithoutListings,
        totalStoresChecked: new Set(listingRows.map((r) => r.medicalStoreId)).size,
        totalListingsFound: listingRows.length,
      },
    };
  }

  async applyPrescriptionPharmacySelection(
    patientId: string,
    payload: {
      appointmentId: string;
      medicalStoreId: string;
      selections?: Array<{ cartItemId: string; quantity: number }>;
    },
  ) {
    const appointmentId = String(payload.appointmentId || "").trim();
    const medicalStoreId = String(payload.medicalStoreId || "").trim();
    if (!appointmentId) throw createError("appointmentId is required", 400);
    if (!medicalStoreId) throw createError("medicalStoreId is required", 400);

    const cart = await this.getOrCreateCart(patientId);
    const requestedItems = await this.getPrescriptionRequestedItems(patientId, appointmentId);
    if (!requestedItems.length) throw createError("Appointment has no prescription medicines", 400);

    const medicineIds = [...new Set(requestedItems.map((item) => item.medicineId))];
    const listings = await db
      .select({
        id: medicalStoreMedicines.id,
        medicineId: medicalStoreMedicines.medicineId,
        listedQuantity: medicalStoreMedicines.listedQuantity,
        retailPrice: medicalStoreMedicines.retailPrice,
      })
      .from(medicalStoreMedicines)
      .where(
        and(
          eq(medicalStoreMedicines.medicalStoreId, medicalStoreId),
          eq(medicalStoreMedicines.isActive, true),
          inArray(medicalStoreMedicines.medicineId, medicineIds),
        ),
      );

    const listingByMedicineId = new Map<number, (typeof listings)[number]>();
    for (const listing of listings) {
      listingByMedicineId.set(Number(listing.medicineId), listing);
    }

    if (!listingByMedicineId.size) {
      throw createError("No available medicines found at this pharmacy for your prescription", 400);
    }

    const quantityByCartItemId = new Map<string, number>();
    for (const s of Array.isArray(payload.selections) ? payload.selections : []) {
      const cartItemId = String(s?.cartItemId || "").trim();
      const qty = Number(s?.quantity);
      if (!cartItemId) continue;
      if (!Number.isFinite(qty) || qty < 1) throw createError("Selected quantity must be at least 1", 400);
      quantityByCartItemId.set(cartItemId, Math.floor(qty));
    }

    const removedItems: Array<{ cartItemId: string; medicineId: number; medicineName: string; reason: string }> = [];

    await db.delete(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.appointmentId, appointmentId)));

    for (const item of requestedItems) {
      const listing = listingByMedicineId.get(item.medicineId);
      if (!listing || Number(listing.listedQuantity || 0) < 1) {
        removedItems.push({
          cartItemId: item.cartItemId,
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          reason: "not_available",
        });
        continue;
      }

      const selectedQty = quantityByCartItemId.get(item.cartItemId) ?? item.requestedQuantity;
      const nextQty = Math.max(1, Math.min(selectedQty, Number(listing.listedQuantity)));

      await db.insert(cartItems).values({
        cartId: cart.id,
        medicalStoreMedicineId: listing.id,
        medicineId: item.medicineId,
        quantity: nextQty,
        unitPrice: String(listing.retailPrice),
        sourceType: "prescription",
        appointmentId,
      });
    }

    const updatedCart = await this.getCart(patientId);
    return {
      cart: updatedCart,
      selectedMedicalStoreId: medicalStoreId,
      removedItems,
    };
  }

  async applyPharmacySelection(
    patientId: string,
    payload: {
      medicalStoreId: string;
      selections?: Array<{ cartItemId: string; quantity: number }>;
    },
  ) {
    const medicalStoreId = String(payload.medicalStoreId || "").trim();
    if (!medicalStoreId) throw createError("medicalStoreId is required", 400);

    const cart = await this.getOrCreateCart(patientId);
    const currentItems = await db
      .select({
        id: cartItems.id,
        medicineId: cartItems.medicineId,
        quantity: cartItems.quantity,
        medicineName: medicines.medicineName,
      })
      .from(cartItems)
      .innerJoin(medicines, eq(cartItems.medicineId, medicines.id))
      .where(eq(cartItems.cartId, cart.id));

    if (!currentItems.length) throw createError("Cart is empty", 400);

    const itemIds = currentItems.map((item) => item.id);
    const selections = Array.isArray(payload.selections) ? payload.selections : [];
    const quantityByCartItemId = new Map<string, number>();
    for (const s of selections) {
      const cartItemId = String(s?.cartItemId || "").trim();
      if (!cartItemId) continue;
      if (!itemIds.includes(cartItemId)) {
        throw createError("One or more selected cart items are invalid", 400);
      }
      const qty = Number(s.quantity);
      if (!Number.isFinite(qty) || qty < 1) {
        throw createError("Selected quantity must be at least 1", 400);
      }
      quantityByCartItemId.set(cartItemId, Math.floor(qty));
    }

    const medicineIds = [...new Set(currentItems.map((item) => Number(item.medicineId)))];
    const listings = await db
      .select({
        id: medicalStoreMedicines.id,
        medicineId: medicalStoreMedicines.medicineId,
        listedQuantity: medicalStoreMedicines.listedQuantity,
        retailPrice: medicalStoreMedicines.retailPrice,
      })
      .from(medicalStoreMedicines)
      .where(
        and(
          eq(medicalStoreMedicines.medicalStoreId, medicalStoreId),
          eq(medicalStoreMedicines.isActive, true),
          inArray(medicalStoreMedicines.medicineId, medicineIds),
        ),
      );

    const listingByMedicineId = new Map<number, (typeof listings)[number]>();
    for (const listing of listings) {
      listingByMedicineId.set(Number(listing.medicineId), listing);
    }

    if (!listingByMedicineId.size) {
      throw createError("No available medicines found at this pharmacy for your cart", 400);
    }

    const removedItems: Array<{ cartItemId: string; medicineId: number; medicineName: string; reason: string }> = [];

    await db.transaction(async (tx) => {
      for (const item of currentItems) {
        const listing = listingByMedicineId.get(Number(item.medicineId));
        if (!listing || Number(listing.listedQuantity || 0) < 1) {
          await tx.delete(cartItems).where(eq(cartItems.id, item.id));
          removedItems.push({
            cartItemId: item.id,
            medicineId: Number(item.medicineId),
            medicineName: item.medicineName,
            reason: "not_available",
          });
          continue;
        }

        const selectedQty = quantityByCartItemId.get(item.id);
        const nextQty = selectedQty ?? Math.max(1, Number(item.quantity) || 1);
        if (nextQty > Number(listing.listedQuantity)) {
          throw createError(`Requested quantity exceeds stock for ${item.medicineName}`, 400);
        }

        await tx
          .update(cartItems)
          .set({
            medicalStoreMedicineId: listing.id,
            quantity: nextQty,
            unitPrice: String(listing.retailPrice),
            sourceType: "direct",
            updatedAt: new Date(),
          })
          .where(eq(cartItems.id, item.id));
      }
    });

    const updatedCart = await this.getCart(patientId);
    return {
      cart: updatedCart,
      selectedMedicalStoreId: medicalStoreId,
      removedItems,
    };
  }
}

export const cartService = new CartService();
