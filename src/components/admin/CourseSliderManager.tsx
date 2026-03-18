import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronDown, Upload, Eye, EyeOff, Images, ExternalLink, Youtube, Image as ImageIcon, Video, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSliderByPlacementAdmin, useCreateSlider, useCreateSlide, useUpdateSlide, useDeleteSlide, useReorderSlides } from '@/hooks/useUniversalSlider';
import { cn } from '@/lib/utils';
import { extractYouTubeVideoId } from '@/utils/youtubeUtils';

// Local-state text input that saves on blur to prevent re-render focus loss
const SlideTextInput: React.FC<{
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onSave, placeholder, className }) => {
  const [local, setLocal] = useState(value);
  const ref = useRef(value);
  // Sync if external value changes while not focused
  React.useEffect(() => { ref.current = value; setLocal(value); }, [value]);
  return (
    <Input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== ref.current) onSave(local); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
      placeholder={placeholder}
      className={className}
    />
  );
};

interface CourseSliderManagerProps {
  courseCode: string;
  courseTitle: string;
  coursePath: string;
  icon?: React.ReactNode;
}

export const CourseSliderManager: React.FC<CourseSliderManagerProps> = ({
  courseCode,
  courseTitle,
  coursePath,
  icon,
}) => {
  // Generate placement key from course code (e.g., "MUS 240" -> "mus240-topic-photos")
  const placementKey = `${courseCode.toLowerCase().replace(/\s+/g, '')}-topic-photos`;
  
  const { data: slider, isLoading, refetch } = useSliderByPlacementAdmin(placementKey);
  const createSlider = useCreateSlider();
  const createSlide = useCreateSlide();
  const updateSlide = useUpdateSlide();
  const deleteSlide = useDeleteSlide();
  const reorderSlides = useReorderSlides();

  const [expandedSlide, setExpandedSlide] = useState<string | null>(null);

  const handleMoveSlide = async (index: number, direction: 'up' | 'down') => {
    if (!slider?.slides) return;
    const slides = [...slider.slides];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    [slides[index], slides[targetIndex]] = [slides[targetIndex], slides[index]];
    const reorderData = slides.map((s, i) => ({ id: s.id, display_order: i }));
    try {
      await reorderSlides.mutateAsync(reorderData);
      toast.success('Slides reordered');
      refetch();
    } catch {
      toast.error('Failed to reorder slides');
    }
  };

  const handleCreateSlider = async () => {
    try {
      await createSlider.mutateAsync({
        name: `${courseCode} Topic Photos`,
        placement_key: placementKey,
        slider_type: 'custom',
      });
      toast.success(`${courseCode} slider created`);
      refetch();
    } catch (error) {
      toast.error('Failed to create slider');
    }
  };

  const handleAddSlide = async () => {
    if (!slider) return;
    try {
      await createSlide.mutateAsync({
        slider_id: slider.id,
        slide_type: 'image',
        display_order: (slider.slides?.length || 0) + 1,
        is_active: true,
      });
      toast.success('Slide added');
      refetch();
    } catch (error) {
      toast.error('Failed to add slide');
    }
  };

  const handleDeleteSlide = async (id: string) => {
    if (!confirm('Delete this slide?')) return;
    try {
      await deleteSlide.mutateAsync(id);
      toast.success('Slide deleted');
      refetch();
    } catch (error) {
      toast.error('Failed to delete slide');
    }
  };

  const handleImageUpload = async (slideId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${courseCode.toLowerCase().replace(/\s+/g, '')}-topic-${Date.now()}.${fileExt}`;
      const filePath = `slider-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      await updateSlide.mutateAsync({ id: slideId, image_url: publicUrl });
      toast.success('Image uploaded');
      refetch();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    }
  };

  const handleVideoUpload = async (slideId: string, file: File) => {
    try {
      // Validate file size (200MB max)
      if (file.size > 200 * 1024 * 1024) {
        toast.error('Video file must be under 200MB');
        return;
      }
      
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const fileName = `${courseCode.toLowerCase().replace(/\s+/g, '')}-video-${Date.now()}.${fileExt}`;
      const filePath = `slider-videos/${fileName}`;

      toast.loading('Uploading video...', { id: 'video-upload' });

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type || 'video/mp4',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      await updateSlide.mutateAsync({ id: slideId, video_url: publicUrl });
      toast.success('Video uploaded', { id: 'video-upload' });
      refetch();
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast.error(error.message || 'Failed to upload video', { id: 'video-upload' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading {courseCode} slider...
        </CardContent>
      </Card>
    );
  }

  // If slider doesn't exist, show create button
  if (!slider) {
    return (
      <Card className="border-dashed border-2 border-primary/30">
        <CardContent className="py-8 text-center">
          <Images className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-medium text-foreground mb-2">{courseCode} Topic Photo Slider</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a slider for the {courseTitle} course landing page to showcase current topic photos.
          </p>
          <Button onClick={handleCreateSlider} disabled={createSlider.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Create {courseCode} Slider
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                {icon || <Images className="h-5 w-5 text-primary" />}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg">{courseCode} Topic Photos</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {courseTitle} - Manage course topic photos
                </p>
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
              <Badge variant="secondary" className="justify-center px-3 py-2 text-xs sm:py-1">
                {slider.slides?.length || 0} slides
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(coursePath, '_blank')}
              >
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                Preview
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium">Placement Key:</span>{' '}
            <code className="font-mono break-all">{placementKey}</code>
          </div>
        </CardContent>
      </Card>

      {/* Slides Manager */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Slides</CardTitle>
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={handleAddSlide}
              disabled={createSlide.isPending}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Slide
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {slider.slides?.length === 0 && (
            <div className="rounded-lg border border-dashed py-6 text-center text-muted-foreground">
              <Images className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No slides yet. Add one to get started.</p>
            </div>
          )}

          {slider.slides?.map((slide, index) => (
            <Collapsible
              key={slide.id}
              open={expandedSlide === slide.id}
              onOpenChange={() => setExpandedSlide(expandedSlide === slide.id ? null : slide.id)}
            >
              <div
                className={cn(
                  'overflow-hidden rounded-lg border transition-colors',
                  expandedSlide === slide.id ? 'border-primary/50 bg-accent/30' : 'border-border',
                )}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex flex-col gap-3 p-3 text-left transition-colors hover:bg-accent/50 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
                      <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-muted">
                        {slide.slide_type === 'youtube' && slide.youtube_video_id ? (
                          <img
                            src={`https://img.youtube.com/vi/${slide.youtube_video_id}/default.jpg`}
                            alt={slide.title || `Slide ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : slide.slide_type === 'video' && slide.video_url ? (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Video className="h-4 w-4 text-primary" />
                          </div>
                        ) : slide.image_url ? (
                          <img
                            src={slide.image_url}
                            alt={slide.title || `Slide ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Images className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          {slide.slide_type === 'youtube' ? (
                            <Youtube className="h-3.5 w-3.5 text-red-500" />
                          ) : slide.slide_type === 'video' ? (
                            <Video className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="truncate">{slide.title || `Slide ${index + 1}`}</span>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {slide.slide_type === 'youtube'
                            ? `YouTube: ${slide.youtube_video_id || 'No video ID'}`
                            : slide.slide_type === 'video'
                              ? `Video: ${slide.video_url ? 'Uploaded' : 'No video'}`
                              : (slide.description || 'No description')}
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSlide(index, 'up');
                          }}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === (slider.slides?.length || 1) - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSlide(index, 'down');
                          }}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge variant={slide.is_active ? 'default' : 'secondary'} className="shrink-0 text-xs">
                          {slide.is_active ? <Eye className="mr-1 h-3 w-3" /> : <EyeOff className="mr-1 h-3 w-3" />}
                          {slide.is_active ? 'Active' : 'Hidden'}
                        </Badge>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                            expandedSlide === slide.id && 'rotate-180',
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="space-y-4 border-t bg-background p-4">
                    {/* Slide Type Selector */}
                    <div>
                      <Label className="text-sm font-medium">Slide Type</Label>
                      <Select
                        value={slide.slide_type}
                        onValueChange={(value: 'image' | 'youtube' | 'video') => {
                          updateSlide.mutate(
                            { id: slide.id, slide_type: value },
                            {
                              onSuccess: () => refetch(),
                            },
                          );
                        }}
                      >
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder="Select slide type" />
                        </SelectTrigger>
                        <SelectContent className="z-[100] border bg-background shadow-lg">
                          <SelectItem value="image">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              <span>Image</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="video">
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4 text-primary" />
                              <span>Uploaded Video</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="youtube">
                            <div className="flex items-center gap-2">
                              <Youtube className="h-4 w-4 text-destructive" />
                              <span>YouTube Video</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Image Fields - only show for image type */}
                    {slide.slide_type === 'image' && (
                      <div>
                        <Label className="text-sm font-medium">Image</Label>
                        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                          <Input
                            value={slide.image_url || ''}
                            onChange={(e) => updateSlide.mutate({ id: slide.id, image_url: e.target.value })}
                            placeholder="https://..."
                            className="flex-1 text-sm"
                          />
                          <label className="cursor-pointer sm:self-start">
                            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                              <span>
                                <Upload className="mr-1 h-4 w-4" />
                                Upload
                              </span>
                            </Button>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(slide.id, file);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {/* YouTube Fields - only show for youtube type */}
                    {slide.slide_type === 'youtube' && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">YouTube URL or Video ID</Label>
                          <Input
                            value={slide.youtube_video_id || ''}
                            onChange={(e) => {
                              const input = e.target.value.trim();
                              const videoId = extractYouTubeVideoId(input) || input;
                              updateSlide.mutate({ id: slide.id, youtube_video_id: videoId });
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pastedText = e.clipboardData.getData('text').trim();
                              const videoId = extractYouTubeVideoId(pastedText) || pastedText;
                              updateSlide.mutate({ id: slide.id, youtube_video_id: videoId });
                            }}
                            placeholder="https://youtube.com/watch?v=... or video ID"
                            className="mt-1 text-sm"
                          />
                          {slide.youtube_video_id && (
                            <div className="mt-2 overflow-hidden rounded border">
                              <img
                                src={`https://img.youtube.com/vi/${slide.youtube_video_id}/mqdefault.jpg`}
                                alt="Video thumbnail"
                                className="h-auto w-full"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={slide.youtube_autoplay || false}
                              onChange={(e) => updateSlide.mutate({ id: slide.id, youtube_autoplay: e.target.checked })}
                              className="rounded"
                            />
                            Autoplay
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={slide.youtube_muted || false}
                              onChange={(e) => updateSlide.mutate({ id: slide.id, youtube_muted: e.target.checked })}
                              className="rounded"
                            />
                            Muted
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={slide.youtube_loop || false}
                              onChange={(e) => updateSlide.mutate({ id: slide.id, youtube_loop: e.target.checked })}
                              className="rounded"
                            />
                            Loop
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Uploaded Video Fields */}
                    {slide.slide_type === 'video' && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Video File</Label>
                          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                            <Input
                              value={slide.video_url || ''}
                              onChange={(e) => updateSlide.mutate({ id: slide.id, video_url: e.target.value })}
                              placeholder="https://... or upload a file"
                              className="flex-1 text-sm"
                            />
                            <label className="cursor-pointer sm:self-start">
                              <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                                <span>
                                  <Upload className="mr-1 h-4 w-4" />
                                  Upload
                                </span>
                              </Button>
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleVideoUpload(slide.id, file);
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        {slide.video_url && (
                          <div className="mt-2 overflow-hidden rounded border bg-black">
                            <video
                              src={slide.video_url}
                              className="h-auto max-h-48 w-full"
                              controls
                              muted
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Title */}
                    <div>
                      <Label className="text-sm font-medium">Title</Label>
                      <SlideTextInput
                        value={slide.title || ''}
                        onSave={(val) => updateSlide.mutate({ id: slide.id, title: val })}
                        placeholder="Slide title..."
                        className="mt-1 text-sm"
                      />
                    </div>

                    {/* Description - only for images */}
                    {slide.slide_type === 'image' && (
                      <div>
                        <Label className="text-sm font-medium">Description</Label>
                        <Input
                          value={slide.description || ''}
                          onChange={(e) => updateSlide.mutate({ id: slide.id, description: e.target.value })}
                          placeholder="Brief description..."
                          className="mt-1 text-sm"
                        />
                      </div>
                    )}

                    {/* Link URL - only for images */}
                    {slide.slide_type === 'image' && (
                      <div>
                        <Label className="text-sm font-medium">Link URL (optional)</Label>
                        <Input
                          value={slide.link_url || ''}
                          onChange={(e) => updateSlide.mutate({ id: slide.id, link_url: e.target.value })}
                          placeholder="https://..."
                          className="mt-1 text-sm"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3 border-t pt-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Active</Label>
                        <button
                          onClick={() => updateSlide.mutate({ id: slide.id, is_active: !slide.is_active })}
                          className={cn(
                            'relative h-5 w-10 rounded-full transition-colors',
                            slide.is_active ? 'bg-primary' : 'bg-muted',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                              slide.is_active ? 'left-5' : 'left-0.5',
                            )}
                          />
                        </button>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => handleDeleteSlide(slide.id)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseSliderManager;
