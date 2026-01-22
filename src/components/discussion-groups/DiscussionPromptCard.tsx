import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, Users, MessageSquare, FileText, 
  Video, Music, Link, ChevronRight, Lock, CheckCircle2
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { DiscussionPrompt, getPhaseInfo } from '@/hooks/useDiscussionGroups';
import { cn } from '@/lib/utils';

interface DiscussionPromptCardProps {
  prompt: DiscussionPrompt;
  onClick: () => void;
  myPostsCount?: number;
  myPeerResponsesCount?: number;
  hasSynthesis?: boolean;
}

export const DiscussionPromptCard: React.FC<DiscussionPromptCardProps> = ({
  prompt,
  onClick,
  myPostsCount = 0,
  myPeerResponsesCount = 0,
  hasSynthesis = false
}) => {
  const { activePhase, phases, isClosed } = getPhaseInfo(prompt);
  
  const getStimulusIcon = () => {
    switch (prompt.stimulus_type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'link': return <Link className="h-4 w-4" />;
      default: return null;
    }
  };
  
  const getPhaseProgress = () => {
    if (isClosed) return 100;
    const currentIndex = phases.findIndex(p => p.id === activePhase);
    if (currentIndex === -1) return 0;
    return ((currentIndex + 1) / phases.length) * 100;
  };
  
  const getCompletionStatus = () => {
    const tasks = [
      { done: myPostsCount > 0, label: 'Individual' },
      { done: myPeerResponsesCount >= 2, label: 'Responses' },
      { done: hasSynthesis, label: 'Synthesis' }
    ];
    const completed = tasks.filter(t => t.done).length;
    return { tasks, completed, total: tasks.length };
  };
  
  const { tasks, completed, total } = getCompletionStatus();
  
  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-all cursor-pointer group",
        isClosed && "opacity-80"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isClosed ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Closed
                </Badge>
              ) : (
                <Badge 
                  variant={activePhase === 'individual_open' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {activePhase.replace('_', ' ')}
                </Badge>
              )}
              {prompt.stimulus_type !== 'none' && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {getStimulusIcon()}
                  {prompt.stimulus_type}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {prompt.title}
            </CardTitle>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Phase Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(getPhaseProgress())}%</span>
          </div>
          <Progress value={getPhaseProgress()} className="h-2" />
          <div className="flex justify-between text-xs">
            {phases.map((phase, i) => {
              const isActive = phase.id === activePhase;
              const isPastPhase = isPast(phase.deadline);
              return (
                <div 
                  key={phase.id}
                  className={cn(
                    "flex flex-col items-center",
                    isActive && "text-primary font-medium",
                    isPastPhase && !isActive && "text-muted-foreground"
                  )}
                >
                  <span className="truncate max-w-[80px]">{phase.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(phase.deadline, 'MMM d')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Your Completion */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3">
            {tasks.map((task, i) => (
              <div key={i} className="flex items-center gap-1 text-xs">
                {task.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
                )}
                <span className={task.done ? 'text-green-600' : 'text-muted-foreground'}>
                  {task.label}
                </span>
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {completed}/{total}
          </span>
        </div>
        
        {/* Next Deadline */}
        {!isClosed && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Next deadline: {formatDistanceToNow(new Date(
                phases.find(p => p.id === activePhase)?.deadline || prompt.synthesis_due_at
              ), { addSuffix: true })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
