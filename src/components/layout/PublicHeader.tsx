import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Music, Settings } from "lucide-react";
import { ResponsiveNavigation } from "@/components/navigation/ResponsiveNavigation";
import { HeaderClock } from "@/components/ui/header-clock";
import { MusicStaffMenu } from "@/components/ui/music-staff-menu";
import { HeaderRadioPlayer } from "@/components/radio/HeaderRadioPlayer";
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
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 lg:gap-4">
              <img 
                src="/lovable-uploads/80d39e41-12f3-4266-8d7a-b1d3621bbf58.png" 
                alt="Spelman College Glee Club" 
                className="w-10 h-10 lg:w-12 lg:h-12"
              />
              <div>
                <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold text-foreground">GleeWorld</h1>
              </div>
            </Link>
            
            {/* Center Navigation */}
            <div className="hidden md:flex">
              <ResponsiveNavigation />
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Radio Player */}
              <HeaderRadioPlayer />
              
              {/* Dashboard Link for Authenticated Users */}
              {user && (
                <Button asChild variant="outline" className="hidden md:flex lg:text-base">
                  <Link to="/dashboard">
                    <Settings className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                    Dashboard
                  </Link>
                </Button>
              )}
              
              {/* Auth Button */}
              {!user && (
                <Button asChild className="hidden md:flex lg:text-base lg:px-6 lg:py-2">
                  <Link to="/auth">Sign In</Link>
                </Button>
              )}
            
            {/* Friendly Mobile Menu - Shows below lg breakpoint */}
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild className="2xl:hidden">
                <MusicStaffMenu />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={0}
                className="w-80 p-2 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl z-[60]"
              >
                <div className="flex items-center justify-center gap-2 pb-1 border-b border-border">
                  <Music className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm text-foreground">Menu</span>
                </div>
                <nav className="flex flex-col gap-0 pt-2">
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
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
           </div>
        </div>
    </header>
    </>
  );
};