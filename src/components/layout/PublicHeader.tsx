import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Music, Settings } from "lucide-react";
import { ResponsiveNavigation } from "@/components/navigation/ResponsiveNavigation";
import { HeaderClock } from "@/components/ui/header-clock";
import { MusicStaffMenu } from "@/components/ui/music-staff-menu";
import { useAuth } from "@/contexts/AuthContext";

export const PublicHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

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
      <header className="bg-card border-b-2 border-border sticky top-0 z-[100] shadow-lg">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 py-3">
          {/* Logo with Clock - Restored beautiful design */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0 relative z-[110] hover:scale-105 transition-transform duration-200">
            <img 
              src="/lovable-uploads/80d39e41-12f3-4266-8d7a-b1d3621bbf58.png" 
              alt="Spelman College Glee Club" 
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0 relative z-[111]"
            />
            <div className="flex items-center gap-4 relative z-[111]">
              <div className="flex flex-col">
                <span className="text-foreground font-bold text-lg sm:text-xl lg:text-2xl whitespace-nowrap leading-tight">
                  GleeWorld
                </span>
                <span className="text-muted-foreground text-xs sm:text-sm font-medium whitespace-nowrap leading-tight -mt-1">
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
            {/* Dashboard Link for Authenticated Users */}
            {user && (
              <Button asChild variant="outline" size="sm" className="hidden lg:flex text-sm px-4 py-1">
                <Link to="/dashboard" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  My Dashboard
                </Link>
              </Button>
            )}
            
            {/* Auth Button - Responsive sizing */}
            {!user && (
              <Button asChild variant="default" size="sm" className="hidden lg:flex text-sm px-5 py-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
            
            {/* Friendly Mobile Menu - Shows below lg breakpoint */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <MusicStaffMenu onClick={() => setIsOpen(!isOpen)} />
              </SheetTrigger>
              <SheetContent 
                side="top" 
                className="max-w-xs w-80 mx-auto mt-16 bg-card border-2 border-border shadow-xl rounded-lg z-[110] data-[state=open]:animate-none data-[state=closed]:animate-none [&_~_[data-radix-dialog-overlay]]:bg-transparent"
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
                <div className="flex flex-col gap-2 py-2 animate-fade-in">
                  <div className="flex items-center justify-center gap-2 pb-1 border-b border-border">
                    <Music className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm text-foreground">Menu</span>
                  </div>
                  
                  <nav className="flex flex-col gap-0">
                    {user && (
                      <Button asChild variant="outline" size="sm" className="mb-2 text-sm justify-start">
                        <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                          <Settings className="h-4 w-4" />
                          My Dashboard
                        </Link>
                      </Button>
                    )}
                    <ResponsiveNavigation mobile onItemClick={() => setIsOpen(false)} />
                  </nav>
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