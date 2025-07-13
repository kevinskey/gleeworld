import { useState } from "react";
import { Search, Grid, List, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSheetMusic } from "@/hooks/useSheetMusic";
import { SheetMusicCard } from "./SheetMusicCard";
import { SheetMusicFilters } from "./SheetMusicFilters";
import { SheetMusicViewer } from "./SheetMusicViewer";
import { SheetMusicUpload } from "./SheetMusicUpload";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Database } from "@/integrations/supabase/types";

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];

interface SheetMusicFilters {
  voice_parts?: string[];
  difficulty_level?: string;
  composer?: string;
  search?: string;
  tags?: string[];
}

export const SheetMusicLibrary = () => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<SheetMusicFilters>({});
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedSheetMusic, setSelectedSheetMusic] = useState<SheetMusic | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  
  const { sheetMusic, loading, fetchSheetMusic } = useSheetMusic();
  const { user } = useAuth();
  const { profile } = useProfile();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';

  const handleSearch = () => {
    fetchSheetMusic({ ...filters, search });
  };

  const handleFiltersChange = (newFilters: SheetMusicFilters) => {
    setFilters(newFilters);
    fetchSheetMusic({ ...newFilters, search });
  };

  const clearFilters = () => {
    setFilters({});
    setSearch("");
    fetchSheetMusic();
  };

  if (selectedSheetMusic) {
    return (
      <SheetMusicViewer 
        sheetMusic={selectedSheetMusic} 
        onBack={() => setSelectedSheetMusic(null)} 
      />
    );
  }

  if (showUpload && isAdmin) {
    return (
      <SheetMusicUpload 
        onBack={() => setShowUpload(false)}
        onUploadComplete={() => {
          setShowUpload(false);
          fetchSheetMusic();
        }}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Sheet Music Library</h1>
            <p className="text-muted-foreground">Browse and practice your repertoire</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button onClick={() => setShowUpload(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Sheet Music
              </Button>
            )}
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, composer, or arranger..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>Search</Button>
              <Button variant="outline" onClick={clearFilters}>Clear</Button>
            </div>
            
            <SheetMusicFilters 
              filters={filters} 
              onFiltersChange={handleFiltersChange} 
            />
          </CardContent>
        </Card>

        {/* Active Filters Display */}
        {(Object.keys(filters).length > 0 || search) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {search && (
              <Badge variant="secondary">
                Search: {search}
              </Badge>
            )}
            {filters.voice_parts && filters.voice_parts.length > 0 && (
              <Badge variant="secondary">
                Voice Parts: {filters.voice_parts.join(', ')}
              </Badge>
            )}
            {filters.difficulty_level && (
              <Badge variant="secondary">
                Difficulty: {filters.difficulty_level}
              </Badge>
            )}
            {filters.composer && (
              <Badge variant="secondary">
                Composer: {filters.composer}
              </Badge>
            )}
            {filters.tags && filters.tags.length > 0 && (
              <Badge variant="secondary">
                Tags: {filters.tags.join(', ')}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sheetMusic.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No sheet music found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-4"
        }>
          {sheetMusic.map((piece) => (
            <SheetMusicCard
              key={piece.id}
              sheetMusic={piece}
              viewMode={viewMode}
              onSelect={() => setSelectedSheetMusic(piece)}
            />
          ))}
        </div>
      )}
    </div>
  );
};