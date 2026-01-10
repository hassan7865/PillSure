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
  Menu,
  Stethoscope,
  Building2,
  X,
  Home,
  Pill,
  Grid3X3,
  Info,
  Phone,
  Search,
  ChevronDown,
  CalendarClock
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
  const [scrolled, setScrolled] = useState(false);
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

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-xl shadow-md' : 'bg-white/80 backdrop-blur-md'
    }`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Pill className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
            <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              PillSure
            </span>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Search Icon - Hidden on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-full transition-all duration-200"
            >
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            {/* Cart Icon */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-full transition-all duration-200"
              onClick={() => router.push('/cart')}
            >
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-medium">
                0
              </span>
            </Button>

            {/* Join as Doctor/Hospital Dropdown - Only show when not logged in */}
            {!user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="hidden lg:flex items-center space-x-2 border-primary/20 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-sm sm:text-base"
                  >
                    <span className="font-medium">For Professionals</span>
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={handleJoinAsDoctor} 
                    className="cursor-pointer focus:bg-primary/5 focus:text-primary data-[highlighted]:bg-primary/5 data-[highlighted]:text-primary"
                  >
                    <Stethoscope className="mr-2 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">For Doctors</p>
                      <p className="text-xs text-muted-foreground">Join our medical network</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleRegisterAsHospital} 
                    className="cursor-pointer focus:bg-green-50 focus:text-green-700 data-[highlighted]:bg-green-50 data-[highlighted]:text-green-700"
                  >
                    <Building2 className="mr-2 h-4 w-4 text-green-600 data-[highlighted]:text-green-700" />
                    <div>
                      <p className="font-medium">For Hospitals</p>
                      <p className="text-xs text-muted-foreground">Register your facility</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Profile Dropdown or Sign In */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full p-0 hover:ring-2 hover:ring-primary/20 transition-all">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold shadow-lg text-xs sm:text-sm">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 sm:w-64" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2 p-2">
                      <p className="text-sm sm:text-base font-semibold leading-none">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs sm:text-sm leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize w-fit">
                        {user.role}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => router.push('/profile')} 
                    className="cursor-pointer py-2 sm:py-3 focus:bg-primary/5 focus:text-primary data-[highlighted]:bg-primary/5 data-[highlighted]:text-primary transition-colors"
                  >
                    <User className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-primary transition-colors" />
                    <span className="text-sm sm:text-base">My Profile</span>
                  </DropdownMenuItem>
                  {user?.role === 'patient' && (
                    <DropdownMenuItem 
                      onClick={() => router.push('/appointments')} 
                      className="cursor-pointer py-2 sm:py-3 focus:bg-primary/5 focus:text-primary data-[highlighted]:bg-primary/5 data-[highlighted]:text-primary transition-colors"
                    >
                      <CalendarClock className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-primary transition-colors" />
                      <span className="text-sm sm:text-base">My Appointments</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => router.push('/orders')} 
                    className="cursor-pointer py-2 sm:py-3 focus:bg-primary/5 focus:text-primary data-[highlighted]:bg-primary/5 data-[highlighted]:text-primary transition-colors"
                  >
                    <ShoppingCart className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-primary transition-colors" />
                    <span className="text-sm sm:text-base">My Orders</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={logout} 
                    className="cursor-pointer py-2 sm:py-3 text-red-600 focus:text-red-700 focus:bg-red-50 data-[highlighted]:text-red-700 data-[highlighted]:bg-red-50 transition-colors"
                  >
                    <LogOut className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-red-600 transition-colors" />
                    <span className="text-sm sm:text-base">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => router.push('/auth')}
                className="hidden md:flex bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 text-sm sm:text-base"
              >
                Sign In
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200" 
              onClick={toggleMobileMenu}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm lg:hidden" onClick={closeMobileMenu} />
          <div 
            ref={mobileMenuRef} 
            className="fixed top-16 sm:top-20 right-0 w-72 sm:w-80 max-w-full h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] bg-white shadow-2xl lg:hidden overflow-y-auto"
          >
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* User Info Section (if logged in) */}
              {user && (
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 sm:p-4 border border-primary/10">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold shadow-lg text-sm sm:text-base">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate text-sm sm:text-base">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-primary text-white capitalize">
                    {user.role}
                  </span>
                </div>
              )}

              {/* Navigation Links */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 sm:mb-3 px-3">
                  Navigation
                </p>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-foreground hover:text-primary hover:bg-primary/5 rounded-lg py-4 sm:py-6 transition-all duration-200 group"
                  onClick={() => { router.push('/'); closeMobileMenu(); }}
                >
                  <Home className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-medium text-sm sm:text-base">Home</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-foreground hover:text-primary hover:bg-primary/5 rounded-lg py-4 sm:py-6 transition-all duration-200 group"
                  onClick={() => { router.push('/medicines'); closeMobileMenu(); }}
                >
                  <Pill className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-medium text-sm sm:text-base">Medicines</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-foreground hover:text-primary hover:bg-primary/5 rounded-lg py-4 sm:py-6 transition-all duration-200 group"
                  onClick={() => { router.push('/search-doctor'); closeMobileMenu(); }}
                >
                  <Stethoscope className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-medium text-sm sm:text-base">Find Doctors</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-foreground hover:text-primary hover:bg-primary/5 rounded-lg py-4 sm:py-6 transition-all duration-200 group"
                  onClick={() => { router.push('/hospitals'); closeMobileMenu(); }}
                >
                  <Building2 className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-medium text-sm sm:text-base">Hospitals</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-foreground hover:text-primary hover:bg-primary/5 rounded-lg py-4 sm:py-6 transition-all duration-200 group"
                  onClick={() => { router.push('/about'); closeMobileMenu(); }}
                >
                  <Info className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-medium text-sm sm:text-base">About</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-foreground hover:text-primary hover:bg-primary/5 rounded-lg py-4 sm:py-6 transition-all duration-200 group"
                  onClick={() => { router.push('/contact'); closeMobileMenu(); }}
                >
                  <Phone className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-medium text-sm sm:text-base">Contact</span>
                </Button>
              </div>

              {/* Professional Options - Only show when not logged in */}
              {!user && (
                <div className="space-y-2 pt-3 sm:pt-4 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 sm:mb-3 px-3">
                    For Professionals
                  </p>
                  <Button 
                    onClick={() => { handleJoinAsDoctor(); closeMobileMenu(); }}
                    variant="outline" 
                    className="w-full justify-start border-primary/20 text-primary hover:bg-primary/5 hover:border-primary hover:text-primary rounded-lg py-4 sm:py-6 transition-all duration-200 group"
                  >
                    <Stethoscope className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-primary transition-colors" />
                    <span className="font-medium text-sm sm:text-base">Join as Doctor</span>
                  </Button>
                  <Button 
                    onClick={() => { handleRegisterAsHospital(); closeMobileMenu(); }}
                    variant="outline" 
                    className="w-full justify-start border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 rounded-lg py-4 sm:py-6 transition-all duration-200 group"
                  >
                    <Building2 className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-green-600 group-hover:text-green-700 transition-colors" />
                    <span className="font-medium text-sm sm:text-base">Register as Hospital</span>
                  </Button>
                </div>
              )}

              {/* Account Actions */}
              {user ? (
                <div className="space-y-2 pt-3 sm:pt-4 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 sm:mb-3 px-3">
                    Account
                  </p>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-foreground hover:text-primary hover:bg-primary/5 rounded-lg py-4 sm:py-6 transition-all duration-200 group"
                    onClick={() => { router.push('/profile'); closeMobileMenu(); }}
                  >
                    <User className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-medium text-sm sm:text-base">My Profile</span>
                  </Button>
                  {user?.role === 'patient' && (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-foreground hover:text-primary hover:bg-primary/5 rounded-lg py-4 sm:py-6 transition-all duration-200 group"
                      onClick={() => { router.push('/appointments'); closeMobileMenu(); }}
                    >
                      <CalendarClock className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="font-medium text-sm sm:text-base">My Appointments</span>
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-foreground hover:text-primary hover:bg-primary/5 rounded-lg py-4 sm:py-6 transition-all duration-200 group"
                    onClick={() => { router.push('/orders'); closeMobileMenu(); }}
                  >
                    <ShoppingCart className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-medium text-sm sm:text-base">My Orders</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg py-4 sm:py-6 transition-all duration-200 group"
                    onClick={() => { logout(); closeMobileMenu(); }}
                  >
                    <LogOut className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-red-600 group-hover:text-red-700 transition-colors" />
                    <span className="font-medium text-sm sm:text-base">Log out</span>
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => { router.push('/auth'); closeMobileMenu(); }}
                  className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white py-4 sm:py-6 rounded-lg font-medium shadow-lg shadow-primary/25 transition-all text-sm sm:text-base"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;