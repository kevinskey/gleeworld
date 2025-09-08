export interface UnifiedEntry {
  id: string;
  type: 'announcement' | 'love_note' | 'wellness_check' | 'message' | 'notification';
  title?: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  category?: string;
  tags?: string[];
  timestamp: Date;
  visibility: 'public' | 'members' | 'private' | 'alumni';
  reactions?: {
    type: 'heart' | 'clap' | 'star' | 'thumbs_up';
    count: number;
    userReacted: boolean;
  }[];
  attachments?: {
    type: 'image' | 'audio' | 'file';
    url: string;
    name?: string;
  }[];
  metadata?: {
    wellness_score?: number;
    color?: string;
    recipient?: string;
    streak_day?: number;
    badge_earned?: string;
  };
  engagement?: {
    views: number;
    shares: number;
    replies: number;
  };
}

export interface UserProgress {
  user_id: string;
  wellness_streak: number;
  love_streak: number;
  total_contributions: number;
  badges: string[];
  level: number;
  points: number;
}

export const ENTRY_COLORS = {
  announcement: 'hsl(var(--blue-500))',
  love_note: 'hsl(var(--pink-500))',
  wellness_check: 'hsl(var(--green-500))',
  message: 'hsl(var(--purple-500))',
  notification: 'hsl(var(--orange-500))'
} as const;

export const BADGES = {
  love_streak_7: { name: 'Love Spreader', icon: '💕', description: '7 days of sending love' },
  wellness_streak_14: { name: 'Wellness Warrior', icon: '🌟', description: '14 days of wellness checks' },
  community_contributor: { name: 'Community Star', icon: '⭐', description: '50+ community contributions' },
  early_bird: { name: 'Early Bird', icon: '🐦', description: 'First to respond to announcements' },
  harmony_helper: { name: 'Harmony Helper', icon: '🎵', description: 'Supports others consistently' }
} as const;