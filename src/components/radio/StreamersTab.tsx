import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Mic, RefreshCw, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { azuraCastService } from '@/services/azuracast';

interface Streamer {
  id: number;
  streamer_username: string;
  streamer_password?: string;
  display_name: string;
  comments: string | null;
  is_active: boolean;
  enforce_schedule: boolean;
  reactivate_at: number | null;
}

export const StreamersTab = () => {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStreamer, setEditingStreamer] = useState<Streamer | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  const [form, setForm] = useState({
    streamer_username: '',
    streamer_password: '',
    display_name: '',
    comments: '',
    is_active: true,
    enforce_schedule: false,
  });

  useEffect(() => {
    fetchStreamers();
  }, []);

  const fetchStreamers = async () => {
    setIsLoading(true);
    try {
      const data = await azuraCastService.getStreamers();
      console.log('Streamers fetched:', data);
      setStreamers(data || []);
    } catch (error) {
      console.error('Error fetching streamers:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to fetch streamers. Make sure AzuraCast API key is configured.',
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      streamer_username: '',
      streamer_password: '',
      display_name: '',
      comments: '',
      is_active: true,
      enforce_schedule: false,
    });
    setShowPassword(false);
  };

  const handleEdit = (streamer: Streamer) => {
    setEditingStreamer(streamer);
    setForm({
      streamer_username: streamer.streamer_username,
      streamer_password: '', // Don't prefill password for security
      display_name: streamer.display_name || '',
      comments: streamer.comments || '',
      is_active: streamer.is_active,
      enforce_schedule: streamer.enforce_schedule,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    console.log('StreamersTab: handleSave CALLED', form);
    
    if (!form.streamer_username) {
      console.log('StreamersTab: Validation failed - no username');
      toast({ title: 'Error', description: 'Username is required.', variant: 'destructive' });
      return;
    }
    
    if (!editingStreamer && !form.streamer_password) {
      console.log('StreamersTab: Validation failed - no password');
      toast({ title: 'Error', description: 'Password is required for new streamers.', variant: 'destructive' });
      return;
    }

    console.log('StreamersTab: Validation passed, saving...', { editing: !!editingStreamer, form });

    try {
      
      if (editingStreamer) {
        const updateData: any = {
          streamer_username: form.streamer_username,
          display_name: form.display_name || form.streamer_username,
          comments: form.comments || null,
          is_active: form.is_active,
          enforce_schedule: form.enforce_schedule,
        };
        // Only include password if it was changed
        if (form.streamer_password) {
          updateData.streamer_password = form.streamer_password;
        }
        console.log('StreamersTab: Updating streamer:', editingStreamer.id, updateData);
        const result = await azuraCastService.updateStreamer(editingStreamer.id, updateData);
        console.log('StreamersTab: Update result:', result);
        toast({ title: 'Streamer Updated', description: `${form.display_name || form.streamer_username} has been updated.` });
      } else {
        const createData = {
          streamer_username: form.streamer_username,
          streamer_password: form.streamer_password,
          display_name: form.display_name || form.streamer_username,
          comments: form.comments || undefined,
          is_active: form.is_active,
          enforce_schedule: form.enforce_schedule,
        };
        console.log('StreamersTab: Creating streamer:', createData);
        const result = await azuraCastService.createStreamer(createData);
        console.log('StreamersTab: Create result:', result);
        toast({ title: 'Streamer Created', description: `${form.display_name || form.streamer_username} can now broadcast live!` });
      }

      setIsDialogOpen(false);
      setEditingStreamer(null);
      resetForm();
      fetchStreamers();
    } catch (error: any) {
      console.error('StreamersTab: Error saving streamer:', error);
      const errorMessage = error?.message || 'Failed to save streamer. Check console for details.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleDelete = async (streamer: Streamer) => {
    if (!confirm(`Delete streamer "${streamer.display_name || streamer.streamer_username}"? They will no longer be able to broadcast.`)) {
      return;
    }

    try {
      await azuraCastService.deleteStreamer(streamer.id);
      toast({ title: 'Streamer Deleted' });
      fetchStreamers();
    } catch (error) {
      console.error('Error deleting streamer:', error);
      toast({ title: 'Error', description: 'Failed to delete streamer.', variant: 'destructive' });
    }
  };

  const copyCredentials = (streamer: Streamer) => {
    const text = `DJ Username: ${streamer.streamer_username}\nServer: radio.gleeworld.org\nPort: 8000\nMount: /live`;
    navigator.clipboard.writeText(text);
    setCopiedId(streamer.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Copied!', description: 'Connection details copied to clipboard.' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{streamers.length} DJ accounts</span>
          <p className="text-xs text-muted-foreground">
            DJs can connect using broadcasting software (e.g., BUTT, Mixxx, OBS)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs"
            onClick={fetchStreamers}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingStreamer(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add DJ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingStreamer ? 'Edit DJ Account' : 'Create DJ Account'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Username *</Label>
                  <Input
                    value={form.streamer_username}
                    onChange={(e) => setForm({ ...form, streamer_username: e.target.value })}
                    placeholder="dj_username"
                    className="h-8 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Used to log in to the stream</p>
                </div>
                <div>
                  <Label className="text-xs">Password {editingStreamer ? '(leave blank to keep current)' : '*'}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={form.streamer_password}
                      onChange={(e) => setForm({ ...form, streamer_password: e.target.value })}
                      placeholder={editingStreamer ? '••••••••' : 'Create a password'}
                      className="h-8 text-sm pr-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Display Name</Label>
                  <Input
                    value={form.display_name}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    placeholder="DJ Display Name"
                    className="h-8 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Shown to listeners when live</p>
                </div>
                <div>
                  <Label className="text-xs">Notes (internal)</Label>
                  <Textarea
                    value={form.comments}
                    onChange={(e) => setForm({ ...form, comments: e.target.value })}
                    placeholder="e.g., Soprano section leader, Spring 2025"
                    className="text-sm min-h-[60px]"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                    />
                    <Label className="text-xs">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.enforce_schedule}
                      onCheckedChange={(v) => setForm({ ...form, enforce_schedule: v })}
                    />
                    <Label className="text-xs">Enforce Schedule</Label>
                  </div>
                </div>
                <Button type="button" onClick={() => { console.log('Button clicked!'); handleSave(); }} className="w-full h-8 text-sm">
                  <Mic className="h-3 w-3 mr-1" /> {editingStreamer ? 'Update DJ' : 'Create DJ Account'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Connection Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-3">
          <p className="text-xs font-medium mb-2">🎙️ Connection Settings for DJs</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Server:</span> radio.gleeworld.org</div>
            <div><span className="text-muted-foreground">Port:</span> 8000</div>
            <div><span className="text-muted-foreground">Mount:</span> /live</div>
            <div><span className="text-muted-foreground">Type:</span> Icecast</div>
          </div>
        </CardContent>
      </Card>

      {/* Streamers List */}
      <div className="space-y-2">
        {streamers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No DJ accounts yet</p>
            <p className="text-xs">Create accounts for Glee Club members to broadcast live</p>
          </div>
        ) : (
          streamers.map((streamer) => (
            <div
              key={streamer.id}
              className={cn(
                "flex items-center justify-between p-3 rounded border",
                streamer.is_active ? "bg-card" : "bg-muted/50 opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  streamer.is_active ? "bg-primary/10" : "bg-muted"
                )}>
                  <Mic className={cn(
                    "h-4 w-4",
                    streamer.is_active ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {streamer.display_name || streamer.streamer_username}
                    </span>
                    {streamer.is_active ? (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    @{streamer.streamer_username}
                    {streamer.comments && ` · ${streamer.comments}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => copyCredentials(streamer)}
                  title="Copy connection details"
                >
                  {copiedId === streamer.id ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => handleEdit(streamer)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(streamer)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
