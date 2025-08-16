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
import { Edit3, Plus, Trash2, MessageSquare, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BulletinPost {
  id: string;
  title: string;
  content: string;
  category: string;
  is_public: boolean;
  is_featured: boolean;
  is_alumnae_only: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'events', label: 'Events' },
  { value: 'news', label: 'News' },
  { value: 'announcements', label: 'Announcements' },
  { value: 'exclusive', label: 'Fan Exclusive' }
];

export const BulletinPostManager = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BulletinPost | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    is_public: true,
    is_featured: false,
    is_alumnae_only: false
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('bulletin_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in to create posts');
      return;
    }

    try {
      const postData = {
        ...formData,
        user_id: user.id
      };

      if (selectedPost) {
        const { error } = await supabase
          .from('bulletin_posts')
          .update(postData)
          .eq('id', selectedPost.id);

        if (error) throw error;
        toast.success('Post updated successfully');
      } else {
        const { error } = await supabase
          .from('bulletin_posts')
          .insert([postData]);

        if (error) throw error;
        toast.success('Post created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPosts();
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save post');
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bulletin_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      toast.success('Post deleted successfully');
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleToggleFeatured = async (postId: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('bulletin_posts')
        .update({ is_featured: !isFeatured })
        .eq('id', postId);

      if (error) throw error;
      toast.success(`Post ${!isFeatured ? 'featured' : 'unfeatured'}`);
      fetchPosts();
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast.error('Failed to update post');
    }
  };

  const openDialog = (post?: BulletinPost) => {
    if (post) {
      setSelectedPost(post);
      setFormData({
        title: post.title,
        content: post.content,
        category: post.category,
        is_public: post.is_public,
        is_featured: post.is_featured,
        is_alumnae_only: post.is_alumnae_only
      });
    } else {
      setSelectedPost(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      is_public: true,
      is_featured: false,
      is_alumnae_only: false
    });
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
        <h3 className="text-lg font-semibold">Bulletin Posts ({posts.length})</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedPost ? 'Edit Post' : 'Create New Post'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter post title"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter post content"
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                  />
                  <Label htmlFor="is_public">Public</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                  />
                  <Label htmlFor="is_featured">Featured</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_alumnae_only"
                    checked={formData.is_alumnae_only}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_alumnae_only: checked }))}
                  />
                  <Label htmlFor="is_alumnae_only">Alumnae Only</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {selectedPost ? 'Update' : 'Create'} Post
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{post.title}</h4>
                    <Badge variant="secondary">{post.category}</Badge>
                    {post.is_featured && <Badge variant="default">Featured</Badge>}
                    {post.is_alumnae_only && <Badge variant="outline">Alumnae Only</Badge>}
                    {!post.is_public && <Badge variant="destructive">Private</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {post.content}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {format(new Date(post.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleFeatured(post.id, post.is_featured)}
                  >
                    {post.is_featured ? 'Unfeature' : 'Feature'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDialog(post)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(post.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {posts.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Posts Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first bulletin post to engage with fans
              </p>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Post
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};