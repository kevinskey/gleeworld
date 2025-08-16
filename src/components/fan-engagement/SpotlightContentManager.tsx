import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit3, Plus, Trash2, Star, Eye, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SpotlightContent {
  id: string;
  title: string;
  description: string;
  content: string;
  spotlight_type: string;
  external_link?: string;
  featured_person_id?: string;
  featured_event_id?: string;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const CONTENT_TYPES = [
  { value: 'member', label: 'Member Spotlight' },
  { value: 'event', label: 'Event Spotlight' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'performance', label: 'Performance' },
  { value: 'behind_scenes', label: 'Behind the Scenes' },
  { value: 'community', label: 'Community' }
];

export const SpotlightContentManager = () => {
  const { user } = useAuth();
  const [content, setContent] = useState<SpotlightContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<SpotlightContent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    spotlight_type: 'member',
    external_link: '',
    is_active: true,
    is_featured: false,
    display_order: 0
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_spotlight_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error fetching spotlight content:', error);
      toast.error('Failed to load spotlight content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in to create content');
      return;
    }

    try {
      const contentData = {
        ...formData,
        created_by: user.id,
        // Remove published_at logic since it doesn't exist in this table
      };

      if (selectedContent) {
        const { error } = await supabase
          .from('gw_spotlight_content')
          .update(contentData)
          .eq('id', selectedContent.id);

        if (error) throw error;
        toast.success('Content updated successfully');
      } else {
        const { error } = await supabase
          .from('gw_spotlight_content')
          .insert([contentData]);

        if (error) throw error;
        toast.success('Content created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchContent();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
    }
  };

  const handleDelete = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('gw_spotlight_content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;
      toast.success('Content deleted successfully');
      fetchContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  const handleToggleActive = async (contentId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_spotlight_content')
        .update({ is_active: !isActive })
        .eq('id', contentId);

      if (error) throw error;
      toast.success(`Content ${!isActive ? 'activated' : 'deactivated'}`);
      fetchContent();
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast.error('Failed to update content');
    }
  };

  const handleToggleFeatured = async (contentId: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_spotlight_content')
        .update({ is_featured: !isFeatured })
        .eq('id', contentId);

      if (error) throw error;
      toast.success(`Content ${!isFeatured ? 'featured' : 'unfeatured'}`);
      fetchContent();
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast.error('Failed to update content');
    }
  };

  const openDialog = (item?: SpotlightContent) => {
    if (item) {
      setSelectedContent(item);
      setFormData({
        title: item.title,
        description: item.description || '',
        content: item.content || '',
        spotlight_type: item.spotlight_type,
        external_link: item.external_link || '',
        is_active: item.is_active,
        is_featured: item.is_featured,
        display_order: item.display_order
      });
    } else {
      setSelectedContent(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content: '',
      spotlight_type: 'member',
      external_link: '',
      is_active: true,
      is_featured: false,
      display_order: 0
    });
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setFormData(prev => ({ ...prev, tags }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Spotlight Content ({content.length})</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              New Content
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedContent ? 'Edit Content' : 'Create New Content'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter content title"
                />
              </div>

              <div>
                <Label htmlFor="content_type">Content Type</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, content_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter content description"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="content_url">Content URL</Label>
                <Input
                  id="content_url"
                  value={formData.content_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, content_url: e.target.value }))}
                  placeholder="https://example.com/content"
                />
              </div>

              <div>
                <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                <Input
                  id="thumbnail_url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                  placeholder="https://example.com/thumbnail.jpg"
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags.join(', ')}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  placeholder="performance, behind-scenes, exclusive"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                  />
                  <Label htmlFor="is_published">Published</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                  />
                  <Label htmlFor="is_featured">Featured</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {selectedContent ? 'Update' : 'Create'} Content
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {content.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{item.title}</h4>
                    <Badge variant="secondary">{item.content_type}</Badge>
                    {item.is_featured && <Badge variant="default">Featured</Badge>}
                    {item.is_published ? 
                      <Badge variant="outline" className="text-green-600">Published</Badge> :
                      <Badge variant="outline" className="text-orange-600">Draft</Badge>
                    }
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {item.description}
                  </p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 mb-2">
                      {item.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Created {format(new Date(item.created_at), 'MMM dd, yyyy')}</span>
                    {item.published_at && (
                      <span>Published {format(new Date(item.published_at), 'MMM dd, yyyy')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTogglePublished(item.id, item.is_published)}
                  >
                    {item.is_published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleFeatured(item.id, item.is_featured)}
                  >
                    <Star className={`h-4 w-4 ${item.is_featured ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDialog(item)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {content.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Spotlight Content</h3>
              <p className="text-muted-foreground mb-4">
                Create exclusive content to engage and delight your fans
              </p>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Content
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};