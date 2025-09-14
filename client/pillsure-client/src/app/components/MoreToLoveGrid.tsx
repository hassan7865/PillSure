"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Eye, Star } from "lucide-react";
import { Product } from "@/lib/types";

interface MoreToLoveGridProps {
  products: Product[];
}

const MoreToLoveGrid: React.FC<MoreToLoveGridProps> = ({ products }) => {
  return (
    <section className="py-24 bg-gradient-to-br from-white to-slate-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            More to Love
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover additional healthcare products that complement your wellness journey
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <Card
              key={index}
              className="relative rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 bg-white group overflow-hidden h-[420px] flex flex-col"
            >
              {/* Image Section */}
              <div className="relative bg-gray-50 p-6 h-56 flex items-center justify-center group-hover:bg-gray-100 transition-all duration-300">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={120}
                  height={120}
                  className="object-contain max-h-32 group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Quick Actions */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full bg-white/90 hover:bg-white">
                      <Heart className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full bg-white/90 hover:bg-white">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <CardContent className="p-5 flex flex-col flex-grow h-full">
                <h4 className="text-base font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300 min-h-[2.5rem]">
                  {product.name}
                </h4>

                <div className="flex items-baseline justify-between mb-4">
                  <div className="flex items-baseline gap-2">
                    {product.originalPrice && (
                      <span className="text-gray-400 line-through text-sm">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-blue-600 font-bold text-lg">
                      ${product.currentPrice?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="text-xs text-red-500 font-semibold bg-red-50 px-2 py-1 rounded-full min-h-[1.5rem] flex items-center">
                    {product.originalPrice ? `Save $${(product.originalPrice - (product.currentPrice || 0)).toFixed(2)}` : ''}
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">(4.5)</span>
                </div>

                {/* Spacer to push button to bottom */}
                <div className="flex-grow"></div>

                {/* Action Button - Always at bottom */}
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MoreToLoveGrid;
