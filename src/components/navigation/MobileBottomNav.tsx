import { Library, Home, MessageCircle, Disc3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
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

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[99999] bg-background border-t border-border shadow-2xl",
        "pointer-events-auto",
        className
      )}
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
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

        {/* Music Library */}
        <button
          onClick={() => navigate('/music-library')}
          className={cn(
            "relative flex items-center justify-center w-10 h-10 rounded-full transition-all",
            isActive('/music-library')
              ? "text-primary bg-primary/10"
              : "text-foreground hover:bg-muted"
          )}
          aria-label="Music Library"
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
    </nav>
  );
};
