"use client";

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
  Pill,
  Grid3X3,
  Search,
  CalendarClock,
  Trash2,
  ShoppingBag,
  Stethoscope,
  Building2,
  Store,
  Factory,
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

export type NavbarCenterSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Defaults to navigating to `/search` with the current query. */
  onSubmit?: () => void;
};

type NavbarProps = {
  centerSearch?: NavbarCenterSearchProps;
};

const Navbar: React.FC<NavbarProps> = ({ centerSearch }) => {
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

  const handleNavSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerSearch) return;
    if (centerSearch.onSubmit) {
      centerSearch.onSubmit();
      return;
    }
    const q = centerSearch.value.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
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
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 shadow-sm shadow-foreground/5 backdrop-blur-xl"
          : "bg-background/85 backdrop-blur-md"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-6">
        <div className="flex h-14 items-center justify-between gap-3 sm:h-16 lg:h-20">
          {/* Logo */}
          <div className="flex min-w-0 shrink-0 cursor-pointer items-center space-x-2 sm:space-x-3" onClick={() => router.push('/')}>
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg sm:h-10 sm:w-10">
              <Pill className="h-4 w-4 text-primary-foreground sm:h-6 sm:w-6" />
            </div>
            <span className="truncate text-lg font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent sm:text-2xl">
              PillSure
            </span>
          </div>

          {centerSearch && (
            <form
              onSubmit={handleNavSearchSubmit}
              className="mx-2 hidden min-w-0 max-w-2xl flex-1 md:block"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:left-4 sm:h-5 sm:w-5" />
                <Input
                  value={centerSearch.value}
                  onChange={(e) => centerSearch.onChange(e.target.value)}
                  placeholder={centerSearch.placeholder ?? "Search medicines, pharmacies…"}
                  className="h-10 rounded-full border-0 bg-muted pl-10 pr-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20 sm:h-11 sm:pl-11"
                  aria-label="Search"
                />
              </div>
            </form>
          )}

          {/* Right Side Actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Search Icon when no inline search */}
            {!centerSearch && (
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="hidden text-foreground/70 hover:bg-primary/5 hover:text-primary md:inline-flex rounded-full transition-all duration-200"
                onClick={() => router.push("/search")}
                aria-label="Search medicines"
              >
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}

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
                              {item.medicalStoreName ? (
                                <p className="text-xs text-muted-foreground">{item.medicalStoreName}</p>
                              ) : null}
                              <p className="text-xs tabular-nums text-muted-foreground">
                                Qty: {item.quantity} × PKR {item.unitPrice}
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
                      <div className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm font-semibold tabular-nums">
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

            {/* Guests: same profile control as logged-in users; menu includes Sign in + partner paths */}
            {!user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-primary/20 p-0 hover:ring-2 hover:ring-primary/20"
                    aria-label="Account menu"
                  >
                    <User className="mx-auto h-4 w-4 text-primary sm:h-5 sm:w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 sm:w-64" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1 p-2">
                      <p className="text-sm font-semibold sm:text-base">Account</p>
                      <p className="text-xs text-muted-foreground">Sign in to access your account</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer py-2 sm:py-3"
                    onClick={() => router.push("/auth")}
                  >
                    <User className="mr-2 h-4 w-4 text-muted-foreground sm:mr-3 sm:h-[1.05rem] sm:w-[1.05rem]" />
                    <span className="text-sm sm:text-base">Sign In</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    For Professionals
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="cursor-pointer py-2 sm:py-3"
                    onClick={() => router.push("/auth?role=doctor&mode=signup")}
                  >
                    <Stethoscope className="mr-2 h-4 w-4 text-muted-foreground sm:mr-3" />
                    <div>
                      <p className="text-sm font-medium sm:text-base">For Doctors</p>
                      <p className="text-xs text-muted-foreground">Join our medical network</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer py-2 sm:py-3"
                    onClick={() => router.push("/auth?role=hospital&mode=signup")}
                  >
                    <Building2 className="mr-2 h-4 w-4 text-muted-foreground sm:mr-3" />
                    <div>
                      <p className="text-sm font-medium sm:text-base">For Hospitals</p>
                      <p className="text-xs text-muted-foreground">Register your facility</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Shops &amp; manufacturing
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="cursor-pointer py-2 sm:py-3"
                    onClick={() => router.push("/auth?role=medical_store&mode=signup")}
                  >
                    <Store className="mr-2 h-4 w-4 text-muted-foreground sm:mr-3" />
                    <div>
                      <p className="text-sm font-medium sm:text-base">Open a medical store</p>
                      <p className="text-xs text-muted-foreground">Retail onboarding &amp; marketplace listing</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer py-2 sm:py-3"
                    onClick={() => router.push("/auth?role=manufacturer&mode=signup")}
                  >
                    <Factory className="mr-2 h-4 w-4 text-muted-foreground sm:mr-3" />
                    <div>
                      <p className="text-sm font-medium sm:text-base">Manufacturing</p>
                      <p className="text-xs text-muted-foreground">Wholesale catalog &amp; partner stores</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full p-0 hover:ring-2 hover:ring-primary/20 transition-all">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold shadow-lg text-xs sm:text-sm">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </div>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 sm:w-64" align="end" forceMount>
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
                        className="cursor-pointer py-2 sm:py-3"
                      >
                        <Grid3X3 className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                        <span className="text-sm sm:text-base">Dashboard</span>
                      </DropdownMenuItem>
                    ) : (
                      <>
                        {normalizeRole(user?.role) === 'patient' && (
                          <DropdownMenuItem
                            onClick={() => router.push('/appointments')}
                            className="cursor-pointer py-2 sm:py-3"
                          >
                            <CalendarClock className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                            <span className="text-sm sm:text-base">My Appointments</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => router.push('/orders')}
                          className="cursor-pointer py-2 sm:py-3"
                        >
                          <ShoppingCart className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                          <span className="text-sm sm:text-base">My Orders</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={logout} className="cursor-pointer py-2 sm:py-3">
                      <LogOut className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="text-sm sm:text-base">Log out</span>
                    </DropdownMenuItem>
                  </>
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          </div>
        </div>

        {centerSearch && (
          <form onSubmit={handleNavSearchSubmit} className="border-t border-border/40 pb-3 pt-3 md:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={centerSearch.value}
                onChange={(e) => centerSearch.onChange(e.target.value)}
                placeholder={centerSearch.placeholder ?? "Search medicines, pharmacies…"}
                className="h-10 rounded-full border-0 bg-muted pl-10 pr-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                aria-label="Search"
              />
            </div>
          </form>
        )}
      </div>
    </nav>
  );
};

export default Navbar;