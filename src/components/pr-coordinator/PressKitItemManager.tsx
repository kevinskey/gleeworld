import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PressKit, usePressKits } from '@/hooks/usePressKits';
import { PlusCircle, Edit, Trash2, FileText, Image, Video, User, FileImage, Download, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PressKitItemManagerProps {
  pressKit: PressKit;
}

export const PressKitItemManager = ({ pressKit }: PressKitItemManagerProps) => {
  const { deletePressKitItem, updatePressKitItem } = usePressKits();
  const [selectedItemType, setSelectedItemType] = useState<string>('all');

  const itemTypes = [
    { value: 'all', label: 'All Items' },
    { value: 'image', label: 'Images', icon: Image },
    { value: 'logo', label: 'Logos', icon: Image },
    { value: 'document', label: 'Documents', icon: FileText },
    { value: 'press_release', label: 'Press Releases', icon: FileText },
    { value: 'bio', label: 'Biographies', icon: User },
    { value: 'fact_sheet', label: 'Fact Sheets', icon: FileText },
    { value: 'video', label: 'Videos', icon: Video },
  ];

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
      case 'logo':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'bio':
        return <User className="h-4 w-4" />;
      case 'document':
      case 'press_release':
      case 'fact_sheet':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileImage className="h-4 w-4" />;
    }
  };

  const filteredItems = pressKit.items?.filter(item => 
    selectedItemType === 'all' || item.item_type === selectedItemType
  ) || [];

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deletePressKitItem(itemId);
    }
  };

  const handleToggleFeatured = async (itemId: string, currentFeatured: boolean) => {
    await updatePressKitItem(itemId, { is_featured: !currentFeatured });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Press Kit Items</h3>
          <p className="text-sm text-muted-foreground">
            Manage documents, images, and other materials in this press kit
          </p>
        </div>
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {itemTypes.map((type) => (
          <Button
            key={type.value}
            variant={selectedItemType === type.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedItemType(type.value)}
            className="gap-2"
          >
            {type.icon && <type.icon className="h-4 w-4" />}
            {type.label}
            {type.value !== 'all' && (
              <Badge variant="secondary" className="ml-1">
                {pressKit.items?.filter(item => item.item_type === type.value).length || 0}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No items found</h3>
            <p className="text-muted-foreground mb-4">
              {selectedItemType === 'all' 
                ? 'Add your first item to this press kit'
                : `No ${itemTypes.find(t => t.value === selectedItemType)?.label.toLowerCase()} found`
              }
            </p>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems
            .sort((a, b) => b.sort_order - a.sort_order)
            .map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 p-2 bg-muted rounded">
                        {getItemTypeIcon(item.item_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{item.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {item.item_type.replace('_', ' ')}
                          </Badge>
                          {item.is_featured && (
                            <Badge variant="secondary" className="text-xs">
                              Featured
                            </Badge>
                          )}
                        </div>
                        
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {item.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Added {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                          {item.file_path && (
                            <span>File attached</span>
                          )}
                          {item.file_url && (
                            <span>External link</span>
                          )}
                          {item.content && (
                            <span>Text content</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {(item.file_path || item.file_url) && (
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleToggleFeatured(item.id, item.is_featured)}
                      >
                        {item.is_featured ? '★' : '☆'}
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
};