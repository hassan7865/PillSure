"use client";

import Image from "next/image";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram,
  Heart,
  Shield,
  Users
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Footer: React.FC = () => {
  return (
    <footer className="relative py-20 overflow-hidden bg-gradient-to-b from-background to-muted/20">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/3 rounded-full blur-3xl" />
      </div>
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="container mx-auto px-4 relative z-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-12 sm:mb-16">
          {/* Company Info */}
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6 sm:mb-8">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-primary">PillSure</span>
            </div>
            <p className="text-muted-foreground mb-6 sm:mb-8 max-w-md leading-relaxed text-sm sm:text-base">
              Your trusted partner in healthcare. We provide reliable access to medicines, 
              connect patients with doctors, and support hospitals with comprehensive solutions.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3 group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300 text-sm sm:text-base">support@pillsure.com</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                  <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300 text-sm sm:text-base">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300 text-sm sm:text-base">123 Healthcare St, Medical City, MC 12345</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-card-foreground font-bold text-base sm:text-lg mb-4 sm:mb-6">Quick Links</h3>
            <ul className="space-y-2 sm:space-y-3">
              {["About Us", "Find Doctors", "Medicine Catalog", "Hospital Directory", "Health Blog"].map((link, index) => (
                <li key={index}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300 text-xs sm:text-sm group">
                    <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">
                      {link}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-card-foreground font-bold text-base sm:text-lg mb-4 sm:mb-6">Support</h3>
            <ul className="space-y-2 sm:space-y-3">
              {["Help Center", "Contact Us", "Privacy Policy", "Terms of Service", "FAQ"].map((link, index) => (
                <li key={index}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300 text-xs sm:text-sm group">
                    <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">
                      {link}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-purple-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
              <p className="text-muted-foreground text-xs sm:text-sm">
                © 2024 PillSure. All Rights Reserved
              </p>
              <div className="flex items-center space-x-4 sm:space-x-8">
                <div className="flex space-x-2 sm:space-x-4">
                  {[Facebook, Twitter, Linkedin, Instagram].map((Icon, index) => (
                    <a 
                      key={index}
                      href="#" 
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-muted/50 rounded-lg flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all duration-300 text-muted-foreground hover:scale-105" 
                      aria-label={`Social Media ${index + 1}`}
                    >
                      <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                    </a>
                  ))}
                </div>
                <div className="flex space-x-1 sm:space-x-2">
                  {["/f1.png", "/f4.png", "/f3.png", "/f2.png"].map(
                    (src, i) => (
                      <Image
                        key={i}
                        src={src}
                        alt="Payment Method"
                        width={24}
                        height={16}
                        className="h-4 w-auto sm:h-5 sm:w-auto opacity-70 hover:opacity-100 transition-opacity duration-300 hover:scale-105"
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </footer>
  );
};

export default Footer;
