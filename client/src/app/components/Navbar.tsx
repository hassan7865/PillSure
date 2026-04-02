"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import cartApi from "@/app/cart/_api";
import orderApi from "@/app/orders/_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { getDashboardHomeByRole, normalizeRole } from "@/lib/role-routing";
import { 
  User, 
  LogOut, 
  ShoppingCart, 
  Stethoscope,
  Building2,
  Home,
  Pill,
  Grid3X3,
  Info,
  Phone,
  Search,
  ChevronDown,
  CalendarClock,
  Trash2,
  ShoppingBag
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { showError, showSuccess } = useCustomToast();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartData, setCartData] = useState<any>(null);
  const [shippingAddress, setShippingAddress] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState<"cod" | "online" | null>(null);
  const isCheckoutInfoValid = shippingAddress.trim().length > 0 && contactNo.trim().length > 0;

  const handleJoinAsDoctor = () => {
    router.push('/auth?role=doctor&mode=signup');
  };

  const handleRegisterAsHospital = () => {
    router.push('/auth?role=hospital&mode=signup');
  };

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadCart = async () => {
    if (!user || normalizeRole(user.role) !== "patient") {
      setCartCount(0);
      setCartData(null);
      return;
    }

    try {
      setCartLoading(true);
      const data: any = await cartApi.getCart();
      setCartData(data);
      const count = Array.isArray(data?.items)
        ? data.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0)
        : 0;
      setCartCount(count);
    } catch {
      setCartCount(0);
      setCartData(null);
    } finally {
      setCartLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, [user?.id, user?.role]);

  useEffect(() => {
    const onCartUpdate = () => {
      loadCart();
    };
    window.addEventListener("cart:updated", onCartUpdate);
    return () => window.removeEventListener("cart:updated", onCartUpdate);
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (cartOpen) {
      loadCart();
    }
  }, [cartOpen]);

  const handleCheckout = async (paymentMethod: "cod" | "online") => {
    try {
      if (!isCheckoutInfoValid) {
        showError("Missing details", "Shipping address and contact number are required.");
        return;
      }
      setCheckoutLoading(paymentMethod);
      const data: any = await orderApi.checkout({
        paymentMethod,
        shippingAddress: shippingAddress.trim(),
        contactNo: contactNo.trim(),
      });

      if (paymentMethod === "online" && data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      showSuccess("Order placed", "Your cash on delivery order has been placed.");
      setCartOpen(false);
      await loadCart();
      router.push("/orders");
    } catch (error) {
      showError("Checkout failed", getErrorMessage(error));
    } finally {
      setCheckoutLoading(null);
    }
  };
  
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
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Icon - Hidden on mobile */}
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="hidden md:flex text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-full transition-all duration-200"
              onClick={() => router.push("/medicine")}
              aria-label="Search medicines"
            >
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            {/* Cart Icon */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-full transition-all duration-200"
                >
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  {normalizeRole(user?.role) === "patient" && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 min-w-4 px-1 sm:h-5 sm:min-w-5 flex items-center justify-center font-medium">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Your Cart</SheetTitle>
                  <SheetDescription>Quick cart preview from anywhere.</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  {cartLoading ? (
                    <p className="text-sm text-muted-foreground">Loading cart...</p>
                  ) : !cartData?.items?.length ? (
                    <div className="rounded-xl border border-dashed p-6 text-center">
                      <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Your cart is empty</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add medicines to see them here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cartData.items.map((item: any) => (
                        <div key={item.id} className="rounded-xl border bg-card p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{item.medicineName}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity} x PKR {item.unitPrice}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                await cartApi.removeItem(item.id);
                                await loadCart();
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-sm font-semibold">
                        Subtotal: PKR {Number(cartData.total || 0).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
                {!!cartData?.items?.length && (
                  <SheetFooter className="grid grid-cols-1 gap-2 p-4">
                    <Input
                      placeholder="Shipping address"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Contact number"
                      value={contactNo}
                      onChange={(e) => setContactNo(e.target.value)}
                      required
                    />
                    <Button
                      variant="outline"
                      disabled={checkoutLoading !== null || !isCheckoutInfoValid}
                      onClick={() => handleCheckout("cod")}
                    >
                      {checkoutLoading === "cod" ? "Placing..." : "Cash on Delivery"}
                    </Button>
                    <Button
                      disabled={checkoutLoading !== null || !isCheckoutInfoValid}
                      onClick={() => handleCheckout("online")}
                    >
                      {checkoutLoading === "online" ? "Redirecting..." : "Pay Online"}
                    </Button>
                  </SheetFooter>
                )}
              </SheetContent>
            </Sheet>

            {/* Profile Dropdown - Shows different content based on login status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {user ? (
                  <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full p-0 hover:ring-2 hover:ring-primary/20 transition-all">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold shadow-lg text-xs sm:text-sm">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </div>
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full p-0 hover:ring-2 hover:ring-primary/20 transition-all border-2 border-primary/20"
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </Button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 sm:w-64" align="end" forceMount>
                {user ? (
                  <>
                    {/* Logged In User Menu */}
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
                    {normalizeRole(user?.role) === 'doctor' ? (
                      <DropdownMenuItem 
                        onClick={() => router.push(getDashboardHomeByRole(user?.role))}
                        className="cursor-pointer py-2 sm:py-3 focus:bg-primary/5 focus:text-primary data-[highlighted]:bg-primary/5 data-[highlighted]:text-primary transition-colors"
                      >
                        <Grid3X3 className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-primary transition-colors" />
                        <span className="text-sm sm:text-base">Dashboard</span>
                      </DropdownMenuItem>
                    ) : (
                      <>
                        {normalizeRole(user?.role) === 'patient' && (
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
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={logout} 
                      className="cursor-pointer py-2 sm:py-3 text-red-600 focus:text-red-700 focus:bg-red-50 data-[highlighted]:text-red-700 data-[highlighted]:bg-red-50 transition-colors"
                    >
                      <LogOut className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-red-600 transition-colors" />
                      <span className="text-sm sm:text-base">Log out</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    {/* Logged Out User Menu */}
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1 p-2">
                        <p className="text-sm sm:text-base font-semibold">Account</p>
                        <p className="text-xs text-muted-foreground">Sign in to access your account</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => router.push('/auth')} 
                      className="cursor-pointer py-2 sm:py-3 focus:bg-primary/5 focus:text-primary data-[highlighted]:bg-primary/5 data-[highlighted]:text-primary transition-colors"
                    >
                      <User className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-primary transition-colors" />
                      <span className="text-sm sm:text-base">Sign In</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => router.push('/auth?mode=signup')} 
                      className="cursor-pointer py-2 sm:py-3 focus:bg-primary/5 focus:text-primary data-[highlighted]:bg-primary/5 data-[highlighted]:text-primary transition-colors"
                    >
                      <User className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-primary transition-colors" />
                      <span className="text-sm sm:text-base">Sign Up</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                      For Professionals
                    </DropdownMenuLabel>
                    <DropdownMenuItem 
                      onClick={handleJoinAsDoctor} 
                      className="cursor-pointer py-2 sm:py-3 focus:bg-primary/5 focus:text-primary data-[highlighted]:bg-primary/5 data-[highlighted]:text-primary transition-colors"
                    >
                      <Stethoscope className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-primary transition-colors" />
                      <div>
                        <p className="text-sm sm:text-base font-medium">For Doctors</p>
                        <p className="text-xs text-muted-foreground">Join our medical network</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleRegisterAsHospital} 
                      className="cursor-pointer py-2 sm:py-3 focus:bg-green-50 focus:text-green-700 data-[highlighted]:bg-green-50 data-[highlighted]:text-green-700 transition-colors"
                    >
                      <Building2 className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-green-600 data-[highlighted]:text-green-700 transition-colors" />
                      <div>
                        <p className="text-sm sm:text-base font-medium">For Hospitals</p>
                        <p className="text-xs text-muted-foreground">Register your facility</p>
                      </div>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;