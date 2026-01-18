"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { ShoppingCart, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { RAGMedicineInfo } from "@/app/medicine/_rag-api";
import { motion } from "framer-motion";

interface RecommendationResultCardProps {
  medicine: RAGMedicineInfo;
  onClick: () => void;
}

export default function RecommendationResultCard({
  medicine,
  onClick,
}: RecommendationResultCardProps) {
  // Parse images
  const images: string[] = Array.isArray(medicine.images)
    ? medicine.images
    : medicine.images
    ? [medicine.images as unknown as string]
    : medicine.medicineUrl
    ? [medicine.medicineUrl]
    : ["/pills.png"];

  const primaryImage = images[0] || "/pills.png";

  // Calculate prices
  const priceNum = medicine.price ? parseFloat(medicine.price) : 0;
  const discountPct = medicine.discount ? parseFloat(medicine.discount) : 0;
  const originalPrice =
    discountPct > 0 ? priceNum / (1 - discountPct / 100) : undefined;
  const inStock = (medicine.stock ?? 0) > 0;
  const finalPrice = discountPct > 0 ? priceNum : originalPrice || priceNum;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-primary/20 hover:border-primary/40"
        onClick={onClick}
      >
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6">
            {/* Image */}
            <div className="relative w-full sm:w-48 h-48 sm:h-48 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
              <Image
                src={primaryImage}
                alt={medicine.medicineName}
                fill
                className="object-contain p-2"
                sizes="(max-width: 640px) 100vw, 192px"
              />
              {medicine.ragScore && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {Math.round(medicine.ragScore * 100)}% Match
                  </Badge>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col gap-3 sm:gap-4">
              {/* Title and Category */}
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                  {medicine.medicineName}
                </h3>
                {medicine.drugCategory && (
                  <Badge variant="outline" className="text-xs">
                    {medicine.drugCategory}
                  </Badge>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {inStock ? (
                  <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                    In Stock
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600 text-sm font-medium">
                    <XCircle className="h-4 w-4" />
                    Out of Stock
                  </div>
                )}
                {medicine.prescriptionRequired && (
                  <Badge variant="outline" className="text-xs">
                    Prescription Required
                  </Badge>
                )}
              </div>

              {/* Description/Context */}
              {medicine.contextUsed && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {medicine.contextUsed}
                </p>
              )}

              {/* Price and Action */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mt-auto pt-2">
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                      PKR {finalPrice.toFixed(2)}
                    </span>
                    {discountPct > 0 && originalPrice && (
                      <>
                        <span className="text-sm sm:text-base md:text-lg text-muted-foreground line-through">
                          PKR {originalPrice.toFixed(2)}
                        </span>
                        <Badge className="bg-green-500 text-white text-xs">
                          {discountPct.toFixed(0)}% OFF
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full sm:w-auto flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
