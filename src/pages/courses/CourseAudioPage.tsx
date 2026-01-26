import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Pause, Music2, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { useGlobalAudioPlayer } from '@/hooks/useGlobalAudioPlayer';

const CourseAudioPage = () => {
  const { courseCode } = useParams<{ courseCode: string }>();
  const navigate = useNavigate();
  
  // Find the course from config
  const course = ACADEMY_COURSES.find(c => {
    const slug = c.courseCode.toLowerCase().replace(' ', '-');
    return slug === courseCode?.toLowerCase();
  });

  const { currentTrack, isPlaying, playTrack, togglePlay, setPlaylist } = useGlobalAudioPlayer();

  // Fetch tracks for this course
  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['course-audio-tracks', course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      
      // First get the playlist for this course
      const { data: playlists, error: playlistError } = await supabase
        .from('gw_course_playlists')
        .select('id')
        .eq('course_id', course.id)
        .order('display_order', { ascending: true })
        .limit(1);

      if (playlistError) throw playlistError;
      if (!playlists || playlists.length === 0) return [];

      // Get tracks from playlist media
      const { data: playlistMedia, error: mediaError } = await supabase
        .from('gw_course_playlist_media')
        .select(`
          id,
          position,
          gw_media_library!inner (
            id,
            title,
            file_url,
            category
          )
        `)
        .eq('playlist_id', playlists[0].id)
        .order('position', { ascending: true });

      if (mediaError) throw mediaError;

      return (playlistMedia || []).map((item: any) => ({
        id: item.gw_media_library.id,
        title: item.gw_media_library.title,
        artist: item.gw_media_library.category || 'Unknown',
        audio_url: item.gw_media_library.file_url,
        position: item.position,
      }));
    },
    enabled: !!course?.id,
  });

  // Set playlist when tracks load
  React.useEffect(() => {
    if (tracks.length > 0) {
      setPlaylist(tracks);
    }
  }, [tracks, setPlaylist]);

  const handleTrackClick = (track: any, index: number) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, index);
    }
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Course not found</p>
      </div>
    );
  }

  const courseSlug = course.courseCode.toLowerCase().replace(' ', '-');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 bg-card border-b border-border flex items-center gap-3 px-4 sticky top-0 z-50">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(`/academy/${courseSlug}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Badge className="bg-primary text-primary-foreground font-semibold px-2.5 py-1">
            {course.courseCode}
          </Badge>
          <span className="font-semibold text-foreground">Audio Library</span>
        </div>
      </header>

      {/* Track List */}
      <main className="p-4 space-y-3 pb-24">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">Course Audio Library</h1>
          <p className="text-muted-foreground">Spirituals • Jubilee • Rehearsal Recordings</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tracks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Music2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No audio tracks available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, index) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              const isTrackPlaying = isCurrentTrack && isPlaying;

              return (
                <Card 
                  key={track.id}
                  className={`border-0 shadow-sm cursor-pointer transition-all ${
                    isCurrentTrack ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleTrackClick(track, index)}
                >
                  <CardContent className="py-4 px-4">
                    <div className="flex items-center gap-4">
                      {/* Play/Pause Button */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCurrentTrack ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {isTrackPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5 ml-0.5" />
                        )}
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${isCurrentTrack ? 'text-primary' : 'text-foreground'}`}>
                          {track.title}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                      </div>

                      {/* Track Number */}
                      <span className="text-sm text-muted-foreground font-mono">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default CourseAudioPage;
