"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

interface Product {
  imageUrl: string;
  name: string;
  originalPrice?: number;
  currentPrice: number;
}

interface MoreToLoveGridProps {
  products: Product[];
}

const MoreToLoveGrid: React.FC<MoreToLoveGridProps> = ({ products }) => {
  return (
    <section className="py-14 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Title */}
        <h2 className="text-3xl font-bold text-blue-900 text-center mb-12">
          More to love
        </h2>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, index) => (
            <Card
              key={index}
              className="rounded-xl shadow-md hover:shadow-lg transition"
            >
              <CardContent className="flex items-center p-5">
                {/* Image box with fixed size */}
                <div className="bg-gray-100 p-2 rounded-md mr-4 flex-shrink-0 w-24 h-24 flex items-center justify-center">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Details */}
                <div className="ml-4">
                  <h4 className="text-blue-900 font-medium text-base mb-1 line-clamp-2">
                    {product.name}
                  </h4>

                  <div className="flex items-baseline space-x-2">
                    {product.originalPrice && (
                      <span className="text-gray-400 line-through text-sm">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-blue-900 font-bold text-lg">
                      ${product.currentPrice.toFixed(2)}
                    </span>
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

export default MoreToLoveGrid;
