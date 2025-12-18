import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Camera, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
interface GleeCamPhoto {
  id: string;
  file_url: string;
  title: string | null;
  category: string;
  created_at: string;
}

interface GleeCamCardProps {
  className?: string;
}

export const GleeCamCard = ({ className }: GleeCamCardProps) => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<GleeCamPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    dragFree: true,
  });

  useEffect(() => {
    fetchPhotos();
  }, []);
  const fetchPhotos = async () => {
    try {
      // Fetch photos (not videos) from all categories, randomized
      const { data, error } = await supabase
        .from('quick_capture_media')
        .select('id, file_url, title, category, created_at')
        .in('file_type', ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'])
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Shuffle the photos for variety
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      setPhotos(shuffled);
    } catch (error) {
      console.error('Error fetching glee cam photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const startAutoplay = useCallback(() => {
    if (!emblaApi) return;
    if (!isOpen || isPaused || photos.length === 0) return;

    // Ensure Embla measurements are up to date (images/layout can change width)
    emblaApi.reInit();

    const id = window.setInterval(() => {
      emblaApi.scrollNext();
    }, 1200);

    return () => window.clearInterval(id);
  }, [emblaApi, isOpen, isPaused, photos.length]);

  useEffect(() => {
    if (!emblaApi) return;
    if (!isOpen) return;

    // Delay start until after collapsible content has mounted and layout is measurable
    const t = window.setTimeout(() => {
      emblaApi.reInit();
      const stop = startAutoplay();
      (window as any).__gw_gleeCamStop = stop;
    }, 200);

    return () => {
      window.clearTimeout(t);
      const stop = (window as any).__gw_gleeCamStop as undefined | (() => void);
      stop?.();
      (window as any).__gw_gleeCamStop = undefined;
    };
  }, [emblaApi, isOpen, photos.length, startAutoplay]);

  const handlePhotoClick = (photo: GleeCamPhoto) => {
    // Navigate to the glee cam gallery
    navigate('/glee-cam/glee-cam-pics');
  };

  if (loading) {
    return (
      <Card className={cn("bg-card", className)}>
        <CardHeader className="py-2 px-3">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Glee Cam
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="h-24 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
      <Card className={cn("bg-card", className)}>
        <CardHeader className="py-3 px-3">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Camera className="h-5 w-5 text-primary" />
            Glee Cam
            <span className="text-[10px] md:text-xs font-normal text-muted-foreground ml-2 uppercase">
              no photos yet
            </span>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-card", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-3 sm:px-4 cursor-pointer hover:bg-primary/5 transition-colors">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Camera className="h-5 w-5 text-primary" />
              Glee Cam
              <span className="text-[10px] md:text-xs font-normal text-muted-foreground ml-2 uppercase">
                member moments
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 ml-auto mr-2 transition-transform duration-200 text-muted-foreground",
                isOpen && "rotate-180"
              )} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-3 pb-3 pt-0 sm:px-4">
            <div
              className="overflow-hidden"
              onPointerDown={() => setIsPaused(true)}
              onPointerUp={() => setIsPaused(false)}
              onPointerCancel={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              ref={emblaRef}
            >
              <div className="flex gap-2">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="flex-[0_0_auto]"
                    style={{ width: "120px" }}
                    onClick={() => handlePhotoClick(photo)}
                  >
                    <div className="group cursor-pointer">
                      <div className="relative w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-all duration-300">
                        <img
                          src={photo.file_url}
                          alt={photo.title || "Glee Cam photo"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
