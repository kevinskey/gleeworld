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

// Single opinionated GleeWorld style
const STYLE = {
  background: 'linear-gradient(135deg, hsl(203 85% 50%) 0%, hsl(219 78% 31%) 100%)',
  borderColor: 'hsl(203 85% 70%)',
  textColor: 'hsl(0 0% 100%)',
  badgeBg: 'linear-gradient(to bottom, hsl(215 16% 62%), hsl(215 16% 47%))',
  badgeText: 'hsl(210 40% 96%)',
  badgeBorder: 'hsl(215 20% 35% / 0.5)',
};

export const AnnouncementsFlip = ({
  className,
  direction = 'left'
}: AnnouncementsFlipProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => { fetchAnnouncements(); }, []);

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
      if (!error && data) setAnnouncements(data);
    } catch (err) {
      console.warn('AnnouncementsFlip fetch failed:', err);
    }
  };

  if (announcements.length === 0) {
    return (
      <div className={`overflow-hidden ${className || ''}`}>
        <div className="flex lg:hidden">
          <div className="w-full rounded-xl px-4 py-3 shadow-lg border backdrop-blur-sm bg-muted border-border">
            <div className="flex items-center gap-2">
              <span className="text-lg opacity-50">📢</span>
              <p className="text-sm text-muted-foreground">No announcements</p>
            </div>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-3 px-3 h-12">
          <div
            className="shrink-0 relative px-6 rounded-sm text-xs font-bold uppercase tracking-wider h-10 flex items-center shadow-md border py-[20px]"
            style={{ background: STYLE.badgeBg, color: STYLE.badgeText, borderColor: STYLE.badgeBorder, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            <span className="absolute top-1/2 -translate-y-1/2 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 shadow-inner border border-slate-700/50" />
            <span className="absolute top-1/2 -translate-y-1/2 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 shadow-inner border border-slate-700/50" />
            <span className="relative px-1">Announcements</span>
          </div>
          <div className="flex-1 overflow-hidden flex items-center justify-center py-0 bg-muted rounded-md">
            <div className="text-sm text-muted-foreground px-4 py-2">No announcements</div>
          </div>
        </div>
      </div>
    );
  }

  const current = announcements[currentIndex];

  const getAnimationClass = () => {
    if (direction === 'left') return isFlipping ? 'animate-slide-out-left' : 'animate-slide-in-left';
    if (direction === 'right') return isFlipping ? 'animate-slide-out-right' : 'animate-slide-in-right';
    return isFlipping ? 'animate-flip-out' : 'animate-flip-in';
  };

  return (
    <div className={`overflow-hidden ${className || ''}`} style={{ perspective: '400px' }}>
      {/* Mobile */}
      <div className="flex lg:hidden">
        <div
          key={current.id}
          className={`w-full rounded-xl px-4 py-3 shadow-lg border backdrop-blur-sm ${getAnimationClass()}`}
          style={{ transformOrigin: 'center center', background: STYLE.background, borderColor: STYLE.borderColor }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📢</span>
            <p className="text-sm font-medium leading-snug" style={{ color: STYLE.textColor }}>
              <span className="font-bold">{current.title}:</span>{' '}
              <span style={{ opacity: 0.95 }}>{current.content}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex items-center gap-3 px-3 h-12">
        <div
          className="shrink-0 relative px-6 rounded-sm text-xs font-bold uppercase tracking-wider h-10 flex items-center shadow-md border py-[20px]"
          style={{ background: STYLE.badgeBg, color: STYLE.badgeText, borderColor: STYLE.badgeBorder, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
        >
          <span className="absolute top-1/2 -translate-y-1/2 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 shadow-inner border border-slate-700/50" />
          <span className="absolute top-1/2 -translate-y-1/2 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 shadow-inner border border-slate-700/50" />
          <span className="relative px-1">Announcements</span>
        </div>
        <div className="flex-1 overflow-hidden flex items-center justify-center py-0 bg-muted rounded-md">
          <div
            key={current.id}
            className={`text-sm sm:text-base font-medium px-4 py-2 ${getAnimationClass()}`}
            style={{ transformOrigin: 'center center', fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            <span className="font-bold">{current.title}:</span> {current.content}
          </div>
        </div>
      </div>
    </div>
  );
};
