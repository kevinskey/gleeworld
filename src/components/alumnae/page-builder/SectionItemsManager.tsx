import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Image, FileText, Video, Music, FileIcon, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ItemEditor } from './ItemEditor';
import { Badge } from '@/components/ui/badge';

interface SectionItemsManagerProps {
  sectionId: string;
}

export const SectionItemsManager = ({ sectionId }: SectionItemsManagerProps) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showItemEditor, setShowItemEditor] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [sectionId]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('alumnae_section_items')
        .select('*')
        .eq('section_id', sectionId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast.error('Failed to load items: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem({
      id: '',
      section_id: sectionId,
      item_type: 'text',
      title: null,
      content: null,
      media_url: null,
      link_url: null,
      link_target: 'internal',
      column_position: 1,
      sort_order: items.length,
      width_percentage: 100,
      is_active: true,
      settings: {},
    });
    setShowItemEditor(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setShowItemEditor(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return;

    try {
      const { error } = await supabase
        .from('alumnae_section_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Item deleted');
      fetchItems();
    } catch (error: any) {
      toast.error('Failed to delete item: ' + error.message);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'pdf': return <FileIcon className="h-4 w-4" />;
      case 'link': return <LinkIcon className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (showItemEditor) {
    return (
      <ItemEditor
        item={editingItem}
        onSave={() => {
          setShowItemEditor(false);
          setEditingItem(null);
          fetchItems();
        }}
        onCancel={() => {
          setShowItemEditor(false);
          setEditingItem(null);
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Content Items</CardTitle>
          <Button onClick={handleAddItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No items yet. Add your first item!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  {getItemIcon(item.item_type)}
                  <span className="font-medium">{item.title || 'Untitled Item'}</span>
                  <Badge variant="outline" className="text-xs">{item.item_type}</Badge>
                  <span className="text-sm text-muted-foreground">Column {item.column_position}</span>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{item.width_percentage}%</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEditItem(item)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDeleteItem(item.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
