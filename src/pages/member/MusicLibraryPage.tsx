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
import { SetlistManagement } from '@/components/setlist/SetlistManagement';

export const MusicLibraryPage: React.FC = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { sheetMusic } = useSheetMusic();
  const { setlists } = useSetlists();
  const [activeView, setActiveView] = useState<'library' | 'practice-recordings' | 'study-scores' | 'setlists'>('library');

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8" style={{ width: '90vw', maxWidth: '90vw' }}>
        {/* Header Section */}
        <div className="mb-8 sm:mb-10 lg:mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="rounded-xl p-3 bg-gradient-primary/10 text-primary shadow-sm">
              <Grid className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                Music Library
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Access your sheet music and performance materials
              </p>
            </div>
          </div>

          {/* Quick Stats Grid - Responsive */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            <Card className="p-3 sm:p-4 lg:p-5 text-center bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 hover-scale cursor-pointer" onClick={() => setActiveView('library')}>
              <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 mx-auto mb-2 text-purple-600" />
              <h3 className="font-semibold text-xs sm:text-sm lg:text-base">Repertoire</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{sheetMusic.length} pieces</p>
            </Card>
            
            <Card className="p-3 sm:p-4 lg:p-5 text-center bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 hover-scale cursor-pointer" onClick={() => setActiveView('study-scores')}>
              <Download className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold text-xs sm:text-sm lg:text-base">Study Scores</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Saved annotations</p>
            </Card>
            
            <Card className="p-3 sm:p-4 lg:p-5 text-center bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 hover-scale cursor-pointer" onClick={() => setActiveView('practice-recordings')}>
              <Play className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-semibold text-xs sm:text-sm lg:text-base">Part Tracks</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{sheetMusic.filter(s => s.audio_preview_url).length} available</p>
            </Card>
            
            <Card className="p-3 sm:p-4 lg:p-5 text-center bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200 hover-scale cursor-pointer" onClick={() => setActiveView('setlists')}>
              <List className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 mx-auto mb-2 text-orange-600" />
              <h3 className="font-semibold text-xs sm:text-sm lg:text-base">Setlists</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{setlists.length} active</p>
            </Card>
            
            <Card className="p-3 sm:p-4 lg:p-5 text-center bg-gradient-to-br from-pink-50 to-pink-100/50 border-pink-200 hover-scale col-span-2 sm:col-span-3 lg:col-span-1">
              <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 mx-auto mb-2 text-pink-600" />
              <h3 className="font-semibold text-xs sm:text-sm lg:text-base">Voice Part</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{userProfile?.voice_part || 'Not Set'}</p>
            </Card>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-4">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {activeView === 'library' ? (
              <Card className="animate-fade-in bg-card/95 backdrop-blur-sm border-border/50 shadow-lg">
                <CardContent className="space-y-4 pt-6">
                  <MusicLibrary />
                </CardContent>
              </Card>
            ) : activeView === 'study-scores' ? (
              <Card className="animate-fade-in bg-card/95 backdrop-blur-sm border-border/50 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                    <div className="rounded-lg p-2 bg-blue-500/10 text-blue-600">
                      <Download className="h-5 w-5" />
                    </div>
                    Study Scores Directory
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-8 text-center">
                    <Download className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                    <h3 className="text-lg font-semibold mb-2">Your Study Scores</h3>
                    <p className="text-muted-foreground">
                      Access your saved study scores and annotated sheet music here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : activeView === 'setlists' ? (
              <div className="animate-fade-in">
                <SetlistManagement />
              </div>
            ) : (
              <div className="animate-fade-in">
                <PracticeRecordingsPanel className="bg-card/95 backdrop-blur-sm border-border/50 shadow-lg" />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:space-y-6">
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicLibraryPage;