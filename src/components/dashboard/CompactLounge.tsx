import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSocialFeed } from '@/hooks/useSocialFeed';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sofa, ArrowRight, MessageCircle, Heart, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const CompactLounge = () => {
  const navigate = useNavigate();
  const { posts, isLoading } = useSocialFeed();

  // Show only the 3 most recent posts
  const recentPosts = posts.slice(0, 3);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sofa className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Glee Lounge</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/glee-lounge')}
            className="text-primary hover:text-primary/80 gap-1"
          >
            View Lounge <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : recentPosts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm">No posts yet. Be the first to share!</p>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => navigate('/glee-lounge')}
              className="mt-3"
            >
              Go to Lounge
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <div 
                key={post.id} 
                className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => navigate('/glee-lounge')}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={post.author?.avatar_url || ''} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(post.author?.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">
                      {post.author?.full_name || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {post.reactions ? Object.values(post.reactions).reduce((a, b) => a + b, 0) : 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {post.comment_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
