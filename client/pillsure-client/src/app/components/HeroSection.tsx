"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";

const HeroSection: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-br from-blue-100 to-blue-200 py-16 overflow-hidden">
      {/* Background SVG Wave */}
      <div className="absolute inset-0 z-0 opacity-30">
        <svg
          viewBox="0 0 1440 320"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute top-0 left-0 w-full h-full"
        >
          <path
            fill="#ffffff"
            fillOpacity="1"
            d="M0,192L48,170.7C96,149,192,107,288,112C384,117,480,171,576,192C672,213,768,203,864,186.7C960,171,1056,149,1152,138.7C1248,128,1344,128,1392,128L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
          ></path>
        </svg>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center justify-between">
        {/* Left Content */}
        <div className="text-center md:text-left md:w-1/3 mb-8 md:mb-0 md:ml-16 lg:ml-32">
          <p className="text-blue-700 text-base md:text-lg font-semibold mb-3 tracking-wide">Pyridoxine Vitamin B6</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 leading-tight mb-4 drop-shadow-sm">
            Vitamins & Supplements
          </h1>
          <p className="text-gray-700 mb-6 text-sm md:text-base max-w-xs md:max-w-md">Discover the best vitamins and supplements for your health. Shop our curated selection and enjoy exclusive discounts!</p>
          <Button className="bg-gradient-to-r from-blue-700 to-blue-500 text-white font-bold px-8 py-3 rounded-full shadow-xl hover:from-blue-800 hover:to-blue-600 transition duration-300 text-base md:text-lg tracking-wide">
            Buy it now
          </Button>
        </div>

        {/* Right Product Images */}
        <div className="relative md:w-1/2 flex justify-center items-center">
          <Image
            src="/g11.png"
            alt="Glass Bottle 1"
            width={256}
            height={256}
            className="w-48 md:w-64 transform rotate-6 hover:rotate-0 transition-transform duration-500 z-10"
          />

          {/* Discount Badge */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-full z-20">
            SAVE 65% OFF
          </div>

          <Image
            src="/g12.png"
            alt="Glass Bottle 2"
            width={256}
            height={256}
            className="w-48 md:w-64 transform -rotate-6 hover:rotate-0 transition-transform duration-500 ml-8 z-10"
          />
        </div>
      </div>

      {/* Slider Dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        <span className="h-2 w-2 bg-blue-800 rounded-full"></span>
        <span className="h-2 w-2 bg-blue-300 rounded-full"></span>
        <span className="h-2 w-2 bg-blue-300 rounded-full"></span>
      </div>
    </section>
  );
};

export default HeroSection;
