import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  MapPin, 
  Calendar, 
  DollarSign, 
  User, 
  Edit, 
  Save, 
  X, 
  Search,
  BookOpen,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ExtendedSheetMusic {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
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
}

interface EditablePhysicalCopyViewProps {
  sheetMusic: ExtendedSheetMusic[];
  onRefresh: () => void;
}

export const EditablePhysicalCopyView = ({ sheetMusic, onRefresh }: EditablePhysicalCopyViewProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExtendedSheetMusic>>({});

  const filteredMusic = sheetMusic.filter((item) => {
    const matchesSearch = searchQuery === "" || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.composer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.physical_location?.toLowerCase().includes(searchQuery.toLowerCase());

    return (item.physical_copies_count || 0) > 0 && matchesSearch;
  });

  const startEditing = (item: ExtendedSheetMusic) => {
    setEditingItem(item.id);
    setEditForm({
      physical_copies_count: item.physical_copies_count,
      physical_location: item.physical_location,
      condition_notes: item.condition_notes,
      last_inventory_date: item.last_inventory_date,
      isbn_barcode: item.isbn_barcode,
      publisher: item.publisher,
      copyright_year: item.copyright_year,
      purchase_date: item.purchase_date,
      purchase_price: item.purchase_price,
      donor_name: item.donor_name,
      notes: item.notes,
    });
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditForm({});
  };

  const saveChanges = async (itemId: string) => {
    try {
      const updateData = {
        ...editForm,
        last_inventory_date: new Date().toISOString().split('T')[0], // Update inventory date when changes are made
      };

      const { error } = await supabase
        .from('gw_sheet_music')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Physical copy information updated successfully",
      });

      setEditingItem(null);
      setEditForm({});
      onRefresh();
    } catch (error) {
      console.error('Error updating physical copy:', error);
      toast({
        title: "Error",
        description: "Failed to update physical copy information",
        variant: "destructive",
      });
    }
  };

  const updateFormField = (field: keyof ExtendedSheetMusic, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderEditForm = (item: ExtendedSheetMusic) => (
    <Card key={item.id} className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{item.title}</h3>
            {item.composer && (
              <p className="text-sm text-muted-foreground">by {item.composer}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveChanges(item.id)}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEditing}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="copies">Physical Copies Count</Label>
            <Input
              id="copies"
              type="number"
              min="0"
              value={editForm.physical_copies_count || 0}
              onChange={(e) => updateFormField('physical_copies_count', parseInt(e.target.value) || 0)}
            />
          </div>
          
          <div>
            <Label htmlFor="location">Physical Location</Label>
            <Input
              id="location"
              value={editForm.physical_location || ''}
              onChange={(e) => updateFormField('physical_location', e.target.value)}
              placeholder="e.g., Shelf A-3, Box 12"
            />
          </div>
          
          <div>
            <Label htmlFor="publisher">Publisher</Label>
            <Input
              id="publisher"
              value={editForm.publisher || ''}
              onChange={(e) => updateFormField('publisher', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="copyright">Copyright Year</Label>
            <Input
              id="copyright"
              type="number"
              min="1800"
              max="2100"
              value={editForm.copyright_year || ''}
              onChange={(e) => updateFormField('copyright_year', parseInt(e.target.value) || null)}
            />
          </div>
          
          <div>
            <Label htmlFor="purchase_date">Purchase Date</Label>
            <Input
              id="purchase_date"
              type="date"
              value={editForm.purchase_date || ''}
              onChange={(e) => updateFormField('purchase_date', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="purchase_price">Purchase Price ($)</Label>
            <Input
              id="purchase_price"
              type="number"
              min="0"
              step="0.01"
              value={editForm.purchase_price || ''}
              onChange={(e) => updateFormField('purchase_price', parseFloat(e.target.value) || null)}
            />
          </div>
          
          <div>
            <Label htmlFor="donor">Donor Name</Label>
            <Input
              id="donor"
              value={editForm.donor_name || ''}
              onChange={(e) => updateFormField('donor_name', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="isbn">ISBN/Barcode</Label>
            <Input
              id="isbn"
              value={editForm.isbn_barcode || ''}
              onChange={(e) => updateFormField('isbn_barcode', e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="condition">Condition Notes</Label>
          <Textarea
            id="condition"
            value={editForm.condition_notes || ''}
            onChange={(e) => updateFormField('condition_notes', e.target.value)}
            placeholder="Describe the physical condition of the sheet music"
            rows={2}
          />
        </div>
        
        <div>
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            value={editForm.notes || ''}
            onChange={(e) => updateFormField('notes', e.target.value)}
            placeholder="Any additional notes about this item"
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderDisplayCard = (item: ExtendedSheetMusic) => (
    <Card key={item.id} className="hover:shadow-md transition-shadow group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                {item.composer && (
                  <p className="text-sm text-muted-foreground">by {item.composer}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => startEditing(item)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span>{item.physical_copies_count || 0} copies</span>
              </div>
              
              {item.physical_location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{item.physical_location}</span>
                </div>
              )}
              
              {item.last_inventory_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Checked {new Date(item.last_inventory_date).toLocaleDateString()}</span>
                </div>
              )}
              
              {item.purchase_price && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>${item.purchase_price.toFixed(2)}</span>
                </div>
              )}
            </div>

            {(item.publisher || item.copyright_year) && (
              <div className="mt-2 text-sm text-muted-foreground">
                {item.publisher && <span>{item.publisher}</span>}
                {item.publisher && item.copyright_year && <span> • </span>}
                {item.copyright_year && <span>{item.copyright_year}</span>}
              </div>
            )}
            
            {item.condition_notes && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Condition:</strong> {item.condition_notes}
                </p>
              </div>
            )}

            {item.donor_name && (
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Donated by {item.donor_name}</span>
              </div>
            )}

            {item.notes && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Notes:</strong> {item.notes}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            {!item.last_inventory_date && (item.physical_copies_count || 0) > 0 && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Needs Inventory
              </Badge>
            )}
            
            {item.physical_copies_count === 0 && (
              <Badge variant="outline" className="text-gray-600">
                Digital Only
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search physical copies by title, composer, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results */}
      {filteredMusic.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No physical copies found</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery 
                ? "Try adjusting your search terms" 
                : "Add physical copy information to existing items or import from CSV"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMusic.map((item) => 
            editingItem === item.id 
              ? renderEditForm(item)
              : renderDisplayCard(item)
          )}
        </div>
      )}
    </div>
  );
};