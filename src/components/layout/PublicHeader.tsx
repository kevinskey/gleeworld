import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Music, Settings } from "lucide-react";
import { ResponsiveNavigation } from "@/components/navigation/ResponsiveNavigation";
import { HeaderClock } from "@/components/ui/header-clock";
import { MusicStaffMenu } from "@/components/ui/music-staff-menu";

import { useAuth } from "@/contexts/AuthContext";

export const PublicHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const [hideForAnnotation, setHideForAnnotation] = useState(false);
  useEffect(() => {
    const handler = (e: any) => setHideForAnnotation(!!e.detail?.active);
    window.addEventListener('annotationModeChange', handler as any);
    setHideForAnnotation(document.body.classList.contains('annotation-mode'));
    return () => window.removeEventListener('annotationModeChange', handler as any);
  }, []);

  // Add global style to hide sheet overlay and improve iOS touch handling
  const overlayStyle = `
    [data-radix-dialog-overlay] {
      background: transparent !important;
      backdrop-filter: none !important;
    }

    /* iOS Safari touch fixes */
    button[aria-label="Toggle mobile menu"] {
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
      touch-action: manipulation;
      cursor: pointer;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: overlayStyle }} />
      <header className={`bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm ${hideForAnnotation ? 'hidden' : ''}`}>
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 lg:h-20 min-w-0 gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 lg:gap-3 min-w-0 flex-shrink-0">
              <img 
                src="/lovable-uploads/80d39e41-12f3-4266-8d7a-b1d3621bbf58.png" 
                alt="Spelman College Glee Club" 
                className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-slate-900 truncate">GleeWorld</h1>
              </div>
            </Link>
            
            {/* Center Navigation */}
            <div className="hidden lg:flex">
              <ResponsiveNavigation />
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Fan Auth Buttons */}
              {!user && (
                <div className="hidden md:flex items-center gap-2">
                  <Button variant="outline" asChild className="text-sm lg:text-base px-3 lg:px-4 py-1.5 lg:py-2">
                    <Link to="/auth">Sign In</Link>
                  </Button>
                  <Button asChild className="text-sm lg:text-base px-3 lg:px-4 py-1.5 lg:py-2 bg-primary hover:bg-primary/90 whitespace-nowrap">
                    <Link to="/auth?mode=signup&role=fan">Join as Fan</Link>
                  </Button>
                </div>
              )}
            
            {/* Friendly Mobile Menu - Shows below lg breakpoint */}
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild className="lg:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-700 hover:bg-gray-100/50 transition-all duration-200 p-2"
                  onClick={() => setIsOpen(true)}
                  aria-label="Toggle mobile menu"
                >
                  <div className="flex flex-col justify-center items-center w-6 h-6 gap-1">
                    {/* 5 lines like music staff */}
                    <div className="w-7 h-0.5 bg-current transition-all duration-200 hover:w-8"></div>
                    <div className="w-7 h-0.5 bg-current transition-all duration-200 hover:w-8"></div>
                    <div className="w-7 h-0.5 bg-current transition-all duration-200 hover:w-8"></div>
                    <div className="w-7 h-0.5 bg-current transition-all duration-200 hover:w-8"></div>
                    <div className="w-7 h-0.5 bg-current transition-all duration-200 hover:w-8"></div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={8}
                avoidCollisions
                collisionPadding={8}
                className="w-[92vw] sm:w-80 max-w-sm p-3 bg-background border border-border rounded-lg shadow-xl z-[9999] max-h-[80vh] overflow-y-auto"
              >
                <div className="flex items-center justify-center gap-2 pb-2 border-b border-border">
                  <Music className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm text-foreground">Menu</span>
                </div>
                <nav className="flex flex-col gap-1 pt-3">
                  <ResponsiveNavigation mobile onItemClick={() => setIsOpen(false)} />
                  {!user && (
                    <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-border">
                      <Button variant="outline" asChild className="w-full" onClick={() => setIsOpen(false)}>
                        <Link to="/auth">Sign In</Link>
                      </Button>
                      <Button asChild className="w-full bg-primary hover:bg-primary/90" onClick={() => setIsOpen(false)}>
                        <Link to="/auth?mode=signup&role=fan">Join as Fan</Link>
                      </Button>
                    </div>
                  )}
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