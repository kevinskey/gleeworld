import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePracticeRecordings } from '@/hooks/usePracticeRecordings';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Play, 
  Pause,
  Download,
  Plus,
  Trash2, 
  Users, 
  Calendar,
  Music,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { CreatePracticeRecordingDialog } from './CreatePracticeRecordingDialog';

interface PracticeRecordingsPanelProps {
  className?: string;
}

export const PracticeRecordingsPanel: React.FC<PracticeRecordingsPanelProps> = ({ className }) => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { canDownloadMP3 } = useUserRole();
  const { recordings, loading, deletePracticeRecording, canCreateRecordings } = usePracticeRecordings();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handlePlayPause = (recordingId: string, url: string) => {
    if (playingId === recordingId) {
      setPlayingId(null);
      // Stop audio playback
      const audio = document.getElementById(`audio-${recordingId}`) as HTMLAudioElement;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    } else {
      setPlayingId(recordingId);
      // Play audio
      const audio = document.getElementById(`audio-${recordingId}`) as HTMLAudioElement;
      if (audio) {
        audio.play();
      }
    }
  };

  const handleAudioEnded = (recordingId: string) => {
    if (playingId === recordingId) {
      setPlayingId(null);
    }
  };

  const handleDownload = (url: string, title: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.mp3`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getVoicePartColor = (voicePart?: string) => {
    switch (voicePart) {
      case 'Soprano I':
      case 'Soprano 1':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'Soprano II':
      case 'Soprano 2':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Alto I':
      case 'Alto 1':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Alto II':
      case 'Alto 2':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card className={`w-full overflow-hidden ${className}`}>
        <CardHeader className="card-header-compact">
          <CardTitle className="flex items-center gap-1 md:gap-2">
            <Music className="h-4 w-4 md:h-5 md:w-5" />
            Part Tracks
          </CardTitle>
          <CardDescription className="mobile-text-lg">
            Part tracks posted by section leaders for {userProfile?.voice_part || 'your voice part'}
          </CardDescription>
        </CardHeader>
        <CardContent className="card-compact flex items-center justify-center py-6 md:py-8">
          <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
          <span className="ml-2 mobile-text-lg">Loading part tracks...</span>
        </CardContent>
      </Card>
    );
  }

  const userVoicePartRecordings = recordings.filter(
    recording => !recording.voice_part || recording.voice_part === userProfile?.voice_part
  );

  return (
    <>
      <Card className={`w-full overflow-hidden ${className}`}>
        <CardHeader className="card-header-compact flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-1 md:gap-2">
              <Music className="h-4 w-4 md:h-5 md:w-5" />
              Part Tracks
            </CardTitle>
            <CardDescription className="mobile-text-lg">
              {userProfile?.voice_part ? 
                `Part tracks for ${userProfile.voice_part} section` : 
                'Set your voice part to see your section\'s part tracks'
              }
            </CardDescription>
          </div>
          {canCreateRecordings && (
            <Button onClick={() => setShowCreateDialog(true)} size="sm" className="touch-target">
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Add Part Track</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </CardHeader>
        <CardContent className="card-compact">
          {userVoicePartRecordings.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-muted-foreground">
              <Music className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-4 opacity-50" />
              <p className="page-header">No part tracks available</p>
              <p className="mobile-text-lg">
                {userProfile?.voice_part ? 
                  `No part tracks have been posted for ${userProfile.voice_part} yet.` :
                  'Set your voice part in your profile to see your section\'s part tracks.'
                }
              </p>
            </div>
          ) : (
            <div className="section-spacing">
              {userVoicePartRecordings.map((recording, index) => (
                <div key={recording.id}>
                  <div className="flex items-start gap-2 md:gap-4 card-compact rounded-lg border bg-card">
                    <audio
                      id={`audio-${recording.id}`}
                      onEnded={() => handleAudioEnded(recording.id)}
                      preload="metadata"
                    >
                      <source src={recording.url} type="audio/mpeg" />
                      <source src={recording.url} type="audio/wav" />
                      <source src={recording.url} type="audio/ogg" />
                    </audio>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlayPause(recording.id, recording.url)}
                      className="flex-shrink-0 touch-target"
                    >
                      {playingId === recording.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between card-spacing">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium mobile-text-lg line-clamp-1">{recording.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {recording.sheet_music_title}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 md:gap-1 flex-shrink-0">
                          {recording.voice_part && (
                            <Badge variant="outline" className={`text-xs ${getVoicePartColor(recording.voice_part)}`}>
                              {recording.voice_part}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:gap-4 mt-1 md:mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span className="truncate">{recording.owner_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(recording.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>

                      {recording.notes && (
                        <p className="text-xs text-muted-foreground mt-1 md:mt-2 line-clamp-2">
                          {recording.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5 md:gap-1 flex-shrink-0">
                      {canDownloadMP3() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(recording.url, recording.title)}
                          className="touch-target p-1"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {(canCreateRecordings && recording.owner_id === user?.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePracticeRecording(recording.id)}
                          className="touch-target p-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {index < userVoicePartRecordings.length - 1 && <Separator className="my-1 md:my-2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePracticeRecordingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
};