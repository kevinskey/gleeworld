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
    <div className={`overflow-hidden h-10 flex items-center justify-center px-4 ${className || ''}`} style={{ perspective: '500px' }}>
      <div
        key={current.id}
        className={`text-xs sm:text-sm text-foreground/80 transform-gpu text-center ${
          isFlipping ? 'animate-flip-out' : 'animate-flip-in'
        }`}
        style={{ transformOrigin: 'center center' }}
      >
        <span className="font-bold">{current.title}:</span> {current.content}
      </div>
    </div>
  );
};
