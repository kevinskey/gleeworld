import { useState, useEffect } from 'react';
import { DynamicItem } from './DynamicItem';
import { supabase } from '@/integrations/supabase/client';

interface DynamicSectionProps {
  section: any;
}

interface TitleFormatting {
  fontSize: number;
  fontWeight: string;
  textAlign: string;
  color: string;
  marginBottom: number;
  textTransform: string;
  letterSpacing: number;
  fontFamily?: string;
}

export const DynamicSection = ({ section }: DynamicSectionProps) => {
  const [titleFormatting, setTitleFormatting] = useState<TitleFormatting | null>(null);

  useEffect(() => {
    fetchGlobalTitleFormatting();

    // Subscribe to real-time updates with a unique channel ID per component instance
    const channelId = `title-formatting-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alumnae_global_settings',
          filter: 'setting_key=eq.title_formatting'
        },
        (payload) => {
          console.log('Title formatting updated:', payload);
          if (payload.new && (payload.new as any).setting_value) {
            setTitleFormatting((payload.new as any).setting_value as unknown as TitleFormatting);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGlobalTitleFormatting = async () => {
    try {
      const { data, error } = await supabase
        .from('alumnae_global_settings')
        .select('setting_value')
        .eq('setting_key', 'title_formatting')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        setTitleFormatting(data.setting_value as unknown as TitleFormatting);
      }
    } catch (error) {
      console.error('Failed to load title formatting:', error);
    }
  };
  const bgStyle: React.CSSProperties = {
    backgroundColor: section.background_color || 'transparent',
    backgroundImage: section.background_image ? `url(${section.background_image})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: section.row_height || 'auto',
  };

  const renderItems = () => {
    return (
      <div className="grid grid-cols-12 gap-6">
        {activeItems.map((item: any) => {
          const span = Math.max(1, Math.min(12, Math.round(((item.width_percentage || 100) / 100) * 12)));
          return (
            <div key={item.id} style={{ gridColumn: `span ${span} / span ${span}` }}>
              <DynamicItem item={item} />
            </div>
          );
        })}
      </div>
    );
  };

  const items = section.alumnae_section_items || [];
  const activeItems = items.filter((item: any) => item.is_active);

  const titleStyle: React.CSSProperties = titleFormatting
    ? {
        fontSize: `${titleFormatting.fontSize}px`,
        fontWeight: titleFormatting.fontWeight,
        textAlign: titleFormatting.textAlign as any,
        color: titleFormatting.color || 'inherit',
        marginBottom: `${titleFormatting.marginBottom}px`,
        textTransform: titleFormatting.textTransform as any,
        letterSpacing: `${titleFormatting.letterSpacing}px`,
        fontFamily: titleFormatting.fontFamily || 'inherit',
      }
    : {};

  return (
    <section style={bgStyle} className="w-full py-12 px-4">
      <div className="container mx-auto">
        {section.title && (
          <h2 style={titleStyle}>
            {section.title}
          </h2>
        )}
        {renderItems()}
      </div>
    </section>
  );
};
