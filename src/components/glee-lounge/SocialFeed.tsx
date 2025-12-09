import { forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { useSocialFeed } from '@/hooks/useSocialFeed';
import { PostCard } from './PostCard';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';

interface SocialFeedProps {
  userProfile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface SocialFeedRef {
  refresh: () => void;
}

export const SocialFeed = forwardRef<SocialFeedRef, SocialFeedProps>(function SocialFeed({ userProfile }, ref) {
  const { posts, isLoading, hasMore, loadMore, refresh, newPostsAvailable } = useSocialFeed();

  // Expose refresh method to parent via ref
  useImperativeHandle(ref, () => ({
    refresh
  }), [refresh]);

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-muted-foreground">Loading the lounge...</p>
      </div>
    );
  }

  return (
    <div>
      {/* New posts notification */}
      {newPostsAvailable && (
        <Button
          variant="default"
          size="sm"
          className="w-full mb-4 gap-2"
          onClick={refresh}
        >
          <Sparkles className="h-4 w-4" />
          New posts available - tap to refresh
        </Button>
      )}

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <div className="text-4xl mb-3">🛋️</div>
          <h3 className="text-lg font-semibold mb-1">The lounge is quiet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to share what's on your mind!
          </p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userProfile={userProfile}
              onRefresh={refresh}
            />
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={loadMore}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Load more
              </Button>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              You've reached the end 🎵
            </p>
          )}
        </>
      )}
    </div>
  );
});
