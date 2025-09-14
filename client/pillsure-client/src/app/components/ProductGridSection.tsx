"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Heart, 
  Star, 
  Shield, 
  Pill,
  Eye,
  AlertCircle
} from "lucide-react";
import { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { imageUrl, category, name, originalPrice, currentPrice, onSale } =
    product;

  return (
    <Card className="relative shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden flex flex-col bg-white border border-gray-200 group h-[500px]">
      {/* Sale Badge */}
      {onSale && (
        <div className="absolute top-3 left-3 z-10">
          <Badge className="bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded-full">
            <Star className="h-3 w-3 mr-1" />
            Sale
          </Badge>
        </div>
      )}

      {/* Verification Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Verified
        </div>
      </div>

      {/* Image Section */}
      <CardHeader className="relative bg-gray-50 p-6 h-56 flex justify-center items-center group-hover:bg-gray-100 transition-all duration-300">
        <Image
          src={imageUrl}
          alt={name}
          width={140}
          height={140}
          className="object-contain max-h-40 group-hover:scale-105 transition-transform duration-300"
        />
      </CardHeader>

      {/* Text Section */}
      <CardContent className="flex flex-col flex-grow p-5 h-full">
        {category && (
          <div className="flex items-center gap-2 mb-2">
            <Pill className="h-3 w-3 text-blue-500" />
            <p className="text-blue-600 text-xs font-medium uppercase tracking-wide">{category}</p>
          </div>
        )}
        <h4 className="text-base font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300 min-h-[2.5rem]">
          {name}
        </h4>

        <div className="flex items-baseline justify-between mb-4">
          <div className="flex items-baseline gap-2">
            {originalPrice && (
              <span className="text-gray-400 line-through text-sm">
                ${originalPrice.toFixed(2)}
              </span>
            )}
            <span className="text-blue-600 font-bold text-lg">
              ${currentPrice?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="text-xs text-red-500 font-semibold bg-red-50 px-2 py-1 rounded-full min-h-[1.5rem] flex items-center">
            {onSale ? `Save $${((originalPrice || 0) - (currentPrice || 0)).toFixed(2)}` : ''}
          </div>
        </div>

        {/* Spacer to push buttons to bottom */}
        <div className="flex-grow"></div>

        {/* Action Buttons - Always at bottom */}
        <div className="flex gap-2 mb-3">
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-2 rounded-xl border-gray-300 hover:bg-gray-50"
          >
            <Heart className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-2 rounded-xl border-gray-300 hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        {/* Medical Disclaimer */}
        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-1">
            <AlertCircle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 leading-tight">
              Consult healthcare provider
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ----------------------------
// ProductGridSection
// ----------------------------

interface ProductGridSectionProps {
  title: string;
  products: Product[];
}

const ProductGridSection: React.FC<ProductGridSectionProps> = ({
  title,
  products,
}) => {
  return (
    <section className="py-24 bg-gradient-to-br from-white to-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Pill className="h-4 w-4" />
            Products
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Carefully selected medical products with verified quality and competitive pricing
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map((product, index) => (
            <ProductCard key={index} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductGridSection;
