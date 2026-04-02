"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingCart, 
  Heart, 
  CheckCircle,
  XCircle,
  ArrowRight,
  Shield
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/interceptor";
import { ApiResponse } from "@/lib/types";
import Loader from "@/components/ui/loader";
import cartApi from "@/app/cart/_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { PrescriptionMedicineBadge } from "@/components/medicine/PrescriptionMedicineBadge";

type Medicine = {
  id: number;
  medicineName: string;
  medicineUrl?: string | null;
  price?: string | null;
  discount?: string | null;
  stock?: number | null;
  images?: any | null;
  prescriptionRequired?: boolean | null;
  createdAt?: string | null;
  description?: any | null;
  drugCategory?: string | null;
  drugVarient?: string | null;
};

type UIProduct = {
  id: number;
  name: string;
  category?: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  inStock: boolean;
  prescriptionRequired: boolean;
};

const FeaturedProductsSection: React.FC = () => {
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useCustomToast();
  const [items, setItems] = useState<UIProduct[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const search = new URLSearchParams();
        search.set('limit', '6');
        search.set('uniqueCategories', 'true');
        const url = `/medicine/featured?${search.toString()}`;
        const response = await api.get<ApiResponse<Medicine[]>>(url);
        const meds = response.data.data || [];
        if (!isMounted) return;
        const mapped: UIProduct[] = meds.map((m: Medicine) => {
          // Determine primary image
          let imageUrl = "/pills.png"; // fallback from public assets
          if (Array.isArray(m.images) && m.images.length > 0) {
            const first = m.images[0];
            imageUrl = typeof first === "string" ? first : (first?.url || imageUrl);
          } else if (m.medicineUrl) {
            imageUrl = m.medicineUrl;
          }

          // Compute price/discount
          const priceNum = m.price ? parseFloat(m.price) : 0;
          const discountPct = m.discount ? parseFloat(m.discount) : 0; // percent value e.g., 10.00
          const originalPrice = discountPct > 0 ? priceNum / (1 - discountPct / 100) : undefined;

          return {
            id: m.id,
            name: m.medicineName,
            category: m.drugCategory || undefined,
            price: priceNum,
            originalPrice,
            imageUrl,
            inStock: (m.stock ?? 0) > 0,
            prescriptionRequired: Boolean(m.prescriptionRequired),
          };
        });
        setItems(mapped);
      } catch (e: any) {
        setError(e?.message || "Failed to load featured products");
      } finally {
        setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const products = useMemo(() => items || [], [items]);

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

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div 
          className="max-w-2xl mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-medium">Featured Products</span>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-primary">
            Premium Healthcare Solutions
          </h2>
          <p className="text-muted-foreground text-md leading-relaxed">
            Carefully curated selection of high-quality medicines and supplements 
            to support your health and wellness journey.
          </p>
        </motion.div>

        {/* Loading / Error States */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader
              title="Loading Featured Products"
              description="Fetching our premium healthcare solutions..."
            />
          </div>
        )}
        {error && !loading && (
          <div className="text-sm text-destructive mb-6">{error}</div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card 
                className="group h-full bg-card border-border hover:border-primary/30 hover:shadow-purple transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => router.push(`/medicine/${product.id}`)}
              >
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative h-40 sm:h-48 bg-white overflow-hidden">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      unoptimized
                      className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Status Indicators */}
                    <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-2">
                      {product.originalPrice && product.originalPrice > product.price && (
                        <div className="shrink-0 rounded-md bg-destructive px-2.5 py-1 text-xs font-semibold text-white">
                          -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                        </div>
                      )}
                      {product.prescriptionRequired && (
                        <PrescriptionMedicineBadge className="shrink-0" />
                      )}
                    </div>
                    
                    {/* Wishlist */}
                    <button
                      type="button"
                      className="absolute top-3 right-3 p-2 bg-card/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105"
                      aria-label="Save to favorites"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <Heart className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                    </button>
                  </div>

                  <div className="p-4 sm:p-5">
                    {/* Category & Name */}
                    <div className="mb-2 sm:mb-3">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        {product.category || 'General'}
                      </div>
                      <h3 className="font-semibold text-card-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors text-sm sm:text-base">
                        {product.name}
                      </h3>
                    </div>

                    {/* Price & Stock */}
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-xs sm:text-sm text-muted-foreground line-through">
                            PKR {product.originalPrice.toFixed(2)}
                          </span>
                        )}
                        <span className="text-lg sm:text-xl font-bold text-card-foreground">
                          PKR {product.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {product.inStock ? (
                          <>
                            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                            <span className="text-xs font-medium text-green-700">In Stock</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                            <span className="text-xs font-medium text-destructive">Out of Stock</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <Button 
                      className="w-full h-8 sm:h-9 text-xs sm:text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground disabled:bg-muted disabled:text-muted-foreground" 
                      disabled={!product.inStock || addingId === product.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                    >
                      <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      {addingId === product.id ? "Adding..." : (product.prescriptionRequired ? "Consult Doctor" : "Add to Cart")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        <motion.div 
          className="text-center mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Button 
            variant="outline"
            size="lg"
            className="px-4 sm:px-6 h-10 sm:h-11 font-medium border-primary/30 text-primary hover:bg-primary/5 hover:text-primary text-sm sm:text-base"
            onClick={() => router.push("/medicine")}
          >
            View All Products
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProductsSection;