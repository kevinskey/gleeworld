import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GleeCamPhoto {
  id: string;
  file_url: string;
  title: string | null;
}

interface GleeCamCardProps {
  className?: string;
}

const IMAGE_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
];

const SCROLL_SPEED = 0.5; // pixels per frame
const ITEM_WIDTH = 108; // 100px image + 8px gap
const ITEM_WIDTH_SM = 128; // 120px image + 8px gap

export const GleeCamCard = ({ className }: GleeCamCardProps) => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<GleeCamPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  const offsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Fetch photos
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const { data, error } = await supabase
          .from("quick_capture_media")
          .select("id, file_url, title")
          .in("file_type", IMAGE_FILE_TYPES)
          .eq("is_approved", true)
          .order("created_at", { ascending: false })
          .limit(24);

        if (error) throw error;
        // Shuffle for variety
        const shuffled = (data || []).sort(() => Math.random() - 0.5);
        setPhotos(shuffled);
      } catch (err) {
        console.error("Error fetching glee cam photos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  // Animation loop
  useEffect(() => {
    if (photos.length < 4 || isPaused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const totalWidth = photos.length * ITEM_WIDTH;

    const animate = () => {
      offsetRef.current -= SCROLL_SPEED;
      
      // Reset when we've scrolled past the first set
      if (Math.abs(offsetRef.current) >= totalWidth) {
        offsetRef.current = 0;
      }

      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${offsetRef.current}px)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [photos.length, isPaused]);

  const handlePause = useCallback(() => setIsPaused(true), []);
  const handleResume = useCallback(() => setIsPaused(false), []);
  const goToGallery = () => navigate("/glee-cam/glee-cam-pics");

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

  // Duplicate photos for seamless loop
  const displayPhotos = photos.length >= 4 ? [...photos, ...photos] : photos;

  return (
    <Card className={cn("bg-card", className)}>
      <CardHeader className="py-3 px-3 sm:px-4">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Camera className="h-5 w-5 text-primary" />
          Glee Cam
          <span className="text-[10px] md:text-xs font-normal text-muted-foreground ml-2 uppercase">
            member moments
          </span>
          <button
            type="button"
            onClick={goToGallery}
            className="ml-auto text-xs text-primary hover:underline"
          >
            View
          </button>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-0 sm:px-4">
        <div 
          className="overflow-hidden"
          onMouseEnter={handlePause}
          onMouseLeave={handleResume}
          onTouchStart={handlePause}
          onTouchEnd={handleResume}
        >
          <div
            ref={trackRef}
            className="flex gap-2 will-change-transform"
            style={{ width: "max-content" }}
          >
            {displayPhotos.map((photo, idx) => (
              <button
                key={`${photo.id}-${idx}`}
                type="button"
                onClick={goToGallery}
                className="group flex-shrink-0 text-left"
                aria-label="Open Glee Cam gallery"
              >
                <div className="relative w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-all duration-300">
                  <img
                    src={photo.file_url}
                    alt={photo.title || "Glee Cam photo"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
