import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink } from 'lucide-react';

interface AdvertisingHeroData {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  mobile_image_url: string | null;
  ipad_image_url: string | null;
  link_url: string | null;
  link_target: string | null;
}

export const AdvertisingHero: React.FC = () => {
  const [hero, setHero] = useState<AdvertisingHeroData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHero = async () => {
      try {
        const { data, error } = await supabase
          .from('advertising_hero')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setHero(data);
      } catch (e) {
        console.error('Failed to load advertising hero:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchHero();

    // Subscribe to changes
    const channel = supabase
      .channel('advertising-hero-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'advertising_hero' },
        () => {
          fetchHero();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full aspect-[21/9] md:aspect-[3/1] bg-muted animate-pulse rounded-xl" />
    );
  }

  if (!hero) {
    return null;
  }

  const fallbackImage = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80';

  const content = (
    <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[3/1] rounded-xl overflow-hidden group shadow-lg">
      {/* Desktop Image */}
      <img
        src={hero.image_url || fallbackImage}
        alt={hero.title || 'Featured promotion'}
        className="hidden md:block w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        onError={(e) => {
          if (!e.currentTarget.src.includes('unsplash.com')) {
            e.currentTarget.src = fallbackImage;
          }
        }}
      />
      
      {/* iPad/Tablet Image */}
      <img
        src={hero.ipad_image_url || hero.image_url || fallbackImage}
        alt={hero.title || 'Featured promotion'}
        className="hidden sm:block md:hidden w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        onError={(e) => {
          if (!e.currentTarget.src.includes('unsplash.com')) {
            e.currentTarget.src = fallbackImage;
          }
        }}
      />
      
      {/* Mobile Image */}
      <img
        src={hero.mobile_image_url || hero.image_url || fallbackImage}
        alt={hero.title || 'Featured promotion'}
        className="block sm:hidden w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        onError={(e) => {
          if (!e.currentTarget.src.includes('unsplash.com')) {
            e.currentTarget.src = fallbackImage;
          }
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content */}
      {(hero.title || hero.description) && (
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 text-white">
          {hero.title && (
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-1 sm:mb-2 drop-shadow-lg">
              {hero.title}
            </h2>
          )}
          {hero.description && (
            <p className="text-sm sm:text-base md:text-lg text-white/90 max-w-2xl drop-shadow">
              {hero.description}
            </p>
          )}
        </div>
      )}

      {/* Link Indicator */}
      {hero.link_url && (
        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );

  if (hero.link_url) {
    return (
      <a
        href={hero.link_url}
        target={hero.link_target === 'external' ? '_blank' : '_self'}
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </a>
    );
  }

  return content;
};
