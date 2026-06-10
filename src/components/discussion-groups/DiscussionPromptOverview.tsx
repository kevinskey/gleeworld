import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowLeft, Clock, FileText, Video, Music, Link, 
  ChevronDown, ChevronUp, Users, Award
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  DiscussionPrompt, 
  useDiscussionRubric, 
  useMyDiscussionGroup,
  getPhaseInfo 
} from '@/hooks/useDiscussionGroups';
import { cn } from '@/lib/utils';

interface DiscussionPromptOverviewProps {
  prompt: DiscussionPrompt;
  onBack: () => void;
  onContinue: () => void;
}

export const DiscussionPromptOverview: React.FC<DiscussionPromptOverviewProps> = ({
  prompt,
  onBack,
  onContinue
}) => {
  const [rubricOpen, setRubricOpen] = useState(false);
  const { data: rubric } = useDiscussionRubric(prompt.id);
  const { data: myGroup } = useMyDiscussionGroup(prompt.id);
  const { activePhase, phases, isClosed } = getPhaseInfo(prompt);
  
  const getStimulusEmbed = () => {
    if (!prompt.stimulus_url || prompt.stimulus_type === 'none') return null;
    
    switch (prompt.stimulus_type) {
      case 'video':
        // YouTube embed
        if (prompt.stimulus_url.includes('youtube') || prompt.stimulus_url.includes('youtu.be')) {
          const videoId = prompt.stimulus_url.includes('youtu.be') 
            ? prompt.stimulus_url.split('/').pop()
            : new URLSearchParams(new URL(prompt.stimulus_url).search).get('v');
          return (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        }
        return (
          <video src={prompt.stimulus_url} controls className="w-full rounded-lg" />
        );
        
      case 'audio':
        return (
          <audio src={prompt.stimulus_url} controls className="w-full" />
        );
        
      case 'pdf':
        return (
          <a 
            href={prompt.stimulus_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-4 border rounded-lg hover:bg-muted transition-colors"
          >
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">View PDF Document</p>
              <p className="text-sm text-muted-foreground">Opens in new tab</p>
            </div>
          </a>
        );
        
      case 'link':
        return (
          <a 
            href={prompt.stimulus_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-4 border rounded-lg hover:bg-muted transition-colors"
          >
            <Link className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">View Resource</p>
              <p className="text-sm text-muted-foreground truncate max-w-md">{prompt.stimulus_url}</p>
            </div>
          </a>
        );
        
      default:
        return null;
    }
  };
  
  const totalPoints = rubric?.reduce((sum, r) => sum + r.max_points, 0) || 100;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{prompt.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant={isClosed ? 'secondary' : 'default'} className="capitalize">
              {activePhase.replace('_', ' ')}
            </Badge>
            {myGroup && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {myGroup.name}
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={onContinue} disabled={isClosed}>
          {isClosed ? 'Discussion Closed' : 'Continue to Discussion'}
        </Button>
      </div>
      
      {/* Deadlines */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {phases.map((phase, i) => {
              const isActive = phase.id === activePhase;
              const isPast = new Date() > phase.deadline;
              return (
                <div 
                  key={phase.id}
                  className={cn(
                    "text-center p-3 rounded-lg border-2 transition-all",
                    isActive && "border-primary bg-primary/5",
                    !isActive && isPast && "border-muted bg-muted/30",
                    !isActive && !isPast && "border-transparent"
                  )}
                >
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{phase.label}</p>
                  <p className="font-semibold mt-1">{format(phase.deadline, 'MMM d, h:mm a')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isPast ? 'Completed' : formatDistanceToNow(phase.deadline, { addSuffix: true })}
                  </p>
                  <Badge variant="outline" className="mt-2">{phase.weight}%</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Stimulus */}
      {prompt.stimulus_type !== 'none' && prompt.stimulus_url && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {prompt.stimulus_type === 'video' && <Video className="h-5 w-5" />}
              {prompt.stimulus_type === 'audio' && <Music className="h-5 w-5" />}
              {prompt.stimulus_type === 'pdf' && <FileText className="h-5 w-5" />}
              {prompt.stimulus_type === 'link' && <Link className="h-5 w-5" />}
              Resource Material
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getStimulusEmbed()}
          </CardContent>
        </Card>
      )}
      
      {/* Prompt Text */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Discussion Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: prompt.prompt_text.replace(/\n/g, '<br/>') }}
          />
          <div className="flex gap-4 mt-4 pt-4 border-t text-sm text-muted-foreground">
            <span>Word range: {prompt.word_min}–{prompt.word_max}</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Rubric */}
      <Card>
        <Collapsible open={rubricOpen} onOpenChange={setRubricOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Grading Rubric ({totalPoints} points)
                </CardTitle>
                {rubricOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {rubric && rubric.length > 0 ? (
                  rubric.map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{item.category}</h4>
                        <Badge>{item.max_points} pts</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.criteria}</p>
                    </div>
                  ))
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Individual Post</h4>
                        <Badge>40 pts</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Original thinking, reference to stimulus, clear thesis, proper word count
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Peer Responses</h4>
                        <Badge>30 pts</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Minimum 2 substantive responses using challenge/extend/connect/question framework
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Group Synthesis</h4>
                        <Badge>20 pts</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Collaborative summary identifying consensus, disagreement, and open questions
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Professionalism</h4>
                        <Badge>10 pts</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Respectful tone, timely submissions, proper citations
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};
