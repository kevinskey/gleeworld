import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Music } from "lucide-react";
import { ResponsiveNavigation } from "@/components/navigation/ResponsiveNavigation";

export const PublicHeader = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo - Responsive sizing */}
          <Link to="/" className="flex items-center gap-1 sm:gap-2 flex-shrink-0 min-w-0">
            <img 
              src="/lovable-uploads/80d39e41-12f3-4266-8d7a-b1d3621bbf58.png" 
              alt="Spelman College Glee Club" 
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain filter brightness-0 invert brightness-125 flex-shrink-0"
            />
            <span className="text-gray-900 font-bold text-sm sm:text-lg lg:text-xl whitespace-nowrap truncate">
              <span className="hidden sm:inline">Spelman Glee Club</span>
              <span className="sm:hidden">Glee Club</span>
            </span>
          </Link>
          
          {/* Responsive Navigation - Progressive enhancement */}
          <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-center max-w-2xl mx-4">
            <ResponsiveNavigation />
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Auth Button - Responsive sizing */}
            <Button asChild variant="secondary" size="sm" className="hidden sm:flex text-xs sm:text-sm px-2 sm:px-3">
              <Link to="/auth">
                <span className="hidden lg:inline">Sign In</span>
                <span className="lg:hidden">Sign</span>
              </Link>
            </Button>
            
            {/* Mobile Menu - Only shows on very small screens */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="sm:hidden">
                <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-gray-100 p-1">
                  <Menu className="h-4 w-4" />
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
                    <ResponsiveNavigation mobile onItemClick={() => setIsOpen(false)} />
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