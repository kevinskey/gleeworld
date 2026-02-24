import React, { useState, useMemo } from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  sourceIcon: string;
  imageUrl: string | null;
}

export const NewsFeedSlider: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);

  const { data: newsItems, isLoading } = useQuery({
    queryKey: ['news-feed'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-news-feeds');
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch news');
      return data.items as NewsItem[];
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 15,
  });

  const duplicatedItems = useMemo(() => {
    if (!newsItems || newsItems.length === 0) return [];
    return [...newsItems, ...newsItems, ...newsItems];
  }, [newsItems]);

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const animationDuration = newsItems ? Math.max(newsItems.length * 6, 20) : 20;

  return (
    <div className="w-full">
      {/* Header */}
      <div
        style={{ fontFamily: "'Cinzel', serif" }}
        className="w-full h-12 gap-2 text-sm sm:text-xl bg-gradient-to-b from-[hsl(208,100%,20%)] via-[hsl(208,100%,17%)] to-[hsl(208,100%,14%)] text-primary-foreground flex items-center justify-start text-left px-3 sm:px-6 lg:px-8 shadow-lg border-t border-t-white/20"
      >
        <Newspaper className="h-4 w-4 sm:h-5 sm:w-5" />
        News Feed
      </div>

      {/* News Slider */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
        className="bg-gradient-to-b from-[hsl(220,40%,10%)] to-[hsl(220,40%,8%)]"
      >
        {isLoading ? (
          <div className="flex gap-4 px-5 py-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-72 sm:w-80 lg:w-96 h-48 bg-white/10 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : newsItems && newsItems.length > 0 ? (
          <div
            className="flex gap-4 pl-5 py-4"
            style={{
              animation: `newsScrollInfinite ${animationDuration}s linear infinite`,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            {duplicatedItems.map((item, index) => (
              <a
                key={`${item.link}-${index}`}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 group text-left block"
              >
                <div className="relative w-72 sm:w-80 lg:w-96 rounded-lg overflow-hidden border border-white/5 hover:border-primary/50 transition-all shadow-lg bg-[hsl(220,35%,12%)]">
                  {/* Image */}
                  {item.imageUrl ? (
                    <div className="w-full h-36 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <Newspaper className="h-12 w-12 text-white/20" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-sm">{item.sourceIcon}</span>
                      <span className="text-[11px] text-white/50 font-medium">{item.source}</span>
                      {item.pubDate && (
                        <>
                          <span className="text-white/30">·</span>
                          <span className="text-[11px] text-white/40">
                            {formatTimeAgo(item.pubDate)}
                          </span>
                        </>
                      )}
                      <ExternalLink className="h-3 w-3 text-white/30 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="text-sm text-white/85 font-medium line-clamp-2 leading-snug group-hover:text-white transition-colors">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-[11px] text-white/40 mt-1 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-white/60 text-sm py-4 px-5">No news available</div>
        )}
      </div>

      {/* Infinite scroll keyframes */}
      <style>{`
        @keyframes newsScrollInfinite {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
      `}</style>
    </div>
  );
};

export default NewsFeedSlider;
