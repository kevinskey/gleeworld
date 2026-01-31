import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';
import { X, Minimize2, Maximize2, GripHorizontal, Play, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface FloatingTikTokPlayerProps {
  url: string;
  onClose: () => void;
  title?: string;
}

interface TikTokOEmbedData {
  title: string;
  authorName: string;
  authorUrl: string;
  thumbnailUrl: string;
  html: string;
}

const FloatingTikTokPlayer: React.FC<FloatingTikTokPlayerProps> = ({
  url,
  onClose,
  title = 'TikTok Video'
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oembedData, setOembedData] = useState<TikTokOEmbedData | null>(null);
  const [size, setSize] = useState({ width: 340, height: 480 });
  const [position, setPosition] = useState({ 
    x: window.innerWidth - 360, 
    y: 20 
  });

  // Fetch oEmbed data
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

  // Load embed when playing
  useEffect(() => {
    if (!isPlaying || !oembedData) return;

    // Load the TikTok embed script
    const existingScript = document.querySelector('script[src*="tiktok.com/embed.js"]');
    if (existingScript) {
      if ((window as any).tiktokEmbed?.lib?.render) {
        setTimeout(() => {
          (window as any).tiktokEmbed.lib.render();
        }, 100);
      }
    } else {
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isPlaying, oembedData]);

  const content = (
    <Rnd
      data-floating-tiktok-player="true"
      position={position}
      size={{ width: size.width, height: isMinimized ? 48 : size.height }}
      minWidth={280}
      minHeight={isMinimized ? 48 : 400}
      maxWidth={500}
      maxHeight={700}
      bounds="window"
      dragHandleClassName="tiktok-drag-handle"
      onDragStop={(e, d) => {
        setPosition({ x: d.x, y: d.y });
      }}
      onResizeStop={(e, direction, ref, delta, pos) => {
        if (!isMinimized) {
          setSize({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          });
          setPosition(pos);
        }
      }}
      enableResizing={!isMinimized}
      style={{ zIndex: 999999 }}
    >
      <div 
        data-floating-tiktok-player="true"
        className={cn(
          "flex flex-col bg-card border-2 border-border rounded-lg shadow-2xl overflow-hidden",
          "h-full w-full"
        )}
      >
        {/* Header - Drag Handle */}
        <div className="tiktok-drag-handle flex items-center justify-between px-3 py-2 bg-black cursor-move select-none">
          <div className="flex items-center gap-2 text-white">
            <GripHorizontal className="h-4 w-4 opacity-60" />
            <span className="text-sm font-medium truncate max-w-[200px]">{title}</span>
          </div>
          <div className="flex items-center gap-1" style={{ pointerEvents: 'auto' }}>
            <button
              type="button"
              className="h-6 w-6 flex items-center justify-center text-white hover:bg-white/20 rounded"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsMinimized(prev => !prev);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              className="h-6 w-6 flex items-center justify-center text-white hover:bg-destructive hover:text-destructive-foreground rounded"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClose();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* TikTok Content */}
        {!isMinimized && (
          <div className="flex-1 bg-black relative overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-white">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p className="text-sm opacity-70">Loading TikTok...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-white p-4 text-center">
                <p className="text-sm mb-3">{error}</p>
                <button
                  onClick={() => window.open(url, '_blank')}
                  className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open on TikTok
                </button>
              </div>
            ) : !isPlaying && oembedData ? (
              // Thumbnail preview
              <div 
                className="w-full h-full relative cursor-pointer group flex items-center justify-center"
                onClick={() => setIsPlaying(true)}
              >
                <img 
                  src={oembedData.thumbnailUrl} 
                  alt={oembedData.title}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-black ml-1" fill="currentColor" />
                  </div>
                </div>

                {/* Video info */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-xs line-clamp-2">{oembedData.title}</p>
                  <p className="text-white/70 text-xs">by {oembedData.authorName}</p>
                </div>
              </div>
            ) : oembedData ? (
              // Embedded player
              <div 
                className="w-full h-full flex justify-center items-start pt-2 overflow-auto"
                dangerouslySetInnerHTML={{ __html: oembedData.html }}
              />
            ) : null}
          </div>
        )}
      </div>
    </Rnd>
  );

  return createPortal(content, document.body);
};

export default FloatingTikTokPlayer;
