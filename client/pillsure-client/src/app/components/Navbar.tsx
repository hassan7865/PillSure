"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { 
  User, 
  LogOut, 
  ShoppingCart, 
  Heart, 
  Menu,
  Stethoscope,
  Building2,
  X,
  Home,
  Pill,
  Grid3X3,
  Info,
  Phone
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const handleJoinAsDoctor = () => {
    router.push('/auth?role=doctor&mode=signup');
  };

  const handleRegisterAsHospital = () => {
    router.push('/auth?role=hospital&mode=signup');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);
  
  return (
    <nav className="bg-white py-3 shadow-sm border-b relative">
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <Image
            src="/Pilllogo.png"
            alt="Pill Sure Logo"
            width={32}
            height={32}
            className="h-8 w-auto"
          />
          <span className="text-lg md:text-2xl font-bold text-blue-900 leading-tight">
            Pill Sure
          </span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-6 text-blue-900 font-medium">
          <Button variant="link" className="hover:text-blue-500 px-3 py-2">Home</Button>
          <Button variant="link" className="hover:text-blue-500 px-3 py-2">Medicines</Button>
          <Button variant="link" className="hover:text-blue-500 px-3 py-2">Categories</Button>
          <Button variant="link" className="hover:text-blue-500 px-3 py-2">About</Button>
          <Button variant="link" className="hover:text-blue-500 px-3 py-2">Contact</Button>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-3">
          {/* Join as Doctor Button - Only show when not logged in */}
          {!user && (
            <Button 
              onClick={handleJoinAsDoctor}
              variant="outline" 
              className="hidden md:flex items-center space-x-1.5 text-blue-600 border-blue-600 hover:bg-blue-50 px-3 py-2 text-sm"
            >
              <Stethoscope className="h-4 w-4" />
              <span>Join as Doctor</span>
            </Button>
          )}

          {/* Register as Hospital Button - Only show when not logged in */}
          {!user && (
            <Button 
              onClick={handleRegisterAsHospital}
              variant="outline" 
              className="hidden md:flex items-center space-x-1.5 text-green-600 border-green-600 hover:bg-green-50 px-3 py-2 text-sm"
            >
              <Building2 className="h-4 w-4" />
              <span>Register as Hospital</span>
            </Button>
          )}

          {/* Shopping Cart */}
          <Button variant="ghost" className="relative hover:text-blue-500 p-2" aria-label="Shopping Cart">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              0
            </span>
          </Button>

          {/* Wishlist */}
          <Button variant="ghost" className="hover:text-blue-500 p-2" aria-label="Wishlist">
            <Heart className="h-5 w-5" />
          </Button>

          {/* Profile Dropdown */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground capitalize">
                      {user.role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/orders')}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  <span>Orders</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/wishlist')}>
                  <Heart className="mr-2 h-4 w-4" />
                  <span>Wishlist</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
                  ) : (
                    <Button
                      onClick={() => router.push('/auth')}
                      variant="outline"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-medium px-4 py-2 rounded-lg transition-all duration-200 text-sm"
                    >
                      Sign In
                    </Button>
                  )}

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-blue-500 p-2" 
              aria-label="Toggle mobile menu"
              onClick={toggleMobileMenu}
              type="button"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div ref={mobileMenuRef} className="md:hidden bg-white border-t border-gray-200 shadow-lg absolute left-0 right-0 z-50">
          <div className="container mx-auto px-4 py-3">
            {/* Navigation Links */}
            <div className="space-y-1 mb-4">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-blue-900 hover:text-blue-500 hover:bg-blue-50"
                onClick={() => { router.push('/'); closeMobileMenu(); }}
              >
                <Home className="mr-3 h-4 w-4" />
                Home
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-blue-900 hover:text-blue-500 hover:bg-blue-50"
                onClick={() => { router.push('/medicines'); closeMobileMenu(); }}
              >
                <Pill className="mr-3 h-4 w-4" />
                Medicines
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-blue-900 hover:text-blue-500 hover:bg-blue-50"
                onClick={() => { router.push('/categories'); closeMobileMenu(); }}
              >
                <Grid3X3 className="mr-3 h-4 w-4" />
                Categories
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-blue-900 hover:text-blue-500 hover:bg-blue-50"
                onClick={() => { router.push('/about'); closeMobileMenu(); }}
              >
                <Info className="mr-3 h-4 w-4" />
                About
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-blue-900 hover:text-blue-500 hover:bg-blue-50"
                onClick={() => { router.push('/contact'); closeMobileMenu(); }}
              >
                <Phone className="mr-3 h-4 w-4" />
                Contact
              </Button>
            </div>

            {/* Action Buttons - Only show when not logged in */}
            {!user && (
              <div className="space-y-2 mb-4">
                <Button 
                  onClick={() => { handleJoinAsDoctor(); closeMobileMenu(); }}
                  variant="outline" 
                  className="w-full items-center space-x-2 text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Stethoscope className="h-4 w-4" />
                  <span>Join as Doctor</span>
                </Button>
                <Button 
                  onClick={() => { handleRegisterAsHospital(); closeMobileMenu(); }}
                  variant="outline" 
                  className="w-full items-center space-x-2 text-green-600 border-green-600 hover:bg-green-50"
                >
                  <Building2 className="h-4 w-4" />
                  <span>Register as Hospital</span>
                </Button>
              </div>
            )}

            {/* User Actions */}
            <div className="space-y-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-blue-900 hover:text-blue-500 hover:bg-blue-50"
                onClick={() => { router.push('/cart'); closeMobileMenu(); }}
              >
                <ShoppingCart className="mr-3 h-4 w-4" />
                Shopping Cart
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  0
                </span>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-blue-900 hover:text-blue-500 hover:bg-blue-50"
                onClick={() => { router.push('/wishlist'); closeMobileMenu(); }}
              >
                <Heart className="mr-3 h-4 w-4" />
                Wishlist
              </Button>
              
              {!user && (
                <Button 
                  onClick={() => { router.push('/auth'); closeMobileMenu(); }}
                  variant="outline"
                  className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-medium px-4 py-2 rounded-lg transition-all duration-200 text-sm"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
