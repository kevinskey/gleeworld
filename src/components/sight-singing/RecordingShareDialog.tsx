import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Search, Share2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['gw_profiles']['Row'];
type Recording = Database['public']['Tables']['gw_recordings']['Row'];

interface RecordingShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recording: Recording;
  onShare: (userIds: string[]) => Promise<void>;
}

export const RecordingShareDialog: React.FC<RecordingShareDialogProps> = ({
  open,
  onOpenChange,
  recording,
  onShare,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [currentShares, setCurrentShares] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('*')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  const fetchCurrentShares = async () => {
    try {
      const { data: sharesData, error: sharesError } = await supabase
        .from('gw_recording_shares')
        .select('shared_with')
        .eq('recording_id', recording.id);

      if (sharesError) throw sharesError;
      if (!sharesData?.length) return;

      const userIds = sharesData.map(share => share.shared_with);
      
      const { data: usersData, error: usersError } = await supabase
        .from('gw_profiles')
        .select('*')
        .in('user_id', userIds);

      if (usersError) throw usersError;
      
      setCurrentShares(usersData || []);
    } catch (err) {
      console.error('Error fetching current shares:', err);
    }
  };

  const handleAddUser = (user: Profile) => {
    if (!selectedUsers.find(u => u.user_id === user.user_id)) {
      setSelectedUsers(prev => [...prev, user]);
    }
    setSearchTerm('');
    setUsers([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.user_id !== userId));
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setLoading(true);
      const userIds = selectedUsers.map(u => u.user_id);
      await onShare(userIds);
      
      toast({
        title: "Recording shared successfully",
        description: `Shared with ${selectedUsers.length} user(s)`,
      });
      
      setSelectedUsers([]);
      fetchCurrentShares();
    } catch (err) {
      toast({
        title: "Failed to share recording",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const baseUrl = window.location.hostname.includes('lovable') 
      ? 'https://gleeworld.org' 
      : window.location.origin;
    const link = `${baseUrl}/sight-reading-generator?recording=${recording.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied",
      description: "Recording link copied to clipboard",
    });
  };

  const removeShare = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('gw_recording_shares')
        .delete()
        .eq('recording_id', recording.id)
        .eq('shared_with', userId);

      if (error) throw error;
      
      fetchCurrentShares();
      toast({
        title: "Share removed",
        description: "Access revoked successfully",
      });
    } catch (err) {
      toast({
        title: "Failed to remove share",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open) {
      fetchCurrentShares();
    }
  }, [open, recording.id]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      searchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Recording
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Copy Link */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopyLink} className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>

          {/* User Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            
            {users.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                {users.map((user) => (
                  <button
                    key={user.user_id}
                    onClick={() => handleAddUser(user)}
                    className="w-full text-left px-3 py-2 hover:bg-muted"
                  >
                    <div className="font-medium">{user.full_name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected users:</p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Badge key={user.user_id} variant="secondary" className="flex items-center gap-1">
                    {user.full_name}
                    <button onClick={() => handleRemoveUser(user.user_id)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Current Shares */}
          {currentShares.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Currently shared with:</p>
              <div className="space-y-1">
                {currentShares.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{user.full_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeShare(user.user_id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleShare}
              disabled={selectedUsers.length === 0 || loading}
              className="flex-1"
            >
              {loading ? "Sharing..." : `Share with ${selectedUsers.length} user(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};