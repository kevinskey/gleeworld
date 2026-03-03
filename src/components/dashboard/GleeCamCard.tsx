import { useEffect, useRef, useState, useCallback } from "react";
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
  file_type?: string | null;
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

// Convert HEIC storage URLs to rendered/transformed URLs browsers can display
const toDisplayUrl = (url: string): string => {
  if (!url) return url;
  // If it's a .heic file served from Supabase storage, use the render endpoint
  if (url.includes('.heic') && url.includes('/storage/v1/object/public/')) {
    return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?format=webp&width=300&quality=80';
  }
  return url;
};

export const GleeCamCard = ({ className }: GleeCamCardProps) => {
  const navigate = useNavigate();
  const { camTitle, isInCourseView } = useCourseDisplayInfo();
  const { selectedCourseId } = useCourseContext();
  const [photos, setPhotos] = useState<GleeCamPhoto[]>([]);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const offsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleImageError = useCallback((photoId: string, photoUrl: string) => {
    // If the render endpoint failed, try the original URL as fallback
    // (some browsers like Safari support HEIC natively)
    const img = document.querySelector(`[data-photo-id="${photoId}"]`) as HTMLImageElement;
    if (img && img.src !== photoUrl) {
      img.src = photoUrl;
      return;
    }
    // If original also failed, hide the image
    setFailedIds(prev => new Set(prev).add(photoId));
  }, []);

  // Fetch photos - course-aware
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        
      let baseQuery = () => supabase
          .from("quick_capture_media")
          .select("id, file_url, title, file_type")
          .in("file_type", IMAGE_FILE_TYPES)
          .eq("is_approved", true);

        let query = baseQuery();

        // Filter by course when viewing a specific course
        if (isInCourseView && selectedCourseId) {
          query = query.eq("course_id", selectedCourseId);
        }

        const { data, error } = await query
          .order("created_at", { ascending: false })
          .limit(24);

        if (error) throw error;

        let results = data || [];

        // Fallback: if course view returned nothing, show all photos
        if (results.length === 0 && isInCourseView && selectedCourseId) {
          const { data: fallbackData, error: fallbackError } = await baseQuery()
            .order("created_at", { ascending: false })
            .limit(24);
          if (fallbackError) throw fallbackError;
          results = fallbackData || [];
        }

        // Shuffle for variety
        const shuffled = results.sort(() => Math.random() - 0.5);
        setPhotos(shuffled);
        setFailedIds(new Set());
      } catch (err) {
        console.error("Error fetching glee cam photos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [isInCourseView, selectedCourseId]);

  // Animation loop (JS marquee for reliability)
  const visibleCount = photos.filter(p => !failedIds.has(p.id)).length;

  useEffect(() => {
    if (visibleCount < 4) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const getLoopWidth = () => {
      const el = trackRef.current;
      if (!el) return 0;
      return el.scrollWidth / 2;
    };

    let loopWidth = getLoopWidth();

    const animate = () => {
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
  }, [visibleCount]);

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

  // Filter out failed photos and duplicate for seamless loop
  const visiblePhotos = photos.filter(p => !failedIds.has(p.id));
  const displayPhotos = visiblePhotos.length >= 4 ? [...visiblePhotos, ...visiblePhotos] : visiblePhotos;

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
                <div className="relative w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-all duration-300 bg-muted">
                  <img
                    data-photo-id={photo.id}
                    src={toDisplayUrl(photo.file_url)}
                    alt={photo.title || `${camTitle} photo`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={() => handleImageError(photo.id, photo.file_url)}
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
