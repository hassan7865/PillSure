"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, ShoppingCart, CheckCircle, XCircle, Shield, Package, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Loader from "@/components/ui/loader";
import { PrescriptionMedicineBadge } from "@/components/medicine/PrescriptionMedicineBadge";
import medicineApi, { CatalogCategory, CatalogResponse, Medicine } from "@/app/medicine/_api";
import cartApi from "@/app/cart/_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import PublicLayout from "@/layout/PublicLayout";

type UIProduct = {
  id: number;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  inStock: boolean;
  prescriptionRequired: boolean;
};

type UICategory = {
  category: string;
  items: UIProduct[];
};

const DEFAULT_PER_CATEGORY_LIMIT = 12;
const DEFAULT_CATEGORIES_PER_PAGE = 5;
const SEARCH_DEBOUNCE_MS = 350;

function mapMedicineToUI(m: Medicine): UIProduct {
  let imageUrl = "/pills.png";
  if (Array.isArray(m.images) && m.images.length > 0) {
    const first = m.images[0] as unknown;
    imageUrl = typeof first === "string" ? first : (m.medicineUrl || imageUrl);
  } else if (m.medicineUrl) {
    imageUrl = m.medicineUrl;
  }

  const priceNum = m.price ? parseFloat(m.price) : 0;
  const discountPct = m.discount ? parseFloat(m.discount) : 0;
  const originalPrice = discountPct > 0 ? priceNum / (1 - discountPct / 100) : undefined;

  return {
    id: m.id,
    name: m.medicineName,
    category: m.drugCategory || "General",
    price: priceNum,
    originalPrice,
    imageUrl,
    inStock: (m.stock ?? 0) > 0,
    prescriptionRequired: Boolean(m.prescriptionRequired),
  };
}

function mapCatalogResponse(data: CatalogCategory[]): UICategory[] {
  return data.map((category) => ({
    category: category.category,
    items: category.items.map(mapMedicineToUI),
  }));
}

export default function MedicineCatalogPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showSuccess, showError, showInfo } = useCustomToast();

  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") || "");
  const selectedCategory = searchParams.get("category") || "";

  const [categories, setCategories] = useState<UICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [categoryPage, setCategoryPage] = useState(1);
  const [hasMoreCategories, setHasMoreCategories] = useState(false);

  const sliderRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const normalizedUrlSearch = searchParams.get("search") || "";

    if (debouncedSearch) nextParams.set("search", debouncedSearch);
    else nextParams.delete("search");

    if (normalizedUrlSearch !== debouncedSearch) {
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  }, [debouncedSearch, pathname, router, searchParams]);

  useEffect(() => {
    setSearchInput(searchParams.get("search") || "");
  }, [searchParams]);

  const fetchCatalog = async ({ append }: { append: boolean }) => {
    const targetPage = append ? categoryPage + 1 : 1;
    try {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }

      const response: CatalogResponse = await medicineApi.getCatalogMedicines({
        category: selectedCategory || undefined,
        search: debouncedSearch || undefined,
        perCategoryLimit: DEFAULT_PER_CATEGORY_LIMIT,
        categoryPage: targetPage,
        categoriesPerPage: DEFAULT_CATEGORIES_PER_PAGE,
      });

      setCategories((prev) => {
        const mapped = mapCatalogResponse(response.categories);
        if (!append) return mapped;
        return [...prev, ...mapped];
      });
      setCategoryPage(targetPage);
      setHasMoreCategories(response.pagination.hasMoreCategories);
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to load catalog medicines");
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!isMounted) return;
      setCategoryPage(1);
      await fetchCatalog({ append: false });
    })();
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, selectedCategory]);

  const totalItems = useMemo(
    () => categories.reduce((sum, category) => sum + category.items.length, 0),
    [categories]
  );

  const updateCategoryFilter = (category: string | null) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (category) nextParams.set("category", category);
    else nextParams.delete("category");
    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handleAddToCart = async (product: UIProduct) => {
    if (product.prescriptionRequired) {
      showInfo("Prescription required", "Please consult doctor and order from your prescription.");
      router.push("/appointments");
      return;
    }

    try {
      setAddingId(product.id);
      await cartApi.addItem({ medicineId: product.id, quantity: 1, sourceType: "direct" });
      showSuccess("Added to cart", `${product.name} was added to cart.`);
    } catch (err) {
      showError("Failed to add to cart", getErrorMessage(err));
    } finally {
      setAddingId(null);
    }
  };

  const scrollCategory = (categoryKey: string, direction: "left" | "right") => {
    const container = sliderRefs.current[categoryKey];
    if (!container) return;
    const amount = Math.max(container.clientWidth * 0.85, 320);
    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <PublicLayout>
    <main className="bg-background min-h-screen">
      <section className="sticky top-16 sm:top-20 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="container mx-auto px-4 py-4 sm:py-5">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium">Medicine Catalog</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">All Medicines</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {loading ? "Loading products..." : `${totalItems} products across ${categories.length} categories`}
                </p>
              </div>
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search medicines by name..."
                  className="pl-9 h-10 border-primary/20 focus-visible:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-muted-foreground">
                <Layers className="h-3.5 w-3.5" />
                <span>{categories.length} categories</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                <span>{totalItems} products loaded</span>
              </div>
            </div>
            {selectedCategory && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Filtered category:</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => updateCategoryFilter(null)}
                >
                  {selectedCategory} x
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 sm:py-10">
        {loading && (
          <div className="py-12 flex justify-center">
            <Loader title="Loading catalog" description="Fetching medicines by category..." />
          </div>
        )}

        {!loading && error && <div className="text-sm text-destructive">{error}</div>}

        {!loading && !error && categories.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">No medicines found</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Try another search term or clear the selected category filter.
              </p>
              <Button variant="outline" onClick={() => {
                setSearchInput("");
                updateCategoryFilter(null);
              }}>
                Reset filters
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && categories.length > 0 && (
          <div className="space-y-10 sm:space-y-14">
            {categories.map((category) => (
              <div key={category.category} className="rounded-2xl border bg-card/40 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{category.category}</h2>
                    <p className="text-sm text-muted-foreground">{category.items.length} products</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-primary/20 hover:bg-primary/5"
                      onClick={() => scrollCategory(category.category, "left")}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-primary/20 hover:bg-primary/5"
                      onClick={() => scrollCategory(category.category, "right")}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div
                  ref={(el) => {
                    sliderRefs.current[category.category] = el;
                  }}
                  className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {category.items.map((product) => (
                    <Card
                      key={product.id}
                      className="group snap-start min-w-[230px] max-w-[230px] sm:min-w-[250px] sm:max-w-[250px] border-border/70 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden cursor-pointer bg-card"
                      onClick={() => router.push(`/medicine/${product.id}`)}
                    >
                      <CardContent className="p-0 h-full">
                        <div className="relative h-36 bg-gradient-to-b from-white to-muted/30 overflow-hidden">
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            unoptimized
                            className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] flex-col items-start gap-2">
                            {product.originalPrice && product.originalPrice > product.price && (
                              <div className="shrink-0 rounded-md bg-destructive px-2 py-0.5 text-[10px] font-semibold text-white">
                                -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                              </div>
                            )}
                            {product.prescriptionRequired && (
                              <PrescriptionMedicineBadge size="compact" className="shrink-0" />
                            )}
                          </div>
                        </div>

                        <div className="p-3.5">
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
                            {product.category}
                          </p>
                          <h3 className="font-semibold text-sm leading-snug line-clamp-2 min-h-10 mb-2.5">
                            {product.name}
                          </h3>

                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-baseline gap-1.5">
                              {product.originalPrice && product.originalPrice > product.price && (
                                <span className="text-[11px] text-muted-foreground line-through">
                                  PKR {product.originalPrice.toFixed(0)}
                                </span>
                              )}
                              <span className="text-base font-bold">PKR {product.price.toFixed(0)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {product.inStock ? (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                  <span className="text-[11px] text-green-700 font-medium">In Stock</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                                  <span className="text-[11px] text-destructive font-medium">Out</span>
                                </>
                              )}
                            </div>
                          </div>

                          <Button
                            className="w-full h-8 text-xs font-medium bg-primary hover:bg-primary/90"
                            disabled={!product.inStock || addingId === product.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(product);
                            }}
                          >
                            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                            {addingId === product.id ? "Adding..." : (product.prescriptionRequired ? "Consult Doctor" : "Add to Cart")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
            {hasMoreCategories && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className="min-w-44 border-primary/25 hover:bg-primary/5"
                  disabled={loadingMore}
                  onClick={() => fetchCatalog({ append: true })}
                >
                  {loadingMore ? "Loading..." : "Load more categories"}
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
    </PublicLayout>
  );
}
