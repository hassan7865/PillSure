"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";

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
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Title */}
        <h2 className="text-3xl font-bold text-blue-900 text-center mb-12">
          Follow us on Instagram{" "}
          <span className="text-blue-500">@pillSure_87</span>
        </h2>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {instagramImages.map((src, index) => (
            <Card
              key={index}
              className="relative group overflow-hidden rounded-xl shadow-md"
            >
              <div className="relative w-full h-64">
                <Image
                  src={src}
                  alt={`Instagram post ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InstagramFeed;
