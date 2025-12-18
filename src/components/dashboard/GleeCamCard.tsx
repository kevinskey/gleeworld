import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCourseDisplayInfo, useCourseContext } from "@/contexts/CourseContext";

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

const SCROLL_SPEED = 0.6; // pixels per frame

export const GleeCamCard = ({ className }: GleeCamCardProps) => {
  const navigate = useNavigate();
  const { camTitle, isInCourseView } = useCourseDisplayInfo();
  const { selectedCourseId } = useCourseContext();
  const [photos, setPhotos] = useState<GleeCamPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const offsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Fetch photos - course-aware
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        
        // For now, fetch all approved photos (course filtering will work after types regenerate)
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
  }, [isInCourseView, selectedCourseId]);

  // Animation loop (JS marquee for reliability)
  useEffect(() => {
    if (photos.length < 4) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    // Measure half of the duplicated track width (one full set of photos)
    const getLoopWidth = () => {
      const el = trackRef.current;
      if (!el) return 0;
      return el.scrollWidth / 2;
    };

    let loopWidth = getLoopWidth();

    const animate = () => {
      // If images load after mount, our width can change; keep it fresh.
      if (!loopWidth) loopWidth = getLoopWidth();

      offsetRef.current -= SCROLL_SPEED;

      if (loopWidth && Math.abs(offsetRef.current) >= loopWidth) {
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
  }, [photos.length]);

  const goToGallery = () => {
    if (isInCourseView && selectedCourseId) {
      navigate(`/course-cam/${selectedCourseId}`);
    } else {
      navigate("/glee-cam/glee-cam-pics");
    }
  };

  if (loading) {
    return (
      <Card className={cn("bg-card", className)}>
        <CardHeader className="py-2 px-3">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {camTitle}
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
            {camTitle}
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
          {camTitle}
          <span className="text-[10px] md:text-xs font-normal text-muted-foreground ml-2 uppercase">
            {isInCourseView ? 'course moments' : 'member moments'}
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
        <div className="overflow-hidden">
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
                aria-label={`Open ${camTitle} gallery`}
              >
                <div className="relative w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-all duration-300">
                  <img
                    src={photo.file_url}
                    alt={photo.title || `${camTitle} photo`}
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
