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
  Shield,
  AlertCircle,
  ArrowRight
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
    for (let i = 0; i < 5; i++) {
      if (rating - i >= 1) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
      } else if (rating - i > 0) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400/50 text-yellow-400/50" />);
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />);
      }
    }
    return stars;
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
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
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
            <span>Featured Products</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            <span className="block">Premium</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
              Healthcare Products
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Discover our curated selection of high-quality medicines and supplements, 
            carefully selected for your health and wellness needs.
          </p>
        </motion.div>

        {/* Products Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {featuredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <Card className="group hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 border-border/50 hover:border-primary/30 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm overflow-hidden relative">
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <CardContent className="p-0 relative z-10">
                  {/* Product Image */}
                  <div className="relative h-48 bg-gradient-to-br from-muted/20 to-muted/10 overflow-hidden">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-contain group-hover:scale-110 transition-transform duration-500"
                    />
                    
                    {/* Discount Badge */}
                    {product.originalPrice && (
                      <motion.div 
                        className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg"
                        whileHover={{ scale: 1.05 }}
                      >
                        SAVE {Math.round((1 - product.price / product.originalPrice) * 100)}%
                      </motion.div>
                    )}
                    
                    {/* Prescription Badge */}
                    {product.prescriptionRequired && (
                      <motion.div 
                        className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="w-3 h-3 rounded-full overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-r from-white to-orange-300 rounded-full" />
                        </div>
                        Prescription
                      </motion.div>
                    )}
                    
                    {/* Wishlist Button */}
                    <motion.div 
                      className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Heart className="h-4 w-4 text-red-500" />
                    </motion.div>
                  </div>

                  <div className="p-6">
                    {/* Category */}
                    <div className="text-sm text-primary font-medium mb-2">{product.category}</div>
                    
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
                        <span className="text-xl font-bold text-primary">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {product.inStock ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <CheckCircle className="h-4 w-4" />
                            In Stock
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                            <XCircle className="h-4 w-4" />
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 text-sm py-2 bg-primary hover:bg-primary/90 text-primary-foreground" 
                        disabled={!product.inStock}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {product.prescriptionRequired ? "Get Prescription" : "Add to Cart"}
                      </Button>
                      {product.prescriptionRequired && (
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="border-primary/20 text-primary hover:bg-primary/5"
                          title="Prescription Required"
                        >
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <Button 
            size="lg" 
            variant="outline"
            className="px-8 py-3 text-base font-semibold rounded-xl border-primary/20 text-primary hover:bg-primary/5"
          >
            <span className="flex items-center gap-2">
              View All Products
              <ArrowRight className="h-4 w-4" />
            </span>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProductsSection;
