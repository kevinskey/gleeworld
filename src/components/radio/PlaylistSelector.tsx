import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Music, Tag, Users, Lock } from 'lucide-react';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  is_public: boolean;
  created_by: string;
  created_at: string;
  track_count?: number;
}

interface PlaylistSelectorProps {
  selectedPlaylist: Playlist | null;
  onPlaylistSelect: (playlist: Playlist) => void;
  playlists: Playlist[];
  onPlaylistsUpdate: () => void;
}

export const PlaylistSelector = ({
  selectedPlaylist,
  onPlaylistSelect,
  playlists,
  onPlaylistsUpdate
}: PlaylistSelectorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Create playlist form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);

  const handleCreatePlaylist = async () => {
    if (!user || !name.trim()) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('radio_playlists')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          tags,
          is_public: isPublic,
          created_by: user.id
        })
        .select('*')
        .single();

      if (error) throw error;

      onPlaylistsUpdate();
      onPlaylistSelect(data);
      
      // Reset form
      setName('');
      setDescription('');
      setTags([]);
      setTagInput('');
      setIsPublic(false);
      setShowCreateDialog(false);

      toast({
        title: "Playlist Created",
        description: `"${data.name}" has been created successfully`,
      });
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast({
        title: "Error",
        description: "Failed to create playlist",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim().toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Playlists
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Playlist
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Playlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Playlist Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter playlist name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your playlist"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Add tags (press Enter)"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleAddTag}
                    >
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className="cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="public"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                  <Label htmlFor="public" className="flex items-center gap-2">
                    {isPublic ? <Users className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {isPublic ? 'Public Playlist' : 'Private Playlist'}
                  </Label>
                </div>

                <Button 
                  onClick={handleCreatePlaylist} 
                  disabled={!name.trim() || isCreating}
                  className="w-full"
                >
                  {isCreating ? 'Creating...' : 'Create Playlist'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48">
          {playlists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No playlists yet</p>
              <p className="text-sm">Create your first playlist to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {playlists.map((playlist) => (
                <Card 
                  key={playlist.id}
                  className={`cursor-pointer transition-colors ${
                    selectedPlaylist?.id === playlist.id 
                      ? 'ring-2 ring-primary' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onPlaylistSelect(playlist)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{playlist.name}</h4>
                        {playlist.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {playlist.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {playlist.is_public ? (
                            <Users className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {playlist.track_count || 0} tracks
                          </span>
                        </div>
                        {playlist.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {playlist.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {playlist.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{playlist.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};