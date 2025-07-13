import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Music, 
  Upload, 
  Search, 
  Filter, 
  Play, 
  BookOpen, 
  Users, 
  BarChart3,
  Settings,
  Grid3X3,
  List,
  Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { SheetMusicLibrary } from './SheetMusicLibrary';
import { AdvancedSheetMusicViewer } from './AdvancedSheetMusicViewer';
import { SheetMusicBulkUpload } from '../admin/SheetMusicBulkUpload';
import { useSheetMusic } from '@/hooks/useSheetMusic';
import { useSetlists } from '@/hooks/useSetlists';
import { CreateSetlistDialog } from '../setlists/CreateSetlistDialog';
import { toast } from 'sonner';

interface SheetMusicFilters {
  voice_parts?: string[];
  difficulty_level?: string;
  composer?: string;
  search?: string;
  tags?: string[];
  event_context?: string;
}

export const SheetMusicModule: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { sheetMusic, loading, fetchSheetMusic } = useSheetMusic();
  const { setlists, loading: setlistsLoading, createSetlist } = useSetlists();
  
  const [activeTab, setActiveTab] = useState('library');
  const [selectedSheetMusicId, setSelectedSheetMusicId] = useState<string>('');
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>('');
  const [showViewer, setShowViewer] = useState(false);
  const [showCreateSetlistDialog, setShowCreateSetlistDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Advanced search and filter states
  const [filters, setFilters] = useState<SheetMusicFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVoiceParts, setSelectedVoiceParts] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  const voiceParts = ['Soprano', 'Alto', 'Tenor', 'Bass', 'Piano', 'Soloist'];
  const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'];
  const eventContexts = ['Concert', 'Rehearsal', 'Competition', 'Audition', 'Recording'];

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';

  // Apply filters whenever filter state changes
  useEffect(() => {
    const activeFilters: SheetMusicFilters = {
      search: searchQuery || undefined,
      voice_parts: selectedVoiceParts.length > 0 ? selectedVoiceParts : undefined,
      difficulty_level: selectedDifficulty || undefined,
      event_context: selectedEvent || undefined,
    };
    
    setFilters(activeFilters);
    fetchSheetMusic(activeFilters);
  }, [searchQuery, selectedVoiceParts, selectedDifficulty, selectedEvent, fetchSheetMusic]);

  const handleOpenViewer = (sheetMusicId: string, setlistId?: string) => {
    setSelectedSheetMusicId(sheetMusicId);
    setSelectedSetlistId(setlistId || '');
    setShowViewer(true);
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setSelectedSheetMusicId('');
    setSelectedSetlistId('');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedVoiceParts([]);
    setSelectedDifficulty('');
    setSelectedEvent('');
    setFilters({});
    fetchSheetMusic();
  };

  const toggleVoicePart = (part: string) => {
    setSelectedVoiceParts(prev => 
      prev.includes(part) 
        ? prev.filter(p => p !== part)
        : [...prev, part]
    );
  };

  const filteredSheetMusic = sheetMusic;
  const hasActiveFilters = searchQuery || selectedVoiceParts.length > 0 || selectedDifficulty || selectedEvent;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Sheet Music Library</h1>
                <p className="text-muted-foreground">Manage your digital sheet music collection</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex border rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? "default" : "ghost"}
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? "default" : "ghost"}
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick Actions */}
              <Button
                onClick={() => setShowCreateSetlistDialog(true)}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Setlist
              </Button>
              
              {isAdmin && (
                <Button
                  onClick={() => setActiveTab('upload')}
                  variant="default"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Search & Filters */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, composer, or arranger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Voice Parts Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Voice Parts:</span>
                <div className="flex flex-wrap gap-1">
                  {voiceParts.map(part => (
                    <Badge
                      key={part}
                      variant={selectedVoiceParts.includes(part) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => toggleVoicePart(part)}
                    >
                      {part}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Difficulty Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Difficulty:</span>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    {difficulties.map(level => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Context Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Event:</span>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    {eventContexts.map(event => (
                      <SelectItem key={event} value={event}>
                        {event}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{filteredSheetMusic.length} pieces</span>
              <span>•</span>
              <span>{setlists.length} setlists</span>
              {hasActiveFilters && (
                <>
                  <span>•</span>
                  <span className="text-primary font-medium">Filtered results</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="setlists" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Setlists
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
            )}
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Sheet Music Library */}
          <TabsContent value="library" className="space-y-6">
            <SheetMusicLibrary />
          </TabsContent>

          {/* Setlists Management */}
          <TabsContent value="setlists" className="space-y-6">
            <div className="grid gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">My Setlists</h2>
                <Button onClick={() => setShowCreateSetlistDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Setlist
                </Button>
              </div>
              
              {setlistsLoading ? (
                <div className="text-center py-8">Loading setlists...</div>
              ) : setlists.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <List className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Setlists Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first setlist to organize your sheet music for performances
                    </p>
                    <Button onClick={() => setShowCreateSetlistDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Setlist
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {setlists.map(setlist => (
                    <Card key={setlist.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <span className="truncate">{setlist.name}</span>
                          <Badge variant="secondary">
                            {setlist.items?.length || 0} pieces
                          </Badge>
                        </CardTitle>
                        {setlist.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {setlist.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{setlist.event_context || 'General'}</span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleOpenViewer('', setlist.id)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Open
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Admin Upload */}
          {isAdmin && (
            <TabsContent value="upload" className="space-y-6">
              <SheetMusicBulkUpload />
            </TabsContent>
          )}

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Library Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Pieces</span>
                      <span className="font-medium">{sheetMusic.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Setlists</span>
                      <span className="font-medium">{setlists.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Public Pieces</span>
                      <span className="font-medium">
                        {sheetMusic.filter(s => s.is_public).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Voice Parts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {voiceParts.map(part => {
                      const count = sheetMusic.filter(s => 
                        s.voice_parts?.includes(part)
                      ).length;
                      return (
                        <div key={part} className="flex justify-between">
                          <span>{part}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Difficulty Levels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {difficulties.map(level => {
                      const count = sheetMusic.filter(s => 
                        s.difficulty_level === level
                      ).length;
                      return (
                        <div key={level} className="flex justify-between">
                          <span className="capitalize">{level}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sheet Music Viewer */}
      <AdvancedSheetMusicViewer
        isOpen={showViewer}
        onClose={handleCloseViewer}
        sheetMusicId={selectedSheetMusicId}
        setlistId={selectedSetlistId}
        performanceMode={false}
      />

      {/* Create Setlist Dialog */}
      <CreateSetlistDialog
        isOpen={showCreateSetlistDialog}
        onClose={() => {
          setShowCreateSetlistDialog(false);
          toast.success('Setlist created successfully!');
        }}
      />
    </div>
  );
};