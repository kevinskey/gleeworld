import React, { useState } from 'react';
import { useCreateSlide, useUpdateSlide, useDeleteSlide } from '@/hooks/useUniversalSlider';
import type { SliderWithSlides, UniversalSliderSlide, SlideType, PositionH, PositionV, CtaStyle } from '@/types/universal-slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronDown, Upload, Eye, EyeOff, GripVertical, Image, Youtube, Link, Type, Palette, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const SLIDE_TYPES: { value: SlideType; label: string }[] = [
  { value: 'image', label: 'Image' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'product', label: 'Product' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'calendar_event', label: 'Calendar Event' },
  { value: 'custom_html', label: 'Custom' },
];

const POSITION_H_OPTIONS: PositionH[] = ['left', 'center', 'right'];
const POSITION_V_OPTIONS: PositionV[] = ['top', 'center', 'bottom'];
const CTA_STYLES: CtaStyle[] = ['primary', 'secondary', 'outline', 'ghost'];
const FONT_SIZES = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl'];
const FONT_WEIGHTS = ['normal', 'medium', 'semibold', 'bold', 'extrabold'];

interface SlideManagerProps {
  slider: SliderWithSlides;
}

export const SlideManager: React.FC<SlideManagerProps> = ({ slider }) => {
  const createSlide = useCreateSlide();
  const updateSlide = useUpdateSlide();
  const deleteSlide = useDeleteSlide();

  const [expandedSlide, setExpandedSlide] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    try {
      await createSlide.mutateAsync({
        slider_id: slider.id,
        slide_type: 'image',
        display_order: (slider.slides?.length || 0) + 1,
        is_active: true,
      });
      toast.success('Slide created');
      setIsCreating(false);
    } catch (error) {
      toast.error('Failed to create slide');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this slide?')) return;
    try {
      await deleteSlide.mutateAsync(id);
      toast.success('Slide deleted');
    } catch (error) {
      toast.error('Failed to delete slide');
    }
  };

  return (
    <div className="space-y-2">
      {/* Slides List */}
      {slider.slides?.length === 0 && !isCreating && (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
          <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No slides yet</p>
        </div>
      )}

      {slider.slides?.map((slide, index) => (
        <SlideRow
          key={slide.id}
          slide={slide}
          index={index}
          isExpanded={expandedSlide === slide.id}
          onToggle={() => setExpandedSlide(expandedSlide === slide.id ? null : slide.id)}
          onUpdate={(data) => updateSlide.mutateAsync({ id: slide.id, ...data })}
          onDelete={() => handleDelete(slide.id)}
        />
      ))}

      {/* Add Slide Button */}
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full h-8 border-dashed"
        onClick={handleCreate}
        disabled={createSlide.isPending}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Slide
      </Button>
    </div>
  );
};

// Individual slide row with inline editing
const SlideRow: React.FC<{
  slide: UniversalSliderSlide;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Partial<UniversalSliderSlide>) => Promise<any>;
  onDelete: () => void;
}> = ({ slide, index, isExpanded, onToggle, onUpdate, onDelete }) => {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image_url' | 'mobile_image_url' | 'tablet_image_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `sliders/${slide.slider_id}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(path);

      await onUpdate({ [field]: publicUrl });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={cn(
        'border rounded-lg transition-colors',
        isExpanded ? 'border-primary/50 bg-accent/30' : 'hover:border-muted-foreground/30'
      )}>
        {/* Collapsed Header */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-2 cursor-pointer">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            
            {/* Thumbnail */}
            <div className="w-12 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
              {slide.image_url ? (
                <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
              ) : slide.youtube_video_id ? (
                <div className="w-full h-full flex items-center justify-center bg-red-100">
                  <Youtube className="h-4 w-4 text-red-600" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            <span className="text-sm font-medium flex-1 truncate">
              {slide.title || `Slide ${index + 1}`}
            </span>

            <Badge variant="outline" className="text-xs">
              {slide.slide_type}
            </Badge>

            {slide.pause_on_this_slide && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3" />
              </Badge>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); onUpdate({ is_active: !slide.is_active }); }}
            >
              {slide.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
            </Button>

            <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 border-t space-y-3">
            {/* Row 1: Type & Basic */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={slide.slide_type} onValueChange={(v) => onUpdate({ slide_type: v as SlideType })}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLIDE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Order</Label>
                <Input 
                  type="number"
                  value={slide.display_order}
                  onChange={(e) => onUpdate({ display_order: parseInt(e.target.value) || 0 })}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Duration (s)</Label>
                <Input 
                  type="number"
                  value={slide.duration_seconds || ''}
                  onChange={(e) => onUpdate({ duration_seconds: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Default"
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-1">
                  <Switch
                    checked={slide.pause_on_this_slide}
                    onCheckedChange={(v) => onUpdate({ pause_on_this_slide: v })}
                  />
                  <Label className="text-xs">Pause</Label>
                </div>
              </div>
            </div>

            {/* Images Section */}
            {slide.slide_type === 'image' && (
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Image className="h-3 w-3" /> Images
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {['image_url', 'mobile_image_url', 'tablet_image_url'].map((field) => (
                    <div key={field} className="space-y-1">
                      <span className="text-xs text-muted-foreground capitalize">
                        {field.replace('_url', '').replace('_image', '').replace('image', 'desktop')}
                      </span>
                      <div className="flex gap-1">
                        <Input 
                          value={(slide as any)[field] || ''}
                          onChange={(e) => onUpdate({ [field]: e.target.value })}
                          placeholder="URL"
                          className="h-7 text-xs flex-1"
                        />
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, field as any)}
                            disabled={uploading}
                          />
                          <Button variant="outline" size="icon" className="h-7 w-7" disabled={uploading} asChild>
                            <span><Upload className="h-3 w-3" /></span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* YouTube Section */}
            {slide.slide_type === 'youtube' && (
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Youtube className="h-3 w-3" /> YouTube
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <Input 
                      value={slide.youtube_video_id || ''}
                      onChange={(e) => onUpdate({ youtube_video_id: e.target.value })}
                      placeholder="Video ID (e.g., dQw4w9WgXcQ)"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={slide.youtube_autoplay} onCheckedChange={(v) => onUpdate({ youtube_autoplay: v })} />
                    <Label className="text-xs">Autoplay</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={slide.youtube_muted} onCheckedChange={(v) => onUpdate({ youtube_muted: v })} />
                    <Label className="text-xs">Muted</Label>
                  </div>
                </div>
              </div>
            )}

            {/* Text Content */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Type className="h-3 w-3" /> Text Content
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  value={slide.title || ''}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  placeholder="Title"
                  className="h-7 text-xs"
                />
                <Input 
                  value={slide.description || ''}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  placeholder="Description"
                  className="h-7 text-xs"
                />
              </div>
            </div>

            {/* Title Styling */}
            {slide.title && (
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Palette className="h-3 w-3" /> Title Style
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  <Select value={slide.title_font_size} onValueChange={(v) => onUpdate({ title_font_size: v })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_SIZES.map(s => <SelectItem key={s} value={s}>{s.replace('text-', '')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={slide.title_font_weight} onValueChange={(v) => onUpdate({ title_font_weight: v })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Weight" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_WEIGHTS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input 
                    type="color"
                    value={slide.title_color}
                    onChange={(e) => onUpdate({ title_color: e.target.value })}
                    className="h-7 p-0 border-0"
                  />
                  <Select value={slide.title_position_h} onValueChange={(v) => onUpdate({ title_position_h: v as PositionH })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITION_H_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={slide.title_position_v} onValueChange={(v) => onUpdate({ title_position_v: v as PositionV })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITION_V_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Link & CTA */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Link className="h-3 w-3" /> Link & CTA
              </Label>
              <div className="grid grid-cols-4 gap-2">
                <Input 
                  value={slide.link_url || ''}
                  onChange={(e) => onUpdate({ link_url: e.target.value })}
                  placeholder="Slide link URL"
                  className="h-7 text-xs col-span-2"
                />
                <Input 
                  value={slide.cta_text || ''}
                  onChange={(e) => onUpdate({ cta_text: e.target.value })}
                  placeholder="Button text"
                  className="h-7 text-xs"
                />
                <Input 
                  value={slide.cta_url || ''}
                  onChange={(e) => onUpdate({ cta_url: e.target.value })}
                  placeholder="Button URL"
                  className="h-7 text-xs"
                />
              </div>
            </div>

            {/* Overlay */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={slide.overlay_enabled}
                  onCheckedChange={(v) => onUpdate({ overlay_enabled: v })}
                />
                <Label className="text-xs">Overlay</Label>
              </div>
              {slide.overlay_enabled && (
                <Input 
                  value={slide.overlay_color}
                  onChange={(e) => onUpdate({ overlay_color: e.target.value })}
                  placeholder="rgba(0,0,0,0.3)"
                  className="h-7 text-xs w-40"
                />
              )}
              <div className="ml-auto">
                <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={onDelete}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default SlideManager;
