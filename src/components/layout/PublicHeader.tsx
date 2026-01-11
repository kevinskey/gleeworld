/**
 * ============================================================================
 * PUBLIC HEADER - For guests/unauthenticated users on public landing pages
 * ============================================================================
 * 
 * This header is DIFFERENT from the PersistentHeader (UniversalHeader.tsx)
 * which is used for logged-in/authenticated users.
 * 
 * DESIGN SPECS:
 * - Background: Solid white (#FFFFFF)
 * - Site Title Font: Cinzel (matches PersistentHeader)
 * - Site Title Size: 90% of logo height
 * - All text/icons color: #003666 (Spelman blue)
 * - Sign In button: #003666 background with white text
 * 
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Music } from "lucide-react";
import { ResponsiveNavigation } from "@/components/navigation/ResponsiveNavigation";
import { useAuth } from "@/contexts/AuthContext";

// ============================================================================
// DESIGN CONSTANTS - Edit these to change the header appearance
// ============================================================================
const HEADER_STYLES = {
  // Brand color for all text and icons
  brandColor: "#003666",
  
  // Background color
  backgroundColor: "#FFFFFF",
  
  // Title font family (must match PersistentHeader)
  titleFontFamily: "'Cinzel', serif",
  
  // Title letter spacing
  titleLetterSpacing: "0.02em",
  
  // Logo sizes at different breakpoints
  logoSizes: {
    mobile: "w-8 h-8",      // 32px
    tablet: "md:w-10 md:h-10", // 40px  
    desktop: "lg:w-12 lg:h-12" // 48px
  },
  
  // Title sizes - 90% of logo, then reduced by 10%
  titleSizes: {
    mobile: "1.62rem",   // ~26px (was 1.8rem)
    tablet: "2.025rem",  // ~32px (was 2.25rem)
    desktop: "2.43rem"   // ~39px (was 2.7rem)
  }
} as const;

interface PublicHeaderProps {
  className?: string;
}

export const PublicHeader = ({ className }: PublicHeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const [hideForAnnotation, setHideForAnnotation] = useState(false);
  
  useEffect(() => {
    const handler = (e: any) => setHideForAnnotation(!!e.detail?.active);
    window.addEventListener('annotationModeChange', handler as any);
    setHideForAnnotation(document.body.classList.contains('annotation-mode'));
    return () => window.removeEventListener('annotationModeChange', handler as any);
  }, []);

  // Global styles for overlay and iOS touch handling
  const overlayStyle = `
    [data-radix-dialog-overlay] {
      background: transparent !important;
      backdrop-filter: none !important;
    }
    button[aria-label="Toggle mobile menu"] {
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
      touch-action: manipulation;
      cursor: pointer;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: overlayStyle }} />
      
      {/* Wrapper for iOS safe-area offset (PWA) */}
      <div
        className="sticky top-0 z-50 w-full"
        style={{ top: 'var(--gw-safe-top)' }}
      >
        {/* ================================================================
            MAIN HEADER ELEMENT
            ================================================================ */}
        <header 
          className={`border-b border-border/40 shadow-lg ${hideForAnnotation ? 'hidden' : ''}`}
          style={{
            backgroundColor: HEADER_STYLES.backgroundColor,
            // Ensure ALL headings (h1-h6) inside the public header use Cinzel
            // (GlobalDesignFixes uses --heading-font as the source of truth)
            ['--heading-font' as any]: 'Cinzel',
            ['--heading-weight' as any]: '500',
            ['--heading-letter-spacing' as any]: HEADER_STYLES.titleLetterSpacing,
          }}
        >
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 lg:h-18 min-w-0">
              
              {/* ============================================================
                  LOGO + SITE TITLE
                  ============================================================ */}
              <Link to="/" className="flex items-center gap-2 lg:gap-3 min-w-0 flex-shrink-0">
                {/* Logo Image - colorized to brand color #003666 */}
                <img 
                  src="/lovable-uploads/80d39e41-12f3-4266-8d7a-b1d3621bbf58.png" 
                  alt="Spelman College Glee Club" 
                  className={`${HEADER_STYLES.logoSizes.mobile} ${HEADER_STYLES.logoSizes.tablet} ${HEADER_STYLES.logoSizes.desktop} flex-shrink-0`}
                  style={{
                    filter: 'brightness(0) saturate(100%) invert(15%) sepia(100%) saturate(1500%) hue-rotate(192deg) brightness(92%) contrast(102%)'
                  }}
                />
                
                {/* Site Title - Cinzel font, 90% of logo size */}
                <span
                  style={{
                    fontFamily: "'Cinzel', serif",
                    color: HEADER_STYLES.brandColor,
                    fontSize: HEADER_STYLES.titleSizes.mobile,
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    lineHeight: 0,
                    verticalAlign: 'middle',
                  }}
                  className="whitespace-nowrap drop-shadow-sm md:!text-[2.025rem] lg:!text-[2.43rem] leading-[0] flex items-center"
                >
                  GleeWorld
                </span>
              </Link>
              
              {/* ============================================================
                  CENTER NAVIGATION (Desktop only)
                  ============================================================ */}
              <div 
                className="hidden lg:flex flex-1 justify-center"
                style={{ color: HEADER_STYLES.brandColor }}
              >
                <div className="[&_a]:!text-[#003666] [&_button]:!text-[#003666] [&_svg]:!text-[#003666]">
                  <ResponsiveNavigation variant="default" />
                </div>
              </div>

              {/* ============================================================
                  RIGHT SIDE ACTIONS
                  ============================================================ */}
              <div className="flex items-center gap-2 lg:gap-3">
                
                {/* Sign In / Join Button - Only shown when not logged in */}
                {!user && (
                  <Button 
                    asChild
                    variant="outline"
                    className="relative text-sm lg:text-base px-4 lg:px-5 py-1.5 lg:py-2 font-medium rounded-full border-2 transition-all duration-300 hover:bg-[#003666] hover:text-white"
                    style={{ 
                      borderColor: HEADER_STYLES.brandColor,
                      color: HEADER_STYLES.brandColor,
                    }}
                  >
                    <Link 
                      to="/auth" 
                      className="flex items-center gap-1.5"
                    >
                      <span>Sign In</span>
                      <span className="hidden sm:inline opacity-50">|</span>
                      <span className="hidden sm:inline">Join</span>
                    </Link>
                  </Button>
                )}
              
                {/* ============================================================
                    MOBILE MENU (Shows below lg breakpoint)
                    ============================================================ */}
                <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                  <DropdownMenuTrigger asChild className="lg:hidden">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="hover:bg-muted/50 transition-all duration-200 p-2" 
                      style={{ color: HEADER_STYLES.brandColor }}
                      onClick={() => setIsOpen(true)} 
                      aria-label="Toggle mobile menu"
                    >
                      {/* Clean 3-line hamburger menu */}
                      <div className="flex flex-col justify-center items-center w-5 h-5 gap-[5px]">
                        {[1, 2, 3].map((i) => (
                          <div 
                            key={i}
                            className="w-5 h-[2px] rounded-full transition-all duration-200"
                            style={{ backgroundColor: HEADER_STYLES.brandColor }}
                          />
                        ))}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  
                  <DropdownMenuContent 
                    align="end" 
                    side="bottom" 
                    sideOffset={20} 
                    avoidCollisions 
                    collisionPadding={8} 
                    className="w-[92vw] sm:w-80 max-w-sm p-3 bg-background border border-border rounded-lg shadow-xl z-[9999] max-h-[80vh] overflow-y-auto"
                  >
                    <div className="flex items-center justify-center gap-2 pb-2 border-b border-border">
                      <Music className="h-4 w-4" style={{ color: HEADER_STYLES.brandColor }} />
                      <span className="font-semibold text-sm text-foreground">Menu</span>
                    </div>
                    <nav className="flex flex-col gap-1 pt-3">
                      <ResponsiveNavigation mobile onItemClick={() => setIsOpen(false)} />
                      {!user && (
                        <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-border">
                          <Button 
                            asChild
                            variant="navy"
                            className="w-full"
                            onClick={() => setIsOpen(false)}
                          >
                            <Link to="/auth">Sign In / Join</Link>
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
      </div>
    </>
  );
};
