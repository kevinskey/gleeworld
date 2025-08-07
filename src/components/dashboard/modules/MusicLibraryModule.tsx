import React, { useState } from 'react';
import { Music, Search, Download, Play, Pause, Volume2, Filter, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const MusicLibraryModule = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  const musicLibrary = [
    {
      id: '1',
      title: 'Amazing Grace',
      composer: 'Traditional',
      arranger: 'John Newton',
      voicePart: 'SATB',
      difficulty: 'Intermediate',
      genre: 'Spiritual',
      hasAudio: true,
      hasSheet: true,
      duration: '4:32'
    },
    {
      id: '2',
      title: 'Lift Every Voice and Sing',
      composer: 'J. Rosamond Johnson',
      arranger: 'James Weldon Johnson',
      voicePart: 'SATB',
      difficulty: 'Advanced',
      genre: 'Anthem',
      hasAudio: true,
      hasSheet: true,
      duration: '5:15'
    },
    {
      id: '3',
      title: 'Wade in the Water',
      composer: 'Traditional Spiritual',
      arranger: 'Moses Hogan',
      voicePart: 'SATB',
      difficulty: 'Intermediate',
      genre: 'Spiritual',
      hasAudio: false,
      hasSheet: true,
      duration: '3:45'
    },
    {
      id: '4',
      title: 'Total Praise',
      composer: 'Richard Smallwood',
      arranger: 'Richard Smallwood',
      voicePart: 'SATB',
      difficulty: 'Advanced',
      genre: 'Contemporary',
      hasAudio: true,
      hasSheet: true,
      duration: '6:20'
    }
  ];

  const togglePlay = (id: string) => {
    setIsPlaying(isPlaying === id ? null : id);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border bg-background">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Music Library</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Search by title, composer, genre..." className="pl-10" />
          </div>
          
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          
          <div className="flex gap-1">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="all">All Music</TabsTrigger>
            <TabsTrigger value="recent">Recently Added</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="current">Current Repertoire</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 mt-0">
          <ScrollArea className="flex-1 p-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {musicLibrary.map((piece) => (
                  <Card key={piece.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg mb-3 flex items-center justify-center">
                      <Music className="w-12 h-12 text-primary/50" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm line-clamp-2">{piece.title}</h3>
                      <p className="text-xs text-muted-foreground">{piece.composer}</p>
                      
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">{piece.voicePart}</Badge>
                        <Badge className={`text-xs ${getDifficultyColor(piece.difficulty)}`}>
                          {piece.difficulty}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">{piece.duration}</span>
                        <div className="flex gap-1">
                          {piece.hasAudio && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 w-8 p-0"
                              onClick={() => togglePlay(piece.id)}
                            >
                              {isPlaying === piece.id ? 
                                <Pause className="w-3 h-3" /> : 
                                <Play className="w-3 h-3" />
                              }
                            </Button>
                          )}
                          {piece.hasSheet && (
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                              <Download className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {musicLibrary.map((piece) => (
                  <Card key={piece.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
                        <Music className="w-6 h-6 text-primary/50" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm mb-1">{piece.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {piece.composer} • {piece.arranger}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{piece.voicePart}</Badge>
                          <Badge className={`text-xs ${getDifficultyColor(piece.difficulty)}`}>
                            {piece.difficulty}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{piece.genre}</Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{piece.duration}</span>
                        <div className="flex gap-1">
                          {piece.hasAudio && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => togglePlay(piece.id)}
                            >
                              {isPlaying === piece.id ? 
                                <Pause className="w-4 h-4 mr-2" /> : 
                                <Play className="w-4 h-4 mr-2" />
                              }
                              {isPlaying === piece.id ? 'Pause' : 'Play'}
                            </Button>
                          )}
                          {piece.hasSheet && (
                            <Button size="sm" variant="outline">
                              <Download className="w-4 h-4 mr-2" />
                              Sheet
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="recent" className="flex-1">
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Recently added music will appear here</p>
          </div>
        </TabsContent>

        <TabsContent value="favorites" className="flex-1">
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Your favorite pieces will appear here</p>
          </div>
        </TabsContent>

        <TabsContent value="current" className="flex-1">
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Current repertoire will appear here</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};