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
      className={`overflow-hidden h-12 flex items-center gap-3 px-3 ${className || ''}`} 
      style={{ perspective: '400px' }}
    >
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
