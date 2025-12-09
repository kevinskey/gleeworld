import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Camera, Mic, Video, Users, Sparkles, Image, FileAudio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
interface GleeCamCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  icon_bg: string;
  icon_color: string;
  display_order: number;
  is_active: boolean;
}
const ICON_MAP: Record<string, React.ElementType> = {
  Camera,
  Video,
  Mic,
  Users,
  Sparkles,
  Image,
  FileAudio
};
interface GleeCamCardProps {
  className?: string;
}
export const GleeCamCard = ({
  className
}: GleeCamCardProps) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<GleeCamCategory[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchCategories();
  }, []);
  const fetchCategories = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('glee_cam_categories').select('*').eq('is_active', true).order('display_order', {
        ascending: true
      });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching glee cam categories:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleCategoryClick = (category: GleeCamCategory) => {
    navigate(`/glee-cam/${category.slug}`);
  };
  const getIconComponent = (iconName: string) => {
    return ICON_MAP[iconName] || Camera;
  };
  if (loading) {
    return <Card className={cn("bg-background/95 backdrop-blur-sm", className)}>
        <CardHeader className="py-2 px-3">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Glee Cam
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="h-24 animate-pulse bg-muted" />
        </CardContent>
      </Card>;
  }
  if (categories.length === 0) {
    return null;
  }
  return <Card className={cn("bg-background/95 backdrop-blur-sm", className)}>
      <CardHeader className="py-3 px-3 sm:px-0">
        <CardTitle className="flex items-center gap-2 text-primary-foreground">
          <Camera className="h-5 w-5 text-primary-foreground" />
          Glee Cam
          <span className="text-[10px] md:text-xs font-normal text-primary-foreground/70 ml-2 uppercase">
            member moments
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 sm:px-0">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {categories.map(category => {
          const IconComponent = getIconComponent(category.icon);
          return <div key={category.id} onClick={() => handleCategoryClick(category)} className="group cursor-pointer flex-shrink-0 w-[140px] sm:w-[160px] lg:w-[calc(25%-9px)]">
                <div className={cn("p-4 flex flex-col items-center text-center transition-all duration-300", "bg-card border border-border hover:border-primary/50", "shadow-lg hover:shadow-xl min-h-[120px]")}>
                  <div className={cn("w-10 h-10 flex items-center justify-center mb-2 transition-transform group-hover:scale-110", category.icon_bg)}>
                    <IconComponent className={cn("h-5 w-5", category.icon_color)} />
                  </div>
                  <h4 className="font-semibold text-[10px] sm:text-xs text-foreground mb-0.5 tracking-wide uppercase leading-tight line-clamp-1">
                    {category.name}
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight line-clamp-2">
                    {category.description}
                  </p>
                </div>
              </div>;
        })}
        </div>
      </CardContent>
    </Card>;
};