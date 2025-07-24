import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Camera, 
  Upload, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Package,
  BookOpen,
  DollarSign,
  Scan,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SheetMusicLibrary } from './SheetMusicLibrary';
import { UploadDialog } from './UploadDialog';
import { CameraImportDialog } from './CameraImportDialog';
import { CSVImportDialog } from './CSVImportDialog';
import { EditablePhysicalCopyView } from './EditablePhysicalCopyView';

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
  voicing: string | null;
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
}

export const LibraryManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('digital');
  
  const [uploadDialog, setUploadDialog] = useState(false);
  const [cameraDialog, setCameraDialog] = useState(false);
  const [csvDialog, setCsvDialog] = useState(false);
  
  const [sheetMusic, setSheetMusic] = useState<ExtendedSheetMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDigital: 0,
    totalPhysical: 0,
    needsInventory: 0,
    totalValue: 0,
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
      
      const musicData = (data || []) as ExtendedSheetMusic[];
      setSheetMusic(musicData);
      
      // Calculate stats
      const stats = musicData.reduce(
        (acc, item) => ({
          totalDigital: acc.totalDigital + (item.pdf_url ? 1 : 0),
          totalPhysical: acc.totalPhysical + (item.physical_copies_count || 0),
          needsInventory: acc.needsInventory + (
            (item.physical_copies_count || 0) > 0 && !item.last_inventory_date ? 1 : 0
          ),
          totalValue: acc.totalValue + (item.purchase_price || 0),
        }),
        { totalDigital: 0, totalPhysical: 0, needsInventory: 0, totalValue: 0 }
      );
      
      setStats(stats);
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

  const filteredMusic = sheetMusic.filter((item) => {
    const matchesSearch = searchQuery === "" || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.composer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.arranger?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || 
      item.tags?.some(tag => tag.toLowerCase() === selectedCategory.toLowerCase());

    const matchesTab = activeTab === 'all' ||
      (activeTab === 'digital' && item.pdf_url) ||
      (activeTab === 'physical' && (item.physical_copies_count || 0) > 0) ||
      (activeTab === 'inventory' && (item.physical_copies_count || 0) > 0 && !item.last_inventory_date);

    return matchesSearch && matchesCategory && matchesTab;
  });


  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Library Management</h1>
          <p className="text-muted-foreground">
            Manage both digital and physical sheet music library
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setCameraDialog(true)} className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Camera Import
          </Button>
          <Button onClick={() => setCsvDialog(true)} variant="outline" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            CSV Import
          </Button>
          <Button onClick={() => setUploadDialog(true)} variant="outline" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Digital Files</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDigital}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Physical Copies</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPhysical}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Inventory</CardTitle>
            <Scan className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.needsInventory}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sheet music..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="digital">Digital Only</TabsTrigger>
          <TabsTrigger value="physical">Physical Copies</TabsTrigger>
          <TabsTrigger value="inventory">Needs Inventory</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <SheetMusicLibrary
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            sortBy={sortBy}
            sortOrder={sortOrder}
            viewMode={viewMode}
          />
        </TabsContent>
        
        <TabsContent value="digital" className="space-y-4">
          <SheetMusicLibrary
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            sortBy={sortBy}
            sortOrder={sortOrder}
            viewMode={viewMode}
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
      </Tabs>

      {/* Dialogs */}
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
    </div>
  );
};