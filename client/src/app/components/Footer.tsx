"use client";

import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Heart,
  CreditCard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type FooterLink = { label: string; href: string; external?: boolean };

const quickLinks: FooterLink[] = [
  { label: "About Us", href: "/" },
  { label: "Find Doctors", href: "/search-doctor" },
  { label: "Medicine Catalog", href: "/medicine" },
  { label: "Hospital Directory", href: "/auth?role=hospital&mode=signup" },
  {
    label: "Health Blog",
    href: "mailto:support@pillsure.com?subject=Health%20%26%20Wellness%20Content",
    external: true,
  },
];

const supportLinks: FooterLink[] = [
  { label: "Help Center", href: "/medicine" },
  { label: "Contact Us", href: "mailto:support@pillsure.com", external: true },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "FAQ", href: "/medicine" },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className =
    "text-muted-foreground hover:text-primary transition-colors duration-300 text-xs sm:text-sm group";
  const inner = (
    <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">{link.label}</span>
  );
  if (link.external) {
    return (
      <a href={link.href} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className}>
      {inner}
    </Link>
  );
}

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
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: "60px 60px",
        }}
      />

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
              Your trusted partner in healthcare. We provide reliable access to medicines, connect patients with
              doctors, and support hospitals with comprehensive solutions.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3 group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <a
                  href="mailto:support@pillsure.com"
                  className="text-muted-foreground group-hover:text-foreground transition-colors duration-300 text-sm sm:text-base"
                >
                  support@pillsure.com
                </a>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                  <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <a
                  href="tel:+15551234567"
                  className="text-muted-foreground group-hover:text-foreground transition-colors duration-300 text-sm sm:text-base"
                >
                  +1 (555) 123-4567
                </a>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300 text-sm sm:text-base">
                  123 Healthcare St, Medical City, MC 12345
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-card-foreground font-bold text-base sm:text-lg mb-4 sm:mb-6">Quick Links</h3>
            <ul className="space-y-2 sm:space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-card-foreground font-bold text-base sm:text-lg mb-4 sm:mb-6">Support</h3>
            <ul className="space-y-2 sm:space-y-3">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-purple-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
              <p className="text-muted-foreground text-xs sm:text-sm">© 2024 PillSure. All Rights Reserved</p>
              <div className="flex items-center space-x-4 sm:space-x-8">
                <div className="flex space-x-2 sm:space-x-4">
                  {[Facebook, Twitter, Linkedin, Instagram].map((Icon, index) => (
                    <a
                      key={index}
                      href="mailto:support@pillsure.com?subject=PillSure%20-%20Social%20media"
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-muted/50 rounded-lg flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all duration-300 text-muted-foreground hover:scale-105"
                      aria-label={`Contact via email (social ${index + 1})`}
                    >
                      <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                    </a>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  <span>Secure checkout · Cards and digital wallets</span>
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
