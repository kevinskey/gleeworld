import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeName } from '@/themes/themeConfig';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface AnnouncementsFlipProps {
  className?: string;
  direction?: 'left' | 'right' | 'up';
}

// Theme-specific styling for announcement cards
const getThemeStyles = (themeName: ThemeName) => {
  switch (themeName) {
    case 'hbcu':
      return {
        background: 'linear-gradient(135deg, #8B0000 0%, #a52a2a 100%)',
        borderColor: '#FFDF00',
        textColor: '#FFFFFF',
        badgeBg: '#FFDF00',
        badgeText: '#000000',
        badgeBorder: '#8B0000',
      };
    case 'spelman-blue':
      return {
        background: 'linear-gradient(135deg, hsl(201 52% 50%) 0%, hsl(201 52% 66%) 100%)',
        borderColor: 'hsl(201 52% 80%)',
        textColor: '#FFFFFF',
        badgeBg: 'linear-gradient(to bottom, hsl(201 52% 66%), hsl(201 52% 50%))',
        badgeText: '#FFFFFF',
        badgeBorder: 'hsl(201 40% 40%)',
      };
    case 'spelhouse':
      return {
        background: 'linear-gradient(135deg, hsl(210 65% 45%) 0%, hsl(352 65% 35%) 100%)',
        borderColor: 'hsl(210 50% 60%)',
        textColor: '#FFFFFF',
        badgeBg: 'linear-gradient(to bottom, hsl(210 65% 55%), hsl(210 65% 45%))',
        badgeText: '#FFFFFF',
        badgeBorder: 'hsl(352 65% 28%)',
      };
    case 'music':
      return {
        background: 'linear-gradient(135deg, hsl(210 100% 35%) 0%, hsl(180 80% 30%) 100%)',
        borderColor: 'hsl(180 100% 50%)',
        textColor: '#FFFFFF',
        badgeBg: 'linear-gradient(to bottom, hsl(210 100% 50%), hsl(210 100% 35%))',
        badgeText: '#FFFFFF',
        badgeBorder: 'hsl(180 100% 40%)',
      };
    case 'glee-world':
    default:
      return {
        background: 'linear-gradient(135deg, hsl(203 85% 50%) 0%, hsl(219 78% 31%) 100%)',
        borderColor: 'hsl(203 85% 70%)',
        textColor: '#FFFFFF',
        badgeBg: 'linear-gradient(to bottom, #94a3b8, #64748b, #475569)',
        badgeText: '#f1f5f9',
        badgeBorder: 'rgba(71, 85, 105, 0.5)',
      };
  }
};

export const AnnouncementsFlip = ({
  className,
  direction = 'left'
}: AnnouncementsFlipProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const { themeName } = useTheme();

  const themeStyles = getThemeStyles(themeName);
  const isHbcuTheme = themeName === 'hbcu';

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % announcements.length);
        setIsFlipping(false);
      }, 400);
    }, 8000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_announcements')
        .select('id, title, content, created_at')
        .not('publish_date', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error && data) {
        setAnnouncements(data);
      }
    } catch (err) {
      console.warn('AnnouncementsFlip fetch failed:', err);
    }
  };

  if (announcements.length === 0) {
    return (
      <div className={`overflow-hidden ${className || ''}`}>
        {/* Mobile Layout - Empty state */}
        <div className="flex lg:hidden">
          <div 
            className="w-full rounded-xl px-4 py-3 shadow-lg border backdrop-blur-sm"
            style={{
              background: 'hsl(var(--muted))',
              borderColor: 'hsl(var(--border))',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg opacity-50">📢</span>
              <p className="text-sm text-muted-foreground">No announcements</p>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Empty state */}
        <div className="hidden lg:flex items-center gap-3 px-3 h-12">
          <div 
            className="shrink-0 relative px-6 rounded-sm text-xs font-bold uppercase tracking-wider h-10 flex items-center shadow-md border py-[20px]"
            style={{
              background: themeStyles.badgeBg,
              color: themeStyles.badgeText,
              borderColor: themeStyles.badgeBorder,
              textShadow: isHbcuTheme ? 'none' : '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            {!isHbcuTheme && (
              <>
                <span className="absolute top-1/2 -translate-y-1/2 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 shadow-inner border border-slate-700/50" />
                <span className="absolute top-1/2 -translate-y-1/2 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 shadow-inner border border-slate-700/50" />
              </>
            )}
            <span className="relative px-1">Announcements</span>
          </div>
          <div 
            className="flex-1 overflow-hidden flex items-center justify-center py-0 bg-muted rounded-md"
            style={{ backgroundColor: isHbcuTheme ? 'transparent' : undefined }}
          >
            <div className="text-sm text-muted-foreground px-4 py-2">
              No announcements
            </div>
          </div>
        </div>
      </div>
    );
  }

  const current = announcements[currentIndex];

  const getAnimationClass = () => {
    if (direction === 'left') {
      return isFlipping ? 'animate-slide-out-left' : 'animate-slide-in-left';
    } else if (direction === 'right') {
      return isFlipping ? 'animate-slide-out-right' : 'animate-slide-in-right';
    } else {
      return isFlipping ? 'animate-flip-out' : 'animate-flip-in';
    }
  };

  return (
    <div className={`overflow-hidden ${className || ''}`} style={{ perspective: '400px' }}>
      {/* Mobile Layout - Theme-aware card design */}
      <div className="flex lg:hidden">
        <div 
          key={current.id} 
          className={`w-full rounded-xl px-4 py-3 shadow-lg border backdrop-blur-sm ${getAnimationClass()}`}
          style={{
            transformOrigin: 'center center',
            background: themeStyles.background,
            borderColor: themeStyles.borderColor,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📢</span>
            <p className="text-sm font-medium leading-snug" style={{ color: themeStyles.textColor }}>
              <span className="font-bold">{current.title}:</span>{' '}
              <span style={{ opacity: 0.95 }}>{current.content}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Theme-aware horizontal design */}
      <div className="hidden lg:flex items-center gap-3 px-3 h-12">
        {/* Badge */}
        <div 
          className="shrink-0 relative px-6 rounded-sm text-xs font-bold uppercase tracking-wider h-10 flex items-center shadow-md border py-[20px]"
          style={{
            background: themeStyles.badgeBg,
            color: themeStyles.badgeText,
            borderColor: themeStyles.badgeBorder,
            textShadow: isHbcuTheme ? 'none' : '0 1px 2px rgba(0,0,0,0.3)'
          }}
        >
          {!isHbcuTheme && (
            <>
              <span className="absolute top-1/2 -translate-y-1/2 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 shadow-inner border border-slate-700/50" />
              <span className="absolute top-1/2 -translate-y-1/2 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 shadow-inner border border-slate-700/50" />
            </>
          )}
          <span className="relative px-1">Announcements</span>
        </div>

        {/* Slide/Flip content */}
        <div 
          className="flex-1 overflow-hidden flex items-center justify-center py-0 bg-muted rounded-md"
          style={{ backgroundColor: isHbcuTheme ? 'transparent' : undefined }}
        >
          <div 
            key={current.id} 
            className={`text-sm sm:text-base font-medium px-4 py-2 ${getAnimationClass()}`}
            style={{
              transformOrigin: 'center center',
              color: isHbcuTheme ? '#FFDF00' : undefined,
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
            }}
          >
            <span className="font-bold">{current.title}:</span> {current.content}
          </div>
        </div>
      </div>
    </div>
  );
};
