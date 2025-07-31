import React, { useState, useEffect } from "react";
import { MobileScoreWindow } from "@/components/scoring/MobileScoreWindow";
import { SightReadingScoreWindow } from "@/components/scoring/SightReadingScoreWindow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Music, History, BookOpen } from "lucide-react";
import { SavedScoresViewer } from "@/components/scoring/SavedScoresViewer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UniversalLayout } from "@/components/layout/UniversalLayout";

interface Performer {
  id: string;
  name: string;
  email?: string;
  voice_part?: string;
}

export default function MobileScoring() {
  const { user } = useAuth();
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [selectedPerformer, setSelectedPerformer] = useState<Performer | null>(null);
  const [eventType, setEventType] = useState<'audition' | 'performance' | 'competition' | 'sight_reading_test'>('audition');
  const [searchTerm, setSearchTerm] = useState("");
  const [showScoring, setShowScoring] = useState(false);
  const [showSightReading, setShowSightReading] = useState(false);

  useEffect(() => {
    fetchPerformers();
  }, []);

  const fetchPerformers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, first_name, last_name, email, voice_part')
        .not('first_name', 'is', null);

      if (error) throw error;

      const performerList = data?.map(profile => ({
        id: profile.user_id,
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        email: profile.email,
        voice_part: profile.voice_part
      })) || [];

      setPerformers(performerList);
    } catch (error) {
      console.error('Error fetching performers:', error);
    }
  };

  const filteredPerformers = performers.filter(performer =>
    performer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    performer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startScoring = (performer: Performer) => {
    setSelectedPerformer(performer);
    if (eventType === 'sight_reading_test') {
      setShowSightReading(true);
    } else {
      setShowScoring(true);
    }
  };

  const handleScoreSubmitted = (scoreData: any) => {
    setShowScoring(false);
    setShowSightReading(false);
    setSelectedPerformer(null);
    setSearchTerm("");
  };

  if (showScoring && selectedPerformer) {
    return (
      <MobileScoreWindow
        performerId={selectedPerformer.id}
        performerName={selectedPerformer.name}
        eventType={eventType as 'audition' | 'performance' | 'competition'}
        onScoreSubmitted={handleScoreSubmitted}
      />
    );
  }

  if (showSightReading && selectedPerformer) {
    return (
      <SightReadingScoreWindow
        performerId={selectedPerformer.id}
        performerName={selectedPerformer.name}
        onScoreSubmitted={handleScoreSubmitted}
      />
    );
  }

  return (
    <UniversalLayout maxWidth="md" containerized={true}>
      <div className="max-w-md mx-auto space-y-4">
        {/* Header with Tabs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-lg flex items-center justify-center gap-2">
              <Music className="h-5 w-5" />
              Performance Scoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="score" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="score">New Score</TabsTrigger>
                <TabsTrigger value="history">View Scores</TabsTrigger>
              </TabsList>
              
              <TabsContent value="score" className="space-y-4 mt-4">
                {/* Event Type Selector */}
                <div>
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select value={eventType} onValueChange={(value: any) => setEventType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="audition">Audition</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="competition">Competition</SelectItem>
                      <SelectItem value="sight_reading_test">Sight Reading Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div>
                  <Label htmlFor="search">Search Performers</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Performers List */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Select Performer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredPerformers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No performers found</p>
                        </div>
                      ) : (
                        filteredPerformers.map((performer) => (
                          <div
                            key={performer.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <h3 className="font-medium">{performer.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {performer.voice_part && `${performer.voice_part} • `}
                                {performer.email}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => startScoring(performer)}
                              className="ml-3"
                            >
                              {eventType === 'sight_reading_test' ? (
                                <>
                                  <BookOpen className="h-4 w-4 mr-1" />
                                  Evaluate
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Score
                                </>
                              )}
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-sm text-muted-foreground">
                      <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Select a performer above to begin {eventType === 'sight_reading_test' ? 'sight reading evaluation' : `scoring their ${eventType}`}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="history" className="mt-4">
                <SavedScoresViewer />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </UniversalLayout>
  );
}