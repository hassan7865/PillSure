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
  AlertCircle,
  ArrowRight,
  Shield
} from "lucide-react";
import { motion } from "framer-motion";

const featuredProducts = [
  {
    id: 1,
    name: "Vitamin C 500mg Sugarless",
    category: "Vitamins",
    price: 16.00,
    originalPrice: 20.00,
    imageUrl: "/wf.png",
    rating: 4.5,
    reviews: 120,
    inStock: true,
    prescriptionRequired: false,
    description: "High potency Vitamin C supplement for immune support"
  },
  {
    id: 2,
    name: "Insulin Lispro Kwikpen",
    category: "Diabetes Care",
    price: 32.88,
    imageUrl: "/wf2.png",
    rating: 4.8,
    reviews: 85,
    inStock: true,
    prescriptionRequired: true,
    description: "Fast-acting insulin for diabetes management"
  },
  {
    id: 3,
    name: "Nutren Diabetes Vanilla",
    category: "Protein",
    price: 34.50,
    imageUrl: "/Med.png",
    rating: 4.2,
    reviews: 60,
    inStock: false,
    prescriptionRequired: false,
    description: "Nutritional supplement for diabetic patients"
  },
  {
    id: 4,
    name: "Henry Blooms One Night Collagen",
    category: "Herbs",
    price: 39.00,
    originalPrice: 44.00,
    imageUrl: "/cos.png",
    rating: 4.7,
    reviews: 150,
    inStock: true,
    prescriptionRequired: false,
    description: "Premium collagen supplement for skin health"
  },
  {
    id: 5,
    name: "Spring Leaf Kids Fish Oil 750mg",
    category: "Kids Health",
    price: 24.95,
    imageUrl: "/pills.png",
    rating: 4.6,
    reviews: 90,
    inStock: true,
    prescriptionRequired: false,
    description: "Omega-3 supplement specially formulated for children"
  },
  {
    id: 6,
    name: "Nordic Naturals Arctic-D Cod Liver Oil",
    category: "Supplements",
    price: 37.45,
    originalPrice: 42.95,
    imageUrl: "/Bonas.webp",
    rating: 4.9,
    reviews: 200,
    inStock: true,
    prescriptionRequired: false,
    description: "Premium cod liver oil with vitamin D"
  }
];

const FeaturedProductsSection: React.FC = () => {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="h-3.5 w-3.5 fill-amber-400/50 text-amber-400" />);
      } else {
        stars.push(<Star key={i} className="h-3.5 w-3.5 text-slate-300" />);
      }
    }
    return stars;
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div 
          className="max-w-2xl mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-medium">Featured Products</span>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-primary">
            Premium Healthcare Solutions
          </h2>
          <p className="text-muted-foreground text-md leading-relaxed">
            Carefully curated selection of high-quality medicines and supplements 
            to support your health and wellness journey.
          </p>
        </motion.div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {featuredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="group h-full bg-card border-border hover:border-primary/30 hover:shadow-purple transition-all duration-300 overflow-hidden">
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative h-40 sm:h-48 bg-muted/50 overflow-hidden">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Status Indicators */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      {product.originalPrice && (
                        <div className="bg-destructive text-white text-xs font-semibold px-2.5 py-1 rounded-md">
                          -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                        </div>
                      )}
                      {product.prescriptionRequired && (
                        <div className="bg-accent text-accent-foreground text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Rx
                        </div>
                      )}
                    </div>
                    
                    {/* Wishlist */}
                    <button className="absolute top-3 right-3 p-2 bg-card/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105">
                      <Heart className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                    </button>
                  </div>

                  <div className="p-4 sm:p-5">
                    {/* Category & Name */}
                    <div className="mb-2 sm:mb-3">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        {product.category}
                      </div>
                      <h3 className="font-semibold text-card-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors text-sm sm:text-base">
                        {product.name}
                      </h3>
                    </div>
                    
                    {/* Description */}
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <div className="flex items-center">
                        {renderStars(product.rating)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {product.rating} ({product.reviews})
                      </span>
                    </div>

                    {/* Price & Stock */}
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        {product.originalPrice && (
                          <span className="text-xs sm:text-sm text-muted-foreground line-through">
                            ${product.originalPrice.toFixed(2)}
                          </span>
                        )}
                        <span className="text-lg sm:text-xl font-bold text-card-foreground">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {product.inStock ? (
                          <>
                            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                            <span className="text-xs font-medium text-green-700">In Stock</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                            <span className="text-xs font-medium text-destructive">Out of Stock</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <Button 
                      className="w-full h-8 sm:h-9 text-xs sm:text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground disabled:bg-muted disabled:text-muted-foreground" 
                      disabled={!product.inStock}
                    >
                      <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      {product.prescriptionRequired ? "Consult Doctor" : "Add to Cart"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        <motion.div 
          className="text-center mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Button 
            variant="outline"
            size="lg"
            className="px-4 sm:px-6 h-10 sm:h-11 font-medium border-primary/30 text-primary hover:bg-primary/5 hover:text-primary text-sm sm:text-base"
          >
            View All Products
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProductsSection;