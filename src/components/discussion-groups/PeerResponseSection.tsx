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
  const respondedToAuthors = new Set(myResponses.map(r => {
    const parent = groupPosts.find(p => p.id === r.parent_post_id);
    return parent?.author_id;
  }));
  
  const requiredResponses = 2;
  const completedResponses = myResponses.length;
  
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
  
  const getPostResponses = (postId: string) => {
    return groupPosts.filter(p => p.parent_post_id === postId && p.post_type === 'peer_response');
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Peer Responses
          </CardTitle>
          <div className="flex items-center gap-2">
            {completedResponses >= requiredResponses ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Complete ({completedResponses}/{requiredResponses})
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                {completedResponses}/{requiredResponses} required
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
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
        
        {peerPosts.map(post => {
          const responses = getPostResponses(post.id);
          const hasResponded = respondedToAuthors.has(post.author_id);
          const isExpanded = expandedPosts.has(post.id);
          
          return (
            <Collapsible 
              key={post.id} 
              open={isExpanded} 
              onOpenChange={() => toggleExpanded(post.id)}
            >
              <div className={cn(
                "border rounded-lg transition-all",
                hasResponded && "border-green-500/30 bg-green-500/5"
              )}>
                {/* Post Header */}
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {post.author?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{post.author?.full_name || 'Anonymous'}</span>
                          {hasResponded && (
                            <Badge variant="outline" className="text-green-600 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Responded
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {post.word_count} words • {format(new Date(post.submitted_at || post.created_at), 'MMM d, h:mm a')}
                        </p>
                        <p className="mt-2 text-sm line-clamp-2">
                          {post.content.substring(0, 150)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{responses.length} replies</Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="border-t px-4 py-4 space-y-4">
                    {/* Full Post Content */}
                    <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/30 p-4 rounded-lg">
                      {post.content.split('\n').map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                    
                    {/* Existing Responses */}
                    {responses.length > 0 && (
                      <div className="space-y-3 pl-6 border-l-2 border-muted">
                        {responses.map(response => {
                          const TagIcon = RESPONSE_TAGS.find(t => t.id === response.response_tag)?.icon || MessageSquare;
                          return (
                            <div key={response.id} className="p-3 bg-background rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {response.author?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{response.author?.full_name}</span>
                                {response.response_tag && (
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <TagIcon className="h-3 w-3" />
                                    {response.response_tag}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm">{response.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Reply Form */}
                    {isPhaseActive && !hasResponded && replyingTo !== post.id && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setReplyingTo(post.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Write Response
                      </Button>
                    )}
                    
                    {replyingTo === post.id && (
                      <div className="space-y-3 p-4 border rounded-lg bg-background">
                        {/* Tag Selection */}
                        <div>
                          <p className="text-sm font-medium mb-2">Response Type</p>
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
                                      ? "border-primary bg-primary/5" 
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
                          placeholder="Write your response..."
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
                              Submit Response
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};
