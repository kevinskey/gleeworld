import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GleeCamPhoto {
  id: string;
  file_url: string;
  title: string | null;
  created_at: string;
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

export const GleeCamCard = ({ className }: GleeCamCardProps) => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<GleeCamPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        // Landing/dashboard card: show any *photos* from any category, shuffled for variety.
        const { data, error } = await supabase
          .from("quick_capture_media")
          .select("id, file_url, title, created_at")
          .in("file_type", IMAGE_FILE_TYPES)
          .eq("is_approved", true)
          .order("created_at", { ascending: false })
          .limit(24);

        if (error) throw error;

        // Shuffle the photos for variety
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

  const shouldAnimate = photos.length >= 8;

  // Duplicate exactly once for a seamless loop.
  const loopPhotos = useMemo(() => {
    if (!shouldAnimate) return photos;
    return [...photos, ...photos];
  }, [photos, shouldAnimate]);

  // A little faster when there are many items.
  const durationSeconds = useMemo(() => {
    if (!shouldAnimate) return 0;
    if (photos.length >= 20) return 22;
    if (photos.length >= 12) return 26;
    return 30;
  }, [photos.length, shouldAnimate]);

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

  return (
    <Card className={cn("bg-card", className)}>
      {/* CSS marquee (no JS carousel). */}
      <style>
        {`
          @keyframes gw-glee-cam-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @media (prefers-reduced-motion: reduce) {
            .gw-glee-cam-track { animation: none !important; transform: none !important; }
          }
        `}
      </style>

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
        <div className="overflow-hidden">
          <div
            className={cn(
              "gw-glee-cam-track flex w-max gap-2",
              shouldAnimate && "will-change-transform",
            )}
            style={
              shouldAnimate
                ? {
                    animation: `gw-glee-cam-marquee ${durationSeconds}s linear infinite`,
                  }
                : undefined
            }
          >
            {loopPhotos.map((photo, idx) => (
              <button
                // idx is intentional: we duplicate for the loop
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
