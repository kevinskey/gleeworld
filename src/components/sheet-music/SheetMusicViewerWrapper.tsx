import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Music, Search, BookOpen, Clock, Star } from 'lucide-react';
import { useSheetMusic } from '@/hooks/useSheetMusic';
import { SheetMusicViewer } from './SheetMusicViewer';
import { Database } from '@/integrations/supabase/types';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];

interface SheetMusicViewerWrapperProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SheetMusicViewerWrapper = ({ isOpen, onClose }: SheetMusicViewerWrapperProps) => {
  const [selectedSheetMusic, setSelectedSheetMusic] = useState<SheetMusic | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { sheetMusic, loading, error } = useSheetMusic();

  const handleSheetMusicSelect = (music: SheetMusic) => {
    setSelectedSheetMusic(music);
  };

  const handleBackFromViewer = () => {
    setSelectedSheetMusic(null);
  };

  const handleClose = () => {
    setSelectedSheetMusic(null);
    onClose();
  };

  const filteredSheetMusic = sheetMusic?.filter((music) =>
    music.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    music.composer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    music.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  if (selectedSheetMusic && isOpen) {
    return (
      <SheetMusicViewer 
        sheetMusic={selectedSheetMusic}
        onBack={handleBackFromViewer}
      />
    );
  }

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Sheet Music Library
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sheet music by title, composer, or genre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sheet Music Grid */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
              ) : error ? (
              <div className="text-center py-8">
                <p className="text-destructive">Error loading sheet music: {error}</p>
              </div>
            ) : filteredSheetMusic.length === 0 ? (
              <div className="text-center py-8">
                <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No sheet music found matching your search' : 'No sheet music available'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSheetMusic.map((music) => (
                  <Card 
                    key={music.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSheetMusicSelect(music)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm line-clamp-2">{music.title}</CardTitle>
                      {music.composer && (
                        <CardDescription className="text-xs">
                          By {music.composer}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            PDF Available
                          </span>
                        </div>
                        {music.tags && music.tags.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {music.tags[0]}
                          </Badge>
                        )}
                      </div>
                      
                      {music.difficulty_level && (
                        <div className="flex items-center gap-1 mt-2">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs text-muted-foreground">
                            {music.difficulty_level}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(music.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};