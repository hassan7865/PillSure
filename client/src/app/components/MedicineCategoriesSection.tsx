"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Eye,
  Bone,
  ArrowRight,
  Activity,
  Heart,
  Brain,
  Baby,
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import medicineApi from "@/app/medicine/_api";
import Loader from "@/components/ui/loader";
import { getErrorMessage } from "@/lib/error-utils";

type UICategory = {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  productCount: string;
  bgColor: string;
  accentColor: string;
  icon: typeof Heart;
};

const cardStyles = [
  { bgColor: "bg-primary/5", accentColor: "text-primary", icon: Heart },
  { bgColor: "bg-accent/10", accentColor: "text-accent", icon: Eye },
  { bgColor: "bg-primary/10", accentColor: "text-primary", icon: Brain },
  { bgColor: "bg-secondary/20", accentColor: "text-secondary-foreground", icon: Baby },
  { bgColor: "bg-primary/8", accentColor: "text-primary", icon: Shield },
  { bgColor: "bg-muted/30", accentColor: "text-muted-foreground", icon: Bone },
];


const MedicineCategoriesSection: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<UICategory[]>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await medicineApi.getCatalogMedicines({
          categoriesPerPage: 6,
          categoryPage: 1,
          perCategoryLimit: 12,
        });
        if (!isMounted) return;

        const mapped: UICategory[] = response.categories.map((category, index) => {
          const style = cardStyles[index % cardStyles.length];
          const firstItem = category.items[0];
          const firstImage = Array.isArray(firstItem?.images) && firstItem.images.length > 0
            ? firstItem.images[0]
            : firstItem?.medicineUrl;
          return {
            id: index + 1,
            name: category.category,
            subtitle: "Healthcare Essentials",
            description: "SHOP MEDICINES",
            imageUrl: typeof firstImage === "string" ? firstImage : "/pills.png",
            productCount: `${category.items.length}+`,
            bgColor: style.bgColor,
            accentColor: style.accentColor,
            icon: style.icon,
          };
        });
        setCategories(mapped);
      } catch (err) {
        if (!isMounted) return;
        setError(getErrorMessage(err) || "Failed to load categories");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const goToCategory = (categoryName: string) => {
    const params = new URLSearchParams();
    params.set("category", categoryName);
    router.push(`/medicine?${params.toString()}`);
  };

  const hasCategories = useMemo(() => categories.length > 0, [categories]);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div 
          className="max-w-2xl mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-medium">Health Categories</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Shop by Health Category
          </h2>
          <p className="text-muted-foreground text-lg">
            Browse our comprehensive range of medical products organized by health condition
          </p>
        </motion.div>

        {loading && (
          <div className="py-10 flex justify-center">
            <Loader title="Loading categories" description="Fetching categories from our medicine catalog..." />
          </div>
        )}
        {!loading && error && <div className="text-sm text-destructive mb-8">{error}</div>}

        {/* Categories Grid - 3 columns, 2 rows */}
        {!loading && hasCategories && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {categories.map((category, index) => {
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group cursor-pointer"
                onClick={() => goToCategory(category.name)}
              >
                <Card className={`h-56 sm:h-64 ${category.bgColor} border border-border/50 overflow-hidden hover:shadow-purple hover:-translate-y-1 transition-all duration-300 relative`}>
                  <CardContent className="p-4 sm:p-6 h-full flex flex-col justify-between relative">
                    {/* Content */}
                    <div>
                      <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                        {category.subtitle}
                      </div>
                      <h3 className="text-lg sm:text-2xl font-bold text-foreground mb-1 sm:mb-2 leading-tight">
                        {category.name.toUpperCase()}
                      </h3>
                      <div className={`text-xs font-bold ${category.accentColor} tracking-wider mb-3 sm:mb-4`}>
                        {category.description}
                      </div>
                    </div>

                    {/* Product Image - Large and prominent */}
                    <div className="absolute -right-2 sm:-right-4 -bottom-2 sm:-bottom-4 w-24 sm:w-32 h-24 sm:h-32">
                      <Image
                        src={category.imageUrl}
                        alt={category.name}
                        fill
                        className="object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>

                    {/* Shop Now Button */}
                    <div className="relative z-10">
                      <Button 
                        size="sm" 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4 py-2 h-8 sm:h-9 text-xs sm:text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToCategory(category.name);
                        }}
                      >
                        SHOP NOW
                        <ArrowRight className="h-3 w-3 ml-1 sm:ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
        )}
        {!loading && !error && !hasCategories && (
          <div className="text-sm text-muted-foreground mb-8">No categories available right now.</div>
        )}

        {/* View All Categories */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Button 
            variant="outline"
            size="lg"
            className="px-6 sm:px-8 border-primary/30 text-primary hover:bg-primary/5 text-sm sm:text-base"
            onClick={() => router.push("/medicine")}
          >
            View All Categories
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default MedicineCategoriesSection;