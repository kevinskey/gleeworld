import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Music } from 'lucide-react';

interface RadioTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  audio_url: string;
  category: 'performance' | 'announcement' | 'interlude' | 'alumni_story';
}

interface RadioTimelineProps {
  currentTrack: RadioTrack | null;
  upcomingTracks: RadioTrack[];
  currentTime: number;
  isPlaying: boolean;
}

export const RadioTimeline = ({ 
  currentTrack, 
  upcomingTracks, 
  currentTime,
  isPlaying 
}: RadioTimelineProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'performance':
        return 'bg-brand-100 text-brand-800 border-brand-200';
      case 'announcement':
        return 'bg-spelman-blue-light/20 text-spelman-blue-dark border-spelman-blue-light';
      case 'alumni_story':
        return 'bg-accent/20 text-accent-foreground border-accent/30';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance':
        return <Music className="h-3 w-3" />;
      case 'announcement':
        return <Clock className="h-3 w-3" />;
      default:
        return <Music className="h-3 w-3" />;
    }
  };

  const getTrackImage = (track: RadioTrack) => {
    // For now, return a placeholder based on category
    // In the future, this could pull from actual track metadata or album art
    const colors = {
      performance: 'from-brand-400 to-brand-600',
      announcement: 'from-spelman-blue-light to-spelman-blue-dark',
      alumni_story: 'from-accent to-accent/80',
      interlude: 'from-muted to-muted-foreground'
    };
    
    return `bg-gradient-to-br ${colors[track.category] || colors.performance}`;
  };

  const allTracks = currentTrack ? [currentTrack, ...upcomingTracks.slice(0, 4)] : upcomingTracks.slice(0, 5);

  return (
    <Card className="w-full overflow-hidden bg-gradient-to-r from-background via-brand-50/50 to-background border-brand-200">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-muted'}`} />
            <h3 className="text-sm font-semibold text-foreground">Now Broadcasting</h3>
          </div>
          {currentTrack && (
            <Badge variant="outline" className="text-xs">
              {formatTime(currentTime)} / {formatTime(currentTrack.duration)}
            </Badge>
          )}
        </div>

        <div className="relative">
          {/* Timeline */}
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {allTracks.map((track, index) => {
              const isCurrent = index === 0 && currentTrack;
              const progress = isCurrent ? (currentTime / track.duration) * 100 : 0;
              
              return (
                <div key={track.id} className="flex-shrink-0 relative">
                  {/* Connection Line */}
                  {index < allTracks.length - 1 && (
                    <div className="absolute top-12 left-20 w-8 h-0.5 bg-gradient-to-r from-brand-300 to-brand-200" />
                  )}
                  
                  {/* Track Card */}
                  <div className={`w-24 transition-all duration-300 ${isCurrent ? 'scale-110' : 'scale-100'}`}>
                    {/* Track Image/Thumbnail */}
                    <div className={`relative w-20 h-20 rounded-lg ${getTrackImage(track)} mx-auto mb-2 overflow-hidden border-2 ${isCurrent ? 'border-brand-400 shadow-lg' : 'border-transparent'}`}>
                      {/* Progress overlay for current track */}
                      {isCurrent && (
                        <div className="absolute inset-0 bg-black/20">
                          <div 
                            className="absolute bottom-0 left-0 h-1 bg-white/80 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                      
                      {/* Play indicator */}
                      {isCurrent && isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-white/90 rounded-full p-1">
                            <Play className="h-3 w-3 text-brand-600 fill-current" />
                          </div>
                        </div>
                      )}
                      
                      {/* Category Icon */}
                      <div className="absolute top-1 right-1">
                        <div className={`p-1 rounded-full bg-white/80 ${getCategoryColor(track.category)}`}>
                          {getCategoryIcon(track.category)}
                        </div>
                      </div>
                      
                      {/* Default Content */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Music className="h-6 w-6 text-white/70" />
                      </div>
                    </div>
                    
                    {/* Track Info */}
                    <div className="text-center">
                      <p className="text-xs font-medium text-foreground truncate" title={track.title}>
                        {track.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate" title={track.artist}>
                        {track.artist}
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-1 py-0 ${getCategoryColor(track.category)}`}
                        >
                          {track.category.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Position indicator */}
                    <div className="text-center mt-1">
                      <span className="text-xs text-muted-foreground">
                        {index === 0 ? 'Now' : `+${index}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Add more tracks placeholder */}
            {allTracks.length === 0 && (
              <div className="flex-shrink-0 text-center py-8">
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Music className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">No tracks in playlist</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};