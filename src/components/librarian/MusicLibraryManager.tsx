import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Music, 
  Search, 
  Filter,
  Download,
  Eye,
  Copy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MusicItem {
  id: string;
  title: string;
  composer?: string;
  arranger?: string;
  genre?: string;
  difficulty_level?: string;
  voice_parts?: string[];
  key_signature?: string;
  time_signature?: string;
  tempo_marking?: string;
  duration_minutes?: number;
  pdf_url?: string;
  audio_reference_url?: string;
  lyrics?: string;
  performance_notes?: string;
  copyright_info?: string;
  purchase_info?: string;
  physical_copies_count?: number;
  physical_location?: string;
  tags?: string[];
  is_public?: boolean;
  is_featured?: boolean;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export const MusicLibraryManager = () => {
  const [items, setItems] = useState<MusicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MusicItem | null>(null);
  const [formData, setFormData] = useState<Partial<MusicItem>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching music items:', error);
      toast({
        title: "Error",
        description: "Failed to load music library items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('gw_sheet_music')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Music item updated successfully",
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from('gw_sheet_music')
          .insert([{
            ...formData,
            title: formData.title || 'Untitled'
          }]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Music item added successfully",
        });
      }

      setShowAddDialog(false);
      setEditingItem(null);
      setFormData({});
      fetchItems();
    } catch (error) {
      console.error('Error saving music item:', error);
      toast({
        title: "Error",
        description: "Failed to save music item",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this music item?')) return;

    try {
      const { error } = await supabase
        .from('gw_sheet_music')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Music item deleted successfully",
      });
      fetchItems();
    } catch (error) {
      console.error('Error deleting music item:', error);
      toast({
        title: "Error",
        description: "Failed to delete music item",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (item: MusicItem) => {
    setEditingItem(item);
    setFormData(item);
    setShowAddDialog(true);
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormData({
      is_public: true,
      is_featured: false,
      category: 'spiritual',
      physical_copies_count: 0,
    });
    setShowAddDialog(true);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.composer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.arranger?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'spiritual', 'classical', 'contemporary', 'folk', 'jazz', 'gospel', 'other'];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading music library...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              <span className="text-lg font-semibold">Music Library</span>
            </div>
            <Button onClick={openAddDialog} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search music..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Cards / Desktop Table */}
      <Card>
        <CardContent className="p-0">
          {/* Mobile Cards View */}
          <div className="block lg:hidden">
            {filteredItems.map((item) => (
              <div key={item.id} className="border-b p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{item.title}</h3>
                    <div className="text-sm text-muted-foreground">
                      {item.composer && <span>by {item.composer}</span>}
                      {item.arranger && <span className="block">arr. {item.arranger}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {item.pdf_url && (
                      <Button size="sm" variant="ghost" asChild className="h-8 w-8 p-0">
                        <a href={item.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(item)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    {item.category || 'uncategorized'}
                  </Badge>
                  {item.voice_parts?.slice(0, 2).map((part, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {part}
                    </Badge>
                  ))}
                  {item.voice_parts && item.voice_parts.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{item.voice_parts.length - 2}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Copies:</span>
                    <span>{item.physical_copies_count || 0}</span>
                    {item.physical_location && (
                      <Badge variant="outline" className="text-xs">
                        {item.physical_location}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {item.pdf_url && (
                      <Badge variant="default" className="text-xs">PDF</Badge>
                    )}
                    {item.is_featured && (
                      <Badge variant="destructive" className="text-xs">Featured</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredItems.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No music items found. {searchTerm || filterCategory !== 'all' ? 'Try adjusting your search or filters.' : 'Add your first music item to get started.'}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Composer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Voice Parts</TableHead>
                  <TableHead>Copies</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{item.title}</div>
                        {item.arranger && (
                          <div className="text-sm text-muted-foreground">
                            arr. {item.arranger}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.composer || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.category || 'uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.voice_parts?.map((part, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {part}
                          </Badge>
                        )) || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{item.physical_copies_count || 0}</span>
                        {item.physical_location && (
                          <Badge variant="outline" className="text-xs">
                            {item.physical_location}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.pdf_url && (
                          <Badge variant="default" className="text-xs">
                            PDF
                          </Badge>
                        )}
                        {item.is_public && (
                          <Badge variant="default" className="text-xs">
                            Public
                          </Badge>
                        )}
                        {item.is_featured && (
                          <Badge variant="destructive" className="text-xs">
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.pdf_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={item.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredItems.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No music items found. {searchTerm || filterCategory !== 'all' ? 'Try adjusting your search or filters.' : 'Add your first music item to get started.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Music Item' : 'Add New Music Item'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>
              
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter music title"
                />
              </div>

              <div>
                <Label htmlFor="composer">Composer</Label>
                <Input
                  id="composer"
                  value={formData.composer || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, composer: e.target.value }))}
                  placeholder="Enter composer name"
                />
              </div>

              <div>
                <Label htmlFor="arranger">Arranger</Label>
                <Input
                  id="arranger"
                  value={formData.arranger || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, arranger: e.target.value }))}
                  placeholder="Enter arranger name"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.slice(1).map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  value={formData.genre || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                  placeholder="Enter genre"
                />
              </div>
            </div>

            {/* Technical Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">Technical Details</h3>
              
              <div>
                <Label htmlFor="key_signature">Key Signature</Label>
                <Input
                  id="key_signature"
                  value={formData.key_signature || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, key_signature: e.target.value }))}
                  placeholder="e.g., C Major, A minor"
                />
              </div>

              <div>
                <Label htmlFor="time_signature">Time Signature</Label>
                <Input
                  id="time_signature"
                  value={formData.time_signature || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, time_signature: e.target.value }))}
                  placeholder="e.g., 4/4, 3/4"
                />
              </div>

              <div>
                <Label htmlFor="tempo_marking">Tempo Marking</Label>
                <Input
                  id="tempo_marking"
                  value={formData.tempo_marking || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tempo_marking: e.target.value }))}
                  placeholder="e.g., Allegro, 120 BPM"
                />
              </div>

              <div>
                <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  value={formData.duration_minutes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || undefined }))}
                  placeholder="Enter duration in minutes"
                />
              </div>

              <div>
                <Label htmlFor="difficulty_level">Difficulty Level</Label>
                <Select
                  value={formData.difficulty_level || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty_level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* URLs and Files */}
            <div className="space-y-4">
              <h3 className="font-semibold">Files & Links</h3>
              
              <div>
                <Label htmlFor="pdf_url">PDF URL</Label>
                <Input
                  id="pdf_url"
                  value={formData.pdf_url || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, pdf_url: e.target.value }))}
                  placeholder="Enter PDF URL"
                />
              </div>

              <div>
                <Label htmlFor="audio_reference_url">Audio Reference URL</Label>
                <Input
                  id="audio_reference_url"
                  value={formData.audio_reference_url || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, audio_reference_url: e.target.value }))}
                  placeholder="Enter audio reference URL"
                />
              </div>
            </div>

            {/* Physical Inventory */}
            <div className="space-y-4">
              <h3 className="font-semibold">Physical Inventory</h3>
              
              <div>
                <Label htmlFor="physical_copies_count">Physical Copies Count</Label>
                <Input
                  id="physical_copies_count"
                  type="number"
                  value={formData.physical_copies_count || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, physical_copies_count: parseInt(e.target.value) || 0 }))}
                  placeholder="Number of physical copies"
                />
              </div>

              <div>
                <Label htmlFor="physical_location">Physical Location</Label>
                <Input
                  id="physical_location"
                  value={formData.physical_location || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, physical_location: e.target.value }))}
                  placeholder="Storage location"
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-semibold">Additional Information</h3>
              
              <div>
                <Label htmlFor="lyrics">Lyrics</Label>
                <Textarea
                  id="lyrics"
                  value={formData.lyrics || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, lyrics: e.target.value }))}
                  placeholder="Enter lyrics or first verse..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="performance_notes">Performance Notes</Label>
                <Textarea
                  id="performance_notes"
                  value={formData.performance_notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, performance_notes: e.target.value }))}
                  placeholder="Special performance instructions..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="copyright_info">Copyright Information</Label>
                  <Input
                    id="copyright_info"
                    value={formData.copyright_info || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, copyright_info: e.target.value }))}
                    placeholder="Copyright details"
                  />
                </div>

                <div>
                  <Label htmlFor="purchase_info">Purchase Information</Label>
                  <Input
                    id="purchase_info"
                    value={formData.purchase_info || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_info: e.target.value }))}
                    placeholder="Where to purchase"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={formData.is_public || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                  />
                  <Label htmlFor="is_public">Public (visible to all members)</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={formData.is_featured || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                  />
                  <Label htmlFor="is_featured">Featured item</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.title}>
              {editingItem ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};