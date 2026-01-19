import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Library, Music2, FileAudio, FileText, Search, X, Check, ExternalLink } from 'lucide-react';
import { useSheetMusic } from '@/hooks/useSheetMusic';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface LinkedResource {
  type: 'sheet_music' | 'media' | 'xml';
  id: string;
  title: string;
  url?: string | null;
}

interface LibraryPickerProps {
  currentLinks?: {
    sheet_music_id?: string | null;
    media_id?: string | null;
  };
  onSelect: (resource: LinkedResource) => void;
  onClear: (type: LinkedResource['type']) => void;
  trigger?: React.ReactNode;
}

export const LibraryPicker: React.FC<LibraryPickerProps> = ({
  currentLinks,
  onSelect,
  onClear,
  trigger
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'sheet_music' | 'xml' | 'media'>('sheet_music');

  // Fetch sheet music (PDFs)
  const { sheetMusic, loading: sheetMusicLoading } = useSheetMusic();
  
  // Fetch media library items (audio/video)
  const { data: mediaItems, isLoading: mediaLoading } = useQuery({
    queryKey: ['media-library-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('id, title, file_url')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Filter sheet music into PDFs and XMLs
  const pdfSheetMusic = sheetMusic.filter(s => s.pdf_url && !s.xml_content);
  const xmlSheetMusic = sheetMusic.filter(s => s.xml_content || s.xml_url);

  // Filter based on search
  const filteredPDFs = pdfSheetMusic.filter(s => 
    s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.composer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredXML = xmlSheetMusic.filter(s => 
    s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.composer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMedia = (mediaItems || []).filter(m => 
    m.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (resource: LinkedResource) => {
    onSelect(resource);
    setOpen(false);
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-7 px-2">
            <Library className="h-3 w-3 mr-1" />
            Link
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Link Library Resource
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search library..."
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="sheet_music" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Sheet Music ({filteredPDFs.length})
            </TabsTrigger>
            <TabsTrigger value="xml" className="flex-1">
              <Music2 className="h-4 w-4 mr-2" />
              MusicXML ({filteredXML.length})
            </TabsTrigger>
            <TabsTrigger value="media" className="flex-1">
              <FileAudio className="h-4 w-4 mr-2" />
              Audio/Video ({filteredMedia.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="sheet_music" className="m-0">
              {sheetMusicLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredPDFs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No sheet music found</div>
              ) : (
                <div className="space-y-2">
                  {filteredPDFs.map((item) => (
                    <LibraryItem
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      subtitle={item.composer || undefined}
                      type="sheet_music"
                      url={item.pdf_url}
                      isLinked={currentLinks?.sheet_music_id === item.id}
                      onSelect={handleSelect}
                      onClear={() => onClear('sheet_music')}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="xml" className="m-0">
              {sheetMusicLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredXML.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No MusicXML files found</div>
              ) : (
                <div className="space-y-2">
                  {filteredXML.map((item) => (
                    <LibraryItem
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      subtitle={item.composer || undefined}
                      type="xml"
                      url={item.xml_url}
                      isLinked={currentLinks?.sheet_music_id === item.id}
                      onSelect={handleSelect}
                      onClear={() => onClear('xml')}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="media" className="m-0">
              {mediaLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredMedia.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No audio/video found</div>
              ) : (
                <div className="space-y-2">
                  {filteredMedia.map((item) => (
                    <LibraryItem
                      key={item.id}
                      id={item.id}
                      title={item.title || 'Untitled'}
                      subtitle="Media"
                      type="media"
                      url={item.file_url}
                      isLinked={currentLinks?.media_id === item.id}
                      onSelect={handleSelect}
                      onClear={() => onClear('media')}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

interface LibraryItemProps {
  id: string;
  title: string;
  subtitle?: string;
  type: LinkedResource['type'];
  url?: string | null;
  isLinked: boolean;
  onSelect: (resource: LinkedResource) => void;
  onClear: () => void;
}

const LibraryItem: React.FC<LibraryItemProps> = ({
  id,
  title,
  subtitle,
  type,
  url,
  isLinked,
  onSelect,
  onClear,
}) => {
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
        isLinked 
          ? 'bg-primary/10 border-primary' 
          : 'hover:bg-muted/50 border-transparent hover:border-border'
      }`}
      onClick={() => !isLinked && onSelect({ type, id, title, url })}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      
      {isLinked ? (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs">
            <Check className="h-3 w-3 mr-1" />
            Linked
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="h-7">
          Select
        </Button>
      )}
    </div>
  );
};
