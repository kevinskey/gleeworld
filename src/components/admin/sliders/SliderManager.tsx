import React, { useState } from 'react';
import { useAllSliders, useCreateSlider, useDeleteSlider, useUpdateSlider } from '@/hooks/useUniversalSlider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Settings2, Image, Youtube, ShoppingBag, Calendar, Megaphone, Sparkles, Layers, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { SliderWithSlides, SliderType, HeightPreset, TransitionEffect, GapSize } from '@/types/universal-slider';
import { SlideManager } from './SlideManager';

const SLIDER_TYPE_OPTIONS: { value: SliderType; label: string; icon: React.ReactNode }[] = [
  { value: 'custom', label: 'Custom', icon: <Sparkles className="h-3 w-3" /> },
  { value: 'youtube', label: 'YouTube', icon: <Youtube className="h-3 w-3" /> },
  { value: 'ad', label: 'Advertising', icon: <Megaphone className="h-3 w-3" /> },
  { value: 'product', label: 'Products', icon: <ShoppingBag className="h-3 w-3" /> },
  { value: 'amazon_affiliate', label: 'Amazon', icon: <ShoppingBag className="h-3 w-3" /> },
  { value: 'calendar', label: 'Calendar', icon: <Calendar className="h-3 w-3" /> },
];

export const SliderManager: React.FC = () => {
  const { data: sliders, isLoading } = useAllSliders();
  const createSlider = useCreateSlider();
  const deleteSlider = useDeleteSlider();
  const updateSlider = useUpdateSlider();

  const [isCreating, setIsCreating] = useState(false);
  const [newSlider, setNewSlider] = useState({
    name: '',
    placement_key: '',
    slider_type: 'custom' as SliderType,
  });

  const handleCreate = async () => {
    if (!newSlider.name || !newSlider.placement_key) {
      toast.error('Name and Placement Key are required');
      return;
    }

    try {
      await createSlider.mutateAsync(newSlider);
      toast.success('Slider created');
      setNewSlider({ name: '', placement_key: '', slider_type: 'custom' });
      setIsCreating(false);
    } catch (error) {
      toast.error('Failed to create slider');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will also delete all slides.`)) return;
    try {
      await deleteSlider.mutateAsync(id);
      toast.success('Slider deleted');
    } catch (error) {
      toast.error('Failed to delete slider');
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading sliders...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Universal Slider Manager
        </h2>
        <Button size="sm" onClick={() => setIsCreating(!isCreating)}>
          <Plus className="h-4 w-4 mr-1" />
          New Slider
        </Button>
      </div>

      {/* Create New Slider Form */}
      {isCreating && (
        <Card className="border-dashed border-2 border-primary/30">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input 
                  value={newSlider.name}
                  onChange={(e) => setNewSlider(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Homepage Hero"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Placement Key</Label>
                <Input 
                  value={newSlider.placement_key}
                  onChange={(e) => setNewSlider(prev => ({ ...prev, placement_key: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                  placeholder="homepage_hero"
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select 
                  value={newSlider.slider_type} 
                  onValueChange={(v) => setNewSlider(prev => ({ ...prev, slider_type: v as SliderType }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLIDER_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">{opt.icon} {opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button size="sm" onClick={handleCreate} disabled={createSlider.isPending} className="h-8">
                  Create
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)} className="h-8">
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Sliders */}
      {!sliders?.length ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No sliders yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {sliders.map((slider) => (
            <SliderRow 
              key={slider.id} 
              slider={slider} 
              onDelete={() => handleDelete(slider.id, slider.name)}
              onUpdate={updateSlider.mutateAsync}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
};

// Individual slider accordion row
const SliderRow: React.FC<{
  slider: SliderWithSlides;
  onDelete: () => void;
  onUpdate: (data: any) => Promise<any>;
}> = ({ slider, onDelete, onUpdate }) => {
  const [localSettings, setLocalSettings] = useState(slider);

  const handleSettingChange = async (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    try {
      await onUpdate({ id: slider.id, [key]: value });
    } catch (error) {
      toast.error('Failed to update');
      setLocalSettings(slider); // Revert
    }
  };

  const typeIcon = SLIDER_TYPE_OPTIONS.find(t => t.value === slider.slider_type)?.icon;

  return (
    <AccordionItem value={slider.id} className="border rounded-lg bg-card">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex items-center gap-3 flex-1 text-left">
          <div className="flex items-center gap-2">
            {typeIcon}
            <span className="font-medium">{slider.name}</span>
          </div>
          <Badge variant="secondary" className="text-xs font-mono">
            {slider.placement_key}
          </Badge>
          <Badge variant={slider.is_active ? 'default' : 'outline'} className="text-xs">
            {slider.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto mr-4">
            {slider.slides?.length || 0} slides
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <Tabs defaultValue="slides" className="w-full">
          <TabsList className="h-8 mb-3">
            <TabsTrigger value="slides" className="text-xs h-7">
              <Image className="h-3 w-3 mr-1" />
              Slides ({slider.slides?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="layout" className="text-xs h-7">
              <Settings2 className="h-3 w-3 mr-1" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs h-7">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Slides Tab */}
          <TabsContent value="slides" className="mt-0">
            <SlideManager slider={slider} />
          </TabsContent>

          {/* Layout Tab */}
          <TabsContent value="layout" className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Columns</Label>
                <Select 
                  value={String(localSettings.column_count)} 
                  onValueChange={(v) => handleSettingChange('column_count', parseInt(v))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Column</SelectItem>
                    <SelectItem value="2">2 Columns</SelectItem>
                    <SelectItem value="3">3 Columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Height</Label>
                <Select 
                  value={localSettings.height_preset} 
                  onValueChange={(v) => handleSettingChange('height_preset', v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (350px)</SelectItem>
                    <SelectItem value="medium">Medium (500px)</SelectItem>
                    <SelectItem value="large">Large (700px)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Gap</Label>
                <Select 
                  value={localSettings.gap_size} 
                  onValueChange={(v) => handleSettingChange('gap_size', v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="sm">Small</SelectItem>
                    <SelectItem value="md">Medium</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={localSettings.is_full_width}
                    onCheckedChange={(v) => handleSettingChange('is_full_width', v)}
                  />
                  <Label className="text-xs">Full Width</Label>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={localSettings.auto_play}
                  onCheckedChange={(v) => handleSettingChange('auto_play', v)}
                />
                <Label className="text-xs">Auto Play</Label>
              </div>
              <div>
                <Label className="text-xs">Duration (s)</Label>
                <Input 
                  type="number"
                  value={localSettings.default_slide_duration_seconds}
                  onChange={(e) => handleSettingChange('default_slide_duration_seconds', parseInt(e.target.value) || 5)}
                  className="h-8 text-sm w-20"
                  min={1}
                  max={60}
                />
              </div>
              <div>
                <Label className="text-xs">Transition</Label>
                <Select 
                  value={localSettings.transition_effect} 
                  onValueChange={(v) => handleSettingChange('transition_effect', v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fade">Fade</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={localSettings.show_navigation}
                  onCheckedChange={(v) => handleSettingChange('show_navigation', v)}
                />
                <Label className="text-xs">Arrows</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={localSettings.show_dots}
                  onCheckedChange={(v) => handleSettingChange('show_dots', v)}
                />
                <Label className="text-xs">Dots</Label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  checked={localSettings.is_active}
                  onCheckedChange={(v) => handleSettingChange('is_active', v)}
                />
                <Label className="text-sm font-medium">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  <Copy className="h-3 w-3 mr-1" />
                  Duplicate
                </Button>
                <Button variant="destructive" size="sm" className="text-xs h-7" onClick={onDelete}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </AccordionContent>
    </AccordionItem>
  );
};

export default SliderManager;
