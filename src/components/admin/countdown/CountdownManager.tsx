import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Calendar, Trash2, Check, Edit2, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useCountdowns,
  useCreateCountdown,
  useUpdateCountdown,
  useDeleteCountdown,
  useSetActiveCountdown,
  Countdown,
} from '@/hooks/useCountdowns';

export const CountdownManager = () => {
  const { data: countdowns, isLoading } = useCountdowns();
  const createCountdown = useCreateCountdown();
  const updateCountdown = useUpdateCountdown();
  const deleteCountdown = useDeleteCountdown();
  const setActiveCountdown = useSetActiveCountdown();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    event_name: '',
    target_date: '',
    display_in_header: true,
  });

  const resetForm = () => {
    setFormData({
      event_name: '',
      target_date: '',
      display_in_header: true,
    });
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!formData.event_name || !formData.target_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createCountdown.mutateAsync({
        event_name: formData.event_name,
        target_date: new Date(formData.target_date).toISOString(),
        is_active: false,
        display_in_header: formData.display_in_header,
      });
      toast.success('Countdown created successfully');
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create countdown');
    }
  };

  const handleUpdate = async (countdown: Countdown) => {
    try {
      await updateCountdown.mutateAsync({
        id: countdown.id,
        event_name: formData.event_name || countdown.event_name,
        target_date: formData.target_date 
          ? new Date(formData.target_date).toISOString() 
          : countdown.target_date,
        display_in_header: formData.display_in_header,
      });
      toast.success('Countdown updated successfully');
      setEditingId(null);
      resetForm();
    } catch (error) {
      toast.error('Failed to update countdown');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCountdown.mutateAsync(id);
      toast.success('Countdown deleted successfully');
    } catch (error) {
      toast.error('Failed to delete countdown');
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await setActiveCountdown.mutateAsync(id);
      toast.success('Countdown set as active');
    } catch (error) {
      toast.error('Failed to set active countdown');
    }
  };

  const startEditing = (countdown: Countdown) => {
    setEditingId(countdown.id);
    setFormData({
      event_name: countdown.event_name,
      target_date: format(new Date(countdown.target_date), "yyyy-MM-dd'T'HH:mm"),
      display_in_header: countdown.display_in_header,
    });
  };

  const getTimeUntil = (targetDate: string) => {
    const now = new Date();
    const target = new Date(targetDate);
    const diff = target.getTime() - now.getTime();
    
    if (diff < 0) return 'Past';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Countdown Manager
          </CardTitle>
          <CardDescription>
            Manage countdowns that appear in the header
          </CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Countdown
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Countdown</DialogTitle>
              <DialogDescription>
                Add a new countdown timer for an upcoming event
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="event_name">Event Name</Label>
                <Input
                  id="event_name"
                  placeholder="e.g., Christmas Carol"
                  value={formData.event_name}
                  onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_date">Target Date & Time</Label>
                <Input
                  id="target_date"
                  type="datetime-local"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="display_in_header">Display in Header</Label>
                <Switch
                  id="display_in_header"
                  checked={formData.display_in_header}
                  onCheckedChange={(checked) => setFormData({ ...formData, display_in_header: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createCountdown.isPending}>
                Create Countdown
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!countdowns || countdowns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No countdowns yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {countdowns.map((countdown) => (
              <div
                key={countdown.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  countdown.is_active ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                {editingId === countdown.id ? (
                  <div className="flex-1 space-y-3">
                    <Input
                      value={formData.event_name}
                      onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                      placeholder="Event name"
                    />
                    <Input
                      type="datetime-local"
                      value={formData.target_date}
                      onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.display_in_header}
                        onCheckedChange={(checked) => setFormData({ ...formData, display_in_header: checked })}
                      />
                      <Label className="text-sm">Display in header</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(countdown)}>
                        <Check className="h-4 w-4 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(null); resetForm(); }}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{countdown.event_name}</span>
                        {countdown.is_active && (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        )}
                        {!countdown.display_in_header && (
                          <Badge variant="outline" className="text-xs">Hidden</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(countdown.target_date), 'PPP p')} 
                        <span className="ml-2 text-xs">({getTimeUntil(countdown.target_date)})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!countdown.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetActive(countdown.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Set Active
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(countdown)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Countdown?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the "{countdown.event_name}" countdown.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(countdown.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
