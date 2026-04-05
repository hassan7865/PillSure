"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { RAGMedicineInfo } from "@/app/medicine/_rag-api";
import { motion } from "framer-motion";
import { normalizeMedicineImages } from "@/lib/medicine-display";
import {
  MedicinePrescriptionBadge,
  RagMatchBadge,
  medicineCatalogCardClassName,
} from "@/components/medicine/medicine-catalog-parts";
import { cn } from "@/lib/utils";

interface RecommendationSuggestionCardProps {
  medicine: RAGMedicineInfo;
  onClick: () => void;
}

export default function RecommendationSuggestionCard({
  medicine,
  onClick,
}: RecommendationSuggestionCardProps) {
  const images = normalizeMedicineImages(medicine);
  const primaryImage = images[0] || "/pills.png";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(medicineCatalogCardClassName, "h-full")} onClick={onClick}>
        <CardContent className="flex h-full flex-col gap-2 p-3 sm:gap-3 sm:p-4">
          <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-muted">
            <Image
              src={primaryImage}
              alt={medicine.medicineName}
              fill
              className="object-contain p-2"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
            {medicine.ragScore != null && medicine.ragScore > 0 && (
              <RagMatchBadge score={medicine.ragScore} compact />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h4 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
              {medicine.medicineName}
            </h4>

            <div className="flex flex-wrap items-center gap-2">
              {medicine.prescriptionRequired && <MedicinePrescriptionBadge />}
            </div>

            <p className="mt-auto pt-2 text-xs text-muted-foreground">
              Pricing and availability are set by pharmacy listings.
            </p>

            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <ShoppingCart className="mr-2 h-3.5 w-3.5" />
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
