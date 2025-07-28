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

  // Add global style to hide sheet overlay
  const overlayStyle = `
    [data-radix-dialog-overlay] {
      background: transparent !important;
      backdrop-filter: none !important;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: overlayStyle }} />
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
            <div className="flex items-center gap-4 relative z-[111]">
              <div className="flex flex-col">
                <span className="text-gray-900 font-bold text-lg sm:text-xl lg:text-2xl whitespace-nowrap leading-tight">
                  GleeWorld
                </span>
                <span className="text-gray-700 text-xs sm:text-sm font-medium whitespace-nowrap leading-tight -mt-1">
                  Spelman Glee Club
                </span>
              </div>
              <HeaderClock />
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
            
            {/* Friendly Mobile Menu - Non-scary dropdown */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="sm:hidden">
                <MusicStaffMenu onClick={() => setIsOpen(!isOpen)} />
              </SheetTrigger>
              <SheetContent 
                side="top" 
                className="max-w-xs w-80 mx-auto mt-16 bg-white/90 backdrop-blur-md border border-white/30 shadow-lg rounded-lg z-[110] data-[state=open]:animate-none data-[state=closed]:animate-none [&_~_[data-radix-dialog-overlay]]:bg-transparent"
                style={{
                  position: 'fixed',
                  top: '4rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  height: 'auto',
                  maxHeight: '70vh',
                  transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
                  animation: 'none',
                }}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <div className="flex flex-col gap-4 py-4 animate-fade-in">
                  <div className="flex items-center justify-center gap-2 pb-2 border-b border-gray-200/50">
                    <Music className="h-5 w-5 text-spelman-blue-dark" />
                    <span className="font-semibold text-base text-gray-800">Menu</span>
                  </div>
                  
                  <nav className="flex flex-col gap-1">
                    <ResponsiveNavigation mobile onItemClick={() => setIsOpen(false)} />
                  </nav>
                  
                  <div className="pt-2 border-t border-gray-200/50">
                    <Button asChild className="w-full bg-spelman-blue-dark hover:bg-spelman-blue-light" size="sm" onClick={() => setIsOpen(false)}>
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
    </>
  );
};