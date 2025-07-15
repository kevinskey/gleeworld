import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Calendar, ShoppingBag, FileText, Info, Music } from "lucide-react";
import { cn } from "@/lib/utils";

const publicNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/about", label: "About", icon: Info },
  { href: "/public-calendar", label: "Events", icon: Calendar },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/press-kit", label: "Press Kit", icon: FileText },
];

export const PublicHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActivePath = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" || location.pathname === "/landing";
    }
    return location.pathname === path;
  };

  const NavItems = ({ mobile = false, onItemClick }: { mobile?: boolean; onItemClick?: () => void }) => (
    <>
      {publicNavItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          onClick={onItemClick}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            mobile 
              ? "text-foreground hover:bg-accent w-full justify-start" 
              : "text-gray-700 hover:text-gray-900 hover:bg-gray-100",
            isActivePath(item.href) && (mobile 
              ? "bg-accent text-accent-foreground" 
              : "text-gray-900 bg-gray-100")
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img 
              src="/lovable-uploads/80d39e41-12f3-4266-8d7a-b1d3621bbf58.png" 
              alt="Spelman College Glee Club" 
              className="w-8 h-8 object-contain filter brightness-0 invert brightness-125"
            />
            <span className="text-gray-900 font-bold text-xl whitespace-nowrap">
              Spelman Glee Club
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavItems />
          </nav>

          {/* Auth Button and Mobile Menu */}
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="sm" className="hidden sm:flex">
              <Link to="/auth">Sign In</Link>
            </Button>
            
            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-gray-100">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-6 mt-6">
                  <div className="flex items-center gap-2">
                    <Music className="h-6 w-6" />
                    <span className="font-bold text-lg">Spelman Glee Club</span>
                  </div>
                  
                  <nav className="flex flex-col gap-2">
                    <NavItems mobile onItemClick={() => setIsOpen(false)} />
                  </nav>
                  
                  <div className="pt-4 border-t">
                    <Button asChild className="w-full" onClick={() => setIsOpen(false)}>
                      <Link to="/auth">Sign In</Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};