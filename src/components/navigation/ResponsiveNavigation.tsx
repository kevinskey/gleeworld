import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const publicNavItems = [
  { href: "/", label: "Home", shortLabel: "Home" },
  { href: "/about", label: "About", shortLabel: "About" },
  { href: "/public-calendar", label: "Events", shortLabel: "Events" },
  { href: "/booking-request", label: "Book Us", shortLabel: "Book" },
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
    <nav className="hidden lg:flex items-center">
      {/* Large screens - Full labels with generous spacing */}
      <div className="hidden xl:flex items-center gap-12 2xl:gap-16">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "px-4 py-2 rounded-lg text-base font-medium transition-all duration-200",
              "text-gray-700 hover:text-gray-900 hover:bg-white/20 backdrop-blur-sm",
              isActivePath(item.href) && "text-gray-900 bg-white/30 backdrop-blur-sm"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Medium-Large screens - Short labels with normal size */}
      <div className="hidden lg:flex xl:hidden items-center gap-5">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "text-gray-700 hover:text-gray-900 hover:bg-white/20 backdrop-blur-sm",
              isActivePath(item.href) && "text-gray-900 bg-white/30 backdrop-blur-sm"
            )}
          >
            {item.shortLabel}
          </Link>
        ))}
      </div>

      {/* Small-Medium screens - Compact labels with readable size */}
      <div className="flex md:flex lg:hidden items-center gap-2">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "px-3 py-2 rounded text-base font-medium transition-all duration-200",
              "text-gray-700 hover:text-gray-900 hover:bg-white/20 backdrop-blur-sm",
              isActivePath(item.href) && "text-gray-900 bg-white/30 backdrop-blur-sm"
            )}
            title={item.label}
          >
            {item.shortLabel}
          </Link>
        ))}
      </div>
    </nav>
  );
};