"use client";

import { Suspense, useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Heart,
  ArrowLeft,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Store,
  Tag,
} from "lucide-react";
import Loader from "@/components/ui/loader";
import EmptyState from "@/components/ui/empty-state";
import PublicLayout from "@/layout/PublicLayout";
import { medicineApi, Medicine } from "@/app/medicine/_api";
import {
  marketplaceApi,
  type MedicalStoreCatalogRow,
  type PublicStoreDetail,
} from "@/lib/marketplace-api";
import { motion } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import cartApi from "@/app/cart/_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { buildConsultDoctorUrl } from "@/lib/consult-doctor-url";
import { normalizeMedicineImages } from "@/lib/medicine-display";
import { MedicinePrescriptionBadge, MedicineStockStatus } from "@/components/medicine/medicine-catalog-parts";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cardSectionClass, marketplaceContentWidthClass, surfaceListItemClass } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function MedicineProductPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const medicineId = params.id ? parseInt(params.id as string, 10) : null;
  const storeIdParam = searchParams.get("storeId")?.trim() ?? "";
  const listingIdParam = searchParams.get("listingId")?.trim() ?? "";

  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const { showSuccess, showError, showInfo } = useCustomToast();

  const [storeListing, setStoreListing] = useState<{
    store: PublicStoreDetail;
    listing: MedicalStoreCatalogRow;
  } | null>(null);
  const [storeContextError, setStoreContextError] = useState<string | null>(null);

  useEffect(() => {
    if (!medicineId || isNaN(medicineId)) {
      setIsLoading(false);
      setError(new Error("Invalid medicine ID"));
      return;
    }

    let isMounted = true;

    const fetchMedicine = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await medicineApi.getMedicineById(medicineId);
        if (isMounted) {
          setMedicine(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch medicine"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMedicine();

    return () => {
      isMounted = false;
    };
  }, [medicineId]);

  useEffect(() => {
    if (!medicineId || isNaN(medicineId) || !storeIdParam || !isUuid(storeIdParam)) {
      setStoreListing(null);
      setStoreContextError(null);
      return;
    }

    let cancelled = false;
    setStoreContextError(null);

    (async () => {
      try {
        const [store, catalog] = await Promise.all([
          marketplaceApi.getStore(storeIdParam),
          marketplaceApi.getStoreCatalog(storeIdParam, 1, 8, medicineId),
        ]);
        if (cancelled) return;
        const listing =
          (listingIdParam && catalog.items.find((r) => r.listingId === listingIdParam)) ||
          catalog.items.find((r) => r.medicineId === medicineId) ||
          null;
        if (listing) {
          setStoreListing({ store, listing });
        } else {
          setStoreListing(null);
          setStoreContextError("This medicine is no longer listed at that pharmacy.");
        }
      } catch {
        if (!cancelled) {
          setStoreListing(null);
          setStoreContextError("Could not load pharmacy listing details.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [medicineId, storeIdParam, listingIdParam]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader title="Loading Product" description="Fetching medicine information..." />
        </div>
      </PublicLayout>
    );
  }

  if (error || !medicine) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16">
          <EmptyState
            title="Medicine Not Found"
            description={error?.message || "The medicine you're looking for doesn't exist."}
            action={{
              label: "Go Back",
              onClick: () => router.push("/"),
            }}
          />
        </div>
      </PublicLayout>
    );
  }

  const listing = storeListing?.listing;
  const store = storeListing?.store;

  const imagesFromMedicine = normalizeMedicineImages(medicine);

  const listingExtras: string[] = [];
  if (listing?.displayImageUrl) listingExtras.push(listing.displayImageUrl);
  if (listing?.packImages?.length) {
    for (const u of listing.packImages) {
      if (u && !listingExtras.includes(u)) listingExtras.push(u);
    }
  }
  const images =
    storeListing && listingExtras.length > 0
      ? [...listingExtras, ...imagesFromMedicine.filter((u) => !listingExtras.includes(u))]
      : imagesFromMedicine;

  const primaryImage = images[selectedImageIndex] || images[0] || "/pills.png";

  const displayCurrency = listing?.currency?.trim() || "PKR";
  const displayPriceNum = listing ? Number(listing.retailPrice) : NaN;
  const hasListingPrice = Boolean(listing) && Number.isFinite(displayPriceNum);
  const displayDiscountPct = 0;

  const inStock = listing ? listing.isActive && listing.listedQuantity > 0 : false;

  const prescriptionRequired = listing ? listing.prescriptionRequired : Boolean(medicine.prescriptionRequired);

  const handleAddToCart = async () => {
    if (!medicine || !medicineId) return;
    if (prescriptionRequired) {
      showInfo("Prescription required", "Find a doctor who can prescribe this medicine.");
      router.push(buildConsultDoctorUrl());
      return;
    }
    if (!listing?.listingId) {
      showInfo(
        "Choose a pharmacy",
        "Open this medicine from a pharmacy on the marketplace so we can route your order to that store.",
      );
      router.push("/search");
      return;
    }
    try {
      setAdding(true);
      await cartApi.addItem({
        medicineId,
        quantity: 1,
        sourceType: "direct",
        medicalStoreMedicineId: listing.listingId,
      });
      showSuccess("Added to cart", `${medicine.medicineName} was added to cart.`);
    } catch (error) {
      showError("Failed to add to cart", getErrorMessage(error));
    } finally {
      setAdding(false);
    }
  };

  const drugDescription = listing?.drugDescription?.trim() || null;

  let faqs: Array<{ question: string; answer: string }> = [];
  if (listing?.faqs?.length) {
    faqs = listing.faqs;
  }

  return (
    <PublicLayout>
      <div className={marketplaceContentWidthClass("py-8")}>
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {storeContextError ? (
          <p className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            {storeContextError}
          </p>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative aspect-square rounded-lg border-2 border-border bg-white overflow-hidden"
            >
              <Image
                src={primaryImage}
                alt={medicine.medicineName}
                fill
                className="object-contain p-4"
                unoptimized
              />
              {listing && displayDiscountPct > 0 && (
                <div className="absolute top-4 right-4 bg-destructive text-white text-sm font-semibold px-3 py-1 rounded-md">
                  -{Math.round(displayDiscountPct)}%
                </div>
              )}
            </motion.div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                      selectedImageIndex === index
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${medicine.medicineName} - Image ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center gap-2">
                {prescriptionRequired ? <MedicinePrescriptionBadge /> : null}
              </div>
              <h1 className="text-3xl font-bold mb-2">{medicine.medicineName}</h1>
            </div>

            {store && listing ? (
              <Card className={cn(cardSectionClass(), "border-primary/25 bg-primary/[0.04]")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" />
                    Pharmacy listing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>
                    <span className="text-muted-foreground">Sold at </span>
                    <Link
                      href={`/pharmacy/${store.id}`}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {store.storeName}
                    </Link>
                    {store.city ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {store.city}
                        {store.province ? `, ${store.province}` : ""}
                      </span>
                    ) : null}
                  </p>
                  {listing.categories?.length ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      {listing.categories.map((c) => (
                        <Badge key={c.id} variant="secondary" className="font-normal">
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {hasListingPrice ? (
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-4xl font-bold text-primary">
                  {displayCurrency}{" "}
                  {displayPriceNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                {displayDiscountPct > 0 && (
                  <Badge variant="secondary" className="text-sm">
                    Save {displayDiscountPct.toFixed(0)}%
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Open this product from a pharmacy listing to see price and availability.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {inStock ? (
                <>
                  <MedicineStockStatus inStock size="large" />
                  {listing ? (
                    <span className="text-sm text-muted-foreground">
                      ({listing.listedQuantity} at this pharmacy)
                    </span>
                  ) : null}
                </>
              ) : (
                <MedicineStockStatus inStock={false} size="large" />
              )}
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1"
                disabled={!inStock || adding}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {adding ? "Adding..." : prescriptionRequired ? "Consult Doctor" : "Add to Cart"}
              </Button>
              <Button size="lg" variant="outline" className="px-4" type="button">
                <Heart className="h-5 w-5" />
              </Button>
            </div>

            <Card className={cardSectionClass()}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border/80">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-muted-foreground">Prescription</TableCell>
                        <TableCell className="text-right font-medium">
                          {prescriptionRequired ? "Required" : "Not required"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {drugDescription && (
          <Card className={cn(cardSectionClass(), "mt-8")}>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{drugDescription}</p>
            </CardContent>
          </Card>
        )}

        {faqs.length > 0 && (
          <Card className={cn(cardSectionClass(), "mt-8")}>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <HelpCircle className="h-6 w-6" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {faqs.map((faq, index) => {
                  const faqId = `faq-${index}`;
                  const isOpen = openFaqs[faqId] || false;

                  return (
                    <Collapsible
                      key={index}
                      open={isOpen}
                      onOpenChange={(open) => {
                        setOpenFaqs((prev) => ({
                          ...prev,
                          [faqId]: open,
                        }));
                      }}
                    >
                      <CollapsibleTrigger className="w-full text-left">
                        <div className={cn(surfaceListItemClass("flex items-center justify-between p-4 hover:bg-muted/50"))}>
                          <div className="flex items-start gap-3 flex-1">
                            <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="font-medium text-foreground pr-4">{faq.question || "Question"}</p>
                          </div>
                          {isOpen ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="pl-8 pr-4 pb-4 text-muted-foreground">
                          {faq.answer || "No answer provided."}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PublicLayout>
  );
}

export default function MedicineProductPage() {
  return (
    <Suspense
      fallback={
        <PublicLayout>
          <div className="flex min-h-screen items-center justify-center">
            <Loader title="Loading Product" description="Fetching medicine information..." />
          </div>
        </PublicLayout>
      }
    >
      <MedicineProductPageInner />
    </Suspense>
  );
}
