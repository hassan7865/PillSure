"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingCart, 
  CheckCircle,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import cartApi from "@/app/cart/_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { PrescriptionMedicineBadge } from "@/components/medicine/PrescriptionMedicineBadge";
import medicineApi, { Medicine } from "@/app/medicine/_api";
import Loader from "@/components/ui/loader";

type UITopProduct = {
  id: number;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  inStock: boolean;
  prescriptionRequired: boolean;
  description: string;
  badge: string;
  discountPercent: number;
};

const TopSellingSection: React.FC = () => {
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useCustomToast();
  const [items, setItems] = useState<UITopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await medicineApi.getCatalogMedicines({
          categoriesPerPage: 5,
          categoryPage: 1,
          perCategoryLimit: 6,
        });

        if (!isMounted) return;
        const flattened = response.categories.flatMap((c) => c.items);
        const mapped = flattened.map((m: Medicine): UITopProduct => {
          const priceNum = m.price ? parseFloat(m.price) : 0;
          const discountPct = m.discount ? parseFloat(m.discount) : 0;
          const originalPrice = discountPct > 0 ? priceNum / (1 - discountPct / 100) : undefined;
          const firstImage = Array.isArray(m.images) && m.images.length > 0 ? m.images[0] : m.medicineUrl;

          return {
            id: m.id,
            name: m.medicineName,
            category: m.drugCategory || "General",
            price: priceNum,
            originalPrice,
            imageUrl: typeof firstImage === "string" ? firstImage : "/pills.png",
            inStock: (m.stock ?? 0) > 0,
            prescriptionRequired: Boolean(m.prescriptionRequired),
            description: (m.drugVarient || "Trusted medicine from verified suppliers").slice(0, 60),
            badge: discountPct >= 10 ? "Sale" : "Popular",
            discountPercent: discountPct,
          };
        });

        const top = mapped
          .filter((m) => m.inStock)
          .sort((a, b) => (b.discountPercent - a.discountPercent) || (b.price - a.price))
          .slice(0, 6);

        setItems(top);
      } catch (err) {
        if (!isMounted) return;
        setError(getErrorMessage(err) || "Failed to load top products");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const topSellingProducts = useMemo(() => items, [items]);

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "Best Seller":
        return "bg-destructive text-white";
      case "Trending":
        return "bg-accent text-accent-foreground";
      case "Popular":
        return "bg-primary text-primary-foreground";
      case "Top Rated":
        return "bg-green-600 text-white";
      case "Sale":
        return "bg-primary/80 text-primary-foreground";
      case "Fast Moving":
        return "bg-accent/80 text-accent-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleAddToCart = async (product: UITopProduct) => {
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
    <section className="relative py-20 overflow-hidden bg-gradient-to-b from-background to-muted/30">
      {/* Background Elements */}
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </motion.div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div 
          className="max-w-2xl mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-medium">Top Selling Products</span>
          </div>
          <h2 className="text-3xl font-bold text-primary mb-4">
            Most Popular Choices
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Discover our best-selling medicines and supplements, trusted by thousands of customers 
            for their effectiveness and quality.
          </p>
        </motion.div>

        {/* Top 3 Products - Featured */}
        {loading && (
          <div className="py-12 flex justify-center">
            <Loader title="Loading top products" description="Fetching best choices from the catalog..." />
          </div>
        )}
        {!loading && error && <div className="text-sm text-destructive mb-8">{error}</div>}
        {!loading && !error && topSellingProducts.length > 0 && (
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {topSellingProducts.slice(0, 3).map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <Card
                className="group cursor-pointer hover:shadow-purple transition-all duration-300 border-border/50 hover:border-primary/30 bg-card backdrop-blur-sm overflow-hidden"
                onClick={() => router.push(`/medicine/${product.id}`)}
              >
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative h-40 sm:h-48 bg-muted/30 overflow-hidden">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-contain group-hover:scale-110 transition-transform duration-500"
                    />
                    
                    {/* Badge */}
                    <div className="absolute top-3 left-3">
                      <div className={`text-xs font-bold px-3 py-1 rounded-full ${getBadgeColor(product.badge)}`}>
                        {product.badge}
                      </div>
                    </div>
                    
                    {product.prescriptionRequired && (
                      <div className="absolute top-3 right-3">
                        <PrescriptionMedicineBadge size="compact" />
                      </div>
                    )}
                  </div>

                  <div className="p-4 sm:p-6">
                    {/* Category */}
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">{product.category}</div>
                    
                    {/* Product Name */}
                    <h3 className="text-base sm:text-lg font-semibold text-card-foreground mb-1 sm:mb-2 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                      {product.name}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Price */}
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        {product.originalPrice && (
                          <span className="text-xs sm:text-sm text-muted-foreground line-through">
                            PKR {product.originalPrice.toFixed(2)}
                          </span>
                        )}
                        <span className="text-lg sm:text-xl font-bold text-card-foreground">
                          PKR {product.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                        <span className="text-xs sm:text-sm text-green-600 font-medium">In Stock</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      className="w-full text-xs sm:text-sm py-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={addingId === product.id}
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
        </motion.div>
        )}

        {/* Remaining Products Grid */}
        {!loading && !error && topSellingProducts.length > 3 && (
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          {topSellingProducts.slice(3).map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <Card
                className="group cursor-pointer hover:shadow-purple transition-all duration-300 border-border/50 hover:border-primary/30 bg-card backdrop-blur-sm overflow-hidden"
                onClick={() => router.push(`/medicine/${product.id}`)}
              >
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative h-40 bg-muted/30 overflow-hidden">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-contain group-hover:scale-110 transition-transform duration-500"
                    />
                    
                    {/* Badge */}
                    <div className="absolute top-2 left-2">
                      <div className={`text-xs font-bold px-2 py-1 rounded-full ${getBadgeColor(product.badge)}`}>
                        {product.badge}
                      </div>
                    </div>
                    
                    {product.prescriptionRequired && (
                      <div className="absolute top-2 right-2">
                        <PrescriptionMedicineBadge size="compact" />
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-4">
                    {/* Category */}
                    <div className="text-xs text-muted-foreground mb-1">{product.category}</div>
                    
                    {/* Product Name */}
                    <h3 className="text-sm sm:text-base font-semibold text-card-foreground mb-1 sm:mb-2 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                      {product.name}
                    </h3>

                    {/* Price */}
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-1 sm:gap-2">
                        {product.originalPrice && (
                          <span className="text-xs text-muted-foreground line-through">
                            PKR {product.originalPrice.toFixed(2)}
                          </span>
                        )}
                        <span className="text-base sm:text-lg font-bold text-card-foreground">
                          PKR {product.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      size="sm"
                      className="w-full text-xs py-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={addingId === product.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      {addingId === product.id ? "Adding..." : (product.prescriptionRequired ? "Consult Doctor" : "Add to Cart")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
        )}
        {!loading && !error && topSellingProducts.length === 0 && (
          <div className="text-sm text-muted-foreground mb-10">No products available right now.</div>
        )}

        {/* View All Button */}
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          <Button 
            size="lg" 
            variant="outline"
            className="px-6 sm:px-8 py-3 text-sm sm:text-base font-semibold rounded-xl border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => router.push("/medicine")}
          >
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            View All Top Sellers
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default TopSellingSection;
