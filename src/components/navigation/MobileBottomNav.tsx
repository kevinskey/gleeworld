import { Library, Home, MessageCircle, Disc3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useIsPhone } from '@/hooks/use-mobile';
import { MusicalToolkit } from '@/components/musical-toolkit/MusicalToolkit';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  className?: string;
}

export const MobileBottomNav = ({ className }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPhone = useIsPhone();

  if (!isPhone) return null;
  if (typeof document === 'undefined') return null;

  const isActive = (path: string) => location.pathname === path;

  // Portal to document.body so the bar is always anchored to the visual
  // viewport. If MobileBottomNav rendered inline inside DashboardShell,
  // any ancestor with `transform`, `filter`, `will-change`, `contain`,
  // or `backdrop-filter` (we use these on a few studio + viewer surfaces)
  // would silently become the containing block for `position: fixed`
  // and the bar would scroll up with content on swipe. The portal moves
  // it out of every page wrapper and into the body so the initial
  // containing block (= viewport) wins. We also pin via the bottom
  // safe-area inset rather than depending on the scroll position.
  return createPortal(
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border shadow-2xl",
        "pointer-events-auto",
        className
      )}
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        // Promote to its own GPU layer so iOS WKWebView doesn't repaint
        // it against the document scroll position during momentum
        // scrolling — that's the visual glitch the user saw as
        // "footer goes up on swipe". (Omitting `will-change: transform`
        // on purpose: keeping a permanent compositing hint here has
        // been seen to starve other WKWebView paints on long pages.)
        transform: 'translateZ(0)',
      }}
    >
      <div className="flex items-center justify-evenly w-full h-14 px-4 bg-background">
        {/* Home / Command Center */}
        <button
          onClick={() => navigate('/dashboard')}
          className={cn(
            "relative flex items-center justify-center w-10 h-10 rounded-full transition-all",
            isActive('/dashboard')
              ? "text-primary bg-primary/10"
              : "text-foreground hover:bg-muted"
          )}
          aria-label="Command Center"
        >
          <Home className="h-5 w-5" />
        </button>

        {/* Messenger */}
        <button
          onClick={() => navigate('/messenger')}
          className={cn(
            "relative flex items-center justify-center w-10 h-10 rounded-full transition-all",
            location.pathname.startsWith('/messenger')
              ? "text-primary bg-primary/10"
              : "text-foreground hover:bg-muted"
          )}
          aria-label="Messenger"
        >
          <MessageCircle className="h-5 w-5" />
        </button>

        {/* Music Toolkit */}
        <div className="flex items-center justify-center w-10 h-10 text-foreground">
          <MusicalToolkit className="!p-0 [&_svg]:!h-6 [&_svg]:!w-6" />
        </div>

        {/* Viewer — the score reader (forScore-style). The library icon
         * doubles as the entry into the viewer per UX: tap the books
         * to open the reader, not the library index. */}
        <button
          onClick={() => navigate('/dashboard/viewer')}
          className={cn(
            "relative flex items-center justify-center w-10 h-10 rounded-full transition-all",
            location.pathname.startsWith('/dashboard/viewer')
              ? "text-primary bg-primary/10"
              : "text-foreground hover:bg-muted"
          )}
          aria-label="Viewer"
        >
          <Library className="h-5 w-5" />
        </button>

        {/* Studio — multi-track recording / composition. Native AVAudio
         * engine path on iOS, Tone.js fallback on web. */}
        <button
          onClick={() => navigate('/studio')}
          className={cn(
            "relative flex items-center justify-center w-10 h-10 rounded-full transition-all",
            location.pathname.startsWith('/studio')
              ? "text-primary bg-primary/10"
              : "text-foreground hover:bg-muted"
          )}
          aria-label="Studio"
        >
          <Disc3 className="h-5 w-5" />
        </button>
      </div>
    </nav>,
    document.body,
  );
};
