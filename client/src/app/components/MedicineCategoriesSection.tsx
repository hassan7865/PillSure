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
  Activity
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const categories = [
  {
    id: 1,
    name: "Respiratory Care",
    subtitle: "Asthma & Breathing",
    description: "INHALERS & NEBULIZERS",
    icon: Heart,
    imageUrl: "/p1.png",
    productCount: "150+",
    bgColor: "bg-primary/5",
    accentColor: "text-primary"
  },
  {
    id: 2,
    name: "Beauty & Skincare",
    subtitle: "Face Care & Cosmetics",
    description: "PREMIUM SKINCARE",
    icon: Eye,
    imageUrl: "/cos.png",
    productCount: "200+",
    bgColor: "bg-accent/10",
    accentColor: "text-accent"
  },
  {
    id: 3,
    name: "Mental Wellness",
    subtitle: "Brain Health",
    description: "COGNITIVE SUPPORT",
    icon: Brain,
    imageUrl: "/p2.png",
    productCount: "80+",
    bgColor: "bg-primary/10",
    accentColor: "text-primary"
  },
  {
    id: 4,
    name: "Pediatric Care",
    subtitle: "Kids Health",
    description: "CHILDREN'S MEDICINE",
    icon: Baby,
    imageUrl: "/pills.png",
    productCount: "120+",
    bgColor: "bg-secondary/20",
    accentColor: "text-secondary-foreground"
  },
  {
    id: 5,
    name: "Immune Support",
    subtitle: "Defense System",
    description: "VITAMINS & BOOSTERS",
    icon: Shield,
    imageUrl: "/wf.png",
    productCount: "90+",
    bgColor: "bg-primary/8",
    accentColor: "text-primary"
  },
  {
    id: 6,
    name: "Orthopedic Care",
    subtitle: "Bone & Joint",
    description: "MOBILITY SOLUTIONS",
    icon: Bone,
    imageUrl: "/p3.png",
    productCount: "110+",
    bgColor: "bg-muted/30",
    accentColor: "text-muted-foreground"
  }
];

const MedicineCategoriesSection: React.FC = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div 
          className="max-w-2xl mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-medium">Health Categories</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Shop by Health Category
          </h2>
          <p className="text-muted-foreground text-lg">
            Browse our comprehensive range of medical products organized by health condition
          </p>
        </motion.div>

        {/* Categories Grid - 3 columns, 2 rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {categories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group cursor-pointer"
              >
                <Card className={`h-56 sm:h-64 ${category.bgColor} border border-border/50 overflow-hidden hover:shadow-purple hover:-translate-y-1 transition-all duration-300 relative`}>
                  <CardContent className="p-4 sm:p-6 h-full flex flex-col justify-between relative">
                    {/* Content */}
                    <div>
                      <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                        {category.subtitle}
                      </div>
                      <h3 className="text-lg sm:text-2xl font-bold text-foreground mb-1 sm:mb-2 leading-tight">
                        {category.name.toUpperCase()}
                      </h3>
                      <div className={`text-xs font-bold ${category.accentColor} tracking-wider mb-3 sm:mb-4`}>
                        {category.description}
                      </div>
                    </div>

                    {/* Product Image - Large and prominent */}
                    <div className="absolute -right-2 sm:-right-4 -bottom-2 sm:-bottom-4 w-24 sm:w-32 h-24 sm:h-32">
                      <Image
                        src={category.imageUrl}
                        alt={category.name}
                        fill
                        className="object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>

                    {/* Shop Now Button */}
                    <div className="relative z-10">
                      <Button 
                        size="sm" 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4 py-2 h-8 sm:h-9 text-xs sm:text-sm"
                      >
                        SHOP NOW
                        <ArrowRight className="h-3 w-3 ml-1 sm:ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* View All Categories */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Button 
            variant="outline"
            size="lg"
            className="px-6 sm:px-8 border-primary/30 text-primary hover:bg-primary/5 text-sm sm:text-base"
          >
            View All Categories
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default MedicineCategoriesSection;