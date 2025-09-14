"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Instagram, Heart } from "lucide-react";

const InstagramFeed: React.FC = () => {
  const instagramImages = [
    "/d1.jpg",
    "/d2.jpg",
    "/d3.jpg",
    "/d4.jpg",
    "/d5.jpg",
    "/d6.jpg",
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-white to-slate-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Instagram className="h-4 w-4" />
            Social Media
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Follow us on Instagram
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Stay connected with our community and get the latest updates on healthcare trends
          </p>
          <div className="mt-4">
            <span className="text-blue-600 font-semibold text-lg">@pillSure_87</span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {instagramImages.map((src, index) => (
            <Card
              key={index}
              className="relative group overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200"
            >
              <div className="relative w-full h-48">
                <Image
                  src={src}
                  alt={`Instagram post ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InstagramFeed;
