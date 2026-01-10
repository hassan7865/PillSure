"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Heart,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Package,
  Tag,
  Info,
  BookOpen,
  Pill,
  Shield,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Loader from "@/components/ui/loader";
import EmptyState from "@/components/ui/empty-state";
import PublicLayout from "@/layout/PublicLayout";
import { medicineApi, Medicine } from "@/app/medicine/_api";
import { motion } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function MedicineProductPage() {
  const params = useParams();
  const router = useRouter();
  const medicineId = params.id ? parseInt(params.id as string, 10) : null;
  
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});

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

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader
            title="Loading Product"
            description="Fetching medicine information..."
          />
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

  // Parse images
  const images: string[] = Array.isArray(medicine.images) 
    ? medicine.images 
    : medicine.images 
      ? [medicine.images as unknown as string]
      : medicine.medicineUrl 
        ? [medicine.medicineUrl]
        : ["/pills.png"];

  const primaryImage = images[selectedImageIndex] || images[0] || "/pills.png";

  // Calculate prices
  const priceNum = medicine.price ? parseFloat(medicine.price) : 0;
  const discountPct = medicine.discount ? parseFloat(medicine.discount) : 0;
  const originalPrice = discountPct > 0 ? priceNum / (1 - discountPct / 100) : undefined;
  const inStock = (medicine.stock ?? 0) > 0;

  // Parse and group description (JSONB field)
  const description = medicine.description;
  let rawSections: Array<{ title: string; content: string | any }> = [];
  
  if (description) {
    if (Array.isArray(description)) {
      rawSections = description;
    } else if (typeof description === 'object') {
      rawSections = [description];
    } else if (typeof description === 'string') {
      try {
        const parsed = JSON.parse(description);
        rawSections = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        rawSections = [{ title: "Description", content: description }];
      }
    }
  }

  // Group sections by title
  const groupedSections = rawSections.reduce((acc, section) => {
    const title = section.title?.trim().toUpperCase() || "OTHER";
    if (!acc[title]) {
      acc[title] = [];
    }
    acc[title].push(section);
    return acc;
  }, {} as Record<string, Array<{ title: string; content: string | any }>>);

  // Get icon for section title
  const getSectionIcon = (title: string) => {
    const upperTitle = title.toUpperCase();
    if (upperTitle.includes("INTRODUCTION") || upperTitle.includes("ABOUT")) {
      return <Info className="h-5 w-5 text-primary" />;
    } else if (upperTitle.includes("USES") || upperTitle.includes("USE")) {
      return <Pill className="h-5 w-5 text-primary" />;
    } else if (upperTitle.includes("SIDE EFFECT") || upperTitle.includes("EFFECT")) {
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    } else if (upperTitle.includes("DIRECTION") || upperTitle.includes("HOW TO")) {
      return <FileText className="h-5 w-5 text-primary" />;
    } else if (upperTitle.includes("PRECAUTION") || upperTitle.includes("WARNING")) {
      return <Shield className="h-5 w-5 text-amber-600" />;
    } else if (upperTitle.includes("INTERACTION")) {
      return <AlertCircle className="h-5 w-5 text-amber-600" />;
    } else if (upperTitle.includes("SYNOPSIS") || upperTitle.includes("SUMMARY")) {
      return <BookOpen className="h-5 w-5 text-primary" />;
    } else if (upperTitle.includes("FAQ") || upperTitle.includes("QUESTION")) {
      return <HelpCircle className="h-5 w-5 text-primary" />;
    } else if (upperTitle.includes("MORE INFORMATION") || upperTitle.includes("INFORMATION")) {
      return <Info className="h-5 w-5 text-muted-foreground" />;
    } else if (upperTitle.includes("HOW IT WORKS") || upperTitle.includes("WORK")) {
      return <Tag className="h-5 w-5 text-primary" />;
    }
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  // Check if section is FAQ
  const isFaqSection = (title: string) => {
    return title.toUpperCase().includes("FAQ") || title.toUpperCase().includes("QUESTION");
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Image Gallery */}
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
              {discountPct > 0 && (
                <div className="absolute top-4 right-4 bg-destructive text-white text-sm font-semibold px-3 py-1 rounded-md">
                  -{Math.round(discountPct)}%
                </div>
              )}
            </motion.div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, index) => (
                  <button
                    key={index}
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

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {medicine.drugCategory && (
                  <Badge variant="secondary" className="text-xs">
                    {medicine.drugCategory}
                  </Badge>
                )}
                {medicine.prescriptionRequired && (
                  <Badge variant="destructive" className="text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Prescription Required
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-2">{medicine.medicineName}</h1>
              {medicine.drugVarient && (
                <p className="text-muted-foreground text-sm mb-4">{medicine.drugVarient}</p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              {originalPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  PKR {originalPrice.toFixed(2)}
                </span>
              )}
              <span className="text-4xl font-bold text-primary">
                PKR {priceNum.toFixed(2)}
              </span>
              {discountPct > 0 && (
                <Badge variant="secondary" className="text-sm">
                  Save {discountPct.toFixed(0)}%
                </Badge>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {inStock ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 font-medium">In Stock</span>
                  {medicine.stock && (
                    <span className="text-sm text-muted-foreground">
                      ({medicine.stock} available)
                    </span>
                  )}
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="text-destructive font-medium">Out of Stock</span>
                </>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1"
                disabled={!inStock}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {medicine.prescriptionRequired ? "Consult Doctor" : "Add to Cart"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-4"
              >
                <Heart className="h-5 w-5" />
              </Button>
            </div>

            {/* Additional Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium">{medicine.drugCategory || "N/A"}</span>
                </div>
                {medicine.drugVarient && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Variant:</span>
                    <span className="font-medium">{medicine.drugVarient}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prescription:</span>
                  <span className="font-medium">
                    {medicine.prescriptionRequired ? "Required" : "Not Required"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Description Section */}
        {Object.keys(groupedSections).length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Package className="h-6 w-6" />
                Product Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(groupedSections).map(([title, sections], groupIndex) => {
                  const isFaq = isFaqSection(title);
                  
                  return (
                    <div key={groupIndex} className="space-y-4">
                      {/* Section Title with Icon */}
                      <div className="flex items-center gap-3 pb-2 border-b">
                        {getSectionIcon(title)}
                        <h3 className="text-xl font-semibold text-foreground">
                          {title}
                        </h3>
                      </div>

                      {/* Grouped Content */}
                      <div className="space-y-4 pl-8">
                        {sections.map((section, sectionIndex) => {
                          const content = section.content;
                          
                          // Handle FAQ content
                          if (isFaq && Array.isArray(content)) {
                            return (
                              <div key={sectionIndex} className="space-y-2">
                                {content.map((faq: any, faqIndex: number) => {
                                  const faqId = `${groupIndex}-${sectionIndex}-${faqIndex}`;
                                  const isOpen = openFaqs[faqId] || false;
                                  
                                  return (
                                    <Collapsible
                                      key={faqIndex}
                                      open={isOpen}
                                      onOpenChange={(open) => {
                                        setOpenFaqs(prev => ({
                                          ...prev,
                                          [faqId]: open
                                        }));
                                      }}
                                    >
                                      <CollapsibleTrigger className="w-full text-left">
                                        <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                          <div className="flex items-start gap-3 flex-1">
                                            <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                            <p className="font-medium text-foreground pr-4">
                                              {faq.question || "Question"}
                                            </p>
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
                            );
                          }
                          
                          // Handle regular content
                          return (
                            <div key={sectionIndex} className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                              {typeof content === 'string' 
                                ? content 
                                : Array.isArray(content)
                                  ? content.map((item: any, idx: number) => (
                                      <div key={idx} className="mb-3">
                                        {item.question && (
                                          <p className="font-medium text-foreground mb-1">
                                            Q: {item.question}
                                          </p>
                                        )}
                                        {item.answer && (
                                          <p className="ml-4 text-muted-foreground">A: {item.answer}</p>
                                        )}
                                      </div>
                                    ))
                                  : JSON.stringify(content, null, 2)
                              }
                            </div>
                          );
                        })}
                      </div>

                      {groupIndex < Object.keys(groupedSections).length - 1 && (
                        <Separator className="my-6" />
                      )}
                    </div>
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

