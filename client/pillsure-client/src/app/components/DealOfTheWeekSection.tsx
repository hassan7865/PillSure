"use client";

import Image from "next/image";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface DealProduct {
  imageUrl: string;
  name: string;
  priceRange: string;
  features: string[];
  onSale?: boolean;
}

interface DealOfTheWeekSectionProps {
  products: DealProduct[];
}

const DealOfTheWeekSection: React.FC<DealOfTheWeekSectionProps> = ({ products }) => {
  const [timeLeft] = React.useState({
    days: 71,
    hours: 19,
    minutes: 59,
    seconds: 57,
  });

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Heading */}
        <h2 className="text-3xl font-bold text-blue-900 text-center mb-6">
          Deal Of The Week
        </h2>

        {/* Countdown Timer */}
        <div className="flex justify-center items-center gap-3 mb-12">
          {[
            { label: "Days", value: timeLeft.days },
            { label: "Hours", value: timeLeft.hours },
            { label: "Minutes", value: timeLeft.minutes },
            { label: "Seconds", value: timeLeft.seconds },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-blue-900 text-white font-bold text-lg px-5 py-3 rounded-lg shadow-sm"
            >
              {item.value}{" "}
              <span className="text-sm font-normal">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {products.map((product, index) => (
            <Card
              key={index}
              className="relative rounded-lg shadow-md overflow-hidden"
            >
              {product.onSale && (
                <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                  Sale
                </span>
              )}

              <div className="flex flex-row items-center h-full">
                {/* Product Image */}
                <div className="w-1/3 flex justify-center items-center bg-gray-100 h-full py-6">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    width={120}
                    height={120}
                    className="object-contain max-h-32"
                  />
                </div>

                {/* Product Details */}
                <CardContent className="w-2/3 flex flex-col items-start p-6">
                  <h3 className="text-xl font-bold text-blue-900 mb-2">
                    {product.name}
                  </h3>
                  <p className="text-blue-800 font-bold text-lg mb-4">
                    {product.priceRange}
                  </p>
                  <ul className="text-gray-600 text-sm mb-6 space-y-1">
                    {product.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center">
                        <svg
                          className="w-4 h-4 text-green-500 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="secondary"
                    className="rounded-full px-6 py-2"
                  >
                    Select options
                  </Button>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DealOfTheWeekSection;
