import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { loadTikTokEmbedScript } from '@/utils/tiktokUtils';

interface TikTokPlayerProps {
  url: string;
  title?: string;
  onClose?: () => void;
}

export const TikTokPlayer: React.FC<TikTokPlayerProps> = ({ 
  url, 
  title = 'TikTok Video',
  onClose 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const embedTikTok = async () => {
      if (!containerRef.current) return;

      try {
        setLoading(true);
        setError(null);

        // Create the blockquote embed element
        containerRef.current.innerHTML = `
          <blockquote 
            class="tiktok-embed" 
            cite="${url}" 
            data-video-id=""
            style="max-width: 605px; min-width: 325px;"
          >
            <section></section>
          </blockquote>
        `;

        // Load and execute TikTok embed script
        await loadTikTokEmbedScript();

        // Give TikTok script time to process the embed
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Error loading TikTok embed:', err);
        setError('Failed to load TikTok video');
        setLoading(false);
      }
    };

    embedTikTok();
  }, [url]);

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

  return (
    <div className="relative w-full flex flex-col items-center">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="w-full flex justify-center"
        style={{ minHeight: loading ? '400px' : 'auto' }}
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
