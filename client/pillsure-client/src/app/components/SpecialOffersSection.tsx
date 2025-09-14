"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight } from "lucide-react";
import React from "react";
import { SpecialOffer } from "@/lib/types";

interface SpecialOffersSectionProps {
  offers: SpecialOffer[];
}

const SpecialOffersSection: React.FC<SpecialOffersSectionProps> = ({ offers }) => {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Star className="h-4 w-4" />
            Special Offers
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Exclusive Healthcare Deals
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover limited-time offers on premium healthcare products and services
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {offers.map((offer, index) => (
            <div
              key={index}
              className="relative rounded-2xl shadow-lg hover:shadow-xl overflow-hidden h-80 group transition-all duration-300 border border-gray-200"
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <Image
                  src={offer.imageUrl}
                  alt={offer.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-all duration-300" />
              </div>

              {/* Content */}
              <div className="relative h-full flex flex-col justify-center p-8 z-10">
                <p className={`${offer.textColor} text-sm font-semibold mb-2`}>
                  {offer.fromPrice}
                </p>
                <h3
                  className={`${offer.textColor} text-2xl font-bold mb-3 leading-tight`}
                >
                  {offer.title}
                </h3>
                <p className={`${offer.textColor} text-base mb-6`}>
                  {offer.description}
                </p>

                <Button
                  className={`${offer.buttonColor} text-white rounded-xl flex items-center w-fit group/btn`}
                >
                  Shop now
                  <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpecialOffersSection;
