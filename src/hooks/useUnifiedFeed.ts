import { useState, useEffect } from 'react';
import { UnifiedEntry, UserProgress } from '@/types/unified-feed';
import { supabase } from '@/integrations/supabase/client';

export const useUnifiedFeed = () => {
  const [entries, setEntries] = useState<UnifiedEntry[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock implementation - replace with real Supabase queries
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Mock data - replace with real queries
        const mockEntries: UnifiedEntry[] = [
          {
            id: '1',
            type: 'announcement',
            title: 'Welcome New Members!',
            content: 'We\'re excited to welcome 12 new members to the Spelman Glee Club family! Please join us in making them feel at home.',
            author: { id: '1', name: 'Dr. Johnson', avatar: '', role: 'Director' },
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            visibility: 'members',
            reactions: [
              { type: 'heart', count: 24, userReacted: true },
              { type: 'clap', count: 8, userReacted: false }
            ],
            engagement: { views: 156, shares: 3, replies: 7 },
            tags: ['welcome', 'new-members']
          },
          {
            id: '2',
            type: 'love_note',
            content: 'Your solo in today\'s rehearsal gave me chills! You\'ve grown so much as a performer. Keep shining! ✨',
            author: { id: '2', name: 'Sarah M.', avatar: '', role: 'Soprano' },
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            visibility: 'members',
            reactions: [
              { type: 'heart', count: 12, userReacted: false },
              { type: 'star', count: 5, userReacted: true }
            ],
            engagement: { views: 45, shares: 1, replies: 2 },
            metadata: { color: 'pink', recipient: 'Jessica T.' }
          },
          {
            id: '3',
            type: 'wellness_check',
            title: 'Daily Wellness Check',
            content: 'Feeling energized and ready for tonight\'s performance! Did my vocal warm-ups and staying hydrated 💧',
            author: { id: '3', name: 'Maya L.', avatar: '', role: 'Alto' },
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            visibility: 'members',
            reactions: [
              { type: 'thumbs_up', count: 18, userReacted: true },
              { type: 'heart', count: 6, userReacted: false }
            ],
            engagement: { views: 78, shares: 2, replies: 4 },
            metadata: { 
              wellness_score: 8, 
              streak_day: 14,
              badge_earned: 'wellness_streak_14'
            }
          }
        ];

        const mockUserProgress: UserProgress = {
          user_id: 'current-user',
          wellness_streak: 14,
          love_streak: 7,
          total_contributions: 89,
          badges: ['wellness_streak_14', 'love_streak_7', 'community_contributor'],
          level: 3,
          points: 2890
        };

        setEntries(mockEntries);
        setUserProgress(mockUserProgress);
      } catch (err) {
        console.error('Error fetching unified feed:', err);
        setError('Failed to load community feed');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const addReaction = async (entryId: string, reactionType: string) => {
    try {
      // Update local state optimistically
      setEntries(prev => prev.map(entry => {
        if (entry.id === entryId) {
          const reactions = entry.reactions || [];
          const existingReaction = reactions.find(r => r.type === reactionType);
          
          if (existingReaction) {
            if (existingReaction.userReacted) {
              // Remove reaction
              existingReaction.count -= 1;
              existingReaction.userReacted = false;
            } else {
              // Add reaction
              existingReaction.count += 1;
              existingReaction.userReacted = true;
            }
          } else {
            // Create new reaction
            reactions.push({
              type: reactionType as any,
              count: 1,
              userReacted: true
            });
          }
          
          return { ...entry, reactions };
        }
        return entry;
      }));

      // TODO: Send to Supabase
      console.log('Adding reaction:', entryId, reactionType);
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  const shareEntry = async (entryId: string) => {
    try {
      // Update share count
      setEntries(prev => prev.map(entry => {
        if (entry.id === entryId) {
          return {
            ...entry,
            engagement: {
              ...entry.engagement,
              shares: (entry.engagement?.shares || 0) + 1
            }
          };
        }
        return entry;
      }));

      // TODO: Implement actual sharing logic
      console.log('Sharing entry:', entryId);
    } catch (err) {
      console.error('Error sharing entry:', err);
    }
  };

  const replyToEntry = async (entryId: string) => {
    try {
      // TODO: Implement reply functionality
      console.log('Replying to entry:', entryId);
    } catch (err) {
      console.error('Error replying to entry:', err);
    }
  };

  return {
    entries,
    userProgress,
    loading,
    error,
    addReaction,
    shareEntry,
    replyToEntry
  };
};