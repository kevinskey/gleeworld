import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SheetMusicLibrary } from './SheetMusicLibrary';
import { SetlistBuilder } from './SetlistBuilder';
import { StudyScoresPanel } from './StudyScoresPanel';
import { MyCollectionsPanel } from './MyCollectionsPanel';
import { SheetMusicViewDialog } from './SheetMusicViewDialog';
import { 
  Music, 
  Eye, 
  BookOpen, 
  Star, 
  List,
  Search,
  Grid3X3,
  LayoutList,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [columns, setColumns] = useState(2);
  const [studyDialogOpen, setStudyDialogOpen] = useState(false);
  const [studyItem, setStudyItem] = useState<any>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
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

  const categories = [
    { value: "all", label: "All" },
    { value: "classical", label: "Classical" },
    { value: "spiritual", label: "Spiritual" },
    { value: "contemporary", label: "Contemporary" },
    { value: "gospel", label: "Gospel" },
    { value: "jazz", label: "Jazz" },
  ];

  const sortOptions = [
    { value: "title", label: "Title" },
    { value: "composer", label: "Composer" },
    { value: "created_at", label: "Date Added" },
    { value: "difficulty_level", label: "Difficulty" },
  ];

  return (
    <div className="w-full flex flex-col overflow-hidden h-full">
      {/* Compact Mobile Header */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm sticky top-0 z-10 px-2 py-2 space-y-2 border-b border-border">
        {/* Search Row with Filter Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-10 text-base"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Filter Sheet Trigger */}
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-xl">
              <SheetHeader className="pb-4">
                <SheetTitle>Filter & Sort</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 pb-6">
                {/* Category Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Category</Label>
                  <RadioGroup 
                    value={selectedCategory} 
                    onValueChange={setSelectedCategory}
                    className="grid grid-cols-3 gap-2"
                  >
                    {categories.map((cat) => (
                      <div key={cat.value} className="flex items-center">
                        <RadioGroupItem value={cat.value} id={`cat-${cat.value}`} className="sr-only" />
                        <Label
                          htmlFor={`cat-${cat.value}`}
                          className={`flex-1 text-center py-2 px-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                            selectedCategory === cat.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/50 border-border hover:bg-muted'
                          }`}
                        >
                          {cat.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Sort By */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Sort By</Label>
                  <RadioGroup 
                    value={sortBy} 
                    onValueChange={setSortBy}
                    className="grid grid-cols-2 gap-2"
                  >
                    {sortOptions.map((opt) => (
                      <div key={opt.value} className="flex items-center">
                        <RadioGroupItem value={opt.value} id={`sort-${opt.value}`} className="sr-only" />
                        <Label
                          htmlFor={`sort-${opt.value}`}
                          className={`flex-1 text-center py-2 px-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                            sortBy === opt.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/50 border-border hover:bg-muted'
                          }`}
                        >
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Grid Columns */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Grid Size</Label>
                  <ToggleGroup 
                    type="single" 
                    value={columns.toString()} 
                    onValueChange={(v) => v && setColumns(Number(v))}
                    className="justify-start gap-2"
                  >
                    <ToggleGroupItem value="1" className="h-10 px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      Large
                    </ToggleGroupItem>
                    <ToggleGroupItem value="2" className="h-10 px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      Medium
                    </ToggleGroupItem>
                    <ToggleGroupItem value="3" className="h-10 px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      Small
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => setFilterSheetOpen(false)}
                >
                  Apply Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Quick View Toggle */}
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && setViewMode(v as "grid" | "list")}
            className="flex-shrink-0"
          >
            <ToggleGroupItem value="grid" className="h-10 w-10 p-0">
              <Grid3X3 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" className="h-10 w-10 p-0">
              <LayoutList className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Selected PDF Floating Banner */}
        {selectedPdf && (
          <div className="bg-primary/10 rounded-lg p-2 flex items-center justify-between gap-2 border border-primary/20">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary truncate">
                {selectedPdf.title}
              </p>
            </div>
            <Button size="sm" onClick={openStudyMode} className="h-8 px-3 text-xs flex-shrink-0">
              <Eye className="h-3 w-3 mr-1" />
              Study
            </Button>
          </div>
        )}
      </div>

      {/* Tab Navigation - Scrollable on small screens */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 w-full">
        <div className="flex-shrink-0 px-2 py-1.5 bg-background border-b border-border">
          <TabsList className="w-full grid grid-cols-4 h-10 p-1">
            <TabsTrigger 
              value="library" 
              className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1 px-2"
            >
              <Music className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Library</span>
            </TabsTrigger>
            <TabsTrigger 
              value="study" 
              className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1 px-2"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Study</span>
            </TabsTrigger>
            <TabsTrigger 
              value="collections" 
              className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1 px-2"
            >
              <Star className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Saved</span>
            </TabsTrigger>
            <TabsTrigger 
              value="setlists" 
              className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1 px-2"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Sets</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content - Scrollable Area */}
        <div 
          ref={scrollContainerRef as any} 
          className="flex-1 overflow-y-auto overscroll-contain min-h-0 w-full pb-safe"
        >
          <TabsContent value="library" className="h-full px-2 py-2 mt-0 w-full">
            <SheetMusicLibrary 
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              sortBy={sortBy}
              sortOrder="asc"
              viewMode={viewMode}
              columns={columns}
              onPdfSelect={onPdfSelect}
              isMobile={true}
            />
          </TabsContent>

          <TabsContent value="study" className="h-full px-2 py-2 mt-0 w-full">
            <StudyScoresPanel 
              currentSelected={selectedPdf}
              onOpenScore={onPdfSelect}
            />
          </TabsContent>

          <TabsContent value="collections" className="h-full px-2 py-2 mt-0 w-full">
            <MyCollectionsPanel
              currentSelected={selectedPdf}
              onOpenScore={onPdfSelect}
            />
          </TabsContent>

          <TabsContent value="setlists" className="h-full px-2 py-2 mt-0 w-full">
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
