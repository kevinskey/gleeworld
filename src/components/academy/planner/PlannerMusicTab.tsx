import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Music, GripVertical, Loader2 } from 'lucide-react';
import { useLiturgicalMusicPlan, LiturgicalMusicPlan } from '@/hooks/useLiturgicalWeeks';

interface PlannerMusicTabProps {
  weekId: string;
  isAdmin?: boolean;
}

const MOMENTS = [
  'Prelude',
  'Entrance/Opening',
  'Kyrie',
  'Gloria',
  'Responsorial Psalm',
  'Gospel Acclamation',
  'Offertory',
  'Sanctus',
  'Memorial Acclamation',
  'Great Amen',
  'Agnus Dei',
  'Communion',
  'Song of Praise',
  'Recessional',
  'Postlude'
];

const STATUS_OPTIONS = ['planned', 'confirmed', 'rehearsed', 'performed'];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed': return 'bg-blue-500 text-white';
    case 'rehearsed': return 'bg-amber-500 text-white';
    case 'performed': return 'bg-green-500 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const PlannerMusicTab: React.FC<PlannerMusicTabProps> = ({ weekId, isAdmin = false }) => {
  const { musicPlan, loading, addMusicItem, updateMusicItem, deleteMusicItem } = useLiturgicalMusicPlan(weekId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LiturgicalMusicPlan | null>(null);
  const [formData, setFormData] = useState({
    moment: '',
    title: '',
    composer: '',
    voicing: '',
    key: '',
    tempo: '',
    status: 'planned',
    rehearsal_notes: '',
    performance_notes: '',
  });

  const resetForm = () => {
    setFormData({
      moment: '',
      title: '',
      composer: '',
      voicing: '',
      key: '',
      tempo: '',
      status: 'planned',
      rehearsal_notes: '',
      performance_notes: '',
    });
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: LiturgicalMusicPlan) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        moment: item.moment || '',
        title: item.title || '',
        composer: item.composer || '',
        voicing: item.voicing || '',
        key: item.key || '',
        tempo: item.tempo || '',
        status: item.status || 'planned',
        rehearsal_notes: item.rehearsal_notes || '',
        performance_notes: item.performance_notes || '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const nextOrder = musicPlan.length + 1;
    
    if (editingItem) {
      await updateMusicItem(editingItem.id, formData);
    } else {
      await addMusicItem({ ...formData, service_order: nextOrder });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this music item?')) {
      await deleteMusicItem(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading music plan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          Service Music Plan
        </h3>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Music
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Music Item' : 'Add Music Item'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Moment</Label>
                  <Select
                    value={formData.moment}
                    onValueChange={(value) => setFormData({ ...formData, moment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select moment" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOMENTS.map((moment) => (
                        <SelectItem key={moment} value={moment}>{moment}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Song title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Composer/Arranger</Label>
                  <Input
                    value={formData.composer}
                    onChange={(e) => setFormData({ ...formData, composer: e.target.value })}
                    placeholder="Composer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Voicing</Label>
                  <Input
                    value={formData.voicing}
                    onChange={(e) => setFormData({ ...formData, voicing: e.target.value })}
                    placeholder="e.g., SATB, SSA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Key</Label>
                  <Input
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    placeholder="e.g., G Major"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tempo</Label>
                  <Input
                    value={formData.tempo}
                    onChange={(e) => setFormData({ ...formData, tempo: e.target.value })}
                    placeholder="e.g., Andante, ♩=72"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Rehearsal Notes</Label>
                  <Textarea
                    value={formData.rehearsal_notes}
                    onChange={(e) => setFormData({ ...formData, rehearsal_notes: e.target.value })}
                    placeholder="Notes for rehearsal..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Performance Notes</Label>
                  <Textarea
                    value={formData.performance_notes}
                    onChange={(e) => setFormData({ ...formData, performance_notes: e.target.value })}
                    placeholder="Notes for performance..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {musicPlan.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Moment</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Composer</TableHead>
                <TableHead className="hidden lg:table-cell">Voicing</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-20">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {musicPlan.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">{item.moment || '-'}</TableCell>
                  <TableCell>{item.title || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{item.composer || '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{item.voicing || '-'}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(item.status)} variant="secondary">
                      {item.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(item)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Music className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No music planned yet</p>
            <p className="text-muted-foreground mb-4">Add music selections for this Sunday's liturgy.</p>
            {isAdmin && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Music Item
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
