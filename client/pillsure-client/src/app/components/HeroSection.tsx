"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { 
  Stethoscope, 
  Pill, 
  Building2, 
  Search, 
  Heart, 
  Shield, 
  Clock,
  Users,
  Star,
  ArrowRight
} from "lucide-react";

const HeroSection: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-24 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Floating Icons */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-20 left-10 animate-bounce">
          <Pill className="h-8 w-8 text-blue-300" />
        </div>
        <div className="absolute top-32 right-20 animate-bounce" style={{ animationDelay: '0.5s' }}>
          <Heart className="h-6 w-6 text-green-300" />
        </div>
        <div className="absolute bottom-40 left-20 animate-bounce" style={{ animationDelay: '1s' }}>
          <Shield className="h-7 w-7 text-purple-300" />
        </div>
        <div className="absolute bottom-20 right-10 animate-bounce" style={{ animationDelay: '1.5s' }}>
          <Clock className="h-6 w-6 text-orange-300" />
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Left Content */}
          <div className="text-center lg:text-left lg:w-1/2">
                  <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                    <Heart className="h-4 w-4" />
                    Healthcare Excellence
                  </div>
                  <h1 className="text-5xl md:text-6xl font-bold text-blue-900 leading-tight mb-6">
                    Your Trusted
                    <span className="block text-blue-600">Healthcare Partner</span>
                  </h1>
                  <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                    Connect with doctors, find medicines, and access comprehensive healthcare solutions.
                    Making healthcare accessible, reliable, and convenient for everyone.
                  </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start items-center mb-16">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-10 py-5 text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 group"
              >
                <Stethoscope className="mr-3 h-6 w-6" />
                Find Doctors
                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-10 py-5 text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 group"
              >
                <Pill className="mr-3 h-6 w-6" />
                Browse Medicines
                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start mb-2">
                  <Users className="h-6 w-6 text-blue-600 mr-2" />
                  <div className="text-3xl font-bold text-blue-600">500+</div>
                </div>
                <div className="text-gray-600">Verified Doctors</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start mb-2">
                  <Pill className="h-6 w-6 text-blue-600 mr-2" />
                  <div className="text-3xl font-bold text-blue-600">10K+</div>
                </div>
                <div className="text-gray-600">Medicines Available</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start mb-2">
                  <Building2 className="h-6 w-6 text-blue-600 mr-2" />
                  <div className="text-3xl font-bold text-blue-600">50+</div>
                </div>
                <div className="text-gray-600">Partner Hospitals</div>
              </div>
            </div>
          </div>

          {/* Right Content - Animated Medicine Images */}
          <div className="relative lg:w-1/2 flex justify-center items-center">
            {/* Main Medicine Bottle */}
            <div className="relative">
              <Image
                src="/g11.png"
                alt="Medicine Bottle"
                width={200}
                height={200}
                className="w-48 md:w-56 transform hover:scale-110 transition-transform duration-500 z-10 animate-pulse"
              />
              
              {/* Floating Pills */}
              <div className="absolute -top-4 -right-4 animate-bounce">
                <Pill className="h-8 w-8 text-blue-500" />
              </div>
              <div className="absolute -bottom-2 -left-4 animate-bounce" style={{ animationDelay: '0.7s' }}>
                <Pill className="h-6 w-6 text-green-500" />
              </div>
              <div className="absolute top-1/2 -right-8 animate-bounce" style={{ animationDelay: '1.2s' }}>
                <Pill className="h-5 w-5 text-purple-500" />
              </div>
            </div>

            {/* Secondary Medicine Bottle */}
            <div className="relative ml-8">
              <Image
                src="/g12.png"
                alt="Medicine Bottle 2"
                width={180}
                height={180}
                className="w-40 md:w-48 transform hover:scale-110 transition-transform duration-500 z-10 animate-pulse"
                style={{ animationDelay: '0.5s' }}
              />
              
              {/* Floating Icons */}
              <div className="absolute -top-6 -left-6 animate-bounce">
                <Heart className="h-6 w-6 text-red-400" />
              </div>
              <div className="absolute -bottom-4 -right-6 animate-bounce" style={{ animationDelay: '0.9s' }}>
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
            </div>

            {/* Discount Badge */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-bold px-4 py-2 rounded-full z-20 animate-pulse shadow-lg">
              <div className="flex items-center">
                <Star className="h-4 w-4 mr-1" />
                SAVE 65% OFF
              </div>
            </div>

            {/* Search Icon Animation */}
            <div className="absolute top-1/4 right-1/4 animate-ping">
              <div className="bg-blue-100 rounded-full p-3">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
