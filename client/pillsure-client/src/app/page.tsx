"use client";
import Image from "next/image";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import ProductFilterAndCategories from "./components/ProductFilterAndCategories";
import FeaturedProductsSection from "./components/FeaturedProductsSection";
import SpecialOffersSection from "./components/SpecialOffersSection";
import ProductGridSection from "./components/ProductGridSection";
import ProductCard from "./components/ProductCard";
import MoreToLoveGrid from "./components/MoreToLoveGrid";
import InstagramFeed from "./components/InstagramFeed";
import Footer from "./components/Footer";

const dealOfTheWeekProducts = [
  {
    imageUrl: "/wf.png",
    name: "Vitamin C 500mg Sugarless",
    priceRange: "$16.00 - $35.00",
    features: [
      "Immune system support",
      "Antioxidant properties", 
      "Sugar-free formulation",
      "Pharmaceutical grade quality"
    ],
    onSale: true,
  },
  {
    imageUrl: "/wf2.png",
    name: "Insulin Lispro Kwikpen",
    priceRange: "$18.88 - $32.88",
    features: [
      "Rapid-acting insulin",
      "Pre-filled pen device",
      "Precise dosing mechanism",
      "FDA approved medication"
    ],
    onSale: false,
  },
];

const specialOffers = [
  {
    fromPrice: "From $0.99",
    title: "Breathable Face Mask",
    description: "Get it now 45% Off",
    imageUrl: "/sf.avif",
    imagePosition: "right",
    bgColor: "bg-gray-200",
    textColor: "text-blue-900",
    buttonColor: "bg-blue-900",
  },
  {
    fromPrice: "From $9.99",
    title: "Covid 19 pack",
    description: "Get it now 45% Off",
    imageUrl: "/sf2.jpg",
    imagePosition: "left",
    bgColor: "bg-blue-100",
    textColor: "text-blue-900",
    buttonColor: "bg-blue-900",
  },
];

const bestSellingProducts = [
  {
    imageUrl: "/Med.png",
    category: "Protein",
    name: "Nutren Diabetes Vanilla",
    currentPrice: 34.5,
  },
  {
    imageUrl: "/cos.png",
    category: "Herbs",
    name: "Henry Blooms One Night",
    originalPrice: 44.0,
    currentPrice: 39.0,
    onSale: true,
  },
  {
    imageUrl: "/pills.png",
    category: "Pets",
    name: "Spring Leaf Kids Fish Oil 750mg",
    currentPrice: 24.95,
  },
  {
    imageUrl: "/Bonas.webp",
    category: "Pets",
    name: "Nordic Naturals Arctic-D Cod",
    originalPrice: 42.95,
    currentPrice: 37.45,
    onSale: true,
  },
  {
    imageUrl: "/revi.png",
    category: "Beauty",
    name: "Nair Precision Facial Hair",
    currentPrice: 5.5,
    originalPrice: 4.4,
    onSale: true,
  },
];

const newProducts = [
  {
    imageUrl: "/p1.png",
    category: "Vitamins",
    name: "Buscopan Forte Tab 20mg X 10",
    currentPrice: 8.95,
  },
  {
    imageUrl: "/Med.png",
    category: "Protein",
    name: "Nutren Diabetes Vanilla",
    currentPrice: 34.5,
  },
  {
    imageUrl: "/p2.png",
    category: "Protein",
    name: "FatBlaster Keto-Fit Whey Protein",
    currentPrice: 25.95,
  },
  {
    imageUrl: "/p3.png",
    category: "Sports Nutrition",
    name: "Nature's Way Instant Natural",
    originalPrice: 18.5,
    currentPrice: 11.15,
    onSale: true,
  },
  {
    imageUrl: "/p9.png",
    category: "Sports Nutrition",
    name: "Musashi Intra Workout",
    currentPrice: 39.95,
  },
  {
    imageUrl: "/p4.png",
    category: "Vitamins",
    name: "Gastro Soothe Tab 10mg X 20",
    currentPrice: 5.95,
  },
  {
    imageUrl: "/p5.png",
    category: "Protein",
    name: "Tropeaka Lean Protein Salted",
    originalPrice: 41.95,
    currentPrice: 34.15,
    onSale: true,
  },
  {
    imageUrl: "/p6.png",
    category: "Supplements",
    name: "Protein Supplies Australia",
    originalPrice: 35.95,
    currentPrice: 24.18,
    onSale: true,
  },
  {
    imageUrl: "/p7.png",
    category: "Sports Nutrition",
    name: "Vital Protein Strawberry",
    originalPrice: 45.95,
    currentPrice: 40.01,
    onSale: true,
  },
  {
    imageUrl: "/p8.png",
    category: "Sports Nutrition",
    name: "Musashi 100% Whey Vanilla",
    originalPrice: 45.95,
    currentPrice: 40.15,
    onSale: true,
  },
];

const moreToLoveProducts = [
  {
    imageUrl: "/cos.png",
    name: "Henry Blooms One Night Collagen",
    originalPrice: 44.0,
    currentPrice: 39.0,
  },
  {
    imageUrl: "/m3.png",
    name: "Nair Precision Facial Hair Removal",
    originalPrice: 5.5,
    currentPrice: 4.4,
  },
  {
    imageUrl: "/p8.png",
    name: "Musashi 100% Whey Vanilla",
    originalPrice: 45.95,
    currentPrice: 40.15,
  },
  {
    imageUrl: "/m1.png",
    name: "Spring Leaf Kids Fish Oil 750mg",
    currentPrice: 24.95,
  },
  {
    imageUrl: "/m4.png",
    name: "Pain Away Forte + Arthritis Cream",
    originalPrice: 22.95,
    currentPrice: 20.95,
  },
  {
    imageUrl: "/m6.png",
    name: "Nature's Goodness Manuka Honey",
    currentPrice: 36.95,
  },
  {
    imageUrl: "/m2.png",
    name: "Nordic Naturals Arctic-D Cod Liver Oil",
    originalPrice: 42.95,
    currentPrice: 37.45,
  },
  {
    imageUrl: "/m5.png",
    name: "More like this Martin & Pleasance",
    currentPrice: 6.95,
  },
  {
    imageUrl: "/m7.png",
    name: "Nuzest Clean Lean Protein Smooth",
    originalPrice: 39.95,
    currentPrice: 30.15,
  },
];


export default function Home() {
  return (
    <div>
      <Navbar />
      <HeroSection />
      <ProductFilterAndCategories />
      <FeaturedProductsSection products={dealOfTheWeekProducts} />
      <SpecialOffersSection offers={specialOffers} />
      <ProductGridSection
        title="Best Selling Products"
        products={bestSellingProducts}
      />
      <ProductGridSection title="New Products" products={newProducts} />
      <MoreToLoveGrid products={moreToLoveProducts} />
      <InstagramFeed />
      <Footer />
    </div>
  );
}
