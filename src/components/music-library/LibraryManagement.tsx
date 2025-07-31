import { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Camera, 
  Upload, 
  Scan,
  FileSpreadsheet,
  Scissors
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SheetMusicLibrary } from './SheetMusicLibrary';
import { UploadDialog } from './UploadDialog';
import { CameraImportDialog } from './CameraImportDialog';
import { CSVImportDialog } from './CSVImportDialog';
import { EditablePhysicalCopyView } from './EditablePhysicalCopyView';
import { StreamlinedFilterBar, FilterState } from './StreamlinedFilterBar';
import { LibraryStats, LibraryStatsData } from '@/modules/glee-library/stats/LibraryStats';
import { logSheetMusicAction, getDeviceType } from '@/lib/music-library/analytics';
import { BulkPDFCroppingTool } from '@/components/glee-library/BulkPDFCroppingTool';

interface ExtendedSheetMusic {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  key_signature: string | null;
  time_signature: string | null;
  tempo_marking: string | null;
  difficulty_level: string | null;
  voice_parts: string[] | null;
  language: string | null;
  pdf_url: string | null;
  audio_preview_url: string | null;
  thumbnail_url: string | null;
  tags: string[] | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  // Physical copy fields
  physical_copies_count: number;
  physical_location: string | null;
  condition_notes: string | null;
  last_inventory_date: string | null;
  isbn_barcode: string | null;
  publisher: string | null;
  copyright_year: number | null;
  purchase_date: string | null;
  purchase_price: number | null;
  donor_name: string | null;
  notes: string | null;
  voicing: string | null;
  // Archive fields
  is_archived: boolean;
  archived_date: string | null;
  archive_reason: string | null;
}

export const LibraryManagement = () => {
  const { profile } = useUserRole();
  const { toast } = useToast();
  
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedCategory: 'all',
    formatFilter: 'all',
    difficultyFilter: 'all',
    voicePartFilter: 'all',
    sortBy: 'title',
    sortOrder: 'asc',
    viewMode: 'grid'
  });
  const [activeTab, setActiveTab] = useState('all');
  
  const [uploadDialog, setUploadDialog] = useState(false);
  const [cameraDialog, setCameraDialog] = useState(false);
  const [csvDialog, setCsvDialog] = useState(false);
  
  const [sheetMusic, setSheetMusic] = useState<ExtendedSheetMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LibraryStatsData>({
    totalDigital: 0,
    totalPhysical: 0,
    bothFormats: 0,
  });

  useEffect(() => {
    fetchSheetMusic();
  }, []);

  const fetchSheetMusic = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const musicData = (data || []) as any[];
      setSheetMusic(musicData);
      
      // Calculate stats with new format
      const calculatedStats = musicData.reduce(
        (acc, item) => {
          const hasDigital = !!item.pdf_url;
          const hasPhysical = (item.physical_copies_count || 0) > 0;
          const hasBoth = hasDigital && hasPhysical;
          
          return {
            totalDigital: acc.totalDigital + (hasDigital ? 1 : 0),
            totalPhysical: acc.totalPhysical + (item.physical_copies_count || 0),
            bothFormats: acc.bothFormats + (hasBoth ? 1 : 0),
          };
        },
        { 
          totalDigital: 0, 
          totalPhysical: 0, 
          bothFormats: 0, 
        }
      );
      
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error fetching sheet music:', error);
      toast({
        title: "Error",
        description: "Failed to load sheet music library",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const filteredMusic = sheetMusic.filter((item) => {
    const matchesSearch = filters.searchQuery === "" || 
      item.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      item.composer?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      item.arranger?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      item.tags?.some(tag => tag.toLowerCase().includes(filters.searchQuery.toLowerCase()));

    const matchesCategory = filters.selectedCategory === "all" || 
      item.tags?.some(tag => tag.toLowerCase() === filters.selectedCategory.toLowerCase());

    const matchesFormat = filters.formatFilter === 'all' || 
      (filters.formatFilter === 'digital' && item.pdf_url && !((item.physical_copies_count || 0) > 0)) ||
      (filters.formatFilter === 'physical' && (item.physical_copies_count || 0) > 0 && !item.pdf_url) ||
      (filters.formatFilter === 'both' && item.pdf_url && (item.physical_copies_count || 0) > 0);

    const matchesTab = activeTab === 'all' ||
      (activeTab === 'digital' && item.pdf_url) ||
      (activeTab === 'physical' && (item.physical_copies_count || 0) > 0) ||
      (activeTab === 'inventory' && (item.physical_copies_count || 0) > 0 && !item.last_inventory_date);

    return matchesSearch && matchesCategory && matchesFormat && matchesTab;
  });


  // Check if user can access import tools (admins and librarians only)
  const canAccessImportTools = profile?.role && ['admin', 'super-admin', 'librarian'].includes(profile.role);

  return (
    <div className="container mx-auto p-2 sm:p-6 space-y-3 sm:space-y-6">
      {/* Header and Import Tools - Only for admins and librarians */}
      {canAccessImportTools && (
        <div className="flex flex-col gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Library Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage both digital and physical sheet music library
            </p>
          </div>
          
          {/* Mobile: Stack buttons vertically, Desktop: horizontal */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Button 
              onClick={() => setCameraDialog(true)} 
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Camera className="h-4 w-4" />
              <span className="text-sm">Camera Import</span>
            </Button>
            <Button 
              onClick={() => setCsvDialog(true)} 
              variant="outline" 
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="text-sm">CSV Import</span>
            </Button>
            <Button 
              onClick={() => setUploadDialog(true)} 
              variant="outline" 
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              <span className="text-sm">Upload Files</span>
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards - Only for admins and librarians */}
      {canAccessImportTools && <LibraryStats stats={stats} loading={loading} />}

      {/* Search and Filters */}
      <StreamlinedFilterBar 
        filters={filters} 
        onFiltersChange={handleFiltersChange}
        showFormatFilter={true}
        showVoicePartFilter={true}
      />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full h-auto p-1 
          grid-cols-2 gap-1 sm:grid-cols-4 
          md:grid-cols-5 md:gap-2">
          <TabsTrigger value="all" className="text-xs px-1 py-2 min-w-0 sm:text-sm sm:px-2">
            <span className="hidden sm:inline">All Items</span>
            <span className="sm:hidden truncate">All</span>
          </TabsTrigger>
          <TabsTrigger value="digital" className="text-xs px-1 py-2 min-w-0 sm:text-sm sm:px-2">
            <span className="hidden sm:inline">Digital Only</span>
            <span className="sm:hidden truncate">Digital</span>
          </TabsTrigger>
          <TabsTrigger value="physical" className="text-xs px-1 py-2 min-w-0 sm:text-sm sm:px-2">
            <span className="hidden sm:inline">Physical Copies</span>
            <span className="sm:hidden truncate">Physical</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs px-1 py-2 min-w-0 sm:text-sm sm:px-2">
            <span className="hidden md:inline">Needs Inventory</span>
            <span className="md:hidden truncate">Inventory</span>
          </TabsTrigger>
          {canAccessImportTools && (
            <TabsTrigger value="ai-tools" className="text-xs px-1 py-2 min-w-0 sm:text-sm sm:px-2 
              col-span-2 sm:col-span-1">
              <Scissors className="h-3 w-3 mr-1 shrink-0" />
              <span className="hidden md:inline">AI Tools</span>
              <span className="md:hidden truncate">AI</span>
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <SheetMusicLibrary
            searchQuery={filters.searchQuery}
            selectedCategory={filters.selectedCategory}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            viewMode={filters.viewMode}
          />
        </TabsContent>
        
        <TabsContent value="digital" className="space-y-4">
          <SheetMusicLibrary
            searchQuery={filters.searchQuery}
            selectedCategory={filters.selectedCategory}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            viewMode={filters.viewMode}
          />
        </TabsContent>
        
        <TabsContent value="physical" className="space-y-4">
          <EditablePhysicalCopyView 
            sheetMusic={sheetMusic} 
            onRefresh={fetchSheetMusic} 
          />
        </TabsContent>
        
        <TabsContent value="inventory" className="space-y-4">
          <EditablePhysicalCopyView 
            sheetMusic={sheetMusic.filter(item => 
              (item.physical_copies_count || 0) > 0 && !item.last_inventory_date
            )} 
            onRefresh={fetchSheetMusic} 
          />
        </TabsContent>
        
        {canAccessImportTools && (
          <TabsContent value="ai-tools" className="space-y-4">
            <BulkPDFCroppingTool />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs - Only for admins and librarians */}
      {canAccessImportTools && (
        <>
          <UploadDialog
            open={uploadDialog}
            onOpenChange={setUploadDialog}
            activeTab="sheet-music"
          />
          
          <CameraImportDialog
            open={cameraDialog}
            onOpenChange={setCameraDialog}
            onSuccess={fetchSheetMusic}
          />
          
          <CSVImportDialog
            open={csvDialog}
            onOpenChange={setCsvDialog}
            onSuccess={fetchSheetMusic}
          />
        </>
      )}
    </div>
  );
};