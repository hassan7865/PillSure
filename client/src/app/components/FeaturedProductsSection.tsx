"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingCart, 
  Heart, 
  Star, 
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Shield
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/interceptor";
import { ApiResponse } from "@/lib/types";

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
  drugDescription?: string | null;
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
  rating: number;
  reviews: number;
  inStock: boolean;
  prescriptionRequired: boolean;
  description?: string;
};

const FeaturedProductsSection: React.FC = () => {
  const [items, setItems] = useState<UIProduct[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
            rating: 4.6, // placeholder until ratings exist
            reviews: 0, // placeholder until reviews exist
            inStock: (m.stock ?? 0) > 0,
            prescriptionRequired: Boolean(m.prescriptionRequired),
            description: m.drugDescription || undefined,
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

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="h-3.5 w-3.5 fill-amber-400/50 text-amber-400" />);
      } else {
        stars.push(<Star key={i} className="h-3.5 w-3.5 text-slate-300" />);
      }
    }
    return stars;
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 bg-muted/40 animate-pulse rounded-xl" />
            ))}
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
              <Card className="group h-full bg-card border-border hover:border-primary/30 hover:shadow-purple transition-all duration-300 overflow-hidden">
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
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      {product.originalPrice && product.originalPrice > product.price && (
                        <div className="bg-destructive text-white text-xs font-semibold px-2.5 py-1 rounded-md">
                          -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                        </div>
                      )}
                      {product.prescriptionRequired && (
                        <div className="bg-accent text-accent-foreground text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Rx
                        </div>
                      )}
                    </div>
                    
                    {/* Wishlist */}
                    <button className="absolute top-3 right-3 p-2 bg-card/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105">
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
                    
                    {/* Description */}
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">
                      {product.description || 'No description available'}
                    </p>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <div className="flex items-center">
                        {renderStars(product.rating)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {product.rating} ({product.reviews})
                      </span>
                    </div>

                    {/* Price & Stock */}
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-xs sm:text-sm text-muted-foreground line-through">
                            ${product.originalPrice.toFixed(2)}
                          </span>
                        )}
                        <span className="text-lg sm:text-xl font-bold text-card-foreground">
                          ${product.price.toFixed(2)}
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
                      disabled={!product.inStock}
                    >
                      <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      {product.prescriptionRequired ? "Consult Doctor" : "Add to Cart"}
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