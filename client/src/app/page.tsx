"use client";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturedProductsSection from "./components/FeaturedProductsSection";
import TopSellingSection from "./components/TopSellingSection";
import TestimonialsSection from "./components/TestimonialsSection";
import Footer from "./components/Footer";
import MedicineCategoriesSection from "./components/MedicineCategoriesSection";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturedProductsSection />
      <MedicineCategoriesSection />
      <TopSellingSection />
      <TestimonialsSection />
      <Footer />
    </div>
  );
}
