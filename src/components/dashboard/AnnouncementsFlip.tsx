import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export const AnnouncementsFlip = ({ className, direction = 'left' }: AnnouncementsFlipProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (announcements.length <= 1) return;

    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
        setIsFlipping(false);
      }, 400);
    }, 8000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('gw_announcements')
      .select('id, title, content, created_at')
      .not('publish_date', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setAnnouncements(data);
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

  return (
    <div 
      className={`overflow-hidden ${className || ''}`} 
      style={{ perspective: '400px' }}
    >
      {/* Mobile Layout - Stacked card design */}
      <div className="flex lg:hidden flex-col gap-2 p-2">
        <div className="flex items-center gap-2">
          {/* Compact badge */}
          <div className="shrink-0 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide
            bg-gradient-to-b from-primary/80 to-primary
            text-primary-foreground shadow-sm"
          >
            📢 News
          </div>
          {/* Dot indicators */}
          <div className="flex gap-1 ml-auto">
            {announcements.slice(0, 5).map((_, idx) => (
              <span 
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx === currentIndex % 5 ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Mobile announcement card */}
        <div
          key={current.id}
          className={`bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50 shadow-sm ${getAnimationClass()}`}
          style={{ transformOrigin: 'center center' }}
        >
          <p className="text-xs leading-relaxed text-foreground">
            <span className="font-semibold text-primary">{current.title}:</span>{' '}
            <span className="text-muted-foreground">{current.content}</span>
          </p>
        </div>
      </div>

      {/* Desktop Layout - Original horizontal design */}
      <div className="hidden lg:flex items-center gap-3 px-3 h-12">
        {/* Steel badge with rivets */}
        <div className="shrink-0 relative px-6 py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider h-10 flex items-center
          bg-gradient-to-b from-slate-400 via-slate-500 to-slate-600
          text-slate-100 shadow-md border border-slate-600/50"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
        >
          {/* Left rivet */}
          <span className="absolute top-1/2 -translate-y-1/2 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 shadow-inner border border-slate-700/50" />
          {/* Right rivet */}
          <span className="absolute top-1/2 -translate-y-1/2 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 shadow-inner border border-slate-700/50" />
          <span className="relative px-1">Announcements</span>
        </div>

        {/* Slide/Flip content */}
        <div className="flex-1 overflow-hidden flex items-center justify-center">
          <div
            key={current.id}
            className={`text-sm sm:text-base text-foreground font-medium px-4 py-2 ${getAnimationClass()}`}
            style={{ 
              transformOrigin: 'center center',
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
