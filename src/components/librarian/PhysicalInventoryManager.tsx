import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Edit, Package, MapPin, Calendar, AlertTriangle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PhysicalScore {
  id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  physical_copies_count: number;
  physical_location: string | null;
  condition_notes: string | null;
  last_inventory_date: string | null;
  publisher: string | null;
  purchase_price: number | null;
  donor_name: string | null;
}

export const PhysicalInventoryManager = () => {
  const { toast } = useToast();
  const [scores, setScores] = useState<PhysicalScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingScore, setEditingScore] = useState<PhysicalScore | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editForm, setEditForm] = useState({
    physical_copies_count: 0,
    physical_location: '',
    condition_notes: '',
  });
  const [newScoreForm, setNewScoreForm] = useState({
    title: '',
    composer: '',
    voicing: '',
    publisher: '',
    physical_copies_count: 1,
    physical_location: '',
    condition_notes: '',
    purchase_price: '',
    donor_name: '',
  });

  useEffect(() => {
    fetchPhysicalScores();
  }, []);

  const fetchPhysicalScores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select(`
          id, title, composer, voicing, physical_copies_count,
          physical_location, condition_notes, last_inventory_date,
          publisher, purchase_price, donor_name
        `)
        .gt('physical_copies_count', 0)
        .order('title');

      if (error) throw error;
      setScores(data || []);
    } catch (error) {
      console.error('Error fetching physical scores:', error);
      toast({
        title: "Error",
        description: "Failed to fetch physical scores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredScores = scores.filter(score =>
    score.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    score.composer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    score.physical_location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditClick = (score: PhysicalScore) => {
    setEditingScore(score);
    setEditForm({
      physical_copies_count: score.physical_copies_count,
      physical_location: score.physical_location || '',
      condition_notes: score.condition_notes || '',
    });
  };

  const handleUpdateInventory = async () => {
    if (!editingScore) return;

    try {
      const { error } = await supabase
        .from('gw_sheet_music')
        .update({
          physical_copies_count: editForm.physical_copies_count,
          physical_location: editForm.physical_location || null,
          condition_notes: editForm.condition_notes || null,
          last_inventory_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', editingScore.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Inventory updated successfully",
      });

      setEditingScore(null);
      fetchPhysicalScores();
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast({
        title: "Error",
        description: "Failed to update inventory",
        variant: "destructive",
      });
    }
  };

  const handleAddNewScore = async () => {
    if (!newScoreForm.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('gw_sheet_music')
        .insert({
          title: newScoreForm.title.trim(),
          composer: newScoreForm.composer.trim() || null,
          voicing: newScoreForm.voicing.trim() || null,
          publisher: newScoreForm.publisher.trim() || null,
          physical_copies_count: newScoreForm.physical_copies_count,
          physical_location: newScoreForm.physical_location.trim() || null,
          condition_notes: newScoreForm.condition_notes.trim() || null,
          purchase_price: newScoreForm.purchase_price ? parseFloat(newScoreForm.purchase_price) : null,
          donor_name: newScoreForm.donor_name.trim() || null,
          last_inventory_date: new Date().toISOString().split('T')[0],
          is_public: false,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Physical score added successfully",
      });

      setShowAddForm(false);
      setNewScoreForm({
        title: '',
        composer: '',
        voicing: '',
        publisher: '',
        physical_copies_count: 1,
        physical_location: '',
        condition_notes: '',
        purchase_price: '',
        donor_name: '',
      });
      fetchPhysicalScores();
    } catch (error) {
      console.error('Error adding new score:', error);
      toast({
        title: "Error",
        description: "Failed to add new score",
        variant: "destructive",
      });
    }
  };

  const getInventoryStatus = (lastInventoryDate: string | null) => {
    if (!lastInventoryDate) {
      return { label: 'Never', variant: 'destructive' as const };
    }
    
    const daysSince = Math.floor(
      (Date.now() - new Date(lastInventoryDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSince > 365) {
      return { label: `${Math.floor(daysSince / 365)}y ago`, variant: 'destructive' as const };
    } else if (daysSince > 90) {
      return { label: `${Math.floor(daysSince / 30)}mo ago`, variant: 'secondary' as const };
    } else if (daysSince > 30) {
      return { label: `${daysSince}d ago`, variant: 'outline' as const };
    } else {
      return { label: 'Recent', variant: 'default' as const };
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Physical Score Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, composer, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Physical Score
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Physical Score</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Title *</Label>
                      <Input
                        value={newScoreForm.title}
                        onChange={(e) => setNewScoreForm(prev => ({
                          ...prev,
                          title: e.target.value
                        }))}
                        placeholder="Song or piece title"
                      />
                    </div>
                    <div>
                      <Label>Composer</Label>
                      <Input
                        value={newScoreForm.composer}
                        onChange={(e) => setNewScoreForm(prev => ({
                          ...prev,
                          composer: e.target.value
                        }))}
                        placeholder="Composer name"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Voicing</Label>
                      <Select 
                        value={newScoreForm.voicing} 
                        onValueChange={(value) => setNewScoreForm(prev => ({
                          ...prev,
                          voicing: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select voicing" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SATB">SATB</SelectItem>
                          <SelectItem value="SSA">SSA</SelectItem>
                          <SelectItem value="SSAA">SSAA</SelectItem>
                          <SelectItem value="SA">SA</SelectItem>
                          <SelectItem value="Unison">Unison</SelectItem>
                          <SelectItem value="Solo">Solo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Publisher</Label>
                      <Input
                        value={newScoreForm.publisher}
                        onChange={(e) => setNewScoreForm(prev => ({
                          ...prev,
                          publisher: e.target.value
                        }))}
                        placeholder="Publishing company"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Number of Copies</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newScoreForm.physical_copies_count}
                        onChange={(e) => setNewScoreForm(prev => ({
                          ...prev,
                          physical_copies_count: parseInt(e.target.value) || 1
                        }))}
                      />
                    </div>
                    <div>
                      <Label>Purchase Price ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newScoreForm.purchase_price}
                        onChange={(e) => setNewScoreForm(prev => ({
                          ...prev,
                          purchase_price: e.target.value
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Donor Name</Label>
                      <Input
                        value={newScoreForm.donor_name}
                        onChange={(e) => setNewScoreForm(prev => ({
                          ...prev,
                          donor_name: e.target.value
                        }))}
                        placeholder="If donated"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Physical Location</Label>
                    <Input
                      value={newScoreForm.physical_location}
                      onChange={(e) => setNewScoreForm(prev => ({
                        ...prev,
                        physical_location: e.target.value
                      }))}
                      placeholder="e.g., Shelf A-3, Box 12, Music Room Cabinet"
                    />
                  </div>

                  <div>
                    <Label>Condition Notes</Label>
                    <Textarea
                      value={newScoreForm.condition_notes}
                      onChange={(e) => setNewScoreForm(prev => ({
                        ...prev,
                        condition_notes: e.target.value
                      }))}
                      placeholder="Describe the condition of the physical copies"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleAddNewScore} className="flex-1">
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Inventory
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">Loading inventory...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Composer</TableHead>
                  <TableHead>Voicing</TableHead>
                  <TableHead className="text-center">Copies</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Last Check</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScores.map((score) => {
                  const inventoryStatus = getInventoryStatus(score.last_inventory_date);
                  return (
                    <TableRow key={score.id}>
                      <TableCell className="font-medium">{score.title}</TableCell>
                      <TableCell>{score.composer || '-'}</TableCell>
                      <TableCell>{score.voicing || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{score.physical_copies_count}</Badge>
                      </TableCell>
                      <TableCell>
                        {score.physical_location ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {score.physical_location}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <AlertTriangle className="h-3 w-3" />
                            No location
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{score.condition_notes || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={inventoryStatus.variant}>
                          {inventoryStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditClick(score)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Update Inventory: {score.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Number of Physical Copies</Label>
                                <Input
                                  type="number"
                                  value={editForm.physical_copies_count}
                                  onChange={(e) => setEditForm(prev => ({
                                    ...prev,
                                    physical_copies_count: parseInt(e.target.value) || 0
                                  }))}
                                />
                              </div>
                              <div>
                                <Label>Physical Location</Label>
                                <Input
                                  value={editForm.physical_location}
                                  onChange={(e) => setEditForm(prev => ({
                                    ...prev,
                                    physical_location: e.target.value
                                  }))}
                                  placeholder="e.g., Shelf A-3, Box 12"
                                />
                              </div>
                              <div>
                                <Label>Condition Notes</Label>
                                <Textarea
                                  value={editForm.condition_notes}
                                  onChange={(e) => setEditForm(prev => ({
                                    ...prev,
                                    condition_notes: e.target.value
                                  }))}
                                  placeholder="e.g., Good condition, minor wear on corners"
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={handleUpdateInventory} className="flex-1">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Update Inventory
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {filteredScores.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Physical Scores Found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search terms.' : 'Add physical copies to your digital scores to start tracking inventory.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};