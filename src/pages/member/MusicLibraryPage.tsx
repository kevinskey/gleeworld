import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, BookOpen, Download, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSheetMusic } from '@/hooks/useSheetMusic';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

const MusicLibraryPage = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { sheetMusic, loading, error } = useSheetMusic();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg p-3 bg-purple-100 text-purple-600">
            <Music className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Music Library</h1>
            <p className="text-muted-foreground">Access your sheet music and performance materials</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-4">
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
            <Music className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <h3 className="font-semibold">Voice Part</h3>
            <p className="text-sm text-muted-foreground">{userProfile?.voice_part || 'Not Set'}</p>
          </Card>
        </div>

        {/* Music Library Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Current Repertoire */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Current Repertoire</CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="text-center py-8 text-muted-foreground">
                    Error loading sheet music: {error}
                  </div>
                )}
                {!error && sheetMusic.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No sheet music available yet.
                  </div>
                )}
                <div className="space-y-4">
                  {sheetMusic.map((piece) => (
                    <div key={piece.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-semibold">{piece.title}</h4>
                        <p className="text-sm text-muted-foreground">by {piece.composer || 'Unknown'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {piece.difficulty_level || 'Not Specified'}
                          </Badge>
                          {piece.voice_parts && piece.voice_parts.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {Array.isArray(piece.voice_parts) ? piece.voice_parts.join(', ') : piece.voice_parts}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {piece.pdf_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={piece.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </a>
                          </Button>
                        )}
                        {piece.audio_preview_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={piece.audio_preview_url} target="_blank" rel="noopener noreferrer">
                              <Play className="h-4 w-4 mr-1" />
                              Listen
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  My Voice Part Files
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Play className="h-4 w-4 mr-2" />
                  Practice Recordings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Download All Current
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Downloaded "Amazing Grace"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Listened to practice track</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>New piece added to repertoire</span>
                  </div>
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