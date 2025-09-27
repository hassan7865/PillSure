"use client";

import { 
  Star,
  Quote,
  User,
  Stethoscope,
  Building2,
  Heart,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Users
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const TestimonialsSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const testimonials = [
    {
      name: "Dr. Sarah Johnson",
      role: "Cardiologist",
      hospital: "Mayo Clinic",
      content: "PillSure has revolutionized how I manage my patients. The platform's intuitive interface and comprehensive medicine database have made my practice more efficient and patient care more personalized.",
      rating: 5,
      avatar: "/d1.jpg"
    },
    {
      name: "Michael Chen",
      role: "Patient",
      hospital: "Regular User",
      content: "Finding the right doctor and managing my prescriptions has never been easier. The 24/7 support and secure platform give me peace of mind about my healthcare needs.",
      rating: 5,
      avatar: "/d2.jpg"
    },
    {
      name: "Dr. Emily Rodriguez",
      role: "Pediatrician",
      hospital: "Children's Hospital",
      content: "The hospital integration features are outstanding. I can seamlessly coordinate with other specialists and access patient records securely, improving the quality of care we provide.",
      rating: 5,
      avatar: "/d3.jpg"
    },
    {
      name: "Lisa Thompson",
      role: "Patient",
      hospital: "Regular User",
      content: "As a busy professional, PillSure has been a lifesaver. I can book appointments, refill prescriptions, and consult with doctors without disrupting my work schedule.",
      rating: 5,
      avatar: "/d4.jpg"
    },
    {
      name: "Dr. James Wilson",
      role: "Emergency Medicine",
      hospital: "City General Hospital",
      content: "The emergency response features and real-time communication tools have significantly improved our emergency department's efficiency and patient outcomes.",
      rating: 5,
      avatar: "/d5.jpg"
    },
    {
      name: "Maria Garcia",
      role: "Patient",
      hospital: "Regular User",
      content: "The multilingual support and cultural sensitivity of the platform made it easy for my family to access healthcare services. We feel heard and understood.",
      rating: 5,
      avatar: "/d6.jpg"
    }
  ];

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length]);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-b from-muted/30 to-background">
      {/* Background Elements */}
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </motion.div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-6 py-3 rounded-full text-sm font-medium mb-8 border border-primary/20 backdrop-blur-sm">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>Customer Reviews</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            <span className="block">What our</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
              customers say
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Real experiences from real people. Discover why thousands trust PillSure 
            for their healthcare needs.
          </p>
        </motion.div>

        {/* Testimonial Slider */}
        <div className="relative max-w-4xl mx-auto">
          {/* Main Testimonial */}
          <div className="relative overflow-hidden rounded-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -300 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20 shadow-2xl shadow-primary/5">
                  <CardContent className="p-12 md:p-16 text-center relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl" />
                    
                    <div className="relative z-10">
                      {/* Quote Icon */}
                      <motion.div 
                        className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Quote className="h-10 w-10 text-primary" />
                      </motion.div>

                      {/* Rating */}
                      <div className="flex items-center justify-center gap-1 mb-8">
                        {renderStars(testimonials[currentIndex].rating)}
                      </div>

                      {/* Content */}
                      <motion.blockquote 
                        className="text-2xl md:text-3xl text-foreground leading-relaxed mb-12 font-light"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                      >
                        "{testimonials[currentIndex].content}"
                      </motion.blockquote>

                      {/* Author */}
                      <motion.div 
                        className="flex flex-col items-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                      >
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                          {testimonials[currentIndex].role === "Patient" ? (
                            <Heart className="h-8 w-8 text-primary" />
                          ) : (
                            <Stethoscope className="h-8 w-8 text-primary" />
                          )}
                        </div>
                        <div className="text-xl font-semibold text-foreground mb-2">
                          {testimonials[currentIndex].name}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2">
                          <span>{testimonials[currentIndex].role}</span>
                          <span>•</span>
                          <span>{testimonials[currentIndex].hospital}</span>
                        </div>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <motion.button
              onClick={prevTestimonial}
              className="w-12 h-12 bg-primary/10 hover:bg-primary/20 rounded-full flex items-center justify-center transition-colors duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="h-5 w-5 text-primary" />
            </motion.button>

            {/* Dots Indicator */}
            <div className="flex items-center gap-2">
              {testimonials.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                    index === currentIndex ? 'bg-primary' : 'bg-primary/30'
                  }`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                />
              ))}
            </div>

            <motion.button
              onClick={nextTestimonial}
              className="w-12 h-12 bg-primary/10 hover:bg-primary/20 rounded-full flex items-center justify-center transition-colors duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="h-5 w-5 text-primary" />
            </motion.button>
          </div>

          {/* Auto-play Toggle */}
          <div className="flex items-center justify-center mt-6">
            <motion.button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
              whileHover={{ scale: 1.05 }}
            >
              {isAutoPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>{isAutoPlaying ? 'Pause' : 'Play'} Auto-slide</span>
            </motion.button>
          </div>
        </div>

        {/* Trust Indicators */}
        <motion.div 
          className="grid md:grid-cols-3 gap-8 mt-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {[
            { number: "4.9/5", label: "Average Rating", icon: Star },
            { number: "98%", label: "Customer Satisfaction", icon: Heart },
            { number: "50K+", label: "Happy Customers", icon: Users }
          ].map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={index}
                className="text-center"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconComponent className="h-8 w-8 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stat.number}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
