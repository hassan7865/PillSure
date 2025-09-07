"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Product {
  imageUrl: string;
  category?: string;
  name: string;
  originalPrice?: number;
  currentPrice: number;
  onSale?: boolean;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { imageUrl, category, name, originalPrice, currentPrice, onSale } =
    product;

  return (
    <Card className="relative shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden flex flex-col">
      {/* Sale Badge */}
      {onSale && (
        <Badge className="absolute top-3 left-3 bg-blue-800 text-white shadow-md">
          Sale
        </Badge>
      )}

      {/* Image Section */}
      <CardHeader className="flex justify-center items-center bg-gray-50 p-6 h-48">
        <Image
          src={imageUrl}
          alt={name}
          width={160}
          height={160}
          className="object-contain max-h-40"
        />
      </CardHeader>

      {/* Text Section */}
      <CardContent className="flex flex-col flex-grow p-4">
        {category && (
          <p className="text-gray-500 text-sm mb-1 capitalize">{category}</p>
        )}
        <h4 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
          {name}
        </h4>

        <div className="flex items-baseline mb-4">
          {originalPrice && (
            <span className="text-gray-400 line-through mr-2 text-sm">
              ${originalPrice.toFixed(2)}
            </span>
          )}
          <span className="text-blue-800 font-bold text-lg">
            ${currentPrice.toFixed(2)}
          </span>
        </div>

        {/* Add to Cart Button */}
        <Button
          variant="outline"
          className="w-full mt-auto flex items-center justify-center gap-2 rounded-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.769.746 1.769H17a2 2 0 002-2V4a2 2 0 00-2-2H5.4M7 13l-2.293 2.293"
            />
          </svg>
          Add to cart
        </Button>
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
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-blue-900 text-center mb-12">
          {title}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {products.map((product, index) => (
            <ProductCard key={index} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductGridSection;
