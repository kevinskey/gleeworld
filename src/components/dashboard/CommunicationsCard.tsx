import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { MessageSquare, Megaphone, ClipboardList, X, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";
import { useNavigate } from "react-router-dom";

interface CommunicationModule {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route?: string;
  isEmbedded?: boolean;
}

interface CommunicationsCardProps {
  isExecBoard?: boolean;
}

const COMMUNICATION_MODULES: CommunicationModule[] = [
  {
    id: 'messages',
    title: 'Messages',
    description: 'Group messaging and DMs',
    icon: MessageSquare,
    isEmbedded: true
  },
  {
    id: 'announcements',
    title: 'News',
    description: 'View announcements',
    icon: Megaphone,
    route: '/announcements'
  },
  {
    id: 'member-exit-interview',
    title: 'Exit Interview',
    description: 'Fall 2025 exit interview',
    icon: ClipboardList,
    route: '/member-exit-interview'
  }
];

const EXEC_MODULES: CommunicationModule[] = [
  {
    id: 'exec-exit-interview',
    title: 'Exec Interview',
    description: 'Board member interview',
    icon: ClipboardList,
    route: '/exec-board-exit-interview'
  }
];

export const CommunicationsCard = ({
  isExecBoard = false
}: CommunicationsCardProps) => {
  const navigate = useNavigate();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const modules = [...COMMUNICATION_MODULES, ...(isExecBoard ? EXEC_MODULES : [])];

  const handleModuleClick = (module: CommunicationModule) => {
    if (module.route) {
      navigate(module.route);
      return;
    }
    if (module.isEmbedded) {
      setExpandedModule(expandedModule === module.id ? null : module.id);
    }
  };

  return (
    <Card className="bg-background/95 backdrop-blur-sm">
      <CardHeader className="py-3 px-3 sm:px-0">
        <CardTitle className="flex items-center gap-2 !text-white pl-[10px]">
          <Radio className="h-5 w-5 !text-white" />
          Communications
          <span className="text-[10px] md:text-xs font-normal !text-white/70 ml-2 uppercase">
            stay connected!
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 sm:px-[20px]">
        {/* Horizontal scrolling container like GleeCamCard */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {modules.map(module => {
            const IconComponent = module.icon;
            
            return (
              <div 
                key={module.id} 
                onClick={() => handleModuleClick(module)}
                className="flex-shrink-0 w-[140px] sm:w-[160px] lg:w-[calc(25%-9px)] group cursor-pointer"
              >
                <div 
                  className={cn(
                    "p-4 flex flex-col items-center text-center transition-all duration-300",
                    "bg-card border border-border hover:border-primary/50",
                    "shadow-lg hover:shadow-xl min-h-[120px]"
                  )}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 flex items-center justify-center mb-2 transition-transform group-hover:scale-110 bg-primary/20">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>

                  {/* Title */}
                  <h4 className="font-semibold text-[10px] sm:text-xs text-foreground mb-0.5 tracking-wide uppercase leading-tight line-clamp-1">
                    {module.title}
                  </h4>

                  {/* Description */}
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight line-clamp-2">
                    {module.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Embedded Messages Panel - Full width below the cards */}
        {expandedModule === 'messages' && (
          <div className="mt-3 p-4 border border-border bg-card relative">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setExpandedModule(null)} 
              className="absolute top-2 right-2 p-1 h-auto text-muted-foreground hover:text-foreground z-10"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="h-[400px]">
              <MessagingInterface embedded />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
