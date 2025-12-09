import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageSquare, Megaphone, ClipboardList, ChevronDown, ChevronUp, X, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";
import { useNavigate } from "react-router-dom";

interface CommunicationModule {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  route?: string;
  isEmbedded?: boolean;
}

interface CommunicationsCardProps {
  isExecBoard?: boolean;
}

// Communication modules managed by admins
const COMMUNICATION_MODULES: CommunicationModule[] = [
  {
    id: 'messages',
    title: 'Messages',
    description: 'Group messaging and DMs',
    icon: MessageSquare,
    iconColor: 'blue',
    isEmbedded: true,
  },
  {
    id: 'announcements',
    title: 'Announcements',
    description: 'View announcements',
    icon: Megaphone,
    iconColor: 'amber',
    route: '/announcements',
  },
  {
    id: 'member-exit-interview',
    title: 'Member Exit Interview',
    description: 'Complete Fall 2025 exit interview',
    icon: ClipboardList,
    iconColor: 'rose',
    route: '/member-exit-interview',
  },
];

const EXEC_MODULES: CommunicationModule[] = [
  {
    id: 'exec-exit-interview',
    title: 'Exec Board Exit Interview',
    description: 'Complete exec board exit interview',
    icon: ClipboardList,
    iconColor: 'amber',
    route: '/exec-board-exit-interview',
  },
];

export const CommunicationsCard = ({
  isExecBoard = false,
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
      <CardHeader className="pt-4 pb-3">
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          Communications
          <span className="text-[10px] md:text-xs font-normal text-foreground/70 ml-2 uppercase">
            stay connected!
          </span>
        </CardTitle>
        {modules.length === 0 && (
          <CardDescription>Communication modules will appear here</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-44">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
            {modules.map((module) => {
              const IconComponent = module.icon;
              const isExpanded = expandedModule === module.id;

              return (
                <Collapsible
                  key={module.id}
                  open={isExpanded && module.isEmbedded}
                  onOpenChange={() => handleModuleClick(module)}
                  className={cn(
                    isExpanded && module.isEmbedded && "md:col-span-2 lg:col-span-3"
                  )}
                >
                  <div
                    className={cn(
                      "relative flex items-center justify-between p-3 pr-10 rounded-lg border bg-card text-card-foreground hover:bg-accent/50 transition-colors cursor-pointer",
                      isExpanded && module.isEmbedded && "border-primary/50"
                    )}
                    onClick={() => handleModuleClick(module)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg bg-${module.iconColor}-100 dark:bg-${module.iconColor}-900/20`}>
                        <IconComponent className={`h-4 w-4 text-${module.iconColor}-600 dark:text-${module.iconColor}-400`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-card-foreground">{module.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{module.description}</p>
                      </div>
                    </div>
                    {module.isEmbedded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 p-2 h-auto rounded-md text-muted-foreground hover:text-foreground transition-all"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </Button>
                    )}
                  </div>

                  {module.isEmbedded && (
                    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                      <div className="mt-2 p-4 rounded-lg border bg-card relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedModule(null);
                          }}
                          className="absolute top-2 right-2 p-1 h-auto rounded-full text-muted-foreground hover:text-foreground z-10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className="h-[400px]">
                          <MessagingInterface embedded />
                        </div>
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
