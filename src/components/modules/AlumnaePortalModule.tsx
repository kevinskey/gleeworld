import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ModuleWrapper } from '@/components/modules/ModuleWrapper';
import { ModuleProps } from '@/types/unified-modules';
import { 
  Edit3, 
  Plus, 
  Eye, 
  Save, 
  Trash2, 
  Image as ImageIcon,
  Layout,
  Bell,
  Type,
  Settings,
  Users,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AlumnaeContent {
  id: string;
  content_type: string;
  title: string;
  content: string;
  image_url?: string;
  is_active: boolean;
  display_order: number;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

interface AlumnaeProfile {
  user_id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  graduation_year?: number;
  headshot_url?: string;
  verified: boolean;
  created_at: string;
  last_login?: string;
}

const CONTENT_TYPES = [
  { value: 'landing_page_hero', label: 'Landing Page Hero' },
  { value: 'portal_banner', label: 'Portal Banner' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'welcome_message', label: 'Welcome Message' },
  { value: 'featured_story', label: 'Featured Story' },
  { value: 'quick_links', label: 'Quick Links' },
  { value: 'footer_content', label: 'Footer Content' }
];

export function AlumnaePortalModule({ user, isFullPage, onNavigate }: ModuleProps) {
  const { user: authUser } = useAuth();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  
  const [contents, setContents] = useState<AlumnaeContent[]>([]);
  const [alumnaeUsers, setAlumnaeUsers] = useState<AlumnaeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<AlumnaeContent | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    content_type: '',
    title: '',
    content: '',
    image_url: '',
    is_active: true,
    display_order: 0
  });

  const hasContentManagementAccess = isAdmin || isSuperAdmin;

  useEffect(() => {
    if (!roleLoading) {
      fetchContent();
      fetchAlumnaeUsers();
    }
  }, [roleLoading]);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('alumnae_content')
        .select('*')
        .order('content_type', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error('Error fetching alumnae content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlumnaeUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, email, full_name, first_name, last_name, graduation_year, headshot_url, verified, created_at')
        .eq('role', 'alumna')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setAlumnaeUsers(data || []);
    } catch (error) {
      console.error('Error fetching alumnae users:', error);
      toast.error('Failed to load alumnae users');
    }
  };

  const handleSaveContent = async () => {
    if (!authUser || !hasContentManagementAccess) {
      toast.error('You do not have permission to manage content');
      return;
    }

    try {
      const contentData = {
        ...formData,
        created_by: selectedContent ? undefined : authUser.id,
        updated_by: selectedContent ? authUser.id : undefined
      };

      if (selectedContent) {
        // Update existing content
        const { error } = await supabase
          .from('alumnae_content')
          .update(contentData)
          .eq('id', selectedContent.id);

        if (error) throw error;
        toast.success('Content updated successfully');
      } else {
        // Create new content
        const { error } = await supabase
          .from('alumnae_content')
          .insert([{ ...contentData, created_by: authUser.id }]);

        if (error) throw error;
        toast.success('Content created successfully');
      }

      setIsEditDialogOpen(false);
      setSelectedContent(null);
      resetForm();
      fetchContent();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!authUser || !hasContentManagementAccess) {
      toast.error('You do not have permission to delete content');
      return;
    }

    if (!confirm('Are you sure you want to delete this content?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('alumnae_content')
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
    if (!authUser || !hasContentManagementAccess) {
      toast.error('You do not have permission to modify content');
      return;
    }

    try {
      const { error } = await supabase
        .from('alumnae_content')
        .update({ 
          is_active: !isActive,
          updated_by: authUser.id
        })
        .eq('id', contentId);

      if (error) throw error;
      toast.success(`Content ${!isActive ? 'activated' : 'deactivated'} successfully`);
      fetchContent();
    } catch (error) {
      console.error('Error toggling content status:', error);
      toast.error('Failed to update content status');
    }
  };

  const openEditDialog = (content?: AlumnaeContent) => {
    if (content) {
      setSelectedContent(content);
      setFormData({
        content_type: content.content_type,
        title: content.title,
        content: content.content,
        image_url: content.image_url || '',
        is_active: content.is_active,
        display_order: content.display_order
      });
    } else {
      setSelectedContent(null);
      resetForm();
    }
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      content_type: '',
      title: '',
      content: '',
      image_url: '',
      is_active: true,
      display_order: 0
    });
  };

  if (roleLoading || loading) {
    return (
      <ModuleWrapper title="Alumnae Portal Management" icon={Layout}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ModuleWrapper>
    );
  }

  if (!hasContentManagementAccess) {
    return (
      <ModuleWrapper title="Alumnae Portal Management" icon={Layout}>
        <Card>
          <CardContent className="text-center py-12">
            <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              This module is restricted to administrators only.
            </p>
            <Button onClick={() => onNavigate?.('alumnae-portal')}>
              View Alumnae Portal
            </Button>
          </CardContent>
        </Card>
      </ModuleWrapper>
    );
  }

  const groupedContents = contents.reduce((acc, content) => {
    if (!acc[content.content_type]) {
      acc[content.content_type] = [];
    }
    acc[content.content_type].push(content);
    return acc;
  }, {} as Record<string, AlumnaeContent[]>);

  return (
    <ModuleWrapper title="Alumnae Portal Content Management" icon={Layout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary">Content Management</h2>
            <p className="text-muted-foreground">
              Manage alumnae portal and landing page content
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.open('/alumnae', '_blank')} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview Portal
            </Button>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openEditDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Content
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedContent ? 'Edit Content' : 'Add New Content'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
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
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter content title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Enter content text"
                      rows={6}
                    />
                  </div>

                  <div>
                    <Label htmlFor="image_url">Image URL (optional)</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="display_order">Display Order</Label>
                      <Input
                        id="display_order"
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                        placeholder="0"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveContent}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Content
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Content Sections */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Content</TabsTrigger>
            <TabsTrigger value="landing_page_hero">Hero</TabsTrigger>
            <TabsTrigger value="announcement">Announcements</TabsTrigger>
            <TabsTrigger value="portal_banner">Banners</TabsTrigger>
            <TabsTrigger value="alumnae_users">Alumnae</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="space-y-6">
              {CONTENT_TYPES.map((type) => {
                const typeContents = groupedContents[type.value] || [];
                return (
                  <Card key={type.value}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Type className="h-5 w-5" />
                        {type.label}
                        <Badge variant="secondary">{typeContents.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {typeContents.length > 0 ? (
                        <div className="space-y-3">
                          {typeContents.map((content) => (
                            <div key={content.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">{content.title}</h4>
                                  <Badge variant={content.is_active ? "default" : "secondary"}>
                                    {content.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {content.content}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Updated {format(new Date(content.updated_at), 'MMM dd, yyyy')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={content.is_active}
                                  onCheckedChange={() => handleToggleActive(content.id, content.is_active)}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(content)}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteContent(content.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No content created for this type yet.</p>
                          <Button
                            variant="outline"
                            className="mt-2"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, content_type: type.value }));
                              openEditDialog();
                            }}
                          >
                            Add {type.label}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Individual type tabs */}
          {CONTENT_TYPES.slice(0, 3).map((type) => (
            <TabsContent key={type.value} value={type.value}>
              <Card>
                <CardHeader>
                  <CardTitle>{type.label} Content</CardTitle>
                </CardHeader>
                <CardContent>
                  {(groupedContents[type.value] || []).length > 0 ? (
                    <div className="space-y-4">
                      {(groupedContents[type.value] || []).map((content) => (
                        <div key={content.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{content.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={content.is_active ? "default" : "secondary"}>
                                  {content.is_active ? "Active" : "Inactive"}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  Order: {content.display_order}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(content)}
                              >
                                <Edit3 className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteContent(content.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {content.image_url && (
                            <div className="mb-3">
                              <img 
                                src={content.image_url} 
                                alt={content.title}
                                className="w-full max-w-md h-32 object-cover rounded"
                              />
                            </div>
                          )}
                          <p className="text-muted-foreground">{content.content}</p>
                          <p className="text-xs text-muted-foreground mt-3">
                            Last updated {format(new Date(content.updated_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No {type.label} Content</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first {type.label.toLowerCase()} content to get started.
                      </p>
                      <Button
                        onClick={() => {
                          setFormData(prev => ({ ...prev, content_type: type.value }));
                          openEditDialog();
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add {type.label}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          {/* Alumnae Users Tab */}
          <TabsContent value="alumnae_users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Alumnae Users
                  <Badge variant="secondary">{alumnaeUsers.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alumnaeUsers.length > 0 ? (
                  <div className="space-y-3">
                    {alumnaeUsers.map((alumna) => (
                      <div key={alumna.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          {alumna.headshot_url ? (
                            <img 
                              src={alumna.headshot_url} 
                              alt={alumna.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold">{alumna.full_name}</h4>
                            <p className="text-sm text-muted-foreground">{alumna.email}</p>
                            {alumna.graduation_year && (
                              <p className="text-xs text-muted-foreground">
                                Class of {alumna.graduation_year}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={alumna.verified ? "default" : "secondary"}>
                            {alumna.verified ? "Verified" : "Unverified"}
                          </Badge>
                          <div className="text-xs text-muted-foreground text-right">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Joined {format(new Date(alumna.created_at), 'MMM yyyy')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Alumnae Users</h3>
                    <p className="text-muted-foreground">
                      No users with the 'alumna' role found.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleWrapper>
  );
}