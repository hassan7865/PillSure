"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { ShoppingCart, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { RAGMedicineInfo } from "@/app/medicine/_rag-api";
import { motion } from "framer-motion";

interface RecommendationSuggestionCardProps {
  medicine: RAGMedicineInfo;
  onClick: () => void;
}

export default function RecommendationSuggestionCard({
  medicine,
  onClick,
}: RecommendationSuggestionCardProps) {
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className="cursor-pointer hover:shadow-md transition-all duration-300 h-full"
        onClick={onClick}
      >
        <CardContent className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 h-full">
          {/* Image */}
          <div className="relative w-full h-40 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
            <Image
              src={primaryImage}
              alt={medicine.medicineName}
              fill
              className="object-contain p-2"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
            {medicine.ragScore && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-primary text-primary-foreground flex items-center gap-1 text-xs">
                  <Sparkles className="h-2.5 w-2.5" />
                  {Math.round(medicine.ragScore * 100)}%
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col gap-2">
            {/* Title */}
            <h4 className="text-base font-semibold text-foreground line-clamp-2">
              {medicine.medicineName}
            </h4>

            {/* Category and Stock */}
            <div className="flex items-center gap-2 flex-wrap">
              {medicine.drugCategory && (
                <Badge variant="outline" className="text-xs">
                  {medicine.drugCategory}
                </Badge>
              )}
              {inStock ? (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <CheckCircle className="h-3 w-3" />
                  In Stock
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                  <XCircle className="h-3 w-3" />
                  Out
                </div>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center gap-2 mt-auto pt-2">
              <span className="text-lg font-bold text-foreground">
                PKR {finalPrice.toFixed(2)}
              </span>
              {discountPct > 0 && originalPrice && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    PKR {originalPrice.toFixed(2)}
                  </span>
                  <Badge className="bg-green-500 text-white text-xs">
                    {discountPct.toFixed(0)}% OFF
                  </Badge>
                </>
              )}
            </div>

            {/* Action Button */}
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <ShoppingCart className="h-3 w-3 mr-2" />
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
