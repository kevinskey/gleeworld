import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SheetMusicLibrary } from './SheetMusicLibrary';
import { SetlistBuilder } from './SetlistBuilder';
import { SetlistPlayer } from './SetlistPlayer';
import { StudyScoresPanel } from './StudyScoresPanel';
import { MyCollectionsPanel } from './MyCollectionsPanel';
import { SheetMusicViewDialog } from './SheetMusicViewDialog';
import { 
  Music, 
  Eye, 
  Play, 
  BookOpen, 
  Star, 
  List,
  Search,
  Filter,
  Grid3X3,
  LayoutList
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MobileMusicLibraryProps {
  onPdfSelect: (pdfUrl: string, title: string, id?: string) => void;
  onOpenSetlistPlayer: (setlistId: string) => void;
  selectedPdf: {url: string; title: string; id?: string} | null;
  scrollContainerRef?: React.Ref<HTMLDivElement>;
}

export const MobileMusicLibrary = ({ 
  onPdfSelect, 
  onOpenSetlistPlayer, 
  selectedPdf, 
  scrollContainerRef
}: MobileMusicLibraryProps) => {
  const [activeTab, setActiveTab] = useState("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("title");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [studyDialogOpen, setStudyDialogOpen] = useState(false);
  const [studyItem, setStudyItem] = useState<any>(null);
  const { toast } = useToast();

  const openStudyMode = async () => {
    if (!selectedPdf) {
      toast({ title: 'Select a piece', description: 'Choose a score to open Study Mode' });
      return;
    }
    let item: any = null;
    if (selectedPdf.id) {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('*')
        .eq('id', selectedPdf.id)
        .maybeSingle();
      if (!error && data) item = data;
    }
    if (!item) {
      item = {
        id: selectedPdf.id || 'temp',
        title: selectedPdf.title,
        composer: null,
        arranger: null,
        key_signature: null,
        time_signature: null,
        tempo_marking: null,
        difficulty_level: null,
        voice_parts: null,
        language: null,
        pdf_url: selectedPdf.url,
        audio_preview_url: null,
        thumbnail_url: null,
        tags: null,
        is_public: false,
        created_by: '',
        created_at: new Date().toISOString(),
      };
    }
    setStudyItem(item);
    setStudyDialogOpen(true);
  };

  return (
    <div className="h-full min-h-0 flex flex-col pt-[calc(env(safe-area-inset-top)+3.5rem)]">
      {/* Mobile Header */}
      <div className="sticky z-10 bg-background border-b px-2 py-3 sm:px-4 space-y-3" style={{ top: 'calc(env(safe-area-inset-top) + 3.5rem)' }}>
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search music library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 sm:h-12 text-sm"
          />
        </div>

        {/* Filters Row */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-28 h-8 sm:h-10 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="classical">Classical</SelectItem>
              <SelectItem value="spiritual">Spiritual</SelectItem>
              <SelectItem value="contemporary">Contemporary</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-28 h-8 sm:h-10 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="composer">Composer</SelectItem>
              <SelectItem value="date">Date Added</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            {viewMode === "list" ? <Grid3X3 className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
          </Button>
        </div>

        {/* Selected PDF Info */}
        {selectedPdf && (
          <div className="bg-primary/10 rounded-lg p-2 sm:p-3 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary truncate">
                {selectedPdf.title}
              </p>
              <p className="text-[10px] text-muted-foreground">Currently selected</p>
            </div>
            <Button size="sm" onClick={openStudyMode} className="ml-2 h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
              <Eye className="h-4 w-4 mr-1" />
              Study
            </Button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 mx-1 my-1 gap-1 sm:mx-4 sm:gap-2">
          <TabsTrigger value="library" className="text-[11px] px-1 py-1">
            <Music className="h-4 w-4 mr-1" />
            Library
          </TabsTrigger>
          <TabsTrigger value="study" className="text-[11px] px-1 py-1">
            <BookOpen className="h-4 w-4 mr-1" />
            Study
          </TabsTrigger>
          <TabsTrigger value="collections" className="text-[11px] px-1 py-1">
            <Star className="h-4 w-4 mr-1" />
            Collections
          </TabsTrigger>
          <TabsTrigger value="setlists" className="text-[11px] px-1 py-1">
            <List className="h-4 w-4 mr-1" />
            Setlists
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <div ref={scrollContainerRef as any} className="flex-1 overflow-y-auto">
          <TabsContent value="library" className="px-2 py-2 space-y-2 mt-0 sm:px-4 sm:py-4 sm:space-y-3">
            <SheetMusicLibrary 
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              sortBy={sortBy}
              sortOrder="asc"
              viewMode={viewMode}
              onPdfSelect={onPdfSelect}
            />
          </TabsContent>

          <TabsContent value="study" className="px-2 py-2 mt-0 sm:px-4 sm:py-4">
            <StudyScoresPanel 
              currentSelected={selectedPdf}
              onOpenScore={onPdfSelect}
            />
          </TabsContent>

          <TabsContent value="collections" className="px-2 py-2 mt-0 sm:px-4 sm:py-4">
            <MyCollectionsPanel
              currentSelected={selectedPdf}
              onOpenScore={onPdfSelect}
            />
          </TabsContent>

          <TabsContent value="setlists" className="px-2 py-2 mt-0 sm:px-4 sm:py-4">
            <SetlistBuilder 
              onPdfSelect={onPdfSelect} 
              onOpenPlayer={onOpenSetlistPlayer}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Study Mode Dialog */}
      <SheetMusicViewDialog
        open={studyDialogOpen}
        onOpenChange={setStudyDialogOpen}
        item={studyItem}
      />
    </div>
  );
};