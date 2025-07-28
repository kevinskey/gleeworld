import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Music } from "lucide-react";
import { ResponsiveNavigation } from "@/components/navigation/ResponsiveNavigation";
import { HeaderClock } from "@/components/ui/header-clock";
import { MusicStaffMenu } from "@/components/ui/music-staff-menu";

export const PublicHeader = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-[100] shadow-xl">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo with Clock - Restored beautiful design */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0 relative z-[110] hover:scale-105 transition-transform duration-200">
            <img 
              src="/lovable-uploads/80d39e41-12f3-4266-8d7a-b1d3621bbf58.png" 
              alt="Spelman College Glee Club" 
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0 relative z-[111]"
            />
            <div className="flex flex-col relative z-[111]">
              <div className="flex items-center gap-2">
                <span className="text-gray-900 font-bold text-lg sm:text-xl lg:text-2xl whitespace-nowrap leading-tight">
                  GleeWorld
                </span>
                <HeaderClock className="ml-1" />
              </div>
              <span className="text-gray-700 text-xs sm:text-sm font-medium whitespace-nowrap leading-tight -mt-1">
                Spelman Glee Club
              </span>
            </div>
          </Link>
          
          {/* Center Navigation */}
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
            
            {/* Music Staff Menu - Only shows on very small screens */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="sm:hidden">
                <MusicStaffMenu onClick={() => setIsOpen(!isOpen)} />
              </SheetTrigger>
              <SheetContent side="right" className="w-72 z-[120]">
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