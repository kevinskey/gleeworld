import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_recurring?: boolean;
  recurrence_start_date?: string;
}

interface AnnouncementsTickerProps {
  className?: string;
}

export const AnnouncementsTicker = ({
  className
}: AnnouncementsTickerProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { themeName } = useTheme();
  
  // HBCU theme colors
  const isHbcuTheme = themeName === 'hbcu';
  const hbcuGold = '#FFDF00';
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const now = new Date();
      const nowISO = now.toISOString();

      const { data, error } = await supabase.from('gw_announcements')
        .select('id, title, content, created_at, is_recurring, recurrence_start_date, publish_date')
        .not('publish_date', 'is', null)
        .lte('publish_date', nowISO)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        // Filter recurring announcements based on time of day
        const filtered = data.filter((announcement) => {
          if (announcement.is_recurring && announcement.recurrence_start_date) {
            const recurrenceDate = new Date(announcement.recurrence_start_date);
            const recurrenceHour = recurrenceDate.getUTCHours();
            const recurrenceMinute = recurrenceDate.getUTCMinutes();
            
            const currentHour = now.getUTCHours();
            const currentMinute = now.getUTCMinutes();
            
            // Check if current time is past the recurrence start time
            if (currentHour < recurrenceHour) return false;
            if (currentHour === recurrenceHour && currentMinute < recurrenceMinute) return false;
          }
          return true;
        });

        setAnnouncements(filtered.slice(0, 10));
      }
    } catch (err) {
      console.warn('AnnouncementsTicker fetch failed:', err);
    }
  };

  if (announcements.length === 0) {
    return (
      <>
        {/* Mobile - Empty state */}
        <div className={`lg:hidden ${className || ''}`}>
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

        {/* Desktop - Empty state with background */}
        <div className={`hidden lg:block overflow-hidden whitespace-nowrap w-full min-w-0 ${className || ''}`}>
          <div className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-[40px]">
            No announcements
          </div>
        </div>
      </>
    );
  }

  const hbcuRed = '#8B0000';

  return (
    <>
      {/* Mobile - Modern card style */}
      <div className={`lg:hidden ${className || ''}`}>
        <div 
          className="w-full rounded-xl px-4 py-3 shadow-lg border backdrop-blur-sm"
          style={{
            background: isHbcuTheme 
              ? `linear-gradient(135deg, ${hbcuRed} 0%, #a52a2a 100%)`
              : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)',
            borderColor: isHbcuTheme ? hbcuGold : 'hsl(var(--primary)/0.3)',
          }}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">📢</span>
            <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide">
              <p className="text-sm font-medium text-white whitespace-nowrap leading-snug">
                {announcements.map((a, i) => (
                  <span key={a.id}>
                    <span className="font-bold">{a.title}:</span>{' '}
                    <span className="opacity-95">{a.content}</span>
                    {i < announcements.length - 1 && <span className="mx-2 opacity-60">•</span>}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop - Original ticker */}
      <div className={`hidden lg:block overflow-hidden whitespace-nowrap w-full min-w-0 ${className || ''}`}>
        <div 
          className="animate-marquee inline-block text-xs sm:text-sm pl-[100%] my-0 py-0 px-2 sm:px-[40px]"
          style={{ color: isHbcuTheme ? hbcuGold : undefined }}
        >
          {announcements.map((a, i) => (
            <span key={a.id}>
              <span className="font-bold">{a.title}:</span> {a.content}
              {i < announcements.length - 1 && '  •  '}
            </span>
          ))}
        </div>
      </div>
    </>
  );
};
