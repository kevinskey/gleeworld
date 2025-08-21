import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const publicNavItems = [
  { href: "/", label: "Home", shortLabel: "Home" },
  { href: "/about", label: "About", shortLabel: "About" },
  { href: "/calendar", label: "Events", shortLabel: "Events" },
  { href: "/booking", label: "Booking", shortLabel: "Book" },
  { href: "/booking-request", label: "Book Us", shortLabel: "Book Us" },
  { href: "/shop", label: "Shop", shortLabel: "Shop" },
  { href: "/press-kit", label: "Press Kit", shortLabel: "Press" },
];

interface ResponsiveNavigationProps {
  mobile?: boolean;
  onItemClick?: () => void;
}

export const ResponsiveNavigation = ({ mobile = false, onItemClick }: ResponsiveNavigationProps) => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActivePath = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" || location.pathname === "/landing";
    }
    return location.pathname === path;
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
    <nav className="hidden md:flex items-center">
      {/* Extra Large screens - Full labels with generous spacing */}
      <div className="hidden 2xl:flex items-center gap-8">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "text-foreground hover:text-primary hover:bg-accent/10",
              isActivePath(item.href) && "text-primary bg-accent/20 font-semibold"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Large screens - Short labels with compact spacing */}
      <div className="hidden xl:flex 2xl:hidden items-center gap-4">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "px-2 py-1.5 rounded text-sm font-medium transition-all duration-200",
              "text-foreground hover:text-primary hover:bg-accent/10",
              isActivePath(item.href) && "text-primary bg-accent/20 font-semibold"
            )}
          >
            {item.shortLabel}
          </Link>
        ))}
      </div>

      {/* Medium-Large screens - Very compact short labels */}
      <div className="hidden lg:flex xl:hidden items-center gap-2">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "px-2 py-1 rounded text-xs font-medium transition-all duration-200",
              "text-foreground hover:text-primary hover:bg-accent/10",
              isActivePath(item.href) && "text-primary bg-accent/20 font-semibold"
            )}
            title={item.label}
          >
            {item.shortLabel}
          </Link>
        ))}
      </div>

      {/* Medium screens - Hide navigation, show in mobile menu only */}
    </nav>
  );
};