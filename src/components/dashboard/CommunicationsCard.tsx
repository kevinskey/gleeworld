import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { MessageSquare, Megaphone, ClipboardList, ChevronRight, X, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";
import { useNavigate } from "react-router-dom";
interface CommunicationModule {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  route?: string;
  isEmbedded?: boolean;
}
interface CommunicationsCardProps {
  isExecBoard?: boolean;
}

// Communication modules managed by admins
const COMMUNICATION_MODULES: CommunicationModule[] = [{
  id: 'messages',
  title: 'Messages',
  description: 'Group messaging and direct messages',
  icon: MessageSquare,
  iconBg: 'bg-blue-900/50',
  iconColor: 'text-blue-400',
  isEmbedded: true
}, {
  id: 'announcements',
  title: 'News',
  description: 'View announcements',
  icon: Megaphone,
  iconBg: 'bg-amber-900/50',
  iconColor: 'text-amber-400',
  route: '/announcements'
}, {
  id: 'member-exit-interview',
  title: 'Exit Interview',
  description: 'Complete Fall 2025 exit interview',
  icon: ClipboardList,
  iconBg: 'bg-rose-900/50',
  iconColor: 'text-rose-400',
  route: '/member-exit-interview'
}];
const EXEC_MODULES: CommunicationModule[] = [{
  id: 'exec-exit-interview',
  title: 'Exec Interview',
  description: 'Board member exit interview',
  icon: ClipboardList,
  iconBg: 'bg-amber-800/50',
  iconColor: 'text-amber-300',
  route: '/exec-board-exit-interview'
}];
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
  return <Card className="bg-background/95 backdrop-blur-sm">
      <CardHeader className="py-3 px-3 sm:px-0">
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          Communications
          <span className="text-[10px] md:text-xs font-normal text-foreground/70 ml-2 uppercase">
            stay connected!
          </span>
        </CardTitle>
        {modules.length === 0 && <CardDescription>Communication modules will appear here</CardDescription>}
      </CardHeader>
      <CardContent className="px-3 sm:px-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {modules.map(module => {
          const IconComponent = module.icon;
          const isExpanded = expandedModule === module.id;
          return <div key={module.id} className={cn(isExpanded && module.isEmbedded && "col-span-2 md:col-span-4")}>
                <Collapsible open={isExpanded && module.isEmbedded} onOpenChange={() => handleModuleClick(module)}>
                  {/* Glossy Card Module */}
                  <div onClick={() => handleModuleClick(module)} className={cn("group cursor-pointer rounded-xl p-3 sm:p-4 flex flex-col items-center text-center transition-all duration-300", "bg-gradient-to-b from-primary/80 to-primary border border-primary/50 hover:border-primary", "shadow-lg hover:shadow-xl min-h-[120px] sm:min-h-[140px]", isExpanded && "border-primary")}>
                    {/* Icon Circle */}
                    <div className={cn("w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mb-2 sm:mb-3 transition-transform group-hover:scale-110", module.iconBg)}>
                      <IconComponent className={cn("h-5 w-5 sm:h-6 sm:h-6 md:h-7 md:w-7", module.iconColor)} />
                    </div>

                    {/* Title */}
                    <h4 className="font-semibold text-xs sm:text-sm text-foreground mb-1 tracking-wide uppercase leading-tight">
                      {module.title}
                    </h4>

                    {/* Description */}
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight mb-2 line-clamp-2">
                      {module.description}
                    </p>

                    {/* Action Link */}
                    <span className="text-[10px] sm:text-xs text-primary flex items-center gap-1 group-hover:gap-2 transition-all mt-auto">
                      {module.isEmbedded ? isExpanded ? 'Close' : 'Open' : 'Learn More'}
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>

                  {/* Embedded Content */}
                  {module.isEmbedded && <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                      <div className="mt-3 p-4 rounded-xl border border-[#333] bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] relative">
                        <Button variant="ghost" size="sm" onClick={e => {
                    e.stopPropagation();
                    setExpandedModule(null);
                  }} className="absolute top-2 right-2 p-1 h-auto rounded-full text-muted-foreground hover:text-foreground z-10">
                          <X className="h-4 w-4" />
                        </Button>
                        <div className="h-[400px]">
                          <MessagingInterface embedded />
                        </div>
                      </div>
                    </CollapsibleContent>}
                </Collapsible>
              </div>;
        })}
        </div>
      </CardContent>
    </Card>;
};