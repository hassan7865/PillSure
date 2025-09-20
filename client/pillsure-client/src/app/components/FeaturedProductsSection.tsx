"use client";

import Image from "next/image";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Pill,
  Shield,
  Star,
  ShoppingCart,
  Heart,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { DealProduct } from "@/lib/types";



interface FeaturedProductsSectionProps {
  products: DealProduct[];
}

const FeaturedProductsSection: React.FC<FeaturedProductsSectionProps> = ({ products }) => {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Star className="h-4 w-4" />
            Featured Products
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Premium Medical Solutions
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our curated selection of high-quality medicines and healthcare products,
            all verified for authenticity and safety.
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {products.map((product, index) => (
            <Card
              key={index}
              className="relative rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 bg-white overflow-hidden group h-[500px] flex flex-col"
            >
              {/* Sale Badge */}
              {product.onSale && (
                <div className="absolute top-4 left-4 z-10">
                  <Badge className="bg-red-500 text-white px-3 py-1 text-xs font-semibold rounded-full">
                    <Star className="h-3 w-3 mr-1" />
                    Sale
                  </Badge>
                </div>
              )}

              {/* Verification Badge */}
              <div className="absolute top-4 right-4 z-10">
                <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Verified
                </div>
              </div>

              {/* Product Image Section */}
              <div className="relative bg-gray-50 p-6 h-48 flex items-center justify-center">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={160}
                  height={160}
                  className="object-contain max-h-40 group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              {/* Product Details */}
              <CardContent className="p-6 flex flex-col flex-grow h-full">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 text-blue-600 font-semibold text-lg">
                    <Pill className="h-4 w-4" />
                    {product.priceRange}
                  </div>
                </div>

                {/* Medical Features */}
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Key Benefits</h4>
                  <ul className="space-y-2">
                    {product.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-600">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Spacer to push buttons to bottom */}
                <div className="flex-grow"></div>

                {/* Action Buttons */}
                <div className="flex gap-2 mb-4">
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Button variant="outline" className="px-3 py-2 rounded-xl border-gray-300 hover:bg-gray-50">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>

                {/* Medical Disclaimer */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 leading-tight">
                      Consult healthcare provider before use
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProductsSection;
