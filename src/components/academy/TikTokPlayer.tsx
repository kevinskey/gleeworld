import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, AlertCircle, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TikTokPlayerProps {
  url: string;
  title?: string;
  onClose?: () => void;
}

interface TikTokOEmbedData {
  title: string;
  authorName: string;
  authorUrl: string;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  html: string;
}

export const TikTokPlayer: React.FC<TikTokPlayerProps> = ({ 
  url, 
  title = 'TikTok Video',
  onClose 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oembedData, setOembedData] = useState<TikTokOEmbedData | null>(null);
  const [showEmbed, setShowEmbed] = useState(false);

  // Fetch oEmbed data from our edge function
  useEffect(() => {
    const fetchOembedData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fnError } = await supabase.functions.invoke('tiktok-oembed', {
          body: { url },
        });

        if (fnError) {
          throw new Error(fnError.message || 'Failed to fetch TikTok data');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to load TikTok video');
        }

        setOembedData(data.data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading TikTok data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load TikTok video');
        setLoading(false);
      }
    };

    fetchOembedData();
  }, [url]);

  // Load the embed when user clicks play
  useEffect(() => {
    if (!showEmbed || !oembedData || !containerRef.current) return;

    // Insert the oEmbed HTML
    containerRef.current.innerHTML = oembedData.html;

    // Load the TikTok embed script to process the blockquote
    const existingScript = document.querySelector('script[src*="tiktok.com/embed.js"]');
    if (existingScript) {
      // Re-process embeds if script already exists
      if ((window as any).tiktokEmbed?.lib?.render) {
        (window as any).tiktokEmbed.lib.render();
      }
    } else {
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [showEmbed, oembedData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading TikTok video...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button
          variant="outline"
          onClick={() => window.open(url, '_blank')}
          className="flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Open on TikTok
        </Button>
      </div>
    );
  }

  // Show thumbnail with play button before loading embed
  if (!showEmbed && oembedData) {
    return (
      <div className="relative w-full flex flex-col items-center">
        <div 
          className="relative cursor-pointer group rounded-lg overflow-hidden"
          onClick={() => setShowEmbed(true)}
        >
          <img 
            src={oembedData.thumbnailUrl} 
            alt={oembedData.title}
            className="max-h-[500px] w-auto object-contain rounded-lg"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="h-8 w-8 text-black ml-1" fill="currentColor" />
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <h3 className="font-medium text-sm line-clamp-2">{oembedData.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">by {oembedData.authorName}</p>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowEmbed(true)}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Play Video
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(url, '_blank')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open on TikTok
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full flex flex-col items-center">
      <div 
        ref={containerRef}
        className="w-full flex justify-center"
        style={{ minHeight: '400px' }}
      />

      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(url, '_blank')}
          className="flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Open on TikTok
        </Button>
      </div>
    </div>
  );
};
