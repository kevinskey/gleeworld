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
  announcement: 'hsl(219, 94%, 60%)', // Blue
  love_note: 'hsl(330, 81%, 60%)', // Pink  
  wellness_check: 'hsl(142, 71%, 45%)', // Green
  message: 'hsl(262, 83%, 58%)', // Purple
  notification: 'hsl(25, 95%, 53%)' // Orange
} as const;

export const BADGES = {
  love_streak_7: { name: 'Love Spreader', icon: '💕', description: '7 days of sending love' },
  wellness_streak_14: { name: 'Wellness Warrior', icon: '🌟', description: '14 days of wellness checks' },
  community_contributor: { name: 'Community Star', icon: '⭐', description: '50+ community contributions' },
  early_bird: { name: 'Early Bird', icon: '🐦', description: 'First to respond to announcements' },
  harmony_helper: { name: 'Harmony Helper', icon: '🎵', description: 'Supports others consistently' }
} as const;