import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Play, 
  List, 
  Users, 
  BookOpen,
  Grid,
  Layers
} from 'lucide-react';
import { useSheetMusic } from '@/hooks/useSheetMusic';
import { useSetlists } from '@/hooks/useSetlists';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { MusicLibrary } from '@/components/music-library/MusicLibrary';
import { PracticeRecordingsPanel } from '@/components/music-library/PracticeRecordingsPanel';

export const MusicLibraryPage: React.FC = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { sheetMusic } = useSheetMusic();
  const { setlists } = useSetlists();
  const [activeView, setActiveView] = useState<'library' | 'practice-recordings'>('library');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg p-3 bg-purple-100 text-purple-600">
            <Grid className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Music Library</h1>
            <p className="text-muted-foreground">Access your sheet music and performance materials</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="p-4 text-center bg-purple-50 border-purple-200">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <h3 className="font-semibold">Current Repertoire</h3>
            <p className="text-sm text-muted-foreground">{sheetMusic.length} pieces</p>
          </Card>
          <Card className="p-4 text-center bg-blue-50 border-blue-200">
            <Download className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold">Sheet Music Available</h3>
            <p className="text-sm text-muted-foreground">{sheetMusic.filter(s => s.pdf_url).length} PDFs</p>
          </Card>
          <Card className="p-4 text-center bg-green-50 border-green-200">
            <Play className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-semibold">Practice Recordings</h3>
            <p className="text-sm text-muted-foreground">{sheetMusic.filter(s => s.audio_preview_url).length} available</p>
          </Card>
          <Card className="p-4 text-center bg-orange-50 border-orange-200">
            <List className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <h3 className="font-semibold">Active Setlists</h3>
            <p className="text-sm text-muted-foreground">{setlists.length} setlists</p>
          </Card>
          <Card className="p-4 text-center bg-pink-50 border-pink-200">
            <Users className="h-8 w-8 mx-auto mb-2 text-pink-600" />
            <h3 className="font-semibold">Voice Part</h3>
            <p className="text-sm text-muted-foreground">{userProfile?.voice_part || 'Not Set'}</p>
          </Card>
        </div>

        {/* Music Library Content */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Current Repertoire */}
          <div className="lg:col-span-3">
            {activeView === 'library' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid className="h-5 w-5" />
                    Music Library
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MusicLibrary />
                </CardContent>
              </Card>
            ) : (
              <PracticeRecordingsPanel />
            )}
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant={activeView === 'library' ? 'default' : 'outline'} 
                  className="w-full justify-start"
                  onClick={() => setActiveView('library')}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  My Voice Part Files
                </Button>
                <Button 
                  variant={activeView === 'practice-recordings' ? 'default' : 'outline'} 
                  className="w-full justify-start"
                  onClick={() => setActiveView('practice-recordings')}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Practice Recordings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Download All Current
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Layers className="h-4 w-4 mr-2" />
                  My Study Scores
                </Button>
              </CardContent>
            </Card>

            {/* Voice Part Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Section</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Voice Part</p>
                    <p className="text-sm text-muted-foreground">
                      {userProfile?.voice_part || 'Not Set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Available Files</p>
                    <p className="text-sm text-muted-foreground">
                      {sheetMusic.filter(s => s.pdf_url).length} sheet music files
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>No recent activity</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicLibraryPage;