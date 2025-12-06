import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeName } from '@/themes/themeConfig';

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

// Theme-specific styling for announcement cards
const getThemeStyles = (themeName: ThemeName) => {
  switch (themeName) {
    case 'hbcu':
      return {
        background: 'linear-gradient(135deg, #8B0000 0%, #a52a2a 100%)',
        borderColor: '#FFDF00',
        textColor: '#FFFFFF',
        desktopTextColor: '#FFDF00',
      };
    case 'spelman-blue':
      return {
        background: 'linear-gradient(135deg, hsl(201 52% 50%) 0%, hsl(201 52% 66%) 100%)',
        borderColor: 'hsl(201 52% 80%)',
        textColor: '#FFFFFF',
        desktopTextColor: 'hsl(220 50% 20%)',
      };
    case 'spelhouse':
      return {
        background: 'linear-gradient(135deg, hsl(210 65% 45%) 0%, hsl(352 65% 35%) 100%)',
        borderColor: 'hsl(210 50% 60%)',
        textColor: '#FFFFFF',
        desktopTextColor: 'hsl(352 65% 25%)',
      };
    case 'music':
      return {
        background: 'linear-gradient(135deg, hsl(210 100% 35%) 0%, hsl(180 80% 30%) 100%)',
        borderColor: 'hsl(180 100% 50%)',
        textColor: '#FFFFFF',
        desktopTextColor: 'hsl(0 0% 95%)',
      };
    case 'glee-world':
    default:
      return {
        background: 'linear-gradient(135deg, hsl(203 85% 50%) 0%, hsl(219 78% 31%) 100%)',
        borderColor: 'hsl(203 85% 70%)',
        textColor: '#FFFFFF',
        desktopTextColor: 'hsl(0 0% 100%)',
      };
  }
};

export const AnnouncementsTicker = ({
  className
}: AnnouncementsTickerProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { themeName } = useTheme();
  
  const themeStyles = getThemeStyles(themeName);

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
        const filtered = data.filter((announcement) => {
          if (announcement.is_recurring && announcement.recurrence_start_date) {
            const recurrenceDate = new Date(announcement.recurrence_start_date);
            const recurrenceHour = recurrenceDate.getUTCHours();
            const recurrenceMinute = recurrenceDate.getUTCMinutes();
            
            const currentHour = now.getUTCHours();
            const currentMinute = now.getUTCMinutes();
            
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

        {/* Desktop - Empty state */}
        <div className={`hidden lg:block overflow-hidden whitespace-nowrap w-full min-w-0 ${className || ''}`}>
          <div className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-[40px]">
            No announcements
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile - Theme-aware card style */}
      <div className={`lg:hidden ${className || ''}`}>
        <div 
          className="w-full rounded-xl px-4 py-3 shadow-lg border backdrop-blur-sm"
          style={{
            background: themeStyles.background,
            borderColor: themeStyles.borderColor,
          }}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">📢</span>
            <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide">
              <p 
                className="text-sm font-medium whitespace-nowrap leading-snug"
                style={{ color: themeStyles.textColor }}
              >
                {announcements.map((a, i) => (
                  <span key={a.id}>
                    <span className="font-bold">{a.title}:</span>{' '}
                    <span style={{ opacity: 0.95 }}>{a.content}</span>
                    {i < announcements.length - 1 && <span className="mx-2" style={{ opacity: 0.6 }}>•</span>}
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
          style={{ color: themeStyles.desktopTextColor }}
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
