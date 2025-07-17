import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Music, Trash2, Search } from 'lucide-react';
import { useSetlists } from '@/hooks/useSetlists';


interface SetlistDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  setlistId: string;
}

export const SetlistDetailsDialog: React.FC<SetlistDetailsDialogProps> = ({
  isOpen,
  onClose,
  setlistId,
}) => {
  const { setlists, removeItemFromSetlist, addItemToSetlist } = useSetlists();
  const sheetMusic: any[] = []; // Sheet music functionality removed
  const [selectedSheetMusic, setSelectedSheetMusic] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const currentSetlist = useMemo(() => 
    setlists.find(s => s.id === setlistId), 
    [setlists, setlistId]
  );

  const availableSheetMusic = useMemo(() => {
    return sheetMusic.filter(sheet => 
      searchQuery === '' || 
      sheet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.composer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.arranger?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sheetMusic, searchQuery]);

  const handleAddItem = async () => {
    if (!selectedSheetMusic || !currentSetlist) return;
    
    const nextPosition = Math.max(0, ...(currentSetlist.items?.map(item => item.order_position) || [0])) + 1;
    await addItemToSetlist(setlistId, selectedSheetMusic, nextPosition);
    setSelectedSheetMusic('');
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeItemFromSetlist(itemId);
  };

  if (!currentSetlist) return null;

  const sortedItems = currentSetlist.items?.sort((a, b) => a.order_position - b.order_position) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            {currentSetlist.name}
          </DialogTitle>
          {currentSetlist.description && (
            <p className="text-sm text-gray-600">{currentSetlist.description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
          {/* Setlist Items */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Setlist Items ({sortedItems.length})
              </h3>
            </div>

            <div className="flex-1 overflow-auto">
              {sortedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Music className="h-12 w-12 mb-4 opacity-50" />
                  <p>No sheet music added yet</p>
                  <p className="text-sm">Add some pieces to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedItems.map((item, index) => (
                    <Card key={item.id}>
                      <CardContent className="flex items-center gap-3 p-4">
                        <Badge variant="outline" className="min-w-[2rem] justify-center">
                          {item.order_position}
                        </Badge>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">
                            {item.sheet_music?.title}
                          </h4>
                          {(item.sheet_music?.composer || item.sheet_music?.arranger) && (
                            <p className="text-sm text-gray-600 truncate">
                              {item.sheet_music?.composer && `by ${item.sheet_music.composer}`}
                              {item.sheet_music?.arranger && ` • arr. ${item.sheet_music.arranger}`}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-sm text-gray-500 truncate mt-1">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add Sheet Music */}
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Add Sheet Music</h3>
            
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search sheet music..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedSheetMusic} onValueChange={setSelectedSheetMusic}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sheet music to add..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSheetMusic.length === 0 ? (
                    <SelectItem value="none" disabled>
                      {searchQuery ? 'No matching sheet music found' : 'No sheet music available'}
                    </SelectItem>
                  ) : (
                    availableSheetMusic.map((sheet) => (
                      <SelectItem key={sheet.id} value={sheet.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{sheet.title}</span>
                          {(sheet.composer || sheet.arranger) && (
                            <span className="text-sm text-gray-600">
                              {sheet.composer && `by ${sheet.composer}`}
                              {sheet.arranger && ` • arr. ${sheet.arranger}`}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Button
                onClick={handleAddItem}
                disabled={!selectedSheetMusic}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Setlist
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};