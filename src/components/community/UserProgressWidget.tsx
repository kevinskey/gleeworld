import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Flame, 
  Heart, 
  Activity, 
  Star,
  TrendingUp
} from 'lucide-react';
import { UserProgress, BADGES } from '@/types/unified-feed';
import { cn } from '@/lib/utils';

interface UserProgressWidgetProps {
  progress: UserProgress;
  compact?: boolean;
}

export const UserProgressWidget: React.FC<UserProgressWidgetProps> = ({
  progress,
  compact = false
}) => {
  const levelProgress = (progress.points % 1000) / 10; // Assuming 1000 points per level
  const nextLevelPoints = (progress.level + 1) * 1000;

  if (compact) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold">Level {progress.level}</span>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3" />
              {progress.points}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-muted-foreground">Wellness:</span>
              <span className="font-medium">{progress.wellness_streak}</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-500" />
              <span className="text-muted-foreground">Love:</span>
              <span className="font-medium">{progress.love_streak}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Level {progress.level}</span>
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3" />
              {progress.points} pts
            </Badge>
          </div>
          <Progress value={levelProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {(nextLevelPoints - progress.points).toLocaleString()} points to next level
          </p>
        </div>

        {/* Streaks */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Wellness</span>
            </div>
            <p className="text-lg font-bold">{progress.wellness_streak}</p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
          
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Heart className="h-4 w-4 text-pink-500" />
              <span className="text-sm font-medium">Love</span>
            </div>
            <p className="text-lg font-bold">{progress.love_streak}</p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
        </div>

        {/* Recent Badges */}
        {progress.badges.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recent Badges
            </h4>
            <div className="flex flex-wrap gap-2">
              {progress.badges.slice(0, 3).map((badge) => {
                const badgeInfo = BADGES[badge as keyof typeof BADGES];
                return badgeInfo ? (
                  <Badge
                    key={badge}
                    variant="outline"
                    className="gap-1 bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200"
                  >
                    <span>{badgeInfo.icon}</span>
                    <span className="text-xs">{badgeInfo.name}</span>
                  </Badge>
                ) : null;
              })}
              {progress.badges.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{progress.badges.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Contributions</span>
            <span className="font-medium">{progress.total_contributions}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};