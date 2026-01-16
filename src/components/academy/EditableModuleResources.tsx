import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  BookOpen, 
  Video, 
  FileText, 
  Music, 
  CheckCircle2, 
  Clock, 
  Play, 
  ExternalLink,
  Headphones,
  Plus,
  Trash2,
  Save,
  Loader2,
  Edit2,
  X,
  ChevronDown,
  Youtube,
  Music2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MusicLinks {
  prelude?: string | null;
  opening_song?: string | null;
  responsorial_psalm?: string | null;
  preparation_hymn?: string | null;
  communion_hymn?: string | null;
  recessional?: string | null;
  soundcloud_playlist?: string | null;
  [key: string]: string | null | undefined;
}

interface ModuleResource {
  id: string;
  title: string;
  resource_type: string;
  url?: string;
  duration?: string;
  description?: string;
  is_completed?: boolean;
  sort_order: number;
  user_id?: string;
  music_links?: MusicLinks | null;
  readings_date?: string | null;
}

interface EditableModuleResourcesProps {
  moduleId: string;
  isLocked?: boolean;
}

const RESOURCE_TYPES = [
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'audio', label: 'Audio', icon: Music },
  { value: 'reading', label: 'Reading', icon: BookOpen },
];

const MUSIC_LINK_LABELS: Record<keyof MusicLinks, string> = {
  prelude: 'Prelude',
  opening_song: 'Opening Song',
  responsorial_psalm: 'Responsorial Psalm',
  preparation_hymn: 'Preparation Hymn',
  communion_hymn: 'Communion Hymn',
  recessional: 'Recessional',
  soundcloud_playlist: 'SoundCloud Playlist'
};

const getResourceIcon = (type: string) => {
  const found = RESOURCE_TYPES.find(t => t.value === type);
  return found?.icon || FileText;
};

const getResourceColor = (type: string) => {
  switch (type) {
    case 'video': return 'text-purple-600';
    case 'audio': return 'text-blue-600';
    case 'reading': return 'text-green-600';
    case 'document': return 'text-amber-600';
    default: return 'text-muted-foreground';
  }
};

const EditableModuleResources: React.FC<EditableModuleResourcesProps> = ({ 
  moduleId, 
  isLocked = false 
}) => {
  const { user } = useAuth();
  const [resources, setResources] = useState<ModuleResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedMusicLinks, setExpandedMusicLinks] = useState<string | null>(null);
  
  // New resource form state
  const [newResource, setNewResource] = useState({
    title: '',
    resource_type: 'document',
    url: '',
    duration: '',
    description: ''
  });

  // Fetch resources
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const { data, error } = await supabase
          .from('lh100_module_resources')
          .select('*')
          .eq('module_id', moduleId)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        // Cast the data to handle Json type from Supabase
        const mappedData: ModuleResource[] = (data || []).map(item => ({
          ...item,
          music_links: item.music_links as MusicLinks | null
        }));
        setResources(mappedData);
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [moduleId]);

  const handleAddResource = async () => {
    if (!user?.id || !newResource.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('lh100_module_resources')
        .insert({
          module_id: moduleId,
          user_id: user.id,
          title: newResource.title,
          resource_type: newResource.resource_type,
          url: newResource.url || null,
          duration: newResource.duration || null,
          description: newResource.description || null,
          sort_order: resources.length,
          music_links: newResource.resource_type === 'audio' ? {
            prelude: null,
            opening_song: null,
            responsorial_psalm: null,
            preparation_hymn: null,
            communion_hymn: null,
            recessional: null,
            soundcloud_playlist: null
          } : null
        })
        .select()
        .single();

      if (error) throw error;

      // Cast data to handle Json type
      const mappedData: ModuleResource = {
        ...data,
        music_links: data.music_links as MusicLinks | null
      };
      setResources(prev => [...prev, mappedData]);
      setNewResource({
        title: '',
        resource_type: 'document',
        url: '',
        duration: '',
        description: ''
      });
      setShowAddForm(false);
      toast.success('Resource added');
    } catch (error) {
      console.error('Error adding resource:', error);
      toast.error('Failed to add resource');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateResource = async (resource: ModuleResource) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lh100_module_resources')
        .update({
          title: resource.title,
          resource_type: resource.resource_type,
          url: resource.url,
          duration: resource.duration,
          description: resource.description,
          music_links: resource.music_links,
          readings_date: resource.readings_date
        })
        .eq('id', resource.id);

      if (error) throw error;

      setEditingId(null);
      toast.success('Resource updated');
    } catch (error) {
      console.error('Error updating resource:', error);
      toast.error('Failed to update resource');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const { error } = await supabase
        .from('lh100_module_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Resource deleted');
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    }
  };

  const toggleComplete = async (resource: ModuleResource) => {
    try {
      const { error } = await supabase
        .from('lh100_module_resources')
        .update({ is_completed: !resource.is_completed })
        .eq('id', resource.id);

      if (error) throw error;

      setResources(prev => prev.map(r => 
        r.id === resource.id ? { ...r, is_completed: !r.is_completed } : r
      ));
    } catch (error) {
      console.error('Error toggling complete:', error);
    }
  };

  const updateMusicLink = (resourceId: string, key: keyof MusicLinks, value: string) => {
    setResources(prev => prev.map(r => {
      if (r.id === resourceId) {
        return {
          ...r,
          music_links: {
            ...(r.music_links || {}),
            [key]: value || null
          }
        };
      }
      return r;
    }));
  };

  const getMusicLinksCount = (links: MusicLinks | null | undefined): number => {
    if (!links) return 0;
    return Object.values(links).filter(v => v && v.trim()).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm sm:text-base font-semibold uppercase tracking-wide text-muted-foreground">
          Module Resources
        </h4>
        {user && !isLocked && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-8 sm:h-9 text-xs sm:text-sm"
          >
            {showAddForm ? (
              <>
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Add Resource
              </>
            )}
          </Button>
        )}
      </div>

      {/* Add Resource Form */}
      {showAddForm && (
        <div className="p-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Resource title..."
              value={newResource.title}
              onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
              className="h-8 text-sm"
            />
            <Select 
              value={newResource.resource_type} 
              onValueChange={(v) => setNewResource(prev => ({ ...prev, resource_type: v }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="URL (optional)"
              value={newResource.url}
              onChange={(e) => setNewResource(prev => ({ ...prev, url: e.target.value }))}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Duration (e.g., 15 min)"
              value={newResource.duration}
              onChange={(e) => setNewResource(prev => ({ ...prev, duration: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <Input
            placeholder="Description (optional)"
            value={newResource.description}
            onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
            className="h-8 text-sm"
          />
          <Button 
            size="sm" 
            onClick={handleAddResource}
            disabled={saving || !newResource.title.trim()}
            className="w-full h-8"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Resource
          </Button>
        </div>
      )}

      {/* Resources List */}
      <div className="grid gap-3 sm:gap-4">
        {resources.length === 0 && !showAddForm ? (
          <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-muted-foreground border-2 border-dashed rounded-lg">
            No resources yet. {user && 'Click "Add Resource" to create one.'}
          </div>
        ) : (
          resources.map((resource) => {
            const Icon = getResourceIcon(resource.resource_type);
            const colorClass = getResourceColor(resource.resource_type);
            const isEditing = editingId === resource.id;
            const isMusicResource = resource.resource_type === 'audio' && resource.title.toLowerCase().includes('music');
            const musicLinksCount = getMusicLinksCount(resource.music_links);

            if (isEditing) {
              return (
                <div key={resource.id} className="p-3 rounded-lg border border-primary bg-primary/5 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={resource.title}
                      onChange={(e) => setResources(prev => prev.map(r => 
                        r.id === resource.id ? { ...r, title: e.target.value } : r
                      ))}
                      className="h-8 text-sm"
                    />
                    <Select 
                      value={resource.resource_type} 
                      onValueChange={(v) => setResources(prev => prev.map(r => 
                        r.id === resource.id ? { ...r, resource_type: v } : r
                      ))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOURCE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="URL"
                      value={resource.url || ''}
                      onChange={(e) => setResources(prev => prev.map(r => 
                        r.id === resource.id ? { ...r, url: e.target.value } : r
                      ))}
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder="Duration"
                      value={resource.duration || ''}
                      onChange={(e) => setResources(prev => prev.map(r => 
                        r.id === resource.id ? { ...r, duration: e.target.value } : r
                      ))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <Input
                    placeholder="Description"
                    value={resource.description || ''}
                    onChange={(e) => setResources(prev => prev.map(r => 
                      r.id === resource.id ? { ...r, description: e.target.value } : r
                    ))}
                    className="h-8 text-sm"
                  />

                  {/* Music Links Editor for Audio resources */}
                  {resource.resource_type === 'audio' && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Youtube className="h-4 w-4 text-red-500" />
                        <Label className="text-xs font-semibold uppercase">YouTube & SoundCloud Links</Label>
                      </div>
                      <div className="grid gap-2">
                        {(Object.keys(MUSIC_LINK_LABELS) as Array<keyof MusicLinks>).map(key => (
                          <div key={key} className="flex items-center gap-2">
                            <Label className="text-xs w-32 flex-shrink-0">{MUSIC_LINK_LABELS[key]}</Label>
                            <Input
                              placeholder={`${MUSIC_LINK_LABELS[key]} URL...`}
                              value={(resource.music_links?.[key] as string) || ''}
                              onChange={(e) => updateMusicLink(resource.id, key, e.target.value)}
                              className="h-7 text-xs flex-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateResource(resource)}
                      disabled={saving}
                      className="h-7"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      className="h-7"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            }

            const handleResourceClick = () => {
              if (resource.url) {
                window.open(resource.url, '_blank', 'noopener,noreferrer');
              }
            };

            const getActionLabel = () => {
              switch (resource.resource_type) {
                case 'video': return 'Watch';
                case 'audio': return isMusicResource ? 'Plan Music' : 'Listen';
                case 'reading': return 'Read';
                case 'document': return 'Open';
                default: return 'Open';
              }
            };

            return (
              <div key={resource.id} className="space-y-1">
                <div 
                  className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all ${
                    resource.is_completed 
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30' 
                      : resource.url 
                        ? 'bg-background hover:bg-muted/50 hover:border-primary/50 cursor-pointer group' 
                        : 'bg-background hover:bg-muted/50'
                  }`}
                  onClick={resource.url && !isEditing ? handleResourceClick : undefined}
                  role={resource.url ? 'button' : undefined}
                  tabIndex={resource.url ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (resource.url && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleResourceClick();
                    }
                  }}
                >
                  <div className={`p-2 sm:p-3 rounded-lg bg-muted ${colorClass} transition-transform group-hover:scale-110`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm sm:text-base lg:text-lg truncate group-hover:text-primary transition-colors">
                        {resource.title}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {resource.resource_type}
                      </Badge>
                      {isMusicResource && musicLinksCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Music2 className="h-3 w-3 mr-1" />
                          {musicLinksCount} links
                        </Badge>
                      )}
                    </div>
                    {resource.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
                        {resource.description}
                      </p>
                    )}
                    {resource.duration && (
                      <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                        {resource.duration}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                    {user && !isLocked && (
                      <>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setEditingId(resource.id)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                        >
                          <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDeleteResource(resource.id)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </>
                    )}
                    {resource.is_completed ? (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => toggleComplete(resource)}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                      </Button>
                    ) : resource.url ? (
                      <Button 
                        size="sm" 
                        variant="default"
                        className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm"
                        onClick={handleResourceClick}
                      >
                        {resource.resource_type === 'video' ? (
                          <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        ) : resource.resource_type === 'audio' ? (
                          <Headphones className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        ) : (
                          <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        )}
                        <span className="hidden sm:inline">{getActionLabel()}</span>
                      </Button>
                    ) : isMusicResource ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm"
                        onClick={() => setExpandedMusicLinks(expandedMusicLinks === resource.id ? null : resource.id)}
                      >
                        <Music className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Music Links</span>
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => toggleComplete(resource)}
                        className="h-8 sm:h-9 px-3"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expandable Music Links Display */}
                {isMusicResource && musicLinksCount > 0 && (
                  <Collapsible 
                    open={expandedMusicLinks === resource.id}
                    onOpenChange={(open) => setExpandedMusicLinks(open ? resource.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full h-7 text-xs justify-between">
                        <span className="flex items-center gap-1">
                          <Youtube className="h-3 w-3 text-red-500" />
                          View Music Links ({musicLinksCount})
                        </span>
                        <ChevronDown className={`h-3 w-3 transition-transform ${expandedMusicLinks === resource.id ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid gap-1 p-2 bg-muted/30 rounded-lg mt-1">
                        {(Object.entries(resource.music_links || {}) as [keyof MusicLinks, string | null][])
                          .filter(([_, url]) => url && url.trim())
                          .map(([key, url]) => (
                            <a
                              key={key}
                              href={url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded hover:bg-muted text-sm group"
                            >
                              {key === 'soundcloud_playlist' ? (
                                <Music2 className="h-4 w-4 text-orange-500" />
                              ) : (
                                <Youtube className="h-4 w-4 text-red-500" />
                              )}
                              <span className="flex-1">{MUSIC_LINK_LABELS[key]}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ))
                        }
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EditableModuleResources;