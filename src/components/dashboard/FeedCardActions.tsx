import React from 'react';
import { Heart, Bookmark, Share2 } from 'lucide-react';

interface FeedCardActionsProps {
  isLiked: boolean;
  isBookmarked: boolean;
  onLike: (e: React.MouseEvent) => void;
  onBookmark: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
}

export const FeedCardActions: React.FC<FeedCardActionsProps> = ({
  isLiked, isBookmarked, onLike, onBookmark, onShare,
}) => {
  return (
    <div className="flex items-center gap-1 pt-1.5 mt-1.5 border-t border-white/10">
      <button
        onClick={onLike}
        className="p-1 rounded hover:bg-white/10 transition-colors"
        aria-label="Like"
      >
        <Heart className={`h-3.5 w-3.5 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-white/40 hover:text-white/70'}`} />
      </button>
      <button
        onClick={onBookmark}
        className="p-1 rounded hover:bg-white/10 transition-colors"
        aria-label="Bookmark"
      >
        <Bookmark className={`h-3.5 w-3.5 transition-colors ${isBookmarked ? 'fill-blue-400 text-blue-400' : 'text-white/40 hover:text-white/70'}`} />
      </button>
      <button
        onClick={onShare}
        className="p-1 rounded hover:bg-white/10 transition-colors ml-auto"
        aria-label="Share"
      >
        <Share2 className="h-3.5 w-3.5 text-white/40 hover:text-white/70 transition-colors" />
      </button>
    </div>
  );
};
