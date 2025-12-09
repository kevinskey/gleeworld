import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Camera, Mic, Video, Users, Sparkles, Image, FileAudio, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface GleeCamCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  icon_bg: string;
  icon_color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface MediaItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  category: string;
  glee_cam_category_id: string | null;
  is_featured: boolean;
  created_at: string;
}

const ICON_OPTIONS = [
  { value: 'Camera', label: 'Camera', Icon: Camera },
  { value: 'Video', label: 'Video', Icon: Video },
  { value: 'Mic', label: 'Microphone', Icon: Mic },
  { value: 'Users', label: 'Users', Icon: Users },
  { value: 'Sparkles', label: 'Sparkles', Icon: Sparkles },
  { value: 'Image', label: 'Image', Icon: Image },
  { value: 'FileAudio', label: 'Audio File', Icon: FileAudio },
];

const COLOR_OPTIONS = [
  { bg: 'bg-blue-900/50', color: 'text-blue-400', label: 'Blue' },
  { bg: 'bg-rose-900/50', color: 'text-rose-400', label: 'Rose' },
  { bg: 'bg-purple-900/50', color: 'text-purple-400', label: 'Purple' },
  { bg: 'bg-emerald-900/50', color: 'text-emerald-400', label: 'Emerald' },
  { bg: 'bg-amber-900/50', color: 'text-amber-400', label: 'Amber' },
  { bg: 'bg-cyan-900/50', color: 'text-cyan-400', label: 'Cyan' },
  { bg: 'bg-pink-900/50', color: 'text-pink-400', label: 'Pink' },
];

export const GleeCamManagerModule = () => {
  const [categories, setCategories] = useState<GleeCamCategory[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<GleeCamCategory | null>(null);
  
  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'Camera',
    icon_bg: 'bg-blue-900/50',
    icon_color: 'text-blue-400',
    is_active: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchMediaForCategory(selectedCategory);
    } else {
      setMediaItems([]);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('glee_cam_categories')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchMediaForCategory = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('*')
        .eq('glee_cam_category_id', categoryId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMediaItems(data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
      toast.error('Failed to load media');
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  const handleCategorySubmit = async () => {
    try {
      const slug = categoryForm.slug || generateSlug(categoryForm.name);
      
      if (editingCategory) {
        const { error } = await supabase
          .from('glee_cam_categories')
          .update({
            name: categoryForm.name,
            slug,
            description: categoryForm.description || null,
            icon: categoryForm.icon,
            icon_bg: categoryForm.icon_bg,
            icon_color: categoryForm.icon_color,
            is_active: categoryForm.is_active,
          })
          .eq('id', editingCategory.id);
        
        if (error) throw error;
        toast.success('Category updated');
      } else {
        const { error } = await supabase
          .from('glee_cam_categories')
          .insert({
            name: categoryForm.name,
            slug,
            description: categoryForm.description || null,
            icon: categoryForm.icon,
            icon_bg: categoryForm.icon_bg,
            icon_color: categoryForm.icon_color,
            is_active: categoryForm.is_active,
            display_order: categories.length,
          });
        
        if (error) throw error;
        toast.success('Category created');
      }
      
      setCategoryDialogOpen(false);
      resetCategoryForm();
      fetchCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(error.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Delete this category? Media will be unlinked but not deleted.')) return;
    
    try {
      // First unlink media from this category
      await supabase
        .from('gw_media_library')
        .update({ glee_cam_category_id: null })
        .eq('glee_cam_category_id', categoryId);
      
      const { error } = await supabase
        .from('glee_cam_categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
      toast.success('Category deleted');
      fetchCategories();
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
      }
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.message || 'Failed to delete category');
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('Delete this media item?')) return;
    
    try {
      const { error } = await supabase
        .from('gw_media_library')
        .delete()
        .eq('id', mediaId);
      
      if (error) throw error;
      toast.success('Media deleted');
      if (selectedCategory) {
        fetchMediaForCategory(selectedCategory);
      }
    } catch (error: any) {
      console.error('Error deleting media:', error);
      toast.error(error.message || 'Failed to delete media');
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      slug: '',
      description: '',
      icon: 'Camera',
      icon_bg: 'bg-blue-900/50',
      icon_color: 'text-blue-400',
      is_active: true,
    });
    setEditingCategory(null);
  };

  const openEditCategory = (category: GleeCamCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon,
      icon_bg: category.icon_bg,
      icon_color: category.icon_color,
      is_active: category.is_active,
    });
    setCategoryDialogOpen(true);
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
    return iconOption?.Icon || Camera;
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Glee Cam Categories</h3>
            <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
              setCategoryDialogOpen(open);
              if (!open) resetCategoryForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      placeholder="Category name"
                    />
                  </div>
                  <div>
                    <Label>Slug (URL-friendly)</Label>
                    <Input
                      value={categoryForm.slug}
                      onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                      placeholder={generateSlug(categoryForm.name) || 'auto-generated'}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      placeholder="Brief description"
                    />
                  </div>
                  <div>
                    <Label>Icon</Label>
                    <Select
                      value={categoryForm.icon}
                      onValueChange={(value) => setCategoryForm({ ...categoryForm, icon: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <opt.Icon className="h-4 w-4" />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Color Theme</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {COLOR_OPTIONS.map((opt) => (
                        <button
                          key={opt.bg}
                          onClick={() => setCategoryForm({ ...categoryForm, icon_bg: opt.bg, icon_color: opt.color })}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            opt.bg,
                            categoryForm.icon_bg === opt.bg && "ring-2 ring-primary ring-offset-2"
                          )}
                        >
                          <Camera className={cn("h-4 w-4", opt.color)} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={categoryForm.is_active}
                      onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, is_active: checked })}
                    />
                    <Label>Active</Label>
                  </div>
                  <Button onClick={handleCategorySubmit} className="w-full">
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((category) => {
              const IconComponent = getIconComponent(category.icon);
              return (
                <Card key={category.id} className={cn(!category.is_active && "opacity-50")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", category.icon_bg)}>
                          <IconComponent className={cn("h-5 w-5", category.icon_color)} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{category.name}</h4>
                          <p className="text-xs text-muted-foreground">{category.slug}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditCategory(category)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteCategory(category.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {category.description && (
                      <p className="text-xs text-muted-foreground mt-2">{category.description}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Media by Category</h3>
              <p className="text-sm text-muted-foreground">Select a category to view and manage media</p>
            </div>
            <Select value={selectedCategory || ''} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedCategory ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a category to view media</p>
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No media in this category</p>
              <p className="text-xs mt-1">Media uploaded via Quick Capture will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {mediaItems.map((media) => (
                <Card key={media.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted relative">
                    {media.file_type.startsWith('image/') ? (
                      <img src={media.file_url} alt={media.title} className="w-full h-full object-cover" />
                    ) : media.file_type.startsWith('video/') ? (
                      <video src={media.file_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileAudio className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => handleDeleteMedia(media.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <CardContent className="p-2">
                    <p className="text-xs font-medium truncate">{media.title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
