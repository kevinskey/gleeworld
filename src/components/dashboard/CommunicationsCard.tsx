import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageSquare, Megaphone, ClipboardList, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";

interface CommunicationModule {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  component?: React.ReactNode;
  isEmbedded?: boolean;
}

interface CommunicationsCardProps {
  onOpenAnnouncements?: () => void;
  memberExitInterviewComponent?: React.ReactNode;
  execExitInterviewComponent?: React.ReactNode;
  isExecBoard?: boolean;
}

export const CommunicationsCard = ({
  onOpenAnnouncements,
  memberExitInterviewComponent,
  execExitInterviewComponent,
  isExecBoard = false,
}: CommunicationsCardProps) => {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const modules: CommunicationModule[] = [
    {
      id: 'announcements',
      title: 'Announcements',
      description: 'View and manage announcements',
      icon: Megaphone,
      iconColor: 'amber',
    },
    {
      id: 'messages',
      title: 'Messages',
      description: 'Group messaging and DMs',
      icon: MessageSquare,
      iconColor: 'blue',
      isEmbedded: true,
    },
    {
      id: 'member-exit-interview',
      title: 'Member Exit Interview',
      description: 'Complete Fall 2025 exit interview',
      icon: ClipboardList,
      iconColor: 'rose',
      component: memberExitInterviewComponent,
    },
    ...(isExecBoard ? [{
      id: 'exec-exit-interview',
      title: 'Exec Board Exit Interview',
      description: 'Complete exec board exit interview',
      icon: ClipboardList,
      iconColor: 'amber',
      component: execExitInterviewComponent,
    }] : []),
  ];

  const handleModuleClick = (moduleId: string) => {
    if (moduleId === 'announcements' && onOpenAnnouncements) {
      onOpenAnnouncements();
      return;
    }
    // Toggle expandable modules (including messages now)
    setExpandedModule(expandedModule === moduleId ? null : moduleId);
  };

  const getIconColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      amber: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
      blue: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
      rose: { bg: 'bg-rose-100 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400' },
      green: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
    };
    return colorMap[color] || colorMap.blue;
  };

  const renderModuleContent = (module: CommunicationModule) => {
    if (module.id === 'messages') {
      return (
        <div className="h-[500px]">
          <MessagingInterface embedded />
        </div>
      );
    }
    return module.component;
  };

  return (
    <Card className="bg-background/95 backdrop-blur-sm">
      <CardHeader className="pt-4 pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Communications
          <span className="text-[10px] md:text-xs font-normal text-foreground/70 ml-2 uppercase">
            stay connected!
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-auto max-h-[600px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
            {modules.map((module) => {
              const IconComponent = module.icon;
              const colorClasses = getIconColorClasses(module.iconColor);
              const isExpanded = expandedModule === module.id;
              const hasExpandableContent = module.component || module.isEmbedded;

              return (
                <Collapsible
                  key={module.id}
                  open={isExpanded}
                  onOpenChange={() => handleModuleClick(module.id)}
                  className={cn(
                    "col-span-1",
                    isExpanded && hasExpandableContent && "md:col-span-2"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg border bg-card text-card-foreground transition-all duration-300",
                      isExpanded && hasExpandableContent && "border-primary/50"
                    )}
                  >
                    <CollapsibleTrigger asChild>
                      <div
                        className={cn(
                          "relative flex items-center justify-between p-3 pr-10 cursor-pointer hover:bg-accent/50 transition-colors rounded-lg",
                          isExpanded && hasExpandableContent && "rounded-b-none border-b border-border"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn("p-2 rounded-lg", colorClasses.bg)}>
                            <IconComponent className={cn("h-4 w-4", colorClasses.text)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-card-foreground">
                              {module.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {module.description}
                            </p>
                          </div>
                        </div>
                        {hasExpandableContent ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 p-2 h-auto rounded-md text-muted-foreground hover:text-foreground transition-all"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <div className="absolute top-2 right-2 p-2">
                            <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                    </CollapsibleTrigger>

                    {hasExpandableContent && (
                      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                        <div className="p-4 pt-2 relative">
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
                          {renderModuleContent(module)}
                        </div>
                      </CollapsibleContent>
                    )}
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
