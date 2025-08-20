import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, BookOpen, Download, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const MusicLibraryPage = () => {
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
            <p className="text-sm text-muted-foreground">12 pieces</p>
          </Card>
          <Card className="p-4 text-center bg-blue-50 border-blue-200">
            <Download className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold">Recent Downloads</h3>
            <p className="text-sm text-muted-foreground">5 this week</p>
          </Card>
          <Card className="p-4 text-center bg-green-50 border-green-200">
            <Play className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-semibold">Practice Recordings</h3>
            <p className="text-sm text-muted-foreground">8 available</p>
          </Card>
          <Card className="p-4 text-center bg-orange-50 border-orange-200">
            <Music className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <h3 className="font-semibold">Voice Part</h3>
            <p className="text-sm text-muted-foreground">Soprano 1</p>
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
                <div className="space-y-4">
                  {[
                    { title: "Amazing Grace", composer: "Traditional", status: "practicing", difficulty: "Beginner" },
                    { title: "Wade in the Water", composer: "Spiritual", status: "performance-ready", difficulty: "Intermediate" },
                    { title: "Lift Every Voice and Sing", composer: "James Weldon Johnson", status: "learning", difficulty: "Advanced" },
                    { title: "His Eye Is on the Sparrow", composer: "Civilla D. Martin", status: "practicing", difficulty: "Intermediate" },
                  ].map((piece, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-semibold">{piece.title}</h4>
                        <p className="text-sm text-muted-foreground">by {piece.composer}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant={piece.status === 'performance-ready' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {piece.status.replace('-', ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {piece.difficulty}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button size="sm" variant="outline">
                          <Play className="h-4 w-4 mr-1" />
                          Listen
                        </Button>
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