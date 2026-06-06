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
 * - All text/icons color: #150d26 (Brand blue)
 * - Sign In button: #150d26 background with white text
 * 
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ResponsiveNavigation } from "@/components/navigation/ResponsiveNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useBrandingSettings } from "@/hooks/useBrandingSettings";
import gleeWorldLogoCircle from "@/assets/glee-world-logo-circle.png";

// ============================================================================
// DESIGN CONSTANTS - Edit these to change the header appearance
// ============================================================================
const HEADER_STYLES = {
  // Brand color for all text and icons
  brandColor: "#FFFFFF",
  
  // Background color
  backgroundColor: "#150d26",
  
  // Title font family (must match PersistentHeader)
  titleFontFamily: "'Cinzel', serif",
  
  // Title letter spacing
  titleLetterSpacing: "0.02em",
  
  // Logo sizes at different breakpoints (30% larger)
  logoSizes: {
    mobile: "w-12 h-12",       // 48px
    tablet: "md:w-16 md:h-16", // 64px
    desktop: "lg:w-18 lg:h-18" // 72px
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

  // Branding settings — read from DB (tenant admin sets these at /admin/site-setup).
  // Falls back to window.__TENANT_CONFIG__ defaults from /tenant-bootstrap.js
  // while the query is in flight, so there's no flash on first paint.
  const { settings: branding } = useBrandingSettings();
  const tenantOrg = branding.org_name || undefined;
  const tenantLogo = branding.logo_url || undefined;
  const tenantShortName = branding.short_name || undefined;
  const siteName = tenantShortName || tenantOrg || 'GleeWorld';

  // Scale the header font down as the name gets longer so it always fits.
  // Tested against names up to ~35 chars on a 320px-wide phone.
  const nameLen = siteName.length;
  const scale =
    nameLen <= 10 ? 1
    : nameLen <= 16 ? 0.78
    : nameLen <= 24 ? 0.6
    : 0.48;
  const titleFontSize = {
    mobile: `${parseFloat(HEADER_STYLES.titleSizes.mobile) * scale}rem`,
    tablet: `${parseFloat(HEADER_STYLES.titleSizes.tablet) * scale}rem`,
    desktop: `${parseFloat(HEADER_STYLES.titleSizes.desktop) * scale}rem`,
  };
  
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
          <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="flex items-center justify-between h-16 lg:h-18 min-w-0">
              
              {/* ============================================================
                  LOGO + SITE TITLE
                  ============================================================ */}
              <Link to="/" className="flex items-center gap-2 lg:gap-3 min-w-0 flex-shrink-0">
                {/* Logo Image — tenant logoUrl wins; otherwise show a neutral monogram */}
                {tenantLogo ? (
                  <img
                    src={tenantLogo}
                    alt={siteName}
                    className={`${HEADER_STYLES.logoSizes.mobile} ${HEADER_STYLES.logoSizes.tablet} ${HEADER_STYLES.logoSizes.desktop} flex-shrink-0 object-cover rounded-full`}
                  />
                ) : tenantOrg ? (
                  <div
                    className={`${HEADER_STYLES.logoSizes.mobile} ${HEADER_STYLES.logoSizes.tablet} ${HEADER_STYLES.logoSizes.desktop} flex-shrink-0 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-white font-bold`}
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    {tenantOrg.split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                  </div>
                ) : (
                  <img
                    src="/lovable-uploads/gleeworld-logo.png?v=6"
                    alt="GleeWorld"
                    className={`${HEADER_STYLES.logoSizes.mobile} ${HEADER_STYLES.logoSizes.tablet} ${HEADER_STYLES.logoSizes.desktop} flex-shrink-0 object-cover rounded-full`}
                  />
                )}

                {/* Site Title — uses tenant org if set. Auto-shrinks for long names. */}
                <span
                  style={{
                    fontFamily: "'Cinzel', serif",
                    color: HEADER_STYLES.brandColor,
                    fontSize: `clamp(0.9rem, ${1 + scale * 1.5}vw, ${parseFloat(HEADER_STYLES.titleSizes.desktop) * scale}rem)`,
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    lineHeight: 1.1,
                  }}
                  className="drop-shadow-sm min-w-0 truncate"
                  title={tenantOrg || 'GleeWorld'}
                >
                  {siteName}
                </span>
              </Link>
              
              {/* ============================================================
                  CENTER NAVIGATION (Desktop only)
                  ============================================================ */}
              <div 
                className="hidden lg:flex flex-1 justify-center"
                style={{ color: HEADER_STYLES.brandColor }}
              >
                <div className="[&_a]:!text-white [&_button]:!text-white [&_svg]:!text-white">
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
                    variant="ghost"
                    className="relative text-xs lg:text-sm px-3 lg:px-4 py-0.5 lg:py-1.5 h-7 lg:h-auto font-medium rounded-full transition-all duration-300 text-white hover:bg-white/10 border border-white/30 hover:border-white/50"
                  >
                    <Link 
                      to="/auth" 
                      className="flex items-center gap-1"
                    >
                      <span>Sign In</span>
                      <span className="hidden sm:inline opacity-40">|</span>
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
                      size="default" 
                      className="hover:bg-muted/50 transition-all duration-200 p-2" 
                      style={{ color: HEADER_STYLES.brandColor }}
                      onClick={() => setIsOpen(true)} 
                      aria-label="Toggle mobile menu"
                    >
                      {/* Prominent 3-line hamburger menu */}
                      <div className="flex flex-col justify-center items-center w-6 h-5 gap-1.5">
                        {[1, 2, 3].map((i) => (
                          <div 
                            key={i}
                            className="w-5 h-[2.5px] rounded-full transition-all duration-200"
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
                    className="w-[92vw] sm:w-80 max-w-sm p-3 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-[80vh] overflow-y-auto"
                  >
                    <div className="flex items-center justify-center gap-2 pb-2 border-b border-gray-200">
                      <img src={gleeWorldLogoCircle} alt="GleeWorld" className="h-4 w-4" />
                      <span className="font-semibold text-sm text-gray-900">Menu</span>
                    </div>
                    <nav className="flex flex-col gap-1 pt-3">
                      <ResponsiveNavigation mobile onItemClick={() => setIsOpen(false)} />
                      <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-gray-200">
                        {user ? (
                          <Button 
                            variant="outline"
                            className="w-full text-gray-700 border-gray-300 hover:bg-gray-100"
                            onClick={() => {
                              setIsOpen(false);
                            }}
                          >
                            <Link to="/dashboard" className="w-full">My Dashboard</Link>
                          </Button>
                        ) : (
                          <Button 
                            asChild
                            className="w-full bg-[#150d26] hover:bg-[#002244] text-white"
                            onClick={() => setIsOpen(false)}
                          >
                            <Link to="/auth">Sign In / Join</Link>
                          </Button>
                        )}
                      </div>
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
