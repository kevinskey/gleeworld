import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Music, 
  Play, 
  Pause, 
  Clock,
  Disc,
  ChevronLeft,
  ChevronRight,
  Heart,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

interface AudioTrack {
  id: string;
  title: string;
  artist: string | null;
  album_id: string | null;
  audio_url: string | null;
  duration: number | null;
  track_number: number | null;
  genre: string | null;
  play_count: number;
  music_albums?: {
    title: string;
    cover_image_url: string | null;
  };
}

interface FeaturedMusicProps {
  limit?: number;
  showTitle?: boolean;
  className?: string;
}

export const FeaturedMusic = ({ 
  limit = 8, 
  showTitle = true, 
  className = "" 
}: FeaturedMusicProps) => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useMusicPlayer();

  useEffect(() => {
    loadFeaturedTracks();
  }, [limit]);

  const loadFeaturedTracks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('music_tracks')
        .select(`
          *,
          music_albums(title, cover_image_url)
        `)
        .order('play_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setTracks(data || []);
    } catch (error: any) {
      console.error('Error loading featured tracks:', error);
      toast({
        title: "Error loading music",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollLeft = () => {
    const container = document.getElementById('music-container');
    if (container) {
      const cardWidth = window.innerWidth < 768 ? 280 : 320; // Card width + gap
      container.scrollBy({ 
        left: -cardWidth, 
        behavior: 'smooth' 
      });
    }
  };

  const scrollRight = () => {
    const container = document.getElementById('music-container');
    if (container) {
      const cardWidth = window.innerWidth < 768 ? 280 : 320; // Card width + gap  
      container.scrollBy({ 
        left: cardWidth, 
        behavior: 'smooth' 
      });
    }
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlay = async (track: AudioTrack) => {
    if (!track.audio_url) {
      toast({
        title: "No audio available",
        description: "This track doesn't have an audio file",
        variant: "destructive"
      });
      return;
    }

    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      const trackForPlayer = {
        id: track.id,
        title: track.title,
        artist: track.artist || 'Unknown Artist',
        audio_url: track.audio_url,
        duration: track.duration || 0,
        album_id: track.album_id,
        album: track.music_albums ? {
          title: track.music_albums.title,
          cover_image_url: track.music_albums.cover_image_url
        } : undefined,
        play_count: track.play_count
      };
      playTrack(trackForPlayer);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {showTitle && (
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-primary">Featured Music</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover our most popular Glee Club tracks and recordings
            </p>
          </div>
        )}
        <div className="relative">
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: limit }).map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse flex-shrink-0 w-72 md:w-80">
                <div className="aspect-square bg-muted"></div>
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                  <div className="h-6 bg-muted rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        {showTitle && (
          <h2 className="text-3xl font-bold text-primary mb-4">Featured Music</h2>
        )}
        <p className="text-muted-foreground">No music tracks available at the moment.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showTitle && (
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
            <Music className="h-8 w-8" />
            Featured Music
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover our most popular Glee Club tracks and recordings
          </p>
        </div>
      )}
      
      {/* Horizontal Music Slider */}
      <div className="relative group">
        {/* Navigation Arrows */}
        {tracks.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollLeft}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-sm border-white/20 shadow-lg opacity-80 hover:opacity-100 transition-opacity duration-300 hover:bg-white"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"  
              size="icon"
              onClick={scrollRight}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-sm border-white/20 shadow-lg opacity-80 hover:opacity-100 transition-opacity duration-300 hover:bg-white"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Music Container */}
        <div 
          id="music-container"
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent snap-x snap-mandatory scroll-smooth"
          style={{ 
            scrollbarWidth: 'thin',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {tracks.map((track) => (
            <Card 
              key={track.id} 
              className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 flex-shrink-0 w-72 md:w-80 snap-start hover-scale"
            >
              <div className="relative">
                {/* Genre Badge */}
                {track.genre && (
                  <div className="absolute top-4 right-4 z-10">
                    <Badge variant="secondary" className="bg-white/90 text-primary">
                      {track.genre}
                    </Badge>
                  </div>
                )}
                
                {/* Album Art */}
                <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
                  {track.music_albums?.cover_image_url ? (
                    <img
                      src={track.music_albums.cover_image_url}
                      alt={`${track.title} cover`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc className="h-24 w-24 text-primary/40" />
                    </div>
                  )}
                  
                  {/* Play button overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Button
                      size="lg"
                      onClick={() => handlePlay(track)}
                      className="rounded-full bg-white text-primary hover:bg-white/90 animate-fade-in"
                      disabled={!track.audio_url}
                    >
                      {currentTrack?.id === track.id && isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                    {track.title}
                  </h3>
                  {track.artist && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      by {track.artist}
                    </p>
                  )}
                  {track.music_albums?.title && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      from {track.music_albums.title}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(track.duration)}</span>
                    {track.play_count > 0 && (
                      <>
                        <span>•</span>
                        <span>{track.play_count} plays</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-amber-500">
                    <Music className="h-4 w-4 fill-current" />
                    <span>Track</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 group/btn hover-scale" 
                    size="sm"
                    onClick={() => handlePlay(track)}
                    disabled={!track.audio_url}
                  >
                    {currentTrack?.id === track.id && isPlaying ? (
                      <Pause className="h-4 w-4 mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'}
                  </Button>
                  <Button variant="outline" size="sm" className="hover-scale">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* View All Music Button */}
        {tracks.length >= limit && (
          <div className="text-center mt-6">
            <Button variant="outline" size="lg" className="group hover-scale">
              View All Music
              <Music className="h-4 w-4 ml-2 group-hover:scale-110 transition-transform" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};