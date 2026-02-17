import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
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
  ChevronDown,
  X,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

interface MobileMusicLibraryProps {
  onPdfSelect: (pdfUrl: string, title: string, id?: string) => void;
  onOpenSetlistPlayer: (setlistId: string) => void;
  selectedPdf: {url: string; title: string; id?: string} | null;
  scrollContainerRef?: React.Ref<HTMLDivElement>;
}

const sections = [
  { value: "library", label: "Library", icon: Music },
  { value: "study", label: "Study Scores", icon: BookOpen },
  { value: "collections", label: "My Saved", icon: Star },
  { value: "setlists", label: "Setlists", icon: List },
];

const categories = [
  { value: "all", label: "All Categories" },
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

export const MobileMusicLibrary = ({ 
  onPdfSelect, 
  onOpenSetlistPlayer, 
  selectedPdf, 
  scrollContainerRef
}: MobileMusicLibraryProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string })?.from;
  const [activeSection, setActiveSection] = useState("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("title");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [columns, setColumns] = useState(2);
  const [studyDialogOpen, setStudyDialogOpen] = useState(false);
  const [studyItem, setStudyItem] = useState<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const { toast } = useToast();

  const currentSection = sections.find(s => s.value === activeSection) || sections[0];
  const CurrentIcon = currentSection.icon;

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
    <div className="w-full flex flex-col overflow-hidden h-full bg-background">
      {/* Mobile Header - Responsive for all phone sizes */}
      <div className="flex-shrink-0 bg-background border-b border-border safe-top">
        {/* Primary Row - Navigation */}
        <div className="flex items-center h-12 px-2 gap-1.5">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 flex-shrink-0"
            onClick={() => navigate(fromPath || '/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Section Dropdown - Primary Navigation */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-2 gap-1.5 text-sm font-semibold flex-1 justify-start max-w-[180px]">
                <CurrentIcon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{currentSection.label}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60 flex-shrink-0 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-50 w-48 bg-popover">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Navigate To</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <DropdownMenuItem
                    key={section.value}
                    onClick={() => setActiveSection(section.value)}
                    className={activeSection === section.value ? 'bg-accent' : ''}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {section.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action Buttons - Compact */}
          <div className="flex items-center gap-0.5">
            {/* Search Toggle */}
            <Button 
              variant={searchOpen ? "secondary" : "ghost"} 
              size="icon" 
              className="h-9 w-9"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-popover">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Category</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
                  {categories.map((cat) => (
                    <DropdownMenuRadioItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Sort By</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                  {sortOptions.map((opt) => (
                    <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Grid Size</DropdownMenuLabel>
                <div className="flex gap-1 p-2">
                  {[1, 2, 3].map((col) => (
                    <Button
                      key={col}
                      variant={columns === col ? "default" : "outline"}
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setColumns(col)}
                    >
                      {col === 1 ? 'L' : col === 2 ? 'M' : 'S'}
                    </Button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <LayoutList className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {searchOpen && (
          <div className="px-2 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search music..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 text-base"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Selected PDF - Compact Banner */}
        {selectedPdf && (
          <div className="px-2 pb-2">
            <div className="bg-primary/10 rounded-lg p-2.5 flex items-center gap-2 border border-primary/20">
              <Music className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-primary truncate flex-1 min-w-0">
                {selectedPdf.title}
              </span>
              <Button size="sm" onClick={openStudyMode} className="h-8 px-3 text-xs flex-shrink-0">
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Open
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content Area - Full Height Scroll with proper touch handling */}
      <div 
        ref={scrollContainerRef as any} 
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0 w-full -webkit-overflow-scrolling-touch"
      >
        <div className="p-2 pb-20">
          {activeSection === "library" && (
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
          )}

          {activeSection === "study" && (
            <StudyScoresPanel 
              currentSelected={selectedPdf}
              onOpenScore={onPdfSelect}
            />
          )}

          {activeSection === "collections" && (
            <MyCollectionsPanel
              currentSelected={selectedPdf}
              onOpenScore={onPdfSelect}
            />
          )}

          {activeSection === "setlists" && (
            <SetlistBuilder 
              onPdfSelect={onPdfSelect} 
              onOpenPlayer={onOpenSetlistPlayer}
            />
          )}
        </div>
      </div>

      {/* Study Mode Dialog */}
      <SheetMusicViewDialog
        open={studyDialogOpen}
        onOpenChange={setStudyDialogOpen}
        item={studyItem}
      />
    </div>
  );
};
