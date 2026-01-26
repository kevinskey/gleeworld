import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Pause, Music2, Loader2, Folder, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { useGlobalAudioPlayer } from '@/hooks/useGlobalAudioPlayer';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

interface Playlist {
  id: string;
  title: string;
  description: string | null;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  position: number;
}

const CourseAudioPage = () => {
  const { courseCode } = useParams<{ courseCode: string }>();
  const navigate = useNavigate();
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  
  // Find the course from config
  const course = ACADEMY_COURSES.find(c => {
    const slug = c.courseCode.toLowerCase().replace(' ', '-');
    return slug === courseCode?.toLowerCase();
  });

  const { currentTrack, isPlaying, playTrack, togglePlay, setPlaylist } = useGlobalAudioPlayer();

  // Fetch all playlists for this course
  const { data: playlists = [], isLoading: playlistsLoading } = useQuery({
    queryKey: ['course-playlists', course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      
      const { data, error } = await supabase
        .from('gw_course_playlists')
        .select('id, title, description')
        .eq('course_id', course.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as Playlist[];
    },
    enabled: !!course?.id,
  });

  // Fetch tracks for selected playlist
  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ['playlist-tracks', selectedPlaylist?.id],
    queryFn: async () => {
      if (!selectedPlaylist?.id) return [];
      
      const { data: playlistMedia, error } = await supabase
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
        .eq('playlist_id', selectedPlaylist.id)
        .order('position', { ascending: true });

      if (error) throw error;

      return (playlistMedia || []).map((item: any) => ({
        id: item.gw_media_library.id,
        title: item.gw_media_library.title,
        artist: item.gw_media_library.category || 'Unknown',
        audio_url: item.gw_media_library.file_url,
        position: item.position,
      })) as Track[];
    },
    enabled: !!selectedPlaylist?.id,
  });

  // Set playlist when tracks load
  React.useEffect(() => {
    if (tracks.length > 0) {
      setPlaylist(tracks);
    }
  }, [tracks, setPlaylist]);

  const handleTrackClick = (track: Track, index: number) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, index);
    }
  };

  const handleBack = () => {
    if (selectedPlaylist) {
      setSelectedPlaylist(null);
    } else {
      const courseSlug = course?.courseCode.toLowerCase().replace(' ', '-');
      navigate(`/academy/${courseSlug}`);
    }
  };

  if (!course) {
    return (
      <UniversalLayout showHeader={true} showFooter={false} containerized={false}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Course not found</p>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout showHeader={true} showFooter={false} containerized={false}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="h-14 bg-card border-b border-border flex items-center gap-3 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-semibold px-2.5 py-1">
              {course.courseCode}
            </Badge>
            <span className="font-semibold text-foreground">
              {selectedPlaylist ? selectedPlaylist.title : 'Audio Library'}
            </span>
          </div>
        </header>

        <main className="p-4 space-y-3 pb-24">
          {/* Folder/Playlist Selection View */}
          {!selectedPlaylist ? (
            <>
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-foreground">Choose a Collection</h1>
                <p className="text-muted-foreground">Select a folder to browse tracks</p>
              </div>

              {playlistsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : playlists.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No audio collections available yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {playlists.map((playlist) => (
                    <Card 
                      key={playlist.id}
                      className="border-0 shadow-sm cursor-pointer hover:bg-muted/50 transition-all"
                      onClick={() => setSelectedPlaylist(playlist)}
                    >
                      <CardContent className="py-4 px-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Folder className="h-7 w-7 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-lg truncate">
                              {playlist.title}
                            </p>
                            {playlist.description && (
                              <p className="text-sm text-muted-foreground truncate">
                                {playlist.description}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Track List View */
            <>
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-foreground">{selectedPlaylist.title}</h1>
                {selectedPlaylist.description && (
                  <p className="text-muted-foreground">{selectedPlaylist.description}</p>
                )}
              </div>

              {tracksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : tracks.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Music2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No tracks in this collection yet</p>
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
            </>
          )}
        </main>
      </div>
    </UniversalLayout>
  );
};

export default CourseAudioPage;
