import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Camera, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        // Fetch photos (not videos) from all categories, randomized
        const { data, error } = await supabase
          .from("quick_capture_media")
          .select("id, file_url, title, category, created_at")
          .in("file_type", [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/heic",
          ])
          .eq("is_approved", true)
          .order("created_at", { ascending: false })
          .limit(24);

        if (error) throw error;

        // Shuffle the photos for variety
        const shuffled = (data || []).sort(() => Math.random() - 0.5);
        setPhotos(shuffled);
      } catch (error) {
        console.error("Error fetching glee cam photos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  const marqueePhotos = useMemo(() => {
    // Duplicate for seamless loop
    return photos.length > 0 ? [...photos, ...photos] : [];
  }, [photos]);

  const handlePhotoClick = () => {
    navigate("/glee-cam/glee-cam-pics");
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
      {/* Local CSS marquee (reliable, no JS carousel needed) */}
      <style>
        {`
          @keyframes gw-marquee-x {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @media (prefers-reduced-motion: reduce) {
            .gw-marquee-track { animation: none !important; }
          }
        `}
      </style>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-3 sm:px-4 cursor-pointer hover:bg-primary/5 transition-colors">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Camera className="h-5 w-5 text-primary" />
              Glee Cam
              <span className="text-[10px] md:text-xs font-normal text-muted-foreground ml-2 uppercase">
                member moments
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 ml-auto mr-2 transition-transform duration-200 text-muted-foreground",
                  isOpen && "rotate-180",
                )}
              />
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
            >
              <div
                className="gw-marquee-track flex w-max gap-2"
                style={{
                  animation: "gw-marquee-x 28s linear infinite",
                  animationPlayState: isPaused ? "paused" : "running",
                }}
              >
                {marqueePhotos.map((photo, idx) => (
                  <button
                    // idx is fine here because we intentionally duplicate items
                    key={`${photo.id}-${idx}`}
                    type="button"
                    onClick={handlePhotoClick}
                    className="group flex-shrink-0 text-left"
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
