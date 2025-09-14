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

const Footer: React.FC = () => {
  return (
    <footer className="bg-blue-900 text-gray-300 py-16">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Company Info */}
        <div className="md:col-span-2">
          <div className="flex items-center space-x-2 mb-6">
            <Image
              src="/logo.png"
              alt="Pill Sure Logo"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
            <span className="text-white text-2xl font-bold">Pill Sure</span>
          </div>
          <p className="text-sm mb-8 max-w-md leading-relaxed">
            Your trusted partner in healthcare. We provide reliable access to medicines, 
            connect patients with doctors, and support hospitals with comprehensive solutions.
          </p>

          {/* Contact Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-blue-400" />
              <span className="text-sm">support@pillsure.com</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-blue-400" />
              <span className="text-sm">+1 (555) 123-4567</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span className="text-sm">123 Healthcare St, Medical City, MC 12345</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-white font-bold text-lg mb-4">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#" className="hover:text-white transition-colors">
                About Us
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Find Doctors
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Medicine Catalog
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Hospital Directory
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Health Blog
              </a>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-white font-bold text-lg mb-4">Support</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Help Center
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Contact Us
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Terms of Service
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                FAQ
              </a>
            </li>
          </ul>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700 mt-8 pt-6">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm">
          <p className="mb-4 md:mb-0">
            © 2024 Pill Sure. All Rights Reserved
          </p>
          <div className="flex items-center space-x-6">
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
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
                    className="h-5 w-auto opacity-70"
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
