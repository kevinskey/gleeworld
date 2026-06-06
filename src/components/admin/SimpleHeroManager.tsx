import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Upload, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface HeroSlide {
  id: string;
  slider_id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  link_url: string | null;
  cta_text: string | null;
  display_order: number;
  is_active: boolean;
  image_position_x: string | null;
  image_position_y: string | null;
}

interface SimpleHeroManagerProps {
  placementKey?: string;
  title?: string;
}

export const SimpleHeroManager: React.FC<SimpleHeroManagerProps> = ({
  placementKey = 'homepage_hero',
  title = 'Homepage Hero',
}) => {
  const [sliderId, setSliderId] = useState<string | null>(null);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: slider, error: sliderErr } = await supabase
      .from('gw_universal_sliders')
      .select('id')
      .eq('placement_key', placementKey)
      .maybeSingle();
    if (sliderErr) {
      toast.error(`Failed to load slider: ${sliderErr.message}`);
      setLoading(false);
      return;
    }
    if (!slider) {
      setLoading(false);
      return;
    }
    setSliderId(slider.id);
    const { data, error } = await supabase
      .from('gw_universal_slider_slides')
      .select('id, slider_id, title, description, image_url, mobile_image_url, link_url, cta_text, display_order, is_active, image_position_x, image_position_y')
      .eq('slider_id', slider.id)
      .order('display_order', { ascending: true });
    if (error) toast.error(`Failed to load slides: ${error.message}`);
    setSlides((data as HeroSlide[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [placementKey]);

  const updateSlide = async (id: string, patch: Partial<HeroSlide>) => {
    setSlides(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
    const { error } = await supabase
      .from('gw_universal_slider_slides')
      .update(patch)
      .eq('id', id);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      load();
    }
  };

  const addSlide = async () => {
    if (!sliderId) return;
    const nextOrder = slides.length === 0 ? 0 : Math.max(...slides.map(s => s.display_order)) + 1;
    const { data, error } = await supabase
      .from('gw_universal_slider_slides')
      .insert({
        slider_id: sliderId,
        slide_type: 'image',
        display_order: nextOrder,
        is_active: true,
      })
      .select('id, slider_id, title, description, image_url, mobile_image_url, link_url, cta_text, display_order, is_active, image_position_x, image_position_y')
      .single();
    if (error) {
      toast.error(`Add failed: ${error.message}`);
      return;
    }
    setSlides(prev => [...prev, data as HeroSlide]);
    toast.success('Slide added');
  };

  const deleteSlide = async (id: string) => {
    if (!confirm('Delete this slide? This cannot be undone.')) return;
    const { error } = await supabase
      .from('gw_universal_slider_slides')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    setSlides(prev => prev.filter(s => s.id !== id));
    toast.success('Slide deleted');
  };

  const move = async (id: string, direction: -1 | 1) => {
    const idx = slides.findIndex(s => s.id === id);
    const swap = idx + direction;
    if (idx < 0 || swap < 0 || swap >= slides.length) return;
    const a = slides[idx];
    const b = slides[swap];
    const next = [...slides];
    next[idx] = { ...b, display_order: a.display_order };
    next[swap] = { ...a, display_order: b.display_order };
    setSlides(next);
    await Promise.all([
      supabase.from('gw_universal_slider_slides').update({ display_order: b.display_order }).eq('id', a.id),
      supabase.from('gw_universal_slider_slides').update({ display_order: a.display_order }).eq('id', b.id),
    ]);
  };

  const uploadImage = async (
    slide: HeroSlide,
    file: File,
    field: 'image_url' | 'mobile_image_url',
  ) => {
    setUploadingId(slide.id);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `hero-images/${slide.slider_id}/${slide.id}-${field}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('user-files').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('user-files').getPublicUrl(path);
      await updateSlide(slide.id, { [field]: pub.publicUrl } as Partial<HeroSlide>);
      toast.success('Image uploaded');
    } catch (err: any) {
      toast.error(`Upload failed: ${err?.message ?? 'unknown error'}`);
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading hero slides…</div>;
  }
  if (!sliderId) {
    return <div className="p-6 text-muted-foreground">No slider configured for placement "{placementKey}".</div>;
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">Placement key: <code>{placementKey}</code> · {slides.length} slide{slides.length === 1 ? '' : 's'}</p>
        </div>
        <Button onClick={addSlide} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add slide
        </Button>
      </div>

      {slides.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          No slides yet. Click "Add slide" to create one.
        </Card>
      )}

      <div className="space-y-3">
        {slides.map((slide, i) => (
          <Card key={slide.id} className="p-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-32 h-20 rounded overflow-hidden bg-muted flex-shrink-0 border">
                {slide.image_url ? (
                  <img
                    src={slide.image_url}
                    alt={slide.title ?? ''}
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: `${slide.image_position_x ?? 'center'} ${slide.image_position_y ?? 'center'}`,
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={slide.title ?? ''}
                    onChange={e => updateSlide(slide.id, { title: e.target.value })}
                    placeholder="Title"
                    className="font-medium"
                  />
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => move(slide.id, -1)} disabled={i === 0} aria-label="Move up">
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => move(slide.id, 1)} disabled={i === slides.length - 1} aria-label="Move down">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    <Switch
                      checked={slide.is_active}
                      onCheckedChange={v => updateSlide(slide.id, { is_active: v })}
                      aria-label="Active"
                    />
                    <span className="text-xs text-muted-foreground">{slide.is_active ? 'Active' : 'Hidden'}</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteSlide(slide.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <Textarea
                  value={slide.description ?? ''}
                  onChange={e => updateSlide(slide.id, { description: e.target.value })}
                  placeholder="Description (optional)"
                  rows={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Desktop image</Label>
                <div className="flex gap-2">
                  <Input
                    value={slide.image_url ?? ''}
                    onChange={e => updateSlide(slide.id, { image_url: e.target.value })}
                    placeholder="https://…"
                  />
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) uploadImage(slide, f, 'image_url');
                        e.target.value = '';
                      }}
                    />
                    <Button asChild size="icon" variant="outline" disabled={uploadingId === slide.id}>
                      <span><Upload className="h-4 w-4" /></span>
                    </Button>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Mobile image (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={slide.mobile_image_url ?? ''}
                    onChange={e => updateSlide(slide.id, { mobile_image_url: e.target.value })}
                    placeholder="https://…"
                  />
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) uploadImage(slide, f, 'mobile_image_url');
                        e.target.value = '';
                      }}
                    />
                    <Button asChild size="icon" variant="outline" disabled={uploadingId === slide.id}>
                      <span><Upload className="h-4 w-4" /></span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Link URL</Label>
                <Input
                  value={slide.link_url ?? ''}
                  onChange={e => updateSlide(slide.id, { link_url: e.target.value })}
                  placeholder="/concerts"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Button text</Label>
                <Input
                  value={slide.cta_text ?? ''}
                  onChange={e => updateSlide(slide.id, { cta_text: e.target.value })}
                  placeholder="Learn more"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Image focal point</Label>
                <div className="flex gap-2">
                  <select
                    value={slide.image_position_x ?? 'center'}
                    onChange={e => updateSlide(slide.id, { image_position_x: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    aria-label="Horizontal focal point"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                  <select
                    value={slide.image_position_y ?? 'center'}
                    onChange={e => updateSlide(slide.id, { image_position_y: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    aria-label="Vertical focal point"
                  >
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                    <option value="72%">72% (piano keys)</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SimpleHeroManager;
