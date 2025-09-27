"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Heart,
  Brain,
  Baby,
  Shield,
  Eye,
  Bone,
  Zap,
  Droplets,
  ArrowRight,
  Pill
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const categories = [
  {
    id: 1,
    name: "Asthma & Respiratory",
    description: "Breathing support and lung health",
    icon: Heart,
    imageUrl: "/p1.png",
    productCount: "150+",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600"
  },
  {
    id: 2,
    name: "Face Care & Beauty",
    description: "Skincare and beauty products",
    icon: Eye,
    imageUrl: "/cos.png",
    productCount: "200+",
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-50",
    textColor: "text-pink-600"
  },
  {
    id: 3,
    name: "Mental Health",
    description: "Brain health and wellness",
    icon: Brain,
    imageUrl: "/p2.png",
    productCount: "80+",
    color: "from-purple-500 to-indigo-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-600"
  },
  {
    id: 4,
    name: "Kids Health",
    description: "Children's medicines and supplements",
    icon: Baby,
    imageUrl: "/pills.png",
    productCount: "120+",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
    textColor: "text-green-600"
  },
  {
    id: 5,
    name: "Immune System",
    description: "Boost your body's defenses",
    icon: Shield,
    imageUrl: "/wf.png",
    productCount: "90+",
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-50",
    textColor: "text-orange-600"
  },
  {
    id: 6,
    name: "Bone & Joint",
    description: "Strong bones and flexible joints",
    icon: Bone,
    imageUrl: "/p3.png",
    productCount: "110+",
    color: "from-gray-500 to-slate-500",
    bgColor: "bg-gray-50",
    textColor: "text-gray-600"
  },
  {
    id: 7,
    name: "Energy & Vitality",
    description: "Boost your energy levels",
    icon: Zap,
    imageUrl: "/p4.png",
    productCount: "75+",
    color: "from-yellow-500 to-amber-500",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-600"
  },
  {
    id: 8,
    name: "Digestive Health",
    description: "Gut health and digestion",
    icon: Droplets,
    imageUrl: "/p5.png",
    productCount: "95+",
    color: "from-teal-500 to-cyan-500",
    bgColor: "bg-teal-50",
    textColor: "text-teal-600"
  }
];

const MedicineCategoriesSection: React.FC = () => {
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
            <span>Medicine Categories</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            <span className="block">Shop by</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
              Health Category
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Find the right medicines and supplements for your specific health needs. 
            Browse our comprehensive categories to discover products tailored to your wellness journey.
          </p>
        </motion.div>

        {/* Categories Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {categories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden cursor-pointer">
                  <CardContent className="p-6">
                    {/* Category Header */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 ${category.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className={`h-6 w-6 ${category.textColor}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors duration-300">
                          {category.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {category.productCount} products
                        </p>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {category.description}
                    </p>

                    {/* Category Image */}
                    <div className="relative h-24 bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg overflow-hidden">
                      <Image
                        src={category.imageUrl}
                        alt={category.name}
                        fill
                        className="object-contain group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* View All Categories Button */}
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <Button
            size="lg" 
            variant="outline"
            className="px-8 py-3 text-base font-semibold rounded-xl border-primary/20 text-primary hover:bg-primary/5"
          >
            Explore All Categories
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default MedicineCategoriesSection;
