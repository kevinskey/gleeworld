import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, 
  Search, 
  Sparkles, 
  TrendingUp,
  Clock,
  Heart
} from 'lucide-react';
import { UnifiedFeedCard } from './UnifiedFeedCard';
import { UnifiedEntry } from '@/types/unified-feed';
import { cn } from '@/lib/utils';

interface UnifiedFeedProps {
  entries: UnifiedEntry[];
  onReaction: (entryId: string, reaction: string) => void;
  onShare: (entryId: string) => void;
  onReply: (entryId: string) => void;
  loading?: boolean;
}

export const UnifiedFeed: React.FC<UnifiedFeedProps> = ({
  entries,
  onReaction,
  onShare,
  onReply,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');

  const filterOptions = [
    { id: 'announcement', label: 'Announcements', color: 'bg-blue-100 text-blue-800' },
    { id: 'love_note', label: 'Love Notes', color: 'bg-pink-100 text-pink-800' },
    { id: 'wellness_check', label: 'Wellness', color: 'bg-green-100 text-green-800' },
    { id: 'message', label: 'Messages', color: 'bg-purple-100 text-purple-800' },
    { id: 'notification', label: 'Updates', color: 'bg-orange-100 text-orange-800' }
  ];

  const filteredAndSortedEntries = useMemo(() => {
    let filtered = entries;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(entry =>
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.author.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filters
    if (selectedFilters.length > 0) {
      filtered = filtered.filter(entry => selectedFilters.includes(entry.type));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          const aScore = (a.engagement?.views || 0) + (a.engagement?.shares || 0) * 2;
          const bScore = (b.engagement?.views || 0) + (b.engagement?.shares || 0) * 2;
          return bScore - aScore;
        case 'trending':
          const aReactions = a.reactions?.reduce((sum, r) => sum + r.count, 0) || 0;
          const bReactions = b.reactions?.reduce((sum, r) => sum + r.count, 0) || 0;
          return bReactions - aReactions;
        case 'recent':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });

    return filtered;
  }, [entries, searchQuery, selectedFilters, sortBy]);

  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border pb-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feed..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Sort:</span>
          <div className="flex gap-1">
            {[
              { id: 'recent', label: 'Recent', icon: Clock },
              { id: 'popular', label: 'Popular', icon: TrendingUp },
              { id: 'trending', label: 'Trending', icon: Sparkles }
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={sortBy === id ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy(id as any)}
                className="gap-1"
              >
                <Icon className="h-3 w-3" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Type Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filter:</span>
          </div>
          {filterOptions.map(({ id, label, color }) => (
            <Badge
              key={id}
              variant={selectedFilters.includes(id) ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all hover:scale-105",
                selectedFilters.includes(id) && color
              )}
              onClick={() => toggleFilter(id)}
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Feed Content */}
      <div className="space-y-4">
        {filteredAndSortedEntries.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No entries found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedFilters.length > 0
                ? "Try adjusting your search or filters"
                : "Be the first to share something with the community!"}
            </p>
          </div>
        ) : (
          filteredAndSortedEntries.map((entry) => (
            <UnifiedFeedCard
              key={entry.id}
              entry={entry}
              onReaction={onReaction}
              onShare={onShare}
              onReply={onReply}
            />
          ))
        )}
      </div>
    </div>
  );
};