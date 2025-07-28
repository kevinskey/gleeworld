import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, ShoppingBag, FileText, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const publicNavItems = [
  { href: "/", label: "Home", icon: Home, shortLabel: "Home" },
  { href: "/about", label: "About", icon: Info, shortLabel: "About" },
  { href: "/public-calendar", label: "Events", icon: Calendar, shortLabel: "Events" },
  { href: "/shop", label: "Shop", icon: ShoppingBag, shortLabel: "Shop" },
  { href: "/press-kit", label: "Press Kit", icon: FileText, shortLabel: "Press" },
];

interface ResponsiveNavigationProps {
  mobile?: boolean;
  onItemClick?: () => void;
}

export const ResponsiveNavigation = ({ mobile = false, onItemClick }: ResponsiveNavigationProps) => {
  const location = useLocation();

  const isActivePath = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" || location.pathname === "/landing";
    }
    return location.pathname === path;
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
              "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200",
              "text-foreground hover:bg-accent w-full justify-start",
              isActivePath(item.href) && "bg-accent text-accent-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </>
    );
  }

  return (
    <nav className="hidden sm:flex items-center">
      {/* Large screens - Full labels */}
      <div className="hidden xl:flex items-center gap-1">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "text-gray-700 hover:text-gray-900 hover:bg-white/20 backdrop-blur-sm",
              isActivePath(item.href) && "text-gray-900 bg-white/30 backdrop-blur-sm"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </div>

      {/* Medium screens - Short labels */}
      <div className="hidden lg:flex xl:hidden items-center gap-1">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "text-gray-700 hover:text-gray-900 hover:bg-white/20 backdrop-blur-sm",
              isActivePath(item.href) && "text-gray-900 bg-white/30 backdrop-blur-sm"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.shortLabel}
          </Link>
        ))}
      </div>

      {/* Small-medium screens - Icons with minimal text */}
      <div className="hidden md:flex lg:hidden items-center gap-1">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200",
              "text-gray-700 hover:text-gray-900 hover:bg-white/20 backdrop-blur-sm",
              isActivePath(item.href) && "text-gray-900 bg-white/30 backdrop-blur-sm"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden md:inline">{item.shortLabel}</span>
          </Link>
        ))}
      </div>

      {/* Small screens - Icons only */}
      <div className="flex sm:hidden md:flex lg:hidden xl:hidden items-center gap-1">
        {publicNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center justify-center p-2 rounded-lg transition-all duration-200",
              "text-gray-700 hover:text-gray-900 hover:bg-white/20 backdrop-blur-sm",
              isActivePath(item.href) && "text-gray-900 bg-white/30 backdrop-blur-sm"
            )}
            title={item.label}
          >
            <item.icon className="h-4 w-4" />
          </Link>
        ))}
      </div>
    </nav>
  );
};