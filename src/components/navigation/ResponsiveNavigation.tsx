import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const publicNavItems = [
  { href: "/", label: "Home", shortLabel: "Home" },
  { href: "/glee-academy", label: "Glee Academy", shortLabel: "Academy" },
  { href: "/public-calendar", label: "Calendar", shortLabel: "Calendar" },
  { href: "/shop", label: "Shop", shortLabel: "Shop" },
  { href: "/booking-request", label: "Book Us", shortLabel: "Book" },
  { href: "/press-kit", label: "Press Kit", shortLabel: "Press" },
];

interface ResponsiveNavigationProps {
  mobile?: boolean;
  onItemClick?: () => void;
  variant?: 'default' | 'spelman-blue';
}

export const ResponsiveNavigation = ({ mobile = false, onItemClick, variant = 'default' }: ResponsiveNavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const isSpelmanBlue = variant === 'spelman-blue';

  const isActivePath = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" || location.pathname === "/landing";
    }
    return location.pathname === path;
  };

  const handleAuthAction = async () => {
    if (user) {
      await signOut();
      navigate('/', { replace: true });
    }
    onItemClick?.();
  };

  if (mobile) {
    return (
      <>
        {publicNavItems.map((item) => {
          const isActive = isActivePath(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onItemClick}
              style={{ color: isActive ? '#ffffff' : '#111827' }}
              className={cn(
                "flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 w-full justify-start",
                isActive 
                  ? "bg-[#003666] hover:bg-[#002244]" 
                  : "hover:bg-gray-100"
              )}
            >
              {item.label}
            </Link>
          );
        })}
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
                    "text-[#003666] hover:text-[#002244] hover:bg-accent/10",
                    isActivePath(item.href) && "text-[#002244] bg-accent/20 font-semibold"
                  )
            )}
          >
            {item.label}
          </Link>
        ))}
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
                    "text-[#003666] hover:text-[#002244] hover:bg-accent/10",
                    isActivePath(item.href) && "text-[#002244] bg-accent/20 font-semibold"
                  )
            )}
          >
            {item.shortLabel}
          </Link>
        ))}
      </div>
    </nav>
  );
};
