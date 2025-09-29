"use client";

import { 
  Star,
  Quote,
  Stethoscope,
  Heart,
  ChevronLeft,
  ChevronRight,
  Users,
  Award
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const TestimonialsSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection] = useState(0);

  const testimonials = [
    {
      name: "Dr. Sarah Johnson",
      role: "Cardiologist",
      hospital: "Mayo Clinic",
      content: "PillSure has revolutionized how I manage my patients. The platform's intuitive interface and comprehensive medicine database have made my practice more efficient.",
      rating: 5,
      type: "doctor"
    },
    {
      name: "Michael Chen",
      role: "Patient",
      hospital: "Regular User",
      content: "Finding the right doctor and managing my prescriptions has never been easier. The 24/7 support gives me peace of mind about my healthcare needs.",
      rating: 5,
      type: "patient"
    },
    {
      name: "Dr. Emily Rodriguez",
      role: "Pediatrician",
      hospital: "Children's Hospital",
      content: "The hospital integration features are outstanding. I can seamlessly coordinate with other specialists and access patient records securely.",
      rating: 5,
      type: "doctor"
    },
    {
      name: "Lisa Thompson",
      role: "Patient",
      hospital: "Regular User",
      content: "As a busy professional, PillSure has been a lifesaver. I can book appointments, refill prescriptions, and consult with doctors seamlessly.",
      rating: 5,
      type: "patient"
    },
    {
      name: "Dr. James Wilson",
      role: "Emergency Medicine",
      hospital: "City General Hospital",
      content: "The emergency response features and real-time communication tools have significantly improved our department's efficiency and patient outcomes.",
      rating: 5,
      type: "doctor"
    },
    {
      name: "Maria Garcia",
      role: "Patient",
      hospital: "Regular User",
      content: "The multilingual support and cultural sensitivity of the platform made it easy for my family to access healthcare services. We feel heard.",
      rating: 5,
      type: "patient"
    }
  ];

  // Auto-play functionality with proper looping
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length]);

  const nextSlide = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-amber-400 fill-amber-400" : "text-gray-300"
        }`}
      />
    ));
  };

  // Get 3 visible testimonials with proper wrapping
  const getVisibleTestimonials = () => {
    const visible = [];
    for (let i = 0; i < 3; i++) {
      const index = (currentIndex + i) % testimonials.length;
      visible.push({ ...testimonials[index], key: `${currentIndex}-${i}` });
    }
    return visible;
  };

  const visibleTestimonials = getVisibleTestimonials();

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Section Header */}
        <motion.div 
          className="max-w-3xl mx-auto text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400 mb-3">
            <Quote className="h-5 w-5" />
            <span className="font-semibold uppercase tracking-wider">Customer Testimonials</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Trusted by Healthcare Professionals & Patients Worldwide
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
            Real experiences from doctors and patients who trust our platform 
            for their healthcare needs.
          </p>
        </motion.div>

        {/* Testimonials Slider */}
        <div className="relative mb-12">
          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-12 h-12 bg-white dark:bg-slate-800 shadow-lg rounded-full flex items-center justify-center hover:bg-purple-50 dark:hover:bg-slate-700 transition-all duration-300 hover:scale-110 border border-slate-200 dark:border-slate-700"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-6 w-6 text-slate-700 dark:text-slate-300" />
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-12 h-12 bg-white dark:bg-slate-800 shadow-lg rounded-full flex items-center justify-center hover:bg-purple-50 dark:hover:bg-slate-700 transition-all duration-300 hover:scale-110 border border-slate-200 dark:border-slate-700"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-6 w-6 text-slate-700 dark:text-slate-300" />
          </button>

          {/* Testimonials Grid */}
          <div className="overflow-hidden px-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentIndex}
                className="grid md:grid-cols-3 gap-6"
                initial={{ opacity: 0, x: direction * 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -100 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                {visibleTestimonials.map((testimonial, idx) => (
                  <Card 
                    key={testimonial.key}
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-xl transition-all duration-300 group"
                  >
                    <CardContent className="p-8 h-full flex flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1">
                          {renderStars(testimonial.rating)}
                        </div>
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                          {testimonial.type === "doctor" ? (
                            <Stethoscope className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <Heart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          )}
                        </div>
                      </div>

                      {/* Quote */}
                      <blockquote className="text-slate-700 dark:text-slate-300 leading-relaxed mb-6 flex-grow text-base">
                        "{testimonial.content}"
                      </blockquote>

                      {/* Author */}
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                        <div className="font-bold text-slate-900 dark:text-white mb-1">
                          {testimonial.name}
                        </div>
                        <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                          {testimonial.role}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {testimonial.hospital}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="flex items-center justify-center gap-2 mb-16">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'w-8 bg-purple-600 dark:bg-purple-500' 
                  : 'w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>

        {/* Trust Statistics */}
        <motion.div 
          className="grid md:grid-cols-3 gap-8 pt-16 border-t border-slate-200 dark:border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {[
            { 
              number: "4.9", 
              suffix: "/5", 
              label: "Average Rating", 
              icon: Star,
              description: "Based on 10,000+ reviews"
            },
            { 
              number: "98", 
              suffix: "%", 
              label: "Customer Satisfaction", 
              icon: Award,
              description: "Consistently high ratings"
            },
            { 
              number: "50K", 
              suffix: "+", 
              label: "Happy Customers", 
              icon: Users,
              description: "Across 25+ countries"
            }
          ].map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div 
                key={index} 
                className="text-center group"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <IconComponent className="h-10 w-10 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                  {stat.number}<span className="text-purple-600 dark:text-purple-400">{stat.suffix}</span>
                </div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-lg">{stat.label}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{stat.description}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;