import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';

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
export const AnnouncementsFlip = ({
  className,
  direction = 'left'
}: AnnouncementsFlipProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const { themeName } = useTheme();
  
  // HBCU theme colors
  const isHbcuTheme = themeName === 'hbcu';
  const hbcuGold = '#FFDF00';
  const hbcuRed = '#8B0000';
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
      const {
        data,
        error
      } = await supabase.from('gw_announcements').select('id, title, content, created_at').not('publish_date', 'is', null).order('created_at', {
        ascending: false
      }).limit(10);
      if (!error && data) {
        setAnnouncements(data);
      }
    } catch (err) {
      console.warn('AnnouncementsFlip fetch failed:', err);
    }
  };
  if (announcements.length === 0) {
    return <span className="text-xs sm:text-sm text-muted-foreground">No announcements</span>;
  }
  const current = announcements[currentIndex];

  // Get animation classes based on direction
  const getAnimationClass = () => {
    if (direction === 'left') {
      return isFlipping ? 'animate-slide-out-left' : 'animate-slide-in-left';
    } else if (direction === 'right') {
      return isFlipping ? 'animate-slide-out-right' : 'animate-slide-in-right';
    } else {
      return isFlipping ? 'animate-flip-out' : 'animate-flip-in';
    }
  };
  return <div className={`overflow-hidden ${className || ''}`} style={{
    perspective: '400px'
  }}>
      {/* Mobile Layout - Stacked card design */}
      <div 
        className="flex lg:hidden flex-col gap-2 p-3 rounded-lg"
        style={{
          backgroundColor: isHbcuTheme ? 'transparent' : 'hsl(220,50%,15%)'
        }}
      >
        {/* Mobile announcement card */}
        <div 
          key={current.id} 
          className={`backdrop-blur-sm rounded-lg p-3 border shadow-sm overflow-x-auto scrollbar-hide ${getAnimationClass()}`} 
          style={{
            transformOrigin: 'center center',
            backgroundColor: isHbcuTheme ? 'rgba(139, 0, 0, 0.3)' : 'rgba(255,255,255,0.1)',
            borderColor: isHbcuTheme ? hbcuGold : 'rgba(255,255,255,0.2)'
          }}
        >
          <p className="text-xs whitespace-nowrap" style={{ color: isHbcuTheme ? hbcuGold : '#ffffff' }}>
            <span className="font-semibold">{current.title}:</span>{' '}
            <span style={{ opacity: 0.9 }}>{current.content}</span>
          </p>
        </div>
      </div>

      {/* Desktop Layout - Original horizontal design */}
      <div className="hidden lg:flex items-center gap-3 px-3 h-12">
        {/* Badge */}
        <div 
          className="shrink-0 relative px-6 rounded-sm text-xs font-bold uppercase tracking-wider h-10 flex items-center shadow-md border py-[20px]"
          style={{
            background: isHbcuTheme ? hbcuGold : 'linear-gradient(to bottom, #94a3b8, #64748b, #475569)',
            color: isHbcuTheme ? '#000000' : '#f1f5f9',
            borderColor: isHbcuTheme ? hbcuRed : 'rgba(71, 85, 105, 0.5)',
            textShadow: isHbcuTheme ? 'none' : '0 1px 2px rgba(0,0,0,0.3)'
          }}
        >
          {/* Rivets - only show for non-HBCU theme */}
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
          className="flex-1 overflow-hidden flex items-center justify-center py-0"
          style={{
            backgroundColor: isHbcuTheme ? 'transparent' : undefined
          }}
        >
          <div 
            key={current.id} 
            className={`text-sm sm:text-base font-medium px-4 py-2 ${getAnimationClass()}`} 
            style={{
              transformOrigin: 'center center',
              color: isHbcuTheme ? hbcuGold : undefined,
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
            }}
          >
            <span className="font-bold">{current.title}:</span> {current.content}
          </div>
        </div>
      </div>
    </div>;
};