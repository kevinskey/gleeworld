import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Music, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  FileText, 
  Download,
  Trash2,
  Plus,
  Grid,
  List,
  SortAsc
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SheetMusicLibrary } from '@/components/music-library/SheetMusicLibrary';
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';
import { UploadDialog } from '@/components/music-library/UploadDialog';

interface SheetMusic {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  key_signature: string | null;
  time_signature: string | null;
  difficulty_level: string | null;
  voice_parts: string[] | null;
  pdf_url: string | null;
  tags: string[] | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

interface SheetMusicAnnotationLibraryProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    exec_board_role?: string;
  };
}

export const SheetMusicAnnotationLibrary = ({ user }: SheetMusicAnnotationLibraryProps) => {
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPdf, setSelectedPdf] = useState<{ url: string; title: string; id?: string } | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalSheetMusic: 0,
    annotatedSheetMusic: 0,
    myAnnotations: 0,
    sharedAnnotations: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total sheet music count
      const { count: totalCount } = await supabase
        .from('gw_sheet_music')
        .select('*', { count: 'exact', head: true });

      // Get annotated sheet music count
      const { data: annotatedMusic } = await supabase
        .from('gw_sheet_music_annotations')
        .select('sheet_music_id')
        .not('sheet_music_id', 'is', null);

      const uniqueAnnotatedMusic = new Set(annotatedMusic?.map(a => a.sheet_music_id)).size;

      // Get user's annotations count
      const { count: myAnnotationsCount } = await supabase
        .from('gw_sheet_music_annotations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser?.id);

      // Get shared annotations count
      const { data: sharedAnnotations } = await supabase
        .from('gw_annotation_public_shares')
        .select('annotation_id')
        .eq('is_active', true);

      setStats({
        totalSheetMusic: totalCount || 0,
        annotatedSheetMusic: uniqueAnnotatedMusic,
        myAnnotations: myAnnotationsCount || 0,
        sharedAnnotations: sharedAnnotations?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handlePdfSelect = (pdfUrl: string, title: string, id?: string) => {
    console.log('PDF selected:', { pdfUrl, title, id });
    setSelectedPdf({ url: pdfUrl, title, id });
    setActiveTab('annotate');
  };

  const handleUploadSuccess = () => {
    setUploadDialogOpen(false);
    fetchStats();
    toast.success('Sheet music uploaded successfully');
  };

  const categories = [
    { value: 'all', label: 'All Music' },
    { value: 'anthem', label: 'Anthems' },
    { value: 'spiritual', label: 'Spirituals' },
    { value: 'classical', label: 'Classical' },
    { value: 'folk', label: 'Folk Songs' },
    { value: 'contemporary', label: 'Contemporary' },
    { value: 'holiday', label: 'Holiday' }
  ];

  const sortOptions = [
    { value: 'title', label: 'Title' },
    { value: 'composer', label: 'Composer' },
    { value: 'created_at', label: 'Date Added' },
    { value: 'difficulty_level', label: 'Difficulty' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-foreground">Sheet Music & Annotations</h3>
          <p className="text-muted-foreground">
            Manage the choir's sheet music library and create annotated scores
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Music
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-foreground">{stats.totalSheetMusic}</div>
            <div className="text-sm text-muted-foreground">Total Sheet Music</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-foreground">{stats.annotatedSheetMusic}</div>
            <div className="text-sm text-muted-foreground">Annotated Pieces</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-foreground">{stats.myAnnotations}</div>
            <div className="text-sm text-muted-foreground">My Annotations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-foreground">{stats.sharedAnnotations}</div>
            <div className="text-sm text-muted-foreground">Shared Annotations</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="library">Music Library</TabsTrigger>
          <TabsTrigger value="annotate" disabled={!selectedPdf}>
            Annotate {selectedPdf ? `- ${selectedPdf.title}` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          {/* Search and Filter Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title, composer, or tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        Sort by {option.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    <SortAsc className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  >
                    {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sheet Music Library */}
          <SheetMusicLibrary
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            sortBy={sortBy}
            sortOrder={sortOrder}
            viewMode={viewMode}
            onPdfSelect={handlePdfSelect}
          />
        </TabsContent>

        <TabsContent value="annotate" className="space-y-6">
          {selectedPdf ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    Annotating: {selectedPdf.title}
                  </CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedPdf(null);
                      setActiveTab('library');
                    }}
                  >
                    Back to Library
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <PDFViewerWithAnnotations
                  pdfUrl={selectedPdf.url}
                  musicId={selectedPdf.id}
                  musicTitle={selectedPdf.title}
                  className="w-full h-[800px]"
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sheet music selected</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Select a piece of sheet music from the library to start annotating
                </p>
                <Button onClick={() => setActiveTab('library')}>
                  Browse Library
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        activeTab="sheet-music"
      />
    </div>
  );
};