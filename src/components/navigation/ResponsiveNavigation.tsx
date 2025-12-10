import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown } from "lucide-react";

const publicNavItems = [
  { href: "/", label: "Home", shortLabel: "Home" },
  { href: "/glee-academy", label: "Glee Academy", shortLabel: "Academy" },
  { href: "/public-calendar", label: "Calendar", shortLabel: "Calendar" },
  { href: "/shop", label: "Shop", shortLabel: "Shop" },
];

const bookingDropdown = [
  { href: "/booking", label: "Office Hours" },
  { href: "/booking-request", label: "Book Us" },
];

const infoDropdown = [
  { href: "/about", label: "About" },
  { href: "/press-kit", label: "Press Kit" },
];

interface ResponsiveNavigationProps {
  mobile?: boolean;
  onItemClick?: () => void;
  variant?: 'default' | 'spelman-blue';
}

export const ResponsiveNavigation = ({ mobile = false, onItemClick, variant = 'default' }: ResponsiveNavigationProps) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  
  const isSpelmanBlue = variant === 'spelman-blue';

  const isActivePath = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" || location.pathname === "/landing";
    }
    return location.pathname === path;
  };

  const isDropdownActive = (items: { href: string }[]) => {
    return items.some(item => isActivePath(item.href));
  };

  const handleAuthAction = async () => {
    if (user) {
      await signOut();
    }
    onItemClick?.();
  };

  if (mobile) {
    return (
      <>
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onItemClick}
            className={cn(
              "flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "text-foreground hover:bg-accent w-full justify-start",
              isActivePath(item.href) && "bg-accent text-accent-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
        
        {/* Mobile Booking Dropdown */}
        <div className="w-full">
          <button
            onClick={() => setBookingOpen(!bookingOpen)}
            className={cn(
              "flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 w-full",
              "text-foreground hover:bg-accent",
              isDropdownActive(bookingDropdown) && "bg-accent text-accent-foreground"
            )}
          >
            Booking
            <ChevronDown className={cn("h-4 w-4 transition-transform", bookingOpen && "rotate-180")} />
          </button>
          {bookingOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {bookingDropdown.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onItemClick}
                  className={cn(
                    "flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    "text-foreground hover:bg-accent w-full justify-start",
                    isActivePath(item.href) && "bg-accent text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Info Dropdown */}
        <div className="w-full">
          <button
            onClick={() => setInfoOpen(!infoOpen)}
            className={cn(
              "flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 w-full",
              "text-foreground hover:bg-accent",
              isDropdownActive(infoDropdown) && "bg-accent text-accent-foreground"
            )}
          >
            Info
            <ChevronDown className={cn("h-4 w-4 transition-transform", infoOpen && "rotate-180")} />
          </button>
          {infoOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {infoDropdown.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onItemClick}
                  className={cn(
                    "flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    "text-foreground hover:bg-accent w-full justify-start",
                    isActivePath(item.href) && "bg-accent text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        
        {/* Dynamic Auth Button */}
        {user ? (
          <button
            onClick={handleAuthAction}
            className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90 w-full justify-start mt-1"
          >
            Sign Out
          </button>
        ) : (
          <Link
            to="/auth"
            onClick={onItemClick}
            className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90 w-full justify-start mt-1"
          >
            Sign In
          </Link>
        )}
      </>
    );
  }

  return (
    <nav className="hidden lg:flex items-center">
      {/* Large screens - Full labels with generous spacing */}
      <div className="hidden xl:flex items-center gap-12 2xl:gap-20 flex-nowrap">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "px-4 py-2 rounded text-base font-medium transition-all duration-200",
              isSpelmanBlue 
                ? cn(
                    "text-white/80 hover:text-white hover:bg-white/10",
                    isActivePath(item.href) && "text-white bg-[#0066CC] font-semibold"
                  )
                : cn(
                    "text-foreground hover:text-primary hover:bg-accent/10",
                    isActivePath(item.href) && "text-primary bg-accent/20 font-semibold"
                  )
            )}
          >
            {item.label}
          </Link>
        ))}
        
        {/* Desktop Booking Dropdown */}
        <div className="relative group">
          <button
            onMouseEnter={() => setBookingOpen(true)}
            onMouseLeave={() => setBookingOpen(false)}
            className={cn(
              "flex items-center gap-1 px-4 py-2 rounded text-base font-medium transition-all duration-200",
              isSpelmanBlue
                ? cn(
                    "text-white/80 hover:text-white hover:bg-white/10",
                    isDropdownActive(bookingDropdown) && "text-white bg-[#0066CC] font-semibold"
                  )
                : cn(
                    "text-foreground hover:text-primary hover:bg-accent/10",
                    isDropdownActive(bookingDropdown) && "text-primary bg-accent/20 font-semibold"
                  )
            )}
          >
            Booking
            <ChevronDown className="h-4 w-4" />
          </button>
          {bookingOpen && (
            <div
              onMouseEnter={() => setBookingOpen(true)}
              onMouseLeave={() => setBookingOpen(false)}
              className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-2xl z-[1100] min-w-[180px] backdrop-blur-sm"
            >
              {bookingDropdown.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "block px-4 py-3 text-sm font-medium transition-all duration-200 first:rounded-t-lg last:rounded-b-lg",
                    "text-foreground hover:bg-accent hover:text-accent-foreground",
                    isActivePath(item.href) && "bg-accent text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Info Dropdown */}
        <div className="relative group">
          <button
            onMouseEnter={() => setInfoOpen(true)}
            onMouseLeave={() => setInfoOpen(false)}
            className={cn(
              "flex items-center gap-1 px-4 py-2 rounded text-base font-medium transition-all duration-200",
              isSpelmanBlue
                ? cn(
                    "text-white/80 hover:text-white hover:bg-white/10",
                    isDropdownActive(infoDropdown) && "text-white bg-[#0066CC] font-semibold"
                  )
                : cn(
                    "text-foreground hover:text-primary hover:bg-accent/10",
                    isDropdownActive(infoDropdown) && "text-primary bg-accent/20 font-semibold"
                  )
            )}
          >
            Info
            <ChevronDown className="h-4 w-4" />
          </button>
          {infoOpen && (
            <div
              onMouseEnter={() => setInfoOpen(true)}
              onMouseLeave={() => setInfoOpen(false)}
              className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-2xl z-[1100] min-w-[180px] backdrop-blur-sm"
            >
              {infoDropdown.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "block px-4 py-3 text-sm font-medium transition-all duration-200 first:rounded-t-lg last:rounded-b-lg",
                    "text-foreground hover:bg-accent hover:text-accent-foreground",
                    isActivePath(item.href) && "bg-accent text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Medium-Large screens - Short labels with normal size */}
      <div className="hidden lg:flex xl:hidden items-center gap-4 flex-nowrap">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "px-3 py-2 rounded text-sm font-medium transition-all duration-200",
              isSpelmanBlue
                ? cn(
                    "text-white/80 hover:text-white hover:bg-white/10",
                    isActivePath(item.href) && "text-white bg-[#0066CC] font-semibold"
                  )
                : cn(
                    "text-foreground hover:text-primary hover:bg-accent/10",
                    isActivePath(item.href) && "text-primary bg-accent/20 font-semibold"
                  )
            )}
          >
            {item.shortLabel}
          </Link>
        ))}
        
        {/* Medium Screen Booking Dropdown */}
        <div className="relative">
          <button
            onMouseEnter={() => setBookingOpen(true)}
            onMouseLeave={() => setBookingOpen(false)}
            className={cn(
              "flex items-center gap-1 px-3 py-2 rounded text-sm font-medium transition-all duration-200",
              isSpelmanBlue
                ? cn(
                    "text-white/80 hover:text-white hover:bg-white/10",
                    isDropdownActive(bookingDropdown) && "text-white bg-[#0066CC] font-semibold"
                  )
                : cn(
                    "text-foreground hover:text-primary hover:bg-accent/10",
                    isDropdownActive(bookingDropdown) && "text-primary bg-accent/20 font-semibold"
                  )
            )}
          >
            Booking
            <ChevronDown className="h-3 w-3" />
          </button>
          {bookingOpen && (
            <div
              onMouseEnter={() => setBookingOpen(true)}
              onMouseLeave={() => setBookingOpen(false)}
              className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-2xl z-[1100] min-w-[160px] backdrop-blur-sm"
            >
              {bookingDropdown.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "block px-3 py-2 text-sm font-medium transition-all duration-200 first:rounded-t-lg last:rounded-b-lg",
                    "text-foreground hover:bg-accent hover:text-accent-foreground",
                    isActivePath(item.href) && "bg-accent text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Medium Screen Info Dropdown */}
        <div className="relative">
          <button
            onMouseEnter={() => setInfoOpen(true)}
            onMouseLeave={() => setInfoOpen(false)}
            className={cn(
              "flex items-center gap-1 px-3 py-2 rounded text-sm font-medium transition-all duration-200",
              isSpelmanBlue
                ? cn(
                    "text-white/80 hover:text-white hover:bg-white/10",
                    isDropdownActive(infoDropdown) && "text-white bg-[#0066CC] font-semibold"
                  )
                : cn(
                    "text-foreground hover:text-primary hover:bg-accent/10",
                    isDropdownActive(infoDropdown) && "text-primary bg-accent/20 font-semibold"
                  )
            )}
          >
            Info
            <ChevronDown className="h-3 w-3" />
          </button>
          {infoOpen && (
            <div
              onMouseEnter={() => setInfoOpen(true)}
              onMouseLeave={() => setInfoOpen(false)}
              className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-2xl z-[1100] min-w-[160px] backdrop-blur-sm"
            >
              {infoDropdown.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "block px-3 py-2 text-sm font-medium transition-all duration-200 first:rounded-t-lg last:rounded-b-lg",
                    "text-foreground hover:bg-accent hover:text-accent-foreground",
                    isActivePath(item.href) && "bg-accent text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};