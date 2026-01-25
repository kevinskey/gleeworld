import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  Star,
  Music,
  Headphones,
  ListMusic
} from 'lucide-react';
import { PlaylistMediaManager } from './PlaylistMediaManager';

interface Course {
  id: string;
  course_code: string | null;
  code: string | null;
  title: string;
  is_active: boolean;
  created_by: string | null;
  instructor_id: string | null;
}

interface Playlist {
  id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  playlist_url: string | null;
  is_public: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  track_count?: number;
}

interface CoursePlaylistManagerProps {
  courseId?: string;
  isFullPage?: boolean;
}

export const CoursePlaylistManager: React.FC<CoursePlaylistManagerProps> = ({ 
  courseId,
  isFullPage = false 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>(courseId || 'all');
  const [mediaManagerOpen, setMediaManagerOpen] = useState(false);
  const [selectedPlaylistForMedia, setSelectedPlaylistForMedia] = useState<Playlist | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    course_id: courseId || 'none',
    title: '',
    description: '',
    is_public: false,
    is_featured: false
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  // Refetch playlists when courses load or filter changes
  useEffect(() => {
    if (courses.length > 0 || selectedCourseFilter === 'all') {
      fetchPlaylists();
    }
  }, [selectedCourseFilter, courses, user?.id]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_courses')
        .select('id, course_code, code, title, is_active, created_by, instructor_id')
        .eq('is_active', true)
        .order('title');
      
      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  // Filter courses to only those the current user teaches (unless admin/super-admin)
  const getInstructorCourses = () => {
    if (!user) return courses;
    // Super-admins and admins can see all courses
    return courses;
  };

  const instructorCourses = getInstructorCourses();
  const instructorCourseIds = instructorCourses.map(c => c.id);

  const fetchPlaylists = async () => {
    try {
      let query = supabase
        .from('gw_course_playlists')
        .select('*')
        .order('display_order', { ascending: true });

      if (selectedCourseFilter && selectedCourseFilter !== 'all') {
        query = query.eq('course_id', selectedCourseFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // For instructor console with a specific courseId, filter to that course
      // Otherwise show all playlists the user has access to
      const filteredPlaylists = (data || []).filter(playlist => {
        // If we have a specific courseId prop, only show playlists for that course
        if (courseId) {
          return playlist.course_id === courseId;
        }
        // Otherwise show playlists for courses user teaches or created
        if (!playlist.course_id) {
          return playlist.created_by === user?.id;
        }
        return instructorCourseIds.includes(playlist.course_id);
      });

      // Get track counts for each playlist
      const playlistsWithCounts = await Promise.all(
        filteredPlaylists.map(async (playlist) => {
          const { count } = await supabase
            .from('gw_course_playlist_media')
            .select('*', { count: 'exact', head: true })
            .eq('playlist_id', playlist.id);
          return { ...playlist, track_count: count || 0 };
        })
      );
      
      setPlaylists(playlistsWithCounts);
    } catch (err) {
      console.error('Error fetching playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        course_id: formData.course_id === 'none' ? null : (formData.course_id || null),
        created_by: user?.id
      };

      if (editingPlaylist) {
        const { error } = await supabase
          .from('gw_course_playlists')
          .update(payload)
          .eq('id', editingPlaylist.id);
        if (error) throw error;
        toast({ title: 'Playlist updated successfully' });
      } else {
        const { error } = await supabase
          .from('gw_course_playlists')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Playlist created successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchPlaylists();
    } catch (err: any) {
      toast({ 
        title: 'Error saving playlist', 
        description: err.message,
        variant: 'destructive' 
      });
    }
  };

  const handleDelete = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    
    try {
      const { error } = await supabase
        .from('gw_course_playlists')
        .delete()
        .eq('id', playlistId);
      
      if (error) throw error;
      toast({ title: 'Playlist deleted' });
      fetchPlaylists();
    } catch (err: any) {
      toast({ 
        title: 'Error deleting playlist', 
        description: err.message,
        variant: 'destructive' 
      });
    }
  };

  const toggleVisibility = async (playlist: Playlist, field: 'is_public' | 'is_featured') => {
    try {
      const { error } = await supabase
        .from('gw_course_playlists')
        .update({ [field]: !playlist[field] })
        .eq('id', playlist.id);
      
      if (error) throw error;
      fetchPlaylists();
    } catch (err: any) {
      toast({ 
        title: 'Error updating playlist', 
        description: err.message,
        variant: 'destructive' 
      });
    }
  };

  const resetForm = () => {
    setFormData({
      course_id: courseId || 'none',
      title: '',
      description: '',
      is_public: false,
      is_featured: false
    });
    setEditingPlaylist(null);
  };

  const openEditDialog = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setFormData({
      course_id: playlist.course_id || 'none',
      title: playlist.title,
      description: playlist.description || '',
      is_public: playlist.is_public,
      is_featured: playlist.is_featured
    });
    setDialogOpen(true);
  };

  const getCourseName = (courseId: string | null) => {
    if (!courseId) return 'General';
    const course = courses.find(c => c.id === courseId);
    return course ? (course.course_code || course.code || course.title) : 'Unknown Course';
  };

  return (
    <div className={isFullPage ? 'p-6' : ''}>
      <Card className="bg-card/95 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-primary" />
                Audio Playlists
              </CardTitle>
              <CardDescription>
                Create and manage MP3 playlists for course listening
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-3">
              {!courseId && (
                <Select value={selectedCourseFilter} onValueChange={setSelectedCourseFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All My Courses</SelectItem>
                    {instructorCourses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.course_code || course.code || course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Playlist
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPlaylist ? 'Edit Playlist' : 'Create Playlist'}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Course (optional)</Label>
                      <Select 
                        value={formData.course_id} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, course_id: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a course (or leave for general)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">General (No Course)</SelectItem>
                          {instructorCourses.map(course => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.course_code || course.code || course.title} - {course.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Title *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Warmup Tracks, Concert Prep"
                        required
                        className="text-white"
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe this playlist..."
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_public}
                          onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_public: v }))}
                        />
                        <Label>Public (visible on landing page)</Label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_featured}
                          onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_featured: v }))}
                        />
                        <Label>Featured (carousel priority)</Label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingPlaylist ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No playlists yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {playlists.map((playlist) => (
                <Card key={playlist.id} className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{playlist.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {getCourseName(playlist.course_id)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <Music className="h-3 w-3 mr-1" />
                            {playlist.track_count || 0} tracks
                          </Badge>
                          {playlist.is_public && (
                            <Badge className="bg-green-500/20 text-green-600 text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              Public
                            </Badge>
                          )}
                          {playlist.is_featured && (
                            <Badge className="bg-yellow-500/20 text-yellow-600 text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        {playlist.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {playlist.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPlaylistForMedia(playlist);
                            setMediaManagerOpen(true);
                          }}
                          title="Manage audio tracks"
                        >
                          <ListMusic className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleVisibility(playlist, 'is_public')}
                          title={playlist.is_public ? 'Make private' : 'Make public'}
                        >
                          <Eye className={`h-4 w-4 ${playlist.is_public ? 'text-green-500' : 'opacity-50'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleVisibility(playlist, 'is_featured')}
                          title={playlist.is_featured ? 'Remove from featured' : 'Add to featured'}
                        >
                          <Star className={`h-4 w-4 ${playlist.is_featured ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(playlist)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(playlist.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Manager Dialog */}
      {selectedPlaylistForMedia && (
        <PlaylistMediaManager
          playlistId={selectedPlaylistForMedia.id}
          playlistTitle={selectedPlaylistForMedia.title}
          open={mediaManagerOpen}
          onOpenChange={(open) => {
            setMediaManagerOpen(open);
            if (!open) fetchPlaylists(); // Refresh track counts
          }}
        />
      )}
    </div>
  );
};

export default CoursePlaylistManager;
