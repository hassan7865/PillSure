"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingCart, 
  Heart, 
  Star, 
  CheckCircle,
  XCircle,
  Pill,
  TrendingUp,
  Award,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

const topSellingProducts = [
  {
    id: 1,
    name: "Nordic Naturals Arctic-D Cod Liver Oil",
    category: "Supplements",
    price: 37.45,
    originalPrice: 42.95,
    imageUrl: "/Bonas.webp",
    rating: 4.9,
    reviews: 200,
    inStock: true,
    prescriptionRequired: false,
    salesRank: 1,
    description: "Premium cod liver oil with vitamin D",
    badge: "Best Seller"
  },
  {
    id: 2,
    name: "Henry Blooms One Night Collagen",
    category: "Herbs",
    price: 39.00,
    originalPrice: 44.00,
    imageUrl: "/cos.png",
    rating: 4.7,
    reviews: 150,
    inStock: true,
    prescriptionRequired: false,
    salesRank: 2,
    description: "Premium collagen supplement for skin health",
    badge: "Trending"
  },
  {
    id: 3,
    name: "Insulin Lispro Kwikpen",
    category: "Diabetes Care",
    price: 32.88,
    imageUrl: "/wf2.png",
    rating: 4.8,
    reviews: 85,
    inStock: true,
    prescriptionRequired: true,
    salesRank: 3,
    description: "Fast-acting insulin for diabetes management",
    badge: "Popular"
  },
  {
    id: 4,
    name: "Spring Leaf Kids Fish Oil 750mg",
    category: "Kids Health",
    price: 24.95,
    imageUrl: "/pills.png",
    rating: 4.6,
    reviews: 90,
    inStock: true,
    prescriptionRequired: false,
    salesRank: 4,
    description: "Omega-3 supplement specially formulated for children",
    badge: "Top Rated"
  },
  {
    id: 5,
    name: "Vitamin C 500mg Sugarless",
    category: "Vitamins",
    price: 16.00,
    originalPrice: 20.00,
    imageUrl: "/wf.png",
    rating: 4.5,
    reviews: 120,
    inStock: true,
    prescriptionRequired: false,
    salesRank: 5,
    description: "High potency Vitamin C supplement for immune support",
    badge: "Sale"
  },
  {
    id: 6,
    name: "Buscopan Forte Tab 20mg X 10",
    category: "Pain Relief",
    price: 8.95,
    imageUrl: "/p1.png",
    rating: 4.3,
    reviews: 110,
    inStock: true,
    prescriptionRequired: false,
    salesRank: 6,
    description: "Effective pain relief for stomach cramps",
    badge: "Fast Moving"
  }
];

const TopSellingSection: React.FC = () => {
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (rating - i >= 1) {
        stars.push(<Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />);
      } else if (rating - i > 0) {
        stars.push(<Star key={i} className="h-4 w-4 fill-amber-400/50 text-amber-400/50" />);
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-muted-foreground/30" />);
      }
    }
    return stars;
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "Best Seller":
        return "bg-destructive text-white";
      case "Trending":
        return "bg-accent text-accent-foreground";
      case "Popular":
        return "bg-primary text-primary-foreground";
      case "Top Rated":
        return "bg-green-600 text-white";
      case "Sale":
        return "bg-primary/80 text-primary-foreground";
      case "Fast Moving":
        return "bg-accent/80 text-accent-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-b from-background to-muted/30">
      {/* Background Elements */}
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </motion.div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div 
          className="max-w-2xl mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-medium">Top Selling Products</span>
          </div>
          <h2 className="text-3xl font-bold text-primary mb-4">
            Most Popular Choices
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Discover our best-selling medicines and supplements, trusted by thousands of customers 
            for their effectiveness and quality.
          </p>
        </motion.div>

        {/* Top 3 Products - Featured */}
        <motion.div 
          className="grid md:grid-cols-3 gap-8 mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {topSellingProducts.slice(0, 3).map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <Card className="group hover:shadow-purple transition-all duration-300 border-border/50 hover:border-primary/30 bg-card backdrop-blur-sm overflow-hidden">
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative h-48 bg-muted/30 overflow-hidden">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-contain group-hover:scale-110 transition-transform duration-500"
                    />
                    
                    {/* Badge */}
                    <div className="absolute top-3 left-3">
                      <div className={`text-xs font-bold px-3 py-1 rounded-full ${getBadgeColor(product.badge)}`}>
                        {product.badge}
                      </div>
                    </div>
                    
                    {product.prescriptionRequired && (
                      <div className="absolute top-3 right-3 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-accent-foreground/50" />
                        Rx
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    {/* Category */}
                    <div className="text-sm text-muted-foreground mb-2">{product.category}</div>
                    
                    {/* Product Name */}
                    <h3 className="text-lg font-semibold text-card-foreground mb-2 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                      {product.name}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-1">
                        {renderStars(product.rating)}
                      </div>
                      <span className="text-sm text-muted-foreground">({product.reviews})</span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {product.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            ${product.originalPrice.toFixed(2)}
                          </span>
                        )}
                        <span className="text-xl font-bold text-card-foreground">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600 font-medium">In Stock</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      className="w-full text-sm py-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {product.prescriptionRequired ? "Get Prescription" : "Add to Cart"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Remaining Products Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          {topSellingProducts.slice(3).map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <Card className="group hover:shadow-purple transition-all duration-300 border-border/50 hover:border-primary/30 bg-card backdrop-blur-sm overflow-hidden">
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative h-40 bg-muted/30 overflow-hidden">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-contain group-hover:scale-110 transition-transform duration-500"
                    />
                    
                    {/* Badge */}
                    <div className="absolute top-2 left-2">
                      <div className={`text-xs font-bold px-2 py-1 rounded-full ${getBadgeColor(product.badge)}`}>
                        {product.badge}
                      </div>
                    </div>
                    
                    {product.prescriptionRequired && (
                      <div className="absolute top-2 right-2 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-accent-foreground/50" />
                        Rx
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    {/* Category */}
                    <div className="text-xs text-muted-foreground mb-1">{product.category}</div>
                    
                    {/* Product Name */}
                    <h3 className="text-base font-semibold text-card-foreground mb-2 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                      {product.name}
                    </h3>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        {renderStars(product.rating)}
                      </div>
                      <span className="text-xs text-muted-foreground">({product.reviews})</span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {product.originalPrice && (
                          <span className="text-xs text-muted-foreground line-through">
                            ${product.originalPrice.toFixed(2)}
                          </span>
                        )}
                        <span className="text-lg font-bold text-card-foreground">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      size="sm"
                      className="w-full text-xs py-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      {product.prescriptionRequired ? "Get Prescription" : "Add to Cart"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* View All Button */}
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          <Button 
            size="lg" 
            variant="outline"
            className="px-8 py-3 text-base font-semibold rounded-xl border-primary/30 text-primary hover:bg-primary/5"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            View All Top Sellers
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default TopSellingSection;
