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
}

export const AnnouncementsFlip = ({ className }: AnnouncementsFlipProps) => {
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
      }, 600);
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

  return (
    <div 
      className={`overflow-hidden h-10 flex items-center gap-2 px-2 ${className || ''}`} 
      style={{ perspective: '400px' }}
    >
      {/* Steel badge with rivets */}
      <div className="shrink-0 relative px-3 py-1 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider
        bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500
        text-slate-800 shadow-inner border border-slate-500/50
        before:absolute before:top-1 before:left-1 before:w-1.5 before:h-1.5 before:rounded-full before:bg-gradient-to-br before:from-slate-200 before:to-slate-500 before:shadow-inner
        after:absolute after:top-1 after:right-1 after:w-1.5 after:h-1.5 after:rounded-full after:bg-gradient-to-br after:from-slate-200 after:to-slate-500 after:shadow-inner"
        style={{ textShadow: '0 1px 0 rgba(255,255,255,0.3)' }}
      >
        <span className="relative">
          {/* Bottom rivets */}
          <span className="absolute -bottom-[3px] -left-[6px] w-1.5 h-1.5 rounded-full bg-gradient-to-br from-slate-200 to-slate-500 shadow-inner" />
          <span className="absolute -bottom-[3px] -right-[6px] w-1.5 h-1.5 rounded-full bg-gradient-to-br from-slate-200 to-slate-500 shadow-inner" />
          Announcements
        </span>
      </div>

      {/* Flip content */}
      <div className="flex-1 overflow-hidden flex items-center justify-center">
        <div
          key={current.id}
          className={`text-xs sm:text-sm text-foreground/80 bg-background/80 px-4 py-2 rounded ${
            isFlipping ? 'animate-flip-out' : 'animate-flip-in'
          }`}
          style={{ 
            transformOrigin: 'center center',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden'
          }}
        >
          <span className="font-bold">{current.title}:</span> {current.content}
        </div>
      </div>
    </div>
  );
};
