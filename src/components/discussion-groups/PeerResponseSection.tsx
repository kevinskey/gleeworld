import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, Send, ChevronDown, ChevronUp,
  Zap, ArrowUpRight, Link2, HelpCircle, CheckCircle2, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  DiscussionPrompt, 
  DiscussionPost,
  usePostMutation 
} from '@/hooks/useDiscussionGroups';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PeerResponseSectionProps {
  prompt: DiscussionPrompt;
  groupPosts: DiscussionPost[];
  myPosts: DiscussionPost[];
  currentUserId: string;
  isPhaseActive: boolean;
  onResponseAdded?: () => void;
}

const RESPONSE_TAGS = [
  { id: 'challenge', label: 'Challenge', icon: Zap, description: 'Respectfully disagree or offer a counter-argument' },
  { id: 'extend', label: 'Extend', icon: ArrowUpRight, description: 'Build upon or expand the idea' },
  { id: 'connect', label: 'Connect', icon: Link2, description: 'Link to other concepts or experiences' },
  { id: 'question', label: 'Question', icon: HelpCircle, description: 'Ask for clarification or deeper exploration' }
] as const;

export const PeerResponseSection: React.FC<PeerResponseSectionProps> = ({
  prompt,
  groupPosts,
  myPosts,
  currentUserId,
  isPhaseActive,
  onResponseAdded
}) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  
  const postMutation = usePostMutation(prompt.id);
  
  // Filter to only show individual posts from other users
  const peerPosts = groupPosts.filter(p => 
    p.post_type === 'individual' && 
    p.author_id !== currentUserId &&
    !p.is_draft
  );
  
  // Get my responses
  const myResponses = myPosts.filter(p => p.post_type === 'peer_response');
  
  // Track responses for display purposes only (no longer restricting)
  const myResponseCount = myResponses.length;
  
  const suggestedResponses = 2; // Suggested minimum, not enforced
  
  const toggleExpanded = (postId: string) => {
    const newExpanded = new Set(expandedPosts);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedPosts(newExpanded);
  };
  
  const handleSubmitResponse = async (parentPostId: string, groupId: string | null) => {
    if (!selectedTag || !replyContent.trim()) return;
    
    await postMutation.mutateAsync({
      content: replyContent,
      post_type: 'peer_response',
      parent_post_id: parentPostId,
      group_id: groupId || undefined,
      response_tag: selectedTag as any,
      is_draft: false
    });
    
    setReplyingTo(null);
    setReplyContent('');
    setSelectedTag(null);
    onResponseAdded?.();
  };
  
  // Combine all posts (group + my) to find responses, removing duplicates by id
  const allPosts = [...groupPosts, ...myPosts];
  const uniquePosts = Array.from(new Map(allPosts.map(p => [p.id, p])).values());
  
  const getPostResponses = (postId: string) => {
    return uniquePosts.filter(p => p.parent_post_id === postId && p.post_type === 'peer_response');
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Discussion Forum
          </CardTitle>
          <div className="flex items-center gap-2">
            {myResponseCount >= suggestedResponses ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {myResponseCount} responses
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                {myResponseCount}/{suggestedResponses} suggested
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Engage with your peers' posts. We suggest responding to at least {suggestedResponses} posts.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!isPhaseActive && (
          <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
            Peer response phase is not currently active
          </div>
        )}
        
        {peerPosts.length === 0 && (
          <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
            No peer posts available yet. Check back after the individual phase ends.
          </div>
        )}
        
        {/* Forum-style threaded posts */}
        {peerPosts.map(post => {
          const responses = getPostResponses(post.id);
          const isExpanded = expandedPosts.has(post.id);
          
          return (
            <div key={post.id} className="border rounded-lg overflow-hidden">
              {/* Original Post */}
              <div className="p-4 bg-card">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback>
                      {post.author?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{post.author?.full_name || 'Anonymous'}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(post.submitted_at || post.created_at), 'MMM d, yyyy • h:mm a')}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {post.word_count} words
                      </Badge>
                    </div>
                    
                    {/* Full post content - always visible */}
                    <div className="mt-3 prose prose-sm max-w-none dark:prose-invert">
                      {post.content.split('\n').map((paragraph, i) => (
                        <p key={i} className="text-sm leading-relaxed">{paragraph}</p>
                      ))}
                    </div>
                    
                    {/* Response count and expand toggle */}
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={() => toggleExpanded(post.id)}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {responses.length} {responses.length === 1 ? 'response' : 'responses'}
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Threaded Responses - Indented */}
              {(isExpanded || responses.length > 0) && (
                <div className="bg-muted/30 border-t">
                  {/* All responses visible to everyone */}
                  {responses.length > 0 && (
                    <div className="divide-y divide-border/50">
                      {responses.map(response => {
                        const TagIcon = RESPONSE_TAGS.find(t => t.id === response.response_tag)?.icon || MessageSquare;
                        const tagInfo = RESPONSE_TAGS.find(t => t.id === response.response_tag);
                        const isMyResponse = response.author_id === currentUserId;
                        
                        return (
                          <div 
                            key={response.id} 
                            className={cn(
                              "p-4 pl-8 md:pl-12",
                              isMyResponse && "bg-primary/5"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {/* Thread connector line */}
                              <div className="hidden md:flex flex-col items-center mr-2">
                                <div className="w-px h-4 bg-border" />
                                <div className="w-4 h-px bg-border" />
                              </div>
                              
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-xs">
                                  {response.author?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">
                                    {response.author?.full_name || 'Anonymous'}
                                    {isMyResponse && <span className="text-primary ml-1">(you)</span>}
                                  </span>
                                  {response.response_tag && tagInfo && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs flex items-center gap-1"
                                    >
                                      <TagIcon className="h-3 w-3" />
                                      {tagInfo.label}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(response.submitted_at || response.created_at), 'MMM d • h:mm a')}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm">{response.content}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Reply Form - always show if phase is active */}
                  {isPhaseActive && (
                    <div className="p-4 pl-8 md:pl-12 border-t">
                      {replyingTo !== post.id ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setReplyingTo(post.id)}
                          className="gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Add Your Response
                        </Button>
                      ) : (
                        <div className="space-y-3 p-4 border rounded-lg bg-background">
                          {/* Tag Selection */}
                          <div>
                            <p className="text-sm font-medium mb-2">How are you responding?</p>
                            <div className="grid grid-cols-2 gap-2">
                              {RESPONSE_TAGS.map(tag => {
                                const Icon = tag.icon;
                                return (
                                  <button
                                    key={tag.id}
                                    onClick={() => setSelectedTag(tag.id)}
                                    className={cn(
                                      "p-3 border rounded-lg text-left transition-all",
                                      selectedTag === tag.id 
                                        ? "border-primary bg-primary/10" 
                                        : "hover:bg-muted"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <Icon className="h-4 w-4" />
                                      <span className="font-medium text-sm">{tag.label}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{tag.description}</p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          
                          <Textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write your thoughtful response..."
                            className="min-h-[100px]"
                          />
                          
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">
                              {replyContent.trim().split(/\s+/).filter(w => w.length > 0).length} words
                            </span>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyContent('');
                                  setSelectedTag(null);
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleSubmitResponse(post.id, post.group_id)}
                                disabled={!selectedTag || !replyContent.trim() || postMutation.isPending}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Post Response
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
