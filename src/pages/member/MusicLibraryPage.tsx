import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Play, List, Users, BookOpen, Grid, Layers } from 'lucide-react';
import { useSheetMusic } from '@/hooks/useSheetMusic';
import { useSetlists } from '@/hooks/useSetlists';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { MusicLibrary } from '@/components/music-library/MusicLibrary';
import { MusicLibraryHeader } from '@/components/music-library/MusicLibraryHeader';
import { PracticeRecordingsPanel } from '@/components/music-library/PracticeRecordingsPanel';
import { SetlistManagement } from '@/components/setlist/SetlistManagement';
export const MusicLibraryPage: React.FC = () => {
  const {
    user
  } = useAuth();
  const {
    userProfile
  } = useUserProfile(user);
  const {
    sheetMusic
  } = useSheetMusic();
  const {
    setlists
  } = useSetlists();
  const [activeView, setActiveView] = useState<'library' | 'practice-recordings' | 'study-scores' | 'setlists'>('library');
  return <div className="bg-gradient-subtle">
        <div className="w-full p-2 sm:p-4 lg:p-8 lg:max-w-7xl lg:mx-auto">
        {/* Mobile Back Navigation */}
        <MusicLibraryHeader />
        
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
          
        </div>

        {/* Main Content Grid */}
        <div className="w-full">
          {/* Main Content Area */}
          <div className="w-full space-y-6">
            {activeView === 'library' ? <Card className="animate-fade-in bg-card/95 backdrop-blur-sm border-border/50 shadow-lg">
                <CardContent className="space-y-4 pt-6 w-full max-h-[80vh] overflow-y-auto">
                  <MusicLibrary />
                </CardContent>
              </Card> : activeView === 'study-scores' ? <Card className="animate-fade-in bg-card/95 backdrop-blur-sm border-border/50 shadow-lg">
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
              </Card> : activeView === 'setlists' ? <div className="animate-fade-in">
                <SetlistManagement />
              </div> : <div className="animate-fade-in">
                <PracticeRecordingsPanel className="bg-card/95 backdrop-blur-sm border-border/50 shadow-lg" />
              </div>}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:space-y-6">
          </div>
        </div>
      </div>
    </div>;
};
export default MusicLibraryPage;