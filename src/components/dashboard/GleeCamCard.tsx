import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Camera, Mic, Video, Users, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface GleeCamCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  route: string;
}

const GLEE_CAM_CATEGORIES: GleeCamCategory[] = [
  {
    id: 'christmas-selfies',
    title: 'Christmas Selfies',
    description: 'Holiday spirit moments',
    icon: Sparkles,
    iconBg: 'bg-rose-900/50',
    iconColor: 'text-rose-400',
    route: '/media-library?category=christmas-carol-selfies',
  },
  {
    id: 'glee-cam-pics',
    title: 'Glee Cam Pics',
    description: 'Candid member photos',
    icon: Camera,
    iconBg: 'bg-blue-900/50',
    iconColor: 'text-blue-400',
    route: '/media-library?category=glee-cam-pics',
  },
  {
    id: 'glee-cam-videos',
    title: 'Glee Cam Videos',
    description: 'Member video moments',
    icon: Video,
    iconBg: 'bg-purple-900/50',
    iconColor: 'text-purple-400',
    route: '/media-library?category=glee-cam-videos',
  },
  {
    id: 'voice-recordings',
    title: 'Voice Parts',
    description: 'Voice part recordings',
    icon: Mic,
    iconBg: 'bg-emerald-900/50',
    iconColor: 'text-emerald-400',
    route: '/media-library?category=voice-part-recording',
  },
  {
    id: 'exec-videos',
    title: 'ExecBoard Videos',
    description: 'Executive board content',
    icon: Users,
    iconBg: 'bg-amber-900/50',
    iconColor: 'text-amber-400',
    route: '/media-library?category=execboard-video',
  },
];

interface GleeCamCardProps {
  className?: string;
}

export const GleeCamCard = ({ className }: GleeCamCardProps) => {
  const navigate = useNavigate();

  const handleCategoryClick = (category: GleeCamCategory) => {
    navigate(category.route);
  };

  return (
    <Card className={cn("bg-background/95 backdrop-blur-sm", className)}>
      <CardHeader className="py-2 px-3">
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Glee Cam
          <span className="text-[10px] md:text-xs font-normal text-foreground/70 ml-2 uppercase">
            member moments
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        {/* Horizontal scrollable categories */}
        <div className="overflow-x-auto scrollbar-hide -mx-1">
          <div className="flex gap-3 px-1 pb-1">
            {GLEE_CAM_CATEGORIES.map((category) => {
              const IconComponent = category.icon;
              
              return (
                <div
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  className="group cursor-pointer flex-shrink-0 w-28 sm:w-32"
                >
                  {/* Category Card */}
                  <div className={cn(
                    "rounded-xl p-3 flex flex-col items-center text-center transition-all duration-300",
                    "bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] border border-[#333] hover:border-[#444]",
                    "shadow-lg hover:shadow-xl min-h-[100px]"
                  )}>
                    {/* Icon Circle */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-transform group-hover:scale-110",
                      category.iconBg
                    )}>
                      <IconComponent className={cn("h-5 w-5", category.iconColor)} />
                    </div>

                    {/* Title */}
                    <h4 className="font-semibold text-[10px] sm:text-xs text-foreground mb-0.5 tracking-wide uppercase leading-tight line-clamp-1">
                      {category.title}
                    </h4>

                    {/* Description */}
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight line-clamp-2">
                      {category.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
