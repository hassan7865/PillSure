"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ShoppingCart, Stethoscope } from "lucide-react";
import { RAGMedicineInfo } from "@/app/medicine/_rag-api";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { buildConsultDoctorUrl } from "@/lib/consult-doctor-url";
import { normalizeMedicineImages } from "@/lib/medicine-display";
import {
  MedicinePrescriptionBadge,
  RagMatchBadge,
  medicineCatalogCardClassName,
} from "@/components/medicine/medicine-catalog-parts";

interface RecommendationResultCardProps {
  medicine: RAGMedicineInfo;
  onClick: () => void;
}

export default function RecommendationResultCard({
  medicine,
  onClick,
}: RecommendationResultCardProps) {
  const router = useRouter();

  const images = normalizeMedicineImages(medicine);
  const primaryImage = images[0] || "/pills.png";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={medicineCatalogCardClassName} onClick={onClick}>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 md:gap-6">
            <div className="relative flex h-48 w-full flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted sm:h-48 sm:w-48">
              <Image
                src={primaryImage}
                alt={medicine.medicineName}
                fill
                className="object-contain p-2"
                sizes="(max-width: 640px) 100vw, 192px"
              />
              {medicine.ragScore != null && medicine.ragScore > 0 && (
                <RagMatchBadge score={medicine.ragScore} />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
              <div>
                <h3 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">
                  {medicine.medicineName}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {medicine.prescriptionRequired && <MedicinePrescriptionBadge />}
              </div>

              {medicine.contextUsed && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{medicine.contextUsed}</p>
              )}

              <div className="mt-auto flex flex-col justify-between gap-3 pt-2 sm:flex-row sm:items-center sm:gap-4">
                <p className="text-sm text-muted-foreground">
                  Pricing and availability are set by pharmacy listings.
                </p>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  {medicine.prescriptionRequired && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full flex-shrink-0 sm:w-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(buildConsultDoctorUrl());
                      }}
                    >
                      <Stethoscope className="mr-2 h-4 w-4" />
                      Consult a doctor
                    </Button>
                  )}
                  <Button
                    size="lg"
                    className="w-full flex-shrink-0 sm:w-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick();
                    }}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
