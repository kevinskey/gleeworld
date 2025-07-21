import { useState, useMemo } from "react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Music,
  Music2,
  FileText,
  Upload,
  Search,
  Filter,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Plus,
  ArrowLeft,
  X
} from "lucide-react";
import { SheetMusicLibrary } from "./SheetMusicLibrary";
import { AudioLibrary } from "./AudioLibrary";
import { UploadDialog } from "./UploadDialog";
import { PDFViewerDialog } from "./PDFViewerDialog";
import { PDFViewer } from "@/components/PDFViewer";

export const MusicLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState("sheet-music");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [currentPdfUrl, setCurrentPdfUrl] = useState('');
  const [currentPdfTitle, setCurrentPdfTitle] = useState('');

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "classical", label: "Classical" },
    { value: "gospel", label: "Gospel" },
    { value: "spiritual", label: "Spirituals" },
    { value: "contemporary", label: "Contemporary" },
    { value: "folk", label: "Folk" },
    { value: "world", label: "World Music" },
    { value: "liturgical", label: "Liturgical" },
    { value: "traditional", label: "Traditional" },
  ];

  const sortOptions = [
    { value: "title", label: "Title" },
    { value: "composer", label: "Composer/Artist" },
    { value: "created_at", label: "Date Added" },
    { value: "difficulty_level", label: "Difficulty" },
    { value: "duration", label: "Duration" },
  ];

  const handlePdfSelect = (pdfUrl: string, title: string) => {
    setCurrentPdfUrl(pdfUrl);
    setCurrentPdfTitle(title);
    setPdfViewerOpen(false); // Close the dialog if it was open
  };

  const clearPdf = () => {
    setCurrentPdfUrl('');
    setCurrentPdfTitle('');
  };

  return (
    <UniversalLayout containerized={false}>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
        {/* Page Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-border/50">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Music2 className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Music Library
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => setPdfViewerOpen(true)} 
                  variant="outline"
                  size="sm"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  PDF Viewer
                </Button>
                <Button 
                  onClick={() => setUploadDialogOpen(true)} 
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Music
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {/* Show PDF Viewer when a PDF is open */}
          {currentPdfUrl ? (
            <div className="space-y-4">
              {/* PDF Header with back button */}
              <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={clearPdf}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Library
                  </Button>
                  <div className="h-4 w-px bg-border"></div>
                  <span className="font-medium">{currentPdfTitle}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearPdf}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Full PDF Viewer */}
              <div className="h-[calc(100vh-200px)] border rounded-lg overflow-hidden">
                <PDFViewer 
                  pdfUrl={currentPdfUrl}
                  className="w-full h-full"
                />
              </div>
            </div>
          ) : (
            /* Show normal library content when no PDF is open */
            <div className="space-y-6">
              {/* Filters and Search */}
              <Card className="bg-white border-2 border-gray-300 shadow-lg">
                <CardHeader className="bg-gray-50 border-b border-gray-200">
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters & Search
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by title, composer, arranger..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Filter Controls */}
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className="flex items-center gap-2"
                    >
                      {sortOrder === "asc" ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      )}
                      {sortOrder === "asc" ? "Ascending" : "Descending"}
                    </Button>

                    <div className="flex border rounded-md">
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="rounded-r-none"
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="rounded-l-none"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Content Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sheet-music" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Sheet Music (PDFs)
                  </TabsTrigger>
                  <TabsTrigger value="audio" className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    Audio Library (MP3s)
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sheet-music" className="space-y-6">
                  <SheetMusicLibrary
                    searchQuery={searchQuery}
                    selectedCategory={selectedCategory}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    viewMode={viewMode}
                  />
                </TabsContent>

                <TabsContent value="audio" className="space-y-6">
                  <AudioLibrary
                    searchQuery={searchQuery}
                    selectedCategory={selectedCategory}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    viewMode={viewMode}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Upload Dialog */}
          <UploadDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            activeTab={activeTab}
          />

          {/* PDF Viewer Dialog */}
          <PDFViewerDialog
            open={pdfViewerOpen}
            onOpenChange={setPdfViewerOpen}
            onPdfSelect={handlePdfSelect}
          />
        </div>
      </div>
    </UniversalLayout>
  );
};