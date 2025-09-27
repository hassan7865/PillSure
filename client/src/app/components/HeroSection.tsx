"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  Stethoscope, 
  Pill, 
  Building2, 
  ArrowRight,
  CheckCircle,
  Users,
  Shield,
  Clock,
  Play,
  Sparkles
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

const HeroSection: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Animated Background Elements */}
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      </motion.div>

      {/* Floating Pill Particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-6 bg-primary/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -40, 0],
            rotate: [0, 180, 360],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}

      <motion.div 
        className="container mx-auto px-4 relative z-10"
        style={{ y }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Badge */}
              <motion.div 
                className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8 border border-primary/20 backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Pill className="w-4 h-4" />
                <span>Trusted Healthcare Platform</span>
              </motion.div>

              {/* Main Headline */}
              <motion.h1 
                className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <span className="block text-foreground mb-2">Your Health,</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-primary">
                  Our Priority
                </span>
                <span className="block text-foreground mt-2">PillSure</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p 
                className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                Discover premium medicines, connect with trusted doctors, and manage your health 
                with our comprehensive healthcare ecosystem designed for modern living.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-6 mb-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            size="lg" 
                            className="px-8 py-4 text-lg font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl"
                          >
                            <span className="flex items-center gap-2">
                              Shop Medicines
                              <ArrowRight className="h-5 w-5" />
                            </span>
                          </Button>
                        </motion.div>
                        
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            size="lg" 
                            variant="outline" 
                            className="px-8 py-4 text-lg font-semibold rounded-xl border-primary/20 text-primary hover:bg-primary/5 backdrop-blur-sm"
                          >
                            <span className="flex items-center gap-2">
                              <Play className="h-5 w-5" />
                              Find Doctors
                            </span>
                          </Button>
                        </motion.div>
              </motion.div>

              {/* Trust Badges */}
              <motion.div 
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1 }}
              >
                {[
                  { text: "FDA Approved", icon: Shield },
                  { text: "HIPAA Compliant", icon: CheckCircle },
                  { text: "24/7 Support", icon: Clock }
                ].map((badge, index) => {
                  const IconComponent = badge.icon;
                  return (
                    <motion.div 
                      key={index}
                      className="flex items-center gap-2 bg-primary/5 backdrop-blur-sm rounded-full px-4 py-2 border border-primary/10"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <IconComponent className="h-4 w-4 text-primary" />
                      <span className="text-sm text-foreground">{badge.text}</span>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>

            {/* Right Content - Animated Pill Showcase */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {/* Main Pill Container */}
              <motion.div
                className="relative bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-xl rounded-3xl p-8 border border-primary/20 shadow-2xl"
                whileHover={{ scale: 1.02, rotateY: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {/* Floating Pills */}
                <motion.div
                  className="absolute -top-4 -right-4 w-16 h-8 rounded-full overflow-hidden"
                  animate={{ 
                    y: [0, -20, 0],
                    rotate: [0, 10, 0]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-r from-white to-primary/60 rounded-full" />
                </motion.div>
                <motion.div
                  className="absolute -bottom-4 -left-4 w-12 h-6 rounded-full overflow-hidden"
                  animate={{ 
                    y: [0, 15, 0],
                    rotate: [0, -15, 0]
                  }}
                  transition={{ 
                    duration: 2.5, 
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-r from-white to-primary/60 rounded-full" />
                </motion.div>

                {/* Main Pill Display */}
                <div className="text-center">
                  <motion.div
                    className="w-32 h-16 rounded-full mx-auto mb-8 relative overflow-hidden"
                    animate={{ 
                      scale: [1, 1.05, 1],
                      boxShadow: [
                        "0 0 20px rgba(139, 92, 246, 0.3)",
                        "0 0 40px rgba(139, 92, 246, 0.5)",
                        "0 0 20px rgba(139, 92, 246, 0.3)"
                      ]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <div className="w-full h-full bg-gradient-to-r from-white to-primary rounded-full" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                  </motion.div>

                  <h3 className="text-2xl font-bold text-foreground mb-4">Premium Medicines</h3>
                  <p className="text-muted-foreground mb-8">
                    High-quality pharmaceuticals delivered to your doorstep
                  </p>

                  {/* Feature Pills */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { name: "Vitamins", color: "green-500" },
                      { name: "Pain Relief", color: "red-500" },
                      { name: "Supplements", color: "blue-500" }
                    ].map((pill, index) => (
                      <motion.div
                        key={index}
                        className="bg-muted/20 rounded-full p-3 text-center"
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="w-8 h-4 rounded-full mx-auto mb-2 overflow-hidden">
                          <div className={`w-full h-full bg-gradient-to-r from-white to-${pill.color} rounded-full`} />
                        </div>
                        <span className="text-xs text-foreground font-medium">{pill.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Floating Elements */}
              <motion.div
                className="absolute -top-4 -right-4 bg-primary/10 backdrop-blur-xl rounded-2xl p-4 border border-primary/20"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-foreground">In Stock</span>
                </div>
              </motion.div>

              <motion.div
                className="absolute -bottom-4 -left-4 bg-primary/10 backdrop-blur-xl rounded-2xl p-4 border border-primary/20"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              >
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" />
                  <span className="text-xs text-foreground">10K+ Products</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-primary/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-primary/50 rounded-full mt-2" />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
