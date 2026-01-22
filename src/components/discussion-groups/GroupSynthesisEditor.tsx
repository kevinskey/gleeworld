import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, Send, CheckCircle2, Lock, AlertCircle,
  FileText, UserCheck, UserX
} from 'lucide-react';
import { 
  DiscussionPrompt, 
  DiscussionPost,
  DiscussionGroup,
  usePostMutation 
} from '@/hooks/useDiscussionGroups';
import { cn } from '@/lib/utils';

interface GroupSynthesisEditorProps {
  prompt: DiscussionPrompt;
  group: DiscussionGroup;
  groupPosts: DiscussionPost[];
  existingSynthesis?: DiscussionPost | null;
  isPhaseActive: boolean;
  onSubmitted?: () => void;
}

export const GroupSynthesisEditor: React.FC<GroupSynthesisEditorProps> = ({
  prompt,
  group,
  groupPosts,
  existingSynthesis,
  isPhaseActive,
  onSubmitted
}) => {
  const [content, setContent] = useState(existingSynthesis?.content || '');
  const [checklist, setChecklist] = useState({
    consensus: false,
    disagreement: false,
    openQuestion: false
  });
  
  const postMutation = usePostMutation(prompt.id);
  
  // Check member participation
  const memberPosts = groupPosts.filter(p => p.post_type === 'individual' && !p.is_draft);
  const memberResponses = groupPosts.filter(p => p.post_type === 'peer_response');
  
  const memberStatus = (group.members || []).map(member => {
    const hasPost = memberPosts.some(p => p.author_id === member.user_id);
    const responseCount = memberResponses.filter(p => p.author_id === member.user_id).length;
    return {
      ...member,
      hasPost,
      responseCount,
      meetsMinium: hasPost && responseCount >= 2
    };
  });
  
  const allMembersMeetMinimum = memberStatus.every(m => m.meetsMinium);
  const isLocked = existingSynthesis && !existingSynthesis.is_draft;
  const canSubmit = allMembersMeetMinimum && 
    checklist.consensus && 
    checklist.disagreement && 
    checklist.openQuestion &&
    content.trim().length > 0;
  
  const handleSubmit = async () => {
    if (!canSubmit) return;
    
    await postMutation.mutateAsync({
      content,
      post_type: 'synthesis',
      group_id: group.id,
      is_draft: false
    });
    
    onSubmitted?.();
  };
  
  if (isLocked) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Group Synthesis Submitted
            </CardTitle>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Lock className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert bg-background/50 p-4 rounded-lg">
            {existingSynthesis?.content.split('\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Submitted by {group.name}</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!isPhaseActive) {
    return (
      <Card className="opacity-75">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Group Synthesis Phase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This phase is not currently active. Complete the peer response phase first.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Group Synthesis
          </CardTitle>
          <Badge variant="outline">{group.name}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Member Status */}
        <div className="p-4 border rounded-lg bg-muted/30">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Group Member Status
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {memberStatus.map(member => (
              <div 
                key={member.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg",
                  member.meetsMinium ? "bg-green-500/10" : "bg-orange-500/10"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {member.profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.hasPost ? '✓ Post' : '○ No post'} • {member.responseCount}/2 responses
                  </p>
                </div>
                {member.meetsMinium ? (
                  <UserCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <UserX className="h-4 w-4 text-orange-600 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
          
          {!allMembersMeetMinimum && (
            <Alert className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                All group members must complete their individual post and 2 peer responses before synthesis can be submitted.
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* Synthesis Editor */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Collaborative Summary</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Work with your group to synthesize the discussion. One group member should type the final summary.
            </p>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="As a group, summarize the key points from your discussion. Identify areas of consensus, disagreement, and questions that remain open..."
              className="min-h-[200px] resize-y"
              disabled={!allMembersMeetMinimum}
            />
          </div>
          
          {/* Checklist */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3">Required Elements</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="consensus" 
                  checked={checklist.consensus}
                  onCheckedChange={(checked) => setChecklist(prev => ({ ...prev, consensus: !!checked }))}
                />
                <Label htmlFor="consensus" className="text-sm">
                  Identifies points of <strong>consensus</strong> among the group
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="disagreement" 
                  checked={checklist.disagreement}
                  onCheckedChange={(checked) => setChecklist(prev => ({ ...prev, disagreement: !!checked }))}
                />
                <Label htmlFor="disagreement" className="text-sm">
                  Acknowledges areas of <strong>disagreement</strong> or differing perspectives
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="openQuestion" 
                  checked={checklist.openQuestion}
                  onCheckedChange={(checked) => setChecklist(prev => ({ ...prev, openQuestion: !!checked }))}
                />
                <Label htmlFor="openQuestion" className="text-sm">
                  Poses at least one <strong>open question</strong> for further exploration
                </Label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Submit */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit}
            disabled={!canSubmit || postMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit Group Synthesis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
