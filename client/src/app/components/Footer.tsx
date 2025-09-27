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
    <footer className="relative py-24 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-foreground/5" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.01]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
        backgroundSize: '80px 80px'
      }} />

      <div className="container mx-auto px-4 relative z-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Company Info */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-8">
              <Image
                src="/logo.png"
                alt="PillSure Logo"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <span className="text-2xl font-bold text-foreground">PillSure</span>
            </div>
            <p className="text-muted-foreground mb-8 max-w-md leading-relaxed text-lg">
              Your trusted partner in healthcare. We provide reliable access to medicines, 
              connect patients with doctors, and support hospitals with comprehensive solutions.
            </p>

            {/* Contact Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">support@pillsure.com</span>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">123 Healthcare St, Medical City, MC 12345</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-foreground font-bold text-lg mb-6">Quick Links</h3>
            <ul className="space-y-3">
              {["About Us", "Find Doctors", "Medicine Catalog", "Hospital Directory", "Health Blog"].map((link, index) => (
                <li key={index}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300 text-sm">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-foreground font-bold text-lg mb-6">Support</h3>
            <ul className="space-y-3">
              {["Help Center", "Contact Us", "Privacy Policy", "Terms of Service", "FAQ"].map((link, index) => (
                <li key={index}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300 text-sm">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-muted-foreground text-sm">
                © 2024 PillSure. All Rights Reserved
              </p>
              <div className="flex items-center space-x-8">
                <div className="flex space-x-4">
                  {[Facebook, Twitter, Linkedin, Instagram].map((Icon, index) => (
                    <a 
                      key={index}
                      href="#" 
                      className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all duration-300 text-muted-foreground" 
                      aria-label={`Social Media ${index + 1}`}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
                <div className="flex space-x-2">
                  {["/f1.png", "/f4.png", "/f3.png", "/f2.png"].map(
                    (src, i) => (
                      <Image
                        key={i}
                        src={src}
                        alt="Payment Method"
                        width={32}
                        height={20}
                        className="h-5 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300"
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
